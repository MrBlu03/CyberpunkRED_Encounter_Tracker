import CPRItem from "../cpr-item.js";
import LOGGER from "../../utils/cpr-logger.js";
import Rules from "../../utils/cpr-rules.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRDialog from "../../dialog/cpr-dialog-application.js";

/**
 * Extend the base CPRItem object with things specific to drugs and consumables.
 * @extends {CPRItem}
 */
export default class CPRDrugItem extends CPRItem {
  /**
   * Consume (snort) a drug and enjoy its effects. This item action is a shorthand way to enable
   * the active effects it has and decrement the amount value by one.
   *
   * We cannot change the disabled flag on the AE from the Item itself because Foundry does not
   * support updating AEs coming from owned Items, so we do it on the corresponding actor AE.
   * Rather than mess with isSuppressed, we go straight to "not disabled".
   *
   * @async
   * @returns the updated info
   */
  async snort() {
    Rules.lawyer(
      this.system.amount > 0,
      SystemUtils.Localize("CPR.messages.notEnoughDrugs")
    );
    if (!(await this._confirmSnort())) return;
    const newAmount = Math.max(0, this.system.amount - 1);
    if (this.actor) {
      if (this.effects.size > 0 && this.system.usage === "snorted") {
        // item has active effects to consider activating
        const effectUpdates = [];
        const { consumed } = this.system;
        if (
          consumed === SystemUtils.Localize("CPR.itemSheet.effects.none") ||
          consumed === "none"
        ) {
          // no primary was specified, so we enable all of them
          this.effects.forEach((ae) => {
            effectUpdates.push({ _id: ae.id, disabled: false });
          });
        } else {
          const aeObj = this.getEffectByName(consumed);
          const effect = this.effects.find((ae) => ae.name === aeObj.name);
          effectUpdates.push({ _id: effect.id, disabled: false });
        }
        await this.updateEmbeddedDocuments("ActiveEffect", effectUpdates); // update AEs
      }
      await this.update({ "system.amount": newAmount }); // update the amount
    }
    SystemUtils.DisplayMessage(
      "notify",
      `${this.name} ${SystemUtils.Localize("CPR.messages.consumedDrug")}`
    );
  }

  /**
   * pops up a confirmation to consume a drug (yes/no)
   *
   * @async
   * @private
   * @returns a promise
   */
  async _confirmSnort() {
    const dialogMessage = `${SystemUtils.Localize(
      "CPR.dialog.snortConfirmation.message"
    )} ${this.name}?`;
    return CPRDialog.showDialog(
      { dialogMessage },
      // Set the options for the dialog.
      { title: SystemUtils.Localize("CPR.dialog.snortConfirmation.title") }
    ).catch((err) => LOGGER.debug(err));
  }
}
