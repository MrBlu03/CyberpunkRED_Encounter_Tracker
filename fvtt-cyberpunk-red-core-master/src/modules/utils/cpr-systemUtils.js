/* eslint-env jquery */

import LOGGER from "./cpr-logger.js";

/**
 * CPR-C utilities that are meant to have broad application across the whole system module.
 */
export default class CPRSystemUtils {
  /* COMPENDIA AND FOLDER UTILS */

  static GetWorldCompendia(ctype = null) {
    if (!game.packs) return [];
    const packs = game.packs.filter((p) => p.metadata.packageType === "world");
    if (ctype) {
      return packs.filter((p) => p.metadata.type === ctype);
    }
    return packs;
  }

  /**
   * Retrieve a specific document in a compendium
   *
   * @async
   * @static
   * @param {String} cname - compendium name (which is not the human readable thing, that's the "label")
   * @param {String} dname - document name to look for
   * @returns {Document} - returns a Document object with specific document searched for by name
   */
  static async GetCompendiumDoc(cname, dname) {
    const comp = game.packs.get(cname);
    return comp.getDocument(
      comp.index.contents.filter((i) => i.name === dname)[0]._id
    );
  }

  /**
   * Retrieve the documents packed up in a compendium (aka a pack)
   *
   * @async
   * @static
   * @param {String} cname - name of the compendium to retrieve (which is not the human readable thing, that's the "label")
   * @returns {Array<Document>} - returns an array with all documents from compendium
   */
  static async GetCompendiumDocs(cname) {
    return game.packs.get(cname).getDocuments();
  }

  /**
   * Given a compendium label, return its ID. If multiple compendia have the same label, this will
   * return the first one encountered and throw a warning.
   *
   * @static
   * @param {String} name - name to look up by
   */
  static GetCompendiumIdByLabel(label) {
    const comps = game.packs.filter((p) => p.metadata.label === label);
    if (comps.length > 1) {
      this.DisplayMessage(
        "warn",
        `${this.Localize("CPR.messages.duplicateCompendiumLabel")} "${label}"`
      );
    } else if (comps.length === 0) {
      this.DisplayMessage(
        "error",
        `${this.Localize("CPR.messages.noCompendiumLabel")} "${label}"`
      );
      return null;
    }
    return comps[0].metadata.id;
  }

  /**
   * Take a default object of themes and gather them from other modules which can
   * register them with:
   * game.modules.get("module-name").cprcThemes = { foo: "bar" };
   *
   * @static
   * @themes {Object} - Themes to be merged with module themes
   *                    In this case likely `CPR.themes` from config.js
   * @returns {Object} - Merged choices of themes
   */
  static GetThemes(themes) {
    const defaultThemes = themes;
    const moduleThemes = {};

    // Filter modules that have 'cprcThemes' defined
    const themeModules = game.modules.filter((module) => {
      return module.active && module && module.cprcThemes;
    });

    // Loop over any modules registering 'cprcThemes' and build a new object
    for (const module of themeModules) {
      const moduleChoices = module.cprcThemes;
      Object.assign(moduleThemes, moduleChoices);
    }

    // Merge them all together with the system provided themes
    const mergedChoices = { ...defaultThemes, ...moduleThemes };

    return mergedChoices;
  }

  /**
   * Set the selected theme
   *
   * @static
   */
  static SetTheme(node) {
    const theme = game.settings.get(game.system.id, "theme")
      ? game.settings.get(game.system.id, "theme")
      : "default";

    // `node` is passed from the `PopOut:popout` hook, so if we have that set the
    // theme in the popped out window, else just set it in the primary window
    if (node) {
      node.ownerDocument.documentElement.setAttribute("data-cpr-theme", theme);
    } else {
      document.documentElement.setAttribute("data-cpr-theme", theme);
    }
  }

  /**
   * Return an array of "core" skills that are defined in the rules, and all characters
   * start with them defined.
   *
   * @returns {Documents}
   */
  static async GetCoreSkills() {
    return CPRSystemUtils.GetCompendiumDocs(
      `${game.system.id}.internal_skills`
    );
  }

  /**
   * Retrieves the martial art skills from actorData.
   *
   * @param {Object} actorData - The data of the actor.
   * @returns {Set} - A Set containing martial art skills from the actorData.
   */
  static GetMartialArtSkills(actorData) {
    // Get any skills with `skillType` === `martialArts`
    const martialArtSkills = new Set(
      actorData.itemTypes.skill.reduce((acc, item) => {
        if (item.system.skillType === "martialArt") {
          acc.push(this.slugify(item.name));
        }
        return acc;
      }, [])
    );

    return martialArtSkills;
  }

  /**
   * Retrieves the attackable skills of an actor based on the provided actorData.
   *
   * @param {Object} actorData - The data of the actor containing item types and systems.
   * @returns {Set} - A Set containing attackable skills of the actor.
   */
  static GetAttackableSkills(actorData) {
    // Find the default attack skills (meleeWeapon, autofire, etc.)
    // the `Evasion` skill gets grouped with these so we need to exclude it
    // manually.
    const defaultAttackSkills = new Set(
      actorData.itemTypes.skill.reduce((acc, item) => {
        const itemCategory = item.system.category;
        const itemName = this.slugify(item.name);
        const weaponSkills = ["rangedweaponSkills", "fightingSkills"];
        const excludeSkills = ["evasion"];
        if (
          weaponSkills.includes(itemCategory) &&
          !excludeSkills.includes(itemName)
        ) {
          acc.push(itemName);
        }
        return acc;
      }, [])
    );

    // Get the martialArt Skills
    const martialArtSkills = this.GetMartialArtSkills(actorData);

    // Get the `weaponSkill` from all weapons in the actorData.
    // Filter out any blank entries, this can happen in degenerate cases where
    // a weapon loses it's skill so remove from the Set.
    const weaponAttackSkills = new Set(
      actorData.system.weapons.available
        .map((weapon) => {
          if (weapon.system.weaponSkill !== "") {
            this.slugify(weapon.system.weaponSkill);
          }
          // Return null to be filtered out
          return null;
        })
        .filter((skill) => skill !== null)
    );

    // Combine the above into a Set and return it
    const attackSkills = new Set([
      ...defaultAttackSkills,
      ...weaponAttackSkills,
      ...martialArtSkills,
    ]);

    return attackSkills;
  }

  /**
   * Return an array of "core" cyberware that is installed in all characters. These objects
   * are how cyberware with no corresponding foundation to install it in. (chipware for example)
   *
   * @returns {Documents}
   */
  static async GetCoreCyberware() {
    return CPRSystemUtils.GetCompendiumDocs(
      `${game.system.id}.internal_cyberware-core`
    );
  }

  /**
   * Get DV tables that map DVs to distances when using a ranged weapon
   * @returns {Array} - array of tables
   */
  static async GetDvTables() {
    const tableList = await CPRSystemUtils.GetCompendiumDocs(
      game.settings.get(game.system.id, "dvRollTableCompendium")
    );
    tableList.sort((a, b) => (a.name > b.name ? 1 : -1));
    return tableList;
  }

  static async SetDvTable(token, tableName) {
    const dvTables = await CPRSystemUtils.GetDvTables();
    const [selectedTable] = dvTables.filter(
      (table) => table.name === tableName
    );
    const dvSetting = selectedTable
      ? { name: selectedTable.name, table: {} }
      : null;
    if (selectedTable) {
      for (const result of selectedTable.results) {
        // Rolltable entry of type is a Text entry
        if (result.type === "text") {
          const { range } = result;
          const key = `${range[0]}_${range[1]}`;
          const dv = result.text;
          dvSetting.table[key.toString()] = dv;
        }
      }
    }
    // Because we're setting a flag to an object, Foundry will try to merge it if we
    // just call setFlag. We unset it first.
    await token.document.unsetFlag(game.system.id, "cprDvTable");
    await token.document.setFlag(game.system.id, "cprDvTable", dvSetting);
  }

  /**
   * Get rollable tables by name, optionally by searching with a regexp. Note this is not meant for
   * compendia, but rather rolltables created in the world.
   *
   * @param {String} tableName
   * @param {RegExp} useRegExp
   * @returns {Array} table objects matching the given criteria
   */
  static GetRollTables(tableName, useRegExp) {
    let tableList;
    if (useRegExp) {
      const searchString = new RegExp(tableName);
      tableList = game.tables.filter((t) => t.name.match(searchString));
    } else {
      tableList = game.tables.filter((t) => t.name === tableName);
    }
    return tableList;
  }

  /**
   * Some actions users can take in this system will produce a bunch of documents are entities, and
   * we group them up in a dynamically created folder. This is where that magic happens.
   *
   * @param {String} type - the entity type the folder should group together
   * @param {String} name - a name for the folder
   * @param {String} options - Additional options
   * @param {Folder|null} [options.parent=null] - optional parent folder
   * @param {Boolean} [options.forceCreate=false] - create a new folder if the name provided already exists
   * @returns {Folder} - the referenced folder or a newly created one
   */
  static async GetFolder(
    type,
    name,
    options = { parent: null, forceCreate: false }
  ) {
    const folderList = game.folders.filter(
      (folder) => folder.name === name && folder.type === type
    );
    // If the folder does not exist, we create it.
    return folderList.length === 1 && !options.forceCreate
      ? folderList[0]
      : Folder.create({ name, type, folder: options.parent });
  }

  /* MESSAGE AND STRING UTILS */

  /**
   * Display user-visible message. (blue, yellow, or red background)
   *
   * @param {String} msgType - type of message to display, which controls the color fo the dialog
   * @param {String} msg - the message to print (untranslated)
   */
  static async DisplayMessage(msgType, msg) {
    const localizedMessage = CPRSystemUtils.Localize(msg);
    switch (msgType) {
      case "warn":
        ui.notifications.warn(localizedMessage);
        LOGGER.warn(localizedMessage);
        break;
      case "error":
        ui.notifications.error(localizedMessage);
        LOGGER.error(localizedMessage);
        break;
      case "notify":
        ui.notifications.notify(localizedMessage);
        LOGGER.log(localizedMessage);
        break;
      default:
    }
  }

  /**
   * Localize a string using internationalization.
   *
   * This static method allows you to localize a string using internationalization (i18n).
   * It utilizes the `game.i18n.localize()` method to retrieve the localized version of the string.
   *
   * @param {string} string - The string key to be localized.
   * @returns {string} The localized version of the input string.
   *
   */
  static Localize(string) {
    return game.i18n.localize(string);
  }

  /**
   * Format a string using internationalization and substitution.
   *
   * This static method allows you to format a string using internationalization (i18n)
   * and substitution of values from an object. It utilizes the `game.i18n.format()` method
   * to perform the formatting.
   *
   * @param {string} string - The string to be formatted, possibly containing placeholders.
   * @param {object} object - An object containing key-value pairs for substitution.
   * @returns {string} The formatted string with substituted values.
   *
   */
  static Format(string, object) {
    return game.i18n.format(string, object);
  }

  /**
   * We use temporary objects with keys derived from skill names elsewhere in the code base.
   * We need to be able to programmatically produce those keys from the name, and that is
   * what this method does. It takes a string and converts it to camelcase.
   *
   * These are used as parts of translation string identifies too. Examples:
   *  "CPR.global.itemType.skill.languageStreetslang"               "CPR.global.itemType.skill.athleticsAndContortionist"
   *  "CPR.global.itemType.skill.basicTechAndWeaponstech"           "CPR.global.itemType.skill.compositionAndEducation"
   *  "CPR.global.itemType.skill.enduranceAndResistTortureAndDrugs" "CPR.global.itemType.skill.persuasionAndTrading"
   *  "CPR.global.itemType.skill.evasionAndDance"                   "CPR.global.itemType.skill.pickLockAndPickPocket"
   *  "CPR.global.itemType.skill.firstAidAndParamedicAndSurgery"
   *
   * NOTE: The strings above are used for Elfines characters, and not used in the code base anywhere. We
   *       have CI that checks all translation strings are used, so to avoid making that fail, please
   *       keep the examples here.
   *
   * TODO: not sure returning something based on the name will work with localization
   *
   * @returns {String}
   */
  static slugify(name) {
    const slug = name;
    const initialSplit = slug.split(" ").join("");
    const orCaseSplit = initialSplit.split("/").join("Or");
    const parenCaseSplit = initialSplit.split("(").join("").split(")").join("");
    const andCaseSplit = initialSplit
      .split("/")
      .join("And")
      .split("&")
      .join("And");
    if (
      slug === "Conceal/Reveal Object" ||
      slug === "Paint/Draw/Sculpt" ||
      slug === "Resist Torture/Drugs"
    ) {
      return orCaseSplit.charAt(0).toLowerCase() + orCaseSplit.slice(1);
    }
    if (slug === "Language (Streetslang)") {
      return parenCaseSplit.charAt(0).toLowerCase() + parenCaseSplit.slice(1);
    }
    return andCaseSplit.charAt(0).toLowerCase() + andCaseSplit.slice(1);
  }

  static SortItemListByName(itemList) {
    const itemDataList = itemList.map((o) => ({
      name: o.name,
      uuid: o.uuid,
      type: o.type,
    }));
    const sortedList = itemDataList.length > 0 ? [] : itemList;
    if (sortedList.length === 0) {
      const sortedDataList = [];
      itemDataList.forEach((itemData) => {
        const newItemData = foundry.utils.duplicate(itemData);
        const localizedValue =
          `CPR.global.itemType.${newItemData.type}.`.concat(
            this.slugify(newItemData.name)
          );
        if (this.Localize(localizedValue) !== localizedValue) {
          newItemData.name = this.Localize(localizedValue);
        }
        sortedDataList.push(newItemData);
      });

      sortedDataList.sort((a, b) => {
        let comparator = 0;
        if (a.name > b.name) {
          comparator = 1;
        } else if (b.name > a.name) {
          comparator = -1;
        }
        return comparator;
      });

      for (const itemData of sortedDataList) {
        const [item] = itemList.filter((i) => i.uuid === itemData.uuid);
        sortedList.push(item);
      }
    }
    return sortedList;
  }

  /* USER SETTING UTILS */

  /**
   * For settings like favorite items or skills, and opening or closing categories, we save the user's
   * preferences in a hidden system setting.
   *
   * To Do: Flags are a better implementation.
   *
   * @param {String} type - indicate whether this is a sheetConfig setting or something else
   * @param {String} name - name for the setting
   * @param {*} value - the value for the setting to save
   * @param {*} extraSettings - a prefix for the name of the setting (sheetConfig only)
   */
  static SetUserSetting(type, name, value, extraSettings) {
    const userSettings = game.settings.get(game.system.id, "userSettings")
      ? game.settings.get(game.system.id, "userSettings")
      : {};
    switch (type) {
      case "sheetConfig": {
        // If this is a sheetConfig setting, our user may have settings for different sheets, so
        // to account for this, we pass the id of the sheet that this setting is
        // for in extraSettings.  We store the value as the id-settingName in userSettings.sheetConfig
        const settingKey = `${extraSettings}-${name}`;
        // Get all of the sheet config data stored for this user
        let sheetConfigData = userSettings.sheetConfig;
        // See if we have any sheetConfig data
        if (sheetConfigData === undefined) {
          // If not, we set sheetConfigData to an empty object;
          sheetConfigData = {};
        }
        // We set the value of the sheet data for our key
        sheetConfigData[settingKey] = value;

        // Update the sheetConfig setting in our userSettings
        userSettings.sheetConfig = sheetConfigData;
        break;
      }
      default: {
        // By default, we store a simple name value/key pair
        userSettings[name] = value;
      }
    }
    // Update the userSettings object
    game.settings.set(game.system.id, "userSettings", userSettings);
  }

  /**
   * Get a hidden user setting. (see SetUserSetting above)
   *
   * @param {String} type - indicate whether this is a sheetConfig setting or something else
   * @param {String} name - name for the setting
   * @param {*} extraSettings - a prefix for the name of the setting (sheetConfig only)
   * @returns - the request hidden setting value
   */
  static GetUserSetting(type, name, extraSettings) {
    const userSettings = game.settings.get(game.system.id, "userSettings")
      ? game.settings.get(game.system.id, "userSettings")
      : {};
    let requestedValue;
    switch (type) {
      case "sheetConfig": {
        const settingKey = `${extraSettings}-${name}`;
        const sheetConfigData = userSettings.sheetConfig;
        if (sheetConfigData !== undefined) {
          requestedValue = sheetConfigData[settingKey];
        }
        break;
      }
      default: {
        requestedValue = userSettings[name];
      }
    }
    return requestedValue;
  }

  /**
   * When a new object (document) is created in our module, we want to provide a cool looking
   * default icon. This method retrieves paths to icons based on the object type.
   *
   * @param {String} foundryObject - the object (document) type (Actor, Item, etc)
   * @param {*} objectType - the subtype of object to get an icon for (e.g. ammo or armor for an Item)
   * @returns {String} - path to an icon to use
   */
  static GetDefaultImage(foundryObject, objectType) {
    let imageLink = "";
    if (foundryObject === "Item") {
      switch (objectType) {
        case "ammo": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Ammo.svg`;
          break;
        }
        case "armor": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Armor.svg`;
          break;
        }
        case "clothing": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Clothing.svg`;
          break;
        }
        case "criticalInjury": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Critical_Injury.svg`;
          break;
        }
        case "cyberdeck": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Cyberdeck.svg`;
          break;
        }
        case "cyberware": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Cyberware.svg`;
          break;
        }
        case "gear": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Gear.svg`;
          break;
        }
        case "netarch": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Net_Architecture.svg`;
          break;
        }
        case "program": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Program.svg`;
          break;
        }
        case "role": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Role.svg`;
          break;
        }
        case "skill": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Skill.svg`;
          break;
        }
        case "vehicle": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Vehicle.svg`;
          break;
        }
        case "weapon": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Weapon.svg`;
          break;
        }
        default: {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Gear.svg`;
          break;
        }
      }
    } else if (foundryObject === "Actor") {
      switch (objectType) {
        case "blackIce": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/default-blackice.svg`;
          break;
        }
        case "container": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Container.svg`;
          break;
        }
        case "demon": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/default-demon.svg`;
          break;
        }
        case "mook": {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_Mook.svg`;
          break;
        }
        default: {
          imageLink = `systems/${game.system.id}/icons/compendium/default/Default_CPR_Mystery_Man.svg`;
        }
      }
    }
    return imageLink;
  }

  /**
   * Get the whole prototype chain as an array so we know what kind of roll this is, and what its parent classes are.
   * Used in roll-dialog.js sheet data and determining which modifiers apply to the rolls.
   * Adapted from this comment: https://stackoverflow.com/a/70089208
   *
   * @param {Object} objectData - some object with a class
   * @return {Array.<string>} - array of parent class names; strings.
   */
  static getPrototypeChain(objectData) {
    const prototypeChain = [];
    let currentPrototype = objectData;
    while (currentPrototype) {
      currentPrototype = Object.getPrototypeOf(currentPrototype);
      if (currentPrototype && currentPrototype.constructor.name !== "Object") {
        prototypeChain.push(currentPrototype.constructor.name);
      }
    }
    return prototypeChain;
  }

  /**
   * Get targeted or selected tokens.
   *
   * @param {String} targetedOrSelected - either "targeted" or "selected"
   * @return {Array} - Targeted or selected tokens.
   */
  static getUserTargetedOrSelected(targetedOrSelected) {
    const targets = new Set(game.user.targets);
    const tokens =
      targetedOrSelected === "selected"
        ? canvas.tokens.controlled
        : Array.from(targets);
    tokens.sort((a, b) => (a.name > b.name ? 1 : -1));
    return tokens;
  }

  /* DATA TEMPLATE UTILS */

  /**
   * Given a data model mixin name, return the array of item types it is applied to.
   *
   * @param {String} mixinName - the mixin name to look up
   * @param {String} [docClass="Item"] - class of document: "Item" or "Actor"
   * @returns {Array}
   */
  static getDocTypesFromMixin(mixinName, docClass = "Item") {
    const docTypes = [];
    const docDataModels = Object.entries(CONFIG[docClass].dataModels);
    docDataModels.forEach(([entityType, dataModel]) => {
      if (dataModel.mixins.includes(mixinName)) {
        docTypes.push(entityType);
      }
    });
    return docTypes;
  }

  /**
   * Return an array of data model mixins associated with this Document's type. "common" is intentionally
   * omitted because nothing should operate on it.
   *
   * @param {String} docType - the document type to look up, e.g. "weapon", "armor", etc.
   * @param {String} [docClass="Item"] - class of document: "Item" or "Actor"
   * @returns {Array} - array of document types which have the mixin
   */
  static getMixins(docType, docClass = "Item") {
    return CONFIG[docClass].dataModels[docType].mixins.filter(
      (t) => t !== "common"
    );
  }

  /**
   * Answer whether a document has a specific mixin applied or not
   *
   * @param {String} docType - the document type to look up, e.g. "weapon", "armor", etc.
   * @param {String} mixinName - the mixin name to look up
   * @param {String} [docClass="Item"] - class of document: "Item" or "Actor"
   * @returns {Boolean}
   */
  static hasMixin(docType, mixin, docClass = "Item") {
    return CPRSystemUtils.getMixins(docType, docClass).includes(mixin);
  }

  /* Everything else */

  /**
   * Inspect an event object for passed-in field specific to the target (link) that was clicked.
   * This code will initially look at the current target, and if the field is not found, it will
   * climb up the parents of the target until one is found, or print an error and return undefined.
   *
   * @param {Object} event - event data from jquery
   * @param {String} datum - the field we are interested in getting
   * @returns {String} - the value of the field passed in the event data
   */
  static GetEventDatum(event, datum) {
    let id = $(event.currentTarget).attr(datum);
    if (typeof id === "undefined") {
      LOGGER.debug(
        `Could not find ${datum} in currentTarget trying .item parents`
      );
      id = $(event.currentTarget).parents(".item").attr(datum);
      if (typeof id === "undefined") {
        LOGGER.debug(`Could not find ${datum} in the event data!`);
      }
    }
    return id;
  }

  /**
   * Ensure something is a numeric and if it is not, log an error. Since this seems to be a common
   * occurrence and causes data corruption, logging an error which produces a stack trace will
   * be useful in determining where the issue is.
   *
   * @static
   * @param {String} numericVariable - the html string to convert into plain text
   * @returns {Boolean}
   */
  static isNumeric(numericVariable) {
    if (Number.isNaN(numericVariable)) {
      LOGGER.error("Expected a numeric, but received NaN");
      return false;
    }
    return true;
  }
}
