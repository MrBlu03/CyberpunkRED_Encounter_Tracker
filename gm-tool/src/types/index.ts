// Core Types for Cyberpunk RED GM Tool

export type WoundState = 'not-wounded' | 'lightly-wounded' | 'seriously-wounded' | 'mortally-wounded' | 'dead';

export type DamageType = 'normal' | 'armor-piercing' | 'half-armor' | 'ignore-armor';

export type CoverType = 'light' | 'medium' | 'heavy' | 'human-shield';

export type CritMode = 'raw' | 'tarot';

export type ThemeMode = 'dark' | 'light';

export type ColorPalette = 'orange' | 'blue' | 'red';

export type Affiliation = 'player' | 'friendly_npc' | 'hostile_npc' | 'neutral';

export interface WeaponRange {
  range: number;
  dv: number;
}

export type CombatStyle = 'balanced' | 'melee_focused' | 'ranged_focused' | 'demolitionist';

export type EncounterDifficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export interface OrdnanceItem {
  _id: string;
  name: string;
  damage: string;
  type: string;
  count: number;
  effect?: string;
}

export interface Weapon {
  _id: string;
  name: string;
  type?: string;
  ammoType?: string; // e.g. 'Armor-Piercing', 'Incendiary', 'Smart', 'Expansive', 'Basic'
  system: {
    damage: string;
    weaponSkill?: string;
    attackmod?: number;
    rof?: number;
    range?: number;
    weaponType?: string;
    quality?: string;
    magazine?: { max: number; value?: number };
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
  maxHead?: number;
  maxBody?: number;
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
  role?: string;
  affiliation?: Affiliation; // 'player' | 'friendly_npc' | 'hostile_npc' | 'neutral'
  ref: number;
  dex?: number;
  body?: number;
  will?: number;
  initiativeSkill: number;
  rolled?: number;
  total?: number;
  hp: number;
  maxHp: number;
  seriouslyWoundedThreshold?: number;
  dead: boolean;
  woundState: WoundState;
  isPC: boolean;
  notes?: string;
  armor?: Armor;
  cover?: Cover;
  weapons?: Weapon[];
  skills?: Record<string, number>;
  cyberware?: Array<{ _id?: string; name: string; type?: string; description?: string; benefit?: string }>;
  isGoon?: boolean;
  tier?: 'easy' | 'average' | 'elite' | 'mook' | 'lieutenant' | 'boss';
  combatNumber?: number;
  nonCombatNumber?: number;
  evasionSkill?: number;
  targetId?: string; // Target participant id for auto-attack
  ammoType?: string; // e.g. 'Armor-Piercing', 'Incendiary', 'Smart', 'Expansive', 'Basic'
  ordinance?: OrdnanceItem[];
  combatStyle?: CombatStyle;
  difficulty?: EncounterDifficulty;
  isCustomNPC?: boolean; // Custom-made NPC
  manualControl?: boolean; // If true, GM controls their movesets directly (excluded from auto-resolve)
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
  handle?: string;
  role: string;
  ref: number;
  dex?: number;
  body?: number;
  will?: number;
  hp: number;
  maxHp: number;
  armorHead: number;
  armorBody: number;
  shieldSp?: number;
  initiativeSkill?: number;
  evasionSkill?: number;
  weapons?: Weapon[];
  skills?: Record<string, number>;
  notes?: string;
}

export interface DamageCalculation {
  baseDamage: number;
  finalDamage: number;
  location: 'head' | 'body';
  damageType: DamageType;
  isCritical: boolean;
  criticalInjuryName?: string;
  criticalInjuryEffect?: string;
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
  quickFix?: string;
  treatment?: string;
}

export interface CombatAction {
  id: string;
  round: number;
  attackerId: string;
  attackerName: string;
  attackerAffiliation: Affiliation;
  defenderId: string;
  defenderName: string;
  defenderAffiliation: Affiliation;
  weaponName: string;
  damageFormula: string;
  attackRoll: number;
  attackBreakdown: string;
  defenseType: 'dodge' | 'dv' | 'none';
  defenseRoll?: number;
  defenseBreakdown?: string;
  hit: boolean;
  hitLocation: 'head' | 'body';
  damageRoll: number;
  damageDice: number[];
  sixCount?: number;
  isCritical: boolean;
  isTarotCrit?: boolean;
  tarotCard?: { id?: string; name: string; number?: number; roman?: string; effect: string };
  criticalInjuryName?: string;
  criticalInjuryEffect?: string;
  spBefore: number;
  spAbsorbed: number;
  spAfter: number;
  coverDamage?: number;
  hpDamage: number;
  hpBefore: number;
  hpAfter: number;
  woundStateAfter: WoundState;
  downed: boolean;
  timestamp: string;
}

export interface RoundRecap {
  round: number;
  narrative: string;
  tone: 'cyberpunk' | 'high_octane' | 'tactical';
  actions: CombatAction[];
  generatedAt: string;
}

export interface TarotCard {
  id: string;
  name: string;
  number: number;
  roman?: string;
  suit: 'major' | 'cups' | 'pentacles' | 'swords' | 'wands';
  description: string;
  effect: string;
}

export interface TarotDeckState {
  cardIds: string[];
  drawnThisSession: boolean;
  cardsSeenCount: number;
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
  affiliation?: Affiliation;
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
        headLocation?: { sp: number };
        bodyLocation?: { sp: number };
      };
    };
    weapons: Weapon[];
    cyberware: string[];
    gear: string[];
  };
  isGoon?: boolean;
  tier?: 'easy' | 'average' | 'elite' | 'mook' | 'lieutenant' | 'boss';
  combatNumber?: number;
  nonCombatNumber?: number;
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
