import CPRDialog from "../dialog/cpr-dialog-application.js";
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * We implemented a tool in the hud interface to measure ranged attack DVs. To figure out the right
 * DVs to present in the UI (based on weapon type), we use this class to look up tables and save them
 * to the token data.
 */
export default class HudInterface {
  /**
   * SetDvTable looks up the right DV table to use (implemented as a rollable table) and sets it
   * in the tokenData for use later.
   *
   * @param {TokenDocument} tokenData - the tokenData to update
   * @returns {null}
   */
  static async SetDvTable(tokenData) {
    const dvTables = (await SystemUtils.GetDvTables()).filter(
      (table) => table.name !== "DV Generic"
    );

    // Show "Set DV" dialog.
    const formData = await CPRDialog.showDialog(
      {
        dvTables,
        dvTable:
          tokenData.flags[game.system.id]?.cprDvTable?.name || dvTables[0].name,
      },
      // Set the options for the dialog.
      {
        title: SystemUtils.Localize("CPR.dialog.dv.hudPromptTitle"),
        template: `systems/${game.system.id}/templates/dialog/hud/cpr-dv-prompt.hbs`,
      }
    ).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }
    if (formData.dvTable === null) {
      formData.dvTable = "";
    }
    const { controlled } = canvas.tokens;
    const index = controlled.findIndex((x) => x.id === tokenData._id);
    const token = controlled[index];
    await SystemUtils.SetDvTable(token, formData.dvTable);
    if (token.actor.sheet.rendered) {
      token.actor.sheet.render();
    }
  }
}
