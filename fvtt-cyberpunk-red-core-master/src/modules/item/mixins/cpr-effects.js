import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

/**
 * The Effects mixin in where the logic lives for managing active effects associated with Items.
 * Valid mods are objects shown below. They are in the "changes" property of the active effect.
 * {
 *    key: "system.stats.dex.value"
 *    mode: 2
 *    priority: 10   <-- implies an order to applying effects; not used in this system
 *    value: "20"
 * }
 *
 * mode is an enum with the following behaviors:
 *    0 (CUSTOM) - calls the "applyActiveEffect" hook with the value to figure out what to do with it
 *    1 (MULTIPLY) - multiply this value with the current one
 *    2 (ADD) - add this value to the current value (as an Integer) or set it if currently null
 *    3 (DOWNGRADE) - like OVERRIDE but only replace if the value is lower (worse)
 *    4 (UPGRADE) - like OVERRIDE but only replace if the value is higher (better)
 *    5 (OVERRIDE) - replace the current value with this one
 */
const Effects = function Effects() {
  /**
   * A dispatcher for calling methods that affect active effects.
   *
   * @param {Object} event - object representing what was clicked, dragged, etc
   * @returns - usually the impacted active effect, or null if something was invalid in the event
   */
  this.manageEffects = function manageEffects(event) {
    event.preventDefault();
    LOGGER.debug("effect listener fired");
    const action = SystemUtils.GetEventDatum(event, "data-action");
    switch (action) {
      case "create":
        return this.createEffect();
      case "edit": {
        const effectId = SystemUtils.GetEventDatum(event, "data-effect-id");
        return this.editEffect(effectId);
      }
      case "copy": {
        const effectId = SystemUtils.GetEventDatum(event, "data-effect-id");
        return this.copyEffect(effectId);
      }
      case "delete": {
        const effectId = SystemUtils.GetEventDatum(event, "data-effect-id");
        return this.deleteEffect(effectId);
      }
      case "toggle": {
        const effectId = SystemUtils.GetEventDatum(event, "data-effect-id");
        return this.toggleEffect(effectId);
      }
      default:
        LOGGER.error(`Unknown effects action: ${action}`);
    }
    return null;
  };

  /**
   * Create a new active effect for this item. This sets up all the defaults.
   * Note: It would be nice to add custom properties, but they seem to be ignored by Foundry.
   * This is why we provide a custom CPRActiveEffect object elsewhere in the code base.
   *
   * @param {Boolean} render - Render the effect's sheet or not. Default true.
   * @returns {ActiveEffect} - the newly created document
   */
  this.createEffect = async function createEffect(render = true) {
    const disabled = this.system.usage === "snorted";
    const effectDoc = await this.createEmbeddedDocuments("ActiveEffect", [
      {
        name: SystemUtils.Localize("CPR.itemSheet.effects.newEffect"),
        img: "icons/svg/aura.svg",
        origin: this.uuid,
        disabled,
      },
    ]);

    return effectDoc[0].sheet.render(render);
  };

  this.copyEffect = function copyEffect(eid) {
    const effect = foundry.utils.duplicate(this.getEffect(eid));
    return this.createEmbeddedDocuments("ActiveEffect", [effect]);
  };

  /**
   * Delete the active effect on this item with an ID of "eid"
   *
   * @param {String} eid - active effect ID
   * @returns - the deleted document
   */
  this.deleteEffect = function deleteEffect(eid) {
    const effect = this.getEffect(eid);
    return effect.delete();
  };

  /**
   * Open up the dialog/sheet for editing an active effect with the given ID
   *
   * @param {String} eid - active effect ID
   * @returns
   */
  this.editEffect = function editEffect(eid) {
    const effect = this.getEffect(eid);
    return effect.sheet.render(true);
  };

  /**
   * Return the active effect object on this item with the given ID. Should be used everywhere to
   * ensure proper error checking.
   *
   * @param {String} eid - active effect ID
   * @returns {ActiveEffect}
   */
  this.getEffect = function getEffect(eid) {
    const effect = this.effects.get(eid);
    if (!effect) {
      LOGGER.error(`Active effect ${eid} does not exist!`);
      return null;
    }
    return effect;
  };

  /**
   * Return an active effect matching the give name.
   *
   * @param {String} name - the name to search by
   * @returns {ActiveEffect}
   */
  this.getEffectByName = function getEffectByName(name) {
    return this.effects.find((e) => e.name === name);
  };

  /**
   * Return an array of all effect names on this item.
   *
   * @returns {Array:ActiveEffect}
   */

  this.getEffectNames = function getEffectNames() {
    return this.effects.map((e) => {
      return {
        value: e.name,
        label: e.name,
      };
    });
  };

  /**
   * Enable or disable the mods on an active effect on this item.
   *
   * @param {String} eid - active effect ID
   * @returns {ActiveEffect}
   */
  this.toggleEffect = function toggleEffect(eid) {
    const effect = this.getEffect(eid);
    const value = !effect.disabled;
    LOGGER.debug(`Setting disabled on ${eid} to ${value}`);
    return effect.update({ disabled: value });
  };

  /**
   * Based on the data model, determine how an item can be "used" to enable or disable
   * an active effect. This can only be used in the UIs, it is not saved as a property.
   *
   * @return {Array}
   */
  this.getAllowedUsage = function getAllowedUsage() {
    const usageAllowed = ["always", "toggled"];
    if (this.type === "drug") {
      usageAllowed.push("snorted");
    }
    if (SystemUtils.hasMixin(this.type, "physical")) {
      if (this.type !== "cyberware") {
        usageAllowed.push("carried");
        usageAllowed.push("equipped");
      }
    }
    if (this.type === "cyberware") {
      usageAllowed.push("installed");
    }
    if (this.type === "program") {
      usageAllowed.push("rezzed");
    }
    return usageAllowed;
  };

  /**
   * This is where the logic to determine if the effects provided by an item are suppressed or not.
   * For example, an unequipped physical item would have its effects suppressed.
   *
   * This function assumes the item was never given an invalid usage in the first place. It trusts
   * that the UI called getAllowedUsage (above) so that only valid ones are available.
   *
   * @returns {Bool}
   */
  this.areEffectsSuppressed = function areEffectsSuppressed() {
    switch (this.system.usage) {
      case "carried":
        return this.system.equipped === "owned";
      case "equipped":
        return this.system.equipped !== "equipped";
      case "installed":
        return !this.system.isInstalled;
      case "rezzed":
        return !this.system.isRezzed;
      default:
        return false;
    }
  };

  /**
   * There are cases where changing the usage should trigger other behaviors, like setting all AEs
   * to disabled when setting it to snorted. Players should not gain their effects merely by touching
   * the drugs (i.e. putting them in their inventory).
   *
   * @async
   * @callback - (no need to call update() this this happens already)
   * @private
   * @param {String} usage - the value to set usage to
   */
  this._setUsage = function _setUsage(usage) {
    if (usage === "snorted") {
      const aeUpdates = [];
      this.effects.forEach((ae) =>
        aeUpdates.push({ _id: ae.id, disabled: true })
      );
      this.updateEmbeddedDocuments("ActiveEffect", aeUpdates);
    }
    if (usage === "equipped") {
      const aeUpdates = [];
      this.effects.forEach((ae) =>
        aeUpdates.push({ _id: ae.id, disabled: false })
      );
      this.updateEmbeddedDocuments("ActiveEffect", aeUpdates);
    }
  };
};

export default Effects;
