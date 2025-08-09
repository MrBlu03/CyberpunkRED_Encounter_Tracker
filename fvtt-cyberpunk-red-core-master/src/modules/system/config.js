/**
 * config.js functions like a header file providing a bunch of constants used all over the code base.
 * In many ways they are like enums.
 */
const CPR = {};

// Sorted as shown on char sheet (with resources pushed to bottom)
CPR.statList = {
  int: "CPR.global.stats.int",
  ref: "CPR.global.stats.ref",
  dex: "CPR.global.stats.dex",
  tech: "CPR.global.stats.tech",
  cool: "CPR.global.stats.cool",
  will: "CPR.global.stats.will",
  move: "CPR.global.stats.move",
  body: "CPR.global.stats.body",
  luck: "CPR.global.stats.luck",
  emp: "CPR.global.stats.emp",
};

// Sorted A-Z
CPR.roleList = {
  exec: "CPR.global.role.exec.name",
  fixer: "CPR.global.role.fixer.name",
  lawman: "CPR.global.role.lawman.name",
  media: "CPR.global.role.media.name",
  medtech: "CPR.global.role.medtech.name",
  netrunner: "CPR.global.role.netrunner.name",
  nomad: "CPR.global.role.nomad.name",
  rockerboy: "CPR.global.role.rockerboy.name",
  solo: "CPR.global.role.solo.name",
  tech: "CPR.global.role.tech.name",
};

// Sorted A-Z
CPR.roleAbilityList = {
  backup: "CPR.global.role.lawman.ability.backup",
  charismaticImpact: "CPR.global.role.rockerboy.ability.charismaticImpact",
  combatAwareness: "CPR.global.role.solo.ability.combatAwareness",
  credibility: "CPR.global.role.media.ability.credibility",
  damageDeflection: "CPR.global.role.solo.ability.damageDeflection",
  fabricationExpertise: "CPR.global.role.tech.ability.fabricationExpertise",
  fieldExpertise: "CPR.global.role.tech.ability.fieldExpertise",
  fumbleRecovery: "CPR.global.role.solo.ability.fumbleRecovery",
  initiativeReaction: "CPR.global.role.solo.ability.initiativeReaction",
  interface: "CPR.global.role.netrunner.ability.interface",
  inventionExpertise: "CPR.global.role.tech.ability.inventionExpertise",
  maker: "CPR.global.role.tech.ability.maker",
  medicine: "CPR.global.role.medtech.ability.medicine",
  medicalTech: "CPR.global.role.medtech.ability.medicalTech",
  "medicalTech(CryosystemOperation)":
    "CPR.global.role.medtech.ability.medicalTech(CryosystemOperation)",
  "medicalTech(Pharmaceuticals)":
    "CPR.global.role.medtech.ability.medicalTech(Pharmaceuticals)",
  moto: "CPR.global.role.nomad.ability.moto",
  operator: "CPR.global.role.fixer.ability.operator",
  precisionAttack: "CPR.global.role.solo.ability.precisionAttack",
  spotWeakness: "CPR.global.role.solo.ability.spotWeakness",
  surgery: "CPR.global.role.medtech.ability.surgery",
  teamwork: "CPR.global.role.exec.ability.teamwork",
  threatDetection: "CPR.global.role.solo.ability.threatDetection",
  upgradeExpertise: "CPR.global.role.tech.ability.upgradeExpertise",
};

// Sorted A-Z
CPR.skillCategories = {
  awarenessSkills: "CPR.global.skillCategories.awarenessSkills",
  bodySkills: "CPR.global.skillCategories.bodySkills",
  controlSkills: "CPR.global.skillCategories.controlSkills",
  educationSkills: "CPR.global.skillCategories.educationSkills",
  fightingSkills: "CPR.global.skillCategories.fightingSkills",
  performanceSkills: "CPR.global.skillCategories.performanceSkills",
  rangedweaponSkills: "CPR.global.skillCategories.rangedWeaponSkills",
  socialSkills: "CPR.global.skillCategories.socialSkills",
  techniqueSkills: "CPR.global.skillCategories.techniqueSkills",
};

// Sorted for weapon skill selection (most common categories at the top).
CPR.skillCategoriesForWeapons = {
  fightingSkills: "CPR.global.skillCategories.fightingSkills",
  rangedweaponSkills: "CPR.global.skillCategories.rangedWeaponSkills",
  bodySkills: "CPR.global.skillCategories.bodySkills",
  controlSkills: "CPR.global.skillCategories.controlSkills",
  awarenessSkills: "CPR.global.skillCategories.awarenessSkills",
  educationSkills: "CPR.global.skillCategories.educationSkills",
  performanceSkills: "CPR.global.skillCategories.performanceSkills",
  socialSkills: "CPR.global.skillCategories.socialSkills",
  techniqueSkills: "CPR.global.skillCategories.techniqueSkills",
};

// Sorted A-Z
CPR.skillList = {
  accounting: "CPR.global.itemType.skill.accounting",
  acting: "CPR.global.itemType.skill.acting",
  airVehicleTech: "CPR.global.itemType.skill.airVehicleTech",
  animalHandling: "CPR.global.itemType.skill.animalHandling",
  archery: "CPR.global.itemType.skill.archery",
  athletics: "CPR.global.itemType.skill.athletics",
  autofire: "CPR.global.itemType.skill.autofire",
  basicTech: "CPR.global.itemType.skill.basicTech",
  brawling: "CPR.global.itemType.skill.brawling",
  bribery: "CPR.global.itemType.skill.bribery",
  bureaucracy: "CPR.global.itemType.skill.bureaucracy",
  business: "CPR.global.itemType.skill.business",
  composition: "CPR.global.itemType.skill.composition",
  concealOrRevealObject: "CPR.global.itemType.skill.concealOrRevealObject",
  concentration: "CPR.global.itemType.skill.concentration",
  contortionist: "CPR.global.itemType.skill.contortionist",
  conversation: "CPR.global.itemType.skill.conversation",
  criminology: "CPR.global.itemType.skill.criminology",
  cryptography: "CPR.global.itemType.skill.cryptography",
  cybertech: "CPR.global.itemType.skill.cybertech",
  dance: "CPR.global.itemType.skill.dance",
  deduction: "CPR.global.itemType.skill.deduction",
  demolitions: "CPR.global.itemType.skill.demolitions",
  driveLandVehicle: "CPR.global.itemType.skill.driveLandVehicle",
  education: "CPR.global.itemType.skill.education",
  electronicsAndSecurityTech:
    "CPR.global.itemType.skill.electronicsAndSecurityTech",
  endurance: "CPR.global.itemType.skill.endurance",
  evasion: "CPR.global.itemType.skill.evasion",
  forgery: "CPR.global.itemType.skill.forgery",
  firstAid: "CPR.global.itemType.skill.firstAid",
  gamble: "CPR.global.itemType.skill.gamble",
  handgun: "CPR.global.itemType.skill.handgun",
  heavyWeapons: "CPR.global.itemType.skill.heavyWeapons",
  humanPerception: "CPR.global.itemType.skill.humanPerception",
  interrogation: "CPR.global.itemType.skill.interrogation",
  landVehicleTech: "CPR.global.itemType.skill.landVehicleTech",
  language: "CPR.global.itemType.skill.language",
  librarySearch: "CPR.global.itemType.skill.librarySearch",
  lipReading: "CPR.global.itemType.skill.lipReading",
  localExpert: "CPR.global.itemType.skill.localExpert",
  martialArts: "CPR.global.itemType.skill.martialArts",
  meleeWeapon: "CPR.global.itemType.skill.meleeWeapon",
  paintOrDrawOrSculpt: "CPR.global.itemType.skill.paintOrDrawOrSculpt",
  paramedic: "CPR.global.itemType.skill.paramedic",
  perception: "CPR.global.itemType.skill.perception",
  personalGrooming: "CPR.global.itemType.skill.personalGrooming",
  persuasion: "CPR.global.itemType.skill.persuasion",
  photographyAndFilm: "CPR.global.itemType.skill.photographyAndFilm",
  pickLock: "CPR.global.itemType.skill.pickLock",
  pickPocket: "CPR.global.itemType.skill.pickPocket",
  pilotAirVehicle: "CPR.global.itemType.skill.pilotAirVehicle",
  pilotSeaVehicle: "CPR.global.itemType.skill.pilotSeaVehicle",
  playInstrument: "CPR.global.itemType.skill.playInstrument",
  resistTortureOrDrugs: "CPR.global.itemType.skill.resistTortureOrDrugs",
  riding: "CPR.global.itemType.skill.riding",
  science: "CPR.global.itemType.skill.science",
  seaVehicleTech: "CPR.global.itemType.skill.seaVehicleTech",
  shoulderArms: "CPR.global.itemType.skill.shoulderArms",
  stealth: "CPR.global.itemType.skill.stealth",
  streetWise: "CPR.global.itemType.skill.streetwise",
  tactics: "CPR.global.itemType.skill.tactics",
  trading: "CPR.global.itemType.skill.trading",
  tracking: "CPR.global.itemType.skill.tracking",
  wardrobeAndStyle: "CPR.global.itemType.skill.wardrobeAndStyle",
  weaponstech: "CPR.global.itemType.skill.weaponstech",
  wildernessSurvival: "CPR.global.itemType.skill.wildernessSurvival",
};

// Unsorted
CPR.skillDifficulties = {
  typical: "CPR.global.itemType.skill.difficulty.typical",
  difficult: "CPR.global.itemType.skill.difficulty.difficult",
  role: "CPR.global.itemType.skill.difficulty.role",
};

// Some skills like Martial Arts are not skills in them selves but a type of
// skill;
CPR.skillTypes = {
  generic: "CPR.global.itemType.skill.skillType.generic",
  language: "CPR.global.itemType.skill.skillType.language",
  localExpert: "CPR.global.itemType.skill.skillType.localExpert",
  martialArt: "CPR.global.itemType.skill.skillType.martialArt",
  playInstrument: "CPR.global.itemType.skill.skillType.playInstrument",
  science: "CPR.global.itemType.skill.skillType.science",
};

// Sorted as listed in core rule book
CPR.weaponTypes = {
  assaultRifle: "CPR.global.weaponType.assaultRifle",
  bow: "CPR.global.weaponType.bowsAndCrossbows",
  grenadeLauncher: "CPR.global.weaponType.grenadeLauncher",
  heavyMelee: "CPR.global.weaponType.heavyMeleeWeapon",
  heavyPistol: "CPR.global.weaponType.heavyPistol",
  heavySmg: "CPR.global.weaponType.heavySmg",
  lightMelee: "CPR.global.weaponType.lightMeleeWeapon",
  martialArts: "CPR.global.weaponType.martialArts",
  medMelee: "CPR.global.weaponType.mediumMeleeWeapon",
  medPistol: "CPR.global.weaponType.mediumPistol",
  rocketLauncher: "CPR.global.weaponType.rocketLauncher",
  shotgun: "CPR.global.weaponType.shotgun",
  smg: "CPR.global.weaponType.smg",
  sniperRifle: "CPR.global.weaponType.sniperRifle",
  thrownWeapon: "CPR.global.weaponType.thrownWeapon",
  unarmed: "CPR.global.weaponType.unarmed",
  vHeavyMelee: "CPR.global.weaponType.veryHeavyMeleeWeapon",
  vHeavyPistol: "CPR.global.weaponType.veryHeavyPistol",
};

// Sorted A-Z, with custom at the end
CPR.ammoVarieties = {
  arrow: "CPR.global.ammo.variety.arrow",
  battery: "CPR.global.ammo.variety.battery",
  grenade: "CPR.global.ammo.variety.grenade",
  heavyPistol: "CPR.global.ammo.variety.heavyPistol",
  medPistol: "CPR.global.ammo.variety.mediumPistol",
  paintball: "CPR.global.ammo.variety.paintball",
  rifle: "CPR.global.ammo.variety.rifle",
  rocket: "CPR.global.ammo.variety.rocket",
  shotgunShell: "CPR.global.ammo.variety.shell",
  shotgunSlug: "CPR.global.ammo.variety.slug",
  vHeavyPistol: "CPR.global.ammo.variety.veryHeavyPistol",
  custom: "CPR.global.ammo.variety.custom",
};

CPR.attackableCritFailEffects = {
  destroyed: "CPR.itemSheet.critFailEffect.destroyed",
  destroyedBeyondRepair: "CPR.itemSheet.critFailEffect.destroyedBeyondRepair",
  jammed: "CPR.itemSheet.critFailEffect.jam",
  coinToss: "CPR.itemSheet.critFailEffect.coinToss",
};

// Sorted A-Z, with basic at the start and special at the end
CPR.ammoTypes = {
  basic: "CPR.global.ammo.type.basic",
  acid: "CPR.global.ammo.type.acid",
  armorPiercing: "CPR.global.ammo.type.armorPiercing",
  biotoxin: "CPR.global.ammo.type.biotoxin",
  emp: "CPR.global.ammo.type.emp",
  expansive: "CPR.global.ammo.type.expansive",
  flashbang: "CPR.global.ammo.type.flashBang",
  incendiary: "CPR.global.ammo.type.incendiary",
  poison: "CPR.global.ammo.type.poison",
  rubber: "CPR.global.ammo.type.rubber",
  sleep: "CPR.global.ammo.type.sleep",
  smart: "CPR.global.ammo.type.smart",
  smoke: "CPR.global.ammo.type.smoke",
  teargas: "CPR.global.ammo.type.tearGas",
  special: "CPR.global.ammo.type.special",
};

CPR.ammoDamageOverrideModes = {
  none: "CPR.global.generic.no",
  set: "CPR.global.generic.set",
  modify: "CPR.global.generic.modify",
};

CPR.ammoAutofireOverrideModes = {
  none: "CPR.global.generic.no",
  set: "CPR.global.generic.set",
  modify: "CPR.global.generic.modify",
};

CPR.inventoryCategories = {
  weapon: "CPR.global.itemTypes.weapon",
  ammo: "CPR.global.itemTypes.ammo",
  armor: "CPR.global.itemTypes.armor",
  cyberware: "CPR.global.itemTypes.cyberware",
  drug: "CPR.global.itemTypes.drug",
  gear: "CPR.global.itemTypes.gear",
  clothing: "CPR.global.itemTypes.clothing",
  vehicle: "CPR.global.itemTypes.vehicle",
  cyberdeck: "CPR.global.itemTypes.cyberdeck",
  program: "CPR.global.itemTypes.program",
  itemUpgrade: "CPR.global.itemTypes.itemUpgrade",
  netarch: "CPR.global.itemTypes.netArchitecture",
};

// Sorted A-Z
CPR.objectTypes = {
  ammo: "CPR.global.itemTypes.ammo",
  armor: "CPR.global.itemTypes.armor",
  clothing: "CPR.global.itemTypes.clothing",
  criticalInjury: "CPR.global.itemTypes.criticalInjury",
  cyberdeck: "CPR.global.itemTypes.cyberdeck",
  cyberware: "CPR.global.itemTypes.cyberware",
  drug: "CPR.global.itemTypes.drug",
  gear: "CPR.global.itemTypes.gear",
  itemUpgrade: "CPR.global.itemTypes.itemUpgrade",
  netarch: "CPR.global.itemTypes.netArchitecture",
  program: "CPR.global.itemTypes.program",
  role: "CPR.global.itemTypes.role",
  skill: "CPR.global.itemTypes.skill",
  vehicle: "CPR.global.itemTypes.vehicle",
  weapon: "CPR.global.itemTypes.weapon",
};

// Sorted A-Z
CPR.clothingVarieties = {
  asiaPop: "CPR.global.clothing.style.asiaPop",
  bagLadyChic: "CPR.global.clothing.style.bagLadyChic",
  bohemian: "CPR.global.clothing.style.bohemian",
  businesswear: "CPR.global.clothing.style.businessWear",
  gangColors: "CPR.global.clothing.style.gangColors",
  genericChic: "CPR.global.clothing.style.genericChic",
  highFashion: "CPR.global.clothing.style.highFashion",
  leisurewear: "CPR.global.clothing.style.leisureWear",
  nomadLeathers: "CPR.global.clothing.style.nomadLeathers",
  urbanFlash: "CPR.global.clothing.style.urbanFlash",
};

// Sorted A-Z
CPR.clothingTypes = {
  bottoms: "CPR.global.clothing.type.bottoms",
  contactLenses: "CPR.global.clothing.type.contactLenses",
  footwear: "CPR.global.clothing.type.footWear",
  glasses: "CPR.global.clothing.type.glasses",
  hats: "CPR.global.clothing.type.hats",
  jacket: "CPR.global.clothing.type.jacket",
  jewelry: "CPR.global.clothing.type.jewelry",
  mirrorshades: "CPR.global.clothing.type.mirrorshades",
  top: "CPR.global.clothing.type.top",
};

//
CPR.cyberwareTypes = {
  cyberAudioSuite: "CPR.global.cyberwareType.cyberAudioSuite",
  cyberEye: "CPR.global.cyberwareType.cyberEye",
  cyberArm: "CPR.global.cyberwareType.cyberArm",
  cyberLeg: "CPR.global.cyberwareType.cyberLeg",
  neuralWare: "CPR.global.cyberwareType.neuralware",
  cyberwareInternal: "CPR.global.cyberwareType.cyberwareInternal",
  cyberwareExternal: "CPR.global.cyberwareType.cyberwareExternal",
  fashionware: "CPR.global.cyberwareType.fashionware",
  borgware: "CPR.global.cyberwareType.borgware",
};

CPR.cyberwareInstallList = {
  mall: "CPR.global.cyberwareInstall.mall",
  clinic: "CPR.global.cyberwareInstall.clinic",
  hospital: "CPR.global.cyberwareInstall.hospital",
  notApplicable: "CPR.global.generic.notApplicable",
};

CPR.cyberwareHumanityLossType = {
  roll: "CPR.dialog.installCyberware.roll",
  static: "CPR.dialog.installCyberware.static",
  none: "CPR.dialog.installCyberware.none",
};

CPR.woundState = {
  notWounded: "CPR.global.woundState.notWounded",
  lightlyWounded: "CPR.global.woundState.lightlyWounded",
  seriouslyWounded: "CPR.global.woundState.seriouslyWounded",
  mortallyWounded: "CPR.global.woundState.mortallyWounded",
  dead: "CPR.global.woundState.dead",
};

// Sorted A-Z
CPR.equipped = {
  carried: "CPR.global.equipState.carried",
  equipped: "CPR.global.equipState.equipped",
  owned: "CPR.global.equipState.owned",
};

CPR.itemPriceCategory = {
  free: "CPR.global.priceCategory.free",
  dirtCheap: "CPR.global.priceCategory.dirtCheap",
  cheap: "CPR.global.priceCategory.cheap",
  everyday: "CPR.global.priceCategory.everyday",
  costly: "CPR.global.priceCategory.costly",
  premium: "CPR.global.priceCategory.premium",
  expensive: "CPR.global.priceCategory.expensive",
  veryExpensive: "CPR.global.priceCategory.veryExpensive",
  luxury: "CPR.global.priceCategory.luxury",
  superLuxury: "CPR.global.priceCategory.superLuxury",
};

CPR.itemPriceCategoryMap = {
  free: 0,
  dirtCheap: 5,
  cheap: 10,
  everyday: 20,
  costly: 50,
  premium: 100,
  expensive: 500,
  veryExpensive: 1000,
  luxury: 5000,
  superLuxury: 10000,
};

CPR.itemQuality = {
  standard: "CPR.global.itemQuality.standard",
  poor: "CPR.global.itemQuality.poor",
  excellent: "CPR.global.itemQuality.excellent",
};

CPR.criticalInjuryTables = {
  "Critical Injuries (Head)": "critical-injuries-head",
  "Critical Injuries (Body)": "critical-injuries-body",
};

CPR.netArchDifficulty = {
  basic: "CPR.dialog.netArchitectureRolltableSelection.basic",
  standard: "CPR.dialog.netArchitectureRolltableSelection.standard",
  uncommon: "CPR.dialog.netArchitectureRolltableSelection.uncommon",
  advanced: "CPR.dialog.netArchitectureRolltableSelection.advanced",
};

// game.system is not defined when this file is read, so there is a magic string here
CPR.defaultCriticalInjuryTable =
  "cyberpunk-red-core.internal_critical-injury-tables";
CPR.defaultNetArchTable = "cyberpunk-red-core.internal_net-rolltables";
CPR.defaultDvTable = "cyberpunk-red-core.internal_dv-tables";
CPR.changelogCompendium = "cyberpunk-red-core.other_changelog";

CPR.criticalInjuryLocation = {
  body: "CPR.global.location.body",
  head: "CPR.global.location.head",
};

CPR.criticalInjuryQuickFix = {
  firstAidParamedic: "CPR.global.criticalInjury.firstAidOrParamedic",
  paramedic: "CPR.global.itemType.skill.paramedic",
  notApplicable: "CPR.global.generic.notApplicable",
};

CPR.criticalInjuryTreatment = {
  paramedicSurgery: "CPR.global.criticalInjury.paramedicOrSurgery",
  quickFix: "CPR.global.criticalInjury.quickfix",
  surgery: "CPR.global.role.medtech.ability.surgery",
};

CPR.aimedLocation = {
  head: "CPR.global.location.head",
  heldItem: "CPR.global.location.heldItem",
  leg: "CPR.global.location.leg",
};

CPR.damageLocation = {
  brain: "CPR.global.location.brain",
  head: "CPR.global.location.head",
  heldItem: "CPR.global.location.heldItem",
  leg: "CPR.global.location.leg",
};

CPR.containerType = {
  shop: "CPR.containerSheet.containerType.shop",
  loot: "CPR.containerSheet.containerType.loot",
  stash: "CPR.containerSheet.containerType.stash",
  custom: "CPR.containerSheet.containerType.custom",
};

CPR.blackIceType = {
  antipersonnel: "CPR.global.blackIce.type.antiPersonnel",
  antiprogram: "CPR.global.blackIce.type.antiProgram",
  other: "CPR.global.blackIce.type.other",
};

CPR.blackIceStatList = {
  per: "CPR.global.blackIce.stats.per",
  spd: "CPR.global.blackIce.stats.spd",
  atk: "CPR.global.blackIce.stats.atk",
  def: "CPR.global.blackIce.stats.def",
  rez: "CPR.global.generic.rez",
};

CPR.demonStatList = {
  rez: "CPR.global.generic.rez",
  interface: "CPR.global.role.netrunner.ability.interface",
  netactions: "CPR.global.demon.netActions",
  combatNumber: "CPR.global.demon.combatNumber",
};

CPR.programClassList = {
  antipersonnelattacker: "CPR.global.programClass.antiPersonnelAttacker",
  antiprogramattacker: "CPR.global.programClass.antiProgramAttacker",
  booster: "CPR.global.programClass.booster",
  defender: "CPR.global.programClass.defender",
  blackice: "CPR.global.programClass.blackice",
};

CPR.interfaceAbilities = {
  scanner: "CPR.global.role.netrunner.interfaceAbility.scanner",
  backdoor: "CPR.global.role.netrunner.interfaceAbility.backdoor",
  cloak: "CPR.global.role.netrunner.interfaceAbility.cloak",
  control: "CPR.global.role.netrunner.interfaceAbility.control",
  eyedee: "CPR.global.role.netrunner.interfaceAbility.eyedee",
  pathfinder: "CPR.global.role.netrunner.interfaceAbility.pathfinder",
  slide: "CPR.global.role.netrunner.interfaceAbility.slide",
  virus: "CPR.global.role.netrunner.interfaceAbility.virus",
  zap: "CPR.global.role.netrunner.interfaceAbility.zap",
};

CPR.roleSpecialOptions = {
  "--": "CPR.global.generic.notApplicable",
  varying: "CPR.global.generic.varying",
};

CPR.universalBonuses = {
  attack: "CPR.universalBonuses.attack",
  damage: "CPR.universalBonuses.damage",
  damageReduction: "CPR.universalBonuses.damageReduction",
  initiative: "CPR.universalBonuses.initiative",
  fumbleRecovery: "CPR.universalBonuses.fumbleRecovery",
};

CPR.effectModifierModes = {
  1: "CPR.effectSheet.modifiers.multiply",
  2: "CPR.effectSheet.modifiers.addSubtract",
  3: "CPR.effectSheet.modifiers.lowerOf",
  4: "CPR.effectSheet.modifiers.higherOf",
  5: "CPR.effectSheet.modifiers.override",
};

CPR.effectUses = {
  always: "CPR.effectSheet.uses.always",
  carried: "CPR.effectSheet.uses.carried",
  equipped: "CPR.effectSheet.uses.equipped",
  installed: "CPR.effectSheet.uses.installed",
  rezzed: "CPR.effectSheet.uses.rezzed",
  snorted: "CPR.effectSheet.uses.snorted",
  toggled: "CPR.effectSheet.uses.toggled",
};

// The following item types have the upgradable template:
//  *ammo, armor, cyberware, cyberdeck, *gear, clothing, weapon, vehicle
CPR.upgradableDataPoints = {
  upgradeConfig: {
    configurableTypes: {
      modifier: "CPR.itemSheet.itemUpgrade.modifier",
      override: "CPR.itemSheet.itemUpgrade.override",
    },
  },
  weapon: {
    damage: {
      type: "modifier",
      value: 0,
      isSituational: false,
      onByDefault: false,
      localization: "CPR.global.generic.damage",
    },
    rof: {
      type: "modifier",
      value: 0,
      localization: "CPR.itemSheet.weapon.rof",
    },
    attackmod: {
      type: "modifier",
      value: 0,
      isSituational: false,
      onByDefault: false,
      localization: "CPR.itemSheet.weapon.attackMod",
    },
    magazine: {
      type: "override",
      value: 0,
      localization: "CPR.itemSheet.weapon.magazine",
    },
    secondaryWeapon: {
      type: "item",
      configured: false,
      localization: "CPR.itemSheet.itemUpgrade.isSecondaryWeapon",
    },
  },
  vehicle: {
    sdp: {
      type: "modifier",
      value: 0,
      localization: "CPR.itemSheet.vehicle.sdp",
    },
    seats: {
      type: "modifier",
      value: 0,
      localization: "CPR.itemSheet.vehicle.seats",
    },
    speedCombat: {
      type: "modifier",
      value: 0,
      localization: "CPR.itemSheet.vehicle.combatSpeed",
    },
  },
  cyberware: {
    secondaryWeapon: {
      type: "item",
      configured: false,
      localization: "CPR.itemSheet.itemUpgrade.isSecondaryWeapon",
    },
  },
  cyberdeck: {
    slots: {
      type: "modifier",
      value: 0,
      localization: "CPR.global.generic.slots",
    },
  },
  armor: {
    bodySp: {
      type: "modifier",
      value: 0,
      localization: "CPR.itemSheet.armor.bodyArmorSp",
    },
    headSp: {
      type: "modifier",
      value: 0,
      localization: "CPR.itemSheet.armor.headArmorSp",
    },
    shieldHp: {
      type: "modifier",
      value: 0,
      localization: "CPR.itemSheet.itemUpgrade.shieldHp",
    },
  },
  clothing: {
    "Wardrobe & Style": {
      type: "modifier",
      value: 0,
      isSituational: false,
      onByDefault: false,
      localization: "CPR.global.itemType.skill.wardrobeAndStyle",
    },
    cool: {
      type: "modifier",
      value: 0,
      isSituational: false,
      onByDefault: false,
      localization: "CPR.global.stats.cool",
    },
  },
  gear: {},
};

CPR.activeEffectCategories = {
  combat: "CPR.effectSheet.keyCategory.combat",
  netrun: "CPR.effectSheet.keyCategory.netrun",
  role: "CPR.effectSheet.keyCategory.role",
  skill: "CPR.effectSheet.keyCategory.skill",
  stat: "CPR.effectSheet.keyCategory.stat",
  misc: "CPR.effectSheet.keyCategory.misc",
  custom: "CPR.effectSheet.keyCategory.custom",
};

CPR.activeEffectKeys = {
  combat: {
    "bonuses.hands": "CPR.effectSheet.combat.stats.numberOfHands",
    "bonuses.initiative": "CPR.effectSheet.combat.stats.initiative",
    "bonuses.maxHumanity": "CPR.effectSheet.combat.stats.maxHumanity",
    "bonuses.maxHp": "CPR.effectSheet.combat.stats.maxHp",
    "bonuses.deathSavePenalty": "CPR.effectSheet.combat.stats.deathPenalty",
    "bonuses.universalAttack": "CPR.effectSheet.combat.stats.universalAttack",
    "bonuses.universalDamage": "CPR.effectSheet.combat.stats.universalDamage",
    "bonuses.universalDamageReduction":
      "CPR.effectSheet.combat.stats.universalDamageReduction",
    "bonuses.aimedShot": "CPR.effectSheet.combat.stats.aimedShot",
    "bonuses.singleShot": "CPR.effectSheet.combat.stats.singleShot",
    "bonuses.melee": "CPR.effectSheet.combat.stats.melee",
    "bonuses.ranged": "CPR.effectSheet.combat.stats.ranged",
    "bonuses.autofire": "CPR.effectSheet.combat.stats.autofire",
    "bonuses.suppressive": "CPR.effectSheet.combat.stats.suppressive",
    "bonuses.run": "CPR.effectSheet.combat.stats.runSpeed",
    "bonuses.walk": "CPR.effectSheet.combat.stats.walkSpeed",
  },
  netrun: {
    "bonuses.attack": "CPR.effectSheet.netrun.attack",
    "bonuses.defense": "CPR.effectSheet.netrun.defense",
    "bonuses.brainDamageReduction":
      "CPR.effectSheet.netrun.brainDamageReduction",
    "bonuses.perception_net": "CPR.effectSheet.netrun.perception",
    "bonuses.rez": "CPR.effectSheet.netrun.rez",
    "bonuses.speed": "CPR.effectSheet.netrun.speed",
    "bonuses.backdoor": "CPR.global.role.netrunner.interfaceAbility.backdoor",
    "bonuses.cloak": "CPR.global.role.netrunner.interfaceAbility.cloak",
    "bonuses.control": "CPR.global.role.netrunner.interfaceAbility.control",
    "bonuses.eyedee": "CPR.global.role.netrunner.interfaceAbility.eyedee",
    "bonuses.pathfinder":
      "CPR.global.role.netrunner.interfaceAbility.pathfinder",
    "bonuses.scanner": "CPR.global.role.netrunner.interfaceAbility.scanner",
    "bonuses.slide": "CPR.global.role.netrunner.interfaceAbility.slide",
    "bonuses.virus": "CPR.global.role.netrunner.interfaceAbility.virus",
    "bonuses.zap": "CPR.global.role.netrunner.interfaceAbility.zap",
  },
  role: {
    "bonuses.teamwork": "CPR.effectSheet.roleAbility.exec.teamwork",
    "bonuses.operator": "CPR.effectSheet.roleAbility.fixer.operator",
    "bonuses.backup": "CPR.effectSheet.roleAbility.lawman.backup",
    "bonuses.credibility": "CPR.effectSheet.roleAbility.media.credibility",
    "bonuses.medicalTechCryosystemOperation":
      "CPR.effectSheet.roleAbility.medtech.cryo",
    "bonuses.medicalTechPharmaceuticals":
      "CPR.effectSheet.roleAbility.medtech.pharma",
    "bonuses.medicine": "CPR.effectSheet.roleAbility.medtech.medicine",
    "bonuses.surgery": "CPR.effectSheet.roleAbility.medtech.surgery",
    "bonuses.interface": "CPR.effectSheet.roleAbility.netrunner.interface",
    "bonuses.moto": "CPR.effectSheet.roleAbility.nomad.moto",
    "bonuses.charismaticImpact":
      "CPR.effectSheet.roleAbility.rockerboy.charismaticImpact",
    "bonuses.combatAwareness":
      "CPR.effectSheet.roleAbility.solo.combatAwareness",
    "bonuses.damageDeflection":
      "CPR.effectSheet.roleAbility.solo.damageDeflection",
    "bonuses.fumbleRecovery": "CPR.effectSheet.roleAbility.solo.fumbleRecovery",
    "bonuses.initiativeReaction":
      "CPR.effectSheet.roleAbility.solo.initiativeReaction",
    "bonuses.precisionAttack":
      "CPR.effectSheet.roleAbility.solo.precisionAttack",
    "bonuses.spotWeakness": "CPR.effectSheet.roleAbility.solo.spotWeakness",
    "bonuses.threatDetection":
      "CPR.effectSheet.roleAbility.solo.threatDetection",
    "bonuses.fabricationExpertise":
      "CPR.effectSheet.roleAbility.tech.fabricationExpertise",
    "bonuses.fieldExpertise": "CPR.effectSheet.roleAbility.tech.fieldExpertise",
    "bonuses.inventionExpertise":
      "CPR.effectSheet.roleAbility.tech.inventionExpertise",
    "bonuses.maker": "CPR.effectSheet.roleAbility.tech.maker",
    "bonuses.upgradeExpertise":
      "CPR.effectSheet.roleAbility.tech.upgradeExpertise",
  },
  skill: {
    // Note this listing is expanded in cpr-active-effect-sheet.js (getSkillOptionConfigs), it is not used as-is
    "bonuses.accounting": "CPR.global.itemType.skill.accounting",
    "bonuses.acting": "CPR.global.itemType.skill.acting",
    "bonuses.airVehicleTech": "CPR.global.itemType.skill.airVehicleTech",
    "bonuses.animalHandling": "CPR.global.itemType.skill.animalHandling",
    "bonuses.archery": "CPR.global.itemType.skill.archery",
    "bonuses.athletics": "CPR.global.itemType.skill.athletics",
    "bonuses.autofire": "CPR.global.itemType.skill.autofire",
    "bonuses.basicTech": "CPR.global.itemType.skill.basicTech",
    "bonuses.brawling": "CPR.global.itemType.skill.brawling",
    "bonuses.bribery": "CPR.global.itemType.skill.bribery",
    "bonuses.bureaucracy": "CPR.global.itemType.skill.bureaucracy",
    "bonuses.business": "CPR.global.itemType.skill.business",
    "bonuses.composition": "CPR.global.itemType.skill.composition",
    "bonuses.concealOrRevealObject":
      "CPR.global.itemType.skill.concealOrRevealObject",
    "bonuses.concentration": "CPR.global.itemType.skill.concentration",
    "bonuses.contortionist": "CPR.global.itemType.skill.contortionist",
    "bonuses.conversation": "CPR.global.itemType.skill.conversation",
    "bonuses.criminology": "CPR.global.itemType.skill.criminology",
    "bonuses.cryptography": "CPR.global.itemType.skill.cryptography",
    "bonuses.cybertech": "CPR.global.itemType.skill.cybertech",
    "bonuses.dance": "CPR.global.itemType.skill.dance",
    "bonuses.deduction": "CPR.global.itemType.skill.deduction",
    "bonuses.demolitions": "CPR.global.itemType.skill.demolitions",
    "bonuses.driveLandVehicle": "CPR.global.itemType.skill.driveLandVehicle",
    "bonuses.education": "CPR.global.itemType.skill.education",
    "bonuses.electronicsAndSecurityTech":
      "CPR.global.itemType.skill.electronicsAndSecurityTech",
    "bonuses.endurance": "CPR.global.itemType.skill.endurance",
    "bonuses.evasion": "CPR.global.itemType.skill.evasion",
    "bonuses.firstAid": "CPR.global.itemType.skill.firstAid",
    "bonuses.forgery": "CPR.global.itemType.skill.forgery",
    "bonuses.gamble": "CPR.global.itemType.skill.gamble",
    "bonuses.handgun": "CPR.global.itemType.skill.handgun",
    "bonuses.heavyWeapons": "CPR.global.itemType.skill.heavyWeapons",
    "bonuses.humanPerception": "CPR.global.itemType.skill.humanPerception",
    "bonuses.interrogation": "CPR.global.itemType.skill.interrogation",
    "bonuses.landVehicleTech": "CPR.global.itemType.skill.landVehicleTech",
    "bonuses.language": "CPR.global.itemType.skill.language",
    "bonuses.librarySearch": "CPR.global.itemType.skill.librarySearch",
    "bonuses.lipReading": "CPR.global.itemType.skill.lipReading",
    "bonuses.localExpert": "CPR.global.itemType.skill.localExpert",
    "bonuses.meleeWeapon": "CPR.global.itemType.skill.meleeWeapon",
    "bonuses.paintOrDrawOrSculpt":
      "CPR.global.itemType.skill.paintOrDrawOrSculpt",
    "bonuses.paramedic": "CPR.global.itemType.skill.paramedic",
    "bonuses.perception": "CPR.global.itemType.skill.perception",
    "bonuses.perceptionHearing": "CPR.effectSheet.skill.perceptionHearing",
    "bonuses.perceptionSight": "CPR.effectSheet.skill.perceptionSight",
    "bonuses.personalGrooming": "CPR.global.itemType.skill.personalGrooming",
    "bonuses.persuasion": "CPR.global.itemType.skill.persuasion",
    "bonuses.photographyAndFilm":
      "CPR.global.itemType.skill.photographyAndFilm",
    "bonuses.pickLock": "CPR.global.itemType.skill.pickLock",
    "bonuses.pickPocket": "CPR.global.itemType.skill.pickPocket",
    "bonuses.pilotAirVehicle": "CPR.global.itemType.skill.pilotAirVehicle",
    "bonuses.pilotSeaVehicle": "CPR.global.itemType.skill.pilotSeaVehicle",
    "bonuses.resistTortureOrDrugs":
      "CPR.global.itemType.skill.resistTortureOrDrugs",
    "bonuses.riding": "CPR.global.itemType.skill.riding",
    "bonuses.seaVehicleTech": "CPR.global.itemType.skill.seaVehicleTech",
    "bonuses.shoulderArms": "CPR.global.itemType.skill.shoulderArms",
    "bonuses.stealth": "CPR.global.itemType.skill.stealth",
    "bonuses.streetWise": "CPR.global.itemType.skill.streetwise",
    "bonuses.tactics": "CPR.global.itemType.skill.tactics",
    "bonuses.tracking": "CPR.global.itemType.skill.tracking",
    "bonuses.trading": "CPR.global.itemType.skill.trading",
    "bonuses.wardrobeAndStyle": "CPR.global.itemType.skill.wardrobeAndStyle",
    "bonuses.weaponstech": "CPR.global.itemType.skill.weaponstech",
    "bonuses.wildernessSurvival":
      "CPR.global.itemType.skill.wildernessSurvival",
  },
  stat: {
    "system.stats.int.value": "CPR.global.stats.int",
    "system.stats.ref.value": "CPR.global.stats.ref",
    "system.stats.dex.value": "CPR.global.stats.dex",
    "system.stats.tech.value": "CPR.global.stats.tech",
    "system.stats.cool.value": "CPR.global.stats.cool",
    "system.stats.will.value": "CPR.global.stats.will",
    "system.stats.luck.max": "CPR.global.stats.luckMax",
    "system.stats.move.value": "CPR.global.stats.move",
    "system.stats.body.value": "CPR.global.stats.body",
    "system.stats.emp.max": "CPR.global.stats.empMax",
  },
  misc: {
    "bonuses.allActions": "CPR.effectSheet.misc.allActions",
    "bonuses.allActionsHands": "CPR.effectSheet.misc.allActionsHands",
    "bonuses.allActionsSpeech": "CPR.effectSheet.misc.allActionsSpeech",
    "bonuses.hasPainSuppression": "CPR.effectSheet.misc.hasPainSuppression",
  },
};

CPR.defaultSituationalMods = {
  complimentarySkill: {
    value: 1,
    source: "CPR.rolls.defaultMods.complimentarySkill",
    id: "complimentarySkill-coreBook",
  },
  extraTime: {
    value: 1,
    source: "CPR.rolls.defaultMods.extraTime",
    id: "extraTime-coreBook",
  },
  lowLight: {
    value: -1,
    source: "CPR.rolls.defaultMods.lowLight",
    id: "lowLight-coreBook",
  },
  firstTime: {
    value: -1,
    source: "CPR.rolls.defaultMods.firstTime",
    id: "firstTime-coreBook",
  },
  complexTask: {
    value: -2,
    source: "CPR.rolls.defaultMods.complexTask",
    id: "complexTask-coreBook",
  },
  wrongTools: {
    value: -2,
    source: "CPR.rolls.defaultMods.wrongTools",
    id: "wrongTools-coreBook",
  },
  badSleep: {
    value: -2,
    source: "CPR.rolls.defaultMods.badSleep",
    id: "badSleep-coreBook",
  },
  extremeStress: {
    value: -2,
    source: "CPR.rolls.defaultMods.extremeStress",
    id: "extremeStress-coreBook",
  },
  exhausted: {
    value: -4,
    source: "CPR.rolls.defaultMods.exhausted",
    id: "exhausted-coreBook",
  },
  drunkSedated: {
    value: -4,
    source: "CPR.rolls.defaultMods.drunkSedated",
    id: "drunkSedated-coreBook",
  },
  sneakily: {
    value: -4,
    source: "CPR.rolls.defaultMods.sneakily",
    id: "sneakily-coreBook",
  },
  heavilyObscured: {
    value: -4,
    source: "CPR.rolls.defaultMods.heavilyObscured",
    id: "heavilyObscured-coreBook",
  },
};

CPR.themes = {
  default: "CPR.settings.theme.name.default",
  darkmode: "CPR.settings.theme.name.darkmode",
};

CPR.migrationDocTypes = {
  items: "CPR.migration.docType.items",
  actors: "CPR.migration.docType.actors",
  scenes: "CPR.migration.docType.scenes",
  tokens: "CPR.migration.docType.tokens",
  packs: "CPR.migration.docType.packs",
  packDocuments: "CPR.migration.docType.packDocuments",
};

export default CPR;
