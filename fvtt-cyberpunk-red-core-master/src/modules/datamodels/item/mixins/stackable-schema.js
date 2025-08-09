import CPRSystemDataModel from "../../system-data-model.js";

export default class StackableSchema extends CPRSystemDataModel {
  static mixinName = "stackable";

  static defineSchema() {
    const { fields } = foundry.data;
    return {
      amount: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 0,
      }),
    };
  }
}
