import CPRActor from "./cpr-actor.js";
import LOGGER from "../utils/cpr-logger.js";

/**
 * The mook actor extends CPRActor since there is a lot of overlap behind the scenes with the
 * way items interact and how stats and skills are used.
 *
 * @extends {Actor}
 */
export default class CPRMookActor extends CPRActor {
  /**
   * On creation pre-configure a few token options to reduce repetitive clicking, such as setting HP
   * as a resource bar. Mooks by default have a neutral disposition and no actor link with tokens.
   *
   * @async
   * @override
   * @static
   * @param {Object} data - data used in creating a basic mook
   * @param {Object} options - not used here but passed up to the parent class
   */
  static async create(data, options) {
    const createData = data;
    if (typeof data.system === "undefined") {
      createData.prototypeToken = {
        "sight.enabled": true,
        bar1: { attribute: "derivedStats.hp" },
      };
    }
    super.create(createData, options);
  }
}
