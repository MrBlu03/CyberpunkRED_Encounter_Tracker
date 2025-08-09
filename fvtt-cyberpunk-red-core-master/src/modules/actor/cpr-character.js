import CPRActor from "./cpr-actor.js";

/**
 * Character actors are generally represented by players, but for especially detailed NPCs,
 * they are appropriate too. Characters are the most complex actors in the system.
 *
 * @extends {Actor}
 */
export default class CPRCharacterActor extends CPRActor {
  /**
   * Pre-configure a few token options to reduce repetitive clicking, such as setting HP
   * as a resource bar. We also set the disposition as friendly, and always link with a token.
   *
   * @async
   * @override
   * @static
   * @param {Object} data - a complex structure with details and data to stuff into the actor object
   * @param {Object} options - not used here, but required by the parent class
   */
  static async create(data, options) {
    const createData = data;
    if (typeof data.system === "undefined") {
      createData.prototypeToken = {
        actorLink: true,
        disposition: 1,
        "sight.enabled": true,
        "bar1.Attribute": "derivedStats.hp",
      };
    }
    return super.create(createData, options);
  }
}
