import CPRItem from "../cpr-item.js";

/**
 * Extend the base CPRItem object with things specific to cyberware.
 * @extends {CPRItem}
 */
export default class CPRCyberwareItem extends CPRItem {
  /**
   * Perform a cyberware-specific action. Most of these map to attackable (mixin) calls
   * for cyberware that is an embedded weapon. This assumes the Item is also attackable.
   *
   * @param {CPRActor} actor - who is doing the action?
   * @param {*} actionAttributes - data from the event indicating the type of action
   * @returns null for invalid actions
   */
  _cyberwareAction(actor, actionAttributes) {
    const actionData = actionAttributes["data-action"].nodeValue;
    switch (actionData) {
      case "select-ammo":
      case "reload-ammo":
      case "measure-dv": {
        return this._weaponAction(actor, actionAttributes);
      }
      default:
    }
    return null;
  }
}
