import CPRSystemDataModel from "../../system-data-model.js";

export default class ValuableSchema extends CPRSystemDataModel {
  static mixinName = "valuable";

  static defineSchema() {
    const { fields } = foundry.data;
    return {
      price: new fields.SchemaField({
        market: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 100,
          min: 0,
        }),
      }),
    };
  }
}
