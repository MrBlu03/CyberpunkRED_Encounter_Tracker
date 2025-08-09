/* eslint-env jquery */

import SystemUtils from "./cpr-systemUtils.js";

/**
 * Common utils for Actors
 */
export default class CPRActorUtils {
  /**
   * Creates a Black ICE actor with default settings
   * @param {Object} additionalData - Optional data to merge with default Black ICE data
   * @returns {Promise<Actor>} The created actor
   */
  static async createBlackIceActor(additionalData = {}) {
    const iconPath = `systems/${game.system.id}/icons/compendium/default/default-blackice.svg`;
    const actorName = SystemUtils.Localize("CPR.global.programClass.blackice");
    const blackIceActorData = {
      name: actorName,
      type: "blackIce",
      img: iconPath,
      prototypeToken: {
        name: actorName,
        actorLink: false,
        texture: {
          src: iconPath,
        },
      },
    };

    // Merge the default data with any additional data passed in
    const mergedData = foundry.utils.mergeObject(
      blackIceActorData,
      additionalData
    );

    return Actor.create(mergedData);
  }
}
