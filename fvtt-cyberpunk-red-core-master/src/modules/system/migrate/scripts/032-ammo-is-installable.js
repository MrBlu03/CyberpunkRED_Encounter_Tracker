/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";

/**
 * Make "ammo" an installable type for every loadable (weapon) item.
 *
 * Add ammo uuid to the list of installed items (will get converted to regular id
 * in next script).
 */
export default class AmmoIsInstallable extends BaseMigrationScript {
  static version = 32;

  static name = "Loadables: Ammo Is Installable";

  static documentFilters = {
    Item: { types: [], mixins: ["loadable"] },
    Actor: { types: [], mixins: [] },
  };

  async updateItem(doc) {
    const { addAmmoAsInstallable, addInstalledAmmo } = this.constructor;
    addAmmoAsInstallable(doc);
    addInstalledAmmo(doc);
  }

  static addAmmoAsInstallable(loadable) {
    const { installedItems, isRanged } = loadable.system;
    if (!isRanged) return;
    installedItems.allowed = true;
    if (installedItems.allowedTypes.includes("ammo")) return;
    installedItems.allowedTypes.push("ammo");
  }

  static addInstalledAmmo(loadable) {
    const { magazine, installedItems } = loadable.system;
    if (magazine.ammoData?.uuid) {
      installedItems.list.push(magazine.ammoData.uuid);
    }
    magazine.ammoData = null;
  }
}
