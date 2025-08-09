import CPR from "../../system/config.js";
import CPRSystemDataModel from "../system-data-model.js";
import CommonSchema from "./mixins/common-schema.js";
import EffectsSchema from "./mixins/effects-schema.js";

export default class CriticalInjuryDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  EffectsSchema
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      location: new fields.StringField({
        initial: "body",
        choices: Object.keys(CPR.criticalInjuryLocation),
      }),
      quickFix: new fields.SchemaField({
        type: new fields.StringField({
          initial: "firstAidParamedic",
          choices: Object.keys(CPR.criticalInjuryQuickFix),
        }),
        dvFirstAid: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
        dvParamedic: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
      }),
      treatment: new fields.SchemaField({
        type: new fields.StringField({
          initial: "paramedicSurgery",
          choices: Object.keys(CPR.criticalInjuryTreatment),
        }),
        dvParamedic: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
        dvSurgery: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
      }),
      deathSaveIncrease: new fields.BooleanField({
        initial: false,
      }),
    });
  }
}
