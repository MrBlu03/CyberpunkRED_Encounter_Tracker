/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";

export default class SkillTypeMigration extends BaseMigrationScript {
  static version = 27;

  static name = "Item: Skill Type";

  static documentFilters = {
    Item: { types: ["skill"], mixins: [] },
    Actor: { types: [], mixins: [] },
  };

  async updateItem(doc) {
    const itemName = doc.name.toLowerCase();

    // Set the skill type based on the name
    if (itemName.startsWith("language")) {
      doc.system.skillType = "language";
    } else if (itemName.startsWith("science")) {
      doc.system.skillType = "science";
    } else if (itemName.startsWith("localexpert")) {
      doc.system.skillType = "localExpert";
    } else if (itemName.startsWith("martialart")) {
      doc.system.skillType = "martialArt";
    } else if (itemName.startsWith("playinstrument")) {
      doc.system.skillType = "playInstrument";
    } else {
      doc.system.skillType = "generic";
    }

    // Make the old "base" skills deleteable
    const oldSkills = [
      "local expert (your home)",
      "science",
      "play instrument",
      "martial arts",
      "local expert",
    ];

    if (oldSkills.includes(itemName)) {
      doc.system.core = false;
    }
  }
}
