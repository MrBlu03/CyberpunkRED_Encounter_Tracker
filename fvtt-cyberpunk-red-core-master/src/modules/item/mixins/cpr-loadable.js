import CPRDialog from "../../dialog/cpr-dialog-application.js";
import * as CPRRolls from "../../rolls/cpr-rolls.js";
import CPR from "../../system/config.js";
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

/**
 * The Loadable mixin is meant for items that can be loaded with something. Usually
 * that means ammunition, but there are edge cases like batteries or other charges
 * that do not have a finite amount of shots. Note that "shooting" logic does not
 * belong here, this is just for loading and unloading.
 */
const Loadable = function Loadable() {
  /**
   * set the list of ammo types this item can load
   *
   * @async
   * @param {String} ammoList - the ammo type that can be loaded
   * @returns - the updated item document
   */
  this.setCompatibleAmmo = async function setCompatibleAmmo(ammoList) {
    this.system.ammoVariety = ammoList;
    if (this.actor) {
      this.actor.updateEmbeddedDocuments("Item", [
        { _id: this.id, system: this.system },
      ]);
    }
    return this.update({ "system.ammoVariety": ammoList });
  };

  /**
   * Set DV table that a TOKEN (from an actor) will use when measuring distance. This also takes
   * whether the item is set to autofire or not.
   *
   * @async
   * @param {CPRActor} actor - actor associated with the token
   * @param {String} dvTable - which dvTable to use, overridden if autofire is set.
   */
  this._setDvTable = async function _setDvTable(actor, dvTable) {
    const flag = foundry.utils.getProperty(
      actor,
      `flags.${game.system.id}.firetype-${this._id}`
    );
    const activeTable = flag === "autofire" ? `${dvTable} (Autofire)` : dvTable;
    if (actor.sheet.token !== null)
      return SystemUtils.SetDvTable(actor.sheet.token.object, activeTable);
    return Promise.resolve();
  };

  /**
   * Unload this weapon. Put the ammo back in the ammo item.
   * Called by `containerMixin.uninstallItems()`.
   *
   * @async
   * @returns {Promise}
   */
  this.unload = async function unload() {
    const [currentAmmo] = this.getInstalledItems("ammo");
    const newAmount = currentAmmo.system.amount + this.system.magazine.value;
    await this.update({ "system.magazine.value": 0 });
    return currentAmmo.update({ "system.amount": newAmount });
  };

  /**
   * Open a dialog to configure which ammo is loaded into this weapon.
   *
   * @async
   * @returns {Promise}
   */
  this.load = async function load() {
    const [currentAmmo] = this.getInstalledItems("ammo");
    const ownedAmmo = this.actor.itemTypes.ammo;
    const validAmmo = [];
    Object.keys(ownedAmmo).forEach((index) => {
      const ammo = ownedAmmo[index];
      if (this.system.ammoVariety.includes(ammo.system.variety)) {
        validAmmo.push(ammo);
      }
    });
    if (validAmmo.length === 0) {
      return SystemUtils.DisplayMessage(
        "warn",
        SystemUtils.Localize("CPR.messages.noValidAmmo")
      );
    }
    // Prepare select options for ammo.
    const ammoSelectOptions = validAmmo.map((ammo) => {
      const ammoTypeSubstrings = [
        SystemUtils.Localize(CPR.ammoTypes[ammo.system.type]),
        ammo.system.type,
      ];
      // Only programatically show the ammo type if it's not in the name.
      const showAmmoType = !ammoTypeSubstrings.some((substring) =>
        ammo.name.toLowerCase().includes(substring.toLowerCase())
      );

      let label = ammo.name;
      if (showAmmoType) {
        label += ` (${ammoTypeSubstrings[0]})`;
      }
      label += ` [x${ammo.system.amount}]`;
      return {
        label,
        value: ammo.id,
      };
    });
    // Add an "unload" option if the weapon has loaded ammo.
    if (this.system.hasAmmoLoaded) {
      ammoSelectOptions.unshift({
        value: "",
        label: SystemUtils.Localize("CPR.dialog.loadAmmo.unload"),
      });
    }

    let dialogData = {
      weaponName: this.name,
      ammoList: ammoSelectOptions,
      selectedAmmo: currentAmmo?.id || validAmmo[0].id,
    };

    // Show "Load Ammo" dialog,
    dialogData = await CPRDialog.showDialog(dialogData, {
      // Set the options for the dialog.
      template: `systems/${game.system.id}/templates/dialog/cpr-load-ammo-prompt.hbs`,
      title: SystemUtils.Localize("CPR.dialog.selectAmmo.title"),
    }).catch((err) => LOGGER.debug(err));
    if (dialogData === undefined) {
      return Promise.resolve();
    }

    const selectedAmmoId = dialogData.selectedAmmo;
    if (!selectedAmmoId) {
      return this.uninstallItems([currentAmmo]);
    }

    const selectedAmmo = this.actor.getOwnedItem(selectedAmmoId);
    if (selectedAmmo?.id !== currentAmmo?.id) {
      if (currentAmmo) {
        await this.uninstallItems([currentAmmo]);
      }
      const success = await this.installItems([selectedAmmo]);
      return success ? this.reload() : Promise.resolve();
    }
    return Promise.resolve();
  };

  /**
   * Reload this weapon from loaded ammo. If no ammo is loaded, open the load dialog.
   *
   * @async
   * @returns {Promise}
   */
  this.reload = async function reload() {
    const [loadedAmmo] = this.getInstalledItems("ammo");
    if (!loadedAmmo) {
      return this.load();
    }
    if (loadedAmmo.system.amount === 0) {
      return SystemUtils.DisplayMessage(
        "warn",
        SystemUtils.Localize("CPR.messages.reloadOutOfAmmo")
      );
    }
    const magazineSpace = this.getUpgradedMagazine();
    if (magazineSpace > 0) {
      let newValue = this.system.magazine.value;
      if (loadedAmmo.system.amount >= magazineSpace) {
        newValue += magazineSpace;
        await this.update({ "system.magazine.value": newValue });
        return loadedAmmo._ammoDecrement(magazineSpace);
      }

      newValue = this.system.magazine.value + loadedAmmo.system.amount;
      await this.update({ "system.magazine.value": newValue });
      return loadedAmmo._ammoDecrement(loadedAmmo.system.amount);
    }
    return Promise.resolve();
  };

  /**
   * Calculate the amount of space in this magazine, including upgrades.
   *
   * @returns {Number} - upgraded magazine space
   */
  this.getUpgradedMagazine = function getUpgradedMagazine() {
    const magazineData = this.system.magazine;
    const upgradeData = this.getTotalUpgradeValues("magazine");
    const magazineSpace =
      upgradeData.type === "override"
        ? upgradeData.value - magazineData.value
        : magazineData.max - magazineData.value + upgradeData.value;

    return magazineSpace;
  };

  /**
   * Figure out how many bullets to consume given a roll. Autofire and Suppressive
   * fire are 10 says the rules, it's 1 otherwise.
   *
   * @param {CPRRoll} cprRoll - a roll (presumably an attack roll)
   * @returns {Number} how many bullets to consume given the roll
   */
  this.bulletConsumption = function bulletConsumption(cprRoll) {
    let bulletCount = 1;
    if (
      cprRoll instanceof CPRRolls.CPRAutofireRoll ||
      cprRoll instanceof CPRRolls.CPRSuppressiveFireRoll
    ) {
      bulletCount = 10;
    }
    return bulletCount;
  };

  /**
   * Does this item have enough ammo for the attack?
   * @returns - true or false
   */
  this.hasAmmo = function hasAmmo(cprRoll) {
    return this.system.magazine.value - this.bulletConsumption(cprRoll) >= 0;
  };

  /**
   * Set the amount of ammo in this item. If value has a + or - in front of it,
   * then the amount of ammo is changed by the value, rather than set to it.
   *
   * @param {String} value - a number with an optional + or - prefixing it
   */
  this.setWeaponAmmo = function setWeaponAmmo(value) {
    const maxAmmo = this.system.magazine.max;
    if (this.type === "weapon") {
      if (value.charAt(0) === "+" || value.charAt(0) === "-") {
        this.system.magazine.value = Math.clamp(
          0,
          this.system.magazine.value + parseInt(value, 10),
          maxAmmo
        );
      } else {
        this.system.magazine.value = Math.clamp(0, value, maxAmmo);
      }
    }
  };

  /**
   * Get a property of the ammo that is currently loaded in this weapon.
   *
   * @param {String} - the desired property to look up and return the value of
   * @returns {*} - value of the ammo property
   */
  this._getLoadedAmmoProp = function _getLoadedAmmoProp(prop) {
    if (this.actor) {
      const [ammo] = this.getInstalledItems("ammo");
      if (ammo) {
        return foundry.utils.getProperty(ammo.system, prop);
      }
    }
    return undefined;
  };

  /**
   * When a loadable item has an upgrade removed we need to sync the magazine data
   * in case the magazine size decreased, we need to remove the extra bullets.
   *
   * @returns {Array} - updated embedded documents
   */
  this.syncMagazine = async function syncMagazine() {
    const updateData = [];
    const { actor } = this;
    const magazineData = this.system.magazine;
    const upgradeInfo = this.getTotalUpgradeValues("magazine");
    const upgradedMagazineSize =
      upgradeInfo.type === "override"
        ? upgradeInfo.value
        : magazineData.max + upgradeInfo.value;
    // If upgrade size is larger than the base magazine size...
    if (upgradedMagazineSize > magazineData.max) {
      // ...calculate how much over the base magazine size we are....
      const overage = magazineData.value - magazineData.max;
      // ....If overage is positive...
      if (overage > 0) {
        // ...restore magazine's current value to max size...
        updateData.push({
          _id: this._id,
          "system.magazine.value": magazineData.max,
        });
        const ammoItem = this.system.loadedAmmo;
        if (ammoItem) {
          // ...and restore excess to the ammo item.
          const newAmmoAmount = ammoItem.system.amount + overage;
          updateData.push({
            _id: ammoItem._id,
            "system.amount": newAmmoAmount,
          });
        }
      }
    }
    return actor.updateEmbeddedDocuments("Item", updateData);
  };
};

export default Loadable;
