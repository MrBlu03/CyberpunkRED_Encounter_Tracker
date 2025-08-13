import { ArmorPiece, getEffectiveArmor, ablateArmor } from './armor';

export type DamageType = 'normal' | 'armor-piercing' | 'half-armor' | 'ignore-armor'
export type HitLocation = 'head' | 'body'

export interface DamageResult {
  totalDamage: number
  coverSPApplied: number
  armorSPApplied: number
  damageToHP: number
  armorAblation: number
  isHeadshot: boolean
  criticalDamage: number
  ablatedArmor?: ArmorPiece[]
}

export interface ArmorLayer {
  sp: number
  location: HitLocation
  name: string
}

export interface CoverInfo {
  sp: number
  hp: number
  destroyed: boolean
}

// Enhanced damage resolution with proper armor ablation
export function resolveDamageWithArmor(
  baseDamage: number,
  location: HitLocation,
  damageType: DamageType,
  armorPieces: ArmorPiece[],
  cover?: CoverInfo,
  isCritical = false
): DamageResult {
  let remainingDamage = baseDamage
  let coverSPApplied = 0
  let armorSPApplied = 0
  let armorAblation = 0
  let criticalDamage = isCritical ? 5 : 0

  // Step 1: Apply Cover SP first
  if (cover && !cover.destroyed && cover.sp > 0) {
    const coverReduction = Math.min(cover.sp, remainingDamage)
    coverSPApplied = coverReduction
    remainingDamage -= coverReduction
  }

  // Step 2: Apply Armor SP for hit location
  let ablatedArmor: ArmorPiece[] | undefined;
  if (remainingDamage > 0 && damageType !== 'ignore-armor') {
    const relevantArmor = armorPieces.filter(piece => piece.location === location);
    let effectiveSP = getEffectiveArmor(relevantArmor);
    
    // Half armor for melee/martial arts
    if (damageType === 'half-armor') {
      effectiveSP = Math.floor(effectiveSP / 2);
    }
    
    if (effectiveSP > 0) {
      const armorReduction = Math.min(effectiveSP, remainingDamage);
      armorSPApplied = armorReduction;
      remainingDamage -= armorReduction;
      
      // Apply ablation if damage penetrated
      const damagePenetrated = remainingDamage > 0;
      if (damagePenetrated) {
        ablatedArmor = ablateArmor(relevantArmor, damageType, true);
        armorAblation = damageType === 'armor-piercing' ? 2 : 1;
      }
    }
  }

  // Step 3: Headshot multiplier (after armor)
  const isHeadshot = location === 'head'
  if (isHeadshot && remainingDamage > 0) {
    remainingDamage *= 2
  }

  // Step 4: Add critical damage
  const totalDamageToHP = remainingDamage + criticalDamage

  return {
    totalDamage: baseDamage + criticalDamage,
    coverSPApplied,
    armorSPApplied,
    damageToHP: totalDamageToHP,
    armorAblation,
    isHeadshot,
    criticalDamage,
    ablatedArmor
  }
}

// Original function maintained for backward compatibility
export function resolveDamage(
  baseDamage: number,
  location: HitLocation,
  damageType: DamageType,
  armor: ArmorLayer[],
  cover?: CoverInfo,
  isCritical = false
): DamageResult {
  let remainingDamage = baseDamage
  let coverSPApplied = 0
  let armorSPApplied = 0
  let armorAblation = 0
  let criticalDamage = isCritical ? 5 : 0

  // Step 1: Apply Cover SP first
  if (cover && !cover.destroyed && cover.sp > 0) {
    const coverReduction = Math.min(cover.sp, remainingDamage)
    coverSPApplied = coverReduction
    remainingDamage -= coverReduction
  }

  // Step 2: Apply Armor SP for hit location
  if (remainingDamage > 0 && damageType !== 'ignore-armor') {
    const relevantArmor = armor.filter(a => a.location === location)
    const totalArmorSP = relevantArmor.reduce((sum, a) => sum + a.sp, 0)

    let effectiveArmorSP = totalArmorSP
    if (damageType === 'half-armor') {
      effectiveArmorSP = Math.floor(totalArmorSP / 2)
    }

    const armorReduction = Math.min(effectiveArmorSP, remainingDamage)
    armorSPApplied = armorReduction
    remainingDamage -= armorReduction

    // Step 3: Armor Ablation (only if armor was penetrated)
    if (armorReduction > 0 && remainingDamage > 0) {
      armorAblation = damageType === 'armor-piercing' ? 2 : 1
    }
  }

  // Step 4: Remaining damage goes to HP
  let damageToHP = remainingDamage

  // Step 5: Headshots do x2 damage after SP
  const isHeadshot = location === 'head'
  if (isHeadshot && damageToHP > 0) {
    damageToHP *= 2
  }

  // Step 6: Add critical damage
  damageToHP += criticalDamage

  return {
    totalDamage: baseDamage + criticalDamage,
    coverSPApplied,
    armorSPApplied,
    damageToHP,
    armorAblation,
    isHeadshot,
    criticalDamage
  }
}

// Critical injury detection per RAW
export function detectCritical(damageDice: number[]): boolean {
  const sixes = damageDice.filter(d => d === 6).length
  return sixes >= 2
}

// Roll on hit location (simplified)
export function rollHitLocation(): HitLocation {
  const roll = Math.floor(Math.random() * 10) + 1
  return roll <= 4 ? 'head' : 'body'
}

// Death save calculation per p. 188
export function rollDeathSave(bodyValue: number, penalties = 0): { 
  roll: number; 
  target: number;
  success: boolean; 
  result: 'stabilized' | 'bleeding' | 'dead';
} {
  const roll = Math.floor(Math.random() * 10) + 1
  const target = bodyValue - penalties
  const success = roll <= target
  
  let result: 'stabilized' | 'bleeding' | 'dead';
  if (success) {
    result = 'stabilized';
  } else if (roll === 10) {
    result = 'dead'; // Natural 10 is always death
  } else {
    result = 'bleeding';
  }
  
  return { roll, target, success, result }
}
