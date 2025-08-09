import CPRSystemDataModel from "../../system-data-model.js";
import LedgerSchema from "../components/ledger-schema.js";

export default class WealthSchema extends CPRSystemDataModel {
  static mixinName = "wealth";

  static defineSchema() {
    const { fields } = foundry.data;
    return {
      wealth: new fields.SchemaField(LedgerSchema.defineSchema()),
    };
  }
}
