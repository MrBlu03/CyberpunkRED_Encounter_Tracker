// Cyberpunk RED Cover Rules (p. 192-193)

export interface Cover {
  type: 'light' | 'medium' | 'heavy' | 'human-shield';
  name: string;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  destroyed: boolean;
}

export const COVER_TYPES = {
  light: { hp: 10, sp: 10, name: 'Light Cover' },
  medium: { hp: 15, sp: 15, name: 'Medium Cover' },
  heavy: { hp: 20, sp: 20, name: 'Heavy Cover' },
  'human-shield': { hp: 40, sp: 0, name: 'Human Shield' } // Using average human HP
} as const;

export function createCover(type: keyof typeof COVER_TYPES): Cover {
  const template = COVER_TYPES[type];
  return {
    type,
    name: template.name,
    hp: template.hp,
    maxHp: template.hp,
    sp: template.sp,
    maxSp: template.sp,
    destroyed: false
  };
}

export function damageCover(cover: Cover, damage: number): Cover {
  if (cover.destroyed) return cover;
  
  // Apply SP first
  const afterSP = Math.max(0, damage - cover.sp);
  const newSP = Math.max(0, cover.sp - damage);
  
  // Remaining damage goes to HP
  const newHP = Math.max(0, cover.hp - afterSP);
  
  return {
    ...cover,
    hp: newHP,
    sp: newSP,
    destroyed: newHP <= 0
  };
}

export function rollHumanShieldRedirection(): boolean {
  // RAW: If miss by 4 or less, 50% chance to hit human shield instead
  return Math.random() < 0.5;
}

export function applyCoverToAttack(cover: Cover | null, damage: number): { 
  remainingDamage: number, 
  coverDamaged: Cover | null,
  hitCover: boolean 
} {
  if (!cover || cover.destroyed) {
    return { remainingDamage: damage, coverDamaged: cover, hitCover: false };
  }
  
  // For human shields, special rules apply (body hits only)
  if (cover.type === 'human-shield') {
    const damagedCover = damageCover(cover, damage);
    return { 
      remainingDamage: 0, // Human shield absorbs all damage
      coverDamaged: damagedCover, 
      hitCover: true 
    };
  }
  
  // Standard cover: SP reduces damage, rest damages cover
  const afterSP = Math.max(0, damage - cover.sp);
  const damagedCover = damageCover(cover, damage);
  
  return { 
    remainingDamage: afterSP, 
    coverDamaged: damagedCover, 
    hitCover: true 
  };
}
