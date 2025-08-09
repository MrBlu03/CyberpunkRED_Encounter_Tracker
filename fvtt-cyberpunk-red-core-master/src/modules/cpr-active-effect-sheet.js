/* eslint-env jquery */
import CPRMod from "./rolls/cpr-modifiers.js";
import CPR from "./system/config.js";
import LOGGER from "./utils/cpr-logger.js";
import SystemUtils from "./utils/cpr-systemUtils.js";

/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 * @extends {ActiveEffect}
 */
export default class CPRActiveEffectSheet extends ActiveEffectConfig {
  /**
   * We provide our own ActiveEffects sheet to improve the UX a bit. Specifically this
   * allows us to implement user-readable keys for the mods, and different "usage" types.
   * Most of that logic lives in cpr-active-effect.js.
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/effects/cpr-active-effect-sheet.hbs`,
      width: "auto",
      height: "auto",
      // Submit on close to prevent an edge case where a user adds and active effect, but doesn't change anything.
      // If they closed the dialog (without submitting) then there was just a blank AE on their sheet. This setting prevents that.
      submitOnClose: true,
    });
  }

  /**
   * Prepares data for the CPRActiveEffectSheet.
   *
   * @override
   * @return {Promise<Object>} The prepared data.
   */
  async getData() {
    const data = await super.getData();
    const cprData = {};
    // Convert Changes into CPRMods, which have a more convenient data structure.
    const modList = CPRMod.getAllModifiers([this.object], true);

    // Prepare input elements for each Change.
    modList.forEach((change, i) => {
      const name = `changes.${i}.key`;
      const selectClasses = ["key-key", "force-submit"];
      const value = change.key;
      switch (change.category) {
        // Prepare the select drop-down for skill keys.
        case "skill": {
          const skillOptionConfigs = CPRActiveEffectSheet.getSkillOptionConfigs(
            this.object
          );
          const select = foundry.applications.fields.createSelectInput({
            name,
            options: skillOptionConfigs,
            value,
          });
          select.classList.add(...selectClasses);
          change.keyInput = new Handlebars.SafeString(select.outerHTML);
          break;
        }
        // Prepare the text input for custom keys.
        case "custom": {
          const textInput = foundry.applications.fields.createTextInput({
            name,
            value,
          });
          textInput.classList.add("key-input");
          change.keyInput = new Handlebars.SafeString(textInput.outerHTML);
          break;
        }
        // Prepare the select drop-down for all other keys.
        default: {
          const otherOptionConfigs = CPRActiveEffectSheet.getOtherOptionConfigs(
            this.object
          );
          const select = foundry.applications.fields.createSelectInput({
            name,
            options: otherOptionConfigs[change.category],
            value,
          });
          select.classList.add(...selectClasses);
          change.keyInput = new Handlebars.SafeString(select.outerHTML);
          break;
        }
      }
    });

    cprData.modList = modList;
    return foundry.utils.mergeObject(data, cprData);
  }

  /**
   * Some elements of the active effects sheet need special handling when they are changed
   * because of the flag limitation imposed by Foundry.
   *
   * @param {Object} html - the DOM object
   */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;

    // QoL - Select all text when grabbing text input.
    $("input[type=text]").focusin(() => $(this).select());
    html.find(".force-submit").change(() => this._forceSubmit());
    html
      .find(".effect-key-category")
      .change((event) => this._changeModKeyCategory(event));
    html
      .find(".effect-change-control")
      .click((event) => this._effectChangeControl(event));
    html
      .find(".toggle-situational")
      .click((event) => this._toggleSituational(event));
    html
      .find(".toggle-on-by-default")
      .click((event) => this._toggleOnByDefault(event));
  }

  /**
   * A function we call when we want to force form submission (to make sure that a change is properly registered).
   *
   * Sometimes, if you input a change on the sheet, and then make another change somewhere else on the sheet,
   * the original change gets ovverriden, since it was not submitted. This function addresses that by
   * making sure information passed to the sheet gets stored/submitted before another change occurs.
   *
   * This function also helps achieve a secondary, more specific goal: prevent duplicate change keys on the same AE. How?
   * In the handlebars template, change keys that already exist on this AE are disabled.
   * Submitting rerenders the sheet, disabling the correct values in the drop-down so that they cannot be selected again.
   *
   * @async
   * @callback
   * @private
   */
  async _forceSubmit() {
    this.submit({
      preventClose: true,
    });
  }

  /**
   * Change the key category flag on an active effect.
   * Also submit the form to prevent duplicate change keys on the same AE. (see _forceSubmit's jsdocs)
   *
   * @async
   * @callback
   * @private
   */
  async _changeModKeyCategory(event) {
    const effect = this.object;
    const modnum = event.currentTarget.dataset.index;
    const keyCategory = event.target.value;

    await effect.setModKeyCategory(modnum, keyCategory);

    // Stats cannot currently be situational. This bit of code sets situational flags to false when the
    // Stat category is selected in the active effects dialog.
    if (effect.getFlag(game.system.id, `changes.cats.${modnum}`) === "stat") {
      await effect.setFlag(
        game.system.id,
        `changes.situational.${modnum}.isSituational`,
        false
      );
      await effect.setFlag(
        game.system.id,
        `changes.situational.${modnum}.onByDefault`,
        false
      );
    }
    return this._forceSubmit();
  }

  /**
   * Dispatcher that does thing to the "changes" array of an Active Effect. That is
   * where the mods are managed.
   *
   * @callback
   * @private
   * @param {Object} event - mouse click event
   * @returns (varies by action)
   */
  _effectChangeControl(event) {
    event.preventDefault();
    switch (event.currentTarget.dataset.action) {
      case "add":
        return this._addEffectChange();
      case "delete":
        return this._deleteEffectChange(event);
      default:
    }
    return null;
  }

  /**
   * Toggles the change as situational or not.
   *
   * @callback
   * @private
   * @param {Object} event - mouse click event
   */
  async _toggleSituational(event) {
    const effect = this.object;
    const modnum = SystemUtils.GetEventDatum(event, "data-index");
    const isSituational = event.target.checked;

    await effect.setFlag(
      `${game.system.id}`,
      `changes.situational.${modnum}.isSituational`,
      isSituational
    );

    this._forceSubmit();
  }

  /**
   * If the change is situational, toggle whether it should be on by default.
   *
   * @callback
   * @private
   * @param {Object} event - mouse click event
   */
  async _toggleOnByDefault(event) {
    const effect = this.object;
    const modnum = SystemUtils.GetEventDatum(event, "data-index");
    const onByDefault = event.target.checked;

    await effect.setFlag(
      `${game.system.id}`,
      `changes.situational.${modnum}.onByDefault`,
      onByDefault
    );

    this._forceSubmit();
  }

  /**
   * Handle adding a new change (read: mod) to the changes array. A new
   * changes is always added to the end of the array, never in the middle.
   *
   * @async
   * @private
   */
  async _addEffectChange() {
    const idx = this.document.changes.length;
    LOGGER.debug(`adding change defaults for changes.${idx}`);
    return this.submit({
      preventClose: true,
      updateData: {
        [`changes.${idx}`]: {
          key: "",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "0",
        },
        // we set the default "key category" here.
        // we also give it a "situational" flag.
        [`flags.${game.system.id}.changes.cats.${idx}`]: "skill",
        [`flags.${game.system.id}.changes.situational.${idx}`]: {
          isSituational: false,
          onByDefault: false,
        },
      },
    });
  }

  /**
   * Delete a change (read: mod) provided by an active effect. If the deleted change is in the
   * middle of the list, we need to collapse all of the flags beyond it down one "element".
   * (regenerating from scratch is actually hard because you cannot reverse look up what the
   * values should be due to AEs and custom skills)
   *
   * We play a few games with casting between Number and String to avoid writing migration code.
   *
   * @param {*} event - Mouse click event (someone clicked a trashcan)
   * @returns - whether re-rendering the sheet was successful
   */
  async _deleteEffectChange(event) {
    const modnum = parseInt(event.currentTarget.dataset.index, 10);
    // First, delete the change itself in the AE
    const { changes } = this.object;
    changes.splice(modnum, 1);
    // Second, remove the corresponding flag for the deleted change
    const changeFlags = foundry.utils.getProperty(
      this.object,
      `flags.${game.system.id}.changes`
    );
    const newFlags = { cats: {}, situational: {} };
    const flagArrayCats = Object.entries(changeFlags.cats);
    const flagArraySituational = Object.entries(changeFlags.situational);

    // First, sort and reorder the flags for the effect's category.
    flagArrayCats.sort(); // explicitly sort to guarantee we iterate in numerical order
    flagArrayCats.forEach((chg) => {
      const index = Number(chg[0]);
      const category = chg[1];
      if (index < modnum) {
        newFlags.cats[String(index)] = category;
        // we deliberately skip idx === modnum, that's the deleted change
      } else if (index > modnum) {
        newFlags.cats[String(index - 1)] = category;
      }
    });

    // Then, sort and reorder the flags for the effect's situational settings.
    flagArraySituational.sort(); // explicitly sort to guarantee we iterate in numerical order
    flagArraySituational.forEach((chg) => {
      const index = Number(chg[0]);
      const situationalSettings = chg[1];
      if (index < modnum) {
        newFlags.situational[String(index)] = situationalSettings;
        // we deliberately skip idx === modnum, that's the deleted change
      } else if (index > modnum) {
        newFlags.situational[String(index - 1)] = situationalSettings;
      }
    });

    // Finally, update the underlying AE
    const prop = `flags.${game.system.id}.changes`;
    const update = await this.object.update({
      changes,
      [prop]: newFlags,
    });
    this.render();
    return update;
  }

  /**
   * Generate a mapping of skill names and bonus object references for the AE sheet. If the AE
   * comes from an Item, we look up all non-core skill items in the world, and use that list.
   * If it comes from an actor, we loop over the skills it owns and generate a mapping with that.
   *
   * This is then used to create the Select element for the AE sheet (for Skill keys).
   *
   * @param {Object} effect - Sheet object that contains the AE in question
   * @return {Object} - sorted object of skill keys to names
   */
  static getSkillOptionConfigs(effect) {
    const skillMap = CPR.activeEffectKeys.skill;
    let skillList = [];
    if (effect.parent.documentName === "Item") {
      skillList = game.items.filter((i) => i.type === "skill");
    } else if (effect.parent.documentName === "Actor") {
      const actor = effect.parent;
      skillList = actor.items.filter((i) => i.type === "skill");
    }

    for (const skill of skillList) {
      skillMap["bonuses.".concat(SystemUtils.slugify(skill.name))] = skill.name;
    }

    const skillOptionConfigs = Object.entries(skillMap).map(([key, value]) => {
      return {
        value: key,
        label: SystemUtils.Localize(value),
        disabled: effect.changes.some((change) => change.key === key),
      };
    });

    const sortedConfigs = skillOptionConfigs.sort((a, b) => {
      return SystemUtils.Localize(a.label).localeCompare(
        game.i18n.localize(b.label)
      );
    });

    return sortedConfigs;
  }

  /**
   * Generates configuration options, from which a Select element is created.
   * for all keys except those in the "skill" category.
   *
   * @param {Object} effect - The effect data used to generate the configuration options.
   * @return {Object} The configuration options for other effect categories.
   */
  static getOtherOptionConfigs(effect) {
    const configs = {};
    const aeKeyEntries = Object.entries(CPR.activeEffectKeys);
    aeKeyEntries.forEach(([categoryKey, data]) => {
      configs[categoryKey] = Object.entries(data).map(([effectKey, value]) => {
        return {
          value: effectKey,
          label: SystemUtils.Localize(value),
          disabled: effect.changes.some((change) => change.key === effectKey),
        };
      });
    });

    return configs;
  }
}
