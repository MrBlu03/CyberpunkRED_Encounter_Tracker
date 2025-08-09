import ActorUtils from "../../utils/ActorUtils.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

const createDefaultBlackIceActor = () => {
  /**
   * Create a default Black ICE Actor on first run
   *
   * @public
   * @memberof hookEvents
   */
  Hooks.on("ready", async () => {
    const settingKey = "firstRunCreateBlackIceActor";

    // Check if we've already created the Actor
    const setting = game.settings.get(game.system.id, settingKey);

    // Also check if user has already creates a default actor

    // Helper function to find black ice actors
    // Search for the localized name, then just "blackice"
    // removes spaces and lowercases for ease of matching
    const _findBlackIceActors = (name) => {
      return game.actors.filter(
        (bi) =>
          bi.type === "blackIce" &&
          bi.name.toLowerCase().replace(/\s+/g, "") === name
      );
    };

    const blackIceSearch = SystemUtils.Localize(
      "CPR.global.programClass.blackice"
    )
      .toLowerCase()
      .replace(/\s+/g, "");

    const searchNames = [blackIceSearch, "blackice"];
    let blackIceActors = [];

    for (const name of searchNames) {
      blackIceActors = _findBlackIceActors(name);
      if (blackIceActors.length) break;
    }

    // If no existing actor and we've not set the setting
    if (!blackIceActors.length && !setting) {
      await ActorUtils.createBlackIceActor({
        system: {
          notes: SystemUtils.Localize("CPR.blackIceSheet.defaultNotes"),
        },
      });

      // Set the setting to say we've set the setting
      game.settings.set(game.system.id, settingKey, true);
    }
  });
};

export default createDefaultBlackIceActor;
