import CPRSystemDataModel from "../../system-data-model.js";

export default class HpSchema extends CPRSystemDataModel {
  static defineSchema({ initial = 40 } = {}) {
    const { fields } = foundry.data;
    return {
      max: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        positive: false,
        initial,
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
        initial,
        min: 0,
      }),
    };
  }
}
