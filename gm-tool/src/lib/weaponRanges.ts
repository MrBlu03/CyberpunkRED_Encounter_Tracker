// Cyberpunk RED Weapon Range and DV Tables
// Based on the Core Rulebook

export interface RangeEntry {
  range: number;
  dv: number;
}

export interface WeaponRangeTable {
  [key: string]: RangeEntry;
}

// Base Single Shot DV by Range (for Pistols, SMGs, Rifles)
export const SINGLE_SHOT_DV: Record<string, number[]> = {
  // [0-6m, 7-12m, 13-25m, 26-50m, 51-100m, 101-200m, >200m]
  // Pistols (all types)
  pistol: [13, 15, 17, 19, 21, 24, 27],
  mediumPistol: [13, 15, 17, 19, 21, 24, 27],
  heavyPistol: [13, 15, 17, 19, 21, 24, 27],
  vHeavyPistol: [13, 15, 17, 19, 21, 24, 27],
  // SMG
  smg: [13, 15, 17, 19, 21, 24, 27],
  // Rifles
  rifle: [13, 15, 17, 19, 21, 24, 27],
  assaultRifle: [13, 15, 17, 19, 21, 24, 27],
  sniperRifle: [13, 15, 17, 19, 21, 24, 27],
  // Heavy Weapons
  heavyWeapon: [13, 15, 17, 19, 21, 24, 27],
  grenadeLauncher: [13, 15, 17, 19, 21, 24, 27],
  rocketLauncher: [13, 15, 17, 19, 21, 24, 27],
  // Shotgun with Buckshot (different)
  shotgunBuckshot: [9, 13, 17, 21, 99, 99, 99], // 99 = not applicable
  shotgun: [9, 13, 17, 21, 99, 99, 99], // Default shotgun is buckshot
  // Shotgun with Slug
  shotgunSlug: [13, 15, 17, 19, 21, 24, 27],
  // Archery
  bow: [15, 17, 19, 21, 24, 27, 30],
  crossbow: [15, 17, 19, 21, 24, 27, 30],
  // Thrown Weapons (same as pistols)
  thrownWeapon: [13, 15, 17, 19, 21, 24, 27],
  // Melee (not applicable - uses Defense)
  melee: [99, 99, 99, 99, 99, 99, 99],
  lightMelee: [99, 99, 99, 99, 99, 99, 99],
  medMelee: [99, 99, 99, 99, 99, 99, 99],
  heavyMelee: [99, 99, 99, 99, 99, 99, 99],
  vHeavyMelee: [99, 99, 99, 99, 99, 99, 99],
};

// Map FVTT weapon types to DV table keys
export function getDVTableKey(weaponType: string, isRanged: boolean = true): string {
  if (!isRanged || !weaponType) {
    return 'melee';
  }
  
  const typeMap: Record<string, string> = {
    pistol: 'pistol',
    mediumPistol: 'mediumPistol',
    heavyPistol: 'heavyPistol',
    vHeavyPistol: 'vHeavyPistol',
    smg: 'smg',
    rifle: 'rifle',
    assaultRifle: 'assaultRifle',
    sniperRifle: 'sniperRifle',
    sniper: 'sniperRifle',
    shotgun: 'shotgun',
    heavyWeapon: 'heavyWeapon',
    grenadeLauncher: 'grenadeLauncher',
    rocketLauncher: 'rocketLauncher',
    bow: 'bow',
    crossbow: 'crossbow',
    thrownWeapon: 'thrownWeapon',
    melee: 'melee',
    lightMelee: 'lightMelee',
    medMelee: 'medMelee',
    heavyMelee: 'heavyMelee',
    vHeavyMelee: 'vHeavyMelee',
  };
  
  return typeMap[weaponType] || 'pistol';
}

// Burst/Autofire DV by Range
export const BURST_AUTOFIRE_DV: Record<string, number[]> = {
  // [0-12m, 13-25m, 26-50m, 51-100m, >100m]
  smg: [12, 15, 22, 28, 99],
  assaultRifle: [12, 10, 12, 18, 99],
  autofire: [17, 19, 21, 24, 27],
};

// Range band labels
export const RANGE_BANDS = [
  { name: 'Point Blank', short: 'PB', maxMeters: 6 },
  { name: 'Close', short: 'CL', maxMeters: 12 },
  { name: 'Medium', short: 'MD', maxMeters: 25 },
  { name: 'Long', short: 'LG', maxMeters: 50 },
  { name: 'Extreme', short: 'EX', maxMeters: 100 },
  { name: 'Beyond Extreme', short: '>', maxMeters: Infinity },
];

// Get range band index for a distance in meters
export function getRangeBandIndex(distanceMeters: number): number {
  if (distanceMeters <= 6) return 0;
  if (distanceMeters <= 12) return 1;
  if (distanceMeters <= 25) return 2;
  if (distanceMeters <= 50) return 3;
  if (distanceMeters <= 100) return 4;
  return 5;
}

// Get range band name
export function getRangeBandName(distanceMeters: number): string {
  const idx = getRangeBandIndex(distanceMeters);
  return RANGE_BANDS[idx].name;
}

// Get Single Shot DV for a weapon type at a given distance
export function getSingleShotDV(weaponType: string, distanceMeters: number): number {
  const dvTable = SINGLE_SHOT_DV[weaponType] || SINGLE_SHOT_DV.pistol;
  const idx = getRangeBandIndex(distanceMeters);
  const dv = dvTable[idx];
  return dv >= 99 ? -1 : dv; // -1 means N/A
}

// Get Burst/Autofire DV for a weapon type at a given distance
export function getBurstAutofireDV(weaponType: string, distanceMeters: number): number {
  // Use autofire table for generic autofire, or specific weapon type
  const dvTable = BURST_AUTOFIRE_DV[weaponType] || BURST_AUTOFIRE_DV.autofire;
  
  // Autofire ranges: 0-12, 13-25, 26-50, 51-100, >100
  let idx: number;
  if (distanceMeters <= 12) idx = 0;
  else if (distanceMeters <= 25) idx = 1;
  else if (distanceMeters <= 50) idx = 2;
  else if (distanceMeters <= 100) idx = 3;
  else idx = 4;
  
  const dv = dvTable[idx];
  return dv >= 99 ? -1 : dv;
}

// Get DV for autofire attack
export function getAutofireDV(distanceMeters: number): number {
  return getBurstAutofireDV('autofire', distanceMeters);
}

// Weapon type to skill mapping
export const WEAPON_SKILLS: Record<string, string> = {
  pistol: 'Handgun',
  mediumPistol: 'Handgun',
  heavyPistol: 'Handgun',
  veryHeavyPistol: 'Handgun',
  smg: 'Autofire',
  shotgun: 'Shoulder Arms',
  shotgunBuckshot: 'Shoulder Arms',
  shotgunSlug: 'Shoulder Arms',
  rifle: 'Shoulder Arms',
  assaultRifle: 'Shoulder Arms',
  sniper: 'Shoulder Arms',
  bow: 'Archery',
  crossbow: 'Archery',
  grenadeLauncher: 'Heavy Weapons',
  heavyWeapon: 'Heavy Weapons',
  rocketLauncher: 'Heavy Weapons',
  melee: 'Melee Weapon',
  exotic: 'Exotic Weapon',
};

// Weapon categories
export const WEAPON_CATEGORIES = {
  PISTOLS: ['pistol', 'mediumPistol', 'heavyPistol', 'veryHeavyPistol'],
  SMGS: ['smg'],
  SHOTGUNS: ['shotgun', 'shotgunBuckshot', 'shotgunSlug'],
  RIFLES: ['rifle', 'assaultRifle', 'sniper'],
  HEAVY: ['heavyWeapon', 'grenadeLauncher', 'rocketLauncher'],
  ARCHERY: ['bow', 'crossbow'],
  MELEE: ['melee'],
};

// Get weapon category
export function getWeaponCategory(weaponType: string): string {
  for (const [category, types] of Object.entries(WEAPON_CATEGORIES)) {
    if (types.includes(weaponType)) return category;
  }
  return 'PISTOLS'; // default
}

// DV modifiers for various combat situations
export const DV_MODIFIERS = {
  // Attacker conditions
  attackerProne: +1,
  attackerRunning: +1,
  attackerMovingVehicle: +2,
  attackerInWater: +2,
  
  // Target conditions
  targetProne: 0,
  targetRunning: +2,
  targetDiving: +2,
  targetInMelee: +2,
  targetInSmoke: +2,
  targetInFog: +2,
  targetInDarkness: +2,
  targetInRain: +1,
  targetInWind: +1,
  
  // Combat actions
  calledShot: +4,
  calledShotLimb: +6,
  hipFire: +2,
  suppressiveFire: +4,
  burst: +1,
  
  // Aiming (from table)
  aim1Turn: -2,
  aim2Turns: -4,
  
  // Range modifiers (reference)
  pointBlank: -2,
  close: 0,
  medium: +2,
  long: +4,
  extreme: +8,
};

// Range table for display
export const RANGE_TABLE_DISPLAY = {
  pistol: { headers: ['0-6m', '7-12m', '13-25m', '26-50m', '51-100m', '101-200m', '>200m'], values: [13, 15, 17, 19, 21, 24, 27] },
  shotgunBuckshot: { headers: ['0-6m', '7-12m', '13-25m', '26-50m'], values: [9, 13, 17, 21] },
  shotgunSlug: { headers: ['0-6m', '7-12m', '13-25m', '26-50m', '51-100m', '101-200m', '>200m'], values: [13, 15, 17, 19, 21, 24, 27] },
  bow: { headers: ['0-6m', '7-12m', '13-25m', '26-50m', '51-100m', '101-200m', '>200m'], values: [15, 17, 19, 21, 24, 27, 30] },
  autofire: { headers: ['0-12m', '13-25m', '26-50m', '51-100m', '>100m'], values: [17, 19, 21, 24, 27] },
};
