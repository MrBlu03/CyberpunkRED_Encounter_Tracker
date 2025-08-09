import * as CPRRolls from "../../rolls/cpr-rolls.js";
import CPR from "../../system/config.js";
import CPRItem from "../cpr-item.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRMod from "../../rolls/cpr-modifiers.js";

/**
 * Extend the base CPRItem object with things specific to actor skills.
 * @extends {CPRItem}
 */
export default class CPRSkillItem extends CPRItem {
  /**
   * Set the skill value. Called when edited in the actor sheet.
   *
   * @callback
   * @param {Number} value
   */
  setSkillLevel(value) {
    this.getRollData().level = Math.clamp(-99, value, 99);
  }

  /**
   * Create a CPRRoll object with the right type and mods for this skill.
   *
   * @param {CPRActor} actor - the actor this skill is associated with
   * @returns {CPRRoll}
   */
  _createSkillRoll(actor) {
    const cprItemData = this.system;
    const statName = cprItemData.stat;
    const niceStatName = SystemUtils.Localize(CPR.statList[statName]);
    const statValue = actor.getStat(statName);
    const skillName = this.name;
    const skillLevel = Number.parseInt(cprItemData.level, 10);

    const effects = Array.from(actor.allApplicableEffects()); // Active effects on the actor.
    const allMods = CPRMod.getAllModifiers(effects); // Effects list converted into CPRMods.
    // Filter for mods that should always be on (not situational) or are situational but on by default.
    const filteredMods = allMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault)
    );

    const skillMods = CPRMod.getRelevantMods(filteredMods, [
      SystemUtils.slugify(skillName),
      `${SystemUtils.slugify(skillName)}Hearing`,
      `${SystemUtils.slugify(skillName)}Sight`,
    ]);

    const allActionsMods = CPRMod.getRelevantMods(filteredMods, [
      "allActions",
      "allActionsSpeech",
      "allActionsHands",
    ]);

    // Get all mods for skills from role abilities and subRole abilities.
    let roleSkillMods = [];
    actor.itemTypes.role.forEach((r) => {
      roleSkillMods = roleSkillMods.concat(r.getRoleMods(skillName));
    });
    roleSkillMods = roleSkillMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault)
    );

    const cprRoll = new CPRRolls.CPRSkillRoll(
      niceStatName,
      statValue,
      skillName,
      skillLevel
    );
    cprRoll.addMod([
      {
        value: actor.getArmorPenaltyMods(statName),
        source: SystemUtils.Format("CPR.rolls.modifiers.sources.armorPenalty", {
          stat: niceStatName,
        }),
      },
    ]);
    cprRoll.addMod([
      {
        value: actor.getWoundStateMods(),
        source: SystemUtils.Localize(
          "CPR.rolls.modifiers.sources.woundStatePenalty"
        ),
      },
    ]);
    cprRoll.addMod(roleSkillMods);
    cprRoll.addMod(skillMods); // active effects
    cprRoll.addMod(allActionsMods); // Mods that affect all actions.
    return cprRoll;
  }
}
