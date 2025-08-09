import CPRSystemDataModel from "../system-data-model.js";
import CommonSchema from "./mixins/common-schema.js";
import ContainerSchema from "../shared/container-schema.js";
import EffectsSchema from "./mixins/effects-schema.js";
import ElectronicSchema from "./mixins/electronic-schema.js";
import EquippableSchema from "./mixins/equippable-schema.js";
import PhysicalSchema from "./mixins/physical-schema.js";
import UpgradableSchema from "./mixins/upgradable-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class ArmorDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  ContainerSchema,
  EffectsSchema,
  ElectronicSchema,
  EquippableSchema,
  PhysicalSchema,
  UpgradableSchema,
  ValuableSchema
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      isBodyLocation: new fields.BooleanField({ initial: true }),
      isHeadLocation: new fields.BooleanField({ initial: false }),
      isShield: new fields.BooleanField({ initial: false }),
      bodyLocation: new fields.SchemaField({
        sp: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 7,
          min: 0,
        }),
        ablation: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
      }),
      headLocation: new fields.SchemaField({
        sp: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 7,
          min: 0,
        }),
        ablation: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
      }),
      shieldHitPoints: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 10,
          min: 0,
        }),
        max: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 10,
          min: 0,
        }),
      }),
      penalty: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: -10,
      }),
    });
  }

  /**
   * Check if this armor item is tracked in its actor's externalData datapoint.
   * This is used to update the armor value if modified directly from the item sheet.
   *
   * @getter
   * @returns {Boolean} - whether or not this armor is being tracked.
   */
  get isTracked() {
    const item = this.parent;
    if (!item.isEmbedded) return false; // Return false if this item is not embedded in an actor (owned)
    switch (true) {
      case item.system.isHeadLocation: {
        return item.actor.system.externalData.currentArmorHead.id === item.id;
      }
      case item.system.isBodyLocation: {
        return item.actor.system.externalData.currentArmorBody.id === item.id;
      }
      case item.system.isShield: {
        return item.actor.system.externalData.currentArmorShield.id === item.id;
      }
      default:
        return null;
    }
  }
}
