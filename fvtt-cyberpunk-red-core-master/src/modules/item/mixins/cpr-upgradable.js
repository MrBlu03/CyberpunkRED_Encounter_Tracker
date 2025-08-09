import CPR from "../../system/config.js";
import LOGGER from "../../utils/cpr-logger.js";

/**
 * If an item can ACCEPT upgrades (i.e. it has slots), then it should include this
 * mixin. This does not accommodate items that are upgrades.
 */
const Upgradable = function Upgradable() {
  /**
   * Given a data point that this upgrade improves, find out the type of upgrade and total up all
   * of the modifications being applied to it, and consider overrides. In some ways
   * this is a reimplementation of what Active Effects provides, returnign the "mode" and value.
   * We could not use AEs here because AE cannot modify other items, only actors. Do not confuse
   * this with the upgradeType property either, which controls what item types this upgrade is applicable for.
   *
   * @param {String} dataPoint - a stat/property/value that this upgrade modifies on the parent item
   * @returns {Object} upgradeData - an object with a key for "type" and "value" of the upgrade
   *
   */
  this.getTotalUpgradeValues = function getTotalUpgradeValues(dataPoint) {
    let upgradeNumber = 0;
    let baseOverride = -100000;
    const upgradeData = {
      type: "modifier",
      value: 0,
    };
    if (
      this.actor &&
      typeof this.system.isUpgraded === "boolean" &&
      this.system.isUpgraded
    ) {
      const { installedUpgrades } = this.system;
      installedUpgrades.forEach((upgrade) => {
        if (typeof upgrade.system.modifiers[dataPoint] !== "undefined") {
          const modType = upgrade.system.modifiers[dataPoint].type;
          const modValue = upgrade.system.modifiers[dataPoint].value;
          if (typeof modValue === "number" && modValue !== 0) {
            if (modType === "override") {
              baseOverride = modValue > baseOverride ? modValue : baseOverride;
            } else {
              upgradeNumber += modValue;
            }
          }
        }
      });
      if (baseOverride === 0 || baseOverride === -100000) {
        upgradeData.type = "modifier";
        upgradeData.value = upgradeNumber;
      } else {
        upgradeData.type = "override";
        upgradeData.value = baseOverride;
      }
    }
    return upgradeData;
  };

  /**
   * Given a data point, return an array of all modifications being applied to it. If one of the modifier types is
   * set to "override", use that value and ignore others (favoring the largest override).
   *
   * Note: We structure each object in the array similar to a CPRMod so that we can add these mods to rolls.
   *
   * @param {} dataPoint - a stat/property/value that this upgrade modifies on the parent item
   * @returns
   */
  this.getAllUpgradeMods = function getAllUpgradeMods(dataPoint) {
    const relevantUpgrades = [];
    if (
      this.actor &&
      typeof this.system.isUpgraded === "boolean" &&
      this.system.isUpgraded
    ) {
      // Get all installed upgrades.
      const { installedUpgrades } = this.system;

      // Get all installed upgrades of type override.
      const overrides = installedUpgrades.filter(
        (u) => u.system.modifiers[dataPoint]?.type === "override"
      );

      // Key and category are used to display what the bonus upgrades.
      // Currently the only applicable category is combat, but conceivably there could be others.
      let key;
      let category;
      switch (dataPoint) {
        case "attackmod":
          key = "bonuses.universalAttack";
          category = "combat";
          break;
        case "damage":
          key = "bonuses.universalDamage";
          category = "combat";
          break;
        default:
          break;
      }

      // If there is an override, create an CPRMod-like object out of the highest one.
      // Because upgrades can provide situational bonuses, we must add all of the following
      // information (id, source, key, category, changemode) for everything to look/function correctly in a roll dialog.
      if (overrides.length > 0) {
        overrides.sort(
          (a, b) =>
            b.system.modifiers[dataPoint].value -
            a.system.modifiers[dataPoint].value
        );
        const mod = overrides[0].system.modifiers[dataPoint];
        mod.id = `${overrides[0].name}-${key}-0`; // This should create a unique ID for the mod.
        mod.source = overrides[0].name; // Where the upgrade comes from.
        mod.key = key; // Datapoint being upgraded.
        mod.category = category; // Category of above key.
        mod.changeMode = CONST.ACTIVE_EFFECT_MODES.ADD; // const = 2. This comes from foundry.
        relevantUpgrades.push(mod);
      } else {
        installedUpgrades.forEach((u, index) => {
          if (u.system.modifiers[dataPoint]?.value > 0) {
            const mod = foundry.utils.duplicate(u.system.modifiers[dataPoint]);
            mod.id = `${u.name}-${key}-${index}`; // This should create a unique ID for the mod.
            mod.source = u.name; // Where the upgrade comes from.
            mod.key = key; // Datapoint being upgraded.
            mod.category = category; // Category of above key.
            mod.changeMode = CONST.ACTIVE_EFFECT_MODES.ADD; // const = 2. This comes from foundry.
            relevantUpgrades.push(mod);
          }
        });
      }
    }
    return relevantUpgrades;
  };
};

export default Upgradable;
