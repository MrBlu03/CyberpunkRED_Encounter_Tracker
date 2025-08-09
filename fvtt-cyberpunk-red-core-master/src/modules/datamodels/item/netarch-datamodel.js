import CPRSystemDataModel from "../system-data-model.js";
import CommonSchema from "./mixins/common-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class NetArchDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  ValuableSchema
) {
  // Most of these should be moved to `config.js`
  // or converted into ints rather than int-like strings.
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      floors: new fields.ArrayField(
        new fields.SchemaField({
          blackice: new fields.StringField({
            choices: [
              "--",
              "CPR.netArchitecture.floor.options.blackIce.asp",
              "CPR.netArchitecture.floor.options.blackIce.giant",
              "CPR.netArchitecture.floor.options.blackIce.hellhound",
              "CPR.netArchitecture.floor.options.blackIce.kraken",
              "CPR.netArchitecture.floor.options.blackIce.liche",
              "CPR.netArchitecture.floor.options.blackIce.raven",
              "CPR.netArchitecture.floor.options.blackIce.scorpion",
              "CPR.netArchitecture.floor.options.blackIce.skunk",
              "CPR.netArchitecture.floor.options.blackIce.wisp",
              "CPR.netArchitecture.floor.options.blackIce.dragon",
              "CPR.netArchitecture.floor.options.blackIce.killer",
              "CPR.netArchitecture.floor.options.blackIce.sabertooth",
            ],
          }),
          branch: new fields.StringField({
            choices: ["a", "b", "c", "d", "e", "f", "g", "h"],
          }),
          content: new fields.StringField({
            choices: [
              "CPR.netArchitecture.floor.options.password",
              "CPR.netArchitecture.floor.options.file",
              "CPR.netArchitecture.floor.options.controlnode",
              "CPR.global.programClass.blackice",
            ],
          }),
          description: new fields.StringField({ blank: true }),
          dv: new fields.StringField({
            choices: [
              "N/A",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14",
              "15",
              "16",
              "17",
              "18",
              "19",
              "20",
            ],
          }),
          floor: new fields.StringField({
            choices: [
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14",
              "15",
              "16",
              "17",
              "18",
            ],
          }),
          index: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            min: 0,
          }),
        })
      ),
    });
  }
}
