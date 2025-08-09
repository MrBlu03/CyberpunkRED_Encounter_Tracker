import CPRSystemDataModel from "../system-data-model.js";
import CommonSchema from "./mixins/common-schema.js";
import EffectsSchema from "./mixins/effects-schema.js";
import EquippableSchema from "./mixins/equippable-schema.js";
import PhysicalSchema from "./mixins/physical-schema.js";
import StackableSchema from "./mixins/stackable-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class DrugDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  EffectsSchema,
  EquippableSchema,
  PhysicalSchema,
  StackableSchema,
  ValuableSchema
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      consumed: new fields.StringField({ initial: "None" }),
    });
  }
}
