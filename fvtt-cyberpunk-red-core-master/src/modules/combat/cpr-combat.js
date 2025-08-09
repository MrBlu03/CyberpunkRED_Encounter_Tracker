/* eslint-disable no-await-in-loop */
import CombatUtils from "../utils/cpr-combatUtils.js";
import CPRChat from "../chat/cpr-chat.js";
import DiceHandler from "../extern/cpr-dice-handler.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * A custom class so we can override initiative behaviors for Black-ICE and Demons.
 * According to the rules, these actors do not "roll" an initiative, instead they
 * get put "at the top", with an initiative value 1 better than whoever else is
 * currently first on the list. Foundry does not support this natively, so we
 * override the _getInitiativeFormula to address that.
 *
 * @extends
 */
export default class CPRCombat extends Combat {
  /**
   * Here is where the Black-ICE and Demon initiative behavior is implemented. If nothing
   * has an initiative set, the program gets "30", which should be high enough to always
   * be at the top. Otherwise we take the best, and increase it by 1.
   *
   * For all other actor types, the initiative is the system default (defined in system.json),
   * or the Foundry default if that is not specified.
   *
   * @param {*} combatant - the combatant object "rolling" for initiative
   * @returns - a string representation of the roll formula for the initiative. "30" is a
   *            valid formula, which is treated like a constant.
   */
  static _getInitiativeFormula(combatant) {
    if (
      combatant.actor.type === "blackIce" ||
      combatant.actor.type === "demon"
    ) {
      const bestInit = CombatUtils.GetBestInit();
      if (!bestInit) return "30";
      if (bestInit !== combatant.initiative) {
        return String(bestInit + 1);
      }
      return String(combatant.initiative);
    }
    return "1d10";
  }

  /**
   * Roll initiative for one or multiple Combatants within the Combat entity
   *
   * @param {string|string[]} ids     A Combatant id or Array of ids for which to roll
   * @param {object} [options={}]     Additional options which modify how initiative rolls are created or presented.
   * @param {string|null} [options.formula]         A non-default initiative formula to roll. Otherwise the system default is used.
   * @param {boolean} [options.updateTurn=true]     Update the Combat turn after adding new initiative scores to keep the turn on the same Combatant.
   * @param {object} [options.messageOptions={}]    Additional options with which to customize created Chat Messages
   * @return {Promise<Combat>}        A promise which resolves to the updated Combat entity once updates are complete.
   */
  // eslint-disable-next-line no-unused-vars
  async rollInitiative(
    ids,
    { formula = null, updateTurn = true, messageOptions = {} } = {}
  ) {
    // Structure input data
    const combatantIds = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant ? this.combatant.id : null;

    // Iterate over Combatants, performing an initiative roll for each
    let update;
    for (const id of combatantIds) {
      // Get Combatant data (non-strictly)
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) return;
      const { actor } = combatant.token;
      let cprRoll;
      // Produce an initiative roll for the Combatant
      if (actor.constructor.name === "CPRContainerActor") {
        const warningMessage = `${SystemUtils.Localize(
          "CPR.messages.invalidCombatantType"
        )}: ${actor.name} (${actor.type})`;
        SystemUtils.DisplayMessage("warn", warningMessage);
        // eslint-disable-next-line no-continue
        continue; // Skip one iteration so that the rest doesn't happen.
      } else {
        cprRoll = await combatant.getInitiativeRoll(
          CPRCombat._getInitiativeFormula(combatant)
        );

        update = { _id: id, initiative: cprRoll.resultTotal };
        cprRoll.entityData = {
          actor: combatant.actor?.id,
          token: combatant.token?.id,
        };
      }

      const rollCriticals = game.settings.get(
        game.system.id,
        "criticalInitiative"
      );

      const roll = DiceHandler.handle3dDice(cprRoll._roll);
      let critRoll;
      if (rollCriticals && cprRoll.wasCritical()) {
        critRoll = DiceHandler.handle3dDice(cprRoll._critRoll);
      }
      await Promise.all([roll, critRoll]);

      CPRChat.RenderRollCard(cprRoll);

      await this.updateEmbeddedDocuments("Combatant", [update]);
    }

    // Ensure the turn order remains with the same combatant if the combat already started
    if (updateTurn && currentId) {
      await this.update({
        turn: this.turns.findIndex((t) => t.id === currentId),
      });
    }
  }
}
