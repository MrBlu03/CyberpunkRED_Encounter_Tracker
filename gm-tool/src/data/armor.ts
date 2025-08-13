// Cyberpunk RED Armor System (RAW compliant)

export type ArmorLocation = 'head' | 'body';

export interface ArmorPiece {
  id: string;
  name: string;
  location: ArmorLocation;
  sp: number;
  maxSp: number;
  quality: 'poor' | 'standard' | 'excellent';
  destroyed: boolean;
  ablated: boolean; // If SP has been reduced this combat
}

export interface ArmorSet {
  head: ArmorPiece[];
  body: ArmorPiece[];
}

export function createArmorPiece(
  name: string, 
  location: ArmorLocation, 
  sp: number, 
  quality: 'poor' | 'standard' | 'excellent' = 'standard'
): ArmorPiece {
  return {
    id: Date.now().toString() + Math.random(),
    name,
    location,
    sp,
    maxSp: sp,
    quality,
    destroyed: false,
    ablated: false
  };
}

// Calculate effective SP for a location (highest SP wins)
export function getEffectiveArmor(armorPieces: ArmorPiece[]): number {
  const activePieces = armorPieces.filter(piece => !piece.destroyed && piece.sp > 0);
  if (activePieces.length === 0) return 0;
  
  return Math.max(...activePieces.map(piece => piece.sp));
}

// Apply armor ablation per RAW rules
export function ablateArmor(
  armorPieces: ArmorPiece[], 
  damageType: 'normal' | 'armor-piercing' | 'half-armor' | 'ignore-armor',
  damagePenetrated: boolean
): ArmorPiece[] {
  if (damageType === 'ignore-armor' || !damagePenetrated) {
    return armorPieces; // No ablation
  }
  
  const ablationAmount = damageType === 'armor-piercing' ? 2 : 1;
  
  return armorPieces.map(piece => {
    if (piece.destroyed || piece.sp <= 0) return piece;
    
    const newSP = Math.max(0, piece.sp - ablationAmount);
    return {
      ...piece,
      sp: newSP,
      ablated: true,
      destroyed: newSP <= 0
    };
  });
}

// Reset ablation status (for new combat rounds)
export function resetAblation(armorPieces: ArmorPiece[]): ArmorPiece[] {
  return armorPieces.map(piece => ({
    ...piece,
    ablated: false
  }));
}

// Standard armor types from the rulebook
export const STANDARD_ARMOR = {
  leathers: { name: 'Leathers', head: 0, body: 4 },
  'kevlar-vest': { name: 'Kevlar Vest', head: 0, body: 7 },
  'light-armorjack': { name: 'Light Armorjack', head: 7, body: 11 },
  'medium-armorjack': { name: 'Medium Armorjack', head: 12, body: 12 },
  'heavy-armorjack': { name: 'Heavy Armorjack', head: 14, body: 18 },
  'flak-vest': { name: 'Flak Vest', head: 0, body: 11 },
  'riot-gear': { name: 'Riot Gear', head: 13, body: 13 },
  'metal-gear': { name: 'Metal Gear', head: 18, body: 18 }
} as const;

export function createStandardArmorSet(armorType: keyof typeof STANDARD_ARMOR): ArmorSet {
  const template = STANDARD_ARMOR[armorType];
  
  const armorSet: ArmorSet = {
    head: template.head > 0 ? [createArmorPiece(`${template.name} (Head)`, 'head', template.head)] : [],
    body: template.body > 0 ? [createArmorPiece(`${template.name} (Body)`, 'body', template.body)] : []
  };
  
  return armorSet;
}
