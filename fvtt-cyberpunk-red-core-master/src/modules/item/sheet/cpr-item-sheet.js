import LOGGER from "../../utils/cpr-logger.js";
import CPR from "../../system/config.js";
import { CPRRoll } from "../../rolls/cpr-rolls.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import SelectRoleBonuses from "../../dialog/cpr-select-role-bonuses-prompt.js";
import createImageContextMenu from "../../utils/cpr-imageContextMenu.js";
import CPRDialog from "../../dialog/cpr-dialog-application.js";
import RoleAbilitySchema from "../../datamodels/item/components/role-ability-schema.js";

/**
 * Extend the basic ActorSheet.
 * @extends {ItemSheet}
 */

export default class CPRItemSheet extends ItemSheet {
  /* -------------------------------------------- */
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      tabs: [
        {
          navSelector: ".navtabs-item",
          contentSelector: ".item-bottom-content-section",
          initial: "item-description",
        },
      ],
      width: 715,
      height: "auto",
    });
  }

  // eslint-disable-next-line class-methods-use-this
  get template() {
    return `systems/${game.system.id}/templates/item/cpr-item-sheet.hbs`;
  }

  get classes() {
    return super.defaultOptions.classes.concat([
      "sheet",
      "item",
      `${this.item.type}`,
    ]);
  }

  /** @override */
  async getData() {
    const foundryData = super.getData();
    const cprData = {};
    cprData.isGM = game.user.isGM;
    const itemType = foundryData.item.type;
    const mixins = SystemUtils.getMixins(itemType);
    if (itemType === "role" || mixins.includes("attackable")) {
      // relativeSkills and relativeAmmo will be other items relevant to this one.
      // For owned objects, the item list will come from the character owner
      // For unowned objects, the item list will come from the core list of objects
      if (foundryData.item.isOwned) {
        cprData.relativeSkills = this.object.actor.itemTypes.skill;
        cprData.relativeAmmo = this.object.actor.itemTypes.ammo;
      } else {
        const coreSkills = await SystemUtils.GetCoreSkills();
        const worldSkills = game.items.filter((i) => i.type === "skill");
        cprData.relativeSkills = coreSkills.concat(worldSkills);
      }
    }

    if (mixins.includes("attackable")) {
      cprData.dvTableNames = await CPRItemSheet._getWeaponDVSelectOptions();
      cprData.weaponSkillSelectOptions =
        CPRItemSheet._getWeaponSkillSelectOptions(cprData.relativeSkills);
    }

    if (mixins.includes("effects")) {
      cprData.effectNames = this.item.getEffectNames();
      cprData.effectNames.push({
        label: SystemUtils.Localize("CPR.itemSheet.effects.none"),
        value: "none",
      });

      cprData.allowedUsages =
        this.item.system.allowedUsage &&
        this.item.system.allowedUsage.map((use) => {
          return {
            value: use,
            label: CPR.effectUses[use],
          };
        });
    }

    if (itemType === "itemUpgrade") {
      const { upgradableSelectOptions, upgradableSheetData } =
        CPRItemSheet._getItemUpgradeData(this.item);
      cprData.upgradableTypes = upgradableSelectOptions;
      cprData.upgradableDataPoints = upgradableSheetData;
    }

    if (itemType === "role") {
      const selectOptions = CPRItemSheet._getRoleSelectOptions(
        cprData.relativeSkills
      );
      cprData.selectOptions = selectOptions;
    }

    // Enrich the description so that links to foundry documents in item descriptions have proper functionality.
    foundryData.enrichedHTMLDescription = await TextEditor.enrichHTML(
      foundryData.item.system.description.value,
      { async: true }
    );
    return { ...foundryData, ...cprData };
  }

  /**
   * Retrieves the options for selecting DV tables in weapon settings.
   *
   * @return {Array} The options for selecting DV tables for weapons.
   */
  static async _getWeaponDVSelectOptions() {
    const dvTablesNames = (await SystemUtils.GetDvTables()).map((t) => {
      return { value: t.name, label: t.name };
    });
    return [
      {
        value: "",
        label: SystemUtils.Localize("CPR.global.generic.notApplicable"),
      },
      ...dvTablesNames,
    ];
  }

  /**
   * Generates the options for the weapon skill select element.
   *
   * @param {Array<CPRSkill>} skillList - The list of skills.
   * @return {Array} The options for the weapon skill select element.
   */
  static _getWeaponSkillSelectOptions(skillsList) {
    const options = [];

    Object.entries(CPR.skillCategoriesForWeapons).forEach(([k, v]) => {
      const optionGroup = SystemUtils.Localize(v);

      const skillByCategory = skillsList.filter((s) => k === s.system.category);

      skillByCategory.forEach((s) => {
        options.push({
          value: s.name,
          label: s.name,
          group: optionGroup,
        });
      });
    });

    return options;
  }

  /**
   * Generates the options for the role select element.
   *
   * @param {Array<CPRSkill>} skillList - The list of skills.
   * @return {Object} The options for the role select element.
   */
  static _getRoleSelectOptions(skillList, { includeMultiplier = false } = {}) {
    // Prepare Option Groups for Select Element.
    const optionGroups = {
      specialOptions: SystemUtils.Localize(
        "CPR.dialog.createEditRoleAbility.specialOptions"
      ),
      list: SystemUtils.Localize("CPR.dialog.createEditRoleAbility.skillList"),
    };
    // Prepare Skill options for Select Element.
    const skillOptions = [
      ...Object.entries(CPR.roleSpecialOptions).map(([k, v]) => {
        return {
          value: k,
          label: SystemUtils.Localize(v),
          group: optionGroups.specialOptions,
        };
      }),
      ...skillList.map((s) => {
        return {
          value: s.name,
          label: s.name,
          group: optionGroups.list,
        };
      }),
    ];
    // Prepare Stat options for Select Element.
    const statOptions = [
      {
        value: "--",
        label: SystemUtils.Localize("CPR.global.generic.notApplicable"),
        group: optionGroups.specialOptions,
      },
      ...Object.entries(CPR.statList).map(([k, v]) => {
        return {
          value: k,
          label: SystemUtils.Localize(v),
          group: optionGroups.list,
        };
      }),
    ];

    const selectOptions = {
      statOptions,
      skillOptions,
    };

    if (includeMultiplier) {
      // Prepare multiplier options for Select element.
      const multiplierOptions = [0.25, 0.5, 1, 2].map((v) => {
        return { value: v };
      });
      selectOptions.multiplierOptions = multiplierOptions;
    }

    return selectOptions;
  }

  /**
   * Retrieves data for item upgrades, and prepares it for display in the template.
   *
   * @return {Object} Item upgrade data for the template.
   */
  static _getItemUpgradeData(item) {
    const upgradableTypes = SystemUtils.getDocTypesFromMixin("upgradable");
    const upgradableSelectOptions = upgradableTypes.map((type) => {
      return {
        value: type,
        label: CPR.objectTypes[type],
      };
    });
    const upgradeType = item.system.type;
    const upgradableConfigData = CPR.upgradableDataPoints[upgradeType];
    const dataPointModTypes =
      CPR.upgradableDataPoints.upgradeConfig.configurableTypes;
    const upgradableSheetData = [];
    /* eslint-disable no-continue */
    for (const [key, value] of Object.entries(upgradableConfigData)) {
      // Omit this datapoint if its type is not "modifier" or "override".
      const omitDataPoint = !Object.keys(dataPointModTypes).includes(
        value.type
      );
      if (omitDataPoint) continue;

      const modData = item.system.modifiers[key];
      const dataPoint = {
        key,
        localization: value.localization,
        selectOptions: foundry.utils.duplicate(dataPointModTypes),
        modData,
        disableSituational: typeof value.isSituational === "undefined",
        disableOnByDefault: !modData.isSituational,
      }; /* eslint-enable no-continue */

      if (upgradeType === "clothing") delete dataPoint.selectOptions.override;

      upgradableSheetData.push(dataPoint);
    }

    return { upgradableSelectOptions, upgradableSheetData };
  }

  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;

    // Select all text when grabbing text input.
    $("input[type=text]").focusin(() => $(this).select());

    // generic listeners
    html
      .find(".item-checkbox")
      .click((event) => this._itemCheckboxToggle(event));

    html
      .find(".item-multi-option")
      .click((event) => this._itemMultiOption(event));

    html
      .find(".select-compatible-ammo")
      .click(() => this._selectCompatibleAmmo());

    html
      .find(".netarch-level-action")
      .click((event) => this._netarchLevelAction(event));

    html
      .find(".netarch-roll-level")
      .click(() => this._netarchGenerateFromTables());

    html
      .find(".role-ability-action")
      .click((event) => this._roleAbilityAction(event));

    html
      .find(".select-role-bonuses")
      .click((event) => this._selectRoleBonuses(event));

    html
      .find(".manage-installed-programs")
      .click(() => this._manageInstalledItems("program"));

    html
      .find(".manage-installed-upgrades")
      .click(() => this._manageInstalledItems("itemUpgrade"));

    html
      .find(".manage-installed-items")
      .click(() => this._manageInstalledItems());

    html
      .find(".uninstall-single-item")
      .click((event) => this._uninstallSingleItem(event));

    html
      .find(".item-view")
      .click((event) => this._renderReadOnlyItemCard(event));

    html
      .find(".manage-installable-types")
      .click((event) => this._manageInstallableTypes(event));

    html.find(".netarch-generate-auto").click(() => {
      if (game.user.isGM) {
        this.item._generateNetarchScene();
      } else {
        SystemUtils.DisplayMessage(
          "error",
          SystemUtils.Localize("CPR.netArchitecture.generation.noGMError")
        );
      }
    });

    html.find(".netarch-generate-custom").click(() => {
      if (game.user.isGM) {
        this.item._customize();
      } else {
        SystemUtils.DisplayMessage(
          "error",
          SystemUtils.Localize("CPR.netArchitecture.generation.noGMError")
        );
      }
    });

    html
      .find(".netarch-item-link")
      .click((event) => this._openItemFromId(event));

    // Active Effects listener
    html
      .find(".effect-control")
      .click((event) => this.item.manageEffects(event));

    // Change things when the "usage" for active effects changes
    html.find(".set-usage").change((event) => this._setUsage(event));

    // Set up right click context menu when clicking on Item's image
    this._createItemImageContextMenu(html);
  }

  /*
  INTERNAL METHODS BELOW HERE
  */

  _itemCheckboxToggle(event) {
    const cprItem = foundry.utils.duplicate(this.item);
    const target = SystemUtils.GetEventDatum(event, "data-target");
    const value = !foundry.utils.getProperty(cprItem, target);
    if (target === "system.concealable.concealable") {
      this.item.setConcealable(value);
    } else if (foundry.utils.hasProperty(cprItem, target)) {
      foundry.utils.setProperty(cprItem, target, value);
      this.item.update(cprItem);
      LOGGER.log(`Item ${this.item.id} ${target} set to ${value}`);
    }
  }

  async _itemMultiOption(event) {
    const cprItem = foundry.utils.duplicate(this.item);
    // the target the option wants to be put into
    const target = $(event.currentTarget)
      .parents(".item-multi-select")
      .attr("data-target");
    const value = SystemUtils.GetEventDatum(event, "data-value");
    if (foundry.utils.hasProperty(cprItem, target)) {
      const prop = foundry.utils.getProperty(cprItem, target);
      if (prop.includes(value)) {
        prop.splice(prop.indexOf(value), 1);
      } else {
        prop.push(value);
      }
      foundry.utils.setProperty(cprItem, target, prop);
      this.item.update(cprItem);
    }
  }

  async _selectCompatibleAmmo() {
    const cprItemData = this.item.system;
    let formData = {
      header: SystemUtils.Format(
        "CPR.dialog.selectCompatibleAmmo.selectCompatibleAmmo",
        {
          name: this.item.name,
        }
      ),
      selectedAmmo: cprItemData.ammoVariety,
    };
    // Show "Select Compatible Ammo" prompt.
    formData = await CPRDialog.showDialog(formData, {
      title: SystemUtils.Localize("CPR.dialog.selectCompatibleAmmo.title"),
      template: `systems/${game.system.id}/templates/dialog/cpr-select-compatible-ammo-prompt.hbs`,
    }).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }
    if (formData.selectedAmmo) {
      const filteredSelectedAmmo = formData.selectedAmmo.filter((a) => a);
      await this.item.setCompatibleAmmo(filteredSelectedAmmo);
    }
  }

  /**
   * This function creates and processes the dialog to apply bonuses from roles.
   *
   * @param {*} event
   */
  async _selectRoleBonuses(event) {
    const cprRoleData = foundry.utils.duplicate(this.item.system);
    const roleType = SystemUtils.GetEventDatum(event, "data-role-type"); // Either "mainRole" or "subRole".
    const coreSkills = await SystemUtils.GetCoreSkills(); // Get core skills.
    const customSkills = game.items.filter((i) => i.type === "skill"); // Get any custom skills.
    // If object is owned, get all skills on actor. If not, get all skills in system.
    const allSkills = this.object.isOwned
      ? this.actor.itemTypes.skill
      : coreSkills
          .concat(customSkills)
          .sort((a, b) => (a.name > b.name ? 1 : -1));
    const sortedAllSkills = SystemUtils.SortItemListByName(allSkills); // Sort these skills by name.

    // If we are editing a subability, get name from event data. Then, get the subrole from the name.
    const subRoleName = SystemUtils.GetEventDatum(event, "data-ability-name");
    const subRole = cprRoleData.abilities.find((a) => a.name === subRoleName);

    // The ability data is either item.system or item.system.someSubAbility.
    let abilityData = cprRoleData;
    if (subRole) {
      abilityData = subRole;
    }

    // Prepare relevant data for the dialog to use.
    let dialogData = {
      skillList: sortedAllSkills,
      roleData: abilityData,
    };

    // Call dialog and await results. Return if dialog is cancelled.
    dialogData = await SelectRoleBonuses.showDialog(dialogData).catch((err) =>
      LOGGER.debug(err)
    );
    if (dialogData === undefined) {
      return;
    }

    // If we are updating the main role ability, we can update item.system.
    // Else, find the correct subability and update that.
    if (roleType === "mainRole") {
      this.item.update({ system: dialogData.roleData });
    } else {
      foundry.utils.mergeObject(
        cprRoleData.abilities.find((a) => a.name === subRole.name),
        dialogData.subRole
      );
      this.item.update({ "system.abilities": cprRoleData.abilities });
    }
  }

  async _netarchGenerateFromTables() {
    // Show "Netarch Rolltable Generation" Prompt.
    const formData = await CPRDialog.showDialog(
      {},
      // Set options for dialog.
      {
        title: SystemUtils.Localize(
          "CPR.dialog.netArchitectureRolltableSelection.title"
        ),
        template: `systems/${game.system.id}/templates/dialog/cpr-netarch-rolltable-generation-prompt.hbs`,
      }
    ).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }
    const tableSetting = game.settings.get(
      game.system.id,
      "netArchRollTableCompendium"
    );
    const lobby = await SystemUtils.GetCompendiumDoc(
      tableSetting,
      "First Two Floors (The Lobby)"
    );
    const other = await SystemUtils.GetCompendiumDoc(
      tableSetting,
      "All Other Floors (".concat(formData.difficulty.capitalize(), ")")
    );
    const numberOfFloorsRoll = new CPRRoll(
      SystemUtils.Localize("CPR.rolls.roll"),
      "3d6"
    );
    await numberOfFloorsRoll.roll();
    const numberOfFloors = numberOfFloorsRoll.resultTotal;
    const branchCheck = new CPRRoll(
      SystemUtils.Localize("CPR.rolls.roll"),
      "1d10"
    );
    await branchCheck.roll();
    let branchCounter = 0;
    while (branchCheck.initialRoll >= 7) {
      branchCounter += 1;
      if (branchCounter > 7) {
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await branchCheck.roll();
    }
    let floors = await this._netarchDrawFromTableCustom(lobby, 2);
    if (numberOfFloors > 2) {
      floors = floors.concat(
        await this._netarchDrawFromTableCustom(other, numberOfFloors - 2)
      );
    }
    const prop = [];
    let index = 0;
    let floorIndex = 1;
    let minfloorIndexbranch = 3;
    let branch = "a";
    floors.forEach((floor) => {
      let content = "CPR.global.programClass.blackice";
      if (floor.results[0].text.match("^Password")) {
        content = "CPR.netArchitecture.floor.options.password";
      }
      if (floor.results[0].text.match("^File")) {
        content = "CPR.netArchitecture.floor.options.file";
      }
      if (floor.results[0].text.match("^Control Node")) {
        content = "CPR.netArchitecture.floor.options.controlnode";
      }
      let dv = "N/A";
      const dvRegex = /DV([0-9]+)/g;
      const match = dvRegex.exec(floor.results[0].text);
      if (match !== null && match.length > 1) {
        [, dv] = match;
      }
      let blackice = "--";
      if (content.match("blackice")) {
        switch (floor.results[0].text) {
          case "Asp":
            blackice = "CPR.netArchitecture.floor.options.blackIce.asp";
            break;
          case "Giant":
            blackice = "CPR.netArchitecture.floor.options.blackIce.giant";
            break;
          case "Hellhound":
            blackice = "CPR.netArchitecture.floor.options.blackIce.hellhound";
            break;
          case "Kraken":
            blackice = "CPR.netArchitecture.floor.options.blackIce.kraken";
            break;
          case "Liche":
            blackice = "CPR.netArchitecture.floor.options.blackIce.liche";
            break;
          case "Raven":
            blackice = "CPR.netArchitecture.floor.options.blackIce.raven";
            break;
          case "Scorpion":
            blackice = "CPR.netArchitecture.floor.options.blackIce.scorpion";
            break;
          case "Skunk":
            blackice = "CPR.netArchitecture.floor.options.blackIce.skunk";
            break;
          case "Wisp":
            blackice = "CPR.netArchitecture.floor.options.blackIce.wisp";
            break;
          case "Dragon":
            blackice = "CPR.netArchitecture.floor.options.blackIce.dragon";
            break;
          case "Killer":
            blackice = "CPR.netArchitecture.floor.options.blackIce.killer";
            break;
          case "Sabertooth":
            blackice = "CPR.netArchitecture.floor.options.blackIce.sabertooth";
            break;
          default:
            break;
        }
      }
      if (
        branchCounter > 0 &&
        floorIndex > minfloorIndexbranch &&
        floorIndex > numberOfFloors / (branchCounter + 1) &&
        index !== numberOfFloors - 1
      ) {
        floorIndex = minfloorIndexbranch;
        minfloorIndexbranch += 1;
        branch = String.fromCharCode(branch.charCodeAt() + 1);
        branchCounter -= 1;
      }
      prop.push({
        index,
        floor: floorIndex.toString(),
        branch,
        dv,
        content,
        blackice,
        description: "Roll ".concat(
          floor.roll.total.toString(),
          ": ",
          floor.results[0].text
        ),
      });
      index += 1;
      floorIndex += 1;
    });
    const cprItemData = foundry.utils.duplicate(this.item.system);
    foundry.utils.setProperty(cprItemData, "floors", prop);
    this.item.update({ system: cprItemData });
  }

  // eslint-disable-next-line class-methods-use-this
  async _netarchDrawFromTableCustom(table, number) {
    let abortCounter = 0;
    const drawDuplicatesRegex = "^File|^Control Node";
    const drawnNumbers = [];
    const drawnResults = [];
    while (drawnResults.length < number) {
      // eslint-disable-next-line no-await-in-loop
      const res = await table.draw({ displayChat: false });
      if (!drawnNumbers.includes(res.roll.total)) {
        if (!res.results[0].text.match(drawDuplicatesRegex)) {
          drawnNumbers.push(res.roll.total);
        }
        drawnResults.push(res);
      }
      abortCounter += 1;
      if (abortCounter > 1000) {
        break;
      }
    }
    return drawnResults;
  }

  async _netarchLevelAction(event) {
    const target = Number(
      SystemUtils.GetEventDatum(event, "data-action-target")
    );
    const action = SystemUtils.GetEventDatum(event, "data-action-type");
    const cprItemData = foundry.utils.duplicate(this.item.system);

    if (action === "delete") {
      const setting = game.settings.get(
        game.system.id,
        "deleteItemConfirmation"
      );
      if (setting) {
        const dialogMessage = `${SystemUtils.Localize(
          "CPR.dialog.deleteConfirmation.message"
        )} ${SystemUtils.Localize(
          "CPR.netArchitecture.floor.deleteConfirmation"
        )}?`;

        // Show "Default" dialog.
        const confirmDelete = await CPRDialog.showDialog(
          { dialogMessage },
          // Set the options for the dialog.
          { title: SystemUtils.Localize("CPR.dialog.deleteConfirmation.title") }
        ).catch((err) => LOGGER.debug(err));
        if (!confirmDelete) {
          return;
        }
      }
      if (foundry.utils.hasProperty(cprItemData, "floors")) {
        const prop = foundry.utils.getProperty(cprItemData, "floors");
        let deleteElement = null;
        prop.forEach((floor) => {
          if (floor.index === target) {
            deleteElement = floor;
          }
        });
        prop.splice(prop.indexOf(deleteElement), 1);
        foundry.utils.setProperty(cprItemData, "floors", prop);
        this.item.update({ system: cprItemData });
      }
    }

    if (action === "up" || action === "down") {
      if (foundry.utils.hasProperty(cprItemData, "floors")) {
        const prop = foundry.utils.getProperty(cprItemData, "floors");
        const indices = [];
        prop.forEach((floor) => {
          indices.push(floor.index);
        });
        let swapPartner = null;
        if (action === "up") {
          swapPartner = Math.min(...indices);
        } else {
          swapPartner = Math.max(...indices);
        }
        if (target !== swapPartner) {
          if (action === "up") {
            indices.forEach((i) => {
              if (i < target && i > swapPartner) {
                swapPartner = i;
              }
            });
          } else {
            indices.forEach((i) => {
              if (i > target && i < swapPartner) {
                swapPartner = i;
              }
            });
          }
          let element1 = null;
          let element2 = null;
          prop.forEach((floor) => {
            if (floor.index === target) {
              element1 = floor;
            }
          });
          prop.forEach((floor) => {
            if (floor.index === swapPartner) {
              element2 = floor;
            }
          });
          const newElement1 = foundry.utils.duplicate(element1);
          const newElement2 = foundry.utils.duplicate(element2);
          prop.splice(prop.indexOf(element1), 1);
          prop.splice(prop.indexOf(element2), 1);
          newElement1.index = swapPartner;
          newElement2.index = target;
          prop.push(newElement1);
          prop.push(newElement2);
          foundry.utils.setProperty(cprItemData, "floors", prop);
          this.item.update({ system: cprItemData });
        }
      }
    }

    if (action === "create") {
      let formData = {
        floornumbers: [
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
          "16",
          "17",
          "18",
        ],
        branchlabels: ["a", "b", "c", "d", "e", "f", "g", "h"],
        dvoptions: [
          "N/A",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
          "16",
          "17",
          "18",
          "19",
          "20",
        ],
        contentoptions: {
          "CPR.netArchitecture.floor.options.password": SystemUtils.Localize(
            "CPR.netArchitecture.floor.options.password"
          ),
          "CPR.netArchitecture.floor.options.file": SystemUtils.Localize(
            "CPR.netArchitecture.floor.options.file"
          ),
          "CPR.netArchitecture.floor.options.controlnode": SystemUtils.Localize(
            "CPR.netArchitecture.floor.options.controlnode"
          ),
          "CPR.global.programClass.blackice": SystemUtils.Localize(
            "CPR.global.programClass.blackice"
          ),
        },
        blackiceoptions: {
          "--": "--",
          "CPR.netArchitecture.floor.options.blackIce.asp":
            SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.blackIce.asp"
            ),
          "CPR.netArchitecture.floor.options.blackIce.giant":
            SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.blackIce.giant"
            ),
          "CPR.netArchitecture.floor.options.blackIce.hellhound":
            SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.blackIce.hellhound"
            ),
          "CPR.netArchitecture.floor.options.blackIce.kraken":
            SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.blackIce.kraken"
            ),
          "CPR.netArchitecture.floor.options.blackIce.liche":
            SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.blackIce.liche"
            ),
          "CPR.netArchitecture.floor.options.blackIce.raven":
            SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.blackIce.raven"
            ),
          "CPR.netArchitecture.floor.options.blackIce.scorpion":
            SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.blackIce.scorpion"
            ),
          "CPR.netArchitecture.floor.options.blackIce.skunk":
            SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.blackIce.skunk"
            ),
          "CPR.netArchitecture.floor.options.blackIce.wisp":
            SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.blackIce.wisp"
            ),
          "CPR.netArchitecture.floor.options.blackIce.dragon":
            SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.blackIce.dragon"
            ),
          "CPR.netArchitecture.floor.options.blackIce.killer":
            SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.blackIce.killer"
            ),
          "CPR.netArchitecture.floor.options.blackIce.sabertooth":
            SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.blackIce.sabertooth"
            ),
        },
        floor: "1",
        branch: "a",
        dv: "N/A",
        content: SystemUtils.Localize(
          "CPR.netArchitecture.floor.options.password"
        ),
        blackice: "--",
        description: "",
        returnType: "string",
      };
      // Show "NetArch Level" dialog.
      formData = await CPRDialog.showDialog(formData, {
        // Set the options for the dialog.
        title: SystemUtils.Localize("CPR.dialog.netArchitectureNewFloor.title"),
        template: `systems/${game.system.id}/templates/dialog/cpr-netarch-level-prompt.hbs`,
        width: "330px",
      }).catch((err) => LOGGER.debug(err));
      if (formData === undefined) {
        return;
      }

      if (foundry.utils.hasProperty(cprItemData, "floors")) {
        const prop = foundry.utils.getProperty(cprItemData, "floors");
        let maxIndex = -1;
        prop.forEach((floor) => {
          if (floor.index > maxIndex) {
            maxIndex = floor.index;
          }
        });
        prop.push({
          index: maxIndex + 1,
          floor: formData.floor,
          branch: formData.branch,
          dv: formData.dv,
          content: formData.content,
          blackice: formData.blackice,
          description: formData.description,
        });
        foundry.utils.setProperty(cprItemData, "floors", prop);
        this.item.update({ system: cprItemData });
      } else {
        const prop = [
          {
            index: 0,
            floor: formData.floor,
            branch: formData.branch,
            dv: formData.dv,
            content: formData.content,
            blackice: formData.blackice,
            description: formData.description,
          },
        ];
        foundry.utils.setProperty(cprItemData, "floors", prop);
        this.item.update({ system: cprItemData });
      }
    }

    if (action === "edit") {
      if (foundry.utils.hasProperty(cprItemData, "floors")) {
        const prop = foundry.utils.getProperty(cprItemData, "floors");
        let editElement = null;
        prop.forEach((floor) => {
          if (floor.index === target) {
            editElement = floor;
          }
        });
        let formData = {
          floornumbers: [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
          ],
          branchlabels: ["a", "b", "c", "d", "e", "f", "g", "h"],
          dvoptions: [
            "N/A",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
            "19",
            "20",
          ],
          contentoptions: {
            "CPR.netArchitecture.floor.options.password": SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.password"
            ),
            "CPR.netArchitecture.floor.options.file": SystemUtils.Localize(
              "CPR.netArchitecture.floor.options.file"
            ),
            "CPR.netArchitecture.floor.options.controlnode":
              SystemUtils.Localize(
                "CPR.netArchitecture.floor.options.controlnode"
              ),
            "CPR.global.programClass.blackice": SystemUtils.Localize(
              "CPR.global.programClass.blackice"
            ),
          },
          blackiceoptions: {
            "--": "--",
            "CPR.netArchitecture.floor.options.blackIce.asp":
              SystemUtils.Localize(
                "CPR.netArchitecture.floor.options.blackIce.asp"
              ),
            "CPR.netArchitecture.floor.options.blackIce.giant":
              SystemUtils.Localize(
                "CPR.netArchitecture.floor.options.blackIce.giant"
              ),
            "CPR.netArchitecture.floor.options.blackIce.hellhound":
              SystemUtils.Localize(
                "CPR.netArchitecture.floor.options.blackIce.hellhound"
              ),
            "CPR.netArchitecture.floor.options.blackIce.kraken":
              SystemUtils.Localize(
                "CPR.netArchitecture.floor.options.blackIce.kraken"
              ),
            "CPR.netArchitecture.floor.options.blackIce.liche":
              SystemUtils.Localize(
                "CPR.netArchitecture.floor.options.blackIce.liche"
              ),
            "CPR.netArchitecture.floor.options.blackIce.raven":
              SystemUtils.Localize(
                "CPR.netArchitecture.floor.options.blackIce.raven"
              ),
            "CPR.netArchitecture.floor.options.blackIce.scorpion":
              SystemUtils.Localize(
                "CPR.netArchitecture.floor.options.blackIce.scorpion"
              ),
            "CPR.netArchitecture.floor.options.blackIce.skunk":
              SystemUtils.Localize(
                "CPR.netArchitecture.floor.options.blackIce.skunk"
              ),
            "CPR.netArchitecture.floor.options.blackIce.wisp":
              SystemUtils.Localize(
                "CPR.netArchitecture.floor.options.blackIce.wisp"
              ),
            "CPR.netArchitecture.floor.options.blackIce.dragon":
              SystemUtils.Localize(
                "CPR.netArchitecture.floor.options.blackIce.dragon"
              ),
            "CPR.netArchitecture.floor.options.blackIce.killer":
              SystemUtils.Localize(
                "CPR.netArchitecture.floor.options.blackIce.killer"
              ),
            "CPR.netArchitecture.floor.options.blackIce.sabertooth":
              SystemUtils.Localize(
                "CPR.netArchitecture.floor.options.blackIce.sabertooth"
              ),
          },
          floor: editElement.floor,
          branch: editElement.branch,
          dv: editElement.dv,
          content: editElement.content,
          blackice: editElement.blackice,
          description: editElement.description,
          returnType: "string",
        };

        // Show "NetArch Level" dialog.
        formData = await CPRDialog.showDialog(formData, {
          // Set the options for the dialog.
          title: SystemUtils.Localize(
            "CPR.dialog.netArchitectureNewFloor.title"
          ),
          template: `systems/${game.system.id}/templates/dialog/cpr-netarch-level-prompt.hbs`,
        }).catch((err) => LOGGER.debug(err));
        if (formData === undefined) {
          return;
        }

        prop.splice(prop.indexOf(editElement), 1);
        prop.push({
          index: editElement.index,
          floor: formData.floor,
          branch: formData.branch,
          dv: formData.dv,
          content: formData.content,
          blackice: formData.blackice,
          description: formData.description,
        });
        foundry.utils.setProperty(cprItemData, "floors", prop);
        this.item.update({ system: cprItemData });
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _openItemFromId(event) {
    const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
    const itemEntity = game.items.get(itemId);
    if (itemEntity !== null) {
      itemEntity.sheet.render(true);
    } else {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Format("CPR.messages.itemDoesNotExistError", {
          itemid: itemId,
        })
      );
    }
  }

  // Installed Item Code

  async _manageInstalledItems(itemType) {
    const { item } = this;

    const promptResult = await this._selectInstallableItems(itemType);

    if (Object.keys(promptResult).length === 0) {
      return;
    }

    if (promptResult.uninstallItemList.length > 0) {
      await item.uninstallItems(promptResult.uninstallItemList);
    }

    if (promptResult.installItemList.length > 0) {
      await item.installItems(promptResult.installItemList);
    }
  }

  async _uninstallSingleItem(event) {
    // Warn/disallow user if trying to uninstall from items in a pack.
    if (this.item.pack)
      return SystemUtils.DisplayMessage(
        "warn",
        SystemUtils.Localize("CPR.messages.warningCannotModifyInstalledInPack")
      );
    const installedItemId = SystemUtils.GetEventDatum(event, "data-item-id");
    const actor = this.item.isEmbedded ? this.item.actor : null;
    const installedItem = actor
      ? actor.getOwnedItem(installedItemId)
      : game.items.get(installedItemId);
    return installedItem.uninstall();
  }

  async _roleAbilityAction(event) {
    const index = SystemUtils.GetEventDatum(event, "data-index");
    const action = SystemUtils.GetEventDatum(event, "data-action-type");

    const cprItemData = foundry.utils.duplicate(this.item.system);
    const { abilities } = cprItemData;

    const coreSkills = await SystemUtils.GetCoreSkills();
    const customSkills = game.items.filter((i) => i.type === "skill");
    const allSkills = this.object.isOwned
      ? this.actor.itemTypes.skill
      : coreSkills
          .concat(customSkills)
          .sort((a, b) => (a.name > b.name ? 1 : -1));

    const selectOptions = CPRItemSheet._getRoleSelectOptions(allSkills, {
      includeMultiplier: true,
    });

    let formData = {
      ...new RoleAbilitySchema(),
      ...selectOptions,
    };
    if (action === "create") {
      // Show "Role Ability" dialog.
      formData = await CPRDialog.showDialog(formData, {
        // Set options for dialog.
        title: SystemUtils.Localize("CPR.dialog.createEditRoleAbility.title"),
        template: `systems/${game.system.id}/templates/dialog/cpr-role-ability-prompt.hbs`,
      }).catch((err) => LOGGER.debug(err));
      if (formData === undefined) {
        return;
      }

      // eslint-disable-next-line no-nested-ternary
      const skillObject =
        formData.skill !== "--" && formData.skill !== "varying"
          ? allSkills.find((a) => a.name === formData.skill)
          : formData.skill === "varying"
          ? "varying"
          : "--";
      formData.skill = skillObject;
      abilities.push(formData);
    }

    if (action === "delete") {
      const setting = game.settings.get(
        game.system.id,
        "deleteItemConfirmation"
      );
      if (setting) {
        const dialogMessage = `${SystemUtils.Localize(
          "CPR.dialog.deleteConfirmation.message"
        )} ${SystemUtils.Localize("CPR.itemSheet.role.deleteConfirmation")}?`;

        // Show "Default" dialog.
        const confirmDelete = await CPRDialog.showDialog(
          { dialogMessage },
          // Set the options for the dialog.
          { title: SystemUtils.Localize("CPR.dialog.deleteConfirmation.title") }
        ).catch((err) => LOGGER.debug(err));
        if (!confirmDelete) {
          return;
        }
      }
      abilities.splice(index, 1);
    }

    if (action === "edit") {
      const abilityData = abilities[index];
      const abilityDataSkill =
        abilityData.skill !== "--" && abilityData.skill !== "varying"
          ? abilityData.skill.name
          : abilityData.skill;
      formData = {
        ...abilityData,
        ...selectOptions,
        skill: abilityDataSkill,
      };

      // Show "Role Ability" dialog.
      formData = await CPRDialog.showDialog(formData, {
        // Set options for dialog.
        title: SystemUtils.Localize("CPR.dialog.createEditRoleAbility.title"),
        template: `systems/${game.system.id}/templates/dialog/cpr-role-ability-prompt.hbs`,
      }).catch((err) => LOGGER.debug(err));
      if (formData === undefined) {
        return;
      }

      // eslint-disable-next-line no-nested-ternary
      const skillObject =
        formData.skill !== "--" && formData.skill !== "varying"
          ? allSkills.find((a) => a.name === formData.skill)
          : formData.skill === "varying"
          ? "varying"
          : "--";
      formData.skill = skillObject;
      abilities.splice(
        index,
        1,
        foundry.utils.mergeObject(abilityData, formData)
      );
    }
    const sortedAbilities = abilities.sort((a, b) =>
      a.name > b.name ? -1 : 1
    );
    foundry.utils.setProperty(cprItemData, "abilities", sortedAbilities);
    this.item.update({ system: cprItemData });
  }

  /**
   * Get an array of the objects installed in this Item. An optional
   * string parameter may be passed to filter the return list by a
   * specific Item type.
   *
   * @param {String} - Type of item to filter for.
   * @returns {Object} - { uninstallItemList (Array of CPRItems),
   *                       installItemList (Array of CPRItems) }
   */
  async _selectInstallableItems(itemType = false) {
    const installTarget = this.item;
    const actor = installTarget.isOwned ? installTarget.actor : false;
    // Items that *can* be installed, but might not be currently.
    const installableItems = installTarget
      .getInstallableItems(itemType)
      .filter((i) => {
        // You cannot install something into itself. Get outta here ouroboros.
        if (i.id === installTarget.id) return false;

        // You cannot install something that is installed in something else, but...
        // ...you *can* uninstall things that are already installed in this item.
        if (
          i.system.isInstalled &&
          i.system.installedIn[0] !== installTarget.id
        ) {
          return false;
        }

        switch (i.type) {
          case "ammo":
            // Ammo should really only be loaded from the change-ammo dialog, for now.
            // This limits the amount of ammo installed in an item to one.
            // Only allow uninstalling ammo from this dialog.
            if (installTarget.system.loadedAmmo?.id !== i.id) return false;
            break;
          case "cyberware":
            // Only allow installation of correct cyberware
            if (
              installTarget.system.type !== i.system.type ||
              i.system.isFoundational
            ) {
              return false;
            }
            break;

          default:
            break;
        }

        return true;
      });
    // Items that are currently installed.
    const installedItems = installTarget.getInstalledItems(itemType);

    // Get total slots.
    const availableSlots = installTarget.availableInstallSlots();
    const totalSlots =
      availableSlots + installTarget.system.installedItems.usedSlots;

    // For organizing the list by type in the dialog template.
    const typeList = [];
    for (const item of installableItems) {
      if (!typeList.includes(item.type)) {
        typeList.push(item.type);
      }
    }

    // Create a readable title and header.
    const dialogItemType = itemType
      ? SystemUtils.Localize(CPR.objectTypes[itemType])
      : SystemUtils.Localize("CPR.global.generic.item");

    const dialogPromptTitle = `${SystemUtils.Format(
      "CPR.dialog.selectInstallableItems.title",
      { type: dialogItemType }
    )}
    | ${SystemUtils.Localize("CPR.global.generic.item")} ${SystemUtils.Localize(
      "CPR.global.generic.slots"
    )}: ${totalSlots}`;

    const dialogPromptText =
      installableItems.length > 0
        ? SystemUtils.Format("CPR.dialog.selectInstallableItems.text", {
            type: dialogItemType,
            target: installTarget.name,
          })
        : `${SystemUtils.Format("CPR.dialog.selectInstallableItems.noOptions", {
            target: installTarget.name,
          })}`;

    // Prepare the form data.
    let formData = {
      target: installTarget,
      header: dialogPromptText,
      typeList,
      itemsList: installableItems,
      selectedItems: installedItems.map((i) => i.id),
      itemType: dialogItemType,
    };

    // Show "Select Install Items" prompt.
    formData = await CPRDialog.showDialog(formData, {
      title: dialogPromptTitle,
      template: `systems/${game.system.id}/templates/dialog/cpr-select-install-items-prompt.hbs`,
    }).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return {};
    }

    // filteredSelectedItems must be an array because of the methods we use on it later.
    // formData.selectedItems, however, is sometimes a string and sometimes null.
    // It is a string when there is only one option, and that option is selected (installed).
    // It is null when there is only one option, and that option is deselected (uninsatlled)
    // The following creates an array out of formData.selectedItems, accounting for all cases (hopefully).
    let filteredSelectedItems = []; // If formData.selectedItems is null, this variable will remain an empty array.
    if (typeof formData.selectedItems === "string") {
      // If formData.selectedItems is a string, put it in an array.
      filteredSelectedItems = [formData.selectedItems]; //
    } else if (formData.selectedItems) {
      // Else, make sure it isn't null. If not, it's already an array -> filter against null entries.
      filteredSelectedItems = formData.selectedItems.filter((i) => i);
    }

    // Final list of uninstalled items.
    const uninstallItemList = [];
    // Push to the list if it was installed, but isn't anymore.
    installedItems.forEach((item) => {
      if (!filteredSelectedItems.includes(item._id)) {
        uninstallItemList.push(item);
      }
    });

    // Final list of installed items.
    const installItemList = [];
    // Push to the list if it wasn't installed, but is now.
    filteredSelectedItems.forEach((itemId) => {
      if (installedItems.filter((item) => item._id === itemId).length === 0) {
        const installedItem = !actor
          ? game.items.get(itemId)
          : actor.getOwnedItem(itemId);
        installItemList.push(installedItem);
      }
    });

    const promptResult = {
      uninstallItemList,
      installItemList,
    };

    return promptResult;
  }

  /**
   * Render an item sheet in read-only mode, which is used on installed cyberware. This is to
   * prevent a user from editing data while it is installed, such as the foundation type.
   *
   * @private
   * @callback
   * @param {Object} event - object capturing event data (what was clicked and where?)
   */
  _renderReadOnlyItemCard(event) {
    const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
    let item = this.item.isEmbedded
      ? this.actor.items.find((i) => i._id === itemId)
      : game.items.get(itemId);

    // If this item is in a pack, its installed items don't actually exist,
    // except as stored data in `flags.cprInstallTree`. Thus, we find the correct
    // piece of itemData in this install tree and create an ephermeral item so we can
    // render its sheet.
    if (this.item.pack) {
      const flattenedTree = this.item.flattenInstallTree(
        this.item.flags.cprInstallTree
      );
      const itemData = flattenedTree.find((i) => i._id === itemId);
      // eslint-disable-next-line new-cap
      item = new CONFIG.Item.documentClass(itemData); // Create ephemeral item.
    }
    item.sheet.render(true, { editable: false });
  }

  /**
   * Sets up a ContextMenu that appears when the Item's image is right clicked.
   * Enables the user to share the image with other players.
   *
   * @param {Object} html - The DOM object
   * @returns {ContextMenu} The created ContextMenu
   */
  _createItemImageContextMenu(html) {
    return createImageContextMenu(html, ".item-image-block", this.item);
  }

  async _manageInstallableTypes() {
    // Show "Manage Installable Types" prompt.
    const formData = await CPRDialog.showDialog(
      { selectedTypes: this.item.system.installedItems.allowedTypes },
      {
        title: SystemUtils.Localize("CPR.dialog.manageItemTypes.title"),
        template: `systems/${game.system.id}/templates/dialog/cpr-manage-installable-types-prompt.hbs`,
      }
    ).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }
    const allowedTypes = formData.selectedTypes.filter((t) => t);

    if (allowedTypes.length === 0 && this.item.system.hasInstalled) {
      SystemUtils.DisplayMessage(
        "error",
        "CPR.messages.hasInstalledItemsOfRemovedType"
      );
      return;
    }
    await this.item.update({
      "system.installedItems.allowedTypes": allowedTypes,
    });
  }

  /**
   * See item._setUsage for details
   *
   * @param {Object} event
   */
  async _setUsage(event) {
    this.item._setUsage(event.target.value);
  }
}
