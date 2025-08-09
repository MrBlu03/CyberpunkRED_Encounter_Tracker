import * as CPRRolls from "../../rolls/cpr-rolls.js";
import CPRChat from "../../chat/cpr-chat.js";
import CPRLedger from "../../dialog/cpr-ledger-form.js";
import LOGGER from "../../utils/cpr-logger.js";
import Rules from "../../utils/cpr-rules.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import createImageContextMenu from "../../utils/cpr-imageContextMenu.js";
import CPRMod from "../../rolls/cpr-modifiers.js";
import CPRDialog from "../../dialog/cpr-dialog-application.js";
import { ContainerUtils } from "../../item/mixins/cpr-container.js";

/**
 * Extend the basic ActorSheet, which comes from Foundry. Not all sheets used in
 * this system module may extend from this. Others also extend ActorSheet. CPRActor
 * is used for common code between Mook sheets and Character sheets.
 * @extends {ActorSheet}
 */
export default class CPRActorSheet extends ActorSheet {
  /**
   * We extend the constructor to initialize data structures used for tracking parts of the sheet
   * being collapsed or opened, such as skill categories. These structures are later loaded from
   * User Settings if they exist.
   *
   * @constructor
   * @param {*} actor - the actor object associated with this sheet
   * @param {*} options - entity options passed up the chain
   */
  constructor(actor, options) {
    super(actor, options);
    this.options.collapsedSections = [];
    const collapsedSections = SystemUtils.GetUserSetting(
      "sheetConfig",
      "sheetCollapsedSections",
      this.id
    );
    if (collapsedSections) {
      this.options.collapsedSections = collapsedSections;
    }
  }

  /**
   * The scrollY option identifies elements where the
   * vertical position should be preserved during a re-render.
   *
   * See https://foundryvtt.com/api/Application.html for the complete list of options available.
   *
   * @override
   * @returns - sheet options merged with default options in ActorSheet
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: super.defaultOptions.classes.concat(["sheet", "actor"]),
      scrollY: [".right-content-section", ".top-pane-gear"],
      width: "auto",
      height: "auto",
    });
  }

  /**
   * Get actor data into a more convenient organized structure. This should be called sparingly in code.
   * Only add new data points to getData when you need a complex struct, not when you only need to add
   * new data points to shorten dataPaths. Remember, this data is on the CPRActorSheet object, not the
   * CPRActor object it is tied to. (this.actor)
   *
   * @override
   * @returns {Object} data - a curated structure of actorSheet data
   */
  async getData() {
    const foundryData = super.getData();
    const cprData = {};

    cprData.fightData = {};
    if (this.actor.type === "mook" || this.actor.type === "character") {
      cprData.isHardened = this.actor.system.derivedStats.isHardened;

      cprData.fightData.fightOptions = this.actor.hasItemTypeEquipped(
        "cyberdeck"
      )
        ? "both"
        : "";
      let fightState = this.actor.getFlag(game.system.id, "fightState");
      if (!fightState || cprData.fightData.fightOptions !== "both") {
        fightState = "Meatspace";
      }
      cprData.fightData.fightState = fightState;
      cprData.fightData.cyberdeck = "";
      if (fightState === "Netspace") {
        cprData.fightData.cyberdeck = this.actor.getEquippedCyberdeck();
      }
      cprData.filteredEffects = await this.prepareActiveEffectCategories();
    }
    // This appears to have been removed in V10?
    cprData.isGM = game.user.isGM;

    cprData.enrichedHTML = [];
    if (this.actor.type !== "container") {
      cprData.enrichedHTML.systemInformationNotes = await TextEditor.enrichHTML(
        this.actor.system.information.notes,
        {
          async: true,
        }
      );
    }
    if (this.actor.type === "demon") {
      cprData.enrichedHTML.systemNotes = await TextEditor.enrichHTML(
        this.actor.system.notes,
        {
          async: true,
        }
      );
    }
    if (this.actor.type === "character") {
      cprData.enrichedHTML.systemLifepathCulturalOrigin =
        await TextEditor.enrichHTML(this.actor.system.lifepath.culturalOrigin, {
          async: true,
        });
      cprData.enrichedHTML.systemLifepathLanguages =
        await TextEditor.enrichHTML(this.actor.system.lifepath.languages, {
          async: true,
        });
      cprData.enrichedHTML.systemLifepathPersonality =
        await TextEditor.enrichHTML(this.actor.system.lifepath.personality, {
          async: true,
        });
      cprData.enrichedHTML.systemLifepathClothingStyle =
        await TextEditor.enrichHTML(this.actor.system.lifepath.clothingStyle, {
          async: true,
        });
      cprData.enrichedHTML.systemLifepathHairStyle =
        await TextEditor.enrichHTML(this.actor.system.lifepath.hairStyle, {
          async: true,
        });
      cprData.enrichedHTML.systemLifepathAffectations =
        await TextEditor.enrichHTML(this.actor.system.lifepath.affectations, {
          async: true,
        });
      cprData.enrichedHTML.systemLifepathValueMost =
        await TextEditor.enrichHTML(this.actor.system.lifepath.valueMost, {
          async: true,
        });
      cprData.enrichedHTML.systemLifepathAboutPeople =
        await TextEditor.enrichHTML(this.actor.system.lifepath.aboutPeople, {
          async: true,
        });
      cprData.enrichedHTML.systemLifepathValuedPerson =
        await TextEditor.enrichHTML(this.actor.system.lifepath.valuedPerson, {
          async: true,
        });
      cprData.enrichedHTML.systemLifepathValuedPossession =
        await TextEditor.enrichHTML(
          this.actor.system.lifepath.valuedPossession,
          { async: true }
        );
      cprData.enrichedHTML.systemLifepathFamilyBackground =
        await TextEditor.enrichHTML(
          this.actor.system.lifepath.familyBackground,
          { async: true }
        );
      cprData.enrichedHTML.systemLifepathChildhoodEnvironment =
        await TextEditor.enrichHTML(
          this.actor.system.lifepath.childhoodEnvironment,
          { async: true }
        );
      cprData.enrichedHTML.systemLifepathFamilyCrisis =
        await TextEditor.enrichHTML(this.actor.system.lifepath.familyCrisis, {
          async: true,
        });
      cprData.enrichedHTML.systemLifepathLifeGoals =
        await TextEditor.enrichHTML(this.actor.system.lifepath.lifeGoals, {
          async: true,
        });
      cprData.enrichedHTML.systemLifepathRoleLifepath =
        await TextEditor.enrichHTML(this.actor.system.lifepath.roleLifepath, {
          async: true,
        });
      cprData.enrichedHTML.systemLifepathFriends = await TextEditor.enrichHTML(
        this.actor.system.lifepath.friends,
        {
          async: true,
        }
      );
      cprData.enrichedHTML.systemLifepathTragicLoveAffairs =
        await TextEditor.enrichHTML(
          this.actor.system.lifepath.tragicLoveAffairs,
          { async: true }
        );
      cprData.enrichedHTML.systemLifepathEnemies = await TextEditor.enrichHTML(
        this.actor.system.lifepath.enemies,
        {
          async: true,
        }
      );
    }

    return { ...foundryData, ...cprData };
  }

  /**
   * Prepare the data structure for Active Effects which are currently applied to this actor.
   * This came from the DND5E active-effect.js code.
   *
   * @returns {Object} - Data for rendering
   */
  async prepareActiveEffectCategories() {
    const categories = {
      permanent: {
        type: "permanent",
        label: SystemUtils.Localize(
          "CPR.characterSheet.rightPane.effects.permanent"
        ),
        effects: [],
      },
      situational: {
        type: "situational",
        label: SystemUtils.Localize(
          "CPR.characterSheet.rightPane.effects.situational"
        ),
        effects: [],
      },
      inactive: {
        type: "inactive",
        label: SystemUtils.Localize(
          "CPR.characterSheet.rightPane.effects.inactive"
        ),
        effects: [],
      },
    };

    const setting = game.settings.get(
      game.system.id,
      "displayStatusAsActiveEffects"
    );
    // Iterate over active effects, classifying them into categories
    for (const e of this.actor.allApplicableEffects()) {
      // We want to create a "simplified effect" for two reasons:
      //    1. To make accessing information via handlebars easier.
      //    2. We want to only feed the changes that are relevant to each section.
      // We do this by first giving our new object important info from the original effect.
      // Then, we create CPRMods (which have a simplified data structure) from each effect.changes,
      // Then, put the CPRMods relevant to each category (permanent, situational, inactive)
      // into our simplified effect's changes. Then just push that to the effects in each relevant category.
      const simplifiedEffect = {
        name: e.name,
        sourceName: e.sourceName,
        parentName: e.parent.name,
        uuid: e.uuid,
        img: e.img,
        usage: e.usage,
        system: {
          isSuppressed: e.system.isSuppressed,
        },
        disabled: e.disabled,
      };
      if (
        !(
          typeof e.flags.core !== "undefined" &&
          typeof e.flags.core.statusId !== "undefined"
        ) ||
        setting
      ) {
        // Get effects with no changes and display in the Permanent Effects category.
        // This is a rare case where a user makes an effect but doesn't add any changes.
        if (e.changes.length === 0 && !e.disabled && !e.system.isSuppressed) {
          categories.permanent.effects.push(simplifiedEffect);
        }

        // Get situational, non-disabled effects.
        if (!e.disabled && !e.system.isSuppressed) {
          const situationalMods = CPRMod.getAllModifiers([e]).filter(
            (m) => m.isSituational
          );
          // To avoid repeats, duplicate simplifiedEffect to situationalEffect, and push that.
          const situationalEffect = foundry.utils.duplicate(simplifiedEffect);
          situationalEffect.changes = situationalMods;
          if (situationalEffect.changes.length > 0) {
            categories.situational.effects.push(situationalEffect);
          }
        }

        // Get inactive (disabled or suppressed) effects.
        if (e.disabled || e.system.isSuppressed) {
          // The second argument in the following function is set to true, so that it gets disabled modifiers.
          simplifiedEffect.changes = CPRMod.getAllModifiers([e], true);
          categories.inactive.effects.push(simplifiedEffect);
          // Get permanent, non-disabled effects.
        } else if (CPRMod.getAllModifiers([e]).some((m) => !m.isSituational)) {
          const permanentMods = CPRMod.getAllModifiers([e]).filter(
            (m) => !m.isSituational
          );
          simplifiedEffect.changes = permanentMods;
          categories.permanent.effects.push(simplifiedEffect);
        }
      }
    }

    return categories;
  }

  /**
   * Activate listeners for the sheet. This should be only common listeners across Mook and Character sheets.
   * This has to call super at the end for Foundry to process events properly and get built-in functionality
   * like dragging items to sheets.
   *
   * @override
   * @param {Object} html - the DOM object
   */
  activateListeners(html) {
    // allow navigation for non owned actors
    this._tabs.forEach((t) => t.bind(html[0]));

    // Make a roll
    html.find(".rollable").click((event) => this._onRoll(event));

    // Ablate Armor
    html.find(".ablate").click((event) => this._ablateArmor(event));

    // Track armor and set armor values as current
    html
      .find(".armor-current-untrack")
      .click((event) => this._makeArmorCurrentTrack(event));

    // Untrack armor and remove armor values from token
    html
      .find(".armor-current-track")
      .click((event) => this._makeArmorCurrentUntrack(event));

    // Generic item action
    html.find(".item-action").click((event) => this._itemAction(event));

    // bring up read-only versions of the item card (sheet), used with installed cyberware
    html
      .find(".item-view")
      .click((event) => this._renderReadOnlyItemCard(event));

    // Create item in inventory
    html
      .find(".item-create")
      .click((event) => this._createInventoryItem(event));

    // Reset Death Penalty
    html.find(".reset-deathsave-value").click(() => this._resetDeathSave());

    // Increase Death Penalty
    html
      .find(".increase-deathsave-value")
      .click(() => this._increaseDeathSave());

    // Filter contents of skills or gear
    html.find(".filter-contents").bind("keyup", (event) => {
      this._applyContentFilter(event);
    });

    // Reset content filter
    html.find(".reset-content-filter").click(() => this._clearContentFilter());

    // toggle the expand/collapse buttons for skill and item categories
    html.find(".expand-button").click((event) => this._expandButton(event));

    // toggle display of nested installed items in the gear tab
    html
      .find(".toggle-installed-visibility")
      .click((event) => this._toggleInstalledVisibility(event));

    // Uninstall a single item from its parent.
    html
      .find(".uninstall-single-item")
      .click((event) => this._uninstallSingleItem(event));

    // Show edit and delete buttons
    html.find(".row.item").hover(
      (event) => {
        // show edit and delete buttons
        $(event.currentTarget).contents().contents().addClass("show");
      },
      (event) => {
        // hide edit and delete buttons
        $(event.currentTarget).contents().contents().removeClass("show");
      }
    );

    // Item Dragging
    const handler = (ev) => this._onDragItemStart(ev);
    html.find(".item").each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
    });

    // Set up right click context menu when clicking on Actor's image
    this._createActorImageContextMenu(html);

    if (!this.options.editable) return;
    // Listeners for editable fields under here. Fields might not be editable because
    // the user viewing the sheet might not have permission to. They may not be the owner.

    $("input[type=text]").focusin(() => $(this).select());

    // Render Item Card
    html.find(".item-edit").click((event) => this._renderItemCard(event));

    // Roll critical injuries and add to sheet
    html.find(".roll-critical-injury").click(() => this._rollCriticalInjury());

    // set/unset "checkboxes" used with fire modes
    html
      .find(".fire-checkbox")
      .click((event) => this._fireCheckboxToggle(event));

    // Reputation related listeners
    html
      .find(".reputation-open-ledger")
      .click(() => this.showLedger("reputation"));

    super.activateListeners(html);
  }

  /**
   * This is the + or - glyph on the skill and gear tab that hides whole categories of items.
   * It does not hide favorited items.
   *
   * @callback
   * @private
   * @param {*} event - object with details of the event
   */
  _expandButton(event) {
    const collapsibleElement = $(event.currentTarget).parents(".collapsible");
    $(collapsibleElement).find(".collapse-icon").toggleClass("hide");
    $(collapsibleElement).find(".expand-icon").toggleClass("hide");
    const itemOrderedList = $(collapsibleElement).children("ol");
    const itemList = $(itemOrderedList).children("li");
    itemList.each((lineIndex) => {
      const lineItem = itemList[lineIndex];
      if ($(lineItem).hasClass("item") && !$(lineItem).hasClass("favorite")) {
        $(lineItem).toggleClass("hide");
      }
    });

    if (this.options.collapsedSections.includes(event.currentTarget.id)) {
      this.options.collapsedSections = this.options.collapsedSections.filter(
        (sectionName) => sectionName !== event.currentTarget.id
      );
    } else {
      this.options.collapsedSections.push(event.currentTarget.id);
    }
  }

  /**
   * Toggle display of nested installed items on the gear tab.
   *
   * @callback
   * @private
   * @param {*} event - object with details of the event
   */

  async _toggleInstalledVisibility(event) {
    const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
    const installFlags = this.actor.getFlag(game.system.id, "showInstalled");

    const iconElement = event.currentTarget.querySelector("i");
    if (iconElement) {
      iconElement.classList.toggle("fa-flip-vertical");
    }

    const collapsibleContainer = event.currentTarget.closest(".collapsible");
    const installedRow = collapsibleContainer.querySelector(
      `div[data-items-wrapper-for-parent="${itemId}"]`
    );

    installedRow.classList.toggle("item-hidden");

    // Wait for the expand/collapse animation to complete before updating the installFlags (because it re-renders the handlebars)
    installedRow.addEventListener(
      "transitionend",
      async () => {
        // Update the installFlags.
        if (installFlags) {
          installFlags[itemId] = !installFlags[itemId];
          await this.actor.setFlag(
            game.system.id,
            "showInstalled",
            installFlags
          );
        } else {
          await this.actor.setFlag(game.system.id, "showInstalled", {
            [itemId]: true,
          });
        }
      },
      { once: true }
    );
  }

  /**
   * Dispatcher that executes a roll based on the "type" passed in the event
   *
   * @private
   * @callback
   * @param {Object} event - object with details of the event
   */
  async _onRoll(event) {
    let rollType = SystemUtils.GetEventDatum(event, "data-roll-type");
    let cprRoll;
    let item = null;
    switch (rollType) {
      case CPRRolls.rollTypes.DEATHSAVE:
      case CPRRolls.rollTypes.FACEDOWN:
      case CPRRolls.rollTypes.STAT: {
        const rollName = SystemUtils.GetEventDatum(event, "data-roll-title");
        cprRoll = this.actor.createRoll(rollType, rollName);
        break;
      }
      case CPRRolls.rollTypes.ROLEABILITY: {
        const itemId = CPRActorSheet._getItemId(event);
        const rollSubType = SystemUtils.GetEventDatum(
          event,
          "data-roll-subtype"
        );
        const subRoleName = SystemUtils.GetEventDatum(event, "data-roll-title");
        const rollInfo = {
          rollSubType,
          subRoleName,
        };
        item = this.actor.getOwnedItem(itemId);
        cprRoll = item.createRoll(rollType, this.actor, rollInfo);
        break;
      }
      case CPRRolls.rollTypes.SKILL: {
        const itemId = CPRActorSheet._getItemId(event);
        item = this.actor.getOwnedItem(itemId);
        cprRoll = item.createRoll(rollType, this.actor);
        break;
      }
      case CPRRolls.rollTypes.DAMAGE: {
        const itemId = CPRActorSheet._getItemId(event);
        item = this.actor.getOwnedItem(itemId);
        const damageType = this._getFireCheckbox(event);
        cprRoll = item.createRoll(rollType, this.actor, { damageType });
        if (rollType === CPRRolls.rollTypes.AIMED) {
          cprRoll.location =
            this.actor.getFlag(game.system.id, "aimedLocation") || "body";
        }
        break;
      }
      case CPRRolls.rollTypes.ATTACK: {
        const itemId = CPRActorSheet._getItemId(event);
        item = this.actor.getOwnedItem(itemId);
        rollType = this._getFireCheckbox(event);
        cprRoll = item.createRoll(rollType, this.actor);
        break;
      }
      case CPRRolls.rollTypes.INTERFACEABILITY: {
        const interfaceAbility = SystemUtils.GetEventDatum(
          event,
          "data-interface-ability"
        );
        const cyberdeckId = SystemUtils.GetEventDatum(
          event,
          "data-cyberdeck-id"
        );
        const cyberdeck = this.actor.getOwnedItem(cyberdeckId);
        item = cyberdeck;
        const netRoleItem = this.actor.itemTypes.role.find(
          (r) => r.id === this.actor.system.roleInfo.activeNetRole
        );
        if (!netRoleItem) {
          const error = SystemUtils.Localize(
            "CPR.messages.noNetrunningRoleConfigured"
          );
          SystemUtils.DisplayMessage("error", error);
          return;
        }
        cprRoll = cyberdeck.createRoll(rollType, this.actor, {
          interfaceAbility,
          cyberdeck,
          netRoleItem,
        });
        break;
      }
      case CPRRolls.rollTypes.CYBERDECKPROGRAM: {
        const programId = SystemUtils.GetEventDatum(event, "data-program-id");
        const cyberdeckId = SystemUtils.GetEventDatum(
          event,
          "data-cyberdeck-id"
        );
        const executionType = SystemUtils.GetEventDatum(
          event,
          "data-execution-type"
        );
        const cyberdeck = this.actor.getOwnedItem(cyberdeckId);
        item = cyberdeck;
        const netRoleItem = this.actor.itemTypes.role.find(
          (r) => r.id === this.actor.system.roleInfo.activeNetRole
        );
        if (!netRoleItem) {
          const error = SystemUtils.Localize(
            "CPR.messages.noNetrunningRoleConfigured"
          );
          SystemUtils.DisplayMessage("error", error);
          return;
        }
        const extraData = {
          cyberdeckId,
          programId,
          executionType,
          netRoleItem,
        };
        cprRoll = cyberdeck.createRoll(rollType, this.actor, extraData);
        break;
      }
      default:
    }

    // note: for aimed shots this is where location is set
    const keepRolling = await cprRoll.handleRollDialog(event, this.actor, item);
    if (!keepRolling) {
      return;
    }

    if (item !== null) {
      // Do any actions that need to be done as part of a roll, like ammo decrementing
      cprRoll = await item.confirmRoll(cprRoll);
    }

    // Let's roll!
    await cprRoll.roll();

    // Post roll tasks
    if (cprRoll instanceof CPRRolls.CPRDeathSaveRoll) {
      cprRoll.saveResult = this.actor.processDeathSave(cprRoll);
    }

    // "Consume" LUCK if used
    if (Number.isInteger(cprRoll.luck) && cprRoll.luck > 0) {
      const luckStat = this.actor.system.stats.luck.value;
      this.actor.update({
        "system.stats.luck.value":
          luckStat - (cprRoll.luck > luckStat ? luckStat : cprRoll.luck),
      });
    }

    // output to chat
    const token = this.token === null ? null : this.token._id;
    const targetedTokens = SystemUtils.getUserTargetedOrSelected("targeted"); // get user targeted tokens for output to chat

    cprRoll.entityData = {
      actor: this.actor.id,
      token,
      tokens: targetedTokens,
    };
    if (item) {
      cprRoll.entityData.item = item.id;
    }
    CPRChat.RenderRollCard(cprRoll);

    // save the location so subsequent damage rolls hit/show the same place
    if (cprRoll instanceof CPRRolls.CPRAimedAttackRoll) {
      this.actor.setFlag(game.system.id, "aimedLocation", cprRoll.location);
    }
  }

  /**
   * Callback for the checkboxes that control weapon fire modes
   *
   * @callback
   * @private
   * @param {Object} event - object with details of the event
   * @returns {CPRRoll}
   */
  _getFireCheckbox(event) {
    const weaponID = SystemUtils.GetEventDatum(event, "data-item-id");
    const box = this.actor.getFlag(game.system.id, `firetype-${weaponID}`);
    if (box) {
      return box;
    }
    return CPRRolls.rollTypes.ATTACK;
  }

  /**
   * Callback for increasing an actor's death save
   *
   * @callback
   * @private
   */
  _increaseDeathSave() {
    this.actor.increaseDeathPenalty();
  }

  /**
   * Callback for reseting an actor's death save
   *
   * @callback
   * @private
   */
  _resetDeathSave() {
    this.actor.resetDeathPenalty();
  }

  /**
   * Callback for ablating armor
   *
   * @async
   * @private
   * @callback
   * @param {Object} event - object with details of the event
   */
  async _ablateArmor(event) {
    const location = SystemUtils.GetEventDatum(event, "data-location");
    this.actor._ablateArmor(location, 1);
  }

  /**
   * As a first step to re-organizing the methods to the appropriate, objects (Actor/Item),
   * we filter calls to manipulate items through here.  Things such as:
   *  Weapon: Load, Unload
   *  Armor: Ablate, Repair
   *
   * @async
   * @private
   * @callback
   * @param {event} event - object capturing event data (what was clicked and where?)
   */
  async _itemAction(event) {
    const item = this.actor.getOwnedItem(CPRActorSheet._getItemId(event));
    const actionType = SystemUtils.GetEventDatum(event, "data-action-type");
    if (item) {
      switch (actionType) {
        case "delete": {
          await this._deleteOwnedItem(item);
          break;
        }
        case "ablate-armor": {
          item.ablateArmor();
          break;
        }
        case "favorite": {
          item.toggleFavorite();
          break;
        }
        case "manage-upgrades": {
          await item.sheet._manageInstalledItems("itemUpgrade");
          break;
        }
        case "manage-programs": {
          await item.sheet._manageInstalledItems("program");
          break;
        }
        case "split": {
          this._splitItem(item);
          break;
        }
        case "snort": {
          // consume a drug
          item.snort();
          break;
        }
        case "install-item": {
          item.install();
          break;
        }
        case "uninstall-item": {
          item.uninstall();
          break;
        }
        case "dv-ruler": {
          if (item.system?.dvTable !== "") {
            await item.doAction(this.actor, event.currentTarget.attributes);
            this._setDvIconState(item);
            if (
              canvas.tokens.controlled.filter((t) => t.id === this.token.id)
                .length === 0 &&
              canvas.tokens.ownedTokens.filter(
                (t) =>
                  t.actor.constructor.name === "CPRCharacterActor" ||
                  t.actor.constructor.name === "CPRMookActor"
              ).length !== 1
            ) {
              SystemUtils.DisplayMessage(
                "warn",
                SystemUtils.Localize(
                  "CPR.messages.warningTokenNotSelectedForDV"
                )
              );
            }
          }

          break;
        }
        default: {
          item.doAction(this.actor, event.currentTarget.attributes);
        }
      }
      // Only update if we aren't deleting the item.  Item deletion is handled in this._deleteOwnedItem()
      if (actionType !== "delete") {
        this.actor.updateEmbeddedDocuments("Item", [
          { _id: item.id, system: item.system },
        ]);
      }
    }
  }

  /**
   * When clicking the DV ruler, we want to highlight the active ruler.
   *
   * @async
   * @private
   * @callback
   * @param {CPRItem} item - item we are activating the DV Ruler for
   */
  _setDvIconState(item) {
    const ActorSheetNodeID = `${
      item.actor.constructor.name
    }Sheet-${item.actor.uuid.replaceAll(".", "-")}`;
    const dvGlyphs = document
      .getElementById(ActorSheetNodeID)
      .getElementsByClassName("dv-glyph");

    const dvFlag = this.token.object.document.getFlag(
      game.system.id,
      "cprDvTable"
    );

    const dvFlagSet = typeof dvFlag === "object" && dvFlag?.name !== "";

    for (const glyphNode of dvGlyphs) {
      const weaponId = $(glyphNode).attr("data-item-id");
      if (weaponId === item._id && dvFlagSet) {
        $(glyphNode).addClass("dv-active");
      } else {
        $(glyphNode).removeClass("dv-active");
      }
    }
  }

  /**
   * This is the callback for setting armor as "current", which is the star glyph. Setting this enables
   * the SP of the armor to be tracked as a resource bar on the corresponding token.
   *
   * @callback
   * @private
   * @param {} event - object capturing event data (what was clicked and where?)
   */
  _makeArmorCurrentTrack(event) {
    const location = SystemUtils.GetEventDatum(event, "data-location");
    const id = SystemUtils.GetEventDatum(event, "data-item-id");
    this.actor.updateTrackedArmor(location, id);
  }

  /**
   * This is the callback for setting armor as untracked, which is the star glyph. This
   * removes the tracking of the armor from the token.
   *
   * @callback
   * @private
   * @param {} event - object capturing event data (what was clicked and where?)
   */
  _makeArmorCurrentUntrack(event) {
    const location = SystemUtils.GetEventDatum(event, "data-location");
    this.actor.updateTrackedArmor(location);
  }

  /**
   * Update a property of an Item that is owned by this actor. There is a round trip to the
   * Foundry server with this call, so do not over use it.
   *
   * @private
   * @param {Item} item - object to be updated
   * @param {String} prop - property to be updated in a dot notation (e.g. "item.name")
   * @param {*} value - value to set the property to
   */
  _updateOwnedItemProp(item, prop, value) {
    foundry.utils.setProperty(item, prop, value);
    this._updateOwnedItem(item);
  }

  /**
   * Update an Item owned by this actor. There is a round trip to the Foundry server with this
   * call, so do not over use it in your code.
   *
   * @private
   * @param {Item} item - the updated object to replace in-line
   * @returns - the updated object (document) or array of entities
   */
  _updateOwnedItem(item) {
    return this.actor.updateEmbeddedDocuments("Item", [
      { _id: item.id, system: item.system },
    ]);
  }

  /**
   * Render the item card (chat message) when ctrl-click happens on an item link, or display
   * the item sheet if ctrl was not pressed.
   * To support shift-click in the cpr-mook-sheet, it expects any other event to not be a shift key.
   *
   * @private
   * @callback
   * @param {Object} event - object capturing event data (what was clicked and where?)
   */
  _renderItemCard(event) {
    const itemId = CPRActorSheet._getItemId(event);
    const item = this.actor.getOwnedItem(itemId);
    if (event.ctrlKey) {
      CPRChat.RenderItemCard(item);
      return;
    }
    if (!event.shiftKey) {
      item.sheet.render(true, { editable: true });
    }
  }

  /**
   * Render an item sheet in read-only mode, which is used on installed cyberware. This is to
   * prevent a user from editing data while it is installed, such as the foundation type.
   *
   * @private
   * @callback
   * @param {Object} event - object capturing event data (what was clicked and where?)
   */
  _renderReadOnlyItemCard(event) {
    const itemId = CPRActorSheet._getItemId(event);
    const item = this.actor.getOwnedItem(itemId);
    if (event.ctrlKey) {
      CPRChat.RenderItemCard(item);
      return;
    }
    if (!event.shiftKey) {
      item.sheet.render(true, { editable: false });
    }
  }

  /**
   * Get an itemId if specified as an attribute of a clicked link.
   * TODO: this may belong in a cpr-templateutils.js library
   *
   * @private
   * @static
   * @param {Object} event - the event object to inspect
   * @returns {String} - the string Id of the item
   */
  static _getItemId(event) {
    let id = SystemUtils.GetEventDatum(event, "data-item-id");
    if (typeof id === "undefined") {
      LOGGER.debug(
        "Could not find itemId in parent elements, trying currentTarget"
      );
      id = SystemUtils.GetEventDatum(event, "data-item-id");
    }
    return id;
  }

  /**
   * Often clickable elements in a sheet reference a complex object on the actor or item.
   * When a property deep in the object needs to be retrieved, a "property-string" is provided
   * for use with the object. This method retrieve that property-string from an attribute in
   * the link. Therefore this method is often pared with _getItemId since it is the first step
   * to getting the object with the property we want.
   *
   * TODO: this may belong in a cpr-templateutils.js library
   *
   * @private
   * @static
   * @param {Object} event - the event object to inspect
   * @returns {String} - the property string
   */
  static _getObjProp(event) {
    return SystemUtils.GetEventDatum(event, "data-item-prop");
  }

  /**
   * Delete an Item owned by the actor.
   *
   * @private
   * @async
   * @param {Item} item - the item to be deleted
   * @param {Boolean} skipConfirm - bypass rendering the confirmation dialog box
   * @returns {null}
   */
  async _deleteOwnedItem(item, skipConfirm = false) {
    const setting = game.settings.get(game.system.id, "deleteItemConfirmation");
    // If item is installed, show dialog to make sure user understands it will be uninstalled
    if (item.system.isInstalled && !skipConfirm) {
      // Create list of names of items that this item is installed in..
      const installedInSlug = item.system.installedIn
        .map((id) => this.actor.getOwnedItem(id))
        .map((i) => i.name)
        .reduce((accumulator, name) => `${accumulator}, ${name}`);
      const dialogMessage = `${SystemUtils.Localize(
        "CPR.dialog.deleteInstalledConfirmation.message"
      )} ${installedInSlug}`;

      // Show "Default" dialog.
      const confirmDelete = await CPRDialog.showDialog(
        { dialogMessage },
        // Set the options for the dialog.
        {
          title: SystemUtils.Localize(
            "CPR.dialog.deleteInstalledConfirmation.title"
          ),
        }
      ).catch((err) => LOGGER.debug(err));

      if (!confirmDelete) {
        return;
      }
      // If item isn't installed, the setting is on, and internally we do not want to skip it,
      // show the delete confirmation.
    } else if (setting && !skipConfirm) {
      const dialogMessage = `${SystemUtils.Localize(
        "CPR.dialog.deleteConfirmation.message"
      )} ${item.name}?`;

      // Show "Default" dialog.
      const confirmDelete = await CPRDialog.showDialog(
        { dialogMessage },
        // Set the options for the dialog.
        { title: SystemUtils.Localize("CPR.dialog.deleteConfirmation.title") }
      ).catch((err) => LOGGER.debug(err));

      if (!confirmDelete) {
        return;
      }
    }

    // `updateTrackedArmor` doesn't exist on Container Actors
    if (item.type === "armor" && this.actor.type !== "container") {
      if (item.system.isTracked) {
        if (item.system.isHeadLocation) {
          // Removes armor values for head armor if the body armor is deleted.
          this.actor.updateTrackedArmor("head");
        } else if (item.system.isBodyLocation) {
          // Removes armor values for body armor if the head armor is deleted.
          this.actor.updateTrackedArmor("body");
        } else if (item.system.isShield) {
          // Removes armor values for shield if the shield is deleted.
          this.actor.updateTrackedArmor("shield");
        }
      }
    }

    if (item.type === "cyberdeck") {
      // Set all of the owned programs that were installed on
      // this cyberdeck to unrezzed.
      const programs = item.system.installedPrograms;
      const updateList = [];
      programs.forEach((p) => {
        const program = this.actor.getOwnedItem(p.id);
        updateList.push({
          _id: program._id,
          "system.isRezzed": false,
        });
      });
      await this.actor.updateEmbeddedDocuments("Item", updateList);
    }

    let deleteInstalled = false;
    let deleteList = [item.id];
    if (item.system.hasInstalled) {
      const formData = await ContainerUtils.confirmContainerDelete(item);
      if (!formData) return;
      deleteInstalled = formData.deleteInstalled;
      if (deleteInstalled) {
        const deleteItems = item
          .recursiveGetAllInstalledItems()
          .map((i) => i.id);
        deleteList = deleteList.concat(deleteItems);
      }
    }

    await this.actor.deleteEmbeddedDocuments("Item", deleteList, {
      deleteInstalled,
    });
  }

  /**
   * Handle a fire mode checkbox being clicked. This will clear the others and set a Flag on the actor
   * to indicate what was selected when an attack was made. Flags are a Foundry feature on Actors/Items.
   *
   * @private
   * @callback
   * @param {Object} event - object capturing event data (what was clicked and where?)
   */
  async _fireCheckboxToggle(event) {
    const weaponID = SystemUtils.GetEventDatum(event, "data-item-id");
    const firemode = SystemUtils.GetEventDatum(event, "data-fire-mode");
    const flag = foundry.utils.getProperty(
      this.actor,
      `flags.${game.system.id}.firetype-${weaponID}`
    );
    LOGGER.debug(`firemode is ${firemode}`);
    LOGGER.debug(`weaponID is ${weaponID}`);
    LOGGER.debug(`flag is ${flag}`);
    if (this.token !== null && firemode === "autofire") {
      const weaponDvTable = this.actor.getOwnedItem(weaponID).system.dvTable;
      const currentDvTable =
        weaponDvTable === ""
          ? foundry.utils.getProperty(this.token, "flags.cprDvTable")
          : weaponDvTable;
      if (typeof currentDvTable !== "undefined") {
        const dvTable = currentDvTable.replace(" (Autofire)", "");
        const dvTables = await SystemUtils.GetDvTables();
        const afTable = dvTables.filter(
          (table) =>
            table.name.includes(dvTable) && table.name.includes("Autofire")
        );
        let newDvTable = currentDvTable;
        if (afTable.length > 0) {
          newDvTable = flag === firemode ? dvTable : afTable[0];
        }
        await this.token.update({ "flags.cprDvTable": newDvTable });
      }
    }
    if (flag === firemode) {
      // if the flag was already set to firemode, that means we unchecked a box
      await this.actor.unsetFlag(game.system.id, `firetype-${weaponID}`);
    } else {
      await this.actor.setFlag(
        game.system.id,
        `firetype-${weaponID}`,
        firemode
      );
    }
  }

  /**
   * Pop up a dialog box asking which critical injury table to use and return the user's answer.
   *
   * @async
   * @private
   * @returns {String} - chosen name of the rollable table to be used for critical injuries
   */
  static async _setCriticalInjuryTable(tableSetting) {
    const critInjuryTables = await SystemUtils.GetCompendiumDocs(tableSetting);
    const tableNames = critInjuryTables.map((t) => t.name).sort();
    const currentTable = 0;

    // Show "Roll Critical Injury" dialog.
    const formData = await CPRDialog.showDialog(
      { tableNames, currentTable },
      {
        // Set options for the dialog.
        title: SystemUtils.Localize(
          "CPR.dialog.rollCriticalInjury.criticalinjurytitleprompt"
        ),
        template: `systems/${game.system.id}/templates/dialog/cpr-roll-critical-injury-prompt.hbs`,
      }
    ).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return undefined;
    }
    return tableNames[formData.currentTable];
  }

  /**
   * Roll a critical injury. This is the top-level event handler for the sheet.
   *
   * @async
   * @callback
   * @private
   */
  async _rollCriticalInjury() {
    const tableSetting = game.settings.get(
      game.system.id,
      "criticalInjuryRollTableCompendium"
    );
    const tableName = await CPRActorSheet._setCriticalInjuryTable(tableSetting);
    if (tableName === undefined) {
      return;
    }
    const rollTable = await SystemUtils.GetCompendiumDoc(
      tableSetting,
      tableName
    );
    const injuryCompName = SystemUtils.GetCompendiumIdByLabel(tableName);
    this._drawCriticalInjuryTable(rollTable, injuryCompName, 0);
  }

  /**
   * Roll on the given critical injury table. Some heuristics are going on to handle user settings where
   * they do not want duplicate results on a character. When that happens, reroll by recursively calling
   * this method. There is cap to prevent recursing too much or if there are unreachable entries on the
   * table.
   *
   * @param {RollTable} table - the rollable table to draw from (roll on), pulled from a compendium
   * @param {Number} iteration - the number of times the injury table has been rolled. This is here as
   *                             a safety mechanism for malformed custom tables that have unreachable
   *                             results. This can happen if the formula is wrong.
   * @returns {null}
   */
  async _drawCriticalInjuryTable(table, injuryCompName, iteration) {
    const dupeSetting = game.settings.get(
      game.system.id,
      "preventDuplicateCriticalInjuries"
    );

    // check how many times we've been rolling. If this gets excessive maybe something is wrong with the table.
    if (iteration > 1000) {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Localize("CPR.messages.criticalInjuryDuplicateLoopWarning")
      );
      return;
    }

    // check that the table has critical injuries that could still be applied
    let hurts = 0;
    for (const injury of table.results) {
      if (
        this.actor.itemTypes.criticalInjury.filter(
          (i) => i.name === injury.text
        ).length > 0
      ) {
        hurts += 1;
      } else {
        // there is at least 1 injury on this table the actor does not have yet
        break;
      }
    }
    if (hurts === table.results.size && dupeSetting === "reroll") {
      // actor has every injury already, we cannot reroll for more
      SystemUtils.DisplayMessage(
        "warn",
        SystemUtils.Localize("CPR.messages.criticalInjuryDuplicateAllWarning")
      );
      return;
    }

    let injury;
    table.draw({ displayChat: false }).then(async (res) => {
      if (res.results.length !== 1) {
        return;
      }
      // find the critical injury item that turned up in the roll
      const injuryName = res.results[0].text;
      injury = await SystemUtils.GetCompendiumDoc(injuryCompName, injuryName);
      if (!injury) {
        SystemUtils.DisplayMessage(
          "warn",
          SystemUtils.Localize(
            "CPR.dialog.rollCriticalInjury.criticalInjuryNoneWarning"
          )
        );
        return;
      }

      // check whether the actor has this injury already
      if (
        this.actor.itemTypes.criticalInjury.find((i) => i.name === injuryName)
      ) {
        if (dupeSetting === "reroll") {
          await this._drawCriticalInjuryTable(
            table,
            injuryCompName,
            iteration + 1
          );
          return;
        }
        if (dupeSetting === "warn") {
          SystemUtils.DisplayMessage(
            "warn",
            SystemUtils.Localize("CPR.messages.criticalInjuryDuplicateWarning")
          );
        }
      }

      const cprItemData = {
        name: injury.name,
        type: injury.type,
        img: injury.img,
        system: foundry.utils.duplicate(injury.system),
        effects: foundry.utils.duplicate(injury.effects),
      };
      const result = await this.actor.createEmbeddedDocuments("Item", [
        cprItemData,
      ]);
      const cprRoll = new CPRRolls.CPRTableRoll(
        injury.name,
        res.roll,
        `systems/${game.system.id}/templates/chat/cpr-critical-injury-rollcard.hbs`
      );

      // Creates card data for critical injury, entityData.actor and entityData.token are vestigial since they're
      // not used in the critical injury rollcard but are required for the CPRChat.RenderRollCard function
      cprRoll.rollCardExtraArgs.tableName = table.name;
      cprRoll.rollCardExtraArgs.itemName = result[0].name;
      cprRoll.rollCardExtraArgs.itemImg = result[0].img;
      if (this.token) {
        cprRoll.entityData = {
          actor: this.actor.id,
          token: this.token.id,
          item: injury.name,
          comp: injuryCompName,
        };
      } else {
        cprRoll.entityData = {
          actor: this.actor.id,
          item: injury.name,
          comp: injuryCompName,
        };
      }
      CPRChat.RenderRollCard(cprRoll);
    });
  }

  /**
   * Ledger methods
   * For the most part ledgers are character-specific - they provide records of change to EB, IP and Reputation.
   * Mooks use this for Reputation too, and that's the only reason these remain here.
   */

  /**
   * Provide an Array of values and reasons the EB has changed. Together this is the "ledger", a
   * collection of records for EB changes.
   *
   * @private
   * @returns {Array} - the records
   */
  _listEbRecords() {
    return this.actor.listRecords("wealth");
  }

  /**
   * Clear all EB records, effectively setting it back to 0.
   *
   * @private
   * @returns - any empty Array, or null if unsuccessful
   */
  _clearEbRecords() {
    return this.actor.clearLedger("wealth");
  }

  /**
   * Set the value in a ledger on the actor to a specific value, with a reason.
   *
   * @private
   * @param {String} ledgerName - The name of the ledger
   * @param {Number} value - the value to set IP to
   * @param {String} reason - a freeform comment of why the IP is changing to the given value
   * @returns - the modified property or null if it was unsuccessful
   */
  _setLedger(ledgerName, value, reason) {
    LOGGER.debug(`setting ${ledgerName} to ${value}`);
    return this.actor.setLedgerProperty(ledgerName, value, reason);
  }

  /**
   * Increase ledger value by an amount, with a reason
   *
   * @private
   * @param {String} ledgerName - The name of the ledger
   * @param {Number} value - the value to increase IP by
   * @param {String} reason - a freeform comment of why the IP is changing to the given value
   * @returns - the modified property or null if it was unsuccessful
   */
  _gainLedger(ledgerName, value, reason) {
    return this.actor.deltaLedgerProperty(ledgerName, value, reason);
  }

  /**
   * Reduce ledger value by an amount, with a reason
   *
   * @private
   * @param {String} ledgerName - The name of the ledger
   * @param {Number} value - the value to reduce IP to
   * @param {String} reason - a freeform comment of why the IP is changing to the given value
   * @returns - the modified property or null if it was unsuccessful
   */
  _loseLedger(ledgerName, value, reason) {
    const resultantValue = this.actor.system[ledgerName].value - value;
    let rulesWarning = "";
    switch (ledgerName) {
      case "improvementPoints": {
        rulesWarning = "CPR.messages.warningNotEnoughIp";
        break;
      }
      case "wealth": {
        rulesWarning = "CPR.messages.warningNotEnoughEb";
        break;
      }
      case "reputation": {
        rulesWarning = "CPR.messages.warningNotEnoughReputation";
        break;
      }
      default: {
        break;
      }
    }
    Rules.lawyer(resultantValue > 0, rulesWarning);
    let tempVal = value;
    if (tempVal > 0) {
      tempVal = -tempVal;
    }

    const ledgerProp = this.actor.deltaLedgerProperty(
      ledgerName,
      tempVal,
      reason
    );
    return ledgerProp;
  }

  /**
   * Pop up a dialog box with ledger records for a given property.
   *
   * @param {String} prop - name of the property that has a ledger
   */
  async showLedger(prop) {
    if (this.actor.isLedgerProperty(prop)) {
      await CPRLedger.showDialog(this.actor, prop).catch((err) =>
        LOGGER.debug(err)
      );
    } else {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Localize("CPR.messages.ledgerErrorIsNoLedger")
      );
    }
  }

  /**
   * Provide an Array of values and reasons IP has changed. Together this is the "ledger", a
   * collection of records for IP changes.
   *
   * @private
   * @returns {Array} - the records
   */
  _listIpRecords() {
    return this.actor.listRecords("improvementPoints");
  }

  /**
   * Clear all IP records, effectively setting it back to 0.
   *
   * @private
   * @returns - any empty Array, or null if unsuccessful
   */
  _clearIpRecords() {
    return this.actor.clearLedger("improvementPoints");
  }

  /**
   * Called when an Item is dragged on the ActorSheet. This "stringifies" the Item into attributes
   * that can be inspected later. Doing so allows the system to make changes to the item before/after it
   * is added to the Actor's inventory.
   *
   * @private
   * @param {Object} event - an object capturing event details
   */
  _onDragItemStart(event) {
    const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
    const item = this.actor.getEmbeddedDocument("Item", itemId);
    const tokenId = this.token === null ? null : this.token.id;
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        type: "Item",
        uuid: item.uuid,
        system: {
          actorId: this.actor._id,
          tokenId,
          data: item,
          root: SystemUtils.GetEventDatum(event, "root"),
        },
      })
    );
  }

  /**
   * _onDrop is provided by Foundry and extended here. When an Item is dragged to an ActorSheet a new copy is created.
   * This extension ensure that the copy is owned by the right actor afterward. In the case that an item is dragged from
   * one Actor sheet to another, the item on the source sheet is deleted, simulating an actor giving an item to another
   * actor.
   *
   * @private
   * @override
   * @param {Object} event - an object capturing event details
   * @returns {null}
   */
  async _onDrop(event) {
    const dragData = TextEditor.getDragEventData(event);
    return dragData.type === "Item"
      ? this._cprOnItemDrop(event)
      : super._onDrop(event);
  }

  async _cprOnItemDrop(event) {
    const dragData = TextEditor.getDragEventData(event);
    let sourceActor;
    const sourceItem = fromUuidSync(dragData.uuid);
    if (sourceItem.type === "cyberware" && sourceItem.system?.isInstalled) {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Localize("CPR.messages.tradeDragInstalledCyberwareError")
      );
      return;
    }
    const transferItem =
      dragData.system && dragData.system.actorId !== undefined;
    if (transferItem) {
      // Transfer ownership from one player to another
      sourceActor = Object.keys(game.actors.tokens).includes(
        dragData.system.tokenId
      )
        ? game.actors.tokens[dragData.system.tokenId]
        : game.actors.find((a) => a.id === dragData.system.actorId);
      if (sourceActor.type === "container" && !game.user.isGM) {
        SystemUtils.DisplayMessage(
          "warn",
          SystemUtils.Localize("CPR.messages.tradeDragOutWarn")
        );
        return;
      }
      if (sourceActor) {
        // Do not move if the data is moved to itself
        if (sourceActor._id === this.actor._id) {
          return;
        }

        // If the cyberware is marked as core, or is installed, throw an error message.
        if (
          sourceItem.system.core === true ||
          (sourceItem.system.type === "cyberware" &&
            sourceItem.system.isInstalled)
        ) {
          SystemUtils.DisplayMessage(
            "error",
            SystemUtils.Localize("CPR.messages.cannotDropInstalledCyberware")
          );
          return;
        }
      }
    }

    const deleteList = transferItem ? [sourceItem._id] : [];
    const containerTypes = SystemUtils.getDocTypesFromMixin("container");

    const [newItem] = await super._onDrop(event);

    // If we created a new item and the sourceItem is a container type the createItem hook ensures all of the
    // installed items are also created on the target actor. We need to ensure that those items are
    // deleted from the source actor.
    if (
      newItem &&
      containerTypes.includes(sourceItem.type) &&
      sourceItem.isOwned &&
      sourceItem.system.hasInstalled
    ) {
      const deleteItemList = sourceItem.recursiveGetAllInstalledItems();
      for (const item of deleteItemList) {
        // Delete non-ammo items.
        if (item.type !== "ammo") deleteList.push(item._id);
        // Only delete ammo items if they have a non-zero stack size.
        if (item.type === "ammo" && item.system.amount === 0)
          deleteList.push(item._id);
      }
    }

    if (newItem && transferItem) {
      await sourceActor.deleteEmbeddedDocuments("Item", deleteList, {
        // Don't unload the ammo when we are transferring weapons. Leave ammo stack as-is.
        unloadAmmo: false,
        // Delete nested installed items.
        deleteInstalled: true,
      });
    }
  }

  /**
   * _splitItem splits an item into multiple items if possible.
   * It also adjusts the price accordingly.
   *
   * @param {Object} item - an object containing the new item
   * @returns {null}
   */
  async _splitItem(item) {
    if (item.system.installedUpgrades?.length !== 0) {
      SystemUtils.DisplayMessage(
        "warn",
        SystemUtils.Format("CPR.dialog.splitItem.warningUpgrade")
      );
    }

    // Prepare data for dialog.
    const dialogData = {
      header: SystemUtils.Format("CPR.dialog.splitItem.text", {
        amount: item.system.amount,
        itemName: item.name,
      }),
      splitAmount: Math.ceil(item.system.amount / 2),
    };

    // Show "Split Item" dialog.
    const formData = await CPRDialog.showDialog(
      dialogData,
      // Set options for the dialog.
      {
        title: SystemUtils.Localize("CPR.dialog.splitItem.title"),
        template: `systems/${game.system.id}/templates/dialog/cpr-split-item-prompt.hbs`,
      }
    ).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }
    const oldAmount = parseInt(item.system.amount, 10);
    if (formData.splitAmount <= 0 || formData.splitAmount >= oldAmount) {
      const warningMessage = SystemUtils.Format(
        "CPR.dialog.splitItem.warningAmount",
        {
          amountSplit: formData.splitAmount,
          amountOld: oldAmount,
          itemName: item.name,
        }
      );
      SystemUtils.DisplayMessage("warn", warningMessage);
      return;
    }
    const newAmount = oldAmount - formData.splitAmount;
    const cprNewItemData = foundry.utils.duplicate(item.system);
    cprNewItemData.amount = formData.splitAmount;
    delete cprNewItemData._id;
    const cprNewItemEffects = foundry.utils.duplicate(item.effects);
    delete cprNewItemEffects._id;
    await this.actor.updateEmbeddedDocuments("Item", [
      { _id: item.id, "system.amount": newAmount },
    ]);
    await this.actor.createEmbeddedDocuments(
      "Item",
      [
        {
          name: item.name,
          type: item.type,
          img: item.img,
          system: cprNewItemData,
          effects: cprNewItemEffects,
        },
      ],
      { CPRsplitStack: true }
    );
  }

  /**
   * Sets up a ContextMenu that appears when the Actor's image is right clicked.
   * Enables the user to share the image with other players.
   *
   * @param {Object} html - The DOM object
   * @returns {ContextMenu} The created ContextMenu
   */
  _createActorImageContextMenu(html) {
    return createImageContextMenu(html, ".image-block", this.actor);
  }

  /**
   * _applyContentFilter is used to filter data content on the actor sheet
   * to make locating things, such as skills or gear easier
   *
   * @private
   * @param {Object} event - an object capturing event details
   */
  async _applyContentFilter(event) {
    const filterValue = event.currentTarget.value;
    const num = $(".filter-contents").val();
    this.options.cprContentFilter = filterValue;
    await this._render();
    $(".filter-contents").focus().val("").val(num);
  }

  /**
   * _clearContentFilter is used to clear the filter used on the sheet
   * This is called when the tabs change if a filter is set.
   *
   * @private
   * @param {Object} event - an object capturing event details
   */
  async _clearContentFilter() {
    if (
      typeof this.options.cprContentFilter !== "undefined" &&
      this.options.cprContentFilter !== ""
    ) {
      this.options.cprContentFilter = "";
      this._render();
    }
  }

  /**
   * Create an item in the inventory of the actor. The templates will hide this functionality
   * if the GMs does not want to permit players to create their own items.
   *
   * @private
   * @callback
   * @param {Object} event - object capturing event data (what was clicked and where?)
   */
  async _createInventoryItem(event) {
    const itemType = SystemUtils.GetEventDatum(event, "data-item-type");
    const itemString = `TYPES.Item.${itemType}`;
    const itemName = SystemUtils.Format("CPR.actorSheets.commonActions.new", {
      item: SystemUtils.Localize(itemString),
    });
    const itemImage = SystemUtils.GetDefaultImage("Item", itemType);
    const itemData = { img: itemImage, name: itemName, type: itemType };
    await this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Called when the uninstall item glyph is clicked (the minus folder).
   *
   * @param {*} event - object capturing event data (what was clicked and where?)
   * @returns {Promise<null>}
   */
  async _uninstallSingleItem(event) {
    // Get the item being uninstalled.
    const installedItemId = SystemUtils.GetEventDatum(event, "data-item-id");
    const installedItem = this.actor.getOwnedItem(installedItemId);

    // Get the container item that has has the above item installed, if provided.
    const containerId = SystemUtils.GetEventDatum(event, "data-direct-parent");
    const container = this.actor.getOwnedItem(containerId);

    // If a specific container item is provided, uninistall just from that container.
    // Else, uninstall from all locations.
    return container
      ? installedItem.uninstall({ providedContainers: [container] })
      : installedItem.uninstall();
  }
}
