import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRSystemDataModel from "../system-data-model.js";

/**
 * Container Schema are shared between Actors and Items
 */
export default class ContainerSchema extends CPRSystemDataModel {
  static mixinName = "container";

  /**
   * NOTE: This schema mixin refers to `document.system.installedItems`. It has nothing to do with the
   * Container Actor type. In fact, Container Actors do not mix in this schema into their data model at all, because
   * Container actors never actually have items installed in them directly.
   *
   * This ContainerSchema mixin is shared by both items and actors, but there are slight differences for each.
   * First, actors do not have the `installedItems.slots` or `installedItems.usedSlots` property.
   * Second, the default for actor `installedItems.allowedTypes` is `["cyberware"]` and for items its `["itemUpgrade"]`.
   *
   * `ContainerSchema.defineSchema()` defaults as though an item is calling it / mixing it in, since that is more common in the code.
   * If an actor needs to mix it in, one must pass an options object: `{initialAllowedTypes: ["cyberware"], includeSlots: false}`.
   * See `mook-datamodel.js` or `character-datamodel.js` to see how this is done.
   *
   * @param {Object} - options for configuring the schema. Can be overridden in the class that calls this as a mixin.
   *   @prop {Array<String>} options.initialAllowedTypes - initial array for allowed types, different for Actors and Items.
   *   @prop {Boolean} options.includeSlots - Items include slot data and actors dont. Set true by default since there are more
   *   @prop {Number} options.initialSlots - How many slots this item should start with.
   *      items than actors that mixin the Container Schema.
   * @returns {SchemaField}
   */
  static defineSchema({
    initialAllowedTypes = ["itemUpgrade"],
    includeSlots = true,
    initialSlots = 3,
  } = {}) {
    const { fields } = foundry.data;

    const baseSchema = {
      allowed: new fields.BooleanField({ initial: true }),
      allowedTypes: new fields.ArrayField(
        // Can this be blank?
        new fields.StringField({
          required: true,
          blank: true,
          choices: SystemUtils.getDocTypesFromMixin("installable"),
        }),
        { initial: initialAllowedTypes }
      ),
      list: new fields.ArrayField(
        new fields.DocumentIdField({ required: true }),
        { initial: [] }
      ),
    };
    const slotsSchema = {
      usedSlots: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      slots: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: initialSlots || 3,
        min: 0,
      }),
    };

    const finalSchema = includeSlots
      ? { ...baseSchema, ...slotsSchema }
      : baseSchema;
    return { installedItems: new fields.SchemaField(finalSchema) };
  }

  /**
   * Migrates data on the fly. From Foundry.
   *
   * Convert UUIDs into regular IDs and make sure there are no duplicates.
   *
   * @override
   * @param {CPRSystemDataModel} source - source actor or item `document.system`
   * @returns {CPRSystemDataModel} - migrated data
   */
  static migrateData(source) {
    const { installedItems } = source;
    if (installedItems?.list?.length > 0) {
      // Ensure that this list never has duplicates.
      installedItems.list = Array.from(new Set(installedItems.list));
    }
    return super.migrateData(source);
  }

  get hasInstalled() {
    return this.parent.system.installedItems?.list.length > 0;
  }
}
