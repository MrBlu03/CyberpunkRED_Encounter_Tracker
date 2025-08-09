/* eslint-env jquery */
import LOGGER from "../utils/cpr-logger.js";
import CPR from "./config.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import TextUtils from "../utils/TextUtils.js";
import CPRActiveEffect from "../cpr-active-effect.js";
import CPRMod from "../rolls/cpr-modifiers.js";

export default function registerHandlebarsHelpers() {
  LOGGER.log("Calling Register Handlebars Helpers");

  /**
   * Run a comparison given a stringified operator and 2 operands. Returns true or false.
   */
  Handlebars.registerHelper("cprCompare", (v1, operator, v2) => {
    switch (operator) {
      case "==":
        return v1 == v2; // eslint-disable-line eqeqeq
      case "===":
        return v1 === v2;
      case "!==":
        return v1 !== v2;
      case "<":
        return v1 < v2;
      case "<=":
        return v1 <= v2;
      case ">":
        return v1 > v2;
      case ">=":
        return v1 >= v2;
      case "&&":
        return v1 && v2;
      case "||":
        return v1 || v2;
      default:
        return false;
    }
  });

  /**
   * Get the value of a property on a given object
   */
  Handlebars.registerHelper("cprGetProp", (object, property) => {
    if (typeof object !== "undefined") {
      if (typeof object.length === "undefined") {
        return foundry.utils.getProperty(object, property);
      }
      if (object.length > 0) {
        const returnValues = [];
        object.forEach((obj) => {
          returnValues.push(foundry.utils.getProperty(obj, property));
        });
        return returnValues;
      }
    }
    return "";
  });

  /**
   * Return an owned item on an actor given the ID
   */
  Handlebars.registerHelper("cprGetOwnedItem", (actor, itemId) => {
    if (actor === null) {
      return (
        game.items.get(itemId) || game.items.find((i) => i.uuid === itemId)
      );
    }
    return actor.getOwnedItem(itemId);
  });

  /**
   * Return true if an object is defined or not
   */
  Handlebars.registerHelper("cprIsDefined", (object) => {
    if (typeof object === "undefined") {
      return false;
    }
    return true;
  });

  /**
   * Check if the passed object is "empty", meaning has no elements or properties
   */
  Handlebars.registerHelper("cprIsEmpty", (object) => {
    if (typeof object === "object") {
      if (Array.isArray(object)) {
        if (object.length === 0) {
          return true;
        }
      } else if (Object.keys(object).length === 0) {
        return true;
      }
    }
    return false;
  });

  /**
   * Return the size of an object.
   */
  Handlebars.registerHelper("cprSizeOf", (object) => {
    let size = 0;
    switch (typeof object) {
      case "object": {
        if (Array.isArray(object)) {
          size = object.length;
        } else {
          size = object.size;
        }
        break;
      }
      case "string": {
        size = object.length;
        break;
      }
      case "number": {
        size = object;
        break;
      }
      default:
        size = 0;
    }
    return size;
  });

  /**
   * Return true if a literal is a number
   * For whatever reason, if value is the string "NaN", Javascript thinks
   * it is a number?
   */
  Handlebars.registerHelper("cprIsNumber", (value) => {
    if (typeof value === "string" && value === "NaN") {
      return false;
    }
    return !Number.isNaN(value);
  });

  /**
   * Formats thousands with a comma, optionally set decimal length
   *
   * Options:
   *
   *  @var decimalLength int The length of the decimals
   *  @var thousandsSep char The thousands separator
   *  @var decimalSep char The decimals separator
   *
   */
  Handlebars.registerHelper("cprNumberFormat", (value, options) => {
    const dl = options.hash.decimalLength || 0;
    const ts = options.hash.thousandsSep || ",";
    const ds = options.hash.decimalSep || ".";
    const val = parseFloat(value);
    const re = `\\d(?=(\\d{3})+${dl > 0 ? "\\D" : "$"})`;
    const num = val.toFixed(Math.max(0, Math.floor(dl)));
    return (ds ? num.replace(".", ds) : num).replace(
      new RegExp(re, "g"),
      `$&${ts}`
    );
  });

  /**
   * Given an Array of strings, create an object with those strings as properties. They are the assigned
   * in order to the remaining arguments passed to this helper.
   */
  Handlebars.registerHelper("cprMergeForPartialArg", (...args) => {
    const partialArgs = [...args];
    const partialKeys = partialArgs[0].replace(/\s/g, "").split(",");
    partialArgs.shift();
    const mergedObject = {};
    let index = 0;
    partialKeys.forEach((objectName) => {
      mergedObject[objectName] = partialArgs[index];
      index += 1;
    });
    return mergedObject;
  });

  /**
   * Given a list of objects, return the subset that a property with the desired value
   */
  Handlebars.registerHelper("cprFilter", (objList, key, value) => {
    if (objList === undefined) {
      const warnText =
        "Improper use of the filter helper. This should not occur. Always provide an object list and not an undefined value.";
      LOGGER.warn(
        `${warnText} The following arguments were passed: objList = ${objList}, key = ${key}, value = ${value}`
      );
      return [];
    }
    const filteredList = objList.filter((obj) => {
      let objProp = obj;
      const propDepth = key.split(".");
      propDepth.forEach((propName) => {
        if (typeof objProp[propName] !== "undefined") {
          objProp = objProp[propName];
        }
      });
      return objProp === value;
    });
    return filteredList;
  });

  /**
   * Get a config mapping from config.js by name and key
   */
  Handlebars.registerHelper("cprFindConfigValue", (obj, key) => {
    if (obj in CPR) {
      return CPR[obj][key];
    }
    return "INVALID_KEY";
  });

  /**
   * Get a config mapping from config.js by name
   */
  Handlebars.registerHelper("cprFindConfigObj", (obj) => {
    if (obj in CPR) {
      return CPR[obj];
    }
    return "INVALID_LIST";
  });

  /**
   * This helper accepts a string that is a list of words separated by strings. It returns true if
   * any of them match a given value.
   */
  Handlebars.registerHelper("cprListContains", (list, val) => {
    let array = list;
    if (array) {
      switch (typeof array) {
        case "string": {
          array = array.split(",");
          break;
        }
        case "object": {
          if (!Array.isArray(array)) {
            array = Object.keys(array);
          }
          break;
        }
        default:
      }
      return array.includes(val);
    }
    return false;
  });

  /**
   * Returns true if an array contains a desired element
   */
  Handlebars.registerHelper(
    "cprObjectListContains",
    (objectList, data, val) => {
      const array = objectList;
      if (array) {
        return array.some((o) => o[data] === val);
      }
      return false;
    }
  );

  /**
   * Returns true if an array contains a desired element
   */
  Handlebars.registerHelper(
    "cprArrayLikeObjectByIndex",
    (arrayLikeObject, index, val) => {
      // Return false if arrayLikeObject is not an object, so that we avoid sheet-breaking errors.
      if (!(typeof arrayLikeObject === "object")) return false;

      const array = Object.values(arrayLikeObject);
      if (array) {
        return array[index][val];
      }

      return false;
    }
  );

  /**
   * Accepts a string and replaces VAR with the desired value. Usually used to dynamically
   * produce file names for partial templates.
   */
  Handlebars.registerHelper("cprGeneratePartial", (arg1, arg2) => {
    return arg1.replace("VAR", arg2);
  });

  /**
   * Calculate the size (in pixels) of images for dice given the number of sides they have
   * and how many need to be displayed in a chat card.
   */
  Handlebars.registerHelper("cprDiceSizeImageClass", (formula) => {
    let diceSize = "";
    let className = "d10";
    const formulaParts = formula.split("d");
    if (formulaParts.length === 2) {
      const diceCount = parseInt(formulaParts[0], 10);
      const diceSides = parseInt(formulaParts[1], 10);
      className = `d${diceSides}`;

      if (diceSides === 6) {
        diceSize = 60;
        if (diceCount > 2) {
          diceSize = 40;
        }
        if (diceCount > 4) {
          diceSize = 30;
        }
        if (diceCount > 10) {
          diceSize = 20;
        }
      }

      if (diceSides === 10) {
        diceSize = 60;
        if (diceCount > 2) {
          diceSize = 40;
        }
        if (diceCount > 4) {
          diceSize = 30;
        }
        if (diceCount > 10) {
          diceSize = 20;
        }
      }
      if (diceSize) {
        className = `${className} ${className}-${diceSize}`;
      }
    }
    return className;
  });

  /**
   * Sort an array of objects by the values in a specific property
   */
  Handlebars.registerHelper("cprSort", (arr, property) => {
    let array = arr;
    // If the first argument passed is an Object made of `key: Object` pairs,
    // turn it into an array of the Object's values, then sort by `property`.
    if (!Array.isArray(arr)) {
      array = Object.values(arr);
    }

    array.sort((a, b) => {
      let comparator = 0;
      if (a[property] > b[property]) {
        comparator = 1;
      } else if (b[property] > a[property]) {
        comparator = -1;
      }
      return comparator;
    });
    return array;
  });

  /**
   * Return an array in reverse order
   */
  Handlebars.registerHelper("cprReverse", (arr) => {
    // reverse() mutates the original array, so first we create a shallow copy using the spread operator.
    const reversed = [...arr].reverse();
    return reversed;
  });

  /**
   * Perform a basic mathematical statement starting with a stringified
   * operator and an array of operands
   */
  Handlebars.registerHelper("cprMath", (...args) => {
    let mathArgs = [...args];
    let mathFunction = mathArgs[0];
    mathArgs.shift();
    mathArgs.pop();
    if (Array.isArray(mathArgs[0])) {
      [mathArgs] = mathArgs;
    }
    mathArgs = mathArgs.map(Number);
    if (typeof Math[mathFunction] === "function") {
      return Math[mathFunction].apply(null, mathArgs);
    }
    // Math doesn't have basic functions, we can account
    // for those here as needed:
    if (typeof mathArgs === "undefined") {
      mathFunction = `${mathFunction} bad args: ${mathArgs}`;
    }
    switch (mathFunction) {
      case "sum":
        return mathArgs.reduce((a, b) => parseInt(a, 10) + parseInt(b, 10), 0);
      case "subtract": {
        const minutend = mathArgs.shift();
        const subtrahend = mathArgs.reduce((a, b) => a + b, 0);
        return minutend - subtrahend;
      }
      case "product": {
        return mathArgs.reduce((a, b) => a * b, 1);
      }
      default:
        LOGGER.error(`!ERR: Not a Math function: ${mathFunction}`);
        return "null";
    }
  });

  /**
   * Given a skill (item), return the stat associated with it, which is a property buried therein
   */
  Handlebars.registerHelper("cprGetSkillStat", (skill, actor) => {
    const skillStat = skill.system.stat;
    return actor.system.stats[skillStat].value;
  });

  /**
   * Return true if an embedded flag on an actor matches the firemode currently set.
   * Used to figure out if a weapon was just used with an alternative fire mode set.
   */
  Handlebars.registerHelper("cprFireMode", (actor, firemode, weaponID) => {
    const flag = foundry.utils.getProperty(
      actor,
      `flags.${game.system.id}.firetype-${weaponID}`
    );
    if (flag === firemode) {
      return true;
    }
    return false;
  });

  /**
   * Get the fire type selected for an owned weapon. This is stored as a flag on an actor.
   */
  Handlebars.registerHelper("cprFireFlag", (actor, firetype, weaponID) => {
    const flag = foundry.utils.getProperty(
      actor,
      `flags.${game.system.id}.firetype-${weaponID}`
    );
    if (flag === firetype) {
      return "checked";
    }
    return "";
  });

  /**
   * Return a system setting value given the name
   */
  Handlebars.registerHelper("cprSystemConfig", (settingName) =>
    game.settings.get(game.system.id, settingName)
  );

  /**
   * Return the localized tooltip string for a stat given the stat name.
   * Here's the list of stat tooltips to get past pipeline CI:
   *
   * "CPR.global.stats.bodyToolTip"
   * "CPR.global.stats.coolToolTip"
   * "CPR.global.stats.dexToolTip"
   * "CPR.global.stats.empToolTip"
   * "CPR.global.stats.intToolTip"
   * "CPR.global.stats.luckToolTip"
   * "CPR.global.stats.moveToolTip"
   * "CPR.global.stats.refToolTip"
   * "CPR.global.stats.techToolTip"
   * "CPR.global.stats.willToolTip"
   */
  Handlebars.registerHelper("cprGetStatToolTip", (stat) => {
    return SystemUtils.Localize(`${CPR.statList[stat]}ToolTip`);
  });

  /**
   * Return the localized tooltip string for a skill. Used in the character sheet.
   *
   * For the core skills included with the system module, we do not store the tooltip in the skill
   * objectives themselves becauset the skill compendium is not translated with Babele. It is done
   * outside of that in lang/en.json. This is for legacy reason; code still depends on specific
   * skill names. If we ever translate the skill compendium with Babele, these strings could all be
   * set in the item description
   *
   * For custom skills though, we do use the skill object description. In fact that is the first place
   * we look.
   *
   * Here is a list of skill tooltip keys that may be generated by this helper so that a pipeline CI test
   * will still pass:
   * "CPR.global.itemType.skill.accountingToolTip"
   * "CPR.global.itemType.skill.actingToolTip"
   * "CPR.global.itemType.skill.airVehicleTechToolTip"
   * "CPR.global.itemType.skill.animalHandlingToolTip"
   * "CPR.global.itemType.skill.archeryToolTip"
   * "CPR.global.itemType.skill.athleticsToolTip"
   * "CPR.global.itemType.skill.athleticsAndContortionistToolTip"
   * "CPR.global.itemType.skill.autofireToolTip"
   * "CPR.global.itemType.skill.basicTechToolTip"
   * "CPR.global.itemType.skill.basicTechAndWeaponstechToolTip"
   * "CPR.global.itemType.skill.brawlingToolTip"
   * "CPR.global.itemType.skill.briberyToolTip"
   * "CPR.global.itemType.skill.bureaucracyToolTip"
   * "CPR.global.itemType.skill.businessToolTip"
   * "CPR.global.itemType.skill.compositionToolTip"
   * "CPR.global.itemType.skill.compositionAndEducationToolTip"
   * "CPR.global.itemType.skill.concealOrRevealObjectToolTip"
   * "CPR.global.itemType.skill.concentrationToolTip"
   * "CPR.global.itemType.skill.contortionistToolTip"
   * "CPR.global.itemType.skill.conversationToolTip"
   * "CPR.global.itemType.skill.criminologyToolTip"
   * "CPR.global.itemType.skill.cryptographyToolTip"
   * "CPR.global.itemType.skill.cybertechToolTip"
   * "CPR.global.itemType.skill.danceToolTip"
   * "CPR.global.itemType.skill.deductionToolTip"
   * "CPR.global.itemType.skill.demolitionsToolTip"
   * "CPR.global.itemType.skill.driveLandVehicleToolTip"
   * "CPR.global.itemType.skill.educationToolTip"
   * "CPR.global.itemType.skill.electronicsAndSecurityTechToolTip"
   * "CPR.global.itemType.skill.enduranceToolTip"
   * "CPR.global.itemType.skill.enduranceAndResistTortureAndDrugsToolTip"
   * "CPR.global.itemType.skill.evasionToolTip"
   * "CPR.global.itemType.skill.firstAidToolTip"
   * "CPR.global.itemType.skill.forgeryToolTip"
   * "CPR.global.itemType.skill.gambleToolTip"
   * "CPR.global.itemType.skill.handgunToolTip"
   * "CPR.global.itemType.skill.heavyWeaponsToolTip"
   * "CPR.global.itemType.skill.humanPerceptionToolTip"
   * "CPR.global.itemType.skill.interrogationToolTip"
   * "CPR.global.itemType.skill.landVehicleTechToolTip"
   * "CPR.global.itemType.skill.languageToolTip"
   * "CPR.global.itemType.skill.languageStreetslangToolTip"
   * "CPR.global.itemType.skill.librarySearchToolTip"
   * "CPR.global.itemType.skill.lipReadingToolTip"
   * "CPR.global.itemType.skill.localExpertToolTip"
   * "CPR.global.itemType.skill.martialArtsToolTip"
   * "CPR.global.itemType.skill.meleeWeaponToolTip"
   * "CPR.global.itemType.skill.paintOrDrawOrSculptToolTip"
   * "CPR.global.itemType.skill.paramedicToolTip"
   * "CPR.global.itemType.skill.perceptionToolTip"
   * "CPR.global.itemType.skill.personalGroomingToolTip"
   * "CPR.global.itemType.skill.persuasionToolTip"
   * "CPR.global.itemType.skill.persuasionAndTradingToolTip"
   * "CPR.global.itemType.skill.photographyAndFilmToolTip"
   * "CPR.global.itemType.skill.pickLockToolTip"
   * "CPR.global.itemType.skill.pickLockAndPickPocketToolTip"
   * "CPR.global.itemType.skill.pickPocketToolTip"
   * "CPR.global.itemType.skill.pilotAirVehicleToolTip"
   * "CPR.global.itemType.skill.pilotSeaVehicleToolTip"
   * "CPR.global.itemType.skill.playInstrumentToolTip"
   * "CPR.global.itemType.skill.resistTortureOrDrugsToolTip"
   * "CPR.global.itemType.skill.ridingToolTip"
   * "CPR.global.itemType.skill.scienceToolTip"
   * "CPR.global.itemType.skill.seaVehicleTechToolTip"
   * "CPR.global.itemType.skill.shoulderArmsToolTip"
   * "CPR.global.itemType.skill.stealthToolTip"
   * "CPR.global.itemType.skill.streetwiseToolTip"
   * "CPR.global.itemType.skill.tacticsToolTip"
   * "CPR.global.itemType.skill.trackingToolTip"
   * "CPR.global.itemType.skill.tradingToolTip"
   * "CPR.global.itemType.skill.wardrobeAndStyleToolTip"
   * "CPR.global.itemType.skill.weaponstechToolTip"
   * "CPR.global.itemType.skill.wildernessSurvivalToolTip"
   */
  Handlebars.registerHelper("cprGetSkillToolTipKey", (skillObj) => {
    let tooltip = skillObj.system.description.value;
    if (tooltip === "" && skillObj.system.core) {
      const tooltipKey = `CPR.global.itemType.skill.${SystemUtils.slugify(
        skillObj.name
      )}ToolTip`;
      tooltip = SystemUtils.Localize(tooltipKey);
    }
    return tooltip || skillObj.name;
  });

  /**
   * Some skills and roles have spaces and/or parantheses in their name. When substituting in translated strings,
   * this can be a problem to find the key they're listed under.
   *
   * Example: Resist Torture/Drugs -> Resist Torture Or Drugs
   */
  Handlebars.registerHelper(
    "cprGetLocalizedlNameKey",
    (object, type = false) => {
      const objectType = typeof object === "string" ? type : object.type;
      const name = typeof object === "string" ? object : object.name;
      let localizedKey = "";
      switch (objectType) {
        case "skill": {
          // "CPR.global.itemType.skill.cybertech"
          localizedKey = `CPR.global.itemType.skill.${SystemUtils.slugify(
            name
          )}`;
          break;
        }
        case "role": {
          // "CPR.global.role.tech.name"
          localizedKey = `CPR.global.role.${SystemUtils.slugify(name)}.name`;
          break;
        }
        case "roleAbility": {
          // "CPR.global.role.tech.ability.fabricationExpertise":
          for (const role of Object.keys(CPR.roleList)) {
            const localizedRoleKey = `CPR.global.role.${role}.ability.${SystemUtils.slugify(
              name
            )}`;
            if (SystemUtils.Localize(localizedRoleKey) !== localizedRoleKey) {
              localizedKey = localizedRoleKey;
            }
          }
          break;
        }
        case "programClass": {
          // "CPR.global.programClass.defender":
          localizedKey = `CPR.global.programClass.${SystemUtils.slugify(name)}`;
          break;
        }
        default:
      }
      return SystemUtils.Localize(localizedKey) === localizedKey
        ? name
        : localizedKey;
    }
  );

  /**
   * Sort core skills, returning a new array. This goes a step further and considers unicode normalization form for
   * specific characters like slashes and parantheses.
   */
  Handlebars.registerHelper("cprSortCoreSkills", (skillObjArray) => {
    return SystemUtils.SortItemListByName(skillObjArray);
  });

  /**
   * Get an Item ID from the catalog by name and type. Does not consider owned items.
   */
  Handlebars.registerHelper("cprItemIdFromName", (itemName, itemType) => {
    const item = game.items.find(
      (i) => i.name === itemName && i.type === itemType
    );
    if (item !== undefined) {
      return item._id;
    }
    return "DOES NOT EXIST";
  });

  /**
   * Convert a string with a delimiter (such as a comma or space) to an Array of elements
   */
  Handlebars.registerHelper("cprToArray", (string, delimiter) =>
    string.split(delimiter)
  );

  /**
   * Get all skills on a mook that have a level above 0. This is used to present
   * specialized skills a mook may have.
   */
  Handlebars.registerHelper("cprGetMookSkills", (array) => {
    const skillList = [];
    const sortedArray = SystemUtils.SortItemListByName(array);
    sortedArray.forEach((skill) => {
      if (skill.system.level !== 0 || skill.system.skillmod > 0) {
        skillList.push(skill);
      }
    });
    return skillList;
  });

  /**
   * Get all installed cyberware and options and return it as an array. This is
   * used in the mook sheet.
   */
  Handlebars.registerHelper("cprGetMookCyberware", (mook) => {
    const installedCyberwareList = [];
    for (const installedId of mook.system.installedItems.list) {
      const item = mook.getOwnedItem(installedId);
      if (item.type === "cyberware") {
        const optionals = [];
        if (item.system.hasInstalled) {
          for (const optionalid of item.system.installedItems.list) {
            const optionalItem = mook.getOwnedItem(optionalid);
            optionals.push(optionalItem);
          }
        }
        installedCyberwareList.push({ foundation: item, optionals });
      }
    }
    return installedCyberwareList;
  });

  /**
   * Return how many installed cyberware items an actor has
   */
  Handlebars.registerHelper("cprGetMookCyberwareLength", (mook) => {
    const installedCyberwareList = [];
    const exclusionList = [
      "cyberwareInternal",
      "cyberwareExternal",
      "fashionware",
    ];
    for (const installedId of mook.system.installedItems.list) {
      const item = mook.getOwnedItem(installedId);
      if (
        item.type === "cyberware" &&
        !exclusionList.includes(item.system.type)
      ) {
        installedCyberwareList.push(item);
        if (item.system.hasInstalled) {
          for (const optionalid of item.system.installedItems.list) {
            const optionalItem = mook.getOwnedItem(optionalid);
            installedCyberwareList.push(optionalItem);
          }
        }
      }
    }
    return installedCyberwareList.length;
  });

  /**
   * Returns true if an item type can be upgraded. This means it has the upgradable property in the data model.
   */
  Handlebars.registerHelper("cprIsUpgradable", (item) => {
    const hasUpgradableMixin = SystemUtils.hasMixin(item.type, "upgradable");
    let isUpgradable = false;
    if (
      hasUpgradableMixin &&
      item.system.installedItems.allowed &&
      item.system.installedItems.allowedTypes.includes("itemUpgrade")
    ) {
      isUpgradable = true;
    }
    return isUpgradable;
  });

  /**
   * List installed items.
   */
  Handlebars.registerHelper(
    "cprListInstalledItems",
    (item, delimiter = " ") => {
      const { actor } = item;
      const itemList =
        typeof item.system.installedItems === "object"
          ? item.system.installedItems.list
          : [];
      let returnString = "";
      if (actor) {
        for (const itemId of itemList) {
          const installedItem = item.actor.getOwnedItem(itemId);
          if (installedItem) {
            const itemType = SystemUtils.Localize(
              CPR.objectTypes[installedItem.type]
            );
            returnString = returnString.concat(
              `${installedItem.name} (${itemType})`,
              delimiter
            );
          }
        }
      }
      return returnString;
    }
  );

  /**
   * Returns an series of nested <li> elements representing nested installed items.
   * This is for items that have installed items in the gear tab.
   *
   * @param {CPRItem(Container)} item - The top-level item.
   * @param {Object} options - Contains Hash Argument from Handlebars
   * @param {Object} [options.hash.isItemSheet] - Whether or not this is being called on an item sheet.
   *                                              If false/undefined, this is being called on an actor sheet.
   * @returns {Handlebars.SafeString} - Nested list of installed items.
   */
  Handlebars.registerHelper("cprNestedInstalledGearTab", (item, options) => {
    /**
     * This function is the thing that actually puts the list together. It works
     * recursively, calling itself if child items also have installed items.
     *
     * @param {CPRItem(Container)} parentItem - The parent item (not necessarily the top-most item)
     * @param {Number} [inItemPack] - Whether or not the top-level item is in an item compendium.
     * @param {Number} [level = 1] - The amount of indentation.
     * @returns {String}
     */
    function recursiveHTML(parentItem, inItemPack, level = 0) {
      // Get all items installed in the parent and sort.
      // If item is in a pack, get this data from the cprInstallTree instead of real world items.
      const installedItems = inItemPack
        ? parentItem.flags.cprInstallTree
        : parentItem.getInstalledItems();
      const sortedInstalled = installedItems.sort((a, b) => {
        // If items are the same type, sort alphabetically.
        if (a.type === b.type) return a.name > b.name ? 1 : -1;

        let sortOrder = [];
        switch (parentItem.type) {
          case "weapon":
          case "itemUpgrade":
            // For weapons and item upgrades, show loaded ammo at the top.
            sortOrder = ["ammo"];
            break;
          case "cyberdeck":
            // For cyberdecks, show installed programs at the top.
            sortOrder = ["program"];
            break;
          case "cyberware":
            // For cyberware, show installed cyberware at the top.
            sortOrder = ["cyberware"];
            break;
          default:
            break;
        }
        return sortOrder.indexOf(a.type) > sortOrder.indexOf(b.type) ? -1 : 1;
      });

      let html = "";
      // For each installed item, create an <li> element with information about that item.
      for (const childItem of sortedInstalled) {
        const localizedType = SystemUtils.Localize(
          `TYPES.Item.${childItem.type}`
        );

        let actions = "";
        let uninstallIcon = "fa-arrow-right-from-bracket"; // Most items have the same uninstall icon
        const uninstallTooltip = SystemUtils.Localize(
          "CPR.actorSheets.commonActions.uninstall"
        );
        switch (childItem.type) {
          case "itemUpgrade": {
            // Ranged weapon upgrades get the change ammo icon.
            if (childItem.system.type !== "weapon") break;
            if (!childItem.system.isRanged) break;
            if (options.hash.isItemSheet) break;
            const reloadTooltip = SystemUtils.Localize(
              "CPR.actorSheets.commonActions.changeAmmo"
            );
            actions += `<a class="item-action data-item-id="${childItem._id}" data-action="select-ammo">`;
            actions += `  <i class="fas fa-arrow-right-arrow-left" data-tooltip="${reloadTooltip}"></i>`;
            actions += `</a>`;
            break;
          }
          case "program":
            // Programs get a unique uninstall icon.
            uninstallIcon = "fa-folder-minus";
            break;
          default:
            break;
        }
        // Every item gets an uninstall icon.
        actions += `<a class="uninstall-single-item" data-item-id="${childItem._id}" data-direct-parent="${parentItem._id}">`;
        actions += `  <i class="fas ${uninstallIcon}" data-tooltip="${uninstallTooltip}"></i>`;
        actions += `</a>`;

        // Build the list item.
        html += `<li class="item flexrow" data-row-level=${level}
                       data-item-id="${childItem._id}"
                       data-item-category="${childItem.type}">`;
        html += `  <a class="name item-view flex-center"><span class="type-tag">${localizedType}</span> ${childItem.name}</a>`;
        // Uninstall glyph
        html += `  <div class="action-container">`;
        html += `    ${actions}`;
        html += `  </div>`;
        html += `</li>`;

        // If the child item has its own installed items, call this function on the child item
        // and increase the indent.
        if (childItem.system.installedItems?.list?.length > 0) {
          html += recursiveHTML(childItem, inItemPack, level + 1);
        }
      }
      return html;
    }

    // Only create a dropdown if the item isn't installed, and has installed items.
    // The exception is cyberdecks, cyberdecks remain on gear tab whether or not they are installed.
    if (item.system.hasInstalled) {
      const inItemPack = item.pack && !item.isEmbedded; // Check if item is in an item compendium.
      const html = recursiveHTML(item, inItemPack);
      // Is subitem hidden or not
      const display =
        options.hash.isItemSheet || // Never hide this list on item sheets.
        item.actor?.flags?.[game.system.id]?.showInstalled?.[item.id]
          ? ""
          : "item-hidden";
      // Here we wrap the whole sub-list in a div, so that we can animate it
      return new Handlebars.SafeString(
        `<div class="sub-list ${display}" data-items-wrapper-for-parent="${item.id}" style="padding: 0;"><ol>${html}</ol></div>`
      );
    }
    // Otherwise return a blank string.
    return "";
  });

  /**
   * Helper to calculate the indent of nested cyberware in the Cyberware tab.
   * Do this here so we don't put a `style` attribute in the .hbs file, which would cause a test to fail.
   *
   * @param {Number} - Depth of the installed item.
   * @returns {Handlebars.SafeString} - Nested list of installed items.
   */
  Handlebars.registerHelper("cprIndentCyberware", (depth) => {
    const style = `style="padding-left:${depth}rem;"`;
    return new Handlebars.SafeString(style);
  });

  /**
   * Returns true if an item type has a particular template applied in the data model
   * To Do: isUpgradeable should use this instead
   */
  Handlebars.registerHelper("cprHasTemplate", (itemType, templateName) => {
    return SystemUtils.hasMixin(itemType, templateName);
  });

  /**
   * Look at the data model for a type of item, and return the list of templates it comes with
   */
  Handlebars.registerHelper("cprGetTemplates", (itemType) => {
    return SystemUtils.getMixins(itemType);
  });

  /**
   * Return the stat-changing details as text if an object has an upgrade
   */
  Handlebars.registerHelper("cprShowUpgrade", (obj, dataPoint) => {
    const itemType = obj.type;
    const hasUpgradableMixin = SystemUtils.hasMixin(itemType, "upgradable");
    let upgradeText = "";
    if (hasUpgradableMixin && obj.system.isUpgraded) {
      const upgradeData = obj.getTotalUpgradeValues(dataPoint);
      if (upgradeData.value !== 0 && upgradeData.value !== "") {
        const modSource =
          itemType === "weapon"
            ? SystemUtils.Localize("CPR.itemSheet.weapon.attachments")
            : SystemUtils.Localize("CPR.itemSheet.common.upgrades");
        upgradeText = `(${SystemUtils.Format(
          "CPR.itemSheet.common.modifierChange",
          { modSource, modType: upgradeData.type, value: upgradeData.value }
        )})`;
      }
    }
    return upgradeText;
  });

  /**
   * If an upgrade exists that applies changes to a stat or skill, calculate and return the
   * result.
   */
  Handlebars.registerHelper("cprApplyUpgrade", (obj, baseValue, dataPoint) => {
    const hasUpgradableMixin = SystemUtils.hasMixin(obj.type, "upgradable");
    let upgradeResult = Number(baseValue);
    if (Number.isNaN(upgradeResult)) {
      upgradeResult = baseValue;
    }
    if (hasUpgradableMixin && obj.system.isUpgraded) {
      const upgradeData = obj.getTotalUpgradeValues(dataPoint);
      if (upgradeData.value !== "" && upgradeData.value !== 0) {
        if (upgradeData.type === "override") {
          upgradeResult = upgradeData.value;
        } else if (
          typeof upgradeResult !== "number" ||
          typeof upgradeData.value !== "number"
        ) {
          if (upgradeData.value !== 0 && upgradeData.value !== "") {
            upgradeResult = `${upgradeResult} + ${upgradeData.value}`;
          }
        } else {
          upgradeResult += upgradeData.value;
        }
      }
    }
    return upgradeResult;
  });

  /**
   * Return true if a bit of text matches a filter value. If the filter is not set, everything matches.
   */
  Handlebars.registerHelper(
    "cprSheetContentFilter",
    (filterValue, applyToText) => {
      if (typeof filterValue === "undefined" || filterValue === "") {
        return true;
      }
      return (
        applyToText.toLowerCase().indexOf(filterValue.toLowerCase()) !== -1
      );
    }
  );

  /**
   * For readability's sake return (a translated) "Yes" or "No" based on whether something is true or false
   */
  Handlebars.registerHelper("cprYesNo", (bool) => {
    if (bool) return SystemUtils.Localize("CPR.global.generic.yes");
    return SystemUtils.Localize("CPR.global.generic.no");
  });

  /**
   * For readability's sake, translate the "mode" of an active effect mod into an intuitive mathematical operator.
   * For unknown modes, just return a question mark, which shouldn't happen. Modes are constants provided by Foundry:
   *    0 (CUSTOM) - calls the "applyActiveEffect" hook with the value to figure out what to do with it (not used)
   *    1 (MULTIPLY) - multiply this value with the current one
   *    2 (ADD) - add this value to the current value (as an Integer) or set it if currently null
   *    3 (DOWNGRADE) - like OVERRIDE but only replace if the value is lower (worse)
   *    4 (UPGRADE) - like OVERRIDE but only replace if the value is higher (better)
   *    5 (OVERRIDE) - replace the current value with this one
   */
  Handlebars.registerHelper("cprEffectModMode", (mode, value) => {
    switch (mode) {
      case 1:
        return `*${value}`;
      case 2:
        return value > 0 ? `+${value}` : value; // account for minus already being there for negative numbers
      case 3:
        return `<=${value}`;
      case 4:
        return `>=${value}`;
      case 5:
        return `=${value}`;
      default:
        return `?${value}`;
    }
  });

  /**
   * Figure out if an effect row should have a toggle glyph displayed or not.
   * Only show the toggle if 1 of these conditions is true:
   *    1. the effect is on the actor itself, not from an item
   *    2. the item usage is set to "toggled"
   *    3. the item is not suppressed and usage is not set to "always"
   *
   * @param {CPRActiveEffect} effect - active effect data object
   * @param {String} name - the name of the actor
   * @returns {Bool} true or false if the toggle glyph should be displayed
   */
  Handlebars.registerHelper("cprShowEffectToggle", (effect, name) => {
    if (effect.sourceName === name) return true;
    if (!effect.system.isSuppressed && effect.usage !== "always") return true;
    if (effect.system.isSuppressed && effect.usage === "toggled") return true;
    return false;
  });

  /**
   * Return the name of a skill or stat being changed by an effect. Used in a
   * few active effect UIs.
   *
   * @param {Document} doc - the item providing an effect
   * @param {String} cat - category of change mods
   * @param {String} key - key for the stat or skill that is being changed by an effect
   * @return {String} - the name of the skill or stat being changed
   */
  Handlebars.registerHelper("cprGetChangeNameByKey", (doc, cat, key) => {
    if (!cat) {
      // There's a split second when this is updating that the sheet may
      // refresh showing ??? and throwing a console error when these are
      // being updated with the delete method.
      let returnString = "(updating)";
      const flag = doc.getFlag(game.system.id, "changes")
        ? doc.getFlag(game.system.id, "changes")
        : [];
      if (doc.changes.length === flag.length) {
        returnString = "???";
        LOGGER.error(
          "Undefined change category! No idea what this effect changes!"
        );
      }
      return returnString;
    }
    if (cat === "custom") return key;

    if (!doc) {
      return SystemUtils.Localize(CPR.activeEffectKeys[cat][key]);
    }

    const sourceDoc = doc instanceof CPRActiveEffect ? doc.parent : doc;
    if (!sourceDoc) return "???"; // a recently deleted item will sometimes do this
    if (cat === "skill") {
      const skillMap = CPR.activeEffectKeys.skill;
      let skillList = [];
      if (sourceDoc.isOwned) {
        skillList = sourceDoc.parent.items.filter((i) => i.type === "skill");
      } else {
        skillList = game.items.filter((i) => i.type === "skill");
      }
      for (const skill of skillList) {
        skillMap["bonuses.".concat(SystemUtils.slugify(skill.name))] =
          skill.name;
      }
      return SystemUtils.Localize(skillMap[key]);
    }
    return SystemUtils.Localize(CPR.activeEffectKeys[cat][key]);
  });

  /**
   * Returns requested information about a skill mod: Either an array of all CPRMods,
   * the total value of all the mods, or a boolean whether the mod has situational bonuses or not.
   *
   * @param {String} skillName - the skill name (e.g. from CPR.skillList) to look up
   * @param {Object} actor - the actor whom the skill belongs to.
   * @param {String} infoType - type of info being requested ("modTotal", "modList", or "hasSituational")
   * @param {Object} options - Contains Hash Argument from Handlebars. In this case, the only option is
   *                           keepSituational, which is a Boolean to filter out situational mods or not.
   *                           See: https://handlebarsjs.com/guide/block-helpers.html#hash-arguments
   * @returns {Number|Array<object>|Boolean} - see above description.
   */
  Handlebars.registerHelper(
    "cprGetSkillModInfo",
    (skillName, actor, infoType, options) => {
      const skillSlug = SystemUtils.slugify(skillName);
      const effects = Array.from(actor.allApplicableEffects()); // Active effects on the actor.
      const allMods = CPRMod.getAllModifiers(effects); // Effects list converted into CPRMods.
      let relevantMods = CPRMod.getRelevantMods(allMods, [
        skillSlug,
        `${skillSlug}Hearing`,
        `${skillSlug}Sight`,
      ]);
      const hasSituational = relevantMods.some((m) => m.isSituational);
      if (!options.hash.keepSituational) {
        relevantMods = relevantMods.filter((m) => !m.isSituational);
      }

      let modTotal = 0;
      relevantMods.forEach((m) => {
        modTotal += parseInt(m.value, 10);
      });

      switch (infoType) {
        case "modTotal":
          return modTotal;
        case "modList":
          return relevantMods;
        case "hasSituational":
          return hasSituational;
        default:
          return LOGGER.error("Did not pass valid string to infoType");
      }
    }
  );

  /**
   * Return true if a literal is a number
   * For whatever reason, if value is the string "NaN", Javascript thinks
   * it is a number?
   */
  Handlebars.registerHelper("cprGetPriceCategory", (price) => {
    let priceCategory = "free";
    const PRICE_CATEGORY_MAPPINGS = {};
    let priceTiers = [];
    for (const key of Object.keys(CPR.itemPriceCategoryMap)) {
      const integerValue = parseInt(CPR.itemPriceCategoryMap[key], 10);
      PRICE_CATEGORY_MAPPINGS[integerValue] = key;
      priceTiers.push(integerValue);
    }
    priceTiers = priceTiers.sort((a, b) => a - b);
    for (const priceTier of priceTiers) {
      priceCategory =
        priceTier <= price ? PRICE_CATEGORY_MAPPINGS[priceTier] : priceCategory;
      priceCategory =
        priceCategory === "free" && price > 0
          ? PRICE_CATEGORY_MAPPINGS[priceTier]
          : priceCategory;
    }
    return priceCategory;
  });

  /**
   * Return true if the program has damage defined for either standard or blackIce
   */
  Handlebars.registerHelper("cprProgramHasDamageRoll", (program) => {
    let returnCode = false;
    if (typeof program === "object") {
      if (
        program?.system.damage.standard !== "" ||
        program?.system.damage.blackIce !== ""
      ) {
        returnCode = true;
      }
    }
    return returnCode;
  });

  /**
   * Returns specific property for ammo's damage override. "Override" is a boolean,
   * whether or not to apply the override. "Value" is the damage value, e.g. "3d6".
   *
   * @param {String} ammoItem - the ammo item that may be doing the override.
   * @param {String} override - The override we want, 'damage' or 'autofire'.
   * @param {String} property - Should be 'mode', 'value', or 'minimum'.
   */
  Handlebars.registerHelper(
    "cprGetAmmoOverrideProp",
    (ammoItem, override, property) => {
      if (
        !(property === "mode" || property === "value" || property === "minimum")
      ) {
        return LOGGER.debug(
          `The only currently valid property parameters are 'mode', 'value', or 'minimum'. '${property}' is not valid.`
        );
      }

      if (!(override === "damage" || override === "autofire")) {
        return LOGGER.debug(
          `The only currently valid override keys are 'damage' and 'autofire'. '${override}' is not valid.`
        );
      }

      // If no ammo item, return "none". This is a hack to not add extra logic to the handlebars.
      // Prevents melee and unloaded weapons from displaying italicized/tool-tipped damage text-pills.
      return ammoItem ? ammoItem.system.overrides[override][property] : "none";
    }
  );

  /**
   * Returns damage for a particular weapon, taking into account loaded ammo which may
   * modify the base damage.
   *
   * @param {CPRWeapon} weapon - weapon item whose damage we are interested in returning

   */
  Handlebars.registerHelper("cprGetWeaponDamage", (weapon) => {
    return weapon.getWeaponDamage();
  });

  /**
   * Returns the autofire maximum for a particular weapon, taking into account loaded ammo,
   * which may modify the base autofire maximum.
   *
   * @param {CPRWeapon} weapon - weapon item whose autofire Maximum we are interested in returning

   */
  Handlebars.registerHelper("cprGetWeaponAutofireMax", (weapon) => {
    const weaponAutofireMax = weapon.system.fireModes.autoFire;
    const [ammoItem] = weapon.getInstalledItems("ammo");
    let trueMax = 0;
    if (ammoItem && ammoItem.system.overrides.autofire.mode === "set") {
      trueMax = ammoItem.system.overrides.autofire.value;
    } else if (
      ammoItem &&
      ammoItem.system.overrides.autofire.mode === "modify"
    ) {
      const ammoAutofireModifier = ammoItem.system.overrides.autofire.value;
      const ammoAutofireMin = ammoItem.system.overrides.autofire.minimum;
      trueMax = Math.max(
        weaponAutofireMax + ammoAutofireModifier,
        ammoAutofireMin
      );
    } else {
      trueMax = weaponAutofireMax;
    }

    return trueMax;
  });

  /**
   * Return true/false depending on whether debugElements setting in the game is enabled
   */
  Handlebars.registerHelper("cprIsDebug", () => {
    return game.settings.get(game.system.id, "debugElements");
  });

  /* Emit a debug message to the dev log
   */
  Handlebars.registerHelper("cprDebug", (msg) => {
    LOGGER.debug(msg);
  });

  /**
   * Sanitize a string to remove Foundry @UUID references and sanitize HTML
   */
  Handlebars.registerHelper("cprSanitizeText", (string) => {
    return TextUtils.sanitizeEnrichedText(string);
  });

  /**
   * Transform a string to upper/lowercase
   */
  Handlebars.registerHelper("cprTextTransform", (string, transform) => {
    switch (transform) {
      case "upper":
        return string.toUpperCase();
      case "lower":
        return string.toLowerCase();
      default:
        return string;
    }
  });

  Handlebars.registerHelper("cprHighlightDVRuler", (item) => {
    const token = item.actor.sheet?.token;
    let itemDvTable = item.system?.dvTable;
    if (token !== null && itemDvTable !== null && itemDvTable !== "") {
      const tokenDv = token.object.document.getFlag(
        game.system.id,
        "cprDvTable"
      );
      const firetype = token.actor.getFlag(
        game.system.id,
        `firetype-${item.id}`
      );
      if (firetype === "autofire") {
        itemDvTable = `${itemDvTable} (Autofire)`;
      }
      if (tokenDv?.name === itemDvTable) {
        return true;
      }
    }
    return false;
  });

  /**
   * Map items to wiki links
   * Some items are pluralised, some are not, map these
   */
  Handlebars.registerHelper("cprWikiLink", (string) => {
    const gitlabUrl = `https://gitlab.com/cyberpunk-red-team/fvtt-${game.system.id}`;
    const wikiUrl = `${gitlabUrl}/-/wikis/`;
    const itemPath = "System-Documentation/Items";
    switch (string) {
      case "ammo":
        return `${wikiUrl}/${itemPath}/Ammo`;
      case "armor":
        return `${wikiUrl}/${itemPath}/Armor`;
      case "clothing":
        return `${wikiUrl}/${itemPath}/Clothing`;
      case "criticalInjury":
        return `${wikiUrl}/${itemPath}/Critical-Injuries`;
      case "cyberdeck":
        return `${wikiUrl}/${itemPath}/Cyberdecks`;
      case "cyberware":
        return `${wikiUrl}/${itemPath}/Cyberware`;
      case "drug":
        return `${wikiUrl}/${itemPath}/Drugs`;
      case "gear":
        return `${wikiUrl}/${itemPath}/Gear`;
      case "itemUpgrade":
        return `${wikiUrl}/${itemPath}/Upgrades`;
      case "netarch":
        return `${wikiUrl}/${itemPath}/NET-Architecture`;
      case "program":
        return `${wikiUrl}/${itemPath}/Programs`;
      case "role":
        return `${wikiUrl}/${itemPath}/Roles`;
      case "skill":
        return `${wikiUrl}/${itemPath}/Skills`;
      case "vehicle":
        return `${wikiUrl}/${itemPath}/Vehicles`;
      case "weapon":
        return `${wikiUrl}/${itemPath}/Weapons`;
      default:
        return string;
    }
  });

  /**
   * Filter weapons by ranged/melee
   *
   * @param {Array<CPRWeaponItem>} Array of Weapons
   * @param (String) `ranged`/`melee`
   */
  Handlebars.registerHelper("cprFilterWeapons", (weapons, type) => {
    switch (type) {
      case "ranged": {
        return weapons.filter((weapon) => weapon.system.isRanged);
      }
      case "melee": {
        return weapons.filter((weapon) => !weapon.system.isRanged);
      }
      default: {
        return [];
      }
    }
  });
}
