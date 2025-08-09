import CPR from "../system/config.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Defines behaviors for a window that pops up when the Config Compendia button in
 * system settings is clicked. We go this route because the options available are
 * based on content in game.packs, but game.packs is not defined when settings are
 * configured. So we have present options dynamically when a button is clicked.
 */
export default class CPRCompendiaSettings extends FormApplication {
  /**
   * set up default things like the html template and window size
   *
   * @override
   * @static
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: SystemUtils.Localize("CPR.settings.compendiumMenu.title"),
      id: "injury-config",
      template: `systems/${game.system.id}/templates/apps/compendia-settings.hbs`,
      width: "auto",
      height: "auto",
      closeOnSubmit: true,
    });
  }

  /**
   * When this application (read: form window) is launched, create the data object that is
   * consumed by the handle bars template to present options to the user. This populates
   * the select menu, and looks like this: {settingValue: humanReadableString}
   *
   * @async
   * @override
   * @param {Object} options (not used here)
   * @returns {Object}
   */
  // eslint-disable-next-line class-methods-use-this
  async getData() {
    const critCurr = await game.settings.get(
      game.system.id,
      "criticalInjuryRollTableCompendium"
    );
    const netCurr = await game.settings.get(
      game.system.id,
      "netArchRollTableCompendium"
    );
    const dvCurr = await game.settings.get(
      game.system.id,
      "dvRollTableCompendium"
    );
    const choicesCrit = {
      [CPR.defaultCriticalInjuryTable]:
        "CPR.settings.criticalInjuryRollTableCompendium.default",
    };
    const choicesNet = {
      [CPR.defaultNetArchTable]:
        "CPR.settings.netArchRollTableCompendium.default",
    };
    const choicesDv = {
      [CPR.defaultDvTable]: "CPR.settings.dvRollTableCompendium.default",
    };
    const comps = SystemUtils.GetWorldCompendia("RollTable");
    for (const comp of comps) {
      choicesCrit[`world.${comp.metadata.name}`] = comp.metadata.label;
      choicesNet[`world.${comp.metadata.name}`] = comp.metadata.label;
      choicesDv[`world.${comp.metadata.name}`] = comp.metadata.label;
    }
    return {
      choicesCrit,
      choicesNet,
      choicesDv,
      critCurr,
      netCurr,
      dvCurr,
    };
  }

  /**
   * Called when the sub menu application (this thing) is submitted. Responsible for updating
   * internal settings with what the user chose.
   *
   * @async
   * @override
   * @param {*} event (not used here)
   * @param {Object} formData - choices made with the dropdowns in the sub menus
   */
  // eslint-disable-next-line class-methods-use-this
  async _updateObject(event, formData) {
    await game.settings.set(
      game.system.id,
      "criticalInjuryRollTableCompendium",
      formData.injuryChoice
    );
    await game.settings.set(
      game.system.id,
      "netArchRollTableCompendium",
      formData.netArchChoice
    );
    await game.settings.set(
      game.system.id,
      "dvRollTableCompendium",
      formData.dvChoice
    );
    SystemUtils.DisplayMessage(
      "notify",
      SystemUtils.Localize("CPR.settings.compendiumMenu.update")
    );
  }
}
