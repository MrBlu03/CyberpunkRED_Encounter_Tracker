import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Form application to handle dialogs more generally.
 */
export default class CPRDialog extends FormApplication {
  constructor(dialogData, options) {
    super(dialogData, options);

    // Overwrite default buttons if indicated.
    if (this.options.overwriteButtons) {
      this.options.buttons = options.buttons;
    }
    this.objectData = dialogData.object;
  }

  /**
   * Set default options for the ledger.
   * See https://foundryvtt.com/api/Application.html for the complete list of options available.
   *
   * @static
   * @override
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/dialog/cpr-default-prompt.hbs`,
      title: "CPR.global.generic.title",
      width: 400,
      height: "auto",
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: false,
      buttons: {
        confirm: {
          icon: "fas fa-check",
          label: SystemUtils.Localize("CPR.dialog.common.confirm"),
          callback: (dialog) => dialog.confirmDialog(),
        },
        cancel: {
          icon: "fas fa-xmark",
          label: SystemUtils.Localize("CPR.dialog.common.cancel"),
          callback: (dialog) => dialog.closeDialog(),
        },
      },
      buttonDefault: "confirm",
      overwriteButtons: false, // If calling showDialog with custom buttons, override defaults or not.
    });
  }

  /**
   * Prepares data for roll dialog sheet.
   *
   * @override
   */
  getData() {
    const data = super.getData();
    Object.entries(this.object).forEach(([key, value]) => {
      data[key] = value;
    });
    return data;
  }

  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;

    // Select all text when grabbing text input.
    $("input[type=text]").focusin(() => $(this).select());
    $("input[type=number]").focusin(() => $(this).select());

    html
      .find(".item-checkbox")
      .click((event) => this._itemCheckboxToggle(event)); // Currently unused, see below.

    // Handle button presses.
    html.find(".cpr-dialog-button").click((event) => {
      const buttonName = event.currentTarget.name;
      // Execute callback function when dialog buttons are pressed.
      this.options.buttons[buttonName].callback(this);
    });
    this.element
      .find(".header-button.close")
      .click((event) => this.closeDialog(event));
  }

  /**
   * This works in the same way it does on the item sheets.
   * It can turn anything into a pseudo checkbox, which look nicer than the default ones.
   *
   * @param {*} event
   */
  _itemCheckboxToggle(event) {
    const dialogData = this.object;
    const target = SystemUtils.GetEventDatum(event, "data-target");
    const value = !foundry.utils.getProperty(dialogData, target);
    if (foundry.utils.hasProperty(dialogData, target)) {
      foundry.utils.setProperty(dialogData, target, value);
    } else {
      LOGGER.error(
        `The target (${target}) does not exist in the dialogData.`,
        dialogData
      );
    }
    this.render();
  }

  /**
   * This will confirm the roll and resolve the Promise originally created when CPRDialog.showDialog is called.
   *
   * @param {Object} options - potential options to pass to this.close; currently unused;
   */
  async confirmDialog(event, options) {
    // Taken from Starfinder: Fire callback that resolves original promise.
    this.options.confirmDialog();
    return this.close(options);
  }

  /**
   * This will cancel/close the roll and reject the Promise originally created when CPRDialog.showDialog is called.
   *
   * @param {Object} options - potential options to pass to this.close; currently unused;
   */
  async closeDialog(event, options) {
    this.options.closeDialog();
    return this.close(options);
  }

  /**
   * Creates a promise to be resolved when the dialog is confirmed. One can also override default options here.
   *
   * @param {...args<Object>} - The first argument should be the object that is being changed by the dialog.
   *                          - The final argument (optional) is options to pass to the dialog.
   *                          - See defaultOptions for a breakdown of these options.
   *                          - See constructors to know how many arguments each dialog Class expects.
   */
  static async showDialog(...args) {
    return new Promise((resolve, reject) => {
      const dialog = new this(...args);
      dialog.options.confirmDialog = () => resolve(args[0]);
      dialog.options.closeDialog = () => reject(args[0]);
      dialog.render(true);
    });
  }

  /**
   * Foundry provides this function, which is necessary to override for FormApplications.
   *
   * @param {*} event
   * @param {Object} formData - Updated dialog data to be merged with the original object.
   * @override
   */
  async _updateObject(event, formData) {
    const fd = foundry.utils.duplicate(formData);
    foundry.utils.mergeObject(this.object, fd);
    this.render(true); // rerenders the FormApp with the new data.
  }
}
