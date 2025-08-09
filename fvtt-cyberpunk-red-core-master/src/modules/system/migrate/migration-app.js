import CPRSystemUtils from "../../utils/cpr-systemUtils.js";
import Progress from "../../utils/Progress.js";
import CPR from "../config.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class MigrationApp extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  constructor(options = {}) {
    super(options);
    this.#migrationRunner = options.migrationRunner;
    /** @type {Object<string,Progress>} */
    this.progress = MigrationApp.prepareProgressBars();

    /** @type {string[]} */
    this.messages = [];

    /**
     * See function docs for more info on this property.
     * @type {Object<string,string[]>}
     */
    this.modPackOptions = MigrationApp.getModPackOptions();

    /** @type {array} */
    this.modPackChoiceIds = [];
  }

  /**
   * The possible phases of the migration application. An error
   * is thrown if you try to set a phase that isn't in this list.
   *
   * @type {Object<string, Object>}
   */
  static PHASES = {
    // This following phases are the standard flow of migrations,
    // from initialization to success.
    init: {}, // TODO: Delete this?
    userConfirm: {
      statusChange: true,
      addMessage: true,
      buttons: {
        confirmMigration: {
          label: "CPR.migration.buttons.confirmMigration",
          icon: "fa-solid fa-diagram-next",
        },
        returnToSetup: {
          label: "CPR.migration.buttons.rejectMigration",
          icon: "fas fa-house",
        },
      },
    },
    prepareDocuments: {
      statusChange: true,
      addMessage: true,
    },
    documentsReady: {},
    migrateMisc: {
      statusChange: true,
    },
    migrateItems: {
      statusChange: true,
      docType: "items",
    },
    applyChangesItems: {},
    migrateActors: {
      statusChange: true,
      docType: "actors",
    },
    applyChangesActors: {},
    migrateScenes: {
      statusChange: true,
      docType: "scenesTokens",
    },
    migrateCompendia: {
      statusChange: true,
      docType: "packsDocs",
    },
    migrationComplete: {
      statusChange: true,
      addMessage: true,
      buttons: {
        refresh: {
          label: "CPR.migration.buttons.refresh",
          iconPre: "fas fa-file-signature",
          iconPost: "fas fa-xmark",
        },
      },
    },
    // This phase is called no matter the result of migration.
    end: {},
    // Below this line are phases which don't follow the standard flow of migration.
    error: {
      statusChange: true,
      addMessage: true,
      buttons: {
        returnToSetup: {
          label: "CPR.migration.buttons.returnToSetup",
          iconPre: "fas fa-bug",
          iconPost: "fas fa-house",
        },
      },
    },
    userPrevented: {
      statusChange: true,
      addMessage: true,
      buttons: {
        returnToSetup: {
          label: "GAME.ReturnSetup",
          iconPre: "fas fa-house",
        },
      },
    },
  };

  /** The current phase of the migration application. */
  #currentPhase = "init";

  /**
   * The phase of the migration application in which an error occurred.
   *
   * @type {string}
   */
  #errorPhase;

  /**
   * Object to store useful, dynamic data that can't be included in `MigrationApp.PHASES`,
   * (because it might not yet exist).
   *
   * @type {Object<string, Object>}
   * @property {Object.<string, number | string>} [messageData] - an object containing key-value pairs for substitution in i18n.
   */
  phaseContext = {};

  /** The index of the currently viewed message. */
  currentMessageIndex = 0;

  /** Whether the user has changed the message. */
  userChangedMessage = false;

  /** A Set of indices of unread messages. */
  unreadMessages = new Set();

  /** The time the last displayed message was added. */
  #lastMsgTime = Date.now();

  /**
   * A private reference to the migration runner which created this app.
   *
   * @type {MigrationRunner}
   */
  #migrationRunner;

  /** @type {Function} */
  confirmMigration;

  /** @type {Function} */
  rejectMigration;

  /**
   * Getter to access the migration runner that created this app.
   * @returns {MigrationRunner}
   */
  get migrationRunner() {
    return this.#migrationRunner;
  }

  /**
   * Returns the current phase of the MigrationApp.
   *
   * @return {string}
   */
  get currentPhase() {
    return this.#currentPhase;
  }

  /**
   * Returns the error phase of the MigrationApp, if one occurred.
   *
   * @return {string}
   */
  get errorPhase() {
    return this.#errorPhase;
  }

  /**
   * Gets the buttons based on the current phase.
   *
   * @return {object}
   */
  get buttons() {
    const phase = this.#currentPhase;
    return MigrationApp.PHASES[phase].buttons || null;
  }

  /**
   * Calculates the localized current status of the migration application.
   *
   * @return {string|null}
   */
  get currentStatus() {
    const phase = this.#currentPhase;
    const phaseData = MigrationApp.PHASES[phase];
    const { docType, statusChange } = phaseData;
    if (!statusChange) return null;
    let statusString = game.i18n.localize(`CPR.migration.status.${phase}`);
    if (docType) {
      statusString = game.i18n.format("CPR.migration.status.migratingDocs", {
        docType: game.i18n.localize(`CPR.migration.docType.${docType}`),
      });
    }
    return statusString;
  }

  /**
   * Checks if the MigrationRunner has successfully completed all migrations.
   * @returns {Boolean}
   */
  get migrationSuccessful() {
    return this.migrationRunner.migrationSuccessful;
  }

  /**
   * Get the devMode options for the MigrationApp.
   *
   * @returns {object}
   */
  get devMode() {
    return this.migrationRunner.constructor.devMode.app;
  }

  /**
   * Not explicitly an override, but rather Foundry itself merges this object
   * up the prototype chain.
   */
  static DEFAULT_OPTIONS = {
    id: "cpr-migration",
    classes: ["dialog", "cpr-migration-dialog"],
    tag: "dialog",
    window: {
      title: "CPR.migration.app.title",
    },
    position: {
      width: 650,
      height: 600,
    },
    actions: {
      returnToSetup: MigrationApp.returnToSetup,
      navigate: MigrationApp.navigateMessages,
      confirmMigration: MigrationApp.confirmMigration,
      togglePackSelection: MigrationApp.togglePackSelection,
      refresh: MigrationApp.refresh,
    },
    modal: true,
  };

  /**
   * This is how we tell AppV2 which templates to use. Note the following, taken from the wiki:
   *   - Each part should return a single HTML element, i.e. only one pair of top-level tags.
   *   - The parts are concatenated in the order of the static property
   *   - All parts are encapsulated by the top-level tag set in DEFAULT_OPTIONS.tag.
   */
  static PARTS = {
    body: {
      template: `systems/cyberpunk-red-core/templates/migration/migration-app.hbs`,
    },
  };

  /**
   * This is how we prepare the context for the template. Equivalent to `getData()`
   * in AppV1, but is always async.
   *
   * Note: Basic DOM manipulation is what is used to change things in the migration app,
   * so this is really only called on first render.
   *
   * @override
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.runner = this.migrationRunner;
    context.progress = this.progress;
    context.status = this.currentStatus;
    context.messages = this.messages;
    context.currentMessage = this.currentMessageIndex + 1;
    context.buttons = this.buttons;

    // Gather modules that have relevant compendia.
    const defaultMods = game.settings.get(game.system.id, "moduleMigrationIds");
    context.packModules = {};
    Object.keys(this.modPackOptions).forEach((moduleId) => {
      const mod = game.modules.get(moduleId);
      const modData = {
        title: mod.title,
        selected: defaultMods.includes(moduleId),
      };
      context.packModules[moduleId] = modData;
    });

    // Gather relevant world compendia.
    context.worldPacks = {};
    game.packs
      .filter(
        (p) =>
          ["Actor", "Item", "Scene"].includes(p.metadata.type) &&
          p.metadata.packageType === "world"
      )
      .forEach((p) => {
        context.worldPacks[p.metadata.id] = p.metadata.label;
      });
    return context;
  }

  /** @override */
  _onFirstRender(_context, _options) {
    const { element } = this;
    const devModeShowModal = this.devMode.modal;
    if (this.options.modal && devModeShowModal) element.showModal();
    else element.show();

    this.renderNav(); // Hide nav buttons.

    // Hide the close button in the window header.
    const headerCloseButton = element.querySelector(
      ".window-header [data-action='close']"
    );
    headerCloseButton.style = "display: none";
  }

  /** @override */
  _onRender(context, options) {
    const dialog = this.element;
    dialog.addEventListener("keydown", this._preventEscape.bind(this));
  }

  /**
   * Handle keypresses within the dialog. This code is taken from Foundry's.
   * @param {KeyboardEvent} event  The triggering event.
   * @protected
   */
  _preventEscape(event) {
    // Capture Escape keypresses for dialogs to ensure that close is called properly.
    // The default behavior of `<dialog>` elements is to close on Escape keypress.
    if (event.key === "Escape") {
      event.preventDefault(); // Prevent default browser dialog dismiss behavior.
      event.stopPropagation();
    }
  }

  /**
   * Prevent user from closing dialog.
   * @override
   */
  close(options = {}) {
    // Should not be able to close the dialog for any reason.
    // Leaving this empty function as an override, so that the
    // super method cannot be called.
  }

  /**
   * Refresh the page when the migration is complete.
   * @returns {void}
   */
  static refresh() {
    if (!this.migrationSuccessful) return;
    window.location.reload();
  }

  /**
   * Map of module id to array of relevant pack ids.
   * Relevant packs are ones that can be migrated,
   * i.e., they contain actors, items, or scenes.
   * @type {Object<string,string[]>}
   */
  static getModPackOptions() {
    const compendiaTypes = ["Actor", "Item", "Scene"];

    // Gather modules with relevant compendia.
    const modPackOptions = {};
    game.modules.forEach((module) => {
      const filteredPacks = module.packs.filter((p) =>
        compendiaTypes.includes(p.type)
      );
      if (filteredPacks.size === 0) return;
      const packIds = filteredPacks.map((p) => p.id);
      modPackOptions[module.id] = packIds;
    });

    return modPackOptions;
  }

  /**
   * Toggles the selection of a pack by adding or removing the 'text-pill' class.
   *
   * @param {Event} event - The event that triggered the toggle.
   * @param {HTMLElement} target - The element with [data-action] attribute which triggered the event.
   * @return {void}
   */
  static togglePackSelection(event, target) {
    if (target === event.target) return; // Prevent double click of label/checkbox.
    target.classList.toggle("text-pill");
  }

  /**
   * Confirms the pack selection by processing the form data,
   * and updates `this.modPackChoiceIds`.
   *
   * @returns {void}
   */
  confirmPackSelection() {
    const formElement = this.element.querySelector("form");
    const fd = new FormDataExtended(formElement);
    const formData = foundry.utils.expandObject(fd.object);

    // If single option, `formData.moduleChoices` is not an array.
    // Make it an array if this is the case.
    if (!Array.isArray(formData.moduleChoices)) {
      formData.moduleChoices = [formData.moduleChoices];
    }

    // Filter out empty values.
    const moduleChoiceIds = formData.moduleChoices.filter((c) => c);

    // Save user choices, if indicated.
    if (formData.saveSelection)
      game.settings.set(game.system.id, "moduleMigrationIds", moduleChoiceIds);

    if (moduleChoiceIds.length === 0) return;

    // Update `this.modPackChoiceIds` so value can be read by the MigrationRunner.
    const chosenPackIds = [];
    Object.entries(this.modPackOptions).forEach(([moduleId, packIdList]) => {
      if (!moduleChoiceIds.includes(moduleId)) return;
      chosenPackIds.push(...packIdList);
    });
    this.modPackChoiceIds = chosenPackIds;
  }

  /**
   * Navigate between messages, forward or back.
   *
   * The following parameters were taken from the wiki.
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
   */
  static navigateMessages(event, target) {
    if (!this.userChangedMessage) this.userChangedMessage = true;
    const { direction } = target.dataset;

    const { currentMessageIndex } = this;

    const newIndex =
      direction === "back" ? currentMessageIndex - 1 : currentMessageIndex + 1;
    if (newIndex < 0 || newIndex >= this.messages.length) return;
    this.currentMessageIndex = newIndex;
    this.unreadMessages.delete(newIndex);

    const message = this.messages[newIndex];
    const messagesElement = this.element.querySelector(".messages");
    const messageElement = messagesElement.querySelector(".message");
    messageElement.innerHTML = message;
    this.renderNav(); // Show/hide nav buttons.
  }

  /**
   * Shows the changelog journal.
   *
   * @return {Promise<void>}
   */
  static async showChangelog() {
    // Pop Up the relevant Changelog Journal from
    const changelog = await CPRSystemUtils.GetCompendiumDoc(
      CPR.changelogCompendium,
      `Changelog ${CONFIG.supportedLanguages[game.i18n.lang]}`
    );
    changelog.sheet.render(true);
  }

  /**
   * Creates the promise that will be resolved by the user
   * by confirming or returning to setup.
   *
   * @return {Promise<Boolean>} Resolves to true if the user confirms, false otherwise.
   */
  userConfirm() {
    return new Promise((resolve) => {
      this.confirmMigration = () => resolve(true);
      this.rejectMigration = () => resolve(false);
    });
  }

  /**
   * Confirms the migration by processing the pack selection and
   * calling the instance (non-static) function of the same name,
   * which will resolve the `this.confirmMigration` promise.
   *
   * @return {void}
   */
  static confirmMigration() {
    this.confirmPackSelection();
    this.confirmMigration();
  }

  /**
   * Download report, if applicable, and then return to setup.
   * Remember, `this` is the MigrationApp instance, not the class,
   * even though the function is static (this is a Foundry quirk).
   */
  static returnToSetup() {
    if (this.currentPhase === "userConfirm") this.rejectMigration();
    if (this.errorPhase) MigrationApp.downloadReport();
    if (!this.devMode.returnToSetup) return;
    game.shutDown();
  }

  /**
   * Generates a migration error report and downloads it as a JSON file.
   *
   * @return {void}
   */
  static downloadReport() {
    const { error } = game.cpr.MigrationRunner;
    const date = new Date();
    let monthString = date.getMonth() + 1;
    if (monthString < 10) monthString = `0${monthString}`;
    let dayString = date.getDate();
    if (dayString < 10) dayString = `0${dayString}`;

    const dateString = `${date.getFullYear()}${monthString}${dayString}`;
    const filename = `Migration Error Report - ${game.system.id} - ${dateString}`;

    /** Serialize Sets to arrays for JSON.stringify */
    function replacer(key, value) {
      if (!(value instanceof Set)) return value;
      return Array.from(value);
    }

    // This function is provided by Foundry's API.
    saveDataToFile(
      JSON.stringify(error, replacer, 2),
      "text/json",
      `${filename}.json`
    );
  }

  /**
   * Prepares progress bars for each document type based on the total number of documents.
   *
   * @return {Object<string,Progress>} - An object containing progress bars for each document type.
   *                                   - The keys are document types and values are Progress objects.
   */
  static prepareProgressBars() {
    const progressBars = {};
    for (const [docType, label] of Object.entries(CPR.migrationDocTypes)) {
      const classes =
        docType === "tokens" || docType === "packDocuments"
          ? ["sub-category"]
          : [];
      progressBars[docType] = new Progress({
        id: `migration-progress-${docType}`,
        label,
        max: null, // We will set this later.
        classes,
      });
    }
    return progressBars;
  }

  /**
   * Sets the current phase of the migration application,
   * and calls the appropriate method. Throws an error if
   * the provided phase value is not in the list of possible phases.
   *
   * @param {string} value - The new phase value to set.
   * @param {PhaseContext} phaseContext - Object to store useful data that can't be included in MigrationApp.PHASES.
   */
  async setCurrentPhase(value, phaseContext) {
    if (!Object.keys(MigrationApp.PHASES).includes(value)) {
      throw new Error(`Invalid phase: ${value}`);
    }

    if (phaseContext) this.phaseContext = phaseContext;
    // Set phase that caused error, and attach info to error.
    if (value === "error") {
      this.#errorPhase = this.#currentPhase;
      const { error } = this.migrationRunner;
      error.data.migrationData.errorPhase = this.#errorPhase;
    }
    this.#currentPhase = value;
    await this.onPhaseChange();
  }

  /**
   * Handles the change of the current phase in the MigrationApp.
   * Calls the appropriate function for the current phase.
   *
   * NOTE: Phase-change functions should only change the state of the MigrationApp,
   * not the state of the migration/runner itself.
   *
   * @return {Promise<void>}
   */
  async onPhaseChange() {
    const phase = this.#currentPhase;
    const functionName = `on${phase.capitalize()}`;
    this.changeStatus(); // Change status message.
    await this.addMessage();
    await this.addButtons();
    if (typeof this[functionName] !== "function") return;
    await this[functionName](); // Call the function for this phase.
  }

  /**
   * Forces user to click and hold to confirm.
   *
   * @return {Promise<void>}
   */
  async onUserConfirm() {
    const confirmButton = this.element.querySelector(
      ".migration-button[data-action='confirmMigration']"
    );
    // Set button's position relative, so that the hold-meter
    // we create can be positioned correctly.
    confirmButton.style = "position: relative";
    confirmButton.setAttribute("data-tooltip", "Click and Hold");
    confirmButton.setAttribute("data-tooltip-direction", "DOWN");

    // Prevent Foundry default click event from firing for now.
    // Name function so we can delete it later.
    const stopImmediatePropagation = (event) => {
      event.stopImmediatePropagation();
    };
    confirmButton.addEventListener("click", stopImmediatePropagation);

    // The div that grows in size within the button, while the user
    // clicks and holds.
    const holdMeter = document.createElement("div");
    holdMeter.classList.add("hold-meter");
    confirmButton.appendChild(holdMeter);

    // Grow hold-meter while holding
    confirmButton.addEventListener("mousedown", () => {
      holdMeter.classList.add("mouse-down");
    });

    // Shrink hold-meter after releasing mouse (anywhere in window).
    // Name the function so we can remove it later.
    const mouseUpListener = () => {
      holdMeter.classList.remove("mouse-down");
    };
    window.addEventListener("mouseup", mouseUpListener);

    // Click the button when the hold-meter is full.
    holdMeter.addEventListener("transitionend", () => {
      if (holdMeter.classList.contains("mouse-down")) {
        // Re-allow Foundry default click event.
        confirmButton.removeEventListener("click", stopImmediatePropagation);
        confirmButton.click(); // Click!
        // Remove mouseup listener from window.
        window.removeEventListener("mouseup", mouseUpListener);
      }
    });
  }

  /**
   * Handles the phase when document preparation begins.
   * Removes the user confirmation buttons and replaces
   * compendia selection form with progress section.
   *
   * @return {Promise<void>}
   */
  async onPrepareDocuments() {
    // Remove user confirmation buttons
    const userConfirmButtons = this.element.querySelector(".buttons");
    userConfirmButtons.remove();

    // Replace compendia selection form with progress section.
    const progressTemplate = await renderTemplate(
      `systems/${game.system.id}/templates/migration/migration-progress.hbs`,
      { progress: this.progress }
    );

    // Create dummy element.
    const htmlTemplate = document.createElement("template");
    htmlTemplate.innerHTML = progressTemplate;
    const [progressElement] = htmlTemplate.content.children;

    // Hide the progress count until we actually have calculated the max.
    progressElement.querySelectorAll(".progress-count").forEach((elem) => {
      elem.style = "display: none";
    });

    // Replace form with progress element.
    const compendiaChoiceSection = this.element.querySelector(".progress form");
    compendiaChoiceSection.replaceWith(progressElement);
  }

  /**
   * Handles the phase of the MigrationApp when the documents are ready.
   * Sets the element, max value, and renders the progress bar
   * for each document type.
   *
   * @return {Promise<void>} A promise that resolves when the progress bars are set and rendered.
   */
  async onDocumentsReady() {
    for (const [docType, progress] of Object.entries(this.progress)) {
      progress.element = this.element.querySelector(
        `#migration-progress-${docType}`
      );
      progress.max = this.migrationRunner.totalDocs[docType];
      progress.render();
    }
    const totalElement = this.element.querySelector(".total-docs");
    totalElement.innerHTML = `(${this.migrationRunner.totalDocs.total})`;

    // Show the progress count once we have calculated the max.
    this.element.querySelectorAll(".progress-count").forEach((elem) => {
      elem.style = "";
    });
  }

  /**
   * Handles the error phase of the MigrationApp.
   *
   * @return {Promise<void>}
   */
  async onError() {
    this.generateOverlay({ text: "CPR.migration.app.overlay.error" });
  }

  /**
   * Handles the phase of the MigrationApp when the user
   * is prevented from migrating
   *
   * @return {Promise<void>}
   */
  async onUserPrevented() {
    this.generateOverlay({
      text: "CPR.migration.app.overlay.warning",
      classes: ["warning"],
    });
  }

  /**
   * Handles the phase of the MigrationApp when the migrations are complete.
   *
   * @return {Promise<void>}
   */
  async onMigrationComplete() {
    this.generateOverlay({
      text: "CPR.migration.app.overlay.success",
      classes: ["success"],
    });
  }

  /**
   * Generate an overlay that prevents button presses and makes
   * an error super obvious.
   *
   * @param {Object} [options] - Options for the overlay
   * @property {string} [text] - Text to display in the overlay
   * @property {string} [classes] - CSS classes to apply to the overlay
   * @return {void}
   */
  generateOverlay({ text, classes = [] } = {}) {
    const { element } = this;
    const alertOverlay = element.querySelector(".alert-overlay");
    const alertText = alertOverlay.querySelector(".alert-text");

    // Replace text element.
    if (text) alertText.innerHTML = game.i18n.localize(text);

    // Show overlay and size appropriately.
    const container = element.querySelector("ol.dialog-list");
    const { height, width } = getComputedStyle(container);
    alertOverlay.style.height = height;
    alertOverlay.style.width = width;
    alertOverlay.style["line-height"] = height;

    // Add custom classes.
    alertOverlay.classList.add(...classes);
  }

  /**
   * Handles the end phase of the MigrationApp, which is reached regardless
   * of migration outcome.
   *
   * Remove spinner.
   *
   * @return {Promise<void>}
   */
  async onEnd() {
    const { element } = this;
    const spinner = element.querySelector(".spinner");
    spinner.style = "display: none";
  }

  /**
   * Updates the status element based on the current phase.
   *
   * @return {void}
   */
  changeStatus() {
    const { element } = this;
    const statusString = this.currentStatus;
    if (!statusString) return;
    const statusElement = element.querySelector(".progress-status");
    statusElement.innerHTML = statusString;
  }

  /**
   * Adds a message to the MigrationApp based on the current phase.
   *
   * @return {Promise<void>}
   */
  async addMessage() {
    const phase = this.#currentPhase;
    const { addMessage } = MigrationApp.PHASES[phase];
    const { messageData } = this.phaseContext;
    if (!addMessage) return;

    // Add the message.
    let message = game.i18n.localize(`CPR.migration.messages.${phase}`);
    if (messageData) {
      message = game.i18n.format(
        `CPR.migration.messages.${phase}`,
        messageData
      );
    }
    this.messages.push(message);

    // We force show a message if migration was aborted.
    // Otherwise, we only show it if the user has not changed the message manually.
    const forceShowMessage = phase === "error" || phase === "userPrevented";
    if (forceShowMessage || !this.userChangedMessage) {
      this.currentMessageIndex = this.messages.length - 1;
      const messagesElement = this.element.querySelector(".messages");
      const messageElement = messagesElement.querySelector(".message");
      messageElement.innerHTML = message;

      // If user didn't have ample time to read a message, mark it as unread.
      const now = Date.now();
      if (this.messages.length > 1 && now - this.#lastMsgTime < 5000) {
        this.unreadMessages.add(this.messages.length - 2);
      }
      this.#lastMsgTime = Date.now();
    } else {
      // Mark unread messages.
      this.unreadMessages.add(this.messages.length - 1);
    }

    this.renderNav(); // Show/hide nav buttons and update message count.
  }

  /**
   * Shows/hides navigation icons based on the number of messages and current message index.
   * Updates message count.
   *
   */
  renderNav() {
    const messageCount = this.messages.length;
    const { currentMessageIndex } = this;

    // Update message count.
    const messageCountElement = this.element.querySelector(".message-count");
    const messageCountString = `${currentMessageIndex + 1}/${messageCount}`;
    messageCountElement.innerHTML = messageCountString;

    // Show unread messages icon, if any.
    const notificationIcon = this.element.querySelector(".notification-icon");
    notificationIcon.style = "display: none";
    if (this.unreadMessages.size) {
      notificationIcon.style = "";
      notificationIcon.setAttribute(
        "data-tooltip",
        CPRSystemUtils.Format("CPR.migration.app.unreadMessages", {
          messages: Array.from(this.unreadMessages)
            .map((i) => i + 1)
            .join(", "),
        })
      );
    }

    // Show/hide previous and next icons.
    const [prevIcon, nextIcon] =
      this.element.querySelectorAll(".message-nav > i");
    prevIcon.style = "";
    nextIcon.style = "";

    if (messageCount <= 1) {
      prevIcon.style = "display: none";
      nextIcon.style = "display: none";
      return;
    }

    const atFirst = currentMessageIndex === 0;
    const atLast = currentMessageIndex === messageCount - 1;
    if (atFirst) {
      prevIcon.style = "display: none";
    }
    if (atLast) {
      nextIcon.style = "display: none";
    }
  }

  /**
   * Adds buttons to the migration app based on the current phase.
   *
   * @return {Promise<void>}
   */
  async addButtons() {
    if (!this.buttons) return;
    const buttonsTemplate = await renderTemplate(
      `systems/${game.system.id}/templates/migration/migration-buttons.hbs`,
      this.buttons
    );
    const messagesElement = this.element.querySelector(".messages");
    const htmlTemplate = document.createElement("template");
    htmlTemplate.innerHTML = buttonsTemplate;
    const [element] = htmlTemplate.content.children;
    messagesElement.appendChild(element);
  }
}

/**
 * Strings that are generated programatically, pasted here to
 * pass our language-unused-strings test.
 *
 * CPR.migration.docType.packsDocs
 * CPR.migration.docType.scenesTokens
 * CPR.migration.messages.error
 * CPR.migration.messages.migrationComplete
 * CPR.migration.messages.prepareDocuments
 * CPR.migration.messages.userConfirm
 * CPR.migration.messages.userPrevented
 * CPR.migration.status.error
 * CPR.migration.status.migrationComplete
 * CPR.migration.status.migrateMisc
 * CPR.migration.status.prepareDocuments
 * CPR.migration.status.userConfirm
 * CPR.migration.status.userPrevented
 */
