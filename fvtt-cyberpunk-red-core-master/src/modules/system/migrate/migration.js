/* eslint-disable no-await-in-loop, no-continue */

import * as Migrations from "./scripts/index.js";
import LOGGER from "../../utils/cpr-logger.js";
import MigrationApp from "./migration-app.js";
import CPR from "../config.js";
import MigrationError from "./migration-error.js";

/**
 * This class provides a method to find and execute all migrations that are needed
 * to get the data to the latest data model.
 *
 * See `./base-migration-script.js` for more details on
 * how to implement your own migration scripts.
 */
export default class MigrationRunner {
  /** The latest data model version we want to migrate to. */
  static #LATEST_VERSION = 34;

  /**
   * The minimum data model version we allow users to migrate from.
   * If a user attempts migration from a lower version, an error is thrown,
   * and migration is cancelled before it starts.
   */
  static #MINIMUM_VERSION = {
    dataModel: 24,
    system: "0.88.2",
  };

  /**
   * Set up some basic data on the migration runner.
   *
   * @param {Number} currDataModelVersion - the current data model version
   * @param {Number} newDataModelVersion - the data model version we want to get to, may be multiple versions ahead
   */
  constructor() {
    this.currentDataModelVersion = game.settings.get(
      game.system.id,
      "dataModelVersion"
    );
    this.newDataModelVersion = MigrationRunner.#LATEST_VERSION;

    this.#migrationClasses = this.filterMigrationClasses();

    // The following properties are set in `migrateWorld()`.
    // They are not necessary to compute unless migrations are needed.
    this.migrationInstances = null;
    this.allowedDocTypes = null;
    this.documents = null;

    // This is also set in `migrateWorld()`, if migrations completed successfully.
    this.migrationSuccessful = null;
  }

  /**
   * Instantiates the globally accessible MigrationRunner.
   * Called in the "init" hook of `cpr.js`.
   */
  static instantiate() {
    const MR = new MigrationRunner();
    game.cpr.MigrationRunner = MR;
  }

  /**
   * Change default behaviors so migrations are easier to test.
   * The following booleans represent the default behavior.
   *
   * NOTE: DO NOT commit changes to these booleans.
   */
  static devMode = {
    enforceMinimumVersion: true,
    remigrateAlreadyMigrated: false,
    batchMigrations: true,
    migrateSystemCompendia: false,
    app: {
      returnToSetup: true,
      modal: true,
    },
  };

  /** @type {MigrationError} */
  error;

  /** @type {Array<typeof BaseMigrationScript>} */
  #migrationClasses;

  /**
   * This property is set in `migrateItem` and `migrateActor`, when we iterate through
   * the documents that need to be migrated. This way the error message can access
   * the current migration script.
   * @type {BaseMigrationScript|null}
   */
  #currentMigration = null;

  get currentMigration() {
    return this.#currentMigration;
  }

  get migrationClasses() {
    return this.#migrationClasses;
  }

  /**
   * Get the migration app, if it exists.
   * @returns {MigrationApp|null}
   */
  static get app() {
    const app = foundry.applications.instances.get("cpr-migration");
    return app || null;
  }

  get app() {
    return MigrationRunner.app;
  }

  /**
   * Check if there are any migrations that need to be run.
   *
   * @return {boolean}
   */
  get needsMigration() {
    return (
      game.settings.get(game.system.id, "dataModelVersion") <
      this.newDataModelVersion
    );
  }

  /**
   * Retrieves/organizes the total number of various documents to migrate.
   *
   * @return {Object} An object containing the count of items, actors, scenes, tokens, packs, and pack documents.
   */
  get totalDocs() {
    const totals = {
      get total() {
        return this.items + this.actors + this.tokens + this.packDocuments;
      },
    };
    Object.keys(CPR.migrationDocTypes).forEach((key) => {
      totals[key] = null;
    });
    if (!this.documents) return totals;
    const { documents } = this;

    totals.items = documents.worldItems.length;
    totals.actors = documents.worldActors.length;
    totals.scenes = documents.sceneMap.size;
    totals.packs = documents.packMap.size;

    let tokens = 0;
    for (const actorList of documents.sceneMap.values()) {
      tokens += actorList.length;
    }

    let packDocuments = 0;
    for (const docList of documents.packMap.values()) {
      packDocuments += docList.length;
    }

    totals.tokens = tokens;
    totals.packDocuments = packDocuments;

    return totals;
  }

  /**
   * Knowing the data model versions, figure out which migration scripts to run.
   *
   * @return {Array<typeof BaseMigrationScript>} - an ordered list of BaseMigrationScript subclasses.
   */
  filterMigrationClasses() {
    const { currentDataModelVersion, newDataModelVersion } = this;
    // Brand new world, already at the latest data model, no migrations needed.
    if (currentDataModelVersion === "newCprWorld") return [];

    const migrationClasses = Object.values(Migrations)
      .filter((Migration) => {
        const { version } = Migration;
        return (
          version > currentDataModelVersion && version <= newDataModelVersion
        );
      })
      .sort((a, b) => (a.version > b.version ? 1 : -1));
    return migrationClasses;
  }

  static getDeprecatedDataModelFields() {
    const deprecatedKeys = new Set();
    function searchForDeprecated(schemaObj, key) {
      for (const [fieldName, fieldObj] of Object.entries(schemaObj.fields)) {
        const { deprecate } = fieldObj.options;
        const newPath = `${key}.${fieldName}`;
        if (deprecate) {
          const { path } = deprecate;
          deprecatedKeys.add(
            // Stringify ensures we don't add duplicates
            JSON.stringify({
              ...deprecate,
              path: newPath.split(".").toSpliced(1, 0, path).join("."),
            })
          );
          continue;
        }

        if (fieldObj.fields) {
          searchForDeprecated(fieldObj, newPath);
        }
      }
    }

    const docTypes = ["Item", "Actor"];
    for (const docType of docTypes) {
      const documentDataModel = CONFIG[docType].dataModels;
      for (const DataModel of Object.values(documentDataModel)) {
        searchForDeprecated(DataModel.schema, docType);
      }
    }
    return Array.from(deprecatedKeys).map((key) => JSON.parse(key));
  }

  /**
   * This is the top level entry point for executing migrations. This code assumes the user is a GM. It will
   * figure out what migrations to run, and dispatch them for execution.
   *
   * @returns {Promise<boolean>} - True if all migrations completed successfully or no migrations are needed
   */
  async migrateWorld() {
    // Open migration application before anything else.
    const migrationApp = new MigrationApp({ migrationRunner: this });
    await migrationApp.render({ force: true });

    // Enforce a minimum version that user has to migrate from.
    // Below this, they will be instructed to first update to
    // the minimum version.
    const { currentDataModelVersion } = this;
    const MINIMUM_VERSION = MigrationRunner.#MINIMUM_VERSION;
    const belowMinimumVersion =
      currentDataModelVersion < MINIMUM_VERSION.dataModel;
    const { enforceMinimumVersion } = MigrationRunner.devMode;
    if (belowMinimumVersion && enforceMinimumVersion) {
      await migrationApp.setCurrentPhase("userPrevented", {
        messageData: {
          currentVersion: currentDataModelVersion,
          minimumVersion: MINIMUM_VERSION.system,
        },
      });
      await migrationApp.setCurrentPhase("end");
      return false;
    }

    // Get confirmation from user.
    await migrationApp.setCurrentPhase("userConfirm");
    const userConfirm = await migrationApp.userConfirm();
    if (!userConfirm) {
      await migrationApp.setCurrentPhase("end");
      return false;
    }

    await migrationApp.setCurrentPhase("prepareDocuments");
    // Initialize necessary properties, now that we know migration is needed.
    this.migrationInstances = this.migrationClasses.map(
      (Migration) => new Migration()
    );
    this.allowedDocTypes = this.getAllowedDocTypes();
    this.documents = await this.prepareDocumentsForMigration();
    await migrationApp.setCurrentPhase("documentsReady");

    // Actually run the migration scripts.
    this.migrationSuccessful = await this.runMigrations();

    if (this.migrationSuccessful) {
      // Let the system know that the world has been migrated,
      // so we can show the Changelog upon refresh.
      game.settings.set(game.system.id, "justMigrated", true);
    }

    await migrationApp.setCurrentPhase("end");

    return this.migrationSuccessful;
  }

  /**
   * Run all of the migrations in the right order, waiting for them to complete before proceeding to the next.
   *
   * @returns {Promise<Boolean>} - True if all migrations completed successfully
   */
  async runMigrations() {
    const { app } = this;
    try {
      // migrate miscellaneous data
      await app.setCurrentPhase("migrateMisc");
      await this.migrateMisc();
      // migrate world items
      await app.setCurrentPhase("migrateItems");
      await this.migrateDocuments(this.documents.worldItems);
      // migrate world actors
      await app.setCurrentPhase("migrateActors");
      await this.migrateDocuments(this.documents.worldActors);
      // migrate token actors in scenes
      await app.setCurrentPhase("migrateScenes");
      await this.migrateScenes();
      // migrate packs
      await app.setCurrentPhase("migrateCompendia");
      await this.migrateCompendia();
    } catch (error) {
      if (!this.error) {
        this.error = new MigrationError(
          {},
          `Unknown Migration Error: '${error.message}'`,
          { cause: error }
        );
      }
      await app.setCurrentPhase("error");
      LOGGER.error(error);
      return false;
    }

    await app.setCurrentPhase("migrationComplete");
    return true;
  }

  /**
   * Filters and organizes the various documents for migration:
   *   - World Items
   *   - World Actors
   *   - Scenes
   *     - Token Actors
   *   - Packs
   *     - Pack Documents (Items, Actors, and Token Actors in Scenes)
   *
   * @return {Promise<Object>} An object containing the world items, world actors, scene Map, and pack Map.
   */
  async prepareDocumentsForMigration() {
    // Prepare world items and actors.
    const worldItems = this.filterDocuments(game.items);
    const worldActors = this.filterDocuments(game.actors);

    /**
     * Build a Map of scenes to their Token Actors.
     * @type {Map<Scene, CPRActor[]>}
     */
    const sceneMap = new Map();
    for (const scene of game.scenes) {
      const filteredTokens = this.filterDocuments(scene.tokens);
      if (filteredTokens.length === 0) continue;
      sceneMap.set(scene, filteredTokens);
    }

    /**
     * Build a Map of CompendiumCollections to their Pack Documents (Items or Token Actors).
     * @type {Map<CompendiumCollection, CPRItem|CPRActor[]>}
     */
    const packMap = new Map();
    for (const pack of MigrationRunner.filterCompendia(game.packs)) {
      const { metadata } = pack;
      let filteredDocuments;
      // If the pack is of type "Scene", filter the tokens in the scene.
      if (metadata.type === "Scene") {
        const sceneDocs = await pack.getDocuments();
        let tokenList = [];
        sceneDocs.forEach((scene) => {
          tokenList = [...tokenList, ...scene.tokens];
        });
        filteredDocuments = this.filterDocuments(tokenList);
      } else {
        // Else, filter the Actor/Item documents in the pack.
        const index = Array.from(await pack.getIndex({ fields: ["flags"] }));
        if (index.length === 0) continue; // Edge case where the pack has no documents.

        // `filterDocuments()` looks at the first entry in the array for the property: `documentName`.
        // Typically it's passed an array/map of Documents, in which each entry has this prop by default.
        // However, in this case, we are passing it an index (array) of limited document data, in which
        // no entries have that property, so we assign it manually to the first entry in the array.
        index[0].documentName = metadata.type;
        const filteredIds = this.filterDocuments(index).map(
          (docData) => docData._id
        );

        filteredDocuments = await pack.getDocuments({ _id__in: filteredIds });
      }
      if (filteredDocuments.length === 0) continue;
      packMap.set(pack, filteredDocuments);
    }
    return { worldItems, worldActors, sceneMap, packMap };
  }

  /**
   * Filters a list of documents of a given class based on the specified doc types and/or mixins.
   * Also filters out already migrated documents, in the case of a partially completed migration.
   *
   * @param {Array<Token|CPRActor|CPRItem|IndexData>} docList - The list of documents to filter
   * @return {Array<CPRActor|CPRItem>} An array of filtered Actors or Items (but not both).
   */
  filterDocuments(docList) {
    if (!Array.isArray(docList)) docList = Array.from(docList);
    if (!docList.length) return docList;

    const docName = docList[0].documentName;
    // Filter tokens, convert them to actors, and then run this function again,
    // which will skip this block, because now an Array of Actors is being passed.
    if (docName === "Token") {
      const filteredTokens = MigrationRunner.filterTokens(docList);
      const tokenActors = filteredTokens.map((token) => token.actor);
      return this.filterDocuments(tokenActors);
    }

    // Filter for docs that are not already migrated, in the case of an incomplete migration.
    const { remigrateAlreadyMigrated } = MigrationRunner.devMode;
    const nonMigratedDocs = docList.filter((doc) => {
      return !this.alreadyMigrated(doc, remigrateAlreadyMigrated);
    });

    const documentTypes = this.allowedDocTypes[docName];
    if (!documentTypes) return [];
    if (!documentTypes.size) return nonMigratedDocs;

    // Filter for doc type.
    const filteredDocs = nonMigratedDocs.filter((doc) => {
      return documentTypes.has(doc.type);
    });
    return filteredDocs;
  }

  /**
   * Filters an array of tokens based on certain conditions:
   *  - The actor that the token is derived from exists.
   *  - The token is not linked.
   *
   * @param {Array<Token>} tokens - The array of tokens to filter.
   * @return {Array<Token>} An array of filtered tokens.
   */
  static filterTokens(tokens) {
    const filteredTokens = tokens.filter((token) => {
      if (!game.actors.has(token.actorId)) {
        // Degenerate case where the actor that the token is derived from was since
        // deleted. This makes token.actor null so we don't have a full view of all of the actor data.
        // This is technically a broken token and even Foundry throws errors when you do certain things
        // with this token. We skip it.
        LOGGER.warn(
          `WARNING: Token "${token.name}" (${token.actorId}) on Scene "${token.parent.name}" (${token.parent.id})` +
            ` is missing the source Actor, so we will skip migrating it. Consider replacing or deleting it.`
        );
        return false;
      }
      if (!token.actorLink) return true; // unlinked tokens, this is what we're after
      // anything else is a linked token, we assume they're already migrated
      return false;
    });
    return filteredTokens;
  }

  /**
   * Filters the compendia based on the pack types, source types, and locked status.
   *
   * @param {Array<CompendiumCollection>|CompendiumPacks} compendia - The array/map of compendia to filter.
   * @return {Array} The filtered array of compendia.
   */
  static filterCompendia(compendia) {
    // Pack types we provide migrations for
    const packTypes = ["Actor", "Item", "Scene"];

    // Read setting to check which pack.sourceTypes we are migrating
    const sourceTypes = ["world"];

    /**
     NOTE: During dev you might want to run migrations on our own packs
     rather than migrate by hand. If so, uncomment the following line.
     */
    if (this.devMode.migrateSystemCompendia) sourceTypes.push("system");

    // Get a list of packs to migrate based on the above
    // and modules selected by the user in the app.
    const { modPackChoiceIds } = this.app;
    const packsToMigrate = compendia.filter(
      (p) =>
        (packTypes.includes(p.metadata.type) &&
          sourceTypes.includes(p.metadata.packageType)) ||
        modPackChoiceIds.includes(p.metadata.id)
    );

    return packsToMigrate;
  }

  /**
   * Aggregate the allowed document types from each migration.
   * We use sets because we don't want duplicates, and also Sets are cool.
   *
   * @return {Object<Set<string>>} An object which contains Sets of document types that are allowed.
   */
  getAllowedDocTypes() {
    const docNames = ["Item", "Actor"];
    const finalTypes = { Item: null, Actor: null };
    for (const docName of docNames) {
      for (const migration of this.migrationInstances) {
        const allowedDocTypes = migration.allowedDocTypes[docName];
        if (!allowedDocTypes) continue;
        if (!allowedDocTypes.size) {
          // If any Set is completely empty, set finalTypes[docName]
          // to empty Set and break out of this inner loop,
          // since an empty Set indicates all types are allowed.
          finalTypes[docName] = new Set();
          break;
        }
        finalTypes[docName] = (finalTypes[docName] || new Set()).union(
          allowedDocTypes
        );
      }
    }
    return finalTypes;
  }

  /**
   * Checks if the given document type should be migrated.
   * The default behavior checks the combined set of allowed document types
   * from each migration. If a migration instance is provided,
   * we use its specific document types instead.
   *
   * @param {('Item'|'Actor')} docName - The name of the document, either "Item" or "Actor".
   * @param {string} docType - The type of the document.
   * @return {boolean} Returns true if the document type is allowed, false otherwise.
   */

  isMigratableType(docName, docType, migration = {}) {
    const allowedDocTypes = migration.allowedDocTypes || this.allowedDocTypes;
    if (!allowedDocTypes[docName]) return false;
    if (!allowedDocTypes[docName].size) return true;
    return allowedDocTypes[docName].has(docType);
  }

  /**
   * Migrate documents, either Actors or items
   *
   * @param {Array<CPRItem|CPRActor>} documents - array of CPRItems/CPRActors to migrate.
   * @param {boolean} [batch=true] - Whether to batch updates or not.
   * @param {string} [pack=null] - The pack id from which the documents are provided.
   */
  async migrateDocuments(
    documents,
    { batch = MigrationRunner.devMode.batchMigrations, pack = null } = {}
  ) {
    if (!documents.length) return;
    const [firstEntry] = documents;
    const { documentName, documentClass } = firstEntry.collection;
    const migrationFunction =
      documentName === "Item" ? "migrateItem" : "migrateActor";
    const progress = this.getProgressBar(firstEntry);

    const updates = [];
    for (const doc of documents) {
      if (this.error) throw this.error;
      const docData = doc.toObject();
      // Attach the uuid to the doc data so it can be retrieved later.
      docData.uuid = doc.uuid;
      const update = await this[migrationFunction](docData);
      this.updateMigrationRecord(update, doc.isToken);
      if (update && batch) updates.push(update);
      if (!batch) await doc.update(update, { noHook: true });
      if (progress) progress.advance();
    }
    if (batch)
      await documentClass.updateDocuments(updates, { noHook: true, pack });
  }

  async migrateItem(itemData) {
    for (const migration of this.migrationInstances) {
      this.#currentMigration = migration;
      if (!this.isMigratableType("Item", itemData.type, migration)) continue;
      try {
        await migration.updateItem(itemData);
      } catch (err) {
        throw await this.generateError(itemData.uuid, err);
      }
    }
    return itemData;
  }

  async migrateActor(actorData) {
    for (const migration of this.migrationInstances) {
      this.#currentMigration = migration;
      if (!this.isMigratableType("Actor", actorData.type, migration)) continue;
      // Migrate actor.
      try {
        await migration.updateActor(actorData);
      } catch (err) {
        throw await this.generateError(actorData.uuid, err);
      }
      // Migrate embedded items.
      if (actorData.items.length === 0) continue;
      for (const itemData of actorData.items) {
        if (!this.isMigratableType("Item", itemData.type, migration)) continue;
        try {
          itemData.uuid = `${actorData.uuid}.Item.${itemData._id}`;
          await migration.updateItem(itemData, actorData);
        } catch (err) {
          throw await this.generateError(itemData.uuid, err);
        }
      }
    }
    return actorData;
  }

  /**
   * Migrate scenes, specifically unlinked tokens.
   */
  async migrateScenes() {
    const { progress } = this.app;
    progress.scenes.render(); // Initialize 'scenes' progress bar so that it is on top of all 'tokens' progress bars.
    for (const actorList of this.documents.sceneMap.values()) {
      const filteredTokenActors = actorList.filter((actor) => {
        const { token } = actor;
        // Token Actors may not need to be migrated, because their data
        // comes from global actors. If the token hasn't had data changed,
        // then it does not need to be migrated.
        const deltaSource = token.delta?._source;
        const hasMigratableData =
          (!!deltaSource && !!deltaSource.flags?.[game.system.id]) ||
          ((deltaSource ?? {}).items ?? []).length > 0 ||
          Object.keys(deltaSource?.system ?? {}).length > 0;
        return hasMigratableData;
      });
      progress.tokens.max -= actorList.length - filteredTokenActors.length;
      // We explicitly do not update in batches here, because token actors are
      // not part of the `Actor` World Collection, which `Actor.updateDocuments()`
      // updates from.
      await this.migrateDocuments(filteredTokenActors, { batch: false });
      progress.scenes.advance();
    }
  }

  /**
   * Migrate compendia. This code is not meant to be run on the system-provided compendia
   * that we provide. They are updated and imported on the side. The benefit of that approach
   * to users is decreased migration times. I.e., we already migrated our compendia.
   *
   * We respect whether a compendium is locked. If it is, do not touch it. This does invite problems
   * later on if a user tries to use entries with an outdated data model. However, the discord
   * community for Foundry preferred locked things to be left alone.
   */
  async migrateCompendia() {
    const { progress } = this.app;
    progress.packs.render(); // Initialize 'scenes' progress bar so that it is on top of all 'tokens' progress bars.
    for (const [pack, docList] of this.documents.packMap) {
      // If we are migrating locked packs we need to unlock them before migrating
      const wasLocked = pack.locked;
      await pack.configure({ locked: false });

      // Perform Foundry server-side migration of the pack data model
      await pack.migrate();

      // Iterate over compendium entries - applying fine-tuned migration functions
      switch (pack.metadata.type) {
        case "Scene":
          await this.migrateDocuments(docList, { batch: false });
          break;
        case "Actor":
        case "Item": {
          await this.migrateDocuments(docList, { pack: pack.metadata.id });
          break;
        }
        default:
          break;
      }
      progress.packs.advance();

      // Lock packs if they were locked pre-migration
      pack.configure({ locked: wasLocked });
    }
  }

  /**
   * Executes miscellaneous migrations by calling `migrateMisc` on each migration instance.
   * During this phase we do permit the scripts to make async changes to the database
   */
  async migrateMisc() {
    for (const migration of this.migrationInstances) {
      this.#currentMigration = migration;
      try {
        await migration.migrateMisc();
      } catch (error) {
        this.error = new MigrationError(
          {},
          `Miscellaneous Migration Error: '${error.message}'`,
          { cause: error }
        );
        throw this.error;
      }
    }
  }

  /**
   * Updates the migration record for the provided update object.
   *
   * @param {Object} update - The update object containing migration data.
   * @return {void}
   */
  updateMigrationRecord(update, isToken = false) {
    if (!update.flags[game.system.id]) update.flags[game.system.id] = {};
    const migrationData = {
      previous: this.currentDataModelVersion,
      current: this.newDataModelVersion,
    };
    if (isToken) migrationData.isToken = true;
    update.flags[game.system.id]._migration = migrationData;
  }

  /**
   * Checks if the given document has already been migrated to the new data model version.
   * For tokens, we check the ActorDelta, rather than the parent actor.
   *
   * @param {CPRItem|CPRActor|IndexData} doc - The document to check for migration status.
   * @param {boolean} [ignore=false] - NOTE: Dev Mode only. - Whether to ignore token migration status.
   * @return {boolean} Returns true if the document has already been migrated, false otherwise.
   */
  alreadyMigrated(doc, ignore = false) {
    if (ignore) return false;
    const systemFlags = doc.flags[game.system.id];
    if (!systemFlags) return false;
    const migrationData = systemFlags._migration;
    const current = migrationData?.current === this.newDataModelVersion;
    if (doc.isToken) return current && migrationData.isToken;
    return current;
  }

  /**
   * Generate an error and post a message with useful information for a failed migration.
   *
   * We have the following document types which may fail to migrate:
   *   - World Items
   *   - World Actors
   *     - Items owned by World Actors
   *   - Token Actors
   *     - Items owned by Token Actors
   *   - Pack Items
   *   - Pack Actors
   *     - Items owned by Pack Actors
   *   - Pack Token Actors (from Scene packs)
   *     - Items owned by Pack Token Actors
   *
   * @param {string} uuid - The uuid of the document whose migration caused an error.
   * @param {Error} error - The Error object
   * @return {Promise<Error>} The Error object
   */
  async generateError(uuid, error) {
    const document = await fromUuid(uuid);
    const errorInfo = {
      pack: null,
      scene: null,
      token: null,
      actor: null,
      item: null,
    };

    const { documentName } = document;
    switch (documentName) {
      case "Actor":
        errorInfo.actor = document;
        break;
      case "Item":
        errorInfo.item = document;
        if (document.isEmbedded) errorInfo.actor = document.actor;
        break;
      default:
        break;
    }
    const { actor } = errorInfo;
    if (actor?.isToken) {
      errorInfo.token = actor.token;
      errorInfo.scene = actor.token.parent;
    }
    if (document.pack) errorInfo.pack = document.compendium.metadata;

    let dataStr = `\nFailed Document: ${document.name}\nUUID: ${document.uuid}`;
    for (const [key, value] of Object.entries(errorInfo)) {
      if (!value) continue;
      // Only packs have metadata, and their human-readable string is in the `metadata.label`
      // property rather than the `name` property.
      const label = value.label || value.name;
      dataStr += `\n${key.capitalize()}: ${label} (${value.id})`;
    }

    const Migration = this.#currentMigration;
    const migrationFailString = `Migration Script Failed: '${Migration.name}' (Data Model Version: ${Migration.version})`;

    const migrationError = new MigrationError(
      {
        migrationData: {
          Migration,
          currentVersion: this.currentDataModelVersion,
          newVersion: this.newDataModelVersion,
          errorPhase: this.app.errorPhase,
        },
        document,
        uuid,
      },
      `${migrationFailString}${dataStr}`,
      { cause: error }
    );
    this.error = migrationError;
    return migrationError;
  }

  /**
   * Returns the progress bar for a given document.
   *
   * @param {Object} document - The document for which to retrieve the progress bar.
   * @return {Object|null} The progress bar for the document, or null if the document is not provided.
   */
  getProgressBar(document) {
    if (!document) return null;
    const { collectionName } = document;
    const isEmbeddedItem = collectionName === "items" && document.isEmbedded;
    const { progress } = this.app;
    if (isEmbeddedItem) return null; // We do not track progress for items in actors (they are still migrated, of course).
    if (document.pack) return progress.packDocuments;
    if (document.isToken) return progress.tokens;
    return progress[collectionName];
  }
}
