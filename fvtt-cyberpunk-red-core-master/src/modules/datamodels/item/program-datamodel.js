import CPR from "../../system/config.js";
import CPRSystemDataModel from "../system-data-model.js";
import CommonSchema from "./mixins/common-schema.js";
import EffectsSchema from "./mixins/effects-schema.js";
import InstallableSchema from "./mixins/installable-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";
import HpSchema from "../actor/components/hp-schema.js";

export default class ProgramDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  EffectsSchema,
  InstallableSchema,
  ValuableSchema
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      class: new fields.StringField({
        initial: "defender",
        choices: Object.keys(CPR.programClassList),
      }),
      blackIceType: new fields.StringField({
        initial: "antipersonnel",
        choices: Object.keys(CPR.blackIceType),
      }),
      prototypeActor: new fields.StringField({}),
      interface: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      isRezzed: new fields.BooleanField({ initial: false }),
      damage: new fields.SchemaField({
        standard: new fields.StringField({ initial: "1d6" }),
        blackIce: new fields.StringField({ initial: "" }),
      }),
      per: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      spd: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      atk: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      def: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      rez: new fields.SchemaField(HpSchema.defineSchema({ initial: 10 })),
    });
  }
}
