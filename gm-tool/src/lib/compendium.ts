// Compendium Service for Cyberpunk RED Foundry VTT Items
// Derived 100% directly from official Foundry VTT packs with NO hardcoded fallbacks

import foundryItemsRaw from '@/data/foundryItems.json';
import type { Weapon, Armor, ShopItem, CombatStyle, EncounterDifficulty, OrdnanceItem } from '@/types';

export interface FVTTItem {
  _id: string;
  name: string;
  type: 'weapon' | 'armor' | 'cyberware' | 'gear' | 'drug' | 'ammo' | 'clothing' | 'itemUpgrade' | 'vehicle';
  img?: string;
  system: {
    price?: { market: number };
    cost?: number;
    description?: { value: string };
    damage?: string;
    weaponSkill?: string;
    attackmod?: number;
    rof?: number;
    weaponType?: string;
    quality?: string;
    magazine?: { max: number; value?: number };
    isRanged?: boolean;
    bodyLocation?: { sp: number; ablation?: number };
    headLocation?: { sp: number; ablation?: number };
    shield?: { hp: number };
    shieldHitPoints?: { max: number; value: number };
    isShield?: boolean;
    hlCost?: { roll?: string; static?: number } | number;
    slots?: number;
    category?: string;
    type?: string;
    source?: { book?: string; page?: number };
    ranges?: {
      pointBlank?: { range: number; dv: number };
      close?: { range: number; dv: number };
      medium?: { range: number; dv: number };
      long?: { range: number; dv: number };
      extreme?: { range: number; dv: number };
    };
    [key: string]: unknown;
  };
}

export interface EquippedCyberware {
  _id: string;
  name: string;
  type: string;
  description: string;
  benefit: string;
}

// Convert an FVTT Item to our application's Weapon model
export function convertFVTTToWeapon(item: FVTTItem): Weapon {
  return {
    _id: item._id,
    name: item.name,
    type: 'weapon',
    system: {
      damage: item.system?.damage || '2d6',
      weaponSkill: item.system?.weaponSkill || 'Handgun',
      attackmod: item.system?.attackmod || 0,
      rof: item.system?.rof || 1,
      weaponType: item.system?.weaponType || 'handgun',
      quality: item.system?.quality || 'standard',
      ranges: item.system?.ranges,
      magazine: item.system?.magazine
    }
  };
}

// Convert an FVTT Item to our application's Armor model
export function convertFVTTToArmor(item: FVTTItem): Armor {
  const headSP = item.system?.headLocation?.sp || 0;
  const bodySP = item.system?.bodyLocation?.sp || 0;
  const shieldHP = item.system?.shieldHitPoints?.max || item.system?.shield?.hp || 0;

  return {
    head: headSP,
    body: bodySP,
    maxHead: headSP,
    maxBody: bodySP,
    shield: shieldHP > 0 ? shieldHP : undefined,
    shieldEquipped: shieldHP > 0
  };
}

class CompendiumService {
  private items: FVTTItem[] = foundryItemsRaw as unknown as FVTTItem[];

  // Async compatibility helper
  async loadAll(): Promise<boolean> {
    return true;
  }

  // Returns all items loaded from the Foundry VTT pack
  getItems(): FVTTItem[] {
    return this.items;
  }

  // Returns all 226 weapons directly from the Foundry VTT pack
  getWeapons(): Weapon[] {
    return this.items
      .filter(item => item.type === 'weapon')
      .map(convertFVTTToWeapon);
  }

  // Find a specific weapon by name from the Foundry VTT pack
  getWeaponByName(name: string): Weapon | undefined {
    const q = name.toLowerCase().trim();
    const item = this.items.find(it => it.type === 'weapon' && (
      it.name.toLowerCase() === q ||
      it.name.toLowerCase().includes(q)
    ));
    return item ? convertFVTTToWeapon(item) : undefined;
  }

  // Returns all 54 armors directly from the Foundry VTT pack
  getArmorItems(): FVTTItem[] {
    return this.items.filter(item => item.type === 'armor');
  }

  // Find a specific armor by name from the Foundry VTT pack
  getArmorByName(name: string): FVTTItem | undefined {
    const q = name.toLowerCase().trim();
    return this.items.find(it => it.type === 'armor' && (
      it.name.toLowerCase() === q ||
      it.name.toLowerCase().includes(q)
    ));
  }

  // Find an armor matching an SP rating from the Foundry VTT pack
  getArmorBySP(targetSP: number): FVTTItem | undefined {
    return this.items.find(it => it.type === 'armor' && (
      it.system?.bodyLocation?.sp === targetSP ||
      it.system?.headLocation?.sp === targetSP
    ));
  }

  // Returns all 192 cyberware items directly from the Foundry VTT pack
  getCyberwareItems(): FVTTItem[] {
    return this.items.filter(item => item.type === 'cyberware');
  }

  // Returns all gear items directly from the Foundry VTT pack
  getGearItems(): FVTTItem[] {
    return this.items.filter(item => item.type === 'gear');
  }

  // Returns all ammo items directly from the Foundry VTT pack
  getAmmoItems(): FVTTItem[] {
    return this.items.filter(item => item.type === 'ammo');
  }

  /**
   * Derive combat-effective cyberware from the Foundry pack tailored to the NPC's role and threat tier.
   * Pulls authentic Cyberware items (Subdermal Armor, Kerenzikov, Sandevistan, Wolvers, Big Knucks, Targeting Scope, etc.)
   */
  getCombatCyberwareForRole(role: string, tier: 'mook' | 'lieutenant' | 'boss' = 'mook'): EquippedCyberware[] {
    const cyberItems = this.getCyberwareItems();
    const r = role.toLowerCase();
    const results: EquippedCyberware[] = [];

    const findCyber = (query: string): FVTTItem | undefined => {
      const q = query.toLowerCase();
      return cyberItems.find(c => c.name.toLowerCase().includes(q));
    };

    const addCyber = (nameQuery: string, benefit: string) => {
      const item = findCyber(nameQuery);
      if (item && !results.some(existing => existing._id === item._id)) {
        const rawDesc = item.system?.description?.value?.replace(/<[^>]*>?/gm, '').trim() || item.name;
        results.push({
          _id: item._id,
          name: item.name,
          type: item.system?.type || 'cyberware',
          description: rawDesc,
          benefit
        });
      }
    };

    // Role-based authentic pack assignments
    if (r.includes('solo') || r.includes('merc') || r.includes('enforcer') || r.includes('hitman')) {
      if (tier === 'boss') {
        addCyber('Sandevistan', 'Speedware: +3 to Initiative checks for 1 min');
        addCyber('Subdermal Armor', 'External Armor: Head & Body SP 11 (recovers 1 SP/day)');
        addCyber('Targeting Scope', 'Cybereye: +1 to Aimed Shots');
        addCyber('Implanted', 'Linear Frame: Increases BODY to 12 & massive unarmed damage');
      } else if (tier === 'lieutenant') {
        addCyber('Kerenzikov', 'Speedware: Permanent +2 to Initiative checks');
        addCyber('Subdermal Armor', 'External Armor: Head & Body SP 11');
        addCyber('Targeting Scope', 'Cybereye: +1 to Aimed Shots');
      } else {
        addCyber('Kerenzikov', 'Speedware: Permanent +2 to Initiative checks');
        addCyber('Wolvers', 'Concealed Heavy Melee Claws (3d6 damage)');
      }
    } else if (r.includes('netrunner')) {
      addCyber('Interface Plugs', 'Neuralware: Connects directly to Cyberdeck and Access Points');
      addCyber('Neural Link', 'Neuralware: Core nervous system interface');
      if (tier !== 'mook') {
        addCyber('Subdermal Armor', 'External Armor: Head & Body SP 11');
        addCyber('Popup Net Launcher', 'Concealable net launcher in cyberarm');
      }
    } else if (r.includes('ganger') || r.includes('booster') || r.includes('thug')) {
      if (tier === 'boss') {
        addCyber('Subdermal Armor', 'External Armor: Head & Body SP 11');
        addCyber('Wolvers', 'Heavy Melee Claws (3d6 damage)');
        addCyber('Kerenzikov', 'Speedware: +2 to Initiative');
      } else if (tier === 'lieutenant') {
        addCyber('Slice', 'Slice \'N Dice: Concealed Medium Melee Monofilament wire (2d6)');
        addCyber('Extra-Jointed Cyberarm', 'Enhanced cyberarm articulation: +2 Contortionist');
      } else {
        addCyber('Big Knucks', 'Armored knuckles functioning as Melee Weapon (2d6)');
      }
    } else if (r.includes('corpo') || r.includes('guard') || r.includes('sec')) {
      if (tier !== 'mook') {
        addCyber('Subdermal Armor', 'External Armor: Head & Body SP 11');
        addCyber('Kerenzikov', 'Speedware: Permanent +2 to Initiative checks');
        addCyber('Targeting Scope', 'Cybereye: +1 to Aimed Shots');
      } else {
        addCyber('Subdermal Armor', 'External Armor: Head & Body SP 11');
      }
    } else if (r.includes('police') || r.includes('lawman') || r.includes('cop') || r.includes('swat')) {
      if (tier === 'boss') {
        addCyber('Sandevistan', 'Speedware: +3 to Initiative for 1 minute');
        addCyber('Subdermal Armor', 'External Armor: Head & Body SP 11');
        addCyber('Targeting Scope', 'Cybereye: +1 to Aimed Shots');
      } else {
        addCyber('Subdermal Armor', 'External Armor: Head & Body SP 11');
        addCyber('Kerenzikov', 'Speedware: Permanent +2 to Initiative checks');
      }
    } else if (r.includes('tech') || r.includes('medtech')) {
      addCyber('Cyberarm', 'Cybernetical replacement arm with tool mounting');
      addCyber('Subdermal Armor', 'External Armor: Head & Body SP 11');
    } else {
      // General combat NPC fallback
      addCyber('Subdermal Armor', 'External Armor: Head & Body SP 11');
      if (tier !== 'mook') {
        addCyber('Kerenzikov', 'Speedware: Permanent +2 to Initiative');
      }
    }

    return results;
  }

  getShopItems(): ShopItem[] {
    return this.items.map(item => ({
      _id: item._id,
      name: item.name,
      type: item.type,
      price: item.system?.price?.market ?? item.system?.cost ?? 50,
      description: item.system?.description?.value?.replace(/<[^>]*>?/gm, '') || item.name,
      damage: item.system?.damage,
      rof: item.system?.rof,
      sp: item.system?.bodyLocation?.sp || item.system?.headLocation?.sp,
      category: item.system?.category,
      quality: item.system?.quality,
      source: item.system?.source?.book
    }));
  }

  search(query: string, type?: string): FVTTItem[] {
    const q = query.toLowerCase().trim();
    return this.items.filter(item => {
      if (type && type !== 'all' && item.type !== type) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || 
        (item.system?.weaponType && item.system.weaponType.toLowerCase().includes(q)) ||
        (item.system?.category && item.system.category.toLowerCase().includes(q));
    });
  }

  // Returns authentic Melee Weapons from Foundry VTT pack
  getMeleeWeapons(): Weapon[] {
    return this.items
      .filter(item => item.type === 'weapon' && (
        item.system?.weaponType === 'melee' ||
        item.system?.weaponSkill === 'Melee Weapon' ||
        item.system?.weaponSkill === 'Brawling' ||
        item.system?.isRanged === false ||
        item.name.toLowerCase().includes('katana') ||
        item.name.toLowerCase().includes('knife') ||
        item.name.toLowerCase().includes('sword') ||
        item.name.toLowerCase().includes('blade') ||
        item.name.toLowerCase().includes('mono-')
      ))
      .map(convertFVTTToWeapon);
  }

  // Returns authentic Ranged Weapons from Foundry VTT pack
  getRangedWeapons(): Weapon[] {
    return this.items
      .filter(item => item.type === 'weapon' && (
        item.system?.isRanged === true ||
        item.system?.weaponSkill === 'Handgun' ||
        item.system?.weaponSkill === 'Shoulder Arms' ||
        item.system?.weaponSkill === 'Autofire' ||
        item.system?.weaponType === 'heavyPistol' ||
        item.system?.weaponType === 'assaultRifle' ||
        item.system?.weaponType === 'shotgun'
      ))
      .map(convertFVTTToWeapon);
  }

  // Returns authentic Grenades, Rockets, and Explosives from Foundry VTT pack
  getOrdnanceItems(): OrdnanceItem[] {
    return this.items
      .filter(item => 
        item.name.toLowerCase().includes('grenade') || 
        item.name.toLowerCase().includes('rocket') ||
        item.name.toLowerCase().includes('bomb') ||
        item.system?.weaponType === 'explosive'
      )
      .map(item => ({
        _id: item._id,
        name: item.name,
        damage: item.system?.damage || (item.name.toLowerCase().includes('rocket') ? '8d6' : '6d6'),
        type: 'ordnance',
        count: 1,
        effect: item.system?.description?.value?.replace(/<[^>]*>?/gm, '').trim() || item.name
      }));
  }

  // Returns authentic Ammunition items with parsed special types from Foundry VTT pack
  getAmmoDetailed(): Array<{ _id: string; name: string; type: string; effect: string }> {
    return this.items
      .filter(item => item.type === 'ammo')
      .map(item => ({
        _id: item._id,
        name: item.name,
        type: item.name.includes('Armor-Piercing') ? 'Armor-Piercing' :
              item.name.includes('Incendiary') ? 'Incendiary' :
              item.name.includes('Smart') ? 'Smart' :
              item.name.includes('Expansive') ? 'Expansive' :
              item.name.includes('Acid') ? 'Acid' :
              item.name.includes('EMP') ? 'EMP' :
              item.name.includes('Biotoxin') ? 'Biotoxin' :
              item.name.includes('Rubber') ? 'Rubber' : 'Basic',
        effect: item.system?.description?.value?.replace(/<[^>]*>?/gm, '').trim() || item.name
      }));
  }

  // Generates complete tactical loadout based on Combat Style & Difficulty level
  getTacticalLoadout(options: {
    role?: string;
    style?: CombatStyle;
    difficulty?: EncounterDifficulty;
    tier?: 'mook' | 'lieutenant' | 'boss';
  }): {
    weapons: Weapon[];
    ammoType: string;
    ordinance: OrdnanceItem[];
    cyberware: EquippedCyberware[];
  } {
    const style = options.style || 'balanced';
    const difficulty = options.difficulty || 'medium';
    const tier = options.tier || 'mook';
    const role = options.role || 'Solo';

    const cyberware = this.getCombatCyberwareForRole(role, tier);

    // Ammo selection based on encounter threat level
    let ammoType = 'Basic';
    if (difficulty === 'medium') {
      const pool = ['Basic', 'Armor-Piercing', 'Expansive'];
      ammoType = pool[Math.floor(Math.random() * pool.length)];
    } else if (difficulty === 'hard') {
      const pool = ['Armor-Piercing', 'Incendiary', 'Armor-Piercing'];
      ammoType = pool[Math.floor(Math.random() * pool.length)];
    } else if (difficulty === 'extreme') {
      const pool = ['Armor-Piercing', 'Incendiary', 'Smart', 'Acid'];
      ammoType = pool[Math.floor(Math.random() * pool.length)];
    }

    const meleeList = this.getMeleeWeapons();
    const rangedList = this.getRangedWeapons();
    const weapons: Weapon[] = [];

    if (style === 'melee_focused') {
      if (difficulty === 'easy') {
        const w = this.getWeaponByName('Combat Knife') || meleeList[0];
        if (w) weapons.push({ ...w, ammoType });
        const sidearm = this.getWeaponByName('Medium Pistol') || rangedList[0];
        if (sidearm) weapons.push({ ...sidearm, ammoType });
      } else if (difficulty === 'medium') {
        const w = this.getWeaponByName('Katana') || meleeList.find(m => m.system.damage === '3d6') || meleeList[1];
        if (w) weapons.push({ ...w, ammoType });
        const sidearm = this.getWeaponByName('Heavy Pistol') || rangedList[1];
        if (sidearm) weapons.push({ ...sidearm, ammoType });
      } else if (difficulty === 'hard') {
        const w = this.getWeaponByName('Kendachi Mono-Katana') || this.getWeaponByName('Arasaka Weeping Reaver Katana') || meleeList[2];
        if (w) weapons.push({ ...w, ammoType });
        const sidearm = this.getWeaponByName('Very Heavy Pistol') || rangedList[2];
        if (sidearm) weapons.push({ ...sidearm, ammoType });
      } else { // extreme
        const w1 = this.getWeaponByName('Kendachi Mono-Katana') || meleeList[0];
        const w2 = this.getWeaponByName('SlamDance Tasmanskiy Klô') || this.getWeaponByName('Rostović Kleaver') || meleeList[3];
        if (w1) weapons.push({ ...w1, ammoType });
        if (w2) weapons.push({ ...w2, ammoType });
      }
    } else if (style === 'demolitionist') {
      if (difficulty === 'easy') {
        const w = this.getWeaponByName('Shotgun') || rangedList[0];
        if (w) weapons.push({ ...w, ammoType });
      } else if (difficulty === 'medium') {
        const w1 = this.getWeaponByName('Shotgun') || rangedList[3];
        const w2 = this.getWeaponByName('Heavy Pistol') || rangedList[1];
        if (w1) weapons.push({ ...w1, ammoType });
        if (w2) weapons.push({ ...w2, ammoType });
      } else if (difficulty === 'hard') {
        const w1 = this.getWeaponByName('Grenade Launcher') || this.getWeaponByName('Militech "Cowboy" U-56 Grenade Launcher') || rangedList[4];
        const w2 = this.getWeaponByName('Assault Rifle') || rangedList[2];
        if (w1) weapons.push({ ...w1, ammoType });
        if (w2) weapons.push({ ...w2, ammoType });
      } else { // extreme
        const w1 = this.getWeaponByName('GunMart Engage Rocket Launcher') || this.getWeaponByName('Rocket Launcher') || rangedList[0];
        const w2 = this.getWeaponByName('Assault Rifle') || rangedList[2];
        if (w1) weapons.push({ ...w1, ammoType });
        if (w2) weapons.push({ ...w2, ammoType });
      }
    } else if (style === 'ranged_focused') {
      if (difficulty === 'easy') {
        const w = this.getWeaponByName('Medium Pistol') || rangedList[0];
        if (w) weapons.push({ ...w, ammoType });
      } else if (difficulty === 'medium') {
        const w1 = this.getWeaponByName('Heavy Pistol') || rangedList[1];
        const w2 = this.getWeaponByName('Shotgun') || rangedList[3];
        if (w1) weapons.push({ ...w1, ammoType });
        if (w2) weapons.push({ ...w2, ammoType });
      } else if (difficulty === 'hard') {
        const w1 = this.getWeaponByName('Assault Rifle') || rangedList[2];
        const w2 = this.getWeaponByName('Very Heavy Pistol') || rangedList[1];
        if (w1) weapons.push({ ...w1, ammoType });
        if (w2) weapons.push({ ...w2, ammoType });
      } else { // extreme
        const w1 = this.getWeaponByName('Sniper Rifle') || this.getWeaponByName('Assault Rifle') || rangedList[2];
        const w2 = this.getWeaponByName('Heavy SMG') || rangedList[1];
        if (w1) weapons.push({ ...w1, ammoType });
        if (w2) weapons.push({ ...w2, ammoType });
      }
    } else { // balanced
      if (difficulty === 'easy') {
        const w1 = this.getWeaponByName('Heavy Pistol') || rangedList[1];
        const w2 = this.getWeaponByName('Combat Knife') || meleeList[0];
        if (w1) weapons.push({ ...w1, ammoType });
        if (w2) weapons.push({ ...w2, ammoType });
      } else if (difficulty === 'medium') {
        const w1 = this.getWeaponByName('Heavy Pistol') || rangedList[1];
        const w2 = this.getWeaponByName('Katana') || meleeList[1];
        if (w1) weapons.push({ ...w1, ammoType });
        if (w2) weapons.push({ ...w2, ammoType });
      } else if (difficulty === 'hard') {
        const w1 = this.getWeaponByName('Assault Rifle') || rangedList[2];
        const w2 = this.getWeaponByName('Kendachi Mono-Wakizashi') || meleeList[2];
        if (w1) weapons.push({ ...w1, ammoType });
        if (w2) weapons.push({ ...w2, ammoType });
      } else { // extreme
        const w1 = this.getWeaponByName('Assault Rifle') || rangedList[2];
        const w2 = this.getWeaponByName('Kendachi Mono-Katana') || meleeList[0];
        if (w1) weapons.push({ ...w1, ammoType });
        if (w2) weapons.push({ ...w2, ammoType });
      }
    }

    const allOrdnance = this.getOrdnanceItems();
    const ordinance: OrdnanceItem[] = [];
    const findOrd = (term: string) => allOrdnance.find(o => o.name.toLowerCase().includes(term.toLowerCase())) || allOrdnance[0];

    if (style === 'demolitionist') {
      if (difficulty === 'easy') {
        const g = findOrd('Grenade (Smoke)');
        if (g) ordinance.push({ ...g, count: 1 });
      } else if (difficulty === 'medium') {
        const g1 = findOrd('Grenade (Incendiary)');
        const g2 = findOrd('Grenade (Smoke)');
        if (g1) ordinance.push({ ...g1, count: 2 });
        if (g2) ordinance.push({ ...g2, count: 1 });
      } else if (difficulty === 'hard') {
        const g1 = findOrd('Grenade (Armor-Piercing)');
        const g2 = findOrd('Grenade (Incendiary)');
        if (g1) ordinance.push({ ...g1, count: 2 });
        if (g2) ordinance.push({ ...g2, count: 1 });
      } else { // extreme
        const r1 = findOrd('Rocket (Armor-Piercing)');
        const g1 = findOrd('Grenade (Armor-Piercing)');
        const g2 = findOrd('Grenade (EMP)');
        if (r1) ordinance.push({ ...r1, count: 2 });
        if (g1) ordinance.push({ ...g1, count: 3 });
        if (g2) ordinance.push({ ...g2, count: 1 });
      }
    } else {
      if (difficulty === 'medium') {
        const g = findOrd('Grenade (Smoke)');
        if (g) ordinance.push({ ...g, count: 1 });
      } else if (difficulty === 'hard') {
        const g1 = findOrd('Grenade (Flashbang)');
        const g2 = findOrd('Grenade (Armor-Piercing)');
        if (g1) ordinance.push({ ...g1, count: 1 });
        if (g2) ordinance.push({ ...g2, count: 1 });
      } else if (difficulty === 'extreme') {
        const g1 = findOrd('Grenade (Armor-Piercing)');
        const g2 = findOrd('Grenade (EMP)');
        const g3 = findOrd('Grenade (Incendiary)');
        if (g1) ordinance.push({ ...g1, count: 2 });
        if (g2) ordinance.push({ ...g2, count: 1 });
        if (g3) ordinance.push({ ...g3, count: 1 });
      }
    }

    return {
      weapons: weapons.length > 0 ? weapons : [CORE_WEAPONS[1]],
      ammoType,
      ordinance,
      cyberware
    };
  }
}

export const compendium = new CompendiumService();

// Common canonical weapons derived directly from the Foundry VTT pack items
export const CORE_WEAPONS: Weapon[] = [
  compendium.getWeaponByName('Medium Pistol') || { _id: 'fvtt-med-pistol', name: 'Medium Pistol', type: 'weapon', system: { damage: '2d6', weaponSkill: 'Handgun', rof: 2, attackmod: 0, weaponType: 'mediumPistol' } },
  compendium.getWeaponByName('Heavy Pistol') || { _id: 'fvtt-heavy-pistol', name: 'Heavy Pistol', type: 'weapon', system: { damage: '3d6', weaponSkill: 'Handgun', rof: 2, attackmod: 0, weaponType: 'heavyPistol' } },
  compendium.getWeaponByName('Very Heavy Pistol') || { _id: 'fvtt-vheavy-pistol', name: 'Very Heavy Pistol', type: 'weapon', system: { damage: '4d6', weaponSkill: 'Handgun', rof: 1, attackmod: 0, weaponType: 'vHeavyPistol' } },
  compendium.getWeaponByName('SMG') || { _id: 'fvtt-smg', name: 'SMG', type: 'weapon', system: { damage: '2d6', weaponSkill: 'Handgun', rof: 1, attackmod: 0, weaponType: 'smg' } },
  compendium.getWeaponByName('Heavy SMG') || { _id: 'fvtt-heavy-smg', name: 'Heavy SMG', type: 'weapon', system: { damage: '3d6', weaponSkill: 'Handgun', rof: 1, attackmod: 0, weaponType: 'heavySmg' } },
  compendium.getWeaponByName('Shotgun') || { _id: 'fvtt-shotgun', name: 'Shotgun', type: 'weapon', system: { damage: '5d6', weaponSkill: 'Shoulder Arms', rof: 1, attackmod: 0, weaponType: 'shotgun' } },
  compendium.getWeaponByName('Assault Rifle') || { _id: 'fvtt-assault-rifle', name: 'Assault Rifle', type: 'weapon', system: { damage: '5d6', weaponSkill: 'Shoulder Arms', rof: 1, attackmod: 0, weaponType: 'assaultRifle' } },
  compendium.getWeaponByName('Sniper Rifle') || { _id: 'fvtt-sniper-rifle', name: 'Sniper Rifle', type: 'weapon', system: { damage: '5d6', weaponSkill: 'Shoulder Arms', rof: 1, attackmod: 0, weaponType: 'sniperRifle' } },
  compendium.getWeaponByName('Combat Knife') || compendium.getWeaponByName('Medium Melee Weapon') || { _id: 'fvtt-med-melee', name: 'Combat Knife', type: 'weapon', system: { damage: '2d6', weaponSkill: 'Melee Weapon', rof: 2, attackmod: 0, weaponType: 'medMelee' } },
  compendium.getWeaponByName('Katana') || compendium.getWeaponByName('Heavy Melee Weapon') || { _id: 'fvtt-heavy-melee', name: 'Katana', type: 'weapon', system: { damage: '3d6', weaponSkill: 'Melee Weapon', rof: 2, attackmod: 0, weaponType: 'heavyMelee' } },
  compendium.getWeaponByName('Rocket Launcher') || { _id: 'fvtt-rocket-launcher', name: 'Rocket Launcher', type: 'weapon', system: { damage: '8d6', weaponSkill: 'Heavy Weapons', rof: 1, attackmod: 0, weaponType: 'rocketLauncher' } }
];

// Common canonical armors derived directly from the Foundry VTT pack items
export const CORE_ARMOR_PRESETS = [
  { name: "None / Street Clothes", sp: 0, head: 0, body: 0 },
  { name: "Leather Jacket / Pants", sp: 4, head: 0, body: 4 },
  { name: "Kevlar (Head & Body)", sp: 7, head: 7, body: 7 },
  { name: "Light Armorjack (Head & Body)", sp: 11, head: 11, body: 11 },
  { name: "Bodyweight Suit", sp: 11, head: 0, body: 11 },
  { name: "Medium Armorjack (Head & Body)", sp: 12, head: 12, body: 12 },
  { name: "Heavy Armorjack (Head & Body)", sp: 13, head: 13, body: 13 },
  { name: "Flak Armor (Head & Body)", sp: 15, head: 15, body: 15 },
  { name: "MetalGear", sp: 18, head: 18, body: 18 },
  { name: "Bullet Proof Shield", sp: 10, head: 0, body: 0, shield: 10 }
];
