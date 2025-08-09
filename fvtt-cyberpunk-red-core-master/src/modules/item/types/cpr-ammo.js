import CPRItem from "../cpr-item.js";

/**
 * Extend the base CPRItem object with things specific to ammunition.
 * @extends {CPRItem}
 */
export default class CPRAmmoItem extends CPRItem {
  /**
   * Modify the ammount of ammo an Item object is tracking.
   * @param {*} actionAttributes - data passed in from the event
   */
  _ammoAction(actionAttributes) {
    const actionData = actionAttributes["data-action"].nodeValue;
    const ammoAmount = actionAttributes["data-amount"].nodeValue;
    switch (actionData) {
      case "ammo-decrement":
        this._ammoDecrement(ammoAmount);
        break;
      case "ammo-increment":
        this._ammoIncrement(ammoAmount);
        break;
      default:
    }

    // If the actor, is updating his owned item, this logic should live within the actor.
    if (this.actor) {
      this.actor.updateEmbeddedDocuments("Item", [
        { _id: this.id, system: this.system },
      ]);
    }
  }

  /**
   * Decrease ammo amount without going below 0.
   *
   * @param {Number} changeAmount - how much to decrease by
   * @returns - null or the updated actor data if this ammo is owned
   */
  async _ammoDecrement(changeAmount) {
    const currentValue = this.system.amount;
    const newValue = Math.max(0, Number(currentValue) - Number(changeAmount));
    this.system.amount = newValue;
    if (this.actor) {
      return this.actor.updateEmbeddedDocuments("Item", [
        { _id: this.id, system: this.system },
      ]);
    }
    return null;
  }

  /**
   * Increase the amount of ammo carried
   *
   * @param {Number} changeAmount - how much to increase by
   * @returns -null or the updated actor data if this ammo is owned
   */
  async _ammoIncrement(changeAmount) {
    const currentValue = this.system.amount;
    const newValue = Number(currentValue) + Number(changeAmount);
    this.system.amount = newValue;
    if (this.actor) {
      return this.actor.updateEmbeddedDocuments("Item", [
        { _id: this.id, system: this.system },
      ]);
    }
    return null;
  }
}
