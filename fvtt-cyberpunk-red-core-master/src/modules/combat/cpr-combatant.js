import SystemUtils from "../utils/cpr-systemUtils.js";
import * as CPRRolls from "../rolls/cpr-rolls.js";
import CPRMod from "../rolls/cpr-modifiers.js";

/**
 * A custom class so we can override initiative behaviors for Black-ICE and Demons.
 * According to the rules, these actors do not "roll" an initiative, instead they
 * get put "at the top", which an initiative value 1 better than whoever else is
 * currently first on the list. Foundry does not support this natively, so we
 * override the _getInitiativeFormula to address that.
 *
 * @extends Combatant
 */
export default class CPRCombatant extends Combatant {
  /**
   * Create an initiative roll for this combatant
   *
   * @param {String} formula - Roll formula to use for initiative
   * @returns {Roll}
   */
  async getInitiativeRoll(formula) {
    let cprInitiative;
    const { actor } = this.token;
    let statName = "";
    let statValue = 0;
    switch (actor.type) {
      case "character":
      case "mook": {
        statName = SystemUtils.Localize("CPR.global.stats.ref");
        statValue = actor.getStat("ref");
        cprInitiative = new CPRRolls.CPRInitiative(
          actor.name,
          formula,
          statName,
          statValue
        );
        break;
      }
      case "demon": {
        statName = SystemUtils.Localize(
          "CPR.global.role.netrunner.ability.interface"
        );
        statValue = actor.getStat("interface");
        cprInitiative = new CPRRolls.CPRInitiative(
          actor.name,
          formula,
          statName,
          statValue
        );
        break;
      }
      case "blackIce": {
        statName = SystemUtils.Localize("CPR.global.generic.speed");
        statValue = actor.getStat("spd");
        cprInitiative = new CPRRolls.CPRInitiative(
          actor.name,
          formula,
          statName,
          statValue
        );
        break;
      }
      default:
        // The only way we get here is if someone tries to roll initiative for something that
        // should not have an initiative roll (container?), so we will just roll whatever formula is passed with
        // no base value
        cprInitiative = new CPRRolls.CPRInitiative(
          actor.name,
          formula,
          statName,
          statValue
        );
        break;
    }
    // Demons and Black ICE do not have initiative bonuses.
    if (actor.type !== "demon" && actor.type !== "blackIce") {
      const effects = Array.from(actor.allApplicableEffects());
      const allMods = CPRMod.getAllModifiers(effects);
      const filteredMods = allMods.filter(
        (m) => !m.isSituational || (m.isSituational && m.onByDefault)
      );

      const initiativeMods = CPRMod.getRelevantMods(filteredMods, "initiative");

      cprInitiative.addMod(initiativeMods); // consider any active effects

      // total up universal initiative bonuses directly from role abilities
      let roleMods = [];
      actor.itemTypes.role.forEach((r) => {
        roleMods = roleMods.concat(r.getRoleMods("initiative", true));
      });
      roleMods = roleMods.filter(
        (m) => !m.isSituational || (m.isSituational && m.onByDefault)
      );

      cprInitiative.addMod(roleMods); // add bonus from role abilities and subabilities

      if (
        allMods.some((m) => m.key === "bonuses.initiative" && m.isSituational)
      ) {
        await cprInitiative.handleRollDialog({}, this.actor);
      }
    }

    await cprInitiative.roll();
    return cprInitiative;
  }
}
