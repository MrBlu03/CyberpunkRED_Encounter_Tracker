/* eslint-disable no-await-in-loop */
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRDialog from "../../dialog/cpr-dialog-application.js";

const Installable = function Installable() {
  /**
   * Install this item into a container type item
   *
   * This is only ever called from the actor sheet.
   *
   * @async
   */
  this.install = async function install() {
    if (!this.actor) {
      return;
    }

    const { actor } = this;
    const installationType = this.type;
    const containerTypes = SystemUtils.getDocTypesFromMixin("container");

    const installationTargets = [];
    const installationTargetTypes = [];

    for (const containerType of containerTypes) {
      for (const item of actor.itemTypes[containerType]) {
        if (
          item.system.installedItems.allowed &&
          item.system.installedItems.allowedTypes.includes(installationType) &&
          item.availableInstallSlots() >= this.system.size
        ) {
          if (installationType === "itemUpgrade") {
            if (item.type === this.system.type) {
              installationTargets.push(item);
            }
          } else {
            installationTargets.push(item);
          }
          if (
            installationTargets.includes(item) &&
            !installationTargetTypes.includes(item.type)
          ) {
            installationTargetTypes.push(item.type);
          }
        }
      }
    }
    const dialogPromptHeader =
      installationTargets.length > 0
        ? SystemUtils.Format("CPR.dialog.selectInstallTarget.header", {
            installable: this.name,
          })
        : SystemUtils.Format("CPR.dialog.selectInstallTarget.noOptions", {
            target: this.name,
          });

    let dialogData = {
      header: dialogPromptHeader,
      installationTargetTypes,
      installationTargets,
      size: this.system.size,
    };

    // Show "Select Intall Targets" dialog.
    dialogData = await CPRDialog.showDialog(
      dialogData,
      // Set options for the dialog.
      {
        title: SystemUtils.Localize("CPR.dialog.selectInstallTarget.title"),
        template: `systems/${game.system.id}/templates/dialog/cpr-select-install-targets-prompt.hbs`,
      }
    ).catch((err) => LOGGER.debug(err));
    if (dialogData === undefined || dialogData.selectedTarget === null) {
      return;
    }

    const targetItem = actor.getOwnedItem(dialogData.selectedTarget);

    if (targetItem) {
      await targetItem.installItems([this]);
    }
  };

  /**
   * Uninstall this item.
   *
   * If specific container items are provided, this item will only be uninstalled from those.
   * Otherwise, the item will be installed from all locations.
   *
   * @async
   * @param {Object} [options={}] - Options for uninstalling
   * @param {Array<CPRItem(Container)>} [options.providedContainers = []] - A list of specific containers to uninstall this item from.
   * @param {Boolean} [options.skipDialog = false]                        - Whether or not to skip the dialog.
   * @returns {Promise}
   */
  this.uninstall = async function uninstall({
    providedContainers = [],
    skipDialog = false,
  } = {}) {
    const { actor } = this;

    // In theory, something could be installed in multiple items.
    // In practice, this is currently only true for ammo items (on a character sheet).
    let containers;
    if (providedContainers.length > 0) {
      containers = providedContainers;
    } else {
      containers = actor
        ? this.actor.getMultipleOwnedItems(this.system.installedIn)
        : game.items.filter((i) => this.system.installedIn.includes(i.id));
    }

    if (!skipDialog) {
      // Show "Default" dialog.
      const dialogData = await CPRDialog.showDialog(
        {
          containers,
          header: SystemUtils.Format(
            "CPR.dialog.uninstallConfirmation.message",
            {
              installableItemName: this.name,
            }
          ),
          isAmmo: this.type === "ammo", // Size isn't relevant for ammo items.
          selectedItems: containers.map((c) => c.id), // All items checked by default.
          size: this.system.size,
        },
        // Set the options for the dialog.
        {
          template: `systems/${game.system.id}/templates/dialog/cpr-uninstall-single-item-prompt.hbs`,
          title: SystemUtils.Localize("CPR.dialog.uninstallConfirmation.title"),
        }
      ).catch((err) => LOGGER.debug(err));

      if (!dialogData) {
        return Promise.resolve();
      }

      // An array of selected items from the dialog.
      const selectedItemIds = Array.isArray(dialogData.selectedItems)
        ? dialogData.selectedItems
        : [dialogData.selectedItems];

      // Filter containers by the selectedItems array.
      containers = containers.filter((c) => selectedItemIds.includes(c.id));
    }

    // Uninstall selected items.
    const uninstallPromises = [];
    for (const container of containers) {
      // Generate a list of promises.
      uninstallPromises.push(container.uninstallItems([this]));
    }
    // Resolve all of the promises.
    return Promise.all(uninstallPromises);
  };
};

export default Installable;
