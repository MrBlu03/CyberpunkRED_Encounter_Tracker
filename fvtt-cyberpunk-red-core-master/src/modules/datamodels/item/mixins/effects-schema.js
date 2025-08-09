import CPRSystemDataModel from "../../system-data-model.js";
import CPR from "../../../system/config.js";

export default class EffectsSchema extends CPRSystemDataModel {
  static mixinName = "effects";

  static defineSchema() {
    const { fields } = foundry.data;
    return {
      revealed: new fields.BooleanField({ initial: true }),
      usage: new fields.StringField({
        initial: "toggled",
        choices: Object.keys(CPR.effectUses),
      }),
    };
  }
}
