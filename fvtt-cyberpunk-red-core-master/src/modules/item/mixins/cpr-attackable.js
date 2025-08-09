import * as CPRRolls from "../../rolls/cpr-rolls.js";
import LOGGER from "../../utils/cpr-logger.js";
import Rules from "../../utils/cpr-rules.js";
import CPRMod from "../../rolls/cpr-modifiers.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

/**
 * The Attackable mixin is for items that can be attacked with, usually guns and
 * melee weapons. Since melee and ranged weapons are the same item type,
 * it makes sense to keep all weapon logic together in "Attackable."
 */
const Attackable = function Attackable() {
  /**
   * Dispatcher method for interacting with the attackable item. Most of these methods are implemented
   * in the Loadable mixin. Note that this cannot be implemented in the weapon item code because
   * cyberware can also be a "weapon."
   *
   * @async
   * @callback
   * @param {CPRActor} actor  - who is doing something with this weapon?
   * @param {*} actionAttributes - details from the event indicating what the actor is doing
   */
  this._weaponAction = async function _weaponAction(actor, actionAttributes) {
    const actionData = actionAttributes["data-action"].nodeValue;
    switch (actionData) {
      case "select-ammo":
        await this.load();
        break;
      case "reload-ammo":
        await this.reload();
        break;
      case "measure-dv":
        return this._setDvTable(actor, this.system.dvTable);
      default:
    }
    if (this.actor) {
      return this.actor.updateEmbeddedDocuments("Item", [
        { _id: this.id, system: this.system },
      ]);
    }
    return Promise.resolve();
  };

  /**
   * reduces the ammo count for this item after firing it
   *
   * @returns updated actor data
   */
  this.dischargeItem = function dischargeItem(cprRoll) {
    const discharged = this.bulletConsumption(cprRoll);
    LOGGER.debug(discharged);
    // don't go negative
    this.system.magazine.value = Math.max(
      this.system.magazine.value - discharged,
      0
    );
    return this.actor.updateEmbeddedDocuments("Item", [
      { _id: this.id, system: this.system },
    ]);
  };

  /**
   * Creates a CPRAttackRoll object for the item. Does not actually "roll" it.
   *
   * @param {String} type - type of attack (normal, suppressive, autofire, etc)
   * @param {CPRActor} actor - who is attacking?
   * @returns {CPRAttackRoll}
   */
  this._createAttackRoll = function _createAttackRoll(type, actor) {
    const cprWeaponData = this.system;
    const weaponName = this.name;
    const { weaponType } = cprWeaponData;
    let skillItem = actor.items.find(
      (i) => i.name === cprWeaponData.weaponSkill
    );

    if (
      type === CPRRolls.rollTypes.SUPPRESSIVE ||
      type === CPRRolls.rollTypes.AUTOFIRE
    ) {
      skillItem = actor.items.find((i) => i.name === "Autofire");
      if (!cprWeaponData.fireModes.suppressiveFire) {
        if (
          cprWeaponData.weaponType !== "smg" &&
          cprWeaponData.weaponType !== "heavySmg" &&
          cprWeaponData.weaponType !== "assaultRifle"
        ) {
          Rules.lawyer(false, "CPR.messages.weaponDoesntSupportAltMode");
        }
      }
    }
    const skillName = skillItem.name;
    const skillValue = actor.getSkillLevel(skillName);

    let statName;
    if (cprWeaponData.isRanged && cprWeaponData.weaponType !== "thrownWeapon") {
      statName = "ref";
    } else {
      statName = "dex";
    }
    const niceStatName = SystemUtils.Localize(`CPR.global.stats.${statName}`);
    const statValue = actor.getStat(statName);

    let roleMods = [];
    // Get all mods for skills from role abilities and subRole abilities
    actor.itemTypes.role.forEach((r) => {
      roleMods = roleMods.concat(r.getRoleMods(skillName));
    });
    // Get all mods for attack bonuses directly from role abilities (not indirectly from skills)
    actor.itemTypes.role.forEach((r) => {
      roleMods = roleMods.concat(r.getRoleMods("attack", true));
    });
    roleMods = roleMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault)
    );

    const fumbleRecovery = actor.itemTypes.role.reduce((rr, role) => {
      return (
        rr ||
        role.getRoleMods("fumbleRecovery", true).reduce((rm, mod) => {
          return rm || mod.value >= 1;
        }, false)
      );
    }, false);

    const effects = Array.from(actor.allApplicableEffects()); // Active effects on the actor.
    const allMods = CPRMod.getAllModifiers(effects); // Effects list converted into CPRMods.
    // Filter for mods that should always be on (not situational) or are situational but on by default.
    const filteredMods = allMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault)
    );

    const skillMods = CPRMod.getRelevantMods(filteredMods, [
      SystemUtils.slugify(skillName),
      `${SystemUtils.slugify(skillName)}Hearing`,
      `${SystemUtils.slugify(skillName)}Sight`,
    ]);

    const attackMods = CPRMod.getRelevantMods(filteredMods, "universalAttack");
    const aimedShotMods = CPRMod.getRelevantMods(filteredMods, "aimedShot");
    const rangedMods = CPRMod.getRelevantMods(filteredMods, "ranged");
    const meleeMods = CPRMod.getRelevantMods(filteredMods, "melee");
    const autofireMods = CPRMod.getRelevantMods(filteredMods, "autofire");
    const suppressiveMods = CPRMod.getRelevantMods(filteredMods, "suppressive");
    const singleShotMods = CPRMod.getRelevantMods(filteredMods, "singleShot");
    // Mods that affect all actions.
    const allActionsMods = CPRMod.getRelevantMods(filteredMods, [
      "allActions",
      "allActionsSpeech",
      "allActionsHands",
    ]);

    let cprRoll;
    // Create the roll based on the type and apply relevant mods to it.
    switch (type) {
      case CPRRolls.rollTypes.AIMED: {
        cprRoll = new CPRRolls.CPRAimedAttackRoll(
          weaponName,
          niceStatName,
          statValue,
          skillName,
          skillValue,
          weaponType
        );
        cprRoll.addMod(aimedShotMods);
        if (cprWeaponData.isRanged) {
          cprRoll.addMod(rangedMods);
        } else {
          cprRoll.addMod(meleeMods);
        }
        break;
      }
      case CPRRolls.rollTypes.AUTOFIRE: {
        cprRoll = new CPRRolls.CPRAutofireRoll(
          weaponName,
          niceStatName,
          statValue,
          skillName,
          skillValue,
          weaponType
        );
        cprRoll.addMod(autofireMods);
        cprRoll.addMod(rangedMods);
        break;
      }
      case CPRRolls.rollTypes.SUPPRESSIVE: {
        cprRoll = new CPRRolls.CPRSuppressiveFireRoll(
          weaponName,
          niceStatName,
          statValue,
          skillName,
          skillValue,
          weaponType
        );
        cprRoll.addMod(suppressiveMods);
        cprRoll.addMod(rangedMods);
        break;
      }
      default:
        cprRoll = new CPRRolls.CPRAttackRoll(
          weaponName,
          niceStatName,
          statValue,
          skillName,
          skillValue,
          weaponType
        );
        if (cprWeaponData.isRanged) {
          cprRoll.addMod(singleShotMods);
          cprRoll.addMod(rangedMods);
        } else {
          cprRoll.addMod(meleeMods);
        }
    }

    // apply other known mods
    cprRoll.addMod([
      {
        value: actor.getArmorPenaltyMods(statName),
        source: SystemUtils.Format("CPR.rolls.modifiers.sources.armorPenalty", {
          stat: niceStatName,
        }),
      },
    ]);
    cprRoll.addMod([
      {
        value: actor.getWoundStateMods(),
        source: SystemUtils.Localize(
          "CPR.rolls.modifiers.sources.woundStatePenalty"
        ),
      },
    ]);
    cprRoll.addMod(skillMods);
    cprRoll.addMod(attackMods);
    cprRoll.addMod(roleMods);
    cprRoll.addMod(allActionsMods);

    // Mod from item upgrades that affect attackmod.
    const relevantUpgradeMods = this.getAllUpgradeMods("attackmod").filter(
      (m) => (m.isSituational && m.onByDefault) || !m.isSituational
    );
    cprRoll.addMod(relevantUpgradeMods);

    // Mod from weapon attackmod. We will only add it if there are no upgrade mods that override this value.
    if (
      relevantUpgradeMods.length === 0 ||
      relevantUpgradeMods.some((m) => !(m.type === "override"))
    ) {
      // CPRMod-like object.
      cprRoll.addMod([
        {
          value: cprWeaponData.attackmod,
          source: this.name,
          category: "combat",
          key: "bonuses.universalAttack",
        },
      ]);
    }

    if (fumbleRecovery >= 1) {
      cprRoll.wasCritical = cprRoll.wasCritSuccess;
    }

    if (cprRoll instanceof CPRRolls.CPRAttackRoll && cprWeaponData.isRanged) {
      Rules.lawyer(
        this.hasAmmo(cprRoll),
        "CPR.messages.weaponAttackOutOfBullets"
      );
    }
    return cprRoll;
  };

  /**
   * Creates a CPRDamageRoll object for the item. Does not actually "roll" it.
   *
   * @param {String} type - type of attack (autofire, etc)
   * @returns {CPRDamageRoll}
   */
  this._createDamageRoll = function _createDamageRoll(type, actor) {
    const cprWeaponData = this.system;
    const rollName = this.name;
    const { weaponType } = cprWeaponData;
    const damage = this.getWeaponDamage();

    const cprRoll = new CPRRolls.CPRDamageRoll(rollName, damage, weaponType);
    if (
      cprWeaponData.fireModes.autoFire === 0 &&
      (cprWeaponData.weaponType === "smg" ||
        cprWeaponData.weaponType === "heavySmg" ||
        cprWeaponData.weaponType === "assaultRifle")
    ) {
      cprWeaponData.fireModes.autoFire =
        cprWeaponData.weaponType === "assaultRifle" ? 4 : 3;
    }

    const autofireOverride = this._getLoadedAmmoProp("overrides")?.autofire;
    cprRoll.configureAutofire(
      1,
      cprWeaponData.fireModes.autoFire,
      autofireOverride
    );

    switch (type) {
      case CPRRolls.rollTypes.AIMED: {
        cprRoll.isAimed = true;
        cprRoll.location = "head";
        break;
      }
      case CPRRolls.rollTypes.AUTOFIRE: {
        cprRoll.setAutofire();
        break;
      }
      default:
    }

    // Assume all melee weapons and ranged weapons with no ammo deal 1 ablation if they damage a target.
    cprRoll.rollCardExtraArgs.ablationValue = 1;

    // If weapon is ranged, feed ammo type and variety into the rollCard arguments for the damage application button.
    // This will reassign the ablation value from the ammo.
    if (cprWeaponData.isRanged) {
      const ammoType = this._getLoadedAmmoProp("type");
      const ammoVariety = this._getLoadedAmmoProp("variety");
      const ablationValue = this._getLoadedAmmoProp("ablationValue");
      if (ammoType !== undefined) {
        cprRoll.rollCardExtraArgs.ammoType = ammoType;
      }
      if (ammoVariety !== undefined) {
        cprRoll.rollCardExtraArgs.ammoVariety = ammoVariety;
      }
      if (ablationValue !== undefined) {
        cprRoll.rollCardExtraArgs.ablationValue = ablationValue;
      }
    }

    cprRoll.rollCardExtraArgs.ignoreArmorPercent =
      cprWeaponData.ignoreArmorPercent;

    cprRoll.rollCardExtraArgs.ignoreBelowSP = cprWeaponData.ignoreBelowSP;

    // Get all mods for universal damage bonuses from role abilities.
    let roleMods = [];
    actor.itemTypes.role.forEach((r) => {
      roleMods = roleMods.concat(r.getRoleMods("damage", true));
    });
    roleMods = roleMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault)
    );
    cprRoll.addMod(roleMods);

    // Mod from item upgrades that affect damage.
    const relevantUpgradeMods = this.getAllUpgradeMods("damage").filter(
      (m) => (m.isSituational && m.onByDefault) || !m.isSituational
    );

    // If there are no mods of type "override", add the mods. Otherwise, set roll formula appropriately.
    if (relevantUpgradeMods.length > 0) {
      if (relevantUpgradeMods.some((m) => !(m.type === "override"))) {
        cprRoll.addMod(relevantUpgradeMods);
      } else {
        cprRoll.formula = "0d6";
      }
    }

    const effects = Array.from(actor.allApplicableEffects()); // Active effects on the actor.
    const allMods = CPRMod.getAllModifiers(effects); // Effects list converted into CPRMods.
    // Filter for mods that should always be on (not situational) or are situational but on by default.
    const filteredMods = allMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault)
    );

    const damageMods = CPRMod.getRelevantMods(filteredMods, "universalDamage");
    cprRoll.addMod(damageMods);
    return cprRoll;
  };

  /**
   * Calculates the damage for a weapon. For unarmed or martial arts damage rolls, calculate based on the body stat.
   * For ranged weapons, factor in if the ammo overrides the weapon's base damage.
   *
   * @returns {String} - Damage formula in the form of `Xd6`.
   */
  this.getWeaponDamage = function _getWeaponDamage() {
    let { damage } = this.system;
    const { weaponType } = this.system;
    if (
      (weaponType === "unarmed" || weaponType === "martialArts") &&
      this.system.unarmedAutomaticCalculation
    ) {
      // calculate damage based on BODY stat
      const cprActorData = this.actor.system;
      const actorBodyStat = cprActorData.stats.body.value;
      if (actorBodyStat <= 4) {
        if (
          weaponType === "unarmed" &&
          this.actor.itemTypes.cyberware.some(
            (c) =>
              c.system.type === "cyberArm" &&
              c.system.isInstalled === true &&
              c.system.isFoundational === true
          )
        ) {
          // If the user has an installed Cyberarm, which is a foundational. This is only for unarmed damage, not martial arts damage.
          damage = "2d6";
        } else {
          damage = "1d6";
        }
      } else if (actorBodyStat <= 6) {
        damage = "2d6";
      } else if (actorBodyStat <= 10) {
        damage = "3d6";
      } else {
        damage = "4d6";
      }
    }

    const damageOverride = this._getLoadedAmmoProp("overrides")?.damage; // Get damage override information.
    if (damageOverride?.mode === "set") {
      damage = damageOverride.value; // If mode is "set", then set the value.
    } else if (damageOverride?.mode === "modify") {
      // If mode is "modify",
      const overrideDiceMod = damageOverride.value.match(/(\+|-)?[0-9]+/); // Get the override's number of dice (and math operator)
      const overrideResultMod =
        damageOverride.value.match(/d6\s*((\+|-)[0-9])/); // Get the override's +X or -X from the end of the formula (e.g. 2d6 +4)
      if (!overrideDiceMod) {
        return SystemUtils.DisplayMessage(
          "warn",
          `This ammo's damage override has an invalid value (${damageOverride.value}). Check the ammo's settings.`
        );
      }
      const currentDamageDie = damage.match(/[0-9]+/); // Get current damage's number of dice.
      const currentDamageResultMod = damage.match(/d6\s*((\+|-)[0-9])/); // Get current damage's +X or -X from the end of the formula.
      const newDamage =
        // Add current damage dice and override's damage dice.
        Number.parseInt(currentDamageDie[0], 10) +
        Number.parseInt(overrideDiceMod[0], 10);
      const minimumDamage = Number.parseInt(
        damageOverride.minimum.match(/[0-9]+/),
        10
      );
      if (newDamage <= minimumDamage) {
        damage = damageOverride.minimum;
      } else {
        damage = `${newDamage}d6`;
      }
      if (overrideResultMod) {
        damage += overrideResultMod[1]; // Re-add override's +X or -X from end of formula.
      }
      if (currentDamageResultMod) {
        damage += currentDamageResultMod[1]; // Re-add current damage's +X or -X from the end of formula.
      }
    }

    return damage;
  };

  /**
   * Get mods to the attack roll from upgrades. You might think this could be removed in favor of
   * active effects, but alas, we cannot. Active Effects can only affect the item it is on, or
   * the actors that own said item. (or actors themselves). An AE cannot by applied to a different
   * item. In other words, an itemUpgrade cannot provide an AE that affects the item it is installed
   * into. Therefore, we have to use this attackmod property instead.
   *
   * @returns {Number}
   */
  this._getAttackMod = function _getAttackMod() {
    const cprWeaponData = this.system;
    let returnValue = 0;
    if (typeof cprWeaponData.attackmod !== "undefined") {
      returnValue = cprWeaponData.attackmod;
    }
    const upgradeData = this.getTotalUpgradeValues("attackmod");
    returnValue =
      upgradeData.type === "override"
        ? upgradeData.value
        : returnValue + upgradeData.value;
    return returnValue;
  };
};

export default Attackable;
