import CPRSystemDataModel from "../../system-data-model.js";

export default class UpgradeModifierSchema extends CPRSystemDataModel {
  static defineSchema() {
    const { fields } = foundry.data;
    return {
      type: new fields.StringField({
        choices: ["modifier", "override"],
      }),
      value: new fields.NumberField({
        required: true,
        nullable: true,
        integer: true,
      }),
      isSituational: new fields.BooleanField({ required: false }),
      onByDefault: new fields.BooleanField({ required: false }),
    };
  }
}
