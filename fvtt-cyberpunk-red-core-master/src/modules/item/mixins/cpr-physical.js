/**
 * Lessons:
 *   1. Arrow functions do not work here, because they are not bound to "this", and are generally
 *      unsuitable for "call" functions, which is this is.
 *   2. You cannot put properties in this definition, only functions. Locally scoped variables
 *      are ok though.
 *   3. eslint recommends these functions must have names to assist with debugging
 */
const Physical = function Physical() {
  /**
   * Set whether this Item is concealable or not. This also unsets isConcealed if concealable is
   * set to false.
   *
   * @param {Boolean} val - set whether the Item is concealable (true) or not (false)
   */
  this.setConcealable = function setConcealable(val) {
    const cprItemData = foundry.utils.duplicate(this.system);
    let target = "concealable.concealable";
    foundry.utils.setProperty(cprItemData, target, val);
    // if we are making an item "unconcealable" (too big), we also unset "concealed" for consistency's sake
    if (!val) {
      target = "concealable.isConcealed";
      foundry.utils.setProperty(cprItemData, target, val);
    }
    this.update({ system: cprItemData });
  };
};

export default Physical;
