// eslint-disable-next-line max-classes-per-file
import CPR from "../../system/config.js";
import CPRSystemDataModel from "../system-data-model.js";
import CommonSchema from "./mixins/common-schema.js";
import RoleAbilitySchema from "./components/role-ability-schema.js";

export default class RoleDataModel extends CPRSystemDataModel.mixin(
  CommonSchema
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      rank: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      mainRoleAbility: new fields.StringField({ initial: "", blank: true }),
      hasRoll: new fields.BooleanField({ initial: false }),
      addRoleAbilityRank: new fields.BooleanField({ initial: false }),
      stat: new fields.StringField({
        initial: "--",
        choices: ["--", ...Object.keys(CPR.statList)],
      }),
      // Create a function for skill choices?
      skill: new fields.StringField({
        initial: "--",
      }),
      bonuses: new fields.ArrayField(new fields.ObjectField()),
      universalBonuses: new fields.ArrayField(
        new fields.StringField({ choices: Object.keys(CPR.universalBonuses) })
      ),
      bonusRatio: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 1,
      }),
      abilities: new fields.ArrayField(
        new fields.EmbeddedDataField(RoleAbilitySchema)
      ),
      isSituational: new fields.BooleanField({ initial: false }),
      onByDefault: new fields.BooleanField({ initial: false }),
    });
  }

  /**
   * Make sure that role abilities are sorted by name.
   *
   * @param {RoleDataModel} source - The data model for roles
   * @returns {RoleDataModel} - the migrated role data model
   */
  static migrateData(source) {
    if (source.abilities) {
      source.abilities.sort((a, b) => (a.name > b.name ? 1 : -1));
    }
    return super.migrateData(source);
  }
}
