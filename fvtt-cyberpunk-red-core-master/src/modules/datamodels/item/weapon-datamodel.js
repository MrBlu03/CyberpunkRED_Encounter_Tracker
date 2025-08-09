import CPR from "../../system/config.js";
import CPRSystemDataModel from "../system-data-model.js";
import AttackableSchema from "./mixins/attackable-schema.js";
import CommonSchema from "./mixins/common-schema.js";
import ContainerSchema from "../shared/container-schema.js";
import EffectsSchema from "./mixins/effects-schema.js";
import EquippableSchema from "./mixins/equippable-schema.js";
import LoadableSchema from "./mixins/loadable-schema.js";
import PhysicalSchema from "./mixins/physical-schema.js";
import QualitySchema from "./mixins/quality-schema.js";
import UpgradableSchema from "./mixins/upgradable-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class WeaponDataModel extends CPRSystemDataModel.mixin(
  AttackableSchema,
  CommonSchema,
  ContainerSchema,
  EffectsSchema,
  EquippableSchema,
  LoadableSchema,
  PhysicalSchema,
  QualitySchema,
  UpgradableSchema,
  ValuableSchema
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      handsReq: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 0,
      }),
    });
  }
}
