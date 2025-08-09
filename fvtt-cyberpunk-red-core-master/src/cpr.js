/* eslint-disable max-len */
// Object imports
import CPRActiveEffect from "./modules/cpr-active-effect.js";
import CPRActiveEffectSheet from "./modules/cpr-active-effect-sheet.js";
import { actorConstructor, itemConstructor } from "./modules/entity-factory.js";
import CPRBlackIceActorSheet from "./modules/actor/sheet/cpr-black-ice-sheet.js";
import CPRCharacterActorSheet from "./modules/actor/sheet/cpr-character-sheet.js";
import CPRContainerActorSheet from "./modules/actor/sheet/cpr-container-sheet.js";
import CPRDemonActorSheet from "./modules/actor/sheet/cpr-demon-sheet.js";
import CPRMookActorSheet from "./modules/actor/sheet/cpr-mook-sheet.js";
import CPRCombat from "./modules/combat/cpr-combat.js";
import CPRCombatant from "./modules/combat/cpr-combatant.js";

import CPRItemSheet from "./modules/item/sheet/cpr-item-sheet.js";
import LOGGER from "./modules/utils/cpr-logger.js";
import CPRMacro from "./modules/utils/cpr-macros.js";
import SystemUtils from "./modules/utils/cpr-systemUtils.js";
import MigrationRunner from "./modules/system/migrate/migration.js";
import MigrationApp from "./modules/system/migrate/migration-app.js";

// Function imports
import registerHooks from "./modules/system/hooks.js";
import preloadHandlebarsTemplates from "./modules/system/preload-templates.js";
import registerHandlebarsHelpers from "./modules/system/register-helpers.js";
import overrideRulerFunctions from "./modules/system/overrides.js";
import initalizeAPI from "./modules/api/initialize.js";

// System settings
import registerSystemSettings from "./modules/system/settings.js";

// Actor Data Models:
import BlackIceDataModel from "./modules/datamodels/actor/blackIce-datamodel.js";
import CharacterDataModel from "./modules/datamodels/actor/character-datamodel.js";
import ContainerDataModel from "./modules/datamodels/actor/container-datamodel.js";
import DemonDataModel from "./modules/datamodels/actor/demon-datamodel.js";
import MookDataModel from "./modules/datamodels/actor/mook-datamodel.js";

// Item Data Models:
import AmmoDataModel from "./modules/datamodels/item/ammo-datamodel.js";
import ArmorDataModel from "./modules/datamodels/item/armor-datamodel.js";
import ClothingDataModel from "./modules/datamodels/item/clothing-datamodel.js";
import CriticalInjuryDataModel from "./modules/datamodels/item/criticalInjury-datamodel.js";
import CyberdeckDataModel from "./modules/datamodels/item/cyberdeck-datamodel.js";
import CyberwareDataModel from "./modules/datamodels/item/cyberware-datamodel.js";
import DrugDataModel from "./modules/datamodels/item/drug-datamodel.js";
import GearDataModel from "./modules/datamodels/item/gear-datamodel.js";
import ItemUpgradeDataModel from "./modules/datamodels/item/itemUpgrade-datamodel.js";
import NetArchDataModel from "./modules/datamodels/item/netarch-datamodel.js";
import ProgramDataModel from "./modules/datamodels/item/program-datamodel.js";
import RoleDataModel from "./modules/datamodels/item/role-datamodel.js";
import SkillDataModel from "./modules/datamodels/item/skill-datamodel.js";
import VehicleDataModel from "./modules/datamodels/item/vehicle-datamodel.js";
import WeaponDataModel from "./modules/datamodels/item/weapon-datamodel.js";
import MigrationError from "./modules/system/migrate/migration-error.js";

Hooks.once("init", async () => {
  LOGGER.log("THANK YOU TO EVERYONE WHO HELPED!!!!");
  LOGGER.credits();
  // Register Actor Sheet Application Classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet(game.system.id, CPRCharacterActorSheet, {
    label: SystemUtils.Localize("CPR.sheets.characterSheet"),
    types: ["character", "mook"],
    makeDefault: true,
  });
  Actors.registerSheet(game.system.id, CPRBlackIceActorSheet, {
    label: SystemUtils.Localize("CPR.sheets.blackiceSheet"),
    types: ["blackIce"],
    makeDefault: true,
  });
  Actors.registerSheet(game.system.id, CPRContainerActorSheet, {
    label: SystemUtils.Localize("CPR.sheets.containerSheet"),
    types: ["container"],
    makeDefault: true,
  });
  Actors.registerSheet(game.system.id, CPRDemonActorSheet, {
    label: SystemUtils.Localize("CPR.sheets.demonSheet"),
    types: ["demon"],
    makeDefault: true,
  });
  Actors.registerSheet(game.system.id, CPRMookActorSheet, {
    label: SystemUtils.Localize("CPR.sheets.mookSheet"),
    types: ["character", "mook"],
  });

  // Register Item Sheet Application Classes
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet(game.system.id, CPRItemSheet, {
    types: [
      "ammo",
      "armor",
      "clothing",
      "criticalInjury",
      "cyberdeck",
      "cyberware",
      "drug",
      "gear",
      "itemUpgrade",
      "netarch",
      "program",
      "role",
      "skill",
      "vehicle",
      "weapon",
    ],
    makeDefault: true,
  });

  game.cpr = {
    apps: {
      CPRActiveEffectSheet,
      CPRBlackIceActorSheet,
      CPRCharacterActorSheet,
      CPRContainerActorSheet,
      CPRDemonActorSheet,
      CPRMookActorSheet,
      CPRItemSheet,
    },
    macro: CPRMacro,
    api: initalizeAPI(),
  };

  // Assign the actor class to the CONFIG
  CONFIG.ActiveEffect.documentClass = CPRActiveEffect;
  DocumentSheetConfig.registerSheet(
    CPRActiveEffect,
    game.system.id,
    CPRActiveEffectSheet,
    { makeDefault: true }
  );
  CONFIG.Actor.documentClass = actorConstructor;
  CONFIG.Combat.documentClass = CPRCombat;
  CONFIG.Item.documentClass = itemConstructor;
  CONFIG.Combatant.documentClass = CPRCombatant;

  // Register Actor data models.
  CONFIG.Actor.dataModels.blackIce = BlackIceDataModel;
  CONFIG.Actor.dataModels.character = CharacterDataModel;
  CONFIG.Actor.dataModels.container = ContainerDataModel;
  CONFIG.Actor.dataModels.demon = DemonDataModel;
  CONFIG.Actor.dataModels.mook = MookDataModel;

  // Register Item data models.
  CONFIG.Item.dataModels.ammo = AmmoDataModel;
  CONFIG.Item.dataModels.armor = ArmorDataModel;
  CONFIG.Item.dataModels.clothing = ClothingDataModel;
  CONFIG.Item.dataModels.criticalInjury = CriticalInjuryDataModel;
  CONFIG.Item.dataModels.cyberdeck = CyberdeckDataModel;
  CONFIG.Item.dataModels.cyberware = CyberwareDataModel;
  CONFIG.Item.dataModels.drug = DrugDataModel;
  CONFIG.Item.dataModels.gear = GearDataModel;
  CONFIG.Item.dataModels.itemUpgrade = ItemUpgradeDataModel;
  CONFIG.Item.dataModels.netarch = NetArchDataModel;
  CONFIG.Item.dataModels.program = ProgramDataModel;
  CONFIG.Item.dataModels.role = RoleDataModel;
  CONFIG.Item.dataModels.skill = SkillDataModel;
  CONFIG.Item.dataModels.vehicle = VehicleDataModel;
  CONFIG.Item.dataModels.weapon = WeaponDataModel;

  // Turn legacy tranferral for active effects off. Necessary for v11.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Make System fonts available to Foundry
  CONFIG.fontDefinitions.Jost = {
    editor: true,
    fonts: [
      {
        urls: [`systems/${game.system.id}/fonts/Jost-100.ttf`],
        weight: 100,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-200.ttf`],
        weight: 200,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-300.ttf`],
        weight: 300,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-400.ttf`],
        weight: 400,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-500.ttf`],
        weight: 500,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-600.ttf`],
        weight: 600,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-700.ttf`],
        weight: 700,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-800.ttf`],
        weight: 800,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-900.ttf`],
        weight: 900,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-100-italic.ttf`],
        weight: 100,
        style: `italic`,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-200-italic.ttf`],
        weight: 200,
        style: `italic`,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-300-italic.ttf`],
        weight: 300,
        style: `italic`,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-400-italic.ttf`],
        weight: 400,
        style: `italic`,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-500-italic.ttf`],
        weight: 500,
        style: `italic`,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-600-italic.ttf`],
        weight: 600,
        style: `italic`,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-700-italic.ttf`],
        weight: 700,
        style: `italic`,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-800-italic.ttf`],
        weight: 800,
        style: `italic`,
      },
      {
        urls: [`systems/${game.system.id}/fonts/Jost-900-italic.ttf`],
        weight: 900,
        style: `italic`,
      },
    ],
  };

  CONFIG.fontDefinitions.Tektur = {
    editor: true,
    fonts: [
      {
        urls: [`systems/${game.system.id}/fonts/Tektur-Regular.ttf`],
        weight: 400,
      },
    ],
  };

  preloadHandlebarsTemplates();
  registerHandlebarsHelpers();
  registerSystemSettings();
  overrideRulerFunctions();

  // This MUST occur after templates, helpers, and system settings are loaded or registered.
  MigrationRunner.instantiate();
});

/**
 * Perform a system migration if we are using a newer data model.
 * We allow a hidden system setting to be set so that developers can pick any data model
 * version number to migrate from. This is for migration testing purposes.
 *
 * Our data model version scheme used to follow the system module version scheme (x.y.z),
 * but then we moved to integers for maintainability's sake.
 */
Hooks.once("ready", async () => {
  if (!game.user.isGM) return;
  const { settings } = game;

  // If the world was just migrated, i.e., a user has refreshed
  // directly after a successful migration, pop up the relevant
  // Changelog from the Compendium
  if (settings.get(game.system.id, "justMigrated")) {
    MigrationApp.showChangelog();
    // Set justMigrated back to false.
    settings.set(game.system.id, "justMigrated", false);
  }

  // Handle Migration.
  const MR = game.cpr.MigrationRunner;
  // If no migrations needed, return;
  if (!MR.needsMigration) return;
  // `migrateWorld` returns true on successful migration
  let migrationSuccess = false;
  try {
    migrationSuccess = await MR.migrateWorld();
  } catch (error) {
    MR.error = new MigrationError(
      {},
      `Error occurred outside of migration scripts: '${error.message}'`,
      { cause: error, type: "NonMigrationScriptError" }
    );
    await MR.app.setCurrentPhase("error");
    LOGGER.error(error);
    await MR.app.setCurrentPhase("end");
  }

  if (migrationSuccess) {
    await settings.set(
      game.system.id,
      "dataModelVersion",
      MR.newDataModelVersion
    );
  }
  if (game.system.version !== settings.get(game.system.id, "systemVersion")) {
    await settings.set(game.system.id, "systemVersion", game.system.version);
  }
});

registerHooks();
