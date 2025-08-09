/* eslint-disable no-await-in-loop */
import CPR from "../system/config.js";
import CPRChat from "../chat/cpr-chat.js";
import CPRCharacterActorSheet from "./sheet/cpr-character-sheet.js";
import CPRMookActorSheet from "./sheet/cpr-mook-sheet.js";
import * as CPRRolls from "../rolls/cpr-rolls.js";
import LOGGER from "../utils/cpr-logger.js";
import Rules from "../utils/cpr-rules.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import TextUtils from "../utils/TextUtils.js";
import CPRMod from "../rolls/cpr-modifiers.js";
import CPRDialog from "../dialog/cpr-dialog-application.js";
import Container from "../item/mixins/cpr-container.js";

/**
 * CPRActor contains common code between mooks and characters (NPCs and players).
 * It extends Actor which comes from Foundry.
 *
 * @extends {Actor}
 */
export default class CPRActor extends Actor {
  /**
   * create() is called when creating the actor, but it's not the same as a constructor. In the
   * code here, we pre-populate characters with skills, core cyberware, and other baked-in items.
   *
   * @async
   * @override
   * @static
   * @param {Object} data - a complex structure with details and data to stuff into the actor object
   * @param {Object} options - not used here, but required by the parent class
   */
  static async create(data, options) {
    const createData = data;
    const newActor = typeof data.system === "undefined";
    if (!newActor) {
      return super.create(data, options);
    }

    createData.items = [];
    const tmpItems = data.items.concat(
      await SystemUtils.GetCoreSkills(),
      await SystemUtils.GetCoreCyberware()
    );
    const containerTypes = SystemUtils.getDocTypesFromMixin("container");
    tmpItems.forEach((item) => {
      const updatedSystem = foundry.utils.duplicate(item.system);
      if (containerTypes.includes(item.type)) {
        updatedSystem.installedItems.slots = 7;
        updatedSystem.installedItems.allowedTypes = [
          "itemUpgrade",
          "cyberware",
        ];
      }
      const cprItem = {
        name: item.name,
        img: item.img,
        type: item.type,
        system: updatedSystem,
      };
      createData.items.push(cprItem);
    });

    const actor = await super.create(createData, options);
    const installedItems = [];
    // If this is a brand new actor (i.e. not a duplicate), install core cyberware.
    actor.itemTypes.cyberware.forEach((cw) => installedItems.push(cw.id));
    return actor.update({ "system.installedItems.list": installedItems });
  }

  /**
   * Load all mixins configured in the Item metadata.
   * TODO: enum this
   *
   * @public
   */
  loadMixins() {
    const mixins = ["container"];
    for (let m = 0; m < mixins.length; m += 1) {
      switch (mixins[m]) {
        case "container": {
          Container.call(CPRActor.prototype);
          break;
        }
        default:
          LOGGER.warn(`Tried to load an unknown mixin, ${mixins[m]}`);
      }
    }
  }

  /**
   * Called when an actor is passed to the client, we override this to calculate
   * derived stats and massage some of the data for convenience later.
   *
   * @override
   */
  prepareData() {
    super.prepareData();
    this.loadMixins();
    if (this.compendium === null || this.compendium === undefined) {
      // It looks like prepareData() is called for any actors/npc's that exist in
      // the game and the clients can't update them.  Everyone should only calculate
      // their own derived stats, or the GM should be able to calculate the derived
      // stat
      if (this.isOwner || game.user.isGM) {
        this._calculateDerivedStats();
      }
    }
  }

  /**
   * Also called when an actor is passed to the client. Notably this is called BEFORE active
   * effects are applied to the actor, so we can prepare temporary variables for them to modify.
   * We get the list of skills for the actor, including custom, and creates a "bonus" object
   * in the actor data that active effects will later modify. When a skill roll is made, it will
   * use the bonus object to consider skill mods from active effects on the actor.
   *
   * @override
   */
  prepareBaseData() {
    super.prepareBaseData();
    this.bonuses = {};
    const skills = this.items.filter((i) => i.type === "skill");
    skills.forEach((skill) => {
      this.bonuses[SystemUtils.slugify(skill.name)] = 0;
    });
    const roles = this.items.filter((i) => i.type === "role");
    roles.forEach((role) => {
      this.bonuses[SystemUtils.slugify(role.system.mainRoleAbility)] = 0;
      if (role.system.abilities.length > 0) {
        for (const ability of role.system.abilities) {
          this.bonuses[SystemUtils.slugify(ability.name)] = 0;
        }
      }
    });
    this.bonuses.run = 0;
    this.bonuses.walk = 0;
    this.bonuses.deathSavePenalty = 0;
    this.bonuses.hands = 0;
    this.bonuses.initiative = 0;
    this.bonuses.maxHp = 0;
    this.bonuses.maxHumanity = 0;
    this.bonuses.universalAttack = 0;
    this.bonuses.universalDamage = 0;
    this.bonuses.universalDamageReduction = 0;
    this.bonuses.hasPainSuppression = 0;
    // netrunning things
    this.bonuses.speed = 0;
    this.bonuses.perception_net = 0; // beware of hacks because "perception" is also a skill
    this.bonuses.attack = 0;
    this.bonuses.defense = 0;
    this.bonuses.rez = 0;
    this.bonuses.brainDamageReduction = 0;
    // combat-related rolls
    this.bonuses.aimedShot = 0;
    this.bonuses.melee = 0;
    this.bonuses.ranged = 0;
    this.bonuses.autofire = 0;
    this.bonuses.suppressive = 0;
    this.bonuses.singleShot = 0;
    // Miscellaneous bonuses.
    this.bonuses.allActions = 0;
  }

  /**
   * The Active Effects do not have access to their parent at preparation time so we wait until
   * this stage to determine whether they are suppressed or not. Taken from dnd5e character code.
   *
   * @override
   * @returns nothing, just applies effects to the actor
   */
  applyActiveEffects() {
    for (const e of this.allApplicableEffects()) {
      e.determineSuppression();
    }
    return super.applyActiveEffects();
  }

  /**
   * The three reasons we extend this code are:
   *  - handle an edge case for migrations.
   *  - prevent addition of core items
   *  - handle item stacking
   *  - Handle containers with installed items
   *
   * @override
   * @param {String} embeddedName - document name, usually a category like Item
   * @param {Array<CPRItem>} items - Array of items to create
   * @param {Object} context - an object tracking the context in which the method is being called
   * @returns {null}
   */
  async createEmbeddedDocuments(
    embeddedName,
    items,
    context = { createInstalled: true }
  ) {
    // If migration is calling this, we definitely want to
    // create the Embedded Documents.
    const isMigration = !!(
      typeof context !== "undefined" && context.cprIsMigrating
    );
    if (isMigration || !embeddedName === "Item")
      return super.createEmbeddedDocuments(embeddedName, items, context);

    // Don't add core items.
    const coreItemIds = items.filter((i) => i.system?.core).map((i) => i._id);
    if (coreItemIds.length > 0) {
      Rules.lawyer(false, "CPR.messages.dontAddCoreItems");
      items = items.filter((i) => !coreItemIds.includes(i._id));
    }

    // Stack items.
    const canStack = Object.values(this.apps).some(
      (app) =>
        app instanceof CPRCharacterActorSheet ||
        app instanceof CPRMookActorSheet
    );
    const stackedItemReferences = [];
    if (canStack && !context.CPRsplitStack) {
      LOGGER.debug("Attempting to stack items on an actor sheet");
      const dontCreate = [];
      for (const doc of items) {
        // eslint-disable-next-line no-continue
        if (!doc.system) continue;
        const [returnValue] = await this.automaticallyStackItems(doc);
        if (returnValue) {
          dontCreate.push(doc._id);
          // Keep track of the item that we stacked upon, so we can update the parent's
          // references later, if the item that was stacked is meant to be installed.
          stackedItemReferences.push({ id: returnValue._id, system: {} });
        }
      }
      // Don't create items that we should stack.
      items = items.filter((i) => !dontCreate.includes(i._id));
    }

    // Create the items
    const createdItems = await super.createEmbeddedDocuments(
      embeddedName,
      items,
      context
    );

    if (context.createInstalled) {
      // Handle creating and installing any items into the parent item.
      for (const item of createdItems) {
        // eslint-disable-next-line no-continue
        if (!item.system.hasInstalled) continue;
        // The item will only have this flag if it is imported/coming from another actor.
        const imported = !!item.flags.cprInstallTree;
        // The following function recusrively creates and installs all items in the install tree.
        await item.createInstalledItemsOnActor(imported);
      }
    }

    const isMookSheet = Object.values(this.apps).some(
      (app) => app instanceof CPRMookActorSheet
    );

    for (const item of createdItems) {
      if (isMookSheet) await this.handleMookDraggedItem(item);
    }

    // Here, we return the created item array, but concatenated with references to any stacked items
    // This way, when dragging/dropping installed items from sheet to sheet, the calling function can still
    // update the parent with the correct references (see `createInstalledItemsOnActor()` in the mixin cpr-container.js)
    return createdItems.concat(stackedItemReferences);
  }

  /**
   * This is extended to handle :
   * - items installed in other items
   * - container items with other items installed in them.
   *
   * When we delete an owned item, we should first check if it has items installed into it,
   * or if it's installed into something else (or both). That way we can make sure they get
   * uninstalled properly and their references are scrubbed.
   *
   * @override
   * @param {String} embeddedName - document name, usually a category like Item
   * @param {Object} ids - Array of ids to consider
   * @param {Object} [options] - an object tracking the context in which the method is being called
   * @param {Boolean} [options.cprIsMigrating = false] - Whether or not this is being called during migration.
   * @param {Boolean} [options.unloadAmmo = true]      - If ammo should be unloaded as a part of this delete action.
   * @param {Boolean} [options.deleteInstalled = false]   - Uninstall or delete installed items?.
   * @returns {null}
   */
  async deleteEmbeddedDocuments(
    embeddedName,
    ids,
    options = {
      cprIsMigrating: false,
      unloadAmmo: true,
      deleteInstalled: false,
    }
  ) {
    // If migration is calling this, we assume migration is
    // handling all references to containers and installable
    // items, so we just delete the item.
    const isMigration = !!options?.cprIsMigrating;
    if (isMigration)
      return super.deleteEmbeddedDocuments(embeddedName, ids, options);

    // For every item that we are deleting...
    const uninstallPromises = [];
    for (const itemId of ids) {
      // Get the item.
      const item = this.getOwnedItem(itemId);
      // Check if item is installed somewhere. Uninstall it first.
      if (item?.system.isInstalled) {
        uninstallPromises.push(item.uninstall({ skipDialog: true }));
      }

      // Check if it has installed items. Uninstall them before deleting.
      if (item?.system.hasInstalled) {
        const installedItemIDs = item.system.installedItems.list;
        const installedItemsList = installedItemIDs.map((id) =>
          this.getOwnedItem(id)
        );
        if (!options.deleteInstalled) {
          // Uninstall all items before deletion of parent.
          uninstallPromises.push(
            item.uninstallItems(installedItemsList, {
              unloadAmmo: options.unloadAmmo,
            })
          );
        }
      }
    }
    // Resolve all promises.
    await Promise.all(uninstallPromises);

    // Continue on with deleting the documents (call the Foundry function).
    return super.deleteEmbeddedDocuments(embeddedName, ids, options);
  }

  /**
   * This is where derived stats are calculated, Note, one can tailor the behavior
   * depending on which sheet (aka "app") is associated with the actor.
   *
   * TODO: this is called 3 times when creating an actor... why?
   *
   * @private
   */
  _calculateDerivedStats() {
    const cprData = this.system;
    const { derivedStats } = cprData;

    // Walk & Run, from the Move/Run Action (pg 127)
    derivedStats.walk.value = cprData.stats.move.value * 2;
    derivedStats.run.value = cprData.stats.move.value * 4;

    // seriously wounded
    derivedStats.seriouslyWounded = Math.ceil(derivedStats.hp.max / 2);

    // Death save
    let basePenalty = 0; // 0 + active effects
    const critInjury = this.itemTypes.criticalInjury;
    critInjury.forEach((criticalInjury) => {
      const { deathSaveIncrease } = criticalInjury.system;
      if (deathSaveIncrease) {
        basePenalty += 1;
      }
    });
    derivedStats.deathSave.basePenalty = basePenalty;
    derivedStats.deathSave.value =
      derivedStats.deathSave.penalty + derivedStats.deathSave.basePenalty;
    this.system.derivedStats = derivedStats;

    // Make sure current HP is never higher than max HP.
    derivedStats.hp.value = Math.min(
      derivedStats.hp.value,
      derivedStats.hp.max
    );

    // Make sure current Humanity is never higher than max Humanity.
    derivedStats.humanity.value = Math.min(
      derivedStats.humanity.value,
      derivedStats.humanity.max
    );

    // We need to always call this because if the actor was wounded and now is not, their
    // value would be equal to max, however their current wound state was never updated.
    this._setWoundState();
    // Updated derivedStats variable with currentWoundState
    derivedStats.currentWoundState = this.system.derivedStats.currentWoundState;
  }

  /**
   * Returns the current wound state of the actor
   *
   * @returns {String}
   */
  getWoundState() {
    return this.system.derivedStats.currentWoundState;
  }

  /**
   * Sets the wound state of the actor based on the current hit point value
   *
   * @private
   */
  _setWoundState() {
    const { derivedStats } = this.system;
    let newState = "invalidState";
    if (derivedStats.hp.value < 1) {
      newState = "mortallyWounded";
    } else if (derivedStats.hp.value < derivedStats.seriouslyWounded) {
      newState = "seriouslyWounded";
    } else if (derivedStats.hp.value < derivedStats.hp.max) {
      newState = "lightlyWounded";
    } else if (derivedStats.hp.value === derivedStats.hp.max) {
      newState = "notWounded";
    }
    this.system.derivedStats.currentWoundState = newState;
  }

  /**
   * Looks up the wound state and returns the penalties (-2, -4) that should be applied to rolls
   *
   * @returns {Number}
   */
  getWoundStateMods() {
    let woundStateMod = 0;
    if (
      this.getWoundState() === "seriouslyWounded" &&
      this.bonuses.hasPainSuppression <= 0
    ) {
      woundStateMod = -2;
    }
    if (this.getWoundState() === "mortallyWounded") {
      woundStateMod = -4;
    }
    return woundStateMod;
  }

  /**
   * Method to install cyberware owned by an actor.
   * This will handle making sure it is going into the right foundational cyberware, if applicable.
   * Additionally, if there is optional cyberware installed under a foundational cyberware which
   * allows cyberware to be installed into it (ie Chipware Socket) and it has capacity, it will
   * also be listed as an installation target.
   *
   * @async
   * @param {String} itemId - the ItemId of the cyberware to be added
   * @returns {Boolean} - Whether the installation was successful or not
   */
  async installCyberware(itemId) {
    const item = this.getOwnedItem(itemId);

    const baseCompatibleFoundationalCyberware = this.itemTypes.cyberware.filter(
      (cw) =>
        cw.system.isInstalled &&
        cw.system.isFoundational &&
        cw.system.type === item.system.type
    );

    if (
      baseCompatibleFoundationalCyberware.length < 1 &&
      !item.system.isFoundational
    ) {
      Rules.lawyer(
        false,
        "CPR.messages.warnNoFoundationalCyberwareOfCorrectType"
      );
      return false;
    }

    // For each Foundational Cyberware of the item.system.type that is installed
    // Gather a list of all of the currently installed cyberware
    const compatibleTargetCyberware = [];
    baseCompatibleFoundationalCyberware.forEach((cyberware) => {
      compatibleTargetCyberware.push(cyberware);
      let idList = cyberware.system.installedItems.list;
      const containerTypes = SystemUtils.getDocTypesFromMixin("container");
      while (idList.length > 0) {
        const loopList = idList;
        idList = [];
        for (const id of loopList) {
          const itemLookup = this.getOwnedItem(id);
          if (containerTypes.includes(itemLookup.type)) {
            if (
              itemLookup.system.installedItems.allowed &&
              itemLookup.system.installedItems.allowedTypes.includes(
                item.type
              ) &&
              itemLookup.availableInstallSlots() >= item.system.size
            ) {
              compatibleTargetCyberware.push(itemLookup);
            }
            idList = idList.concat(itemLookup.system.installedItems.list);
          }
        }
      }
    });
    // Get all other cyberware installed in this one.
    const installedCyberware = item
      .recursiveGetAllInstalledItems()
      .filter((i) => i.type === "cyberware");

    // Accumulate the roll formulae for each item for display on the sheet.
    const rolledHumanityLoss = installedCyberware.reduce((accumulator, i) => {
      return `${accumulator} + ${i.system.humanityLoss.roll}`;
    }, item.system.humanityLoss.roll);

    // Accumulate the static formulae for each item for display on the sheet.
    const staticHumanityLoss = installedCyberware.reduce((accumulator, i) => {
      return accumulator + i.system.humanityLoss.static;
    }, item.system.humanityLoss.static);

    const humanityLossSelectOptions = {
      roll: SystemUtils.Format("CPR.dialog.installCyberware.roll", {
        loss: rolledHumanityLoss,
      }),
      static: SystemUtils.Format("CPR.dialog.installCyberware.static", {
        loss: staticHumanityLoss,
      }),
      none: SystemUtils.Localize("CPR.dialog.installCyberware.none"),
    };

    // Show "Install Cyberware" dialog.
    const formData = await CPRDialog.showDialog(
      {
        item,
        foundationalCyberware: compatibleTargetCyberware,
        // If the cyberware being installed is foundational, the array will be empty, thus the optional chaining.
        foundationalId: compatibleTargetCyberware[0]?._id,
        humanityLossType: "rolled",
        humanityLossSelectOptions,
      },
      // Set the options for the dialog.
      {
        title: SystemUtils.Localize("CPR.dialog.installCyberware.title"),
        template: `systems/${game.system.id}/templates/dialog/cpr-install-cyberware-prompt.hbs`,
      }
    ).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return false;
    }

    if (!item.system.isFoundational && !formData.foundationalId) {
      Rules.lawyer(
        false,
        "CPR.messages.warnNoFoundationalCyberwareOfCorrectType"
      );
      return false;
    }

    const target = item.system.isFoundational
      ? this
      : this.getOwnedItem(formData.foundationalId);

    const installationSuccess = await target.installItems([item]);
    if (installationSuccess)
      await this.loseHumanityValue(
        [item].concat(installedCyberware),
        formData.humanityLossType
      );
    return installationSuccess;
  }

  /**
   * Remove (uninstall) Cyberware from an actor. Like installCyberware, this is the top-level entry method.
   *
   * @async
   * @param {String} itemId - the Cyberware item ID to uninstall
   * @param {String} foundationalId - the foundational Cyberware Id to uninstall from
   * @param {Boolean} skipConfirm - a boolean to indicate whether the confirmation dialog should be displayed
   * @returns {Promise} - Returns the promise from calling this.update()
   */
  async uninstallCyberware(itemId, foundationalId, skipConfirm = false) {
    const item = this.getOwnedItem(itemId);
    let confirmRemove;
    if (!skipConfirm) {
      const dialogTitle = SystemUtils.Localize(
        "CPR.dialog.uninstallCyberware.title"
      );
      const dialogMessage = SystemUtils.Format(
        "CPR.dialog.uninstallCyberware.text",
        { item: item.name }
      );

      // Show "Default" dialog.
      confirmRemove = await CPRDialog.showDialog(
        { dialogMessage },
        // Set the options for the dialog.
        { title: dialogTitle }
      ).catch((err) => LOGGER.debug(err));
    } else {
      confirmRemove = true;
    }

    if (confirmRemove) {
      const target =
        this.id === item.system.installedIn[0]
          ? this
          : this.getOwnedItem(item.system.installedIn[0]);
      await target.uninstallItems([item]);
    }
    return this.setMaxHumanity();
  }

  /**
   * Return the Item object given an Id
   *
   * @public
   * @param {String} itemId - Id or UUID of the item to get
   * @returns {CPRItem}
   */
  getOwnedItem(itemId) {
    const item = this.items.find((i) => i._id === itemId || i.uuid === itemId);
    return item;
  }

  /**
   * Return an array of Item objects given an array of Ids
   *
   * @public
   * @param {Array} itemIds - Array of Ids or UUIDs of the item(s) to get.
   * @returns {Array<CPRItem>}
   */
  getMultipleOwnedItems(itemIds) {
    const items = [];
    for (const id of itemIds) {
      const ownedItem = this.items.find((i) => i._id === id || i.uuid === id);
      items.push(ownedItem);
    }
    return items;
  }

  /**
   * Return the skill level (number) for a given skill on the actor.
   *
   * @param {String} skillName - the skill name (e.g. from CPR.skillList) to look up
   * @returns {Number} - skill level or 0 if not found
   */
  getSkillLevel(skillName) {
    const skillList = this.itemTypes.skill.filter((s) => s.name === skillName);
    if (skillList.length > 0) {
      const relevantSkill = skillList[0];
      return parseInt(relevantSkill.system.level, 10);
    }
    return 0;
  }

  /**
   * After a death save is rolled, process the results: assess pass/fail, and persist data to the actor
   * model. Remember when a save is passed, the next one gets harder.
   *
   * @param {CPRRoll} cprRoll - the rolled death save object
   * @returns {String}
   */
  processDeathSave(cprRoll) {
    const success = SystemUtils.Localize("CPR.rolls.success");
    const failed = SystemUtils.Localize("CPR.rolls.failed");
    let saveResult =
      cprRoll.resultTotal < this.system.stats.body.value ? success : failed;
    if (cprRoll.initialRoll === 10) {
      saveResult = failed;
    }
    if (saveResult === success) {
      const deathPenalty = this.system.derivedStats.deathSave.penalty + 1;
      this.update({ "system.derivedStats.deathSave.penalty": deathPenalty });
    }
    return saveResult;
  }

  /**
   * Method to manually increase the death save penalty by 1.
   * Can be used in case a character gets hit by an attack while mortally wounded.
   */
  increaseDeathPenalty() {
    const deathPenalty = this.system.derivedStats.deathSave.penalty + 1;
    this.update({ "system.derivedStats.deathSave.penalty": deathPenalty });
  }

  /**
   * Whenever a death save passes, the penalty increases by 1. Once a character is stable,
   * the penalty should be reset to 0, which is what this method does.
   */
  resetDeathPenalty() {
    this.update({ "system.derivedStats.deathSave.penalty": 0 });
  }

  /**
   * Given a stat name, return the value of it off the actor
   *
   * @param {String} statName - name (from CPR.statList) of the stat to retrieve
   * @returns {Number}
   */
  getStat(statName) {
    return parseInt(this.system.stats[statName].value, 10);
  }

  /**
   * Get all mods provided by equippable and upgradeable items for a specific thing
   *
   * @param {String} baseName - name of the thing (e.g. stat) getting mods
   * @returns {Number}
   */
  getUpgradeMods(baseName) {
    let modValue = 0;
    // See if we have any items which upgrade our stat, and if so, upgrade the stat base
    const equippableItemTypes = SystemUtils.getDocTypesFromMixin("equippable");
    const upgradableItemTypes = SystemUtils.getDocTypesFromMixin("upgradable");
    const itemTypes = equippableItemTypes.filter((value) =>
      upgradableItemTypes.includes(value)
    );
    let modType = "modifier";

    itemTypes.forEach((itemType) => {
      const itemList = this.itemTypes[itemType].filter(
        (i) => i.system.equipped === "equipped" && i.system.isUpgraded
      );
      itemList.forEach((i) => {
        const upgradeData = i.getTotalUpgradeValues(baseName);
        if (modType === "override") {
          if (upgradeData.type === "override" && upgradeData.value > modValue) {
            modValue = upgradeData.value;
          }
        } else {
          modValue =
            upgradeData.type === "override"
              ? upgradeData.value
              : modValue + upgradeData.value;
          modType = upgradeData.type;
        }
      });
    });

    return modValue;
  }

  /**
   * Given a property name on the actor model, wipe out all records in the corresponding ledger
   * for it. Effectively this sets it back to [].
   *
   * @param {String} prop - name of the property that has a ledger
   * @returns {Array} - empty or null if the property was not found
   */
  clearLedger(prop) {
    if (this.isLedgerProperty(prop)) {
      const valProp = `system.${prop}.value`;
      const ledgerProp = `system.${prop}.transactions`;
      this.update({
        [valProp]: 0,
        [ledgerProp]: [],
      });
      return foundry.utils.getProperty(this.system, prop);
    }
    return null;
  }

  /**
   * Change the value of a property and store a record of the change in the corresponding
   * ledger.
   *
   * @param {String} prop - name of the property that has a ledger
   * @param {Number} value - how much to increase or decrease the value by
   * @param {String} reason - a user-provided reason for the change
   * @returns {Number} (or null if not found)
   */
  deltaLedgerProperty(prop, value, reason) {
    if (this.isLedgerProperty(prop)) {
      // update "value"; it may be negative
      const valProp = `system.${prop}.value`;
      let newValue = foundry.utils.getProperty(this, valProp);
      newValue += value;
      // update the ledger with the change
      const ledgerProp = `system.${prop}.transactions`;
      const ledger = foundry.utils.getProperty(this, ledgerProp);
      if (value > 0) {
        ledger.push([
          SystemUtils.Format("CPR.ledger.increaseSentence", {
            property: prop,
            amount: value,
            total: newValue,
          }),
          reason,
        ]);
      } else {
        ledger.push([
          SystemUtils.Format("CPR.ledger.decreaseSentence", {
            property: prop,
            amount: -1 * value,
            total: newValue,
          }),
          reason,
        ]);
      }
      // update the actor and return the modified property
      this.update({
        [valProp]: newValue,
        [ledgerProp]: ledger,
      });
      return foundry.utils.getProperty(this.system, prop);
    }
    return null;
  }

  /**
   * Set the value of a property and store a record of the change in the corresponding
   * ledger. This is different from applying a delta, here we just set the value.
   *
   * @param {String} prop - name of the property that has a ledger
   * @param {Number} value - what to set the value to
   * @param {String} reason - a user-provided reason for the change
   * @returns {Number} (or null if not found)
   */
  setLedgerProperty(prop, value, reason) {
    if (this.isLedgerProperty(prop)) {
      const valProp = `system.${prop}.value`;
      const ledgerProp = `system.${prop}.transactions`;
      const ledger = foundry.utils.getProperty(this, ledgerProp);
      ledger.push([
        SystemUtils.Format("CPR.ledger.setSentence", {
          property: prop,
          total: value,
        }),
        reason,
      ]);
      this.update({
        [valProp]: value,
        [ledgerProp]: ledger,
      });
      return foundry.utils.getProperty(this.system, prop);
    }
    return null;
  }

  /**
   * Get all records from the associated ledger of a property.
   *
   * @param {String} prop - name of the property that has a ledger
   * @returns {Array} - Each element is a tuple: [value, reason], or null if not found
   */
  listRecords(prop) {
    if (this.isLedgerProperty(prop)) {
      return foundry.utils.getProperty(this.system, `${prop}.transactions`);
    }
    return null;
  }

  /**
   * Return whether a property in actor data is a ledgerProperty. This means it has
   * two (sub-)properties, "value", and "transactions".
   *
   * XXX: This method is copied to cpr-container.js because CPRContainerActor does not inherit
   *      from this class. We could fix that, but then all other code in that file would be added
   *      here, which is already long. If you make changes here, be sure to consider them there too.
   *
   * @param {String} prop - name of the property that has a ledger
   * @returns {Boolean}
   */
  isLedgerProperty(prop) {
    const ledgerData = foundry.utils.getProperty(this.system, prop);
    if (!foundry.utils.hasProperty(ledgerData, "value")) {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Format("CPR.ledger.errorMessage.missingValue", { prop })
      );
      return false;
    }
    if (!foundry.utils.hasProperty(ledgerData, "transactions")) {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Format("CPR.ledger.errorMessage.missingTransactions", {
          prop,
        })
      );
      return false;
    }
    return true;
  }

  /**
   * Given a stat, look up any armor penalties applied to it and return that number.
   *
   * @param {String} stat - name of a stat we are interested in seeing the mods on
   * @returns {Number}
   */
  getArmorPenaltyMods(stat) {
    const penaltyStats = ["ref", "dex", "move"];
    const penaltyMods = [0];
    if (penaltyStats.includes(stat)) {
      const coverage = ["head", "body"];
      coverage.forEach((location) => {
        const penaltyValue = Number(this._getArmorValue("penalty", location));
        if (penaltyValue > 0) {
          penaltyMods.push(0 - penaltyValue);
        }
      });
    }
    return Math.min(...penaltyMods);
  }

  /**
   * Get the actors current armor value (or stat penalty) given a location.
   *
   * @private
   * @param {String} valueType - indicate whether to get the SP or stat penalty instead
   * @param {string} location - armor location to consider (head or body)
   * @returns {Number}
   */
  _getArmorValue(valueType, location) {
    const armors = this.getEquippedArmors(location);
    let sps;
    let penalties;

    if (location === "body") {
      sps = armors.map((a) => a.system.bodyLocation.sp);
    } else if (location === "head") {
      sps = armors.map((a) => a.system.headLocation.sp);
    } // we assume getEquippedArmors will throw an error with a bad loc

    // We allow the armour.penalty value to be either negative or positive
    // in the item data because of DataModel limitations so we convert any
    // negative integers to positive ones here when calculating the values.
    penalties = armors.map((a) =>
      a.system.penalty < 0 ? Math.abs(a.system.penalty) : a.system.penalty
    );
    penalties = penalties.map(Math.abs);

    penalties.push(0);
    sps.push(0); // force a 0 if nothing is equipped

    if (valueType === "sp") {
      return Math.max(...sps); // Math.max treats null values in array as 0
    }
    if (valueType === "penalty") {
      return Math.max(...penalties); // Math.max treats null values in array as 0
    }
    return 0;
  }

  /**
   * Return an array of all equipped armors given a location. Yes, it is possible and within the rules
   * to wear multiple armors, even thought it might not be a good idea.
   *
   * @param {String} location - head, body, or shield
   * @returns {Array}
   */
  getEquippedArmors(location) {
    const armors = this.itemTypes.armor;
    const equipped = armors.filter(
      (item) => item.system.equipped === "equipped"
    );

    if (location === "body") {
      return equipped.filter((item) => item.system.isBodyLocation);
    }
    if (location === "head") {
      return equipped.filter((item) => item.system.isHeadLocation);
    }
    if (location === "shield") {
      return equipped.filter((item) => item.system.isShield);
    }
    throw new Error(`Bad location given: ${location}`);
  }

  /**
   * Updates tracked armor values based on the given location and item ID
   *
   * @param {string} location - Armor location (e.g., "shield", "head", "body")
   * @param {string|null} id - The ID of the item, default is null
   * @returns {Promise<boolean>} - Returns true if successful, false otherwise
   */
  async updateTrackedArmor(location, id = null) {
    const targetArmor = this.getOwnedItem(id);
    const armorLocation = TextUtils.toTitleCase(location);
    const currentArmor =
      this.system.externalData[`currentArmor${armorLocation}`];
    const armorPath = "system.externalData.currentArmor";
    const update = { value: 0, max: 0 };

    const calculateUpdate = (locationKey) => {
      // Return defaults if targetArmor is undefined.
      if (!targetArmor) {
        return { value: 0, max: 0 };
      }

      // If it's a shield just grab the values directly
      if (location === "shield") {
        const { value = 0, max = 0 } = targetArmor.system.shieldHitPoints || {};
        return { value, max };
      }
      // Else calculate the value for armor
      const sp = targetArmor.system[locationKey]?.sp ?? 0;
      const ablation = targetArmor.system[locationKey]?.ablation ?? 0;
      return { value: sp - ablation, max: sp };
    };

    // Get the values of the armor
    Object.assign(update, calculateUpdate(`${location}Location`));

    // Update the id of the tracked armor if it doesn't match
    if (currentArmor.id !== id) {
      await this.update({ [`${armorPath}${armorLocation}.id`]: id });
    }

    // Update armor values
    await this.update({
      [`${armorPath}${armorLocation}.value`]: update.value,
      [`${armorPath}${armorLocation}.max`]: update.max,
    });

    return true;
  }

  /**
   * Create the appropriate roll object given a type. The type comes from link attributes in handlebars templates.
   *
   * @param {String} type - the type of roll to create
   * @param {String} name - a name for the roll, which is displayed in the roll card
   * @returns {CPRRoll}
   */
  createRoll(type, name) {
    switch (type) {
      case CPRRolls.rollTypes.STAT: {
        return this._createStatRoll(name);
      }
      case CPRRolls.rollTypes.DEATHSAVE: {
        return this._createDeathSaveRoll();
      }
      case CPRRolls.rollTypes.FACEDOWN: {
        return this._createFacedownRoll();
      }
      default:
    }
    return undefined;
  }

  /**
   * Create a stat roll and return the object representing it
   *
   * @private
   * @param {string} statName - name of the stat to generate a roll for
   * @returns {CPRStatRoll}
   */
  _createStatRoll(statName) {
    const niceStatName = SystemUtils.Localize(CPR.statList[statName]);
    const statValue = this.getStat(statName);
    const cprRoll = new CPRRolls.CPRStatRoll(niceStatName, statValue);

    const effects = Array.from(this.allApplicableEffects());
    const allMods = CPRMod.getAllModifiers(effects);
    const filteredMods = allMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault)
    );

    // Mods that affect all actions.
    const allActionsMods = CPRMod.getRelevantMods(filteredMods, [
      "allActions",
      "allActionsSpeech",
      "allActionsHands",
    ]);

    // Add relevant mods.
    cprRoll.addMod(allActionsMods);
    cprRoll.addMod([
      {
        value: this.getArmorPenaltyMods(statName),
        source: SystemUtils.Format("CPR.rolls.modifiers.sources.armorPenalty", {
          stat: niceStatName,
        }),
      },
    ]);
    cprRoll.addMod([
      {
        value: this.getWoundStateMods(),
        source: SystemUtils.Localize(
          "CPR.rolls.modifiers.sources.woundStatePenalty"
        ),
      },
    ]);
    return cprRoll;
  }

  /**
   * Create a stat roll and return the object representing it
   *
   * @private
   * @returns {CPRFacedownRoll}
   */
  _createFacedownRoll() {
    const statName = "cool";
    const niceStatName = SystemUtils.Localize(CPR.statList[statName]);
    const statValue = this.getStat(statName);
    const repValue = this.system.reputation.value;
    const cprRoll = new CPRRolls.CPRFacedownRoll(
      niceStatName,
      statValue,
      repValue
    );

    // Figure out all applicable modifiers.
    const effects = Array.from(this.allApplicableEffects()); // Active effects on the actor.
    const allMods = CPRMod.getAllModifiers(effects); // Effects list converted into CPRMods.
    // Filter for mods that should always be on (not situational) or are situational but on by default.
    const filteredMods = allMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault)
    );

    // Mods that affect all actions.
    const allActionsMods = CPRMod.getRelevantMods(filteredMods, [
      "allActions",
      "allActionsSpeech",
      "allActionsHands",
    ]);

    cprRoll.addMod(allActionsMods);

    return cprRoll;
  }

  /**
   * Create a death save roll and return the object representing it
   *
   * @private
   * @returns {CPRDeathSaveRoll}
   */
  _createDeathSaveRoll() {
    const deathSavePenalty = this.system.derivedStats.deathSave.penalty;
    const deathSaveBasePenalty = this.system.derivedStats.deathSave.basePenalty;
    const bodyStat = this.system.stats.body.value;
    const cprRoll = new CPRRolls.CPRDeathSaveRoll(
      deathSavePenalty,
      deathSaveBasePenalty,
      bodyStat
    );

    const effects = Array.from(this.allApplicableEffects()); // Active effects on the actor.
    const allMods = CPRMod.getAllModifiers(effects); // Effects list converted into CPRMods.
    // Filter for mods that should always be on (not situational) or are situational but on by default.
    const filteredMods = allMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault)
    );

    const deathSavePenaltyMods = CPRMod.getRelevantMods(
      filteredMods,
      "deathSavePenalty"
    );
    cprRoll.addMod(deathSavePenaltyMods);
    return cprRoll;
  }

  /**
   * Return whether the actor has a specific Item Type equipped.
   *
   * @public
   * @param {string} itemType - type of item we are looking for
   * @returns {Boolean}
   */
  hasItemTypeEquipped(itemType) {
    let equipped = false;
    if (this.itemTypes[itemType]) {
      this.itemTypes[itemType].forEach((i) => {
        if (i.system.equipped) {
          if (i.system.equipped === "equipped") {
            equipped = true;
          }
        }
      });
    }
    return equipped;
  }

  /**
   * Return the all of the roles this actor currently has
   *
   * @public
   * @returns {Object} - array of roles
   */
  getRoles() {
    return this.itemTypes.role;
  }

  /**
   * Return the number of hands the actor has. For now this assumes 2 and considers any
   * active effects that may add more. Characters cannot start with less than 2 hands.
   *
   * @private
   * @returns {Number}
   */
  _getHands() {
    return 2 + this.bonuses.hands;
  }

  /**
   * Return the number of free hands an actor has, based on what is currently equipped (wielded)
   *
   * @private
   * @returns {Number}
   */

  _getFreeHands() {
    const equippedWeapons = this.system.weapons.equipped;
    // Filter out weapons with undefined handsReq (cyberWeapons, itemUpgrade)
    const filteredWeapons = equippedWeapons.filter(
      (w) => w.system && w.system.handsReq !== undefined
    );
    // Map to just the handsReq values
    const handsRequired = filteredWeapons.map((w) => w.system.handsReq);
    // Calculate the total number of hands required by the equipped weapons
    const totalHandsRequired = handsRequired.reduce((a, b) => a + b, 0);
    // Calculate the number of free hands
    const freeHands = this._getHands() - totalHandsRequired;

    return freeHands;
  }

  /**
   * Helper method to assess whether the actor can hold another weapon. Used to assess whether
   * an item can be equipped.
   *
   * @param {Item} weapon - item proposed to be held
   * @returns {Boolean}
   */
  canHoldWeapon(weapon) {
    const needed = weapon.system.handsReq;
    if (needed > this._getFreeHands()) {
      return false;
    }
    return true;
  }

  /**
   * Return the first equipped cyberdeck found.
   *
   * @returns {CPRItem} or null if none are found/equipped
   */
  getEquippedCyberdeck() {
    const cyberdecks = this.itemTypes.cyberdeck;
    const equipped = cyberdecks.filter(
      (item) => item.system.equipped === "equipped"
    );
    if (equipped) {
      return equipped[0];
    }
    return null;
  }

  /**
   * automaticallyStackItems searches for an identical item on the actor
   * and if found increments the amount and price for the item on the actor
   * instead of adding it as a new item.
   *
   * @param {Object} newItem - an object containing the new item
   * @returns {boolean} - true if thee item should be added normally
   *                    - false if it has been stacked on an existing item
   */
  automaticallyStackItems(newItem) {
    const itemTemplates = SystemUtils.getMixins(newItem.type);
    if (itemTemplates.includes("stackable")) {
      const itemMatch = this.items.find(
        (i) => i.type === newItem.type && i.name === newItem.name
      );
      if (itemMatch) {
        const canStack = !(
          itemTemplates.includes("upgradable") &&
          itemMatch.system.installedUpgrades.length === 0
        );
        if (canStack) {
          let oldAmount = parseInt(itemMatch.system.amount, 10);
          let addedAmount = parseInt(newItem.system.amount, 10);
          if (Number.isNaN(oldAmount)) {
            oldAmount = 1;
          }
          if (Number.isNaN(addedAmount)) {
            addedAmount = 1;
          }
          const newAmount = oldAmount + addedAmount;
          return this.updateEmbeddedDocuments(
            "Item",
            [{ _id: itemMatch.id, "system.amount": newAmount }],
            { diff: false }
          );
        }
      }
    }
    // If not stackable, then return true to continue adding the item.
    return [];
  }

  /**
   * Apply damage to the actor, respecting any equipped armor and damage modifiers
   * due to the location. In addition ablate the armor in the correct location.
   *
   * @param {int} damage - value of the damage taken
   * @param {int} bonusDamage - value of the bonus damage
   * @param {string} location - location of the damage
   * @param {int} ablation - value of the ablation
   * @param {string} ammoVariety - type of ammo used
   * @param {int} ignoreArmorPercent - percentage of armor to ignore
   * @param {int} ignoreBelowSP - value of SP to ignore under
   * @param {boolean} damageLethal - if this damage can cause HP <= 0
   * @param {object} formData - contains booleans about whether to apply shields and other damage reducing effects
   */
  async _applyDamage(
    damage,
    bonusDamage,
    location,
    ablation,
    ammoVariety,
    ignoreArmorPercent,
    ignoreBelowSP,
    damageLethal,
    formData
  ) {
    let totalDamageDealt = 0;
    let totalDamageReduction = 0;
    let takenDamage = 0;
    let ignoreArmorEntirely = false;
    let armorSPRef = 0;
    const armors = location === "brain" ? [] : this.getEquippedArmors(location);
    const armorData = {
      value: 0,
      equipped: armors.length > 0,
    };

    // If user chooses, calculate damage reduction from role abilities and active effects.
    if (formData.damageReductionRole) {
      // Apply damage reduction from role abilities.
      let universalBonusDamageReduction = 0;
      this.itemTypes.role.forEach((r) => {
        if (r.system.universalBonuses.includes("damageReduction")) {
          universalBonusDamageReduction += Math.floor(
            r.system.rank / r.system.bonusRatio
          );
        }
        const subroleUniversalBonuses = r.system.abilities.filter((a) =>
          a.universalBonuses.includes("damageReduction")
        );
        if (subroleUniversalBonuses.length > 0) {
          subroleUniversalBonuses.forEach((b) => {
            universalBonusDamageReduction += Math.floor(b.rank / b.bonusRatio);
          });
        }
      });
      totalDamageReduction += universalBonusDamageReduction;
    }

    if (formData.damageReductionAE) {
      // Apply damage reduction from active effects
      totalDamageReduction += this.bonuses.universalDamageReduction;
    }

    if (location === "brain") {
      // This is damage done in a netrun, which completely ignores armor
      const currentHp = this.system.derivedStats.hp.value;
      totalDamageDealt = damage + bonusDamage;
      if (formData.brainDamageReduction) {
        totalDamageReduction += this.bonuses.brainDamageReduction;
      }
      takenDamage = Math.max(totalDamageDealt - totalDamageReduction, 0);
      await this.update({
        "system.derivedStats.hp.value": currentHp - takenDamage,
      });
      CPRChat.RenderDamageApplicationCard({
        actor: this,
        damage,
        bonusDamage,
        hpReduction: takenDamage,
        totalDamageDealt,
        location,
        totalDamageReduction,
        armorData,
        brainDamage: true,
      });
      return;
    }

    // const armors = this.getEquippedArmors(location);
    const shields = this.getEquippedArmors("shield");
    // Determine the highest value of all the equipped armors in the specific location
    armors.forEach((a) => {
      let newValue;
      if (location === "head") {
        newValue = a.system.headLocation.sp - a.system.headLocation.ablation;
      } else {
        newValue = a.system.bodyLocation.sp - a.system.bodyLocation.ablation;
      }
      if (newValue > armorData.value) {
        armorData.value = newValue;
      }
    });

    // Check if weapon can ignore armor under set SP for weapon
    if (armorData.value < ignoreBelowSP) {
      ignoreArmorEntirely = true;
    }

    // If weapon cannot ignore armor, then we check if weapon can ignore half of it
    if (ignoreArmorPercent !== 0 && ignoreArmorEntirely === false) {
      armorData.value = Math.round(
        armorData.value - armorData.value * (ignoreArmorPercent / 100)
      );
    }

    // Deal damage to shield, if used, first.
    let shieldAblation = 0;
    if (shields.length > 0) {
      // get equipped shield with highest HP;
      const shield = shields
        .sort((a, b) =>
          a.system.shieldHitPoints.value > b.system.shieldHitPoints.value
            ? 1
            : -1
        )
        .reverse()[0];
      // if useShield is checked in dialog, and shield has HP, ablate shield and potentially resolve chat card;
      if (formData.useShield && shield.system.shieldHitPoints.value > 0) {
        shieldAblation = Math.min(
          damage + bonusDamage,
          shield.system.shieldHitPoints.value
        );
        await this._ablateArmor("shield", shieldAblation);
        if (ammoVariety !== "grenade" && ammoVariety !== "rocket") {
          // if ammo isn't explosive, resolve chat card with no damage to token;
          CPRChat.RenderDamageApplicationCard({
            actor: this,
            damage,
            bonusDamage,
            hpReduction: 0,
            totalDamageDealt,
            location,
            armorData,
            ablation: 0,
            shieldAblation,
          });
          return;
        }
        if (shield.system.shieldHitPoints.value > 0) {
          // if ammo is explosive and shield is still standing, resolve chat card with no damage to token;
          CPRChat.RenderDamageApplicationCard({
            actor: this,
            damage,
            bonusDamage,
            hpReduction: 0,
            totalDamageDealt,
            location,
            armorData,
            ablation: 0,
            shieldAblation,
          });
          return;
        }
      }
    }

    // Deal the bonusDamage, if any.
    totalDamageDealt += bonusDamage;

    // If damage did not penetrate armor, then only the bonus damage (if any) is applied, minus any damage reduction.
    if (damage <= armorData.value && ignoreArmorEntirely === false) {
      takenDamage = Math.max(totalDamageDealt - totalDamageReduction, 0);
      const currentHp = this.system.derivedStats.hp.value;
      await this.update({
        "system.derivedStats.hp.value": currentHp - takenDamage,
      });
      CPRChat.RenderDamageApplicationCard({
        actor: this,
        damage,
        bonusDamage,
        hpReduction: takenDamage,
        totalDamageDealt,
        location,
        totalDamageReduction,
        armorData,
        ablation: 0,
        shieldAblation,
      });
      return;
    }

    // Set armor SP reference to calculate damage, otherwise leave it at 0 if armor is being ignored entirely
    if (ignoreArmorEntirely) {
      armorSPRef = 0;
    } else {
      armorSPRef = armorData.value;
    }

    // If damage did penetrate armor, deal the regular damage.
    if (location === "head") {
      // Damage taken against the head is doubled.
      totalDamageDealt += 2 * (damage - armorSPRef);
    } else {
      totalDamageDealt += damage - armorSPRef;
    }

    // Tally up takenDamage. If takenDamage is negative from damageReduction, make 0. This way negative takenDamage doesn't heal.
    takenDamage = Math.max(totalDamageDealt - totalDamageReduction, 0);

    // If damage isn't lethal and exceeds currentHp, then damage done is one less than currentHp.
    const currentHp = this.system.derivedStats.hp.value;
    if (takenDamage >= currentHp && !damageLethal) {
      takenDamage = currentHp - 1;
      if (currentHp <= 0) {
        takenDamage = 0;
      }
    }

    await this.update({
      "system.derivedStats.hp.value": currentHp - takenDamage,
    });

    // Ablate the armor correctly if there's armor equipped
    if (armors.length > 0) {
      await this._ablateArmor(location, ablation);
    }
    const cardDisplayAblation = armors.length > 0 ? ablation : 0;
    CPRChat.RenderDamageApplicationCard({
      actor: this,
      damage,
      bonusDamage,
      hpReduction: takenDamage,
      totalDamageDealt,
      location,
      totalDamageReduction,
      armorData,
      ignoreArmorPercent,
      ignoreArmorEntirely,
      ignoreBelowSP,
      ablation: cardDisplayAblation,
      shieldAblation,
      damageLethal,
    });
  }

  /**
   * Reverse damage and armor/shield ablation to the actor, in case someone made a mistake applying it.
   *
   * @param {int} hpReduction - value of the damage taken
   * @param {string} location - location of the damage
   * @param {int} ablation - value of the armor ablation
   * @param {int} shieldAblation - value of the shield ablation
   */
  async _reverseDamage(hpReduction, location, ablation, shieldAblation) {
    const currentHp = this.system.derivedStats.hp.value;
    const maxHp = this.system.derivedStats.hp.max;
    if (maxHp > currentHp + hpReduction) {
      await this.update({
        "system.derivedStats.hp.value": currentHp + hpReduction,
      });
    } else {
      await this.update({ "system.derivedStats.hp.value": maxHp });
    }
    await this._ablateArmor(location, -ablation);
    await this._ablateArmor("shield", -shieldAblation);
  }

  /**
   * Ablate the equipped armor at the specified location by the given value.
   *
   * @param {string} location - location of the ablation
   * @param {int} ablation - value of the ablation
   */
  async _ablateArmor(location, ablation) {
    const armorList = this.getEquippedArmors(location);
    const updateList = [];
    let currentArmorValue;
    switch (location) {
      case "head": {
        armorList.forEach((a) => {
          const cprArmorData = a.system;
          const upgradeData = a.getTotalUpgradeValues("headSp");
          cprArmorData.headLocation.sp = Number(cprArmorData.headLocation.sp);
          cprArmorData.headLocation.ablation = Number(
            cprArmorData.headLocation.ablation
          );
          const armorSp =
            upgradeData.type === "override"
              ? upgradeData.value
              : cprArmorData.headLocation.sp + upgradeData.value;
          cprArmorData.headLocation.ablation =
            ablation < 0
              ? Math.max(cprArmorData.headLocation.ablation + ablation, 0)
              : Math.min(
                  cprArmorData.headLocation.ablation + ablation,
                  armorSp
                );
          updateList.push({ _id: a.id, system: cprArmorData });
        });
        await this.updateEmbeddedDocuments("Item", updateList);
        // Update actor external data as head armor is ablated:
        currentArmorValue =
          ablation < 0
            ? Math.min(
                this.system.externalData.currentArmorHead.value - ablation,
                this.system.externalData.currentArmorHead.max
              )
            : Math.max(
                this.system.externalData.currentArmorHead.value - ablation,
                0
              );
        await this.update({
          "system.externalData.currentArmorHead.value": currentArmorValue,
        });
        break;
      }
      case "body": {
        armorList.forEach((a) => {
          const cprArmorData = a.system;
          cprArmorData.bodyLocation.sp = Number(cprArmorData.bodyLocation.sp);
          cprArmorData.bodyLocation.ablation = Number(
            cprArmorData.bodyLocation.ablation
          );
          const upgradeData = a.getTotalUpgradeValues("bodySp");
          const armorSp =
            upgradeData.type === "override"
              ? upgradeData.value
              : cprArmorData.bodyLocation.sp + upgradeData.value;
          cprArmorData.bodyLocation.ablation =
            ablation < 0
              ? Math.max(cprArmorData.bodyLocation.ablation + ablation, 0)
              : Math.min(
                  cprArmorData.bodyLocation.ablation + ablation,
                  armorSp
                );
          updateList.push({ _id: a.id, system: cprArmorData });
        });
        await this.updateEmbeddedDocuments("Item", updateList);
        // Update actor external data as body armor is ablated:
        currentArmorValue =
          ablation < 0
            ? Math.min(
                this.system.externalData.currentArmorBody.value - ablation,
                this.system.externalData.currentArmorBody.max
              )
            : Math.max(
                this.system.externalData.currentArmorBody.value - ablation,
                0
              );
        await this.update({
          "system.externalData.currentArmorBody.value": currentArmorValue,
        });
        break;
      }
      case "shield": {
        armorList.forEach((a) => {
          const cprArmorData = a.system;
          cprArmorData.shieldHitPoints.value = Number(
            cprArmorData.shieldHitPoints.value
          );
          cprArmorData.shieldHitPoints.max = Number(
            cprArmorData.shieldHitPoints.max
          );
          cprArmorData.shieldHitPoints.value =
            ablation < 0
              ? Math.min(
                  a.system.shieldHitPoints.value - ablation,
                  a.system.shieldHitPoints.max
                )
              : Math.max(a.system.shieldHitPoints.value - ablation, 0);
          updateList.push({ _id: a.id, system: cprArmorData });
        });
        await this.updateEmbeddedDocuments("Item", updateList);
        // Update actor external data as shield is damaged:
        currentArmorValue =
          ablation < 0
            ? Math.min(
                this.system.externalData.currentArmorShield.value - ablation,
                this.system.externalData.currentArmorShield.max
              )
            : Math.max(
                this.system.externalData.currentArmorShield.value - ablation,
                0
              );
        await this.update({
          "system.externalData.currentArmorShield.value": currentArmorValue,
        });
        break;
      }
      default:
    }
  }

  /**
   * Create an active effect on this actor. This method belongs here so migration scripts can
   * dynamically generate effects based on custom mods already on the actor from earlier versions.
   *
   * @param {Boolean} render - Render the effect's sheet or not. Default true.
   * @returns {CPRActiveEffect} the new document
   */
  async createEffect(render = true) {
    const effectDoc = await this.createEmbeddedDocuments("ActiveEffect", [
      {
        name: SystemUtils.Localize("CPR.itemSheet.effects.newEffect"),
        icon: "icons/svg/aura.svg",
        origin: this.uuid, // Do we still want this here?
        disabled: false,
      },
    ]);

    return effectDoc[0].sheet.render(render);
  }

  copyEffect(effect) {
    const newEffect = foundry.utils.duplicate(effect);
    return this.createEmbeddedDocuments("ActiveEffect", [newEffect]);
  }

  /**
   * Delete the desired effect from this actor. Pops up a confirmation box if permitted.
   *
   * @param {CPRActiveEffect} effect - the effect to delete
   * @returns null
   */
  static async deleteEffect(effect) {
    const setting = game.settings.get(game.system.id, "deleteItemConfirmation");
    if (setting) {
      const dialogMessage = `${SystemUtils.Localize(
        "CPR.dialog.deleteConfirmation.message"
      )} ${effect.name}?`;

      // Show "Default" dialog.
      const confirmDelete = await CPRDialog.showDialog(
        { dialogMessage },
        // Set the options for the dialog.
        { title: SystemUtils.Localize("CPR.dialog.deleteConfirmation.title") }
      ).catch((err) => LOGGER.debug(err));
      if (!confirmDelete) return;
    }
    effect.delete();
  }

  /**
   * Warning!
   *
   * When a user changes sheets (character/mook), the type for the actor itself does not change.
   * This forces us to put actor code in the same place, and have the sheets encode specific behaviors,
   * not the actors. Below you're going to see methods that look like they belong in cpr-mook.js
   * or cpr-character.js, but doing so will result in broken functionality if a user swaps sheets.
   */

  /** CHARACTER SPECIFIC CODE */

  /**
   * Calculate the character's max HP based on stats and effects.
   *
   * @return {Number}
   */
  calcMaxHp() {
    const { stats } = this.system;
    let maxHp = 10 + 5 * Math.ceil((stats.will.value + stats.body.value) / 2);
    maxHp += this.bonuses.maxHp; // from any active effects
    return maxHp;
  }

  /**
   * Calculate the character's Humanity based on stats and effects.
   *
   * @return {Number}
   * @private
   */
  _calcMaxHumanity() {
    const cprData = this.system;
    const { stats } = cprData;
    let cyberwarePenalty = 0;
    const installedCyberware = this.itemTypes.cyberware.filter(
      (cw) => cw.system.isInstalledInActor
    );
    installedCyberware.forEach((cyberware) => {
      if (cyberware.system.type === "borgware") {
        cyberwarePenalty += 4;
      } else if (parseInt(cyberware.system.humanityLoss.static, 10) > 0) {
        cyberwarePenalty += 2;
      }
    });
    let maxHumanity = 10 * stats.emp.max - cyberwarePenalty; // minus sum of installed cyberware
    maxHumanity += this.bonuses.maxHumanity; // from any active effects
    return maxHumanity;
  }

  /**
   * Calculate the max humanity on this actor.
   * If current humanity is full and the max changes, we should update the current and EMP to match only
   * if the new max is less than the old max.
   * We assume that to be preferred behavior more often than not, especially during character creation.
   *
   * @callback
   */
  async setMaxHumanity() {
    const maxHumanity = this._calcMaxHumanity();
    const { humanity } = this.system.derivedStats;
    if (humanity.max === humanity.value && maxHumanity < humanity.max) {
      await this.update({
        "system.derivedStats.humanity.max": maxHumanity,
        "system.derivedStats.humanity.value": maxHumanity,
        "system.stats.emp.value": Math.floor(humanity.value / 10),
      });
    } else {
      await this.update({
        "system.derivedStats.humanity.max": maxHumanity,
        "system.stats.emp.value": Math.floor(humanity.value / 10),
      });
    }
  }

  /**
   * Called when cyberware is installed, this method decreases Humanity on an actor, rolling
   * for the value if need be.
   *
   * You may think this should be in cpr-character only since Humanity is overlooked for NPCs, however
   * because users can switch between mook and character sheets independent of actor type, we
   * have to keep this here. (i.e. they can create a mook but switch to the character sheet)
   *
   * @param {Array<CPRItem>} itemArray - a list of cyberware being installed
   * @param {String} humanityLossType - Whether to "roll" for humanity loss, take "static" loss, or to lose "None" at all.
   * @returns {@Promise}
   */
  async loseHumanityValue(itemArray, humanityLossType) {
    if (humanityLossType === "none") {
      return this.setMaxHumanity();
    }

    const { humanity } = this.system.derivedStats;
    let value = Number.isInteger(humanity.value)
      ? humanity.value
      : humanity.max;
    for (const item of itemArray) {
      // Cast formula to a string for the case of a static loss, which is a Number.
      // If it is already a string, nothing will change.
      const formula = `${item.system.humanityLoss[humanityLossType]}`;
      const humRoll = new CPRRolls.CPRHumanityLossRoll(item.name, formula);
      await humRoll.roll();
      value -= humRoll.resultTotal;
      humRoll.entityData = {
        actor: this.id,
        static: humanityLossType === "static",
      };
      CPRChat.RenderRollCard(humRoll);
    }

    if (value <= 0) {
      Rules.lawyer(false, "CPR.messages.youCyberpsycho");
    }

    await this.update({ "system.derivedStats.humanity.value": value });
    return this.setMaxHumanity();
  }

  /**
   * Persist life path information to the actor model
   *
   * Again, this should be in cpr-character only since Humanity is overlooked for NPCs, but
   * users can switch between sheet types.
   *
   * @param {Object} formData  - an object of answers provided by the user in a form
   * @returns {Object}
   */
  setLifepath(lifepathData) {
    return this.update({ "system.lifepath": lifepathData });
  }

  /** MOOK SPECIFIC CODE */

  /**
   * Called by the createOwnedItem listener (hook) when a user drags an item on a mook sheet
   * It handles the automatic equipping of gear and installation of cyberware.
   *
   * @param {CPRItem} item - the item document that was dragged
   * @returns {Promise}
   */
  async handleMookDraggedItem(item) {
    // auto-install this cyberware
    const allInstalled = item.recursiveGetAllInstalledItems();

    if (item.type === "cyberware") {
      const installResult = await this.installCyberware(item._id);
      if (!installResult) {
        const deleteInstalled = allInstalled.map((i) => i._id);
        // Delete item and all installed.
        return this.deleteEmbeddedDocuments(
          "Item",
          [...deleteInstalled, item._id],
          {
            deleteInstalled: true,
          }
        );
      }
    }

    // Auto-equip this item if equippable
    const updateData = [];
    if (SystemUtils.hasMixin(item.type, "equippable")) {
      updateData.push({ _id: item._id, "system.equipped": "equipped" });
    }
    allInstalled.forEach((i) => {
      // auto-equip installed items if equippable
      if (SystemUtils.hasMixin(i.type, "equippable")) {
        updateData.push({ _id: i._id, "system.equipped": "equipped" });
      }
    });

    return this.updateEmbeddedDocuments("Item", updateData);
  }
}
