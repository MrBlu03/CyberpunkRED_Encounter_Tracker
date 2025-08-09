/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";

export default class ItemQualityMigration extends BaseMigrationScript {
  static version = 26;

  static name = "Item: Quality";

  static documentFilters = {
    Item: { types: [], mixins: ["quality"] },
    Actor: { types: [], mixins: [] },
  };

  async updateItem(doc) {
    const itemName = doc.name.toLowerCase();
    const itemDescription = doc.system.description.value.toLowerCase();

    // Set to jammed on all attackables, not seen if the weapon
    // system.quality != poor but needs to be set.
    doc.system.critFailEffect = "jammed";

    if (itemName.includes("poor") || itemDescription.includes("poor")) {
      doc.system.quality = "poor";
    } else if (
      itemName.includes("excellent") ||
      itemDescription.includes("excellent")
    ) {
      doc.system.quality = "excellent";
    } else {
      doc.system.quality = "standard";
    }
  }
}
