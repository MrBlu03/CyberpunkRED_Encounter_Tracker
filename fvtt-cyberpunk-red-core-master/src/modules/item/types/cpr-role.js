import * as CPRRolls from "../../rolls/cpr-rolls.js";
import CPRItem from "../cpr-item.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRMod from "../../rolls/cpr-modifiers.js";

/**
 * Extend the CPRSkillItem object with things specific to character roles.
 *
 * @extends {CPRSkillItem}
 */
export default class CPRRoleItem extends CPRItem {
  /**
   * Create a CPRRole object appropriate for rolling an ability associated with this role
   *
   * @param {String} rollType - an identifier for the type of role roll being performed
   * @param {CPRCharacterActor} actor - the actor associated with this role item
   * @param {Object} rollInfo - magic object with more role configuration data
   * @returns {CPRRoll}
   */
  _createRoleRoll(rollType, actor, rollInfo) {
    const cprItemData = this.system;
    let roleName = cprItemData.mainRoleAbility;
    let statName = "--";
    let skillName = "--";
    let skillList;
    let roleValue = 0;
    let statValue = 0;
    let skillValue = 0;
    if (rollInfo.rollSubType === "mainRoleAbility") {
      if (cprItemData.addRoleAbilityRank) {
        roleValue = Number.parseInt(cprItemData.rank, 10);
      }
      if (cprItemData.stat !== "--") {
        statName = cprItemData.stat;
        statValue = actor.getStat(statName);
      }
      if (cprItemData.skill !== "--" && cprItemData.skill !== "varying") {
        skillName = cprItemData.skill;
        const skillObject = actor.itemTypes.skill.find(
          (i) => skillName === i.name
        );
        if (skillObject !== undefined) {
          skillValue = skillObject.system.level;
        } else {
          SystemUtils.DisplayMessage(
            "error",
            SystemUtils.Localize("CPR.noskillbythatname")
          );
        }
      } else if (cprItemData.skill === "varying") {
        skillName = "varying";
        if (cprItemData.stat !== "--") {
          skillList = actor.itemTypes.skill.filter(
            (s) => s.system.stat === cprItemData.stat
          );
        } else {
          skillList = actor.itemTypes.skill;
        }
      }
    }

    if (rollInfo.rollSubType === "subRoleAbility") {
      const subRoleAbility = cprItemData.abilities.find(
        (a) => a.name === rollInfo.subRoleName
      );
      roleName = subRoleAbility.name;
      roleValue = Number.parseInt(subRoleAbility.rank, 10);
      if (subRoleAbility.stat !== "--") {
        statName = subRoleAbility.stat;
        statValue = actor.getStat(statName);
      }
      if (subRoleAbility.skill !== "--" && subRoleAbility.skill !== "varying") {
        skillName = subRoleAbility.skill.name;
        const skillObject = actor.itemTypes.skill.find(
          (i) => skillName === i.name
        );
        if (skillObject !== undefined) {
          skillValue = skillObject.system.level;
        } else {
          SystemUtils.DisplayMessage(
            "error",
            SystemUtils.Localize("CPR.noskillbythatname")
          );
        }
      } else if (subRoleAbility.skill === "varying") {
        skillName = "varying";
        if (subRoleAbility.stat !== "--") {
          skillList = actor.itemTypes.skill.filter(
            (s) => s.system.stat === subRoleAbility.stat
          );
        } else {
          skillList = actor.itemTypes.skill;
        }
      }
    }

    const effects = Array.from(actor.allApplicableEffects());
    const allMods = CPRMod.getAllModifiers(effects);
    const filteredMods = allMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault)
    );

    const skillMods = CPRMod.getRelevantMods(filteredMods, [
      SystemUtils.slugify(skillName),
      `${SystemUtils.slugify(skillName)}Hearing`,
      `${SystemUtils.slugify(skillName)}Sight`,
    ]);
    const roleMods = CPRMod.getRelevantMods(
      filteredMods,
      SystemUtils.slugify(roleName)
    );

    // Mods that affect all actions.
    const allActionsMods = CPRMod.getRelevantMods(filteredMods, [
      "allActions",
      "allActionsSpeech",
      "allActionsHands",
    ]);

    const cprRoll = new CPRRolls.CPRRoleRoll(
      roleName,
      roleValue,
      skillName,
      skillValue,
      statName,
      statValue,
      skillList
    );
    cprRoll.addMod(skillMods); // add skill bonuses from Active Effects
    cprRoll.addMod(roleMods); // add role bonuses from Active Effects
    cprRoll.addMod(allActionsMods);
    cprRoll.addMod([
      {
        value: actor.getWoundStateMods(),
        source: SystemUtils.Localize(
          "CPR.rolls.modifiers.sources.woundStatePenalty"
        ),
      },
    ]);
    return cprRoll;
  }

  /**
   * Given the name of a bonus, look up the role and subRole bonuses and see if any should
   * be applied to the roll.
   *
   * @param {String} bonusName - name of the bonus to look for. Either a combat bonus or a skill bonus.
   * @param {Boolean} isUniversalBonus - differentiate between a skill bonus and a universal bonus (default false, meaning skill bonus).
   * @return {Array} - Array of CPRMod-like-objects for feeding into cprRoll.addMod().
   */
  getRoleMods(bonusName, isUniversalBonus = false) {
    // Assign correct key and category for skill bonuses.
    let key = `bonuses.${SystemUtils.slugify(bonusName)}`;
    let category = "skill";
    // If universal bonus, reassign key/category for universal bonuses.
    if (isUniversalBonus) {
      category = "combat";
      if (bonusName !== "initiative") {
        const capitalizedBonus =
          bonusName.charAt(0).toUpperCase() + bonusName.slice(1);
        key = `bonuses.universal${capitalizedBonus}`;
      }
    }

    // Key to use for lookup on the role object. Not to be confused with the key for the mod itself.
    const roleBonusKey = isUniversalBonus ? "universalBonuses" : "bonuses";

    const roleBonusArray = [];
    // Check whether the main ability has the applicable bonus/universal bonus.
    if (
      this.system[roleBonusKey].some(
        (b) => b.name === bonusName || b === bonusName
      )
    ) {
      const id = `${this.name}-${key}-${this.id}-main`; // Unique ID
      const value = Math.floor(this.system.rank / this.system.bonusRatio);
      const source = this.system.mainRoleAbility;
      const { isSituational } = this.system;
      const { onByDefault } = this.system;
      roleBonusArray.push({
        id,
        value,
        source,
        key,
        category,
        isSituational,
        onByDefault,
        changeMode: CONST.ACTIVE_EFFECT_MODES.ADD, // const = 2. This comes from foundry.
      });
    }
    // Check whether each sub ability has the applicable bonus/universal bonus.
    this.system.abilities.forEach((a, index) => {
      if (
        a?.[roleBonusKey].some((b) => b.name === bonusName || b === bonusName)
      ) {
        const id = `${a.name}-${key}-${this.id}-${index}`;
        const value = Math.floor(a.rank / a.bonusRatio);
        const source = a.name;
        const { isSituational } = a;
        const { onByDefault } = a;
        roleBonusArray.push({
          id,
          value,
          source,
          key,
          category,
          isSituational,
          onByDefault,
          changeMode: CONST.ACTIVE_EFFECT_MODES.ADD, // const = 2. This comes from foundry.
        });
      }
    });
    return roleBonusArray;
  }
}
