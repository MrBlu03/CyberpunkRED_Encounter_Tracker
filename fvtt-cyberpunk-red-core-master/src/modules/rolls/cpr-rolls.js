/* eslint-disable max-classes-per-file */
import LOGGER from "../utils/cpr-logger.js";
import DiceHandler from "../extern/cpr-dice-handler.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import * as CPRRollDialogs from "../dialog/cpr-roll-dialog.js";

/**
 * This is a generic CPR roll object. It builds in critical success and failure
 * mechanics on top of using the Foundry roll objects.
 */
export class CPRRoll {
  /**
   * See the property comments below for details. Note that after constructing the object
   * the roll() method still needs to be called to actually "roll."
   *
   * @constructor
   * @param {String} rollTitle - a name for the roll which is used in the roll card (chat message)
   * @param {String} formula - a string representing what should be rolled using Foundry roll logic
   */
  constructor(rollTitle, formula) {
    // (private) the resulting Roll() object from Foundry for intial roll
    this._roll = null;
    // (private) the resulting Roll() object from Foundry for critical roll
    this._critRoll = null;
    // (private) an array of mod objects to apply to the roll. The mod objects contain useful information about the mods themselves.
    this.mods = [];
    // User inputted mods that can be added in the roll dialogs just before the roll.
    this.additionalMods = [];
    // a name for the roll, used in the UI
    this.rollTitle = rollTitle || this.template;
    // Store the die type and it can be used when displaying on the rollcard
    this.die = null;
    // this assumes exactly 1 term, "XdY", which is passed to Foundry's Roll()
    // any +A or -B terms are converted to mods
    // Cast to lowercase to catch XdY and XDY
    this.formula = this._processFormula(formula.toLowerCase());
    // the values of each face after a roll
    this.faces = [];
    // the result of the roll before applying mods or critical effects
    this.initialRoll = 0;
    // the amount of luck used on this roll
    this.luck = 0;
    // skip rolling a critical die, such as with death saves
    this.calculateCritical = true;
    // if a critical die was rolled, this is the stored result
    this.criticalRoll = 0;
    // the complete result of the roll after applying everything
    this.resultTotal = 0;
    // path to the right dialog box to pop up before rolling
    this.rollPrompt = `systems/${game.system.id}/templates/dialog/rolls/cpr-base-verify-roll-prompt.hbs`;
    // path to the roll card template for chat
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-base-rollcard.hbs`;
    // Any additional data we want to pass to the roll card
    this.rollCardExtraArgs = [];
  }

  /**
   * In our roll object we separate out mods (+1, -2, etc) into a property. This is convenient for checking
   * for an applying critical events (success or failure) to the result.
   *
   * @param {String} formula - a string representing what should be rolled using Foundry roll logic
   * @returns {String} - the dice formula itself, in the form (XdY)
   */
  _processFormula(formula) {
    // If formula is just a number string, return that number.
    // This allows us to pass flat numbers as the roll formula, if a weapon or its ammo do flat damage.
    // See: "https://stackoverflow.com/questions/175739/how-can-i-check-if-a-string-is-a-valid-number"
    if (!Number.isNaN(+formula)) {
      return formula;
    }
    const dice = /[0-9][0-9]*d[0-9][0-9]*/;
    const die = /d[0-9][0-9]*/;
    // cut out the XdY term, leaving only + or - terms after
    let rollMods = formula.replace(dice, "");
    if (rollMods !== "") {
      rollMods = rollMods.replace("+", " +");
      rollMods = rollMods.replace("-", " -");
      // split remaining terms into an array, add to mods
      const modArray = rollMods.split(" ");
      modArray.forEach((mod) => {
        if (mod !== "") {
          this.addMod([
            {
              value: Number(mod),
              source: SystemUtils.Localize(
                "CPR.rolls.modifiers.sources.rollFormula"
              ),
            },
          ]);
        }
      });
    }

    [this.die] = formula.match(die);
    return formula.match(dice)[0];
  }

  /**
   * Apply a mod object to the roll. Any mod object needs to be composed of at least two entires: value and source.
   *
   * @param {Array<CPRMod-like-object>} modArray -
   *    - Array of CPRMod-like objects containing information for the modifier.
   *      - At minimum, a mod to be added here needs to be an object with
   *        the following entries: { value: number, source: "string" }.
   *      - CPRMods have the above information and more (see cpr-modifiers.js).
   */
  addMod(modArray) {
    if (Array.isArray(modArray)) {
      modArray.forEach((m) => {
        if (this.mods.find((mod) => m.id && mod.id === m.id)) {
          LOGGER.warn(
            "Mod already exists on the roll. Skipping addition of mod:",
            m
          );
          return;
        }
        if (m && m.value !== 0) this.mods.push(m);
      });
    } else {
      LOGGER.error(
        "Arg for addMod must be an Array of CPRMod-like objects. See argument:",
        modArray
      );
    }
  }

  /**
   * Remove a mod from the roll.
   *
   * @param {String} id - id of mod to remove
   */
  removeMod(id) {
    const modIndex = this.mods.findIndex((m) => m.id === id);
    this.mods.splice(modIndex, 1);
  }

  /**
   * Assuming there are mods for the roll, add them all up.
   *
   * @returns {Number} - the sum of the mods applied so far
   */
  totalMods() {
    let modTotal = 0;
    // Total up regular mods.
    this.mods.forEach((mod) => {
      modTotal += mod.value;
    });

    // Total up additional mods inputted by the user.
    this.additionalMods.forEach((value) => {
      const valueInt = value ? Number.parseInt(value, 10) : 0;
      modTotal += valueInt;
    });

    return this.mods.length > 0 || this.additionalMods.length > 0
      ? modTotal
      : 0;
  }

  /**
   * The most important method. Perform the roll and save the results to the CPRRoll object.
   * Because of the integration with DiceHandler, this is intentionally an async method.
   *
   * @async
   */
  async roll() {
    // calculate the initial roll
    this._roll = await new Roll(this.formula).evaluate();

    // eslint-disable-next-line no-use-before-define
    if (!(this instanceof CPRInitiative)) {
      await DiceHandler.handle3dDice(this._roll);
    }

    this.initialRoll = this._roll.total;
    this.resultTotal = this.initialRoll + this.totalMods();

    // Handle scenario where the "roll" was a static value
    if (this._roll.terms[0].formula !== String(this._roll.terms[0].total)) {
      this.faces = this._roll.terms[0].results.map((r) => r.result);
    } else {
      this.faces = [];
    }

    // check and consider criticals (min or max # on die)
    if (this.wasCritical() && this.calculateCritical) {
      this._critRoll = await new Roll(this.formula).evaluate();
      // eslint-disable-next-line no-use-before-define
      if (!(this instanceof CPRInitiative)) {
        await DiceHandler.handle3dDice(this._critRoll);
      }
      this.criticalRoll = this._critRoll.total;
    }
    this._computeResult();
  }

  /**
   * Simple method to compute the initial roll result plus mods and luck. This
   * does not take critical events into account.
   * Important: This MUST be called from roll()!
   *
   * @private
   * @returns {Number} - the results of a roll without considering critical events
   */
  _computeBase() {
    return this.initialRoll + this.totalMods() + this.luck;
  }

  /**
   * After rolling the initial die (d10) and handling critical events (like another
   * die roll to subtract another d10 for a crit fail), sum and save the results.
   *
   * @private
   */
  _computeResult() {
    this.resultTotal = this._computeBase();
    if (this.wasCritFail()) {
      this.resultTotal += -1 * this.criticalRoll;
    } else {
      this.resultTotal += this.criticalRoll;
    }
  }

  /**
   * Return a boolean indicating whether a critical event (fail or success) happened
   *
   * @returns {Boolean}
   */
  wasCritical() {
    // return true or false indicating if a roll was critical
    return this.wasCritFail() || this.wasCritSuccess();
  }

  /**
   * Return T/F whether a critical failure happened. This is separated out to be overridden
   * by child classes later on.
   *
   * @returns {Boolean}
   */
  wasCritFail() {
    return this.initialRoll === 1;
  }

  /**
   * Return T/F whether a critical success happened. This is separated out to be overridden
   * by child classes later on.
   *
   * @returns {Boolean}
   */
  wasCritSuccess() {
    return this.initialRoll === this._roll.terms[0].faces;
  }

  /**
   * Pop up the roll confirmation dialog box. This enables a player to confirm the stat, skill,
   * and any mods before making the roll.
   *
   * @param {} event - an object representing a click event
   * @returns {Boolean}
   */
  async handleRollDialog(event, actor, item) {
    // Handle skipping of the user verification step
    let skipDialog = event.ctrlKey || event.metaKey;
    if (event.type === "click") {
      const ctrlSetting = game.settings.get(
        game.system.id,
        "invertRollCtrlFunction"
      );
      skipDialog = ctrlSetting ? !skipDialog : skipDialog;
    }

    if (!skipDialog) {
      // We want to call the dialog from the right place.
      // There are two roll dialogs: RoleDialog and RoleRollDialog.
      // Depending on the type of the roll, we will choose one or the other.
      let DialogClass;
      switch (this.constructor) {
        // eslint-disable-next-line no-use-before-define
        case CPRRoleRoll:
          DialogClass = CPRRollDialogs.CPRRoleRollDialog;
          break;

        default:
          DialogClass = CPRRollDialogs.CPRRollDialog;
          break;
      }

      // Call the dialog. Catch and throw an error if the promise is not returned.
      const dialogData = await DialogClass.showDialog(this, actor, item).catch(
        (err) => LOGGER.debug(err)
      );
      if (dialogData === undefined) {
        // returns false if the dialog was closed
        return false;
      }
      foundry.utils.mergeObject(this, dialogData, { overwrite: true });
    }
    return true;
  }
}

/**
 * Initiative rolls are basically stat rolls specifically with REF and some additional
 * modifiers.
 */
export class CPRInitiative extends CPRRoll {
  constructor(combatant, formula, statName, statValue) {
    const die = /d[0-9][0-9]*/;
    if (formula.match(die)) {
      super(SystemUtils.Localize("CPR.chat.initiative"), formula);
    } else {
      // Handle static initiative for Black ICE & Demons
      super(SystemUtils.Localize("CPR.chat.initiative"), "1d10");
      this.formula = formula;
    }

    this.combatant = combatant;
    this.statName = statName;
    this.statValue = statValue;

    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-initiative-rollcard.hbs`;
    this.calculateCritical = game.settings.get(
      game.system.id,
      "criticalInitiative"
    );
  }

  _computeBase() {
    return this.initialRoll + this.totalMods() + this.statValue + this.luck;
  }
}

/**
 * A stat roll extends the generic CPRRoll to include the value for a stat in the roll. e.g. "roll INT"
 */
export class CPRStatRoll extends CPRRoll {
  constructor(name, value) {
    super(name, "1d10");
    this.statName = name;
    this.statValue = value;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-stat-rollcard.hbs`;
  }

  /**
   * This override is where the stat value is included in the roll results.
   *
   * @override
   * @private
   * @returns {Number}
   */
  _computeBase() {
    return this.initialRoll + this.totalMods() + this.statValue + this.luck;
  }
}

/**
 * A program stat roll extends the CPRStatRoll to use the proper rollPrompt for net combat
 */
export class CPRProgramStatRoll extends CPRStatRoll {
  constructor(name, value) {
    super(name, value);
    this.statName = name;
    this.statValue = value;
    this.rollPrompt = `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-net-roll-prompt.hbs`;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-program-stat-rollcard.hbs`;
  }

  /**
   * Flip this roll to stat role from a program, which has a special name and card design.
   *
   * @param {String} rollTitle - a title for the roll, shown in the roll card (chat message)
   */
  setNetCombat(rollTitle) {
    this.rollTitle = rollTitle;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-program-stat-rollcard.hbs`;
  }
}

/**
 * The skill roll incorporates the stat, skill, and role details. Roles sometimes influence skill checks
 * (e.g. moto).
 *
 * To Do: when we get to active effects, this design may need to be revisited.
 */
export class CPRSkillRoll extends CPRStatRoll {
  /**
   * @constructor
   * @param {String} statName - name of the stat used with this roll
   * @param {Number} statValue - value of the stat
   * @param {String} skillName - name of the skill for the roll
   * @param {Number} skillValue - value of the skill level
   */
  constructor(statName, statValue, skillName, skillValue) {
    super(skillName, statValue);
    this.statName = statName;
    this.skillName = skillName;
    this.skillValue = skillValue;
    this.rollTitle =
      SystemUtils.Localize(
        `CPR.global.itemType.skill.${SystemUtils.slugify(skillName)}`
      ) === `CPR.global.itemType.skill.${SystemUtils.slugify(skillName)}`
        ? skillName
        : SystemUtils.Localize(
            `CPR.global.itemType.skill.${SystemUtils.slugify(skillName)}`
          );
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-skill-rollcard.hbs`;
  }

  /**
   * This override is where the stat, skill, and role values are included in the roll results.
   *
   * @override
   * @private
   * @returns {Number}
   */
  _computeBase() {
    return (
      this.initialRoll +
      this.totalMods() +
      this.statValue +
      this.skillValue +
      this.luck
    );
  }
}

/**
 * A facedown roll extends the CPRStat to include the HBS files for Facedown
 */
export class CPRFacedownRoll extends CPRStatRoll {
  constructor(statName, statValue, repValue) {
    super(statName, "1d10");
    this.statName = statName;
    this.statValue = statValue;
    this.repValue = repValue;
    this.rollTitle = SystemUtils.Localize("CPR.dialog.facedown.title");
    this.rollPrompt = `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-facedown-prompt.hbs`;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-facedown-rollcard.hbs`;
  }

  /**
   * This override is where the stat value is included in the roll results.
   *
   * @override
   * @private
   * @returns {Number}
   */
  _computeBase() {
    return super._computeBase() + Number.parseInt(this.repValue, 10);
  }
}

/**
 * The roll for decreasing Humanity when cyberware is installed, usually a number of d6s.
 */
export class CPRHumanityLossRoll extends CPRRoll {
  /**
   * @constructor
   * @param {String} name - the name of the cyberware being installed, incurring the loss
   * @param {String} humanityLoss - a roll formula
   */
  constructor(name, humanityLoss) {
    LOGGER.debug(`humanityLoss is ${humanityLoss}`);
    super(name, humanityLoss);
    LOGGER.debug(`formula is ${this.formula}`);
    this.rollTitle = SystemUtils.Localize(
      "CPR.dialog.installCyberware.humanityLoss"
    );
    this.calculateCritical = false;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-humanity-loss-rollcard.hbs`;
    this.cyberwareName = name;
  }
}

/**
 * Attack rolls function just like skill rolls but we keep track of the weapon type for damage calculations
 * later on. They have a specialized roll card too.
 *
 * While it would be cool to just pass in a weapon to the constructor, the data model does not include
 * the skill and stat entities that would be needed with it. Thought was given to extending
 * classes for Ranged and Melee attacks (and hardcoding the stats used), but when considering
 * aimed shots, this got into multiple inheritance. Decided not to cross that line. Maybe mix-ins or interfaces?
 */
export class CPRAttackRoll extends CPRSkillRoll {
  /**
   *
   * @constructor
   * @param {String} attackName - a name for the attack. Used in the roll card (chat message)
   * @param {String} statName - name for the stat
   * @param {Number} statValue - value of said stat
   * @param {String} skillName - name for the skill to be considered
   * @param {Number} skillValue - value of said skill
   * @param {String} weaponType - type of the weapon which is embedded in links to damage rolls in the roll card
   */
  constructor(
    attackName,
    statName,
    statValue,
    skillName,
    skillValue,
    weaponType
  ) {
    super(statName, statValue, skillName, skillValue);
    this.rollTitle = `${attackName}`;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-attack-rollcard.hbs`;
    this.weaponType = weaponType;
    this.location = "body";
  }
}

/**
 * Aimed attack rolls are the same as attack rolls, but they record the location and a -8 mod. The roll prompt
 * and card is slightly different too.
 */
export class CPRAimedAttackRoll extends CPRAttackRoll {
  /**
   * Note: this deliberately does not set the location until after the verify dialog box (in sheet code)
   *
   * @constructor
   * @param {String} attackName - a name for the attack. Used in the roll card (chat message)
   * @param {String} statName - name for the stat
   * @param {Number} statValue - value of said stat
   * @param {String} skillName - name for the skill to be considered
   * @param {Number} skillValue - value of said skill
   * @param {String} weaponType - type of the weapon which is embedded in links to damage rolls in the roll card
   */
  constructor(
    weaponName,
    statName,
    statValue,
    skillName,
    skillValue,
    weaponType
  ) {
    super(weaponName, statName, statValue, skillName, skillValue, weaponType);
    this.rollTitle = `${weaponName}`;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-aimed-attack-rollcard.hbs`;
    this.addMod([{ value: -8, source: "Aimed Shot Penalty" }]);
    this.location = "head";
  }
}

/**
 * Like an attack roll, but with a specialized title and roll card.
 */
export class CPRAutofireRoll extends CPRAttackRoll {
  /**
   * @constructor
   * @param {String} attackName - a name for the attack. Used in the roll card (chat message)
   * @param {String} statName - name for the stat
   * @param {Number} statValue - value of said stat
   * @param {String} skillName - name for the skill to be considered
   * @param {Number} skillValue - value of said skill
   * @param {String} weaponType - type of the weapon which is embedded in links to damage rolls in the roll card
   */
  constructor(
    weaponName,
    statName,
    statValue,
    skillName,
    skillValue,
    weaponType
  ) {
    super(weaponName, statName, statValue, skillName, skillValue, weaponType);
    this.rollTitle = `${weaponName}`;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-autofire-rollcard.hbs`;
  }
}

/**
 * See CPRAutoFireRoll, this is the same idea.
 */
export class CPRSuppressiveFireRoll extends CPRAttackRoll {
  /**
   * @constructor
   * @param {String} attackName - a name for the attack. Used in the roll card (chat message)
   * @param {String} statName - name for the stat
   * @param {Number} statValue - value of said stat
   * @param {String} skillName - name for the skill to be considered
   * @param {Number} skillValue - value of said skill
   * @param {String} weaponType - type of the weapon which is embedded in links to damage rolls in the roll card
   */
  constructor(
    weaponName,
    statName,
    statValue,
    skillName,
    skillValue,
    weaponType
  ) {
    super(weaponName, statName, statValue, skillName, skillValue, weaponType);
    this.rollTitle = `${weaponName}`;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-suppressive-fire-rollcard.hbs`;
  }
}

/**
 * RoleRolls are rolls for role abilities. I hope this is easier to say in other languages.
 */
export class CPRRoleRoll extends CPRRoll {
  /**
   * @constructor
   * @param {String} roleName - role ability name
   * @param {Number} roleValue - role value
   * @param {String} skillName - skill name used in the roll
   * @param {Number} skillValue - skill value
   * @param {String} statName - stat name used in the roll
   * @param {Number} statValue - stat value
   * @param {Array} skillList
   */
  constructor(
    roleName,
    roleValue,
    skillName,
    skillValue,
    statName,
    statValue,
    skillList
  ) {
    super(roleName, "1d10");
    this.skillList = skillList;
    this.roleName = roleName;
    this.roleValue = roleValue;
    this.skillName = skillName;
    this.skillValue = skillValue;
    this.statName = statName;
    this.statValue = statValue;
    this.rollPrompt = `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-roleAbility-prompt.hbs`;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-role-rollcard.hbs`;
  }

  /**
   * Override this to include the role, skill, and stat values in the computation
   *
   * @override
   * @returns {Number}
   */
  _computeBase() {
    return (
      this.initialRoll +
      this.totalMods() +
      this.roleValue +
      this.skillValue +
      this.statValue +
      this.luck
    );
  }
}

/**
 * Interface Rolls are for most rolls made from the NET section of the Fight tab.
 * This includes regular interface actions like Pathfinder or Slide, but also
 * applies to attacks like Zap or from loaded programs. The only rolls this doesn't cover
 * are damage rolls from loaded programs (or zap).
 */
export class CPRInterfaceRoll extends CPRRoleRoll {
  /**
   * @constructor
   * @param {String} rollType - "action", "attack", or "defense"
   * @param {String} roleName - role ability name
   * @param {Number} roleValue - role value
   * @param {String} statName - Loaded program stat name (ATK or DEF)
   * @param {Number} statValue - Loaded program stat value
   */
  constructor(rollType, roleName, roleValue, statName, statValue) {
    super(roleName, roleValue);
    this.rollType = rollType;
    this.statName = statName;
    this.statValue = statValue ?? 0;

    this.rollPrompt = `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-net-roll-prompt.hbs`;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-cyberdeck-rollcard.hbs`;
  }

  setProgramRollCard() {
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-program-attack-rollcard.hbs`;
  }

  _computeBase() {
    return (
      this.initialRoll +
      this.totalMods() +
      this.roleValue +
      this.statValue +
      this.luck
    );
  }
}

/**
 * The infamous death save. It is just like a generic d10 roll, but we built in how to calculate ongoing
 * penalties from previous (successful) saves and critical injuries.
 */
export class CPRDeathSaveRoll extends CPRRoll {
  /**
   * @constructor
   * @param {Number} penalty - the ever-increasing penalty when death saves are made
   * @param {Number} basePenalty - a separate penalty from critical injuries
   * @param {Number} bodyStat - the value of the actor's body stat, used in the roll card
   */
  constructor(penalty, basePenalty, bodyStat) {
    super(SystemUtils.Localize("CPR.rolls.deathSave.title"), "1d10");
    this.calculateCritical = false;
    this.rollPrompt = `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-deathsave-prompt.hbs`;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-deathsave-rollcard.hbs`;
    this.penalty = penalty;
    this.basePenalty = basePenalty;
    this.bodyStat = bodyStat;
    // the result of the save, with "Success" or "Failure"
    this.saveResult = null;
  }

  _computeBase() {
    return (
      this.initialRoll + this.basePenalty + this.penalty + this.totalMods()
    );
  }
}

/**
 * Damage rolls are very different. d6s are used, and critical events are determined differently. Many other
 * things affect damage too, such as aimed shots or autofire.
 */
export class CPRDamageRoll extends CPRRoll {
  /**
   * @constructor
   * @param {String} rollTitle - a name for the roll, used in the roll card (chat message)
   * @param {String} formula - of the form Xd6[+Y]
   * @param {String} weaponType - the weapon type is considered when displaying alt fire modes in the UI
   */
  constructor(rollTitle, formula, weaponType) {
    // we assume always d6s
    super(rollTitle, formula);

    // Warn if no tokens are targeted for a damage roll (and the user settings allow).
    const targetedTokens = SystemUtils.getUserTargetedOrSelected("targeted");
    if (
      targetedTokens.length === 0 &&
      game.settings.get(game.system.id, "warnAboutNoTargetsWhenRollingDamage")
    ) {
      SystemUtils.DisplayMessage(
        "warn",
        "CPR.chat.damageApplication.noTokenTargeted"
      );
    }

    this.rollPrompt = `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-damage-prompt.hbs`;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-damage-rollcard.hbs`;
    // criticals just add 5 damage, they do not need more dice rolled
    this.calculateCritical = false;
    this.bonusDamage = 5;
    // are we aiming at something?
    this.isAimed = false;
    // for aimed shots, set to head, leg, or held item; set to body otherwise
    this.location = "body";
    // used in the verifyPrompt for damage rolls to show alt firemodes
    this.weaponType = weaponType;
    // indicate whether this is an autofire roll. Used when considering the +5 damage in crits
    this.isAutofire = false;
    // multiple damage by this amount
    this.autofireMultiplier = 0;
    // multiplier max
    this.autofireMultiplierMax = 0;
  }

  /**
   * The base damage might be subject to multipliers and universal bonus damage, so we handle that here.
   *
   * @returns {Number}
   */
  _computeBase() {
    this.autofireMultiplier = Math.min(
      this.autofireMultiplier,
      this.autofireMultiplierMax
    );
    const damageMultiplier = this.isAutofire ? this.autofireMultiplier : 1;
    return (this.initialRoll + this.totalMods()) * damageMultiplier;
  }

  /**
   * Damage rolls cannot critically fail, so we override this to always return false.
   *
   * @override
   * @returns {false}
   */
  // eslint-disable-next-line class-methods-use-this
  wasCritFail() {
    return false;
  }

  /**
   * 2 or more 6s on a damage roll is a critical success, which is different than the usual d10 rolls.
   * So we override this method to handle that.
   *
   * @override
   * @returns {Boolean}
   */
  wasCritSuccess() {
    return this.faces.filter((x) => x === 6).length >= 2;
  }

  /**
   * Unlike d10 based rolls in this system, critical events do not trigger another dice roll.
   * So this override is fairly simple: just call _computeBase().
   *
   * @override
   * @private
   */
  _computeResult() {
    // figure how aimed shots work...
    this.resultTotal = this._computeBase();
  }

  /**
   * Convenience method for turning a damage into a roll for autofire damage which has a set
   * formula and no extra mods.
   */
  setAutofire() {
    this.isAutofire = true;
    this.formula = "2d6";
    this.mods = [];
  }

  /**
   * Set up the autofire multiplier. This needs to happen before roll() is called.
   *
   * @param {Number} autofireMultiplier - damage multiplier that comes from how well the attack roll exceed the DV
   * @param {Number} autofireMultiplierMax - the maximum damage multiplier for the roll, which is set by the weapon type
   * @param {Object} ammoOverride - Data from the ammo, which may override the weapon's autofire maximum.
   */
  configureAutofire(
    autofireMultiplier,
    // eslint-disable-next-line default-param-last
    autofireMultiplierMax = 0,
    ammoOverride
  ) {
    this.autofireMultiplier = autofireMultiplier;

    // We account for ammo overriding autofire maximum here.
    if (ammoOverride?.mode === "set") {
      this.autofireMultiplierMax = ammoOverride.value;
    } else if (ammoOverride?.mode === "modify") {
      const trueMax = Math.max(
        autofireMultiplierMax + ammoOverride.value,
        ammoOverride.minimum
      );
      this.autofireMultiplierMax = trueMax;
    } else if (autofireMultiplierMax > this.autofireMultiplierMax) {
      this.autofireMultiplierMax = autofireMultiplierMax;
    }
  }

  /**
   * Flip this roll to stat role from a program, which has a special name, prompt, and card design.
   *
   * @param {String} rollTitle - a title for the roll, shown in the roll card (chat message)
   */
  setNetCombat(rollTitle) {
    this.rollTitle = rollTitle;
    this.rollPrompt = `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-program-damage-prompt.hbs`;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-program-damage-rollcard.hbs`;
  }
}

/**
 * CPRTableRoll is a wrapper object to handle "rolling" on a rollable table. This is used for critical injuries
 * right now.
 */
export class CPRTableRoll extends CPRRoll {
  /**
   * @constructor
   * @param {String} rollTitle - a title for the roll, used in the roll card (chat message)
   * @param {RollTable} tableRoll - object representing a rollable table
   * @param {String} rollCard - path to a roll card template
   */
  constructor(rollTitle, tableRoll, rollCard) {
    // This is just to create a CPR Roll Object from an already rolled RollTable
    const formula = tableRoll._formula;
    super(rollTitle, formula);
    this.rollCard = rollCard;
    tableRoll.terms[0].results.forEach((die) => {
      this.faces.push(die.result);
    });
    this.resultTotal = tableRoll.result;
    this._roll = tableRoll;
  }
}

export const rollTypes = {
  BASE: "base",
  STAT: "stat",
  SKILL: "skill",
  HUMANITY: "humanity",
  ROLEABILITY: "roleAbility",
  ATTACK: "attack",
  AIMED: "aimed",
  AUTOFIRE: "autofire",
  SUPPRESSIVE: "suppressive",
  DAMAGE: "damage",
  DEATHSAVE: "deathsave",
  INTERFACEABILITY: "interfaceAbility",
  CYBERDECKPROGRAM: "cyberdeckProgram",
  FACEDOWN: "facedown",
};
