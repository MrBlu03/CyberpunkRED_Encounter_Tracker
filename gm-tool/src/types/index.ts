// Core Types for Cyberpunk RED GM Tool

export type WoundState = 'not-wounded' | 'lightly-wounded' | 'seriously-wounded' | 'mortally-wounded' | 'dead';

export type DamageType = 'normal' | 'armor-piercing' | 'half-armor' | 'ignore-armor';

export type CoverType = 'light' | 'medium' | 'heavy' | 'human-shield';

export type CritMode = 'raw' | 'tarot';

export type ThemeMode = 'dark' | 'light';

export type ColorPalette = 'orange' | 'blue' | 'red';

export interface WeaponRange {
  range: number;
  dv: number;
}

export interface Weapon {
  _id: string;
  name: string;
  system: {
    damage: string;
    weaponSkill: string;
    attackmod: number;
    rof?: number;
    range?: number;
    ranges?: {
      pointBlank?: WeaponRange;
      close?: WeaponRange;
      medium?: WeaponRange;
      long?: WeaponRange;
      extreme?: WeaponRange;
    };
    [key: string]: unknown;
  };
}

export interface Armor {
  head: number;
  body: number;
  shield?: number;
  shieldEquipped?: boolean;
}

export interface Cover {
  type: CoverType;
  hp: number;
  maxHp: number;
  sp?: number;
  maxSp?: number;
}

export interface Participant {
  id: string;
  name: string;
  ref: number;
  initiativeSkill: number;
  rolled?: number;
  total?: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  woundState: WoundState;
  isPC: boolean;
  notes?: string;
  armor?: Armor;
  cover?: Cover;
  weapons?: Weapon[];
}

export interface EncounterState {
  active: boolean;
  round: number;
  turnIndex: number;
  archived: boolean;
}

export interface SavedEncounter {
  id: string;
  name: string;
  participants: Participant[];
  encounter: EncounterState;
  savedAt: string;
}

export interface SavedNPC {
  id: string;
  name: string;
  npc: Participant;
  savedAt: string;
}

export interface PC {
  id: string;
  name: string;
  ref: number;
  hp: number;
  maxHp: number;
  armorHead: number;
  armorBody: number;
  shieldSp?: number;
}

export interface DamageCalculation {
  baseDamage: number;
  finalDamage: number;
  location: 'head' | 'body';
  damageType: DamageType;
  isCritical: boolean;
  armorSP: number;
  coverSP: number;
  coverDamage: number;
  armorAblation: number;
  hpDamage: number;
  penetration: boolean;
}

export interface CriticalInjury {
  roll: number;
  name: string;
  description: string;
  effect: string;
}

export interface TarotCard {
  id: string;
  name: string;
  number: number;
  suit: 'major' | 'cups' | 'pentacles' | 'swords' | 'wands';
  description: string;
  effect: string;
  reversed?: boolean;
}

export interface ShopItem {
  _id: string;
  name: string;
  type: string;
  price: number;
  description: string;
  rarity?: string;
  damage?: string;
  rof?: number;
  sp?: number;
  [key: string]: unknown;
}

export interface NPCTemplate {
  name: string;
  role: string;
  stats: {
    int: number;
    ref: number;
    dex: number;
    tech: number;
    cool: number;
    will: number;
    luck: number;
    move: number;
    body: number;
    emp: number;
  };
  skills: Record<string, number>;
  armor: {
    head: number;
    body: number;
  };
  weapons: string[];
  cyberware: string[];
  gear: string[];
}

export interface GeneratedNPC {
  id: string;
  name: string;
  role: string;
  difficulty?: string;
  stats: {
    int: number;
    ref: number;
    dex: number;
    tech: number;
    cool: number;
    will: number;
    luck: number;
    move: number;
    body: number;
    emp: number;
  };
  skills: Record<string, number>;
  hitPoints: {
    current: number;
    max: number;
  };
  woundState: string;
  equipment: {
    armor?: {
      name: string;
      head: number;
      body: number;
      shield?: number;
      system?: {
        headLocation: { sp: number };
        bodyLocation: { sp: number };
      };
    };
    weapons: Weapon[];
    cyberware: string[];
    gear: string[];
  };
}

export interface EncounterTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
  npcs: GeneratedNPC[];
  environment: string;
  loot: string[];
}

export interface TimeState {
  hour: number;
  minute: number;
  day: number;
  month: number;
  year: number;
  isRunning: boolean;
}

export interface AppSettings {
  themeMode: ThemeMode;
  colorPalette: ColorPalette;
  critMode: CritMode;
  animationsEnabled: boolean;
  soundEnabled: boolean;
  autoSave: boolean;
}
