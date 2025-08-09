import CPR from "../../../system/config.js";
import CPRSystemDataModel from "../../system-data-model.js";
import SystemUtils from "../../../utils/cpr-systemUtils.js";
import HpSchema from "./hp-schema.js";

export default class DerivedStatsSchema extends CPRSystemDataModel {
  static defineSchema() {
    const { fields } = foundry.data;
    return {
      currentWoundState: new fields.StringField({
        choices: Object.keys(CPR.woundState),
      }),
      deathSave: new fields.SchemaField({
        basePenalty: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 0,
          min: 0,
        }),
        penalty: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 0,
          min: 0,
        }),
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 0,
          min: 0,
        }),
      }),
      hp: new fields.SchemaField(HpSchema.defineSchema()),
      humanity: new fields.SchemaField({
        max: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 60,
          min: 0,
        }),
        transactions: new fields.ArrayField(
          new fields.ArrayField(
            new fields.StringField({ required: true, blank: true })
          )
        ),
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 60,
          min: -100, // Humanity can be negative. See Tales of the Red
        }),
      }),
      run: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 24,
          min: 0,
        }),
      }),
      seriouslyWounded: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        positive: false,
        initial: 20,
        min: 0,
      }),
      walk: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 12,
          min: 0,
        }),
      }),
    };
  }

  /**
   * Calculates if the character is 'Hardened' based on various stats, skills,
   * or item properties.
   *
   * @returns {Object} An object containing a boolean `value` indicating if
   *                   the character is hardened, and an array of `reasons`
   *                   explaining why this status was granted.
   */
  get isHardened() {
    const actorData = this.parent.parent;

    /**
     * Helper function to retrieve the skill name from a slugified version.
     *
     * @param {string} skillSlug - The slugified version of the skill name to
     *                             retrieve.
     * @returns {string} - The skill name corresponding to the slugified version.
     */
    const getSkillName = (skillSlug) => {
      // Get the translated skill name
      const translatedSkill = SystemUtils.Localize(
        `CPR.global.itemType.skill.${skillSlug}`
      );

      // Convert the translated skill name back to the slugified version
      // if they don't match it means it's either a custom skill wihtout
      // a translation, or it doesn't have a translation in lang/*.json
      if (SystemUtils.slugify(translatedSkill) !== skillSlug) {
        const skillItem = actorData.items.find(
          (item) => SystemUtils.slugify(item.name) === skillSlug
        );
        return skillItem.name;
      }
      return translatedSkill;
    };

    // Set the default return
    const output = {
      value: false,
      reasons: [],
    };

    /**
     *  We need to lookup skill used for attacks these can either be the
     *  default ones, martial arts skills, or skills defined in weapons
     *  as `weaponSkill`
     */
    const attackSkills = SystemUtils.GetAttackableSkills(actorData);

    // REF >= 8 and Evasion >= 6
    if (
      actorData.system.stats.ref.value >= 8 &&
      actorData.system.skills.evasion && // Make sure the character actually has evasion.
      actorData.system.skills.evasion.level +
        actorData.system.skills.evasion.mods >=
        6
    ) {
      const ref = SystemUtils.Localize("CPR.global.stats.ref");
      const evasion = SystemUtils.Localize("CPR.global.itemType.skill.evasion");
      const reason = SystemUtils.Format(
        "CPR.characterSheet.leftPane.hardened.reasons.refAndEvasion",
        {
          ref,
          evasion,
        }
      );
      output.value = true;
      output.reasons.push(reason);
    }

    // Can Attack with STAT + Skill + Mod > 15
    for (const skill of attackSkills) {
      if (
        actorData.system.skills[skill].level +
          actorData.system.skills[skill].stat +
          actorData.system.skills[skill].mods >=
        15
      ) {
        const skillName = getSkillName(skill);
        const reason = SystemUtils.Format(
          "CPR.characterSheet.leftPane.hardened.reasons.canAttack",
          { skillName }
        );
        output.value = true;
        output.reasons.push(reason);
      }
    }

    // WILL + BODY 16
    if (
      actorData.system.stats.will.value + actorData.system.stats.body.value >=
      16
    ) {
      const will = SystemUtils.Localize("CPR.global.stats.will");
      const body = SystemUtils.Localize("CPR.global.stats.body");
      const reason = SystemUtils.Format(
        "CPR.characterSheet.leftPane.hardened.reasons.willBody",
        { will, body }
      );
      output.value = true;
      output.reasons.push(reason);
    }

    // Weapon of >= 5000
    for (const weapon of actorData.system.weapons.available) {
      if (weapon.system.price.market >= 5000) {
        const weaponName = weapon.name;
        const reason = SystemUtils.Format(
          "CPR.characterSheet.leftPane.hardened.reasons.weaponValue",
          { weaponName }
        );
        output.value = true;
        output.reasons.push(reason);
      }
    }

    // DEX >= 8 & MOVE >= 8
    if (
      actorData.system.stats.dex.value >= 8 &&
      actorData.system.stats.move.value >= 8
    ) {
      const dex = SystemUtils.Localize("CPR.global.stats.dex");
      const move = SystemUtils.Localize("CPR.global.stats.move");
      const reason = SystemUtils.Format(
        "CPR.characterSheet.leftPane.hardened.reasons.dexPlusMove",
        { dex, move }
      );
      output.value = true;
      output.reasons.push(reason);
    }

    // Autofire or any Martial Arts >= 6
    // We check for the `autofire` skill existing here as Elflines characters
    // do not have this skill.

    // We find any relevant martialArts skills
    const martialArtSkills = SystemUtils.GetMartialArtSkills(actorData);

    // Check if the actor has the `autofire` skill, if so add it to the check.
    const skillsToCheck = attackSkills.has("autofire")
      ? [...martialArtSkills, ...["autofire"]]
      : martialArtSkills;

    for (const skill of skillsToCheck) {
      if (
        actorData.system.skills[skill].level +
          actorData.system.skills[skill].mods >=
        6
      ) {
        const skillName = getSkillName(skill);
        const reason = SystemUtils.Format(
          "CPR.characterSheet.leftPane.hardened.reasons.autofireMartialArts",
          { skillName }
        );
        output.value = true;
        output.reasons.push(reason);
      }
    }

    // Solo rank >= 4
    for (const role of actorData.itemTypes.role) {
      if (SystemUtils.slugify(role.name) === "solo" && role.system.rank >= 4) {
        const roleName = SystemUtils.Localize("CPR.global.role.solo.name");
        const reason = SystemUtils.Format(
          "CPR.characterSheet.leftPane.hardened.reasons.solo",
          { roleName }
        );
        output.value = true;
        output.reasons.push(reason);
      }
    }

    return output;
  }
}
