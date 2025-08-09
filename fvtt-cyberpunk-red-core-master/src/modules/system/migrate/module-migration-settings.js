/* eslint-disable class-methods-use-this */
import SystemUtils from "../../utils/cpr-systemUtils.js";

export default class ModuleMigrationSettings extends FormApplication {
  /**
   * set up default things like the html template and window size
   *
   * @override
   * @static
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: SystemUtils.Localize("CPR.settings.moduleMigrationMenu.name"),
      id: "module-migration-config",
      template: `systems/${game.system.id}/templates/migration/module-migration-settings.hbs`,
      width: "auto",
      height: "auto",
      closeOnSubmit: true,
    });
  }

  /**
   * When this application (read: form window) is launched, create the data object that is
   * consumed by the handle bars template to present options to the user.
   *
   * @override
   * @returns {Object}
   */
  async getData() {
    const data = super.getData();

    const moduleIdSet = new Set(
      game.settings.get(game.system.id, "moduleMigrationIds")
    );
    data.selectedMods = Array.from(moduleIdSet);

    data.modules = {};
    const compendiaTypes = ["Actor", "Item", "Scene"];

    // Gather modules with relevant compendia.
    game.modules.forEach((module) => {
      const filteredPacks = module.packs.filter((p) =>
        compendiaTypes.includes(p.type)
      );
      if (filteredPacks.size === 0) return;
      data.modules[module.id] = module.title;
    });

    return data;
  }

  /**
   * Called when the sub menu application (this thing) is submitted. Responsible for updating
   * internal settings with what the user chose.
   *
   * @async
   * @override
   * @param {*} event (not used here)
   * @param {Object} formData - object containing module ids corresponding to choices
   */
  async _updateObject(event, formData) {
    // Cast to an array if not.
    if (!Array.isArray(formData.modIds)) formData.modIds = [formData.modIds];
    const modIdList = formData.modIds.filter((id) => id); // remove null values
    await game.settings.set(game.system.id, "moduleMigrationIds", modIdList);
  }
}
