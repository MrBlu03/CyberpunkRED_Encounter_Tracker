import CPR from "../../system/config.js";
import CPRSystemDataModel from "../system-data-model.js";
import CommonSchema from "./mixins/common-schema.js";

export default class SkillDataModel extends CPRSystemDataModel.mixin(
  CommonSchema
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      level: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      stat: new fields.StringField({
        initial: "int",
        choices: Object.keys(CPR.statList),
      }),
      category: new fields.StringField({
        initial: "awarenessSkills",
        choices: Object.keys(CPR.skillCategories),
      }),
      difficulty: new fields.StringField({
        initial: "typical",
        choices: Object.keys(CPR.skillDifficulties),
      }),
      skillType: new fields.StringField({
        initial: "generic",
        choices: Object.keys(CPR.skillTypes),
      }),
      core: new fields.BooleanField({ initial: false }),
      basic: new fields.BooleanField({ initial: false }),
    });
  }
}
