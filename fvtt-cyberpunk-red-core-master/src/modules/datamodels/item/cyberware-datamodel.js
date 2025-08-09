import LOGGER from "../../utils/cpr-logger.js";
import CPR from "../../system/config.js";
import CPRSystemDataModel from "../system-data-model.js";
import AttackableSchema from "./mixins/attackable-schema.js";
import CommonSchema from "./mixins/common-schema.js";
import ContainerSchema from "../shared/container-schema.js";
import EffectsSchema from "./mixins/effects-schema.js";
import ElectronicSchema from "./mixins/electronic-schema.js";
import InstallableSchema from "./mixins/installable-schema.js";
import LoadableSchema from "./mixins/loadable-schema.js";
import PhysicalSchema from "./mixins/physical-schema.js";
import UpgradableSchema from "./mixins/upgradable-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class CyberwareDataModel extends CPRSystemDataModel.mixin(
  AttackableSchema,
  CommonSchema,
  ContainerSchema,
  EffectsSchema,
  ElectronicSchema,
  InstallableSchema,
  LoadableSchema,
  PhysicalSchema,
  UpgradableSchema,
  ValuableSchema
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(
      super.defineSchema({
        initialAllowedTypes: ["cyberware", "itemUpgrade"],
        isElectronic: true,
      }),
      {
        type: new fields.StringField({
          initial: "cyberArm",
          choices: Object.keys(CPR.cyberwareTypes),
        }),
        isWeapon: new fields.BooleanField({ initial: false }),
        isFoundational: new fields.BooleanField({ initial: true }),
        core: new fields.BooleanField({ initial: false }),
        humanityLoss: new fields.SchemaField({
          static: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 3,
            min: 0,
          }),
          roll: new fields.StringField({ initial: "1d6" }),
        }),
      }
    );
  }

  /**
   * This getter returns whether or not the cyberware item is installed in an actor,
   * no matter how many layers it is nested. This is important for calculating max humanity
   * and displaying cyberweapons on the fight tab. Previously we would only check if the
   * cyberware was installed, not whether it was installed within an actor.
   *
   * NOTE: This getter is only applicable to embedded cyberware items (items that are on an actor)
   * @returns {Boolean} - whether or not the top-level parent is installed in an actor.
   */
  get isInstalledInActor() {
    function getTopLevelParentItem(childItem) {
      const { actor } = childItem;
      const parentItem = actor.items.get(childItem.system.installedIn[0]);
      if (!parentItem) return childItem;
      return getTopLevelParentItem(parentItem);
    }

    const item = this.parent;
    if (!item.isEmbedded)
      return LOGGER.debug(
        "Don't call this for world items. This getter should only be called on actor items."
      );
    const topLevelItem = getTopLevelParentItem(item);
    return topLevelItem.system.isInstalled;
  }
}
