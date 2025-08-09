import CPRChat from "../../chat/cpr-chat.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import createImageContextMenu from "../../utils/cpr-imageContextMenu.js";

/**
 * Implement the Demon sheet, which extends ActorSheet directly from Foundry. This does
 * not extend CPRActor, as there is very little overlap between Demons and mooks/characters.
 *
 * @extends {ActorSheet}
 */
export default class CPRDemonActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/actor/cpr-demon-sheet.hbs`,
      width: 586,
      height: "auto",
    });
  }

  /**
   * Get actor data into a more convenient organized structure.
   * Remember, this data is on the DemonActorSheet object, not the CPRActor
   * object it is tied to. (this.actor)
   *
   * @override
   * @returns {Object} data - a curated structure of actorSheet data
   */
  async getData() {
    const sheetData = super.getData();
    sheetData.enrichedHTML = [];
    sheetData.enrichedHTML.notes = await TextEditor.enrichHTML(
      this.actor.system.notes,
      { async: true }
    );
    return sheetData;
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
    this._createDemonImageContextMenu(html);
    super.activateListeners(html);
  }

  /**
   * Dispatcher that executes a roll based on the "type" passed in the event. While very similar
   * to _onRoll in CPRActor, Demon sheets have far fewer cases to consider, and copying some of the code
   * here seemed better than making them extend a 1000-line class where most of it didn't apply.
   *
   * @private
   * @callback
   * @param {Object} event - object with details of the event
   */
  async _onRoll(event) {
    const rollName = SystemUtils.GetEventDatum(event, "data-roll-title");
    const cprRoll = this.actor.createStatRoll(rollName);

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
   * Sets up a ContextMenu that appears when the Actor's image is right clicked.
   * Enables the user to share the image with other players.
   *
   * @param {Object} html - The DOM object
   * @returns {object} The created ContextMenu
   */
  _createDemonImageContextMenu(html) {
    return createImageContextMenu(html, ".demon-icon", this.actor);
  }
}
