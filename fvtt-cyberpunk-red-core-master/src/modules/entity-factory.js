// Actors
import CPRActor from "./actor/cpr-actor.js";
import CPRBlackIceActor from "./actor/cpr-black-ice.js";
import CPRCharacterActor from "./actor/cpr-character.js";
import CPRContainerActor from "./actor/cpr-container.js";
import CPRDemonActor from "./actor/cpr-demon.js";
import CPRMookActor from "./actor/cpr-mook.js";
import CPRItem from "./item/cpr-item.js";

// Items
import CPRAmmoItem from "./item/types/cpr-ammo.js";
import CPRArmorItem from "./item/types/cpr-armor.js";
import CPRClothingItem from "./item/types/cpr-clothing.js";
import CPRCyberdeckItem from "./item/types/cpr-cyberdeck.js";
import CPRCyberwareItem from "./item/types/cpr-cyberware.js";
import CPRDrugItem from "./item/types/cpr-drug.js";
import CPRGearItem from "./item/types/cpr-gear.js";
import CPRCriticalInjuryItem from "./item/types/cpr-injury.js";
import CPRNetArchItem from "./item/types/cpr-netarch.js";
import CPRProgramItem from "./item/types/cpr-program.js";
import CPRRoleItem from "./item/types/cpr-role.js";
import CPRSkillItem from "./item/types/cpr-skill.js";
import CPRUpgradeItem from "./item/types/cpr-upgrade.js";
import CPRVehicleItem from "./item/types/cpr-vehicle.js";
import CPRWeaponItem from "./item/types/cpr-weapon.js";

// Utilities
import { validateOverride } from "./system/overrides.js";

/**
 * This code is heavily borrowed from the Burning Wheel system module. The jist
 * is to provide a Proxy object (this a native thing in JavaScript) whenever an actor
 * object is created with a sheet. We associate the Proxy object to CONFIG.Actor.documentClass
 * in the top-level cpr.js, which allows us to have custom classes underneath for each actor
 * type.
 *
 * Beware, a lot of this code is inspected (loaded) when Foundry is initializing, so any code
 * that depends on basic things like system settings will not work. During that time they do
 * not exist yet.
 *
 * @param {} entities - a mapping of actor types to classes
 * @param {*} baseClass - the basic Actor class from Foundry we put the Proxy in front of
 * @returns - a Proxy object with interceptions routing to the desired actor class
 */
function factory(entities, baseClass) {
  return new Proxy(baseClass, {
    construct: (target, args) => {
      const [data, options] = args;
      const constructor = entities[data.type];
      if (!constructor)
        throw new Error(`Unsupported Entity type for create(): ${data.type}`);

      // Override the validate() function to suppress validation if migration is happening.
      constructor.prototype.validate = validateOverride;
      return new constructor(data, options);
    },
    get: (target, prop) => {
      switch (prop) {
        case "create":
          // Calling the class' create() static function
          return (data, options) => {
            const constructor = entities[data.type];
            if (!constructor)
              throw new Error(
                `Unsupported Entity type for create(): ${data.type}`
              );
            return constructor.create(data, options);
          };
        case Symbol.hasInstance:
          // Applying the "instanceof" operator on the instance object
          return (instance) => {
            const constr = entities[instance.type];
            if (!constr) {
              return false;
            }
            return instance instanceof constr;
          };
        default:
          // Just forward any requested properties to the base Actor class
          return baseClass[prop];
      }
    },
  });
}

const actorTypes = {};
actorTypes.blackIce = CPRBlackIceActor;
actorTypes.character = CPRCharacterActor;
actorTypes.container = CPRContainerActor;
actorTypes.demon = CPRDemonActor;
actorTypes.mook = CPRMookActor;
export const actorConstructor = factory(actorTypes, CPRActor);

const itemTypes = {};
itemTypes.ammo = CPRAmmoItem;
itemTypes.armor = CPRArmorItem;
itemTypes.clothing = CPRClothingItem;
itemTypes.criticalInjury = CPRCriticalInjuryItem;
itemTypes.cyberdeck = CPRCyberdeckItem;
itemTypes.cyberware = CPRCyberwareItem;
itemTypes.drug = CPRDrugItem;
itemTypes.gear = CPRGearItem;
itemTypes.itemUpgrade = CPRUpgradeItem;
itemTypes.netarch = CPRNetArchItem;
itemTypes.program = CPRProgramItem;
itemTypes.role = CPRRoleItem;
itemTypes.skill = CPRSkillItem;
itemTypes.vehicle = CPRVehicleItem;
itemTypes.weapon = CPRWeaponItem;
export const itemConstructor = factory(itemTypes, CPRItem);
