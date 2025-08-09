/* eslint-disable class-methods-use-this, no-unused-vars */
import LOGGER from "../../utils/cpr-logger.js";
import CPRSystemUtils from "../../utils/cpr-systemUtils.js";

/**
 * This is the base class for migration scripts. All migrations should extend this class and
 * implement the methods needed, which depends on what changed in the data model (actors, items, etc).
 *
 * To Use:
 *   1. Create a migration script file in the `/src/modules/system/migrate/scripts` directory
 *      following naming conventions.
 *   2. Extend this class. Copy/paste a previous migration script to see how it's done.
 *   3. Override the `version`, `name` and `documentFilters` static properties.
 *      See below for details, and other migration scripts for examples.
 *   4. Write your script by overriding the following methods: `updateItem`, `updateActor` or both.
 *      Again, see below for details.
 *   5. Add an export statement pointing to your script in `./index.js`.
 *   6. Finally, increment the `#LATEST_VERSION` static property in `../migration.js`.
 *   7. Test to make sure your migrations work.
 *
 * @abstract
 */
export default class BaseMigrationScript {
  /**
   * Basic constructor to establish the version and other options.
   */
  constructor() {
    this.version = this.constructor.version; // Derived from the static property below.
    this.name = this.constructor.name; // Derived from the static property below.
    this.allowedDocTypes = this.constructor.getAllowedDocTypes();
    this.flush = false; // migrations will stop after this script, even if more are needed
  }

  // The data model version this migration will take us to. Override this!
  static version = null;

  // Override this!
  static name = "Base Migration Class";

  /**
   * Override this!
   *
   * Filter documents based on the specified types and/or mixins.
   * IMPORTANT: Subclasses should override this!
   *
   * For example, if you were to only migrate "skill" item types, "attackable"
   * item mixins, and "container" actor mixins, it would look like:
   * ```js
   *   static documentFilters = {
   *     Item: { types: ["skill"], mixins: ["attackable"] },
   *     Actor: { types: [], mixins: ["container"] },
   *   };
   * ```
   *
   * To migrate all types/mixins, do not override.
   *
   * NOTE: If you are migrating items, the migration system will
   * automatically migrate actors which can own items, no matter
   * what you put in the Actors filter. However, it is always better
   * to be explicit.
   */
  static documentFilters = {
    Item: { types: [], mixins: [] },
    Actor: { types: [], mixins: [] },
  };

  /**
   * Retrieve the allowed document types based on the specified types and mixins, for this
   * specific migration.
   *
   * @return {Object} Returns an object containing Sets of document types that are allowed.
   */
  static getAllowedDocTypes() {
    const docTypes = {};
    /* eslint-disable no-continue */
    for (const [docName, filters] of Object.entries(this.documentFilters)) {
      const { mixins, types } = filters;
      if (!types.length && !mixins.length) {
        docTypes[docName] = new Set();
        continue;
      }
      let docTypeSet = new Set(types);
      for (const mixin of mixins) {
        const mixinTypes = new Set(
          CPRSystemUtils.getDocTypesFromMixin(mixin, docName)
        );
        docTypeSet = docTypeSet.union(mixinTypes);
      }
      docTypes[docName] = docTypeSet;
    } /* eslint-enable no-continue */

    // If we migrate items, then we also need to migrate Actors which may own items.
    if (docTypes.Item) {
      if (!docTypes.Actor) {
        docTypes.Actor = new Set(["character", "mook", "container"]);
      } else if (docTypes.Actor.size) {
        docTypes.Actor.add("character");
        docTypes.Actor.add("mook");
        docTypes.Actor.add("container");
      }
    }
    return docTypes;
  }

  /**
   * Return a data object that can be merged to delete a document property. This method
   * safely checks if the property exists before passing back the Foundry-specific directive to
   * delete a property. Attempting to delete keys in normal JS ways produces errors when calling
   * Doc.update().
   *
   * Example deletion key that will delete "data.whatever.property":
   *    { "data.whatever.-=property": null }
   *
   * @param {Document} doc - document (item or actor) that we intend to delete properties on
   * @param {String} prop - dot-notation of the property, "data.roleInfo.role" for example
   * @returns {Object}
   */
  static safeDelete(doc, prop) {
    let key = prop;

    if (foundry.utils.hasProperty(doc, key)) {
      key = prop.match(/.\../)
        ? prop.replace(/.([^.]*)$/, ".-=$1")
        : `-=${prop}`;
      return { [key]: null };
    }
    return {};
  }

  /**
   * Does nothing and is meant to be over-ridden.
   *
   * This is where you put the logic for migrating miscellaneous data,
   * specifically, anything that isn't an item or an actor.
   * E.g. tiles, tables, settings, etc.
   *
   * NOTE: Unlike updateItem/updateActor, we do expect you to make
   * async changes to the database here (e.g. `await someTile.update()`),
   *
   */
  // eslint-disable-next-line no-empty-function
  async migrateMisc() {}

  /**
   * Does nothing and is meant to be over-ridden.
   *
   * This is where you put the logic for changing the data model for items.
   *
   * NOTE: Besides rare circumstances, you should not be making changes to
   * the database here. Manipulate the data object directly, and the
   * Migration Runner will take care of database operations.
   *
   * @param {Object} itemData - Source data for the item. From item.toObject().
   * @param {Object} actorData - Source data for the item's parent actor, if any. From actor.toObject().
   */
  // eslint-disable-next-line no-empty-function
  async updateItem(itemData, actorData) {}

  /**
   * Does nothing and is meant to be over-ridden.
   *
   * This is where you put the logic for changing the data model for actors.
   *
   * NOTE: Besides rare circumstances, you should not be making changes to
   * the database here. Manipulate the data object directly, and the
   * Migration Runner will take care of database operations.
   *
   * @param {Object} actorData - Source data for the actor.From actor.toObject().
   */
  // eslint-disable-next-line no-empty-function
  async updateActor(actor) {}

  /**
   * Utility function which simulates a long process by delaying the resolution of a Promise.
   * Used for testing, so probably should not have any commits which call this.
   *
   * @param {number} [time=10] - The time in milliseconds to delay the resolution.
   * @return {Promise} A Promise that resolves after the specified time.
   */
  static simulateLongProcess(time = 10) {
    return new Promise((resolve) => {
      setTimeout(resolve, time);
    });
  }
}
