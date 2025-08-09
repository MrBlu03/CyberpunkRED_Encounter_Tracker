import CPRChat from "../../chat/cpr-chat.js";
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import createImageContextMenu from "../../utils/cpr-imageContextMenu.js";
import CPRDialog from "../../dialog/cpr-dialog-application.js";

/**
 * Implement the Black-ICE sheet, which extends ActorSheet directly from Foundry. This does
 * not extend CPRActor, as there is very little overlap between Black-ICE and mooks/characters.
 *
 * @extends {ActorSheet}
 */
export default class CPRBlackIceActorSheet extends ActorSheet {
  /**
   * Set up the default options for this Foundry "app".
   * See https://foundryvtt.com/api/Application.html for the complete list of options available.
   *
   * @override
   * @static
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/actor/cpr-black-ice-sheet.hbs`,
      width: 575,
      height: "auto",
    });
  }

  /**
   * Get actor data into a more convenient organized structure.
   * Remember, this data is on the BlackIceActorSheet object, not the CPRActor
   * object it is tied to. (this.actor)
   *
   * @override
   * @returns {Object} data - a curated structure of actorSheet data
   */
  async getData() {
    const foundryData = super.getData();

    foundryData.enrichedHTML = [];
    foundryData.enrichedHTML.notes = await TextEditor.enrichHTML(
      this.actor.system.notes,
      { async: true }
    );

    // Get data for the linked program for the Black ICE.
    // This will be helpful for displaying damage on the sheet, as it comes from the program, not the actor.
    // It also gets relevant flags here rather than in the .hbs file, cleaning that file up.
    const externalData = {
      programUUID: this.actor.token?.getFlag(game.system.id, "programUUID"),
      netrunnerTokenId: this.actor.token?.getFlag(
        game.system.id,
        "netrunnerTokenId"
      ),
      sceneId: this.actor.token?.getFlag(game.system.id, "sceneId"),
    };

    let program;
    if (externalData.netrunnerTokenId) {
      const sceneList = externalData.sceneId
        ? game.scenes.filter((s) => s.id === externalData.sceneId)
        : game.scenes;
      let netrunnerToken;
      sceneList.forEach((scene) => {
        const tokenList = scene.tokens.filter(
          (t) => t.id === externalData.netrunnerTokenId
        );
        if (tokenList.length === 1) {
          [netrunnerToken] = tokenList;
        }
      });
      if (netrunnerToken) {
        program = netrunnerToken.actor.getOwnedItem(externalData.programUUID);
      }
    } else {
      const programList = game.items.filter(
        (i) => i.uuid === externalData.programUUID
      );
      if (programList.length === 1) {
        [program] = programList;
      }
    }

    let damageFormula = SystemUtils.Localize(
      "CPR.global.generic.notApplicable"
    );
    if (program) {
      damageFormula =
        this.actor.system.class === "antiprogram"
          ? program.system.damage.blackIce
          : program.system.damage.standard;
    }
    foundryData.externalData = externalData;
    foundryData.damageFormula = damageFormula;

    return foundryData;
  }

  /**
   * Activate listeners for the sheet. This has to call super at the end for Foundry to process
   * events properly.
   *
   * @override
   * @param {Object} html - the DOM object
   */
  activateListeners(html) {
    html.find(".rollable").click((event) => this._onRoll(event));
    html
      .find(".configure-from-program")
      .click((event) => this._configureFromProgram(event));
    this._createBlackIceImageContextMenu(html);
    super.activateListeners(html);
  }

  /**
   * Dispatcher that executes a roll based on the "type" passed in the event. While very similar
   * to _onRoll in CPRActor, Black-ICE has far fewer cases to consider, and copying some of the code
   * here seemed better than making Black-ICE extend a 1000-line class where most of it didn't apply.
   *
   * @private
   * @callback
   * @param {Object} event - object with details of the event
   */
  async _onRoll(event) {
    const rollType = SystemUtils.GetEventDatum(event, "data-roll-type");
    const rollName = SystemUtils.GetEventDatum(event, "data-roll-title");
    let cprRoll;
    switch (rollType) {
      case "stat": {
        cprRoll = this.actor.createStatRoll(rollName);
        break;
      }
      case "damage": {
        const programUUID = SystemUtils.GetEventDatum(
          event,
          "data-program-uuid"
        );
        const netrunnerTokenId = SystemUtils.GetEventDatum(
          event,
          "data-netrunner-id"
        );
        const sceneId = SystemUtils.GetEventDatum(event, "data-scene-id");
        cprRoll = this.actor.createDamageRoll(
          programUUID,
          netrunnerTokenId,
          sceneId
        );
        break;
      }
      default:
    }
    cprRoll.setNetCombat(this.actor.name);

    const keepRolling = await cprRoll.handleRollDialog(event, this.actor);
    if (!keepRolling) {
      return;
    }
    await cprRoll.roll();

    // output to chat
    const token = this.token === null ? null : this.token._id;
    cprRoll.entityData = { actor: this.actor.id, token };
    CPRChat.RenderRollCard(cprRoll);
  }

  /**
   * Create a Black-ICE actor from a program Item. This code is called when a user
   * rezzes Black-ICE they have in their Cyberdeck.
   *
   * @async
   * @private
   * @returns {null}
   */
  async _configureFromProgram() {
    // Only configure Black ICE from a token.
    if (!this.actor.isToken) {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Localize("CPR.messages.linkBlackIceWithoutToken")
      );
      return;
    }
    const biPrograms = game.items.filter(
      (i) => i.type === "program" && i.system.class === "blackice"
    );
    // Sorts the biPrograms list before 'selecting Black Ice Actor from Program' link box
    biPrograms.sort((a, b) => {
      const progA = a.name.toUpperCase();
      const progB = b.name.toUpperCase();
      if (progA < progB) {
        return -1;
      }
      if (progA > progB) {
        return 1;
      }
      return 0;
    });

    const linkedProgramUUID = this.actor.token.getFlag(
      game.system.id,
      "programUUID"
    );

    // Show "Configure Black Ice Actor From Program" prompt
    let dialogData = {
      biProgramList: biPrograms,
      programUUID: linkedProgramUUID || "unlink",
    };
    dialogData = await CPRDialog.showDialog(dialogData, {
      // Set the options for the dialog.
      title: SystemUtils.Localize(
        "CPR.dialog.configureBlackIceActorFromProgram.title"
      ),
      template: `systems/${game.system.id}/templates/dialog/cpr-configure-bi-actor-from-program-prompt.hbs`,
    }).catch((err) => LOGGER.debug(err));
    if (dialogData === undefined) {
      return;
    }

    const { programUUID } = dialogData;
    if (programUUID === "unlink") {
      await this.actor.token.unsetFlag(game.system.id, "programUUID");
    } else {
      const program = biPrograms.filter(
        (p) => p.uuid === dialogData.programUUID
      )[0];
      await this.actor.update({
        name: program.name,
        img: program.img,
        "system.class": program.system.stats,
        "system.stats": {
          per: program.system.per,
          spd: program.system.spd,
          atk: program.system.atk,
          def: program.system.def,
          rez: program.system.rez,
        },
        "system.notes": program.system.description.value,
      });
      await this.actor.token.update({
        name: program.name,
        texture: {
          src: program.img,
        },
      });
      await this.actor.token.setFlag(
        game.system.id,
        "programUUID",
        program.uuid
      );
    }
    this.render(true, { renderData: this.actor.system });
  }

  /**
   * Sets up a ContextMenu that appears when the Actor's image is right clicked.
   * Enables the user to share the image with other players.
   *
   * @param {Object} html - The DOM object
   * @returns {ContextMenu} The created ContextMenu
   */
  _createBlackIceImageContextMenu(html) {
    return createImageContextMenu(html, ".bice-icon", this.actor);
  }
}
