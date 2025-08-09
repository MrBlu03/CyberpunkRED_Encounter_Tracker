/* eslint-disable no-await-in-loop */
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRDialog from "../../dialog/cpr-dialog-application.js";

export class ContainerUtils {
  /**
   * Confirm if the user wishes to delete nested installed items or to just uninstall them.
   * @returns {Object|void} Form data containing whether or not to delete installed items.
   */
  static async confirmContainerDelete() {
    // Show "Delete Container" dialog.
    return CPRDialog.showDialog(
      { deleteInstalled: game.settings.get(game.system.id, "deleteContainer") },
      {
        // Set options for dialog.
        title: SystemUtils.Localize("CPR.dialog.deleteContainer.title"),
        template: `systems/${game.system.id}/templates/dialog/cpr-delete-container-prompt.hbs`,
      }
    ).catch((err) => LOGGER.debug(err));
  }
}

/**
 * If an item can ACCEPT upgrades (i.e. it has slots), then it should include this
 * mixin. This does not accommodate items that are upgrades.
 */
const Container = function Container() {
  /**
   * Return the number of available slots, taking into
   * considerations any upgrades which may change the number
   * of slots.
   *
   * NOTE: Only call this function when `this` is CPRItem,
   * as CPRActors don't have slots.
   *
   * @returns Integer - Total number of available slots
   */
  this.availableInstallSlots = function availableInstallSlots() {
    const itemTemplates = SystemUtils.getDocTypesFromMixin("upgradable");
    let totalSlots = this.system.installedItems.slots;
    if (itemTemplates.includes(this.type)) {
      const upgradeData = this.getTotalUpgradeValues("slots");
      totalSlots =
        upgradeData.type === "override"
          ? upgradeData.value
          : totalSlots + upgradeData.value;
    }
    return parseInt(totalSlots - this.system.installedItems.usedSlots, 10);
  };

  /**
   * Get an array of the objects installed in this Item. An optional
   * string parameter may be passed to filter the return list by a
   * specific Item type.
   *
   * @param {String} type - Optionally return a list of a specific item type
   * @returns {Array} - Array of objects that are installed
   */
  this.getInstalledItems = function getInstalledItems(type = false) {
    let actor = false;
    if (this.documentName === "Actor") {
      actor = this;
    } else if (this.isEmbedded) {
      actor = this.actor;
    }

    const installedItems = [];

    this.system.installedItems.list.forEach((id) => {
      const item = actor ? actor.getOwnedItem(id) : game.items.get(id);
      if (item && (!type || item?.type === type)) {
        installedItems.push(item);
      }
    });
    return installedItems;
  };

  /**
   * Get an array of items that can be installed in this item,
   * whether they are installed or not.
   *
   * @param {String} type - Optionally return a list of a specific item type
   * @returns {Array} - Array of objects that are installed
   */
  this.getInstallableItems = function getInstallableItems(type = false) {
    let actor = false;
    if (this.documentName === "Actor") {
      actor = this;
    } else if (this.isEmbedded) {
      actor = this.actor;
    }

    // If a type is provided as an argument, then that is the only allowed type.
    // Otherwise, go with the configured values.
    const allowedTypes = type
      ? [type]
      : this.system.installedItems.allowedTypes;

    // If there is an actor, get owned items. Else, get world items.
    let installableItems = [];
    if (actor) {
      installableItems = actor.items.filter((i) =>
        allowedTypes.includes(i.type)
      );
    } else {
      installableItems = game.items.filter((i) =>
        allowedTypes.includes(i.type)
      );
    }

    // Filter out item upgrades that don't fit this item type.
    installableItems = installableItems.filter((i) => {
      if (i.type === "itemUpgrade" && this.type !== i.system.type) {
        return false;
      }
      return true;
    });

    return installableItems;
  };

  /**
   * Get an array of the objects installed in this Item.
   *
   * @returns {Array} - Array of objects that are installed
   */
  this.recursiveGetAllInstalledItems =
    function recursiveGetAllInstalledItems() {
      const installedItems = [];
      const containerTypes = SystemUtils.getDocTypesFromMixin("container");

      let actor = false;
      if (this.documentName === "Actor") {
        actor = this;
      } else if (this.isEmbedded) {
        actor = this.actor;
      }
      if (this.system.hasInstalled) {
        let idList = this.system.installedItems.list;
        while (idList.length > 0) {
          for (const id of idList) {
            const item = actor ? actor.getOwnedItem(id) : game.items.get(id);
            if (item) {
              if (containerTypes.includes(item.type)) {
                idList = idList.concat(item.system.installedItems.list);
              }
              installedItems.push(item);
            }
            idList = idList.filter((itemId) => itemId !== id);
          }
        }
      }
      return installedItems;
    };

  /**
   * Determine if a set of objects can be installed into this Item. Checks for
   * the following criteria:
   *  - Items are allowed to be installed
   *  - Item in itemLists are all in the allowedTypes of this item
   *  - Cumulative size of items in itemList is less than or equal to available slots
   *
   * @param {Array} itemList - Array of objects to wanting to be installed
   * @returns {Boolean} - Whether this item can install all objects passed to it
   */
  this.canInstallItems = function canInstallItems(itemList) {
    if (!Array.isArray(itemList)) {
      LOGGER.debug(
        `CPRActor.canInstallItems argument is not an array: ${itemList}`
      );
      return false;
    }

    // Check that the document allows anything to be installed.
    let result = this.system.installedItems.allowed;

    let totalInstallationSize = 0;
    itemList.forEach((item) => {
      if (
        // Check that the item's *type* can be installed.
        this.system.installedItems.allowedTypes.includes(item.type) &&
        // Check that the item being installed is actually 'installable'.
        SystemUtils.getMixins(item.type).includes("installable")
      ) {
        // For actors, which don't have slots, this will result in `0 + undefined = NaN` and will otherwise be unused
        totalInstallationSize += item.system.size;
      } else {
        SystemUtils.DisplayMessage(
          "error",
          SystemUtils.Format("CPR.messages.installInvalidType", {
            target: this.name,
            item: item.name,
          })
        );
        result = false;
      }
    });

    if (this.documentName === "Item") {
      const availableSlots = this.availableInstallSlots();
      if (totalInstallationSize > availableSlots) {
        SystemUtils.DisplayMessage(
          "error",
          SystemUtils.Format("CPR.messages.installInsufficientSlots", {
            item: this.name,
          })
        );
        result = false;
      }
    }

    return result;
  };

  /**
   * This will install items into this item.
   * @param {Array} itemList - Array of Item Objects to be installed
   * @returns {Promise<Boolean>} - Promise containing a boolean; whether or not changes were made to the caling document.
   */
  this.installItems = async function installItems(itemList) {
    // Make sure this function is passed an array.
    if (!Array.isArray(itemList)) {
      Promise.reject(
        new Error(`CPRItem.installItems argument is not an array: ${itemList}`)
      );
      return false;
    }

    const updateList = [];
    // Make sure we can actually install the items in this list.
    if (!this.canInstallItems(itemList)) {
      SystemUtils.DisplayMessage(
        "warn",
        "CPR.messages.installableNotConfigured"
      );
      return false;
    }

    const actor = this.isOwned ? this.actor : false;

    const installedItems = foundry.utils.duplicate(this.system.installedItems);
    const equippableTypes = SystemUtils.getDocTypesFromMixin("equippable");

    for (const item of itemList) {
      // No need to install it, it it's already installed.
      // eslint-disable-next-line no-continue
      if (installedItems.list.includes(item.id)) continue;
      // Add installed item to the target's list.
      installedItems.list.push(item.id);
      // Update target's used slots.
      installedItems.usedSlots += item.system.size;
      // Update the installed item itself.
      const itemData = {
        _id: item.id,
      };

      // Set equipped status of the newly installed item.
      if (equippableTypes.includes(item.type)) {
        itemData["system.equipped"] = equippableTypes.includes(this.type)
          ? this.system.equipped
          : "equipped";
      }

      // Push the installed item data
      updateList.push(itemData);
    }
    // Push the data for the target item to the update list.
    updateList.push({ _id: this.id, "system.installedItems": installedItems });

    if (actor) {
      // `document.updateEmbeddedDocuments` returns an empty list if no changes were made.
      return actor
        .updateEmbeddedDocuments("Item", updateList)
        .then((list) => list.length > 0);
    }

    // `document.update` returns undefined if no changes were made. Double exclamation point
    // to make this a boolean.
    const update =
      this.documentName === "Actor"
        ? !!(await this.update({ "system.installedItems": installedItems }))
        : !!(await this.installWorldItems(itemList, installedItems));

    // Rerender items directory for world items.
    if (!this.isEmbedded) ui.sidebar.tabs.items.render(true);
    return update;
  };

  /**
   * This will install items into this *world* item. When world items are installed, a copy should be made of every nested
   * installed item, and the `installedItems.list` should be updated. This way, world items can work as a sort of 'infinite-stack'.
   * In other words, you can keep installing new copies of items from the same world item. That is why it is necessary to break
   * out the logic of installation into world items specifically. The reason that you dont see recursion in this function, is
   * because it gets called from the `createItem` hook. Every new item that is created calls the hook (which then calls this
   * function, and so on), and thus the recursion is actually embedded in the hook. It really is recursive, just invisibly so.
   *
   * @recursive
   * @param {Array} itemList - Array of Item Objects to be installed
   * @param {Object} installedItems - system.installedItems datapoint
   * @returns {Promise<Boolean>} - Whether or not changes were made to the caling document.
   */
  this.installWorldItems = async function installWorldItems(
    itemList,
    installedItems
  ) {
    // Create duplicates of all installed items in the world.
    const newItems = await Item.createDocuments(itemList);
    const newItemIDs = newItems.map((i) => i.id);

    // Create the new install list: get the current install list (currentInstalledIDs),
    // then from that list, remove the IDs of the items being replaced (oldItemIDs),
    // and replace them in the current install list with the IDs of items that will be reinstalled (newItemIDs).
    const oldItemIDs = itemList.map((i) => i.id);
    const currentInstalledIDs = installedItems.list;
    const difference = currentInstalledIDs.filter(
      (id) => !oldItemIDs.includes(id)
    );
    installedItems.list = [...difference, ...newItemIDs];

    for (const item of newItems) {
      // Skip this iteration of the loop if the new item doesn't have installed items itself.
      // eslint-disable-next-line no-continue
      if (!item.system.hasInstalled) continue;

      // Get the list of installed items to duplicate and reinstall.
      const reinstallList = item.system.installedItems.list.map((id) =>
        game.items.get(id)
      );
      // Call this function recursively on the new item.
      await item.installWorldItems(reinstallList, item.system.installedItems);
    }
    // Update the installedItems.list reference with the list of new IDs.
    return this.update({ "system.installedItems": installedItems });
  };

  /**
   * This will uninstall all items in itemList from this item.  By default, any installed items
   * which also have installed items will NOT have those items removed from it.  Example:
   * Uninstalling a Cyberdeck from a Bodyweight Suit will NOT also uninstall any programs/upgrades
   * from the Cyberdeck.
   *
   * An exception here is the uninstallation of Cyberware.  Cyberware is always removed recursively
   * so if you uninstall a CyberArm which has a Cyberdeck in it, all programs and upgrades from the
   * Cyberdeck are also uninstalled.
   *
   * TODO: Determine if we should stop recursiveness on an item type change.  IE, if this
   *       is a cyberware item, only remove all embedded cyberware items and if something else
   *       is installed, like a cyberdeck, don't uninstall whatever it has installed.
   * @param {Array} itemList - Array of objects to uninstall
   * @param {Object} [options] - Options which define the behavior of uninstallation.
   * @param {Boolean} [options.recursive = false]  - Boolean stating if the uninstallation should be recursive
   *                                                 in that each item uninstalled should also have it's own
   *                                                 installed items removed.  This is needed for Cyberware uninstallations.
   * @param {Boolean} [options.unloadAmmo = true]  - Boolean stating if ammo should be unloaded as a part of this uninstall action.
   * @returns {Promise} - Promise containing an updated list of objects from updateEmbeddedDocuments()
   */
  this.uninstallItems = async function uninstallItems(
    uninstallList,
    options = { recursive: false, unloadAmmo: true }
  ) {
    if (!Array.isArray(uninstallList)) {
      return Promise.reject(
        new Error(
          `Container.uninstallItems argument is not an array: ${uninstallList}`
        )
      );
    }
    const containerTypes = SystemUtils.getDocTypesFromMixin("container");
    const actor = this.isOwned ? this.actor : false;
    // Duplicate the currenlty installed items.
    const installedIds = foundry.utils.duplicate(
      this.system.installedItems.list
    );

    const uninstallPromises = [];
    for (const item of uninstallList) {
      // Get index of uninstalled item.
      const index = installedIds.indexOf(item.id);
      // Remove that entry.
      installedIds.splice(index, 1);

      // Handle recursion - Uninstall items installed in items from `uninstallList`.
      if (options.recursive && containerTypes.includes(item.type)) {
        const recursiveUninstalled = item.getInstalledItems();
        if (recursiveUninstalled.length > 0) {
          uninstallPromises.push(
            item.uninstallItems(recursiveUninstalled, { recursive: true })
          );
        }
      }
    }
    await Promise.all(uninstallPromises);

    // Programs require some special actions like setting isRezzed to false,
    // and deleting any Black Ice tokens from the canvas, if applicable.
    // Those are handled in `cyberdeck.uninstallPrograms()`.
    const uninstalledPrograms = uninstallList.filter(
      (i) => i.type === "program"
    );
    if (uninstalledPrograms.length > 0 && this.type === "cyberdeck") {
      await this.uninstallPrograms(uninstalledPrograms);
    }

    const loadableTypes = SystemUtils.getDocTypesFromMixin("loadable");
    // When uninstalling an upgrade that increases magazine size, make sure any extra ammo
    // that would be in the upgrade is returned to the ammo item. Do this before unloading ammo.
    const uninstalledMagUpgrade = uninstallList.find(
      (i) => i.type === "itemUpgrade" && i.system.modifiers.magazine.value
    );
    if (loadableTypes.includes(this.type) && uninstalledMagUpgrade) {
      await this.syncMagazine();
    }

    // Ammo also requires some special actions when uninstalling, namely restoring the ammo
    // in the magazine back to the ammo item. Note, when transferring weapons between actors,
    // we do not want to unload the ammo from the weapon. If this is the case, `options.unloadAmmo` will be false.
    const uninstalledAmmo = uninstallList.filter((i) => i.type === "ammo");
    if (
      options.unloadAmmo &&
      uninstalledAmmo.length > 0 &&
      loadableTypes.includes(this.type)
    ) {
      await this.unload();
    }

    // Update used slots with the newly installed system.
    let usedSlots = 0;
    if (this.documentName === "Item") {
      installedIds.forEach((i) => {
        const item = actor ? actor.getOwnedItem(i) : game.items.get(i);
        usedSlots += item.system.size;
      });
    }

    // Update the document with the new list and used slots.
    const updates = await this.update({
      "system.installedItems.list": installedIds,
      "system.installedItems.usedSlots": usedSlots,
    });

    // Rerender items directory for world items.
    if (!this.isEmbedded) ui.sidebar.tabs.items.render(true);
    return updates;
  };

  /**
   * This is a helper function for when syncing installed items fails irrecoverably.
   * It forcibly resets `this.system.installedItems.list` and all nested items within.
   * This function should fix problems related to mismatches between the above list and
   * what items actually exist. Unfortunately, it means that users will have to manually
   * reinstall all any items that weren't messed up but got caught in the reset.
   *
   * Ideally, this is seldomly used. It currently is not called anywhere in the code. Rather,
   * it is a way we can help users resolve issues on their own.
   *
   * @async
   * @param {Boolean} all - If true and on an actor, all items on actor will get reset.
   *                        If false and on an actor, only things directly installed in the actor will get reset.
   *                        If not on an actor, has no effect.
   * @returns {Promise}
   */
  this.resetInstalled = async function resetInstalled(all = false) {
    let actor = false;
    if (this.documentName === "Actor") {
      actor = this;
    } else if (this.isEmbedded) {
      actor = this.actor;
    }

    const installedItems =
      this.documentName === "Actor" && all
        ? this.items
        : this.recursiveGetAllInstalledItems();
    const containerTypes = SystemUtils.getDocTypesFromMixin("container");
    const installableTypes = SystemUtils.getDocTypesFromMixin("installable");
    const relevantItems = installedItems.filter(
      (i) =>
        containerTypes.includes(i.type) || installableTypes.includes(i.type)
    );
    const keepInstalledList = [];
    const updateList = [];
    for (const item of relevantItems) {
      const updateData = {
        _id: item.id,
      };

      if (item.system.installedItems?.list) {
        updateData["system.installedItems.list"] = [];
      }

      if (item.system.installedItems?.slots) {
        updateData["system.installedItems.usedSlots"] = 0;
      }

      if (item.type === "program") {
        updateData["system.isRezzed"] = false;
      }

      if (item.system.core) {
        keepInstalledList.push(item.id);
      }
      updateList.push(updateData);
    }
    await this.update({ "system.installedItems.list": keepInstalledList });
    if (actor) {
      return actor.updateEmbeddedDocuments("Item", updateList);
    }
    return Item.updateDocuments(updateList);
  };

  /**
   * This function is called from the createEmbeddedDocuments function and it will create any items that are
   * installed in this container object on the actor and install them into the correct places.
   *
   *
   * @returns {Promise} - Promise of updated document
   */
  this.createInstalledItemsOnActor = async function createInstalledItemsOnActor(
    imported = false
  ) {
    const actor = this.parent;
    const creationList = [];

    if (imported) {
      // If this item is imported, the information for installed items is embedded in its flags.
      for (const itemData of this.flags.cprInstallTree) {
        // Add the item data to the list.
        creationList.push(itemData);
      }
      // If the item is from the world, we get the information for installed items,
      // by first finding the item in the world, and then converting it to an object.
    } else {
      for (const installedId of this.system.installedItems.list) {
        const installedItem = game.items.get(installedId);
        // Add the item data to the list.
        creationList.push(installedItem.toObject());
      }
    }

    const newInstalledList = [];
    // Create the items from the list.
    if (creationList.length > 0) {
      const createdItems = await actor.createEmbeddedDocuments(
        "Item",
        creationList,
        {
          // This ensures we don't call the function we're currently in from `createEmbeddedDocuments`.
          // Just create the items normally, and let the function we're in handle the recursion.
          createInstalled: false,
        }
      );

      for (const item of createdItems) {
        // Keep track of newly created item ID's so we can update the parent item.
        newInstalledList.push(item.id);
        if (item.system.hasInstalled) {
          await item.createInstalledItemsOnActor(!!item.flags.cprInstallTree);
        }
      }
    }

    // Remove the import flags.
    const { flags } = this;
    if (this.flags.cprInstallTree) {
      flags["-=cprInstallTree"] = null;
    }
    // Update the parent item.
    return actor.updateEmbeddedDocuments("Item", [
      { _id: this._id, flags, "system.installedItems.list": newInstalledList },
    ]);
  };

  /**
   * Recursive function to create installed items from imported data.
   *
   * @param {Boolean} recursive - Whether or not to install recursively.
   * @returns {CPRItem(container)} - the updated item
   */
  this.importInstalledToWorld = async function importInstalledToWorld(
    recursive
  ) {
    const newInstalledList = [];
    const { flags } = this;
    // Create the item from the object data.
    const newItems = await Item.createDocuments(flags.cprInstallTree);
    for (const newItem of newItems) {
      newInstalledList.push(newItem.id);
      if (recursive && newItem.flags.cprInstallTree) {
        newItem.importInstalledToWorld(recursive);
      }
    }
    // Update the item with installed list that contains the newly created items' ids.
    // And remove the now unnecessary import flag.
    flags["-=cprInstallTree"] = null;
    await this.update({
      flags,
      "system.installedItems.list": newInstalledList,
    });
    ui.sidebar.tabs.items.render(true);
  };

  /**
   * This function converts the IDs in the `installedItems.list` fields and
   * returns an array of of those Ttems converted into Objects. This is for use
   * in exporting items that have other items installed in them.
   *
   *
   * @param {CPRActor} - Optional: If this item exists on an actor, the actor is supplied.
   * @returns {Array<Object>|undefined} - Array of Items converted into just plain JS Objects.
   */
  this.convertInstalledIdsToObjects = function convertInstalledIdsToObject(
    actor
  ) {
    const installedIds = this.system.installedItems.list;
    const installedItemData = installedIds.map((id) => {
      const itemObject = actor
        ? actor.getOwnedItem(id).toObject()
        : game.items.get(id).toObject();
      // If we are transferring a weapon, we bring only the ammo in the weapon and an empty ammo stack.
      if (itemObject.type === "ammo") {
        itemObject.system.amount = 0;
      }
      return itemObject;
    });
    if (installedItemData.length > 0) {
      return installedItemData;
    }
    return undefined;
  };

  /**
   * Convert the tree of installed items into a recursive list of installed object data.
   * Return this list as a field in the calling item's flags (`flags.cprInstallTree`).
   *
   * This is called when dragging items between sheets, and when exporting items.
   * Installed item data is then built from these objects.
   *
   * @returns {Object} - The object data of all installed items nested in the correct structure.
   */
  this.createInstalledObjectData = function createInstalledObjectData() {
    /**
     * Provided a container item, we create an array of nested objects of installed item data.
     * Note, we store this data as regular JS objects, since the data may be stored in JSON format,
     * and thus cannot contain Class information.
     *
     * @recursive
     * @param {CPRItem(Container)} parentItem - The item we create an array of nested objects from.
     * @returns {Array<Object>} - Array of regular JS objects which contain nested installed item data.
     */
    function nestItemObjects(parentItem) {
      const containerTypes = SystemUtils.getDocTypesFromMixin("container");
      // Get first level of installed items.
      const installedItems = parentItem.getInstalledItems();

      // Convert all of the parent item's installed list to objects.
      const cprInstallTree = parentItem.convertInstalledIdsToObjects(
        parentItem.actor
      );
      // For each child item installed in the parent item...
      for (const childItem of installedItems) {
        // ...if it is a container item and has things installed...
        if (
          containerTypes.includes(childItem.type) &&
          childItem.system.hasInstalled
        ) {
          // ...find the corresponding child object...
          const childObject = cprInstallTree.find(
            (o) => o._id === childItem._id
          );
          // ...and set its flags equal to the function, called recursively.
          // This will set the flags with installed object data for each installed item,
          // no matter the depth.
          childObject.flags.cprInstallTree = nestItemObjects(childItem);
        }
      }
      // Return the nested object list.
      return cprInstallTree;
    }

    // Call the recusive function on the top-level item (`this`).
    const flag = nestItemObjects(this);
    return flag;
  };

  /**
   * Given an install tree (object data in flags), return every item recursively.
   * This is used for rendering ephemeral item sheets (items that dont exist in the world data base).
   * Why do we want to do this? So users can see (but not edit) the details of installed items which
   * exist in items in the compendium.
   *
   * @param {Array} tree - item.flags.cprInstallTree (Array of CPRContainerItem-like objects)
   */
  this.flattenInstallTree = function flattenInstallTree(tree) {
    const masterList = [];
    for (const itemData of tree) {
      masterList.push(itemData);
      if (itemData.flags.cprInstallTree?.length > 0) {
        const childTree = itemData.flags.cprInstallTree;
        masterList.push(...this.flattenInstallTree(childTree));
      }
    }
    return masterList;
  };
};

export default Container;
