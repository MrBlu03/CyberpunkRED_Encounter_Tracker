import CPRActorSheet from "./cpr-actor-sheet.js";
import LOGGER from "../../utils/cpr-logger.js";
import Rules from "../../utils/cpr-rules.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import LedgerEditPrompt from "../../dialog/cpr-ledger-edit-prompt.js";
import CPRDialog from "../../dialog/cpr-dialog-application.js";

/**
 * Extend the basic CPRActorSheet with Character specific functionality.
 * @extends {CPRActorSheet}
 */
export default class CPRCharacterActorSheet extends CPRActorSheet {
  /**
   * Set default options for character sheets, which include making sure vertical scrollbars do not
   * get reset when re-rendering.
   * See https://foundryvtt.com/api/Application.html for the complete list of options available.
   *
   * @static
   * @override
   */
  static get defaultOptions() {
    const defaultWidth = 1050;
    const defaultHeight = "auto";
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/actor/cpr-character-sheet.hbs`,
      width: defaultWidth,
      height: defaultHeight,
      resizable: true,
      scrollY: [".right-content-section", ".top-pane-gear"],
      tabs: [
        {
          navSelector: ".navtabs-right",
          contentSelector: ".right-content-section",
          initial: "skills",
        },
        {
          navSelector: ".navtabs-bottom",
          contentSelector: ".bottom-content-section",
          initial: "fight",
        },
      ],
    });
  }

  async getData() {
    const actorSheetData = await super.getData();
    const characterSheetData = {};

    // Prepare options for selecting a net role.
    const netRoleSelectOptions = {};
    this.actor.itemTypes.role.forEach((role) => {
      netRoleSelectOptions[role.id] = role.system.mainRoleAbility;
    });
    characterSheetData.netRoleSelectOptions = netRoleSelectOptions;

    return foundry.utils.mergeObject(characterSheetData, actorSheetData);
  }

  /**
   * Add listeners specific to the Character sheet. Remember additional listeners are added from the
   * parent class, CPRActor.
   *
   * @param {*} html - the DOM object
   */
  activateListeners(html) {
    html.find(".navtabs-right").click(() => this._clearContentFilter());

    // calculate max Hp
    html.find(".calculate-hp").click(() => this._setMaxHp());

    // calculate max Hp
    html.find(".calculate-humanity").click(() => this._setMaxHumanity());

    // Cycle equipment status
    html.find(".equip").click((event) => this._cycleEquipState(event));

    // Repair Armor
    html.find(".repair").click((event) => this._repairArmor(event));

    // Install Cyberware
    html
      .find(".install-remove-cyberware")
      .click((event) => this._installUninstallCyberwareAction(event));

    // Set Lifepath for Character
    html.find(".set-lifepath").click(() => this._setLifepath());

    // toggle "favorite" skills and items
    html
      .find(".toggle-section-visibility")
      .click((event) => this._toggleSectionVisibility(event));

    if (!this.options.editable) return;
    // Listeners for editable fields under go here. Fields might not be editable because
    // the user viewing the sheet might not have permission to. They may not be the owner.

    // update a skill level
    html
      .find(".skill-input")
      .click((event) => event.target.select())
      .change((event) => this._updateSkill(event));

    // update the ammount of an item in the gear tab
    html
      .find(".gear-amount-input")
      .click((event) => event.target.select())
      .change((event) => this._updateAmount(event));

    // update a role ability
    html
      .find(".ability-input")
      .click((event) => event.target.select())
      .change((event) => this._updateRoleAbility(event));

    // IP related listeners
    html
      .find(".improvement-points-open-ledger")
      .click(() => this.showLedger("improvementPoints"));

    // Listeners for eurobucks (in gear tab)
    html
      .find(".eurobucks-input-button")
      .click((event) => this._updateEurobucks(event));
    html.find(".eurobucks-open-ledger").click(() => this.showLedger("wealth"));

    // Fight tab listeners

    // update the amount of loaded ammo in the Fight tab
    html
      .find(".weapon-input")
      .click((event) => event.target.select())
      .change((event) => this._updateWeaponAmmo(event));

    // Switch between meat and net fight states
    html
      .find(".toggle-fight-state")
      .click((event) => this._toggleFightState(event));

    // Execute a program on a Cyberdeck
    html
      .find(".program-execution")
      .click((event) => this._cyberdeckProgramExecution(event));

    // Effects tab listeners
    // Create Active Effect
    html.find(".effect-control").click((event) => this.manageEffect(event));

    super.activateListeners(html);
  }

  /**
   * Calculate and set the max HP on this actor. Called when the calculator is clicked.
   * If current hp is full and the max changes, we should update the current to match.
   * We assume that to be preferred behavior more often than not.
   *
   * @callback
   * @private
   */
  _setMaxHp() {
    const maxHp = this.actor.calcMaxHp();
    const { hp } = this.actor.system.derivedStats;
    this.actor.update({
      "system.derivedStats.hp.max": maxHp,
      "system.derivedStats.hp.value": hp.max === hp.value ? maxHp : hp.value,
    });
  }

  /**
   * Calls the actor method to calculate and set the max humanity on this actor
   * If current humanity is full and the max changes, we should update the current and EMP to match.
   * We assume that to be preferred behavior more often than not, especially during character creation.
   *
   * @callback
   * @private
   */
  _setMaxHumanity() {
    this.actor.setMaxHumanity();
  }

  /**
   * Called when an equipment glyph on the gear tab is clicked. This cycles the equip attribute from
   * from owned to carried to equipped and back to owned.
   *
   * @callback
   * @private
   * @param {} event - object with details of the event
   */
  _cycleEquipState(event) {
    const item = this.actor.getOwnedItem(CPRActorSheet._getItemId(event));
    const prop = CPRActorSheet._getObjProp(event);
    let newValue = "owned";
    switch (item.system.equipped) {
      case "owned": {
        newValue = "carried";
        break;
      }
      case "carried": {
        if (item.type === "weapon") {
          Rules.lawyer(
            this.actor.canHoldWeapon(item),
            "CPR.messages.warningTooManyHands"
          );
        }
        // If moving from carried to equipped cycle state, auto-track the new armor by slot
        if (item.type === "armor") {
          const actorData = this.actor.getOwnedItem(item.id);
          if (actorData.system.isHeadLocation) {
            this.actor.updateTrackedArmor("head", item.id);
          } else if (actorData.system.isBodyLocation) {
            this.actor.updateTrackedArmor("body", item.id);
          } else if (actorData.system.isShield) {
            this.actor.updateTrackedArmor("shield", item.id);
          }
        }
        newValue = "equipped";
        if (item.type === "cyberdeck") {
          if (this.actor.hasItemTypeEquipped(item.type)) {
            Rules.lawyer(false, "CPR.messages.errorTooManyCyberdecks");
            newValue = "owned";
          }
        }
        break;
      }
      case "equipped": {
        const actorData = this.actor.getOwnedItem(item.id);
        // If it's an armor item, and isTracked, untrack it when we unequip it
        if (item.type === "armor") {
          if (item.system.isTracked) {
            if (actorData.system.isHeadLocation) {
              this.actor.updateTrackedArmor("head");
            } else if (actorData.system.isBodyLocation) {
              this.actor.updateTrackedArmor("body");
            } else if (actorData.system.isShield) {
              this.actor.updateTrackedArmor("shield");
            }
          }
        }
        newValue = "owned";
        break;
      }
      default: {
        newValue = "carried";
        break;
      }
    }
    this._updateOwnedItemProp(item, prop, newValue);
    const containerTypes = SystemUtils.getDocTypesFromMixin("container");
    if (containerTypes.includes(item.type)) {
      const allInstalledItems = item.recursiveGetAllInstalledItems();
      if (allInstalledItems.length > 0) {
        for (const installedItem of allInstalledItems) {
          this._updateOwnedItemProp(installedItem, prop, newValue);
        }
      }
    }
  }

  /**
   * Called when a user clicks the repair armor glyph in the gear tab. It only shows
   * up when the armor has been ablated at least once.
   *
   * @callback
   * @private
   * @param {*} event - object with details of the event
   */
  _repairArmor(event) {
    const item = this.actor.getOwnedItem(CPRActorSheet._getItemId(event));
    const upgradeData = item.getTotalUpgradeValues("shieldHp");
    const currentArmorBodyValue = item.system.bodyLocation.sp;
    const currentArmorHeadValue = item.system.headLocation.sp;
    const currentArmorShieldValue =
      upgradeData.type === "override"
        ? upgradeData.value
        : item.system.shieldHitPoints.max + upgradeData.value;
    // XXX: cannot use _getObjProp since we need to update 2 props
    this._updateOwnedItemProp(item, "system.headLocation.ablation", 0);
    this._updateOwnedItemProp(item, "system.bodyLocation.ablation", 0);
    this._updateOwnedItemProp(
      item,
      "system.shieldHitPoints.value",
      currentArmorShieldValue
    );
    // Update actor external data when armor is repaired:
    if (
      CPRActorSheet._getItemId(event) ===
      this.actor.system.externalData.currentArmorBody.id
    ) {
      this.actor.update({
        "system.externalData.currentArmorBody.value": currentArmorBodyValue,
      });
    }
    if (
      CPRActorSheet._getItemId(event) ===
      this.actor.system.externalData.currentArmorHead.id
    ) {
      this.actor.update({
        "system.externalData.currentArmorHead.value": currentArmorHeadValue,
      });
    }
    if (
      CPRActorSheet._getItemId(event) ===
      this.actor.system.externalData.currentArmorShield.id
    ) {
      this.actor.update({
        "system.externalData.currentArmorShield.value": currentArmorShieldValue,
      });
    }
  }

  /**
   * This callback functions like a toggle switch. Both install and remove glyphs call it, and it
   * flips the field to indicate cyberware is installed or not.
   *
   * @async
   * @callback
   * @private
   * @param {*} event - object with details of the event
   */
  async _installUninstallCyberwareAction(event) {
    const itemId = CPRActorSheet._getItemId(event);
    const item = this.actor.getOwnedItem(itemId);
    if (item.system.isInstalled) {
      const foundationalId = SystemUtils.GetEventDatum(
        event,
        "data-installation-id"
      );
      await this.actor.uninstallCyberware(itemId, foundationalId);
    } else {
      await this.actor.installCyberware(itemId);
    }
  }

  /**
   * Pops up the dialog box to set life path details, and persists the answers to the actor.
   *
   * @callback
   * @private
   * @returns {null}
   */
  async _setLifepath() {
    // Show "Set Lifepath" dialog.
    const dialogData = await CPRDialog.showDialog(this.actor.system.lifepath, {
      // Set the options for the dialog.
      title: SystemUtils.Localize("CPR.dialog.setLifepath.title"),
      template: `systems/${game.system.id}/templates/dialog/cpr-set-lifepath-prompt.hbs`,
      submitOnChange: false,
      submitOnClose: true,
    }).catch((err) => LOGGER.debug(err));
    if (dialogData === undefined) {
      return;
    }

    await this.actor.setLifepath(dialogData);
  }

  /**
   * This is called when the eye glyph is clicked on the skill tab.
   *
   * @callback
   * @private
   * @param {*} event - object with details of the event
   */
  _toggleSectionVisibility(event) {
    const collapsibleElement = $(event.currentTarget).parents(".collapsible");
    const skillCategory = event.currentTarget.id.replace("-showFavorites", "");
    const categoryTarget = $(collapsibleElement.find(`#${skillCategory}`));

    if ($(collapsibleElement).find(".collapse-icon").hasClass("hide")) {
      $(categoryTarget).click();
    }
    $(collapsibleElement).find(".show-favorites").toggleClass("hide");
    $(collapsibleElement).find(".hide-favorites").toggleClass("hide");
    const itemOrderedList = $(collapsibleElement).children("ol");
    const itemList = $(itemOrderedList).children("li");
    itemList.each((lineIndex) => {
      const lineItem = itemList[lineIndex];
      if ($(lineItem).hasClass("item") && $(lineItem).hasClass("favorite")) {
        $(lineItem).toggleClass("hide");
      }
    });
    if ($(collapsibleElement).find(".show-favorites").hasClass("hide")) {
      if (!this.options.collapsedSections.includes(event.currentTarget.id)) {
        this.options.collapsedSections.push(event.currentTarget.id);
      }
    } else {
      this.options.collapsedSections = this.options.collapsedSections.filter(
        (sectionName) => sectionName !== event.currentTarget.id
      );
      $(categoryTarget).click();
    }
  }

  /**
   * Called when a skill level input field changes. Persists the change to the skill "item"
   * associated with the actor.
   *
   * @callback
   * @private
   * @param {*} event - object with details of the event
   */
  _updateSkill(event) {
    const item = this.actor.getOwnedItem(CPRActorSheet._getItemId(event));
    item.setSkillLevel(parseInt(event.target.value, 10));
    this._updateOwnedItem(item);
  }

  /**
   * Called when the amount of loaded ammunition in a weapon in the Fight tab is changed
   *
   * @callback
   * @private
   * @param {*} event - object with details of the event
   */
  _updateWeaponAmmo(event) {
    const item = this.actor.getOwnedItem(CPRActorSheet._getItemId(event));
    const updateType = SystemUtils.GetEventDatum(event, "data-item-prop");
    if (updateType === "system.magazine.value") {
      if (!Number.isNaN(parseInt(event.target.value, 10))) {
        item.setWeaponAmmo(event.target.value);
      } else {
        SystemUtils.DisplayMessage(
          "error",
          SystemUtils.Localize("CPR.amountnotnumber")
        );
      }
    }
    this._updateOwnedItem(item);
  }

  /**
   * Called when the (in-line) ammount of an item in the gear tab changes
   *
   * @callback
   * @private
   * @param {*} event - object with details of the event
   */
  _updateAmount(event) {
    const item = this.actor.getOwnedItem(CPRActorSheet._getItemId(event));
    if (!Number.isNaN(parseInt(event.target.value, 10))) {
      item.setItemAmount(event.target.value);
    } else {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Localize("CPR.messages.amountNotNumber")
      );
    }
    this._updateOwnedItem(item);
  }

  /**
   * Called when a role ability is changed in the role tab. Role abilities are not objects unlike skills,
   * so this perists those changes to the actor and adjusts sub skills.
   *
   * @callback
   * @private
   * @param {*} event - object with details of the event
   */
  async _updateRoleAbility(event) {
    const item = this.actor.getOwnedItem(CPRActorSheet._getItemId(event));
    const cprItemData = foundry.utils.duplicate(item.system);
    const subskill = SystemUtils.GetEventDatum(event, "data-subskill-name");
    const value = parseInt(event.target.value, 10);
    if (!Number.isNaN(value)) {
      if (foundry.utils.hasProperty(cprItemData, "rank")) {
        if (subskill) {
          const updateSubskill = cprItemData.abilities.filter(
            (a) => a.name === subskill
          );
          if (updateSubskill.length === 1) {
            updateSubskill[0].rank = value;
          } else {
            SystemUtils.DisplayMessage(
              "error",
              SystemUtils.Localize(
                "CPR.messages.multipleAbilitiesWithTheSameName"
              )
            );
          }
        } else {
          cprItemData.rank = value;
        }
        await item.update({ system: cprItemData });
      }
    } else {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Localize("CPR.messages.amountNotNumber")
      );
    }
  }

  /**
   * Create a new active effect for this actor. This sets up all the defaults.
   * Note: It would be nice to add custom properties, but they seem to be ignored by Foundry.
   * This is why we provide a custom CPRActiveEffect object elsewhere in the code base.
   *
   * @async - deleteEffect may pop up a dialog
   * @returns {ActiveEffect} - the newly created or updated document
   */
  async manageEffect(event) {
    event.preventDefault();
    const action = SystemUtils.GetEventDatum(event, "data-action");
    const effectUuid = SystemUtils.GetEventDatum(event, "data-effect-id");
    const effect = Array.from(this.actor.allApplicableEffects()).find(
      (e) => e.uuid === effectUuid
    );
    switch (action) {
      case "create":
        return this.actor.createEffect();
      case "edit":
        return effect.sheet.render(true);
      case "copy":
        return this.actor.copyEffect(effect);
      case "delete":
        return this.actor.constructor.deleteEffect(effect);
      case "toggle":
        return effect.update({ disabled: !effect.disabled });
      default:
        return null;
    }
  }

  /**
   * Called when any of the 3 glyphs to change eurobucks is clicked. This saves the change and a reason
   * if provided to the actor in the for of a "ledger."
   *
   * @callback
   * @private
   * @param {*} event - object with details of the event
   */
  _updateEurobucks(event) {
    let { value } = event.currentTarget.parentElement.parentElement.children[1];
    const reason =
      event.currentTarget.parentElement.parentElement.nextElementSibling
        .lastElementChild.value;
    let action = SystemUtils.GetEventDatum(event, "data-action");
    if (value !== "") {
      value = parseInt(value, 10);
      if (Number.isNaN(value)) {
        action = "error";
      }
      switch (action) {
        case "add": {
          this._gainLedger("wealth", value, `${reason} - ${game.user.name}`);
          break;
        }
        case "subtract": {
          this._loseLedger("wealth", value, `${reason} - ${game.user.name}`);
          break;
        }
        case "set": {
          this._setLedger("wealth", value, `${reason} - ${game.user.name}`);
          break;
        }
        default: {
          SystemUtils.DisplayMessage(
            "error",
            SystemUtils.Localize("CPR.messages.eurobucksModifyInvalidAction")
          );
          break;
        }
      }
    } else {
      SystemUtils.DisplayMessage(
        "warn",
        SystemUtils.Localize("CPR.messages.eurobucksModifyWarn")
      );
    }
  }

  /**
   * Create set a flag on the actor of what their current Fight State is which affects
   * what is viewed in the Fight Tab of the character sheet.
   *
   * Currently the two fight states are valid:
   *
   * "Meatspace" - Fight data relative to combat when not "jacked in"
   * "Netspace"  - Fight data relative to combat when "jacked in"
   *
   * @private
   * @param {Object} event - object capturing event data (what was clicked and where?)
   */
  _toggleFightState(event) {
    const fightState = SystemUtils.GetEventDatum(event, "data-state");
    this.actor.setFlag(game.system.id, "fightState", fightState);
  }

  /**
   * A dispatcher method to do things based on what is clicked in the "net" view of
   * the Fight tab. Mostly this is around rez-management of programs.
   *
   * @async
   * @callback
   * @private
   */
  async _cyberdeckProgramExecution(event) {
    const executionType = SystemUtils.GetEventDatum(
      event,
      "data-execution-type"
    );
    const programId = SystemUtils.GetEventDatum(event, "data-program-id");
    const program = this.actor.getOwnedItem(programId);
    const cyberdeckId = SystemUtils.GetEventDatum(event, "data-cyberdeck-id");
    const cyberdeck = this.actor.getOwnedItem(cyberdeckId);
    const { token } = this;
    switch (executionType) {
      case "rez": {
        if (!program.system.isRezzed) {
          await cyberdeck.rezProgram(program, token);
          this._updateOwnedItem(cyberdeck);
        }
        break;
      }
      case "derez": {
        if (program.system.isRezzed) {
          await cyberdeck.derezProgram(program);
          this._updateOwnedItem(cyberdeck);
        }
        break;
      }
      case "reduce-rez": {
        if (program.system.isRezzed) {
          await cyberdeck.reduceRezProgram(program);
          this._updateOwnedItem(cyberdeck);
        }
        break;
      }
      case "reset-rez": {
        if (program.system.isRezzed) {
          await cyberdeck.resetRezProgram(program);
          this._updateOwnedItem(cyberdeck);
        }
        break;
      }
      case "atk":
      case "def":
      case "damage": {
        await this._onRoll(event);
        break;
      }
      default:
    }

    const updateList = [];
    if (cyberdeck.isOwned && cyberdeck.isEmbedded) {
      updateList.push({ _id: cyberdeck.id, system: cyberdeck.system });
    }

    if (program.isOwned && program.isEmbedded) {
      updateList.push({ _id: program.id, system: program.system });
    }

    if (updateList.length > 0) {
      this.actor.updateEmbeddedDocuments("Item", updateList);
    }
  }
}
