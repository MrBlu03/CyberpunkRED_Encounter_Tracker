import CPRSystemDataModel from "../../system-data-model.js";
import CPR from "../../../system/config.js";

export default class QualitySchema extends CPRSystemDataModel {
  static mixinName = "quality";

  static defineSchema() {
    const { fields } = foundry.data;
    return {
      quality: new fields.StringField({
        initial: "standard",
        choices: Object.keys(CPR.itemQuality),
      }),
    };
  }
}
