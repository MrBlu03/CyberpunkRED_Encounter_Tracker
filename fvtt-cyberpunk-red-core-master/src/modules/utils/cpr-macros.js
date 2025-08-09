import CPRChat from "../chat/cpr-chat.js";
import SystemUtils from "./cpr-systemUtils.js";

export default class CPRMacro {
  static async rollItemMacro(
    itemName,
    extraRollArgs = { skipPrompt: false, rollType: "attack" }
  ) {
    const speaker = ChatMessage.getSpeaker();
    const extraData = extraRollArgs;
    let actor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);
    if (!actor) {
      SystemUtils.DisplayMessage(
        "warn",
        `${SystemUtils.Localize("CPR.macro.itemMissing")} ${itemName}`
      );
      return;
    }
    const item = actor ? actor.items.find((i) => i.name === itemName) : null;

    const displayName = actor === null ? "ERROR" : actor.name;
    if (!item) {
      SystemUtils.DisplayMessage(
        "warn",
        `[${displayName}] ${SystemUtils.Localize(
          "CPR.macro.itemMissing"
        )} ${itemName}`
      );
      return;
    }

    const validRollTypes = [
      "skill",
      "attack",
      "damage",
      "aimed",
      "autofire",
      "suppressive",
    ];
    let rollType;
    switch (item.type) {
      case "weapon":
      case "itemUpgrade":
      case "cyberware": {
        rollType = extraData.rollType;
        break;
      }
      case "skill": {
        rollType = "skill";
        break;
      }
      default:
    }

    if (!validRollTypes.includes(rollType)) {
      SystemUtils.DisplayMessage(
        "warn",
        `[${displayName}] ${SystemUtils.Localize(
          "CPR.macro.invalidRollType"
        )} ${rollType}`
      );
      return;
    }

    const savedFireType = actor.getFlag(game.system.id, `firetype-${item._id}`);

    if (rollType === "damage" && savedFireType) {
      extraData.damageType = savedFireType;
    }

    let cprRoll = item.createRoll(rollType, actor, extraData);
    const event = {};
    event.ctrlKey = false;
    event.type = "macro";

    const fireModes = ["aimed", "autofire", "suppressive"];
    if (fireModes.includes(rollType)) {
      actor.setFlag(game.system.id, `firetype-${item._id}`, rollType);
    }

    if (!extraData.skipPrompt) {
      const keepRolling = await cprRoll.handleRollDialog(event, actor, item);
      if (!keepRolling) {
        if (savedFireType !== rollType) {
          if (savedFireType) {
            actor.setFlag(
              game.system.id,
              `firetype-${item._id}`,
              savedFireType
            );
          } else {
            actor.unsetFlag(game.system.id, `firetype-${item._id}`);
          }
        }
        return;
      }
    }

    cprRoll = await item.confirmRoll(cprRoll);
    await cprRoll.roll();
    cprRoll.entityData = speaker;
    cprRoll.entityData.item = item.id;

    CPRChat.RenderRollCard(cprRoll);

    if (savedFireType !== rollType) {
      if (savedFireType) {
        actor.setFlag(game.system.id, `firetype-${item._id}`, savedFireType);
      } else {
        actor.unsetFlag(game.system.id, `firetype-${item._id}`);
      }
    }
    // Need to figure out what we did here since this is gone??
    // actor.setPreviousRoll(cprRoll);
  }
}
