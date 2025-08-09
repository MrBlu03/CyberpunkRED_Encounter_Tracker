import * as CPRRolls from "../rolls/cpr-rolls.js";
import CPR from "../system/config.js";
import CPRChat from "../chat/cpr-chat.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Black-ICE actors directly extend Actor from Foundry. They have very little in common with
 * Characters or Mooks.
 *
 * @extends {Actor}
 */
export default class CPRBlackIceActor extends Actor {
  /**
   * The only special thing we do when creating a new Black-ICE actor is set the "REZ" stat to
   * be the one to show for a bar on a token. Typically this is a lot like HP.
   *
   * @static
   * @async
   * @param {Object} data - a complex object with set up details and data for the actor
   * @param {Object} options - unused here, but passed up to the parent class where it is needed
   */
  static async create(data, options) {
    const createData = data;
    if (typeof data.system === "undefined") {
      createData.prototypeToken = {
        bar1: { attribute: "stats.rez" },
      };
    }
    super.create(createData, options);
  }

  /**
   * Black-ICE really only uses 2 types of rolls: stat and damage. A trimmed down version
   * of the roll code in cpr-actor.js is implemented here.
   *
   * @param {String} statName - name of the stat being rolled (DEF, ATK, etc)
   * @returns {CPRProgramStatRoll}
   */
  createStatRoll(statName) {
    const niceStatName = SystemUtils.Localize(CPR.blackIceStatList[statName]);
    const statValue = parseInt(this.system.stats[statName], 10);
    const cprRoll = new CPRRolls.CPRProgramStatRoll(niceStatName, statValue);
    if (
      this.isToken &&
      typeof this.token.flags[game.system.id] !== "undefined"
    ) {
      const cprFlags = this.token.flags[game.system.id];
      if (typeof cprFlags.program !== "undefined") {
        cprRoll.rollCardExtraArgs.program = foundry.utils.duplicate(
          cprFlags.program
        );
      }
    }

    if (cprRoll.rollCardExtraArgs.length === 0) {
      cprRoll.rollCardExtraArgs.program = {
        system: {
          blackIceType: this.system.class,
          class: "blackice",
          damage: "blackice",
        },
      };
    }
    return cprRoll;
  }

  /**
   * See createStatRoll
   *
   * @param {String} programUUID - Id for the program item doing the damage
   * @param {String} netrunnerTokenId - The token Id of the netrunner that supposedly owns the program item
   * @param {String} sceneId - the scene Id, used to find the token
   * @returns {CPRDamageRoll}
   */
  createDamageRoll(programUUID, netrunnerTokenId, sceneId) {
    let program;
    if (netrunnerTokenId) {
      const sceneList = sceneId
        ? game.scenes.filter((s) => s.id === sceneId)
        : game.scenes;
      let netrunnerToken;
      sceneList.forEach((scene) => {
        const tokenList = scene.tokens.filter((t) => t.id === netrunnerTokenId);
        if (tokenList.length === 1) {
          [netrunnerToken] = tokenList;
        }
      });
      if (netrunnerToken) {
        program = netrunnerToken.actor.getOwnedItem(programUUID);
      }
    } else {
      const programList = game.items.filter((i) => i.uuid === programUUID);
      if (programList.length === 1) {
        [program] = programList;
      }
    }

    let damageFormula = "1d6";
    let programName = this.name;
    let programData = {};
    if (program) {
      damageFormula =
        this.system.class === "antiprogram"
          ? program.system.damage.blackIce
          : program.system.damage.standard;
      programName = program.name;
      programData = program.system;
    }

    const cprRoll = new CPRRolls.CPRDamageRoll(
      programName,
      damageFormula,
      "program"
    );
    cprRoll.rollCardExtraArgs.program = programData;
    return cprRoll;
  }

  /**
   * Apply damage to the rez of the Black ICE.
   * @param {int} damage - direct damage dealt
   * @param {int} bonusDamage - bonus damage dealt
   */
  async _applyDamage(damage, bonusDamage) {
    // As a Black ICE does not have any armor, the damage will be simply subtracted from the REZ.
    const currentRez = this.system.stats.rez.value;
    await this.update({
      "system.stats.rez.value": currentRez - damage - bonusDamage,
    });
    CPRChat.RenderDamageApplicationCard({
      actor: this,
      hpReduction: damage + bonusDamage,
      rezReduction: true,
    });
  }

  /**
   * Reverse rez damage to the actor, in case someone made a mistake applying it.
   *
   * @param {int} rezReduction - value of the damage taken
   */
  async _reverseDamage(rezReduction) {
    const currentRez = this.system.stats.rez.value;
    const updatedRez = Math.min(
      currentRez + rezReduction,
      this.system.stats.rez.max
    );
    await this.update({ "system.stats.rez.value": updatedRez });
  }

  /**
   * Given a stat name, return the value of it off the actor
   *
   * @param {String} statName - name (from CPR.statList) of the stat to retrieve
   * @returns {Number}
   */
  getStat(statName) {
    const statValue =
      statName === "rez"
        ? this.system.stats[statName].value
        : this.system.stats[statName];
    return parseInt(statValue, 10);
  }
}
