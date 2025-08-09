/* eslint-disable import/no-cycle */
// add your migration scripts here
export { default as RoleAbilityNaNMigration } from "./025-roleAbilities.js";
export { default as ItemQualityMigration } from "./026-itemQuality.js";
export { default as SkillTypeQualityMigration } from "./027-skillType.js";
export { default as AttackableIgnoreArmorMigration } from "./028-ignoreArmor.js";
export { default as ArmorPenaltyMigration } from "./029-armor-penalties.js";
export { default as ElectronicMigration } from "./030-isElectronic.js";
export { default as NetarchTilesMigration } from "./031-netarch-tiles.js";
export { default as AmmoIsInstallable } from "./032-ammo-is-installable.js";
export { default as UUIDsToIds } from "./033-uuids-to-ids.js";
export { default as ProgramRez } from "./034-program-rez.js";
