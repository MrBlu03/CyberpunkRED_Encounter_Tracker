/**
 * We use custom chat cards for dice rolls, so we have to override the dice card behaviours
 * provided by 3rd party dice rollers. We currently support Dice So Nice! and DDDice.
 *
 * See https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/wikis/API/Roll
 */
export default class DiceHandler {
  static async handle3dDice(roll, rollModeOverride) {
    if (
      (game.modules.get("dice-so-nice") &&
        game.modules.get("dice-so-nice").active) ||
      (game.modules.get("dddice") && game.modules.get("dddice").active)
    ) {
      await DiceHandler._passRoll(roll, rollModeOverride);
    }
  }

  /**
   * Massage the roll object with properties like the 3d dice rollers expect
   *
   * @param {CPRRoll} roll - a roll object
   * @param {Object} rollModeOverride - an object with overriding parameters
   */
  static async _passRoll(roll, rollModeOverride) {
    let whisper = null;
    let blind = false;
    const rollMode = rollModeOverride || game.settings.get("core", "rollMode");
    switch (rollMode) {
      case "blindroll": {
        // GM only
        blind = true;
        break;
      }
      case "gmroll": {
        // GM + rolling player
        const gmList = game.users.filter((user) => user.isGM);
        const gmIDList = [];
        gmList.forEach((gm) => gmIDList.push(gm._id));
        whisper = gmIDList;
        break;
      }
      case "selfroll": {
        whisper = [game.user.id];
        break;
      }
      case "roll": {
        // everybody
        const userList = game.users.filter((user) => user.active);
        const userIDList = [];
        userList.forEach((user) => userIDList.push(user._id));
        whisper = userIDList;
        break;
      }
      default:
    }
    await game.dice3d.showForRoll(roll, game.user, true, whisper, blind);
  }
}
