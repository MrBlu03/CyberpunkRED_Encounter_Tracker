/**
 * Note: a lot of direct item interaction from CPRActorSheet._splitItem()
 */
const Stackable = function Stackable() {
  /**
   * Set the amount field on this item. Understands deltas too.
   *
   * @param {String} value - "+X", "-X", or "X" to change the amount
   */
  this.setItemAmount = function setItemAmount(value) {
    if (value.charAt(0) === "+" || value.charAt(0) === "-") {
      // handle a delta provided rather than a straight value
      this.system.amount += parseInt(value, 10);
    } else {
      // set to what the user provided
      this.system.amount = parseInt(value, 10);
    }
  };

  /**
   * Return true or false based on whether the given item can "stack" with this one.
   */
  this.canStack = function canStack() {
    // we'll need this later for splitting and merging stacks of items
  };
};

export default Stackable;
