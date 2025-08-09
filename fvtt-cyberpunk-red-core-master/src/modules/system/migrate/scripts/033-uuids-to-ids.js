/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";

/**
 * Turn Item UUIDs into IDs for Container Items
 */
export default class InstallListUUIDsToIDs extends BaseMigrationScript {
  static version = 33;

  static name = "Install List - UUIDs to IDs";

  static documentFilters = {
    Item: { types: [], mixins: ["container"] },
    Actor: { types: [], mixins: ["container"] },
  };

  async updateItem(doc) {
    this.constructor.migrateUuids(doc);
  }

  async updateActor(doc) {
    // God I know this is confusing. We are migrating Actors with the "container" mixin,
    // i.e., CPRCharacters and CPRMooks, not CPRContainers.
    if (doc.type === "container") return;
    this.constructor.migrateUuids(doc);
  }

  /**
   * Turn Item UUIDs into IDs
   *
   * @param {object} doc - the uuid of an item
   * @returns {void} - just mutates the document
   */
  static migrateUuids(doc) {
    const { installedItems } = doc.system;
    if (installedItems.list.length > 0) {
      const installed = installedItems.list;
      installedItems.list = installed.map((uuid) => {
        // Early return uuid is already an ID.
        if (foundry.data.validators.isValidId(uuid)) {
          return uuid;
        }

        // Parse UUID and find the index of the id which represents the Item.
        const parsedUuid = foundry.utils.parseUuid(uuid);
        const index = parsedUuid.embedded.indexOf("Item") + 1;

        // If the parsed uuid document type is not Item, return the embedded id at above index.
        return parsedUuid.documentType === "Item"
          ? parsedUuid.documentId
          : parsedUuid.embedded[index];
      });
    }
  }
}
