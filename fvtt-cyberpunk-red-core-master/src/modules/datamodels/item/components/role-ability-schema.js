import CPR from "../../../system/config.js";
import CPRSystemDataModel from "../../system-data-model.js";

export default class RoleAbilitySchema extends CPRSystemDataModel {
  static defineSchema() {
    const { fields } = foundry.data;
    return {
      name: new fields.StringField({ required: true, nullable: false }),
      rank: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      multiplier: new fields.NumberField({
        required: true,
        nullable: false,
        integer: false,
        initial: 1,
        min: 0.25,
        choices: [0.25, 0.5, 1, 2],
      }),
      stat: new fields.StringField({
        required: true,
        nullable: false,
        initial: "--",
        choices: ["--", ...Object.keys(CPR.statList)],
      }),
      hasRoll: new fields.BooleanField({ initial: false }),
      skill: new fields.AnyField({ required: true, initial: "--" }), // This field can either be a string ("--" or "varying"), OR a Skill object. This should eventually be changed so that the type is consistent.
      bonuses: new fields.ArrayField(new fields.ObjectField()),
      universalBonuses: new fields.ArrayField(
        new fields.StringField({ choices: Object.keys(CPR.universalBonuses) })
      ),
      bonusRatio: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 1,
      }),
      isSituational: new fields.BooleanField({ initial: false }),
      onByDefault: new fields.BooleanField({ initial: false }),
    };
  }
}
