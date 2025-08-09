import CPRSystemDataModel from "../system-data-model.js";
import CommonSchema from "./mixins/common-schema.js";
import ContainerSchema from "../shared/container-schema.js";
import PhysicalSchema from "./mixins/physical-schema.js";
import UpgradableSchema from "./mixins/upgradable-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class VehicleDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  ContainerSchema,
  PhysicalSchema,
  UpgradableSchema,
  ValuableSchema
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      sdp: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 50,
        min: 0,
      }),
      seats: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 2,
        min: 0,
      }),
      speedCombat: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 20,
        min: 0,
      }),
      speedNarrative: new fields.StringField({ blank: true, initial: "" }),
    });
  }
}
