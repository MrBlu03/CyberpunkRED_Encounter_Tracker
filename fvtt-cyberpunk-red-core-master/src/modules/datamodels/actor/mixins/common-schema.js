import CPRSystemDataModel from "../../system-data-model.js";
import SystemUtils from "../../../utils/cpr-systemUtils.js";
import CPRMod from "../../../rolls/cpr-modifiers.js";

import StatSchema from "../components/stat-schema.js";
import DerivedStatsSchema from "../components/derivedStats-schema.js";
import ExternalResourceSchema from "../components/external-resource-schema.js";
import LedgerSchema from "../components/ledger-schema.js";
import ActorWeaponsSchema from "../components/weapons-schema.js";

export default class CommonSchema extends CPRSystemDataModel {
  static mixinName = "common";

  static defineSchema() {
    const { fields } = foundry.data;
    const includeMax = true;
    return {
      /**
       *  !IMPORTANT!
       *
       *  Do not alphabetise these, we need them in this order to order them
       *  correctly on the character sheet.
       */
      stats: new fields.SchemaField({
        int: new fields.SchemaField(StatSchema.defineSchema()),
        ref: new fields.SchemaField(StatSchema.defineSchema()),
        dex: new fields.SchemaField(StatSchema.defineSchema()),
        tech: new fields.SchemaField(StatSchema.defineSchema()),
        cool: new fields.SchemaField(StatSchema.defineSchema()),
        will: new fields.SchemaField(StatSchema.defineSchema()),
        luck: new fields.SchemaField(StatSchema.defineSchema({ includeMax })),
        move: new fields.SchemaField(StatSchema.defineSchema()),
        body: new fields.SchemaField(StatSchema.defineSchema()),
        emp: new fields.SchemaField(
          StatSchema.defineSchema({ includeMax, min: -10 })
        ),
      }),
      externalData: new fields.SchemaField({
        currentArmorBody: new fields.SchemaField(
          ExternalResourceSchema.defineSchema()
        ),
        currentArmorHead: new fields.SchemaField(
          ExternalResourceSchema.defineSchema()
        ),
        currentArmorShield: new fields.SchemaField(
          ExternalResourceSchema.defineSchema()
        ),
        currentWeapon: new fields.SchemaField(
          ExternalResourceSchema.defineSchema()
        ),
      }),
      derivedStats: new fields.EmbeddedDataField(DerivedStatsSchema),
      information: new fields.SchemaField({
        alias: new fields.HTMLField({ initial: "" }),
        description: new fields.HTMLField({ initial: "" }),
        history: new fields.HTMLField({ initial: "" }),
        notes: new fields.HTMLField({ initial: "" }),
      }),
      reputation: new fields.SchemaField(LedgerSchema.defineSchema()),
      roleInfo: new fields.SchemaField({
        activeNetRole: new fields.DocumentIdField({
          required: true,
          blank: true,
        }),
        activeRole: new fields.StringField({
          required: true,
          blank: true,
        }),
      }),
      weapons: new fields.EmbeddedDataField(ActorWeaponsSchema),
    };
  }

  /**
   * Retrieves a structured collection of skills from the actor to display
   * level, base, and modifier totals.
   *
   * `level` is the level of the skill item
   * `base` is the level of the relevant STAT
   * `mods` are the total relevant mods applied by Active Effects.
   *        We only count those that add/subtract from a skill and if an
   *        Active Effect is situational we only count the ones that are
   *        on by default.
   *
   * NOTE: This may need refactoring if/when we introduce overrides
   *       like `set` for things like `Skill Chips`.
   *
   * @returns {Object} An object representing the collection of skills.
   * Each key in this object is a slugified version of the skill name,
   *
   * Example of returned object structure:
   * {
   *   "skillName": {
   *     level: Number,
   *     base: Number,
   *     mods: Number
   *   },
   *   ...
   * }
   */
  get skills() {
    const skills = this.parent.itemTypes.skill;

    const effects = Array.from(this.parent.allApplicableEffects());
    const allMods = CPRMod.getAllModifiers(effects);
    const filteredMods = allMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault)
    );

    const output = {};

    // Get the level and base (STAT) of each Skill
    for (const skill of skills) {
      // Get the total Mods from Active Effects
      const skillMods = CPRMod.getRelevantMods(
        filteredMods,
        SystemUtils.slugify(skill.name)
      ).reduce((acc, mod) => {
        if (mod.changeMode === 2) {
          return acc + mod.value;
        }
        return acc;
      }, 0);

      output[SystemUtils.slugify(skill.name)] = {
        level: skill.system.level,
        stat: this.parent.system.stats[skill.system.stat].value,
        mods: skillMods,
      };
    }

    return output;
  }
}
