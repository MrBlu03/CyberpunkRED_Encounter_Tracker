import CPRActor from "./actor/cpr-actor.js";
import LOGGER from "./utils/cpr-logger.js";

/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 * @extends {ActiveEffect}
 */
export default class CPRActiveEffect extends ActiveEffect {
  /**
   * We extend the constructor to initialize CPR data structures used for tracking the CPRActiveEffect
   * With V10, Foundry moved all system data points into {obj}.system, so we will follow suit with
   * active effects
   *
   * @constructor
   * @param {*} object - the Foundry object data for an Active Effect
   * @param {*} options - The Foundry options for an Active Effect
   */
  constructor(object = {}, options = {}) {
    super(object, options);
    if (!this.system) {
      this.system = {
        isSuppressed: false,
      };
    }
  }

  /**
   * Convenience getter for retrieving how an effect is "used", this is actually stored
   * on the item providing the effect.
   *
   * XXX: LOGGER calls do not work in this getter. I don't know why; use console.
   */
  get usage() {
    const item = this.parent;
    if (!item) return null;
    return item.system.usage;
  }

  /**
   * set the key category for a mod
   *
   * @param {Number} num - the index of the mod in the changes array
   * @param {String} category - the key category value to set
   */
  async setModKeyCategory(num, category) {
    await this.setFlag(game.system.id, `changes.cats.${num}`, category);
  }

  /**
   * Check if this effect is suppressed before applying it. Taken from the 5E code in
   * active-effect.js.
   *
   * @override
   * @param {CPRActor} actor - who's getting the active effect?
   * @param {Object} change - the change to apply from an effect
   * @returns null if this is suppressed, apply() otherwise
   */
  apply(actor, change) {
    if (this.system.isSuppressed) return null;
    return super.apply(actor, change);
  }

  /**
   * Determine if this effect is suppressed because of some game mechanic, like the item is not equipped.
   * This was mostly copied from the dnd5e module in active-effect.js.
   *
   * Warning: If errors are thrown in this method, they'll show up early on loading Foundry,
   * and break basic functionality, for example, in actor.getData.
   *
   * @returns nothing, it only sets the isSuppressed property (it's a mutator)
   */
  determineSuppression() {
    this.system.isSuppressed = false;
    if (this.disabled) return;
    const doc = this.parent;
    if (!doc) return; // happens on item delete
    if (doc instanceof CPRActor) return; // we never suppress actor effects
    this.system.isSuppressed = doc.areEffectsSuppressed();
  }
}
