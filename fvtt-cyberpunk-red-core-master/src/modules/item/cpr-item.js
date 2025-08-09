import * as CPRRolls from "../rolls/cpr-rolls.js";
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

// Item mixins
import Attackable from "./mixins/cpr-attackable.js";
import Effects from "./mixins/cpr-effects.js";
import Electronic from "./mixins/cpr-electronic.js";
import Equippable from "./mixins/cpr-equippable.js";
import Loadable from "./mixins/cpr-loadable.js";
import Installable from "./mixins/cpr-installable.js";
import Physical from "./mixins/cpr-physical.js";
import Quality from "./mixins/cpr-quality.js";
import Stackable from "./mixins/cpr-stackable.js";
import Upgradable from "./mixins/cpr-upgradable.js";
import Valuable from "./mixins/cpr-valuable.js";
import Container, { ContainerUtils } from "./mixins/cpr-container.js";

/**
 * We extend the base Item object (document) provided by Foundry. All items in the system derive from it.
 * By itself, it is mostly useless and too generic to be used practically in game.
 *
 * @extends {Item}
 */
export default class CPRItem extends Item {
  /**
   * We override this function to create container items that have items installed in them.
   *
   * @override
   * @param {Object} data - raw data from which the Item is created
   * @param {Object} options options (from Foundry) to the Item creation process
   */
  static async create(data, options) {
    const item = await super.create(data, options);
    // Early return if has no installed, or its in a compendium.
    if (!item.system.hasInstalled || item.pack) return;
    // If this item is being imported into the world,
    // and it has embedded installed item data in its flags.
    if (!item.parent && item.flags.cprInstallTree) {
      // Convert the embedded data into other world items and update
      // the original item's `system.installedItems.list` to point to them.
      await item.importInstalledToWorld(true);
    }

    // If a world item is being created and has installed items, lets
    // duplicate those installed items and reinstall them so that each
    // world item has unique items installed into it.
    else if (
      !item.parent &&
      item.system.hasInstalled &&
      !item.flags.cprInstallTree
    ) {
      const installedItemList = item.system.installedItems.list.map((id) =>
        game.items.get(id)
      );
      // Reset the new item's install list and used slots.
      await item.update({
        "system.installedItems": { list: [], usedSlots: 0 },
      });
      item.installItems(installedItemList);
    }

    // eslint-disable-next-line consistent-return
    return item;
  }

  /**
   * TODO: figure out what to do with this, hopefully not needed
   * TODO: this should figure out owned vs. not owned items too
   * @override
   * @param {Item} data - details/changes for the Item itself
   * @param {Object} options options (from Foundry) to the Item update process
   */
  update(data, options = {}) {
    const cprData = data;
    if (
      data["system.type"] === "cyberwareInternal" ||
      data["system.type"] === "cyberwareExternal" ||
      data["system.type"] === "fashionware"
    ) {
      cprData["system.isFoundational"] = false;
    }
    if (this.type === "weapon") {
      cprData["system.dvTable"] =
        data["system.dvTable"] === null ? "" : data["system.dvTable"];
    }

    // If an AE has a usage !== "toggled", then any active effects should not be disabled
    // (ie: Always On, Installed, etc) otherwise the disabled flag takes precedence when
    // determining if the effect is suppressed or not
    const usage = data["system.usage"];
    if (usage && usage !== this.system.usage) {
      if (usage !== "toggled" && usage !== "snorted") {
        this.effects.forEach((e) => {
          if (e.disabled) {
            this.toggleEffect(e._id);
          }
        });
      }
    }
    return super.update(cprData, options);
  }

  /**
   * Before deleting a container item, prompt the user whether to delete nested installed items,
   * or just uninstall them. NOTE: This function affects world items only. See `_deleteOwnedItem` (cpr-actor-sheet.js)
   * and `deleteEmbeddedDocuments` (cpr-actor.js) for owned items.
   *
   * @override
   * @param {Object} context
   * @returns {Promise<CPRItem>}
   */
  async delete(context) {
    if (!this.system.hasInstalled) return super.delete(context);
    const formData = await ContainerUtils.confirmContainerDelete(this);
    if (!formData)
      return LOGGER.debug("Form submission cancelled or dialog closed.");
    if (formData.deleteInstalled) {
      const deleteItems = this.recursiveGetAllInstalledItems().map((i) => i.id);
      Item.deleteDocuments(deleteItems);

      // Remove flags so that the datapoint does not get bloated.
      const showInstallFlag = { [`-=${this.id}`]: null };
      deleteItems.forEach((id) => {
        showInstallFlag[`-=${id}`] = null;
      });
      game.user.setFlag(game.system.id, "showInstalledList", showInstallFlag);
    }
    return super.delete(context);
  }

  /**
   * Load all mixins configured in the Item metadata.
   * TODO: enum this
   *
   * @public
   */
  loadMixins() {
    const mixins = SystemUtils.getMixins(this.type);
    const cprItemData = this.system;
    for (let m = 0; m < mixins.length; m += 1) {
      switch (mixins[m]) {
        case "attackable": {
          Attackable.call(CPRItem.prototype);
          break;
        }
        case "effects": {
          Effects.call(CPRItem.prototype);
          cprItemData.allowedUsage = this.getAllowedUsage();
          // To Do: we could toggle on/off if there's exactly 1 effect enforced...
          break;
        }
        case "electronic": {
          Electronic.call(CPRItem.prototype);
          break;
        }
        case "equippable": {
          Equippable.call(CPRItem.prototype);
          break;
        }
        case "loadable": {
          Loadable.call(CPRItem.prototype);
          break;
        }
        case "installable": {
          Installable.call(CPRItem.prototype);
          break;
        }
        case "container": {
          Container.call(CPRItem.prototype);
          break;
        }
        case "physical": {
          Physical.call(CPRItem.prototype);
          break;
        }
        case "quality": {
          Quality.call(CPRItem.prototype);
          break;
        }
        case "stackable": {
          Stackable.call(CPRItem.prototype);
          break;
        }
        case "upgradable": {
          Upgradable.call(CPRItem.prototype);
          break;
        }
        case "valuable": {
          Valuable.call(CPRItem.prototype);
          break;
        }
        default:
          LOGGER.warn(`Tried to load an unknown mixin, ${mixins[m]}`);
      }
      // LOGGER.debug(`Added mixin ${mixins[m]} to ${this.id}`);
    }
  }

  /**
   * Whenever an item is created or updated this method is called by Foundry. We use it
   * to add in the "mixins" enabled for this item type.
   *
   * This seems excessive (once on item creation seems enough) but this is what DND5E does.
   *
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.loadMixins();
  }

  /**
   * We override this function so that when items that have installed items in them are exported,
   * either to JSON or to compendia, we package the data of their installed items with them. Then,
   * when these are imported this data can be converted into actual items in the world.
   *
   * @override
   * @param {CompendiumCollection} [pack]   A specific pack being exported to
   * @param {object} [options]              Additional options which modify how the document is converted
   * @param {boolean} [options.clearFlags=false]      Clear the flags object
   * @param {boolean} [options.clearSource=true]      Clear any prior sourceId flag
   * @param {boolean} [options.clearSort=true]        Clear the currently assigned sort order
   * @param {boolean} [options.clearFolder=false]     Clear the currently assigned folder
   * @param {boolean} [options.clearOwnership=true]   Clear document ownership
   * @param {boolean} [options.clearState=true]       Clear fields which store document state
   * @param {boolean} [options.keepId=false]          Retain the current Document id
   * @returns {object}                      A data object of cleaned data suitable for compendium import
   */
  toCompendium(pack, options) {
    const data = super.toCompendium(pack, options);

    const containerTypes = SystemUtils.getDocTypesFromMixin("container");
    // Return data if this is not a container object.
    if (!containerTypes.includes(this.type)) {
      return data;
    }

    // Get the data for all installed objects.
    const cprInstallTree = this.createInstalledObjectData();

    // Set the installed object data as a flag.
    // Note, if you ever change the name of `cprInstallTree` to something else,
    // you would have to change it in `createInstalledObjectData()` too.
    const { flags } = this;
    flags.cprInstallTree = cprInstallTree;
    data.flags = flags;

    // Update the item data with the new flags.
    return data;
  }

  /**
   * We override this so that when items with installed items are dragged
   * from one actor to another, the installed items get brought along as well.
   * Similarly to `toCompendium()` above, we package the installed item information
   * in Object form and store it in the flags of the original item. Then, using the
   * `createItem` hook we recursively create all the installed items from this data.
   *
   * @override
   * @param {Object} data - The data object extracted from a DataTransfer event
   * @param {Object} options - Additional options which affect drop data behavior
   * @returns {Promise<CPRItem>} - The resolved item
   */
  static async fromDropData(data, options) {
    const item = await super.fromDropData(data, options);

    // Return if not a container item or if this item doesn't have a parent.
    const containerTypes = SystemUtils.getDocTypesFromMixin("container");
    if (!containerTypes.includes(item.type) || !item.parent) {
      return item;
    }

    // Get the data for all installed objects.
    const cprInstallTree = item.createInstalledObjectData();

    // Set the installed object data as a flag.
    // Note, if you ever change the name of `cprInstallTree` to something else,
    // you would have to change it in `createInstalledObjectData()` too.
    const flags = foundry.utils.duplicate(item.flags);
    flags.cprInstallTree = cprInstallTree;

    // Update the item with the new flags.
    await item.update({ flags });

    return item;
  }

  /**
   * We override this function so that when items that have installed items in them are imported,
   * from JSON, they convert the data of their installed items in into world objects
   *
   * @override
   * @param {string} json          Raw JSON data to import
   * @returns {Promise<CPRItem>}   The updated Document instance
   */
  async importFromJSON(json) {
    // Import the item so that we can then manipulate it.
    const item = await super.importFromJSON(json);
    // Only manipulate the imported item if it contains installed item data.
    if (item.flags.cprInstallTree) {
      // Recursively create installed items from the item data embedded in
      // `item.flags.cprInstallTree`
      return item.importInstalledToWorld(true);
    }

    // If item does not have embedded installed data, just return the item.
    return item;
  }

  /**
   * Generic item.doAction() method so any item can be called to
   * perform an action.  This can be easily extended in the
   * switch statement and adding additional methods for each item.
   * Prepatory work for
   * Click to Consume (Apply mods / effect / state change)
   * Opening Agent Dialog
   * Any calls to functions not related to rolls, triggered from actions.
   *
   * @param {Actor} actor - the actor (parent) associated with the item doing something
   * @param {*} actionAttributes - arbitrary data to control the action
   */
  doAction(actor, actionAttributes) {
    const itemType = this.type;
    switch (itemType) {
      case "cyberware": {
        return this._cyberwareAction(actor, actionAttributes);
      }
      case "itemUpgrade": {
        return this._itemUpgradeAction(actor, actionAttributes);
      }
      case "weapon": {
        return this._weaponAction(actor, actionAttributes);
      }
      case "ammo": {
        return this._ammoAction(actionAttributes);
      }
      default:
    }
    return Promise.resolve();
  }

  /**
   * Dispatcher for update-specific actions.
   *
   * @param {CPRActor} actor - who is performing the upgrade action?
   * @param {Object} actionAttributes - details from the event data about the action
   * @returns null for invalid actions
   */
  _itemUpgradeAction(actor, actionAttributes) {
    switch (this.system.type) {
      case "weapon": {
        if (this.system.modifiers.secondaryWeapon.configured) {
          return this._weaponAction(actor, actionAttributes);
        }
        break;
      }
      default:
    }
    return null;
  }

  /**
   * Pop up a confirmation dialog box when performing a roll. Depending on the type,
   * the fields may be changed in the form. Properties in the CPRRoll object may
   * be modified by the form answers, and that is what is returned.
   *
   * @param {CPRRoll} cprRoll
   * @returns {CPRRoll}
   */
  confirmRoll(cprRoll) {
    const itemType = this.type;
    const cprItemData = this.system;
    const localCprRoll = cprRoll;

    const hasLoadableTemplate = SystemUtils.hasMixin(itemType, "loadable");
    if (hasLoadableTemplate) {
      if (localCprRoll instanceof CPRRolls.CPRAttackRoll) {
        if (cprItemData.isRanged) {
          this.dischargeItem(localCprRoll);
          const ammoType = this._getLoadedAmmoProp("type");
          if (ammoType !== "undefined") {
            localCprRoll.rollCardExtraArgs.ammoType = ammoType;
          }
        }
      }
      if (localCprRoll instanceof CPRRolls.CPRDamageRoll) {
        if (localCprRoll.isAutofire) {
          localCprRoll.setAutofire();
        }
      }
    }
    return localCprRoll;
  }

  /**
   * Set whether the item is a favorite for the player, highlighting it in the UI/sheet
   */
  toggleFavorite() {
    this.update({ "system.favorite": !this.system.favorite });
  }

  /**
   * Dispatcher method for creating item-based rolls.
   *
   * @param {String} type - type of roll to be created
   * @param {CPRActor} actor - actor doing the roll
   * @param {Object} extraData - extra data about the roll to consider
   * @returns {CPRRoll} or null for invalid roll types
   */
  createRoll(type, actor, extraData = []) {
    switch (type) {
      case CPRRolls.rollTypes.SKILL: {
        return this._createSkillRoll(actor);
      }
      case CPRRolls.rollTypes.INTERFACEABILITY:
        return this._createInterfaceRoll(actor, extraData);
      case CPRRolls.rollTypes.ROLEABILITY: {
        return this._createRoleRoll(type, actor, extraData);
      }
      case CPRRolls.rollTypes.SUPPRESSIVE:
      case CPRRolls.rollTypes.AUTOFIRE:
      case CPRRolls.rollTypes.AIMED:
      case CPRRolls.rollTypes.ATTACK: {
        return this._createAttackRoll(type, actor);
      }
      case CPRRolls.rollTypes.DAMAGE: {
        const damageType = extraData.damageType ? extraData.damageType : type;
        return this._createDamageRoll(damageType, actor);
      }
      case CPRRolls.rollTypes.CYBERDECKPROGRAM: {
        return this._createCyberdeckRoll(actor, extraData);
      }
      default:
    }
    return null;
  }
}
