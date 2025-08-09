/* eslint-disable max-classes-per-file */

import CPR from "../system/config.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

export default class CPRMod {
  /**
   *
   * @param {ActiveEffect} effect - Active Effect from an actor directly, or indirectly from an item.
   * @param {Object} change - individual change (read: modifier) on above Active Effect.
   * @constructor
   */
  constructor(effect, change) {
    const index = effect.changes.indexOf(change); // Index of change on the effect.
    // We do optional chaining on the next few because some items may not have flags.${game.system.id}.situational or .cats defined.
    this.category = effect.flags[game.system.id].changes.cats?.[index]; // Category of the change. This comes from Zyzyx's work.
    // New flag to determine if the mod is situational or permanent. If it's situational, should it be on by default?
    this.isSituational =
      effect.flags[game.system.id].changes.situational?.[index].isSituational;
    // If it's situational, should it be on by default?
    this.onByDefault =
      effect.flags[game.system.id].changes.situational?.[index].onByDefault; // S
    this.id = `${change.key}-${effect.id}`; // We enforce one change key per effect, so this should always be a unique ID.
    this.source = effect.name;
    this.value = Number.parseInt(change.value, 10);
    this.key = change.key;
    this.changeMode = change.mode; // Right now, only ADD (const = 2) is supported. Change modes come from Foundry)
  }

  /**
   * Convert each Change on each (non-disabled) Effect into a CPRMod and then return a list of those CPRMod objects.
   *
   * @param {Array<ActiveEffect>} effects - An array of ActiveEffects
   * @param {Boolean} getDisabled - Boolean whether or not to consider disabled effects. Default false.
   * @return {Array<CPRMod>}
   */
  static getAllModifiers(effects, getDisabled = false) {
    const allModifiers = [];
    effects.forEach((effect) => {
      // Ignore suppressed/disabled effects, unless getDisabled = true. In that case, get all.
      if ((!effect.system.isSuppressed && !effect.disabled) || getDisabled) {
        effect.changes.forEach((change, index) => {
          const mod = new CPRMod(effect, change, index);
          allModifiers.push(mod);
        });
      }
    });
    return allModifiers;
  }

  /**
   * Get a list of relevant mods to a specific roll, based on a bonus's key.
   *
   * @param {Array<CPRMod>} modifiers - An array of CPRMods.
   * @param {String} key - String with an effect key to filter the array.
   * @return {Array<CPRMod>} - Array of mods filtered for a specific key.
   */
  static getRelevantMods(modifiers, key) {
    let relevantMods = [];
    if (Array.isArray(key)) {
      relevantMods = modifiers.filter((m) => {
        const strippedKey = m.key.replace("bonuses.", "");
        return key.includes(strippedKey);
      });
    } else {
      relevantMods = modifiers.filter((m) => m.key === `bonuses.${key}`);
    }

    return relevantMods;
  }

  /**
   * Get all mods that are situational for the roll dialog.
   *
   * @param {CPRRoll} rollData - CPRRoll object
   * @param {Array<ActiveEffect>} effects - An array of ActiveEffects on the actor that triggered the roll.
   * @param {CPRItem} item - CPRItem that the roll came from.
   * @param {CPRActor} actor - CPRActor that the roll came from.
   * @return {Array<CPRMod>} - Array of mods filtered to be applicable for a specific type of roll.
   */
  static getSituationalRollMods(rollData, effects, item, actor) {
    const prototypeChain = SystemUtils.getPrototypeChain(rollData);

    // Get effects relevant to the roll.
    const allSituationalMods = CPRMod.getAllModifiers(effects).filter(
      (m) => m.isSituational
    );
    let filteredMods = [];

    // Global mods.
    if (
      !prototypeChain.includes("CPRDeathSaveRoll") &&
      !prototypeChain.includes("CPRDamageRoll") &&
      !prototypeChain.includes("CPRInitiativeRoll")
    ) {
      const globalMods = allSituationalMods.filter((m) =>
        [
          "bonuses.allActions",
          "bonuses.allActionsSpeech",
          "bonuses.allActionsHands",
        ].includes(m.key)
      );
      filteredMods = filteredMods.concat(globalMods);
    }

    // Stat mods. (This should either not be included or refactored, since the bonus is already applied via the native active effects.)
    /*     if ((prototypeChain.includes("CPRStatRoll") || prototypeChain.includes("CPRRoleRoll")) && !prototypeChain.includes("CPRInterfaceRoll")) {
      const statMods = allSituationalMods.filter((m) => m.key === `system.stats.${rollData.statName.toLowerCase()}.value`);
      filteredMods = filteredMods.concat(statMods);
    } */

    // Skill mods.
    if (
      (prototypeChain.includes("CPRSkillRoll") ||
        prototypeChain.includes("CPRRoleRoll")) &&
      !prototypeChain.includes("CPRInterfaceRoll")
    ) {
      const skillMods = allSituationalMods.filter((m) =>
        [
          `bonuses.${SystemUtils.slugify(rollData.skillName)}`,
          `bonuses.${SystemUtils.slugify(rollData.skillName)}Hearing`,
          `bonuses.${SystemUtils.slugify(rollData.skillName)}Sight`,
        ].includes(m.key)
      );
      filteredMods = filteredMods.concat(skillMods);

      // Skill mods from role bonuses.
      let roleMods = [];
      actor.itemTypes.role.forEach((r) => {
        roleMods = roleMods.concat(r.getRoleMods(rollData.skillName));
      });
      roleMods = roleMods.filter((m) => m.isSituational);
      filteredMods = filteredMods.concat(roleMods);
    }

    // Initiative Mods.
    if (prototypeChain.includes("CPRInitiative")) {
      const initiativeMods = allSituationalMods.filter(
        (m) => m.key === `bonuses.initiative`
      );
      filteredMods = filteredMods.concat(initiativeMods);

      // Initiative mods from role bonuses.
      let roleMods = [];
      actor.itemTypes.role.forEach((r) => {
        roleMods = roleMods.concat(r.getRoleMods("initiative", true));
      });
      roleMods = roleMods.filter((m) => m.isSituational);
      filteredMods = filteredMods.concat(roleMods);
    }

    // Attack mods.
    if (prototypeChain.includes("CPRAttackRoll")) {
      const attackRollBonusKeys = ["bonuses.universalAttack"];

      if (item.system.isRanged) {
        attackRollBonusKeys.push("bonuses.ranged");
      } else {
        attackRollBonusKeys.push("bonuses.melee");
      }

      if (prototypeChain[0] === "CPRAttackRoll") {
        attackRollBonusKeys.push("bonuses.singleShot");
      } else if (prototypeChain.includes("CPRAimedAttackRoll")) {
        attackRollBonusKeys.push("bonuses.singleShot");
        attackRollBonusKeys.push("bonuses.aimedShot");
      } else if (prototypeChain.includes("CPRAutofireRoll")) {
        /* The autofire key can be used by both combat and skill checks.
           It's the only key that's used twice therefore we need to ensure
           it's only added onece. This check only adds the autofire mod if
           it hasn't been added as a skillmod already.
        */
        if (!filteredMods.find((m) => m.key === "bonuses.autofire")) {
          attackRollBonusKeys.push("bonuses.autofire");
        }
      } else if (prototypeChain.includes("CPRSuppressiveFireRoll")) {
        attackRollBonusKeys.push("bonuses.suppressive");
      }
      const attackMods = allSituationalMods.filter((m) =>
        attackRollBonusKeys.includes(m.key)
      );

      // Attack mods from upgrades.
      const upgradeMods = item
        .getAllUpgradeMods("attackmod")
        .filter((m) => m.isSituational);
      filteredMods = filteredMods.concat(attackMods).concat(upgradeMods);

      // Attack mods from role bonuses.
      let roleMods = [];
      actor.itemTypes.role.forEach((r) => {
        roleMods = roleMods.concat(r.getRoleMods("attack", true));
      });
      roleMods = roleMods.filter((m) => m.isSituational);
      filteredMods = filteredMods.concat(roleMods);
    }

    // Damage Mods.
    if (prototypeChain.includes("CPRDamageRoll")) {
      const damageMods = allSituationalMods.filter(
        (m) => m.key === `bonuses.universalDamage`
      );

      // Damage mods from upgrades.
      if (item) {
        const upgradeMods = item
          .getAllUpgradeMods("damage")
          .filter((m) => m.isSituational);
        filteredMods = filteredMods.concat(damageMods).concat(upgradeMods);
      }

      // Damage mods from role bonuses.
      let roleMods = [];
      actor.itemTypes.role.forEach((r) => {
        roleMods = roleMods.concat(r.getRoleMods("damage", true));
      });
      roleMods = roleMods.filter((m) => m.isSituational);
      filteredMods = filteredMods.concat(roleMods);
    }

    // Role Mods.
    if (prototypeChain.includes("CPRRoleRoll")) {
      const roleMods = allSituationalMods.filter(
        (m) => m.key === `bonuses.${SystemUtils.slugify(rollData.roleName)}`
      );
      filteredMods = filteredMods.concat(roleMods);
    }

    // Netrunner Mods.
    if (prototypeChain.includes("CPRInterfaceRoll")) {
      let netrunnerMods = allSituationalMods.filter(
        (m) => m.key === `bonuses.${rollData.ability}`
      );

      // Zap is an attack, so we need to add relevant attack bonuses to it.
      if (rollData.ability === "zap") {
        netrunnerMods = netrunnerMods.concat(
          allSituationalMods.filter(
            (m) =>
              m.key === "bonuses.attack" || m.key === "bonuses.universalAttack"
          )
        );
      }

      // Bonus to all attacks, meat or net.
      if (rollData.ability === "attack") {
        netrunnerMods = netrunnerMods.concat(
          allSituationalMods.filter((m) => m.key === "bonuses.universalAttack")
        );
      }

      filteredMods = filteredMods.concat(netrunnerMods);
    }

    // Death Save Mods.
    if (prototypeChain.includes("CPRDeathSaveRoll")) {
      const deathSavePenaltyMods = allSituationalMods.filter(
        (m) => m.key === "bonuses.deathSavePenalty"
      );
      filteredMods = filteredMods.concat(deathSavePenaltyMods);
    }

    return filteredMods;
  }

  /**
   * Get default situational mods which appear in the core rule book on page 130.
   *
   * @return {Array<CPRMod-like-objects>} - Array of mods from config.js.
   */
  static getDefaultSituationalMods() {
    return Object.values(CPR.defaultSituationalMods);
  }
}
