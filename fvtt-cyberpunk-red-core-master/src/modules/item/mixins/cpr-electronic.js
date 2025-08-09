/**
 * Lessons:
 *   1. Arrow functions do not work here, because they are not bound to "this", and are generally
 *      unsuitable for "call" functions, which is this is.
 *   2. You cannot put properties in this definition, only functions. Locally scoped variables
 *      are ok though.
 *   3. eslint recommends these functions must have names to assist with debugging
 */
const Electronic = function Electronic() {
  /**
   * Set whether this Item is electronic or not.
   *
   * @param {Boolean}
   */
  this.setElectronic = function setElectronic(val) {
    const cprItemData = foundry.utils.duplicate(this.system);
    const target = "system.isElectronic";
    foundry.utils.setProperty(cprItemData, target, val);
    this.update({ system: cprItemData });
  };

  /**
   * Set whether this Item EMP Hardening
   *
   * @param {Boolean}
   */
  this.setProvidesHardening = function setProvidesHardening(val) {
    const cprItemData = foundry.utils.duplicate(this.system);
    const target = "system.providesHardening";
    foundry.utils.setProperty(cprItemData, target, val);
    this.update({ system: cprItemData });
  };
};

export default Electronic;
