import SystemUtils from "../../utils/cpr-systemUtils.js";

const WarnOnMovingLockedContainer = () => {
  /**
   * The GM can set a flag that prevents players from moving containers, and
   * we check that here. If a player tries to move a container they're not
   * allowed to, we emit a warning.
   *
   * @public
   * @memberof hookEvents
   * @param {tokenDocument} tokenDocument - The tokenDocument object being updated
   * @param {object} data                 - A trimmed object with the data being updated
   */
  Hooks.on("preUpdateToken", (tokenDocument, data) => {
    if (tokenDocument.actor.type === "container" && !game.user.isGM) {
      // Defined x and/or y properties indicate the token is attempting to move
      // to a new coordinate location. this indicates a moved token, so we check
      // the permissions.
      if (typeof data.x !== "undefined" || typeof data.y !== "undefined") {
        if (
          typeof tokenDocument.actor.getFlag(game.system.id, "players-move") ===
          "undefined"
        ) {
          SystemUtils.DisplayMessage(
            "warn",
            SystemUtils.Localize("CPR.messages.insufficientPermissions")
          );
          return false;
        }
      }
    }
    return true;
  });
};

export default WarnOnMovingLockedContainer;
