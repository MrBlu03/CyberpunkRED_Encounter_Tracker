import CPR from "../../system/config.js";
import CPRItem from "../cpr-item.js";
import * as CPRRolls from "../../rolls/cpr-rolls.js";
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRMod from "../../rolls/cpr-modifiers.js";

/**
 * Extend the base CPRItem object with things specific to cyberdecks.
 * @extends {CPRItem}
 */
export default class CPRCyberdeckItem extends CPRItem {
  /**
   * Cyberdeck Code
   *
   * The methods below apply to the CPRItem.type = "cyberdeck"
   */

  /**
   * Special logic for uninstalling programs. Note, this should rarely be called
   * outside of `item.uninstallItems()`. Use that method to uninstall any programs,
   * and this will automatically be called.
   *
   * @public
   * @param {Array} programs      - Array of CPRItem programs
   */
  async uninstallPrograms(programs) {
    const tokenList = [];
    let sceneId;
    for (const program of programs) {
      if (program.system.isRezzed) {
        // eslint-disable-next-line no-await-in-loop
        await program.update({ "system.isRezzed": false });
      }
      if (program.system.class === "blackice" && program.system.isRezzed) {
        const cprFlags = program.flags[game.system.id];
        if (cprFlags.biTokenId) {
          tokenList.push(cprFlags.biTokenId);
        }
        if (cprFlags.sceneId) {
          sceneId = cprFlags.sceneId;
        }
      }
    }

    if (tokenList.length > 0 && sceneId) {
      const sceneList = game.scenes.filter((s) => s.id === sceneId);
      if (sceneList.length === 1) {
        const [scene] = sceneList;
        await scene.deleteEmbeddedDocuments("Token", tokenList);
      }
    }
  }

  /**
   * Rez a program by setting the isRezzed boolean on the program to true
   * and push the program onto the rezzed array of the Cyberdeck
   *
   * @public
   * @param {CPRItem} program      - CPRItem of the program to REZ
   */
  async rezProgram(program, callingToken) {
    const programData = foundry.utils.duplicate(program.system);
    await program.setRezzed();
    if (programData.class === "blackice") {
      await this._rezBlackIceToken(program, callingToken);
    }
  }

  /**
   * Create a roll object appropriate for rolling for programs located on a cyberdeck.
   *
   * @param {CPRCharacterActor} actor - the actor associated with this cyberdeck item
   * @param {Object} extraData - more roll configuration data
   * @returns {CPRRoll}
   */
  _createCyberdeckRoll(actor, extraData = {}) {
    let cprRoll;
    const { programId } = extraData;
    const program = actor.getOwnedItem(programId);
    if (!program) {
      LOGGER.error(
        `_createCyberdeckRoll | CPRCyberdeckItem | Unable to locate program ${programId}.`
      );
      return new CPRRolls.CPRRoll("Unknown Program", "1d10");
    }

    const roleName = extraData.netRoleItem.system.mainRoleAbility;
    const roleValue = Number.parseInt(extraData.netRoleItem.system.rank, 10);
    const pgmName = program.name;
    const { executionType } = extraData;
    const statValue = program.system[executionType];
    const statName = SystemUtils.Localize(
      `CPR.global.blackIce.stats.${executionType}`
    );

    const damageFormula = program.system.damage.standard;
    // Attack and defense rolls from programs are treated as Interface Rolls.
    // Damage rolls from programs are treated as normal Damage Rolls.
    switch (executionType) {
      case "atk": {
        cprRoll = new CPRRolls.CPRInterfaceRoll(
          "attack",
          roleName,
          roleValue,
          statName,
          statValue
        );
        cprRoll.rollCardExtraArgs.program = program;
        cprRoll.rollCardExtraArgs.cyberdeck = this;
        cprRoll.ability = "attack";
        cprRoll.setProgramRollCard();
        break;
      }
      case "def": {
        cprRoll = new CPRRolls.CPRInterfaceRoll(
          "defense",
          roleName,
          roleValue,
          statName,
          statValue
        );
        cprRoll.ability = "defense";
        break;
      }
      case "damage": {
        cprRoll = new CPRRolls.CPRDamageRoll(pgmName, damageFormula, "program");
        cprRoll.rollCardExtraArgs.program = program;
        cprRoll.setNetCombat(pgmName);
        break;
      }
      default:
        break;
    }
    cprRoll.rollTitle = pgmName;

    const effects = Array.from(actor.allApplicableEffects()); // Active effects on the actor.
    const allMods = CPRMod.getAllModifiers(effects); // Effects list converted into CPRMods.
    // Filter for mods that should always be on (not situational) or are situational but on by default.
    const filteredMods = allMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault)
    );

    const damageMods = CPRMod.getRelevantMods(filteredMods, "universalDamage");

    const netrunnerMods = CPRMod.getRelevantMods(filteredMods, cprRoll.ability);
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

    // Bonuses from roles, active effects, and wound state should not modify damage rolls.
    if (executionType === "damage") {
      cprRoll.addMod(damageMods);
    } else {
      cprRoll.addMod(netrunnerMods);
      cprRoll.addMod(roleMods);
      cprRoll.addMod(allActionsMods);
      cprRoll.addMod([
        {
          value: actor.getWoundStateMods(),
          source: SystemUtils.Localize(
            "CPR.rolls.modifiers.sources.woundStatePenalty"
          ),
        },
      ]);
    }
    return cprRoll;
  }

  /**
   * Create a roll object appropriate for rolling Interface actions.
   *
   * @param {CPRCharacterActor} actor - the actor associated with this cyberdeck item
   * @param {Object} rollInfo - more roll configuration data
   * @returns {CPRRoll}
   */
  _createInterfaceRoll(actor, rollInfo) {
    let rollTitle;
    const roleName = rollInfo.netRoleItem.system.mainRoleAbility;
    const roleValue = Number.parseInt(rollInfo.netRoleItem.system.rank, 10);
    const interfaceAbility =
      rollInfo.interfaceAbility === "perception"
        ? "perception_net"
        : rollInfo.interfaceAbility;
    let rollType = "action";
    switch (interfaceAbility) {
      case "speed": {
        rollTitle = SystemUtils.Localize("CPR.global.generic.speed");
        break;
      }
      case "defense": {
        rollTitle = SystemUtils.Localize("CPR.global.generic.defense");
        break;
      }
      default: {
        rollTitle = SystemUtils.Localize(
          CPR.interfaceAbilities[interfaceAbility]
        );
      }
    }
    // Declare the roll;
    let cprRoll;

    // If interfaceAbiltiy is Zap, we will handle roll either as a Damage Roll or an Attack Roll.
    // If interfaceAbility is anything else, we will handle roll as as an Interface Roll.
    if (rollInfo.executionType === "damage") {
      const zap = SystemUtils.Localize(
        "CPR.global.role.netrunner.interfaceAbility.zap"
      );
      cprRoll = new CPRRolls.CPRDamageRoll(zap, "1d6", "program");
      cprRoll.setNetCombat(zap);
    } else {
      if (interfaceAbility === "zap") rollType = "attack";
      cprRoll = new CPRRolls.CPRInterfaceRoll(rollType, roleName, roleValue);
      cprRoll.ability = interfaceAbility;
      cprRoll.rollCardExtraArgs.cyberdeck = this;
    }

    // Set the roll title to the name of the interface action.
    cprRoll.rollTitle = rollTitle;

    // Figure out all applicable modifiers.
    const effects = Array.from(actor.allApplicableEffects()); // Active effects on the actor.
    const allMods = CPRMod.getAllModifiers(effects); // Effects list converted into CPRMods.
    // Filter for mods that should always be on (not situational) or are situational but on by default.
    const filteredMods = allMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault)
    );

    const damageMods = CPRMod.getRelevantMods(filteredMods, "universalDamage");
    const netrunnerMods = CPRMod.getRelevantMods(
      filteredMods,
      interfaceAbility
    );
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

    // Bonuses from roles, active effects, and wound state should not modify damage rolls.
    if (rollInfo.executionType === "damage") {
      cprRoll.addMod(damageMods);
    } else {
      cprRoll.addMod(netrunnerMods);
      cprRoll.addMod(roleMods);
      cprRoll.addMod(allActionsMods);
      cprRoll.addMod([
        {
          value: actor.getWoundStateMods(),
          source: SystemUtils.Localize(
            "CPR.rolls.modifiers.sources.woundStatePenalty"
          ),
        },
      ]);
    }
    return cprRoll;
  }

  /**
   * Create a Black ICE Token on the active scene as it was just rezzed
   *
   * @private
   * @param {CPRItem} program      - CPRItem of the program create the Token for
   */
  async _rezBlackIceToken(program, callingToken) {
    let netrunnerToken = callingToken;
    let scene;
    const blackIceName = program.name;

    if (!netrunnerToken && this.actor.isToken) {
      netrunnerToken = this.actor.token;
    }

    if (!netrunnerToken) {
      // Search for a token associated with this Actor ID.
      const tokenList = game.scenes
        .map((tokenDoc) =>
          tokenDoc.tokens.filter((t) => t.id === this.actor.id)
        )
        .filter((s) => s.length > 0);
      if (tokenList.length === 1) {
        [netrunnerToken] = tokenList;
      } else {
        LOGGER.error(
          `Attempting to create a Black ICE Token failed because we were unable to find a Token associated with World Actor "${this.actor.name}".`
        );
        SystemUtils.DisplayMessage(
          "error",
          SystemUtils.Localize("CPR.messages.rezBlackIceWithoutToken")
        );
        return;
      }
    }

    if (netrunnerToken.isEmbedded && netrunnerToken.parent instanceof Scene) {
      scene = netrunnerToken.parent;
    } else {
      LOGGER.error(
        `_rezBlackIceToken | CPRItem | Attempting to create a Black ICE Token failed because the token does not appear to be part of a scene.`
      );
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Localize("CPR.rezbiwithoutscene")
      );
      return;
    }

    // First, let's see if an Actor exists that is a blackIce Actor with the same name, if so, we will use that
    // to model the token Actor Data.
    const blackIceActors = game.actors.filter(
      (bi) => bi.type === "blackIce" && bi.name === blackIceName
    );
    let blackIce;
    if (blackIceActors.length === 0) {
      try {
        // We didn't find a blackIce Actor with a matching name so we need to create one dynamically.
        // We will keep all auto-generated Actors in a Folder called CPR Autogenerated to ensure the Actors
        // list of the user stays clean.
        const dynamicFolderName = "CPR Autogenerated";
        const dynamicFolder = await SystemUtils.GetFolder(
          "Actor",
          dynamicFolderName
        );
        // Create a new Black ICE Actor
        blackIce = await Actor.create({
          name: blackIceName,
          type: "blackIce",
          folder: dynamicFolder,
          img: `systems/${game.system.id}/icons/netrunning/Black_Ice.png`,
          system: {
            class: program.system.blackIceType,
            stats: {
              per: program.system.per,
              spd: program.system.spd,
              atk: program.system.atk,
              def: program.system.def,
              rez: program.system.rez,
            },
            notes: program.system.description.value,
          },
        });
      } catch (error) {
        LOGGER.error(
          `_rezBlackIceToken | CPRItem | Attempting to create a Black ICE Actor failed. Error: ${error}`
        );
        return;
      }
    } else {
      // We found a matching Actor so we will use that to model our Token Data
      [blackIce] = blackIceActors;
    }

    const tokenFlags = {
      netrunnerTokenId: netrunnerToken.id,
      sourceCyberdeckId: this.id,
      programUUID: program.uuid,
      sceneId: scene.id,
    };
    const tokenData = [
      {
        name: blackIce.name,
        actorId: blackIce._id,
        actorData: blackIce.system,
        actorLink: false,
        img: blackIce.img,
        x: netrunnerToken.x + 75,
        y: netrunnerToken.y,
        flags: { [game.system.id]: tokenFlags },
      },
    ];
    try {
      const biTokenList = await scene.createEmbeddedDocuments(
        "Token",
        tokenData
      );
      const biToken = biTokenList.length > 0 ? biTokenList[0] : null;
      if (biToken !== null) {
        // Ensure Token has Black Ice image for token
        biToken.update(
          { texture: { src: blackIce.img } },
          { animation: { duration: 0 } }
        );
        // Update the Token Actor based on the Black ICE Program Stats, leaving any effect description in place.
        biToken.actor.update({
          class: program.system.blackIceType,
          stats: {
            per: program.system.per,
            spd: program.system.spd,
            atk: program.system.atk,
            def: program.system.def,
            rez: program.system.rez,
          },
          notes: program.system.description.value,
        });
        const cprFlags =
          typeof program.flags[game.system.id] !== "undefined"
            ? program.flags[game.system.id]
            : {};
        cprFlags.biTokenId = biToken.id;
        cprFlags.sceneId = scene.id;
        // Passed by reference
        // eslint-disable-next-line no-param-reassign
        program.flags[game.system.id] = cprFlags;
      }
    } catch (error) {
      LOGGER.error(
        `_rezBlackIceToken | CPRItem | Attempting to create a Black ICE Token failed. Error: ${error}`
      );
    }
  }

  /**
   * Remove a program from the rezzed list on the Cyberdeck
   *
   * @public
   * @param {CPRItem} program      - CPRItem of the program de-rez
   */
  async derezProgram(program) {
    program.unsetRezzed();
    if (program.system.class === "blackice") {
      await CPRCyberdeckItem._derezBlackIceToken(program);
    }
  }

  /**
   * Remove a Black ICE Token from the game as it is de-rezzed
   *
   * @private
   * @param {CPRItem} program      - CPRItem of the program to remove the token for
   */
  static async _derezBlackIceToken(programData) {
    if (typeof programData.flags[game.system.id] !== "undefined") {
      const cprFlags = programData.flags[game.system.id];
      const { biTokenId } = cprFlags;
      const { sceneId } = cprFlags;
      if (typeof biTokenId !== "undefined" && typeof sceneId !== "undefined") {
        const sceneList = game.scenes.filter((s) => s.id === sceneId);
        if (sceneList.length === 1) {
          const [scene] = sceneList;
          const tokenList = scene.tokens.filter((t) => t.id === biTokenId);
          if (tokenList.length === 1) {
            await scene.deleteEmbeddedDocuments("Token", [biTokenId]);
          } else {
            LOGGER.warn(
              `_derezBlackIceToken | CPRItem | Unable to find biTokenId (${biTokenId}) in scene ${Scene.name} (${Scene.id}). May have been already deleted.`
            );
          }
        } else {
          LOGGER.error(
            `_derezBlackIceToken | CPRItem | Unable to locate sceneId ${Scene.id}`
          );
        }
      } else {
        LOGGER.error(
          `_derezBlackIceToken | CPRItem | Unable to retrieve biTokenId and sceneId from programData: ${programData.name} (${programData._id})`
        );
      }
    } else {
      LOGGER.error(
        `_derezBlackIceToken | CPRItem | No flags found in programData.`
      );
    }
  }

  /**
   * Reset a rezzed program numbers to be that of the installed version of the program
   *
   * @public
   * @param {CPRItem} program      - CPRItem of the program to reset
   */
  async resetRezProgram(program) {
    await program.update({ "system.rez.value": program.system.rez.max });
  }

  /**
   * Reduce the rezzed value of a rezzed program.
   *
   * @public
   * @param {CPRItem} program     - The program to reduce the REZ of
   * @param {Number} reduceAmount - Amount to reduce REZ by. Defaults to 1.
   */
  async reduceRezProgram(program, reduceAmount = 1) {
    const newRez = Math.max(program.system.rez.value - reduceAmount, 0);
    if (
      program.system.class === "blackice" &&
      typeof program.flags[game.system.id] !== "undefined"
    ) {
      const cprFlags = program.flags[game.system.id];
      if (typeof cprFlags.biTokenId !== "undefined") {
        const { biTokenId } = cprFlags;
        const tokenList = canvas.scene.tokens
          .map((tokenDoc) => tokenDoc.actor.token)
          .filter((token) => token)
          .filter((t) => t.id === biTokenId);
        if (tokenList.length === 1) {
          const [biToken] = tokenList;
          await biToken.actor.update({
            "system.rez.value": newRez,
          });
        }
      }
    }
    await program.update({ "system.rez.value": newRez });
  }
}
