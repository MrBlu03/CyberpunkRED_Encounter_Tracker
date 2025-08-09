import CPR from "../../../system/config.js";
import CPRSystemDataModel from "../../system-data-model.js";

export default class EquippableSchema extends CPRSystemDataModel {
  static mixinName = "equippable";

  static defineSchema() {
    const { fields } = foundry.data;
    return {
      equipped: new fields.StringField({
        initial: "owned",
        choices: Object.keys(CPR.equipped),
      }),
    };
  }
}
