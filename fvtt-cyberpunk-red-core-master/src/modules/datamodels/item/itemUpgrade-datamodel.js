import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRSystemDataModel from "../system-data-model.js";
import UpgradeModifierSchema from "./components/upgrade-modifier-schema.js";
import AttackableSchema from "./mixins/attackable-schema.js";
import CommonSchema from "./mixins/common-schema.js";
import ContainerSchema from "../shared/container-schema.js";
import EffectsSchema from "./mixins/effects-schema.js";
import ElectronicSchema from "./mixins/electronic-schema.js";
import InstallableSchema from "./mixins/installable-schema.js";
import LoadableSchema from "./mixins/loadable-schema.js";
import PhysicalSchema from "./mixins/physical-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class ItemUpgradeDataModel extends CPRSystemDataModel.mixin(
  AttackableSchema,
  CommonSchema,
  ContainerSchema,
  EffectsSchema,
  ElectronicSchema,
  InstallableSchema,
  LoadableSchema,
  PhysicalSchema,
  ValuableSchema
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      handsReq: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      modifiers: new fields.SchemaField({
        secondaryWeapon: new fields.SchemaField({
          configured: new fields.BooleanField({ initial: false }),
        }),
        attackmod: new fields.SchemaField(
          UpgradeModifierSchema.defineSchema(),
          { required: false }
        ),
        damage: new fields.SchemaField(UpgradeModifierSchema.defineSchema(), {
          required: false,
        }),
        rof: new fields.SchemaField(UpgradeModifierSchema.defineSchema(), {
          required: false,
        }),
        magazine: new fields.SchemaField(UpgradeModifierSchema.defineSchema(), {
          required: false,
        }),
        sdp: new fields.SchemaField(UpgradeModifierSchema.defineSchema(), {
          required: false,
        }),
        seats: new fields.SchemaField(UpgradeModifierSchema.defineSchema(), {
          required: false,
        }),
        speedCombat: new fields.SchemaField(
          UpgradeModifierSchema.defineSchema(),
          {
            required: false,
          }
        ),
        slots: new fields.SchemaField(UpgradeModifierSchema.defineSchema(), {
          required: false,
        }),
        bodySp: new fields.SchemaField(UpgradeModifierSchema.defineSchema(), {
          required: false,
        }),
        headSp: new fields.SchemaField(UpgradeModifierSchema.defineSchema(), {
          required: false,
        }),
        shieldHp: new fields.SchemaField(UpgradeModifierSchema.defineSchema(), {
          required: false,
        }),
        "Wardrobe & Style": new fields.SchemaField(
          UpgradeModifierSchema.defineSchema(),
          { required: false }
        ),
        cool: new fields.SchemaField(UpgradeModifierSchema.defineSchema(), {
          required: false,
        }),
      }),
      type: new fields.StringField({
        initial: "weapon",
        choices: SystemUtils.getDocTypesFromMixin("upgradable"),
      }),
    });
  }
}
