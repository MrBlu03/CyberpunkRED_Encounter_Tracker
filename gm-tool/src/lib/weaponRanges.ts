// Cyberpunk RED Weapon Range and DV Reference Engine
// Based on the Cyberpunk RED Core Rulebook (p. 173)

import type { Weapon } from '@/types';

export interface RangeBand {
  id: string;
  name: string;
  rangeLabel: string;
  minMeters: number;
  maxMeters: number;
}

// The 8 official Core Rulebook Range Brackets
export const RANGE_BANDS: RangeBand[] = [
  { id: 'pb', name: 'Point Blank', rangeLabel: '0-6m', minMeters: 0, maxMeters: 6 },
  { id: 'close', name: 'Close', rangeLabel: '7-12m', minMeters: 7, maxMeters: 12 },
  { id: 'medium', name: 'Medium', rangeLabel: '13-25m', minMeters: 13, maxMeters: 25 },
  { id: 'long', name: 'Long', rangeLabel: '26-50m', minMeters: 26, maxMeters: 50 },
  { id: 'extreme', name: 'Extreme', rangeLabel: '51-100m', minMeters: 51, maxMeters: 100 },
  { id: 'bracket6', name: 'Extreme+', rangeLabel: '101-200m', minMeters: 101, maxMeters: 200 },
  { id: 'bracket7', name: 'Beyond', rangeLabel: '201-400m', minMeters: 201, maxMeters: 400 },
  { id: 'bracket8', name: 'Max', rangeLabel: '401-800m', minMeters: 401, maxMeters: 800 },
];

// Single Shot DV by Range (Cyberpunk RED Core Rulebook p. 173)
// null indicates the weapon cannot be used or will not reach this distance
export const SINGLE_SHOT_DV_TABLE: Record<string, (number | null)[]> = {
  // Range:              0-6m, 7-12m, 13-25m, 26-50m, 51-100m, 101-200m, 201-400m, 401-800m
  'Pistol':            [13,   15,    20,     25,     30,      30,       null,     null],
  'Medium Pistol':     [13,   15,    20,     25,     30,      30,       null,     null],
  'Heavy Pistol':      [13,   15,    20,     25,     30,      30,       null,     null],
  'Very Heavy Pistol': [13,   15,    20,     25,     30,      30,       null,     null],
  'SMG':               [15,   13,    15,     20,     25,      25,       30,       null],
  'Heavy SMG':         [15,   13,    15,     20,     25,      25,       30,       null],
  'Shotgun (Slug)':    [13,   15,    20,     25,     30,      35,       null,     null],
  'Shotgun':           [13,   15,    20,     25,     30,      35,       null,     null],
  'Shotgun (Buckshot)':[13,   13,    13,     null,   null,    null,     null,     null], // Hits 3x3m area
  'Assault Rifle':     [17,   16,    15,     13,     15,      20,       25,       30],
  'Sniper Rifle':      [30,   25,    25,     20,     15,      16,       17,       20],
  'Rifle':             [17,   16,    15,     13,     15,      20,       25,       30],
  'Bow / Crossbow':    [15,   13,    15,     17,     20,      22,       null,     null],
  'Grenade Launcher':  [16,   15,    15,     17,     20,      22,       25,       null],
  'Rocket Launcher':   [17,   16,    15,     15,     20,      20,       25,       30],
};

// Autofire Range Bands and DV Table (Core Rulebook & Edgerunners)
export const AUTOFIRE_RANGE_BANDS = [
  { label: '0-6m', min: 0, max: 6 },
  { label: '7-12m', min: 7, max: 12 },
  { label: '13-25m', min: 13, max: 25 },
  { label: '26-50m', min: 26, max: 50 },
  { label: '51-100m', min: 51, max: 100 },
];

export const AUTOFIRE_DV_TABLE: Record<string, (number | null)[]> = {
  'SMG':           [20, 17, 20, 25, 30],
  'Heavy SMG':     [20, 17, 20, 25, 30],
  'Assault Rifle': [22, 20, 17, 20, 25],
};

// Thrown weapons DV
export const THROWN_WEAPON_RULES = {
  maxRangeMeters: 25,
  skill: 'Athletics',
  bands: [
    { label: '0-6m', dv: 16 },
    { label: '7-25m', dv: 15 },
  ],
};

/**
 * Normalizes any weapon item to its standard Cyberpunk RED category.
 * Preserves the exact classification logic previously used in the tool.
 */
export function formatWeaponCategory(weapon: Partial<Weapon> | null | undefined): string {
  if (!weapon) return 'Weapon';

  const type = weapon.system?.weaponType;
  if (typeof type === 'string' && type) {
    if (type === 'vHeavyPistol') return 'Very Heavy Pistol';
    if (type === 'vHeavyMelee') return 'Very Heavy Melee';
    if (type === 'heavySmg') return 'Heavy SMG';
    const result = type.replace(/([A-Z])/g, ' $1').trim();
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  // Fallback for older saves or custom weapons that didn't retain weaponType
  if (weapon.name) {
    const lowerName = weapon.name.toLowerCase();
    if (lowerName.includes('assault rifle')) return 'Assault Rifle';
    if (lowerName.includes('sniper rifle') || lowerName.includes('sniper')) return 'Sniper Rifle';
    if (lowerName.includes('shotgun')) return 'Shotgun';
    if (lowerName.includes('heavy smg')) return 'Heavy SMG';
    if (lowerName.includes('smg') || lowerName.includes('submachine')) return 'SMG';

    // Specific pistol sizes
    if (lowerName.includes('very heavy pistol') || lowerName.includes('v. heavy pistol')) return 'Very Heavy Pistol';
    if (lowerName.includes('heavy pistol')) return 'Heavy Pistol';
    if (lowerName.includes('medium pistol')) return 'Medium Pistol';
    if (lowerName.includes('pistol') || lowerName.includes('handgun') || lowerName.includes('revolver')) return 'Pistol';

    if (
      lowerName.includes('melee') || 
      lowerName.includes('katana') || 
      lowerName.includes('sword') || 
      lowerName.includes('knife') || 
      lowerName.includes('blade') || 
      lowerName.includes('machete') || 
      lowerName.includes('axe') || 
      lowerName.includes('cyberarm')
    ) {
      return 'Melee Weapon';
    }

    if (lowerName.includes('bow') || lowerName.includes('crossbow')) return 'Bow / Crossbow';
    if (lowerName.includes('grenade launcher')) return 'Grenade Launcher';
    if (lowerName.includes('rocket launcher')) return 'Rocket Launcher';
  }

  // Fallback by weaponSkill & damage
  if (weapon.system?.weaponSkill) {
    const skill = weapon.system.weaponSkill.toLowerCase();
    const damage = weapon.system.damage || '';

    if (skill.includes('handgun')) {
      if (damage.includes('4d6')) return 'Very Heavy Pistol';
      if (damage.includes('3d6')) return 'Heavy Pistol';
      if (damage.includes('2d6')) return 'Medium Pistol';
      return 'Pistol';
    }

    if (skill.includes('shoulder arms')) {
      if (damage.includes('5d6')) return 'Assault Rifle';
      if (damage.includes('3d6')) return 'Shotgun';
      return 'Rifle';
    }

    if (skill.includes('melee') || skill.includes('brawling') || skill.includes('martial arts')) return 'Melee Weapon';
    if (skill.includes('heavy')) return 'Heavy Weapon';
    if (skill.includes('archery')) return 'Bow / Crossbow';

    return weapon.system.weaponSkill;
  }

  return 'Weapon';
}

export interface WeaponRangeResolution {
  category: string;
  isRanged: boolean;
  canAutofire: boolean;
  singleShotDVs: Array<{ label: string; dv: number | null }>;
  autofireDVs?: Array<{ label: string; dv: number | null }>;
}

/**
 * Resolves a weapon's range bands and DVs for both single shot and autofire.
 */
export function getWeaponRangeResolution(weapon: Partial<Weapon> | null | undefined): WeaponRangeResolution {
  const category = formatWeaponCategory(weapon);
  const isMelee = 
    category.toLowerCase().includes('melee') || 
    weapon?.system?.weaponSkill?.toLowerCase().includes('melee') ||
    weapon?.system?.weaponSkill?.toLowerCase().includes('brawling') ||
    weapon?.system?.weaponSkill?.toLowerCase().includes('martial arts');

  if (isMelee) {
    return {
      category,
      isRanged: false,
      canAutofire: false,
      singleShotDVs: []
    };
  }

  // Check if weapon has custom Foundry VTT system.ranges defined
  const fvttRanges = weapon?.system?.ranges;
  let singleShotDVs: Array<{ label: string; dv: number | null }>;

  if (fvttRanges && (fvttRanges.pointBlank || fvttRanges.close || fvttRanges.medium)) {
    singleShotDVs = [
      { label: '0-6m', dv: fvttRanges.pointBlank?.dv ?? null },
      { label: '7-12m', dv: fvttRanges.close?.dv ?? null },
      { label: '13-25m', dv: fvttRanges.medium?.dv ?? null },
      { label: '26-50m', dv: fvttRanges.long?.dv ?? null },
      { label: '51-100m', dv: fvttRanges.extreme?.dv ?? null },
    ];
  } else {
    // Map from canonical table
    const tableRow = SINGLE_SHOT_DV_TABLE[category] || 
      (category.includes('Pistol') ? SINGLE_SHOT_DV_TABLE['Pistol'] :
       category.includes('SMG') ? SINGLE_SHOT_DV_TABLE['SMG'] :
       category.includes('Shotgun') ? SINGLE_SHOT_DV_TABLE['Shotgun (Slug)'] :
       category.includes('Sniper') ? SINGLE_SHOT_DV_TABLE['Sniper Rifle'] :
       category.includes('Rifle') ? SINGLE_SHOT_DV_TABLE['Assault Rifle'] :
       category.includes('Bow') ? SINGLE_SHOT_DV_TABLE['Bow / Crossbow'] :
       category.includes('Grenade') ? SINGLE_SHOT_DV_TABLE['Grenade Launcher'] :
       category.includes('Rocket') ? SINGLE_SHOT_DV_TABLE['Rocket Launcher'] :
       SINGLE_SHOT_DV_TABLE['Pistol']);

    singleShotDVs = RANGE_BANDS.map((band, i) => ({
      label: band.rangeLabel,
      dv: tableRow ? tableRow[i] ?? null : null
    }));
  }

  // Check autofire support (SMG, Assault Rifle, or Autofire skill)
  const canAutofire = 
    category.includes('SMG') || 
    category.includes('Assault Rifle') || 
    weapon?.system?.weaponSkill?.toLowerCase() === 'autofire';

  let autofireDVs: Array<{ label: string; dv: number | null }> | undefined;
  if (canAutofire) {
    const autoRow = category.includes('Assault Rifle') ? AUTOFIRE_DV_TABLE['Assault Rifle'] : AUTOFIRE_DV_TABLE['SMG'];
    autofireDVs = AUTOFIRE_RANGE_BANDS.map((band, i) => ({
      label: band.label,
      dv: autoRow ? autoRow[i] ?? null : null
    }));
  }

  return {
    category,
    isRanged: true,
    canAutofire,
    singleShotDVs,
    autofireDVs
  };
}

/**
 * Get range band index for a distance in meters (0 to 7)
 */
export function getRangeBandIndex(distanceMeters: number): number {
  if (distanceMeters <= 6) return 0;
  if (distanceMeters <= 12) return 1;
  if (distanceMeters <= 25) return 2;
  if (distanceMeters <= 50) return 3;
  if (distanceMeters <= 100) return 4;
  if (distanceMeters <= 200) return 5;
  if (distanceMeters <= 400) return 6;
  return 7;
}

/**
 * Get single shot DV for weapon category at a given distance
 */
export function getSingleShotDV(weaponCategory: string, distanceMeters: number): number | null {
  const table = SINGLE_SHOT_DV_TABLE[weaponCategory] || SINGLE_SHOT_DV_TABLE['Pistol'];
  const idx = getRangeBandIndex(distanceMeters);
  return table[idx] ?? null;
}

/**
 * Get autofire DV for weapon category at a given distance
 */
export function getBurstAutofireDV(weaponCategory: string, distanceMeters: number): number | null {
  const table = weaponCategory.includes('Assault Rifle') ? AUTOFIRE_DV_TABLE['Assault Rifle'] : AUTOFIRE_DV_TABLE['SMG'];
  if (distanceMeters <= 6) return table[0];
  if (distanceMeters <= 12) return table[1];
  if (distanceMeters <= 25) return table[2];
  if (distanceMeters <= 50) return table[3];
  if (distanceMeters <= 100) return table[4];
  return null; // Beyond 100m autofire is out of range
}
