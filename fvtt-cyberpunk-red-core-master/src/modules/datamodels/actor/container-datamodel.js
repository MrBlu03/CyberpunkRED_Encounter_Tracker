import CPRSystemDataModel from "../system-data-model.js";
import HpSchema from "./components/hp-schema.js";
import WealthSchema from "./mixins/wealth-schema.js";

export default class ContainerDataModel extends CPRSystemDataModel.mixin(
  WealthSchema
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      armor: new fields.SchemaField({
        sp: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
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
      hp: new fields.SchemaField(HpSchema.defineSchema()),
      DV: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      reinforced: new fields.BooleanField({ initial: true }),
      restricted: new fields.BooleanField({ initial: true }),
      vendor: new fields.SchemaField({
        itemTypes: new fields.SchemaField({
          ammo: new fields.SchemaField({
            isPurchasing: new fields.BooleanField({ initial: true }),
            purchasePercentage: new fields.NumberField({
              required: true,
              nullable: false,
              integer: true,
              initial: 100,
              min: 0,
            }),
          }),
          armor: new fields.SchemaField({
            isPurchasing: new fields.BooleanField({ initial: true }),
            purchasePercentage: new fields.NumberField({
              required: true,
              nullable: false,
              integer: true,
              initial: 100,
              min: 0,
            }),
          }),
          clothing: new fields.SchemaField({
            isPurchasing: new fields.BooleanField({ initial: true }),
            purchasePercentage: new fields.NumberField({
              required: true,
              nullable: false,
              integer: true,
              initial: 100,
              min: 0,
            }),
          }),
          cyberdeck: new fields.SchemaField({
            isPurchasing: new fields.BooleanField({ initial: true }),
            purchasePercentage: new fields.NumberField({
              required: true,
              nullable: false,
              integer: true,
              initial: 100,
              min: 0,
            }),
          }),
          cyberware: new fields.SchemaField({
            isPurchasing: new fields.BooleanField({ initial: true }),
            purchasePercentage: new fields.NumberField({
              required: true,
              nullable: false,
              integer: true,
              initial: 100,
              min: 0,
            }),
          }),
          drug: new fields.SchemaField({
            isPurchasing: new fields.BooleanField({ initial: true }),
            purchasePercentage: new fields.NumberField({
              required: true,
              nullable: false,
              integer: true,
              initial: 100,
              min: 0,
            }),
          }),
          gear: new fields.SchemaField({
            isPurchasing: new fields.BooleanField({ initial: true }),
            purchasePercentage: new fields.NumberField({
              required: true,
              nullable: false,
              integer: true,
              initial: 100,
              min: 0,
            }),
          }),
          itemUpgrade: new fields.SchemaField({
            isPurchasing: new fields.BooleanField({ initial: true }),
            purchasePercentage: new fields.NumberField({
              required: true,
              nullable: false,
              integer: true,
              initial: 100,
              min: 0,
            }),
          }),
          vehicle: new fields.SchemaField({
            isPurchasing: new fields.BooleanField({ initial: true }),
            purchasePercentage: new fields.NumberField({
              required: true,
              nullable: false,
              integer: true,
              initial: 100,
              min: 0,
            }),
          }),
          weapon: new fields.SchemaField({
            isPurchasing: new fields.BooleanField({ initial: true }),
            purchasePercentage: new fields.NumberField({
              required: true,
              nullable: false,
              integer: true,
              initial: 100,
              min: 0,
            }),
          }),
        }),
      }),
    });
  }
}
