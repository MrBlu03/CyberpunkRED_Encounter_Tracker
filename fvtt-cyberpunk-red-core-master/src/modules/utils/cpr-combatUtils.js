import LOGGER from "./cpr-logger.js";
import SystemUtils from "./cpr-systemUtils.js";

export default class CPRCombatUtils {
  // Optional
  static GetBestInit() {
    const combat = game.combats.viewed;
    if (!combat) {
      // no combat encounters are happening in this scene
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Localize("CPR.combatUtils.noCombatSelected")
      );
      return null;
    }
    const { combatants } = combat;
    if (combatants.contents.length === 0) {
      // a combat encounter is viewed but devoid of combatants
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Localize("CPR.combatUtils.noCombatantsFound")
      );
      return null;
    }
    const initiatives = combatants.map((c) => c.initiative);
    LOGGER.debug(`raw initiatives: ${initiatives}`);
    const definedInits = initiatives.filter((i) => Number.isInteger(i));
    LOGGER.debug(`definedInits: ${definedInits}`);
    if (definedInits.length === 0) {
      // a combat encounter is viewed but nobody has rolled initiative
      SystemUtils.DisplayMessage(
        "warn",
        SystemUtils.Localize("CPR.combatUtils.nobodyRolledInitiative")
      );
      return null;
    }
    return Math.max(...definedInits);
  }
}
