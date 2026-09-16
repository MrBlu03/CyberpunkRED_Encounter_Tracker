// Cyberpunk RED Combat Engine
// Implements official RAW combat resolution, bullet dodging, critical injuries, and armor ablation.

import type { Participant, Weapon, CombatAction, DamageType } from '@/types';
import { getWoundState } from './damage';
import { drawRandomTarotCard } from './tarot';

// Official 2d6 RAW Critical Injuries per Cyberpunk RED Core Rulebook (p. 187-188)
export const CRITICAL_INJURIES_BODY: Record<number, { name: string; description: string; effect: string; quickFix: string; treatment: string }> = {
  2: {
    name: "Dismembered Arm",
    description: "The arm is completely severed or destroyed at the shoulder/elbow.",
    effect: "The arm is lost. You drop whatever was in that hand. Death Save penalty increases by 1 until surgically repaired.",
    quickFix: "None. Requires Surgery.",
    treatment: "Surgery DV 17 (Reattachment) or Cybernetic replacement."
  },
  3: {
    name: "Dismembered Hand",
    description: "The hand is completely severed or crushed into uselessness.",
    effect: "The hand is lost. You drop whatever was in that hand. -2 to two-handed actions.",
    quickFix: "Paramedic DV 15 (Tourniquet/Stabilize)",
    treatment: "Surgery DV 15 (Reattachment) or Cyberhand."
  },
  4: {
    name: "Collapsed Lung",
    description: "A puncture or blunt trauma has collapsed the lung.",
    effect: "-2 to MOVE (minimum 1). You cannot run, sprint, or take extra move actions.",
    quickFix: "Paramedic DV 13",
    treatment: "Surgery DV 15"
  },
  5: {
    name: "Broken Ribs",
    description: "Ribs are cracked or fractured.",
    effect: "At the end of every turn you moved more than 4m, you take 1 point of direct damage to HP.",
    quickFix: "First Aid / Paramedic DV 13",
    treatment: "Surgery DV 13"
  },
  6: {
    name: "Broken Arm",
    description: "Bone fracture in the arm.",
    effect: "The arm cannot be used to hold anything heavier than a cigarette. -2 to tasks using this arm.",
    quickFix: "First Aid / Paramedic DV 13",
    treatment: "Surgery DV 13"
  },
  7: {
    name: "Foreign Object",
    description: "A slug, blade fragment, or piece of shrapnel is lodged deep inside the body.",
    effect: "At the end of any turn you took a Move Action, you take 1 direct damage to HP until removed.",
    quickFix: "First Aid / Paramedic DV 13 (stabilize)",
    treatment: "Surgery DV 13 (extract)"
  },
  8: {
    name: "Broken Leg",
    description: "Fractured femur or tibia.",
    effect: "-4 to MOVE (minimum 1). Cannot dodge attacks or sprint.",
    quickFix: "First Aid / Paramedic DV 13 (splint)",
    treatment: "Surgery DV 13"
  },
  9: {
    name: "Torn Muscle",
    description: "Deep muscle tear in the torso or limbs.",
    effect: "-2 to all Melee, Brawling, and Martial Arts attacks.",
    quickFix: "First Aid / Paramedic DV 13",
    treatment: "Surgery DV 13"
  },
  10: {
    name: "Spinal Injury",
    description: "Vertebrae cracked or spinal column damaged.",
    effect: "Target cannot take Move actions for the next turn. Death Save penalty increases by 1.",
    quickFix: "Paramedic DV 15",
    treatment: "Surgery DV 17"
  },
  11: {
    name: "Crushed Fingers",
    description: "Fingers crushed by impact.",
    effect: "-4 to actions made using that hand.",
    quickFix: "First Aid / Paramedic DV 13",
    treatment: "Surgery DV 13"
  },
  12: {
    name: "Dismembered Leg",
    description: "The leg is completely severed or shattered.",
    effect: "The leg is lost. MOVE reduced to 1 (crawling). Cannot dodge or jump. Death Save penalty increases by 1.",
    quickFix: "Paramedic DV 15",
    treatment: "Surgery DV 17 or Cyberleg."
  }
};

export const CRITICAL_INJURIES_HEAD: Record<number, { name: string; description: string; effect: string; quickFix: string; treatment: string }> = {
  2: {
    name: "Lost Eye",
    description: "The eye is ruptured or completely destroyed.",
    effect: "The eye is lost. -4 to all Ranged Weapon Attacks and sight-based Perception checks.",
    quickFix: "Paramedic DV 15",
    treatment: "Surgery DV 17 or Cybereye."
  },
  3: {
    name: "Brain Injury",
    description: "Traumatic brain injury from blunt force or piercing penetration.",
    effect: "-2 to all Actions. Target cannot use LUCK or Role abilities.",
    quickFix: "None. Requires Surgery.",
    treatment: "Surgery DV 17"
  },
  4: {
    name: "Damaged Eye",
    description: "Severe bleeding or corneal laceration in the eye.",
    effect: "-2 to Ranged Attacks and sight-based Perception checks.",
    quickFix: "First Aid / Paramedic DV 13",
    treatment: "Surgery DV 13"
  },
  5: {
    name: "Concussion",
    description: "Severe cranial concussion.",
    effect: "-2 to all Actions for 1 minute.",
    quickFix: "First Aid / Paramedic DV 13",
    treatment: "Rest / Surgery DV 13"
  },
  6: {
    name: "Broken Jaw",
    description: "Fractured mandible.",
    effect: "Target cannot speak clearly or shout. -4 to voice-based social checks.",
    quickFix: "First Aid / Paramedic DV 13",
    treatment: "Surgery DV 13"
  },
  7: {
    name: "Foreign Object in Skull",
    description: "Bullet or shrapnel fragment stuck in the skull.",
    effect: "-2 to all Actions. At end of every turn target takes 1 direct damage.",
    quickFix: "Paramedic DV 13",
    treatment: "Surgery DV 15"
  },
  8: {
    name: "Whiplash",
    description: "Violent jerking of the cervical spine.",
    effect: "-2 to REF and DEX based checks for 1 minute.",
    quickFix: "First Aid / Paramedic DV 13",
    treatment: "Surgery DV 13"
  },
  9: {
    name: "Cracked Skull",
    description: "Fissure in the cranium.",
    effect: "Target suffers severe dizziness. Aimed shots to the head do +1d6 extra damage.",
    quickFix: "Paramedic DV 13",
    treatment: "Surgery DV 15"
  },
  10: {
    name: "Damaged Ear",
    description: "Tympanic membrane ruptured.",
    effect: "-2 to hearing-based Perception checks. Suffers ringing in ears.",
    quickFix: "First Aid / Paramedic DV 13",
    treatment: "Surgery DV 13"
  },
  11: {
    name: "Crushed Windpipe",
    description: "Laryngeal trauma.",
    effect: "Target cannot speak. Suffers asphyxiation: takes 2 damage at end of turn.",
    quickFix: "Paramedic DV 15 (Tracheotomy)",
    treatment: "Surgery DV 15"
  },
  12: {
    name: "Lost Ear",
    description: "The ear is blown completely off.",
    effect: "The ear is lost. -4 to hearing-based Perception checks.",
    quickFix: "First Aid / Paramedic DV 13",
    treatment: "Surgery DV 15 or Cyberear."
  }
};

/**
 * Roll a standard single die
 */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll d10 exploding per Cyberpunk RED rules:
 * - A natural 10 rolls again and adds to total
 * - A natural 1 rolls again and subtracts from total
 */
export function rollD10Exploding(): { total: number; baseRoll: number; explosion?: number; botch?: number; breakdown: string } {
  const baseRoll = rollDie(10);
  
  if (baseRoll === 10) {
    const explodeRoll = rollDie(10);
    const total = 10 + explodeRoll;
    return {
      total,
      baseRoll,
      explosion: explodeRoll,
      breakdown: `10 + Explode(${explodeRoll}) = ${total}`
    };
  }
  
  if (baseRoll === 1) {
    const botchRoll = rollDie(10);
    const total = 1 - botchRoll;
    return {
      total,
      baseRoll,
      botch: botchRoll,
      breakdown: `1 - Botch(${botchRoll}) = ${total}`
    };
  }
  
  return {
    total: baseRoll,
    baseRoll,
    breakdown: `${baseRoll}`
  };
}

/**
 * Parse and roll damage dice formula, e.g. "3d6", "5d6", "2d6+2"
 * Returns sum, dice results, and whether $\ge 2$ sixes were rolled (Critical Injury)
 */
export function rollDamage(formula: string): { total: number; dice: number[]; isCritical: boolean; isTarotCrit: boolean; sixCount: number } {
  const match = formula.trim().match(/^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?$/i);
  
  let count = 3;
  let sides = 6;
  let bonus = 0;

  if (match) {
    count = parseInt(match[1], 10);
    sides = parseInt(match[2], 10);
    if (match[3] && match[4]) {
      const modifier = parseInt(match[4], 10);
      bonus = match[3] === '+' ? modifier : -modifier;
    }
  }

  const dice: number[] = [];
  let sum = 0;
  let sixCount = 0;

  for (let i = 0; i < count; i++) {
    const val = rollDie(sides);
    dice.push(val);
    sum += val;
    if (sides === 6 && val === 6) {
      sixCount++;
    }
  }

  const total = Math.max(0, sum + bonus);
  const isCritical = sixCount >= 2;
  const isTarotCrit = sixCount >= 3;

  return { total, dice, isCritical, isTarotCrit, sixCount };
}

/**
 * Roll on the official Critical Injury table
 */
export function rollCriticalInjury(location: 'head' | 'body' = 'body'): { roll: number; injury: { name: string; description: string; effect: string } } {
  const d1 = rollDie(6);
  const d2 = rollDie(6);
  const total = d1 + d2;
  
  const table = location === 'head' ? CRITICAL_INJURIES_HEAD : CRITICAL_INJURIES_BODY;
  const injury = table[total] || table[7];
  
  return { roll: total, injury };
}

/**
 * Helper to retrieve the single unified stat/step number for an NPC.
 * In Cyberpunk RED, NPC stats and skills derive from a single unified number.
 */
export function getNPCStatNumber(npc: Participant): number {
  if (typeof npc.combatNumber === 'number') {
    return npc.combatNumber;
  }
  const ref = npc.ref ?? 6;
  return ref + 4;
}

/**
 * Roll an opposed / contested check for an NPC against a player check or DC.
 * Uses 1d10 exploding/botching + NPC's single Stat Number.
 */
export function rollNPCContestCheck(npc: Participant): {
  total: number;
  roll: number;
  statNumber: number;
  isExploding: boolean;
  isBotch: boolean;
  breakdown: string;
} {
  const statNumber = getNPCStatNumber(npc);
  const d10 = rollD10Exploding();
  const total = d10.total + statNumber;

  return {
    total,
    roll: d10.total,
    statNumber,
    isExploding: d10.baseRoll === 10,
    isBotch: d10.baseRoll === 1,
    breakdown: `1d10(${d10.breakdown}) + Stat#(${statNumber}) = ${total}`
  };
}

/**
 * Get weapon skill base or single stat number for attack roll
 */
export function getAttackerCombatBonus(attacker: Participant, weapon: Weapon): { base: number; breakdown: string } {
  if (attacker.isGoon || attacker.affiliation !== 'player' || typeof attacker.combatNumber === 'number') {
    const cn = getNPCStatNumber(attacker);
    const mod = weapon.system?.attackmod ?? 0;
    return {
      base: cn + mod,
      breakdown: `Stat#(${cn})${mod ? ` + Mod(${mod})` : ''}`
    };
  }

  const ref = attacker.ref ?? 6;
  const weaponSkillName = weapon.system?.weaponSkill ?? 'Handgun';
  const skillVal = attacker.skills?.[weaponSkillName] ?? (attacker.combatNumber ? attacker.combatNumber - ref : 4);
  const mod = weapon.system?.attackmod ?? 0;

  return {
    base: ref + skillVal + mod,
    breakdown: `REF(${ref}) + Skill(${skillVal})${mod ? ` + Mod(${mod})` : ''}`
  };
}

/**
 * Get defender evasion bonus for bullet dodging or defense checks
 */
export function getDefenderEvasionBonus(defender: Participant): { base: number; breakdown: string } {
  if (defender.isGoon || defender.affiliation !== 'player' || typeof defender.combatNumber === 'number') {
    const cn = getNPCStatNumber(defender);
    return {
      base: cn,
      breakdown: `Stat#(${cn})`
    };
  }

  const dex = defender.dex ?? defender.ref ?? 6;
  const evasionSkill = defender.evasionSkill ?? defender.skills?.['Evasion'] ?? 4;

  return {
    base: dex + evasionSkill,
    breakdown: `DEX(${dex}) + Evasion(${evasionSkill})`
  };
}

/**
 * Resolve an attack against a defender:
 * - Bullet dodging rule: opposed check against Evasion!
 * - Damage roll with Critical Injury check (>= 2 sixes)
 * - Cover absorption, Armor SP reduction, ablation, and HP damage
 */
export function resolveAttack({
  attacker,
  defender,
  weapon,
  round = 1,
  aimedHead = false,
  damageType = 'normal'
}: {
  attacker: Participant;
  defender: Participant;
  weapon: Weapon;
  round?: number;
  aimedHead?: boolean;
  damageType?: DamageType;
}): { action: CombatAction; updatedDefender: Participant } {
  // 1. Attack Check
  const attackerBonus = getAttackerCombatBonus(attacker, weapon);
  const attackD10 = rollD10Exploding();
  const aimedPenalty = aimedHead ? -8 : 0;
  const totalAttack = attackD10.total + attackerBonus.base + aimedPenalty;
  const attackBreakdown = `d10(${attackD10.breakdown}) + ${attackerBonus.breakdown}${aimedHead ? ' - Aimed(-8)' : ''} = ${totalAttack}`;

  // 2. Defense Check (Bullet dodging)
  const defenderBonus = getDefenderEvasionBonus(defender);
  const defenseD10 = rollD10Exploding();
  const totalDefense = defenseD10.total + defenderBonus.base;
  const defenseBreakdown = `d10(${defenseD10.breakdown}) + ${defenderBonus.breakdown} = ${totalDefense}`;

  // In Cyberpunk RED, attacker must beat defender's roll (> totalDefense)
  const hit = totalAttack > totalDefense;

  const hitLocation = aimedHead ? 'head' : 'body';
  const damageFormula = weapon.system?.damage || '3d6';

  let damageRoll = 0;
  let damageDice: number[] = [];
  let sixCount = 0;
  let isCritical = false;
  let isTarotCrit = false;
  let tarotCard: { id?: string; name: string; number?: number; roman?: string; effect: string } | undefined;
  let criticalInjuryName: string | undefined;
  let criticalInjuryEffect: string | undefined;

  let spBefore = 0;
  let spAbsorbed = 0;
  let spAfter = 0;
  let coverDamage = 0;
  let hpDamage = 0;

  const hpBefore = defender.hp;
  const currentArmor = defender.armor || { head: 0, body: 0 };
  spBefore = hitLocation === 'head' ? (currentArmor.head || 0) : (currentArmor.body || 0);
  spAfter = spBefore;

  let currentCover = defender.cover;

  if (hit) {
    // 3. Roll Damage
    const rolled = rollDamage(damageFormula);
    damageRoll = rolled.total;
    damageDice = rolled.dice;
    sixCount = rolled.sixCount;
    isCritical = rolled.isCritical;
    isTarotCrit = rolled.isTarotCrit;

    if (isCritical) {
      const crit = rollCriticalInjury(hitLocation);
      criticalInjuryName = crit.injury.name;
      criticalInjuryEffect = crit.injury.effect;
    }

    if (isTarotCrit) {
      const card = drawRandomTarotCard();
      tarotCard = {
        id: card.id,
        name: card.name,
        number: card.number,
        roman: card.roman,
        effect: card.effect
      };
    }

    let remainingDamage = damageRoll;

    // 4. Cover absorption
    if (currentCover && currentCover.hp > 0) {
      const coverSP = currentCover.sp || 0;
      const afterSP = Math.max(0, remainingDamage - coverSP);
      const absorbed = Math.min(afterSP, currentCover.hp);
      coverDamage = absorbed;
      currentCover = {
        ...currentCover,
        hp: Math.max(0, currentCover.hp - absorbed)
      };
      remainingDamage = Math.max(0, afterSP - currentCover.hp);
    }

    // 5. Armor SP absorption
    const isMelee = weapon.system?.weaponType === 'melee' || weapon.system?.weaponSkill === 'Melee Weapon';
    const effectiveAmmo = weapon.ammoType || attacker.ammoType;
    const isAP = effectiveAmmo === 'Armor-Piercing' || damageType === 'armor-piercing';

    let effectiveSP = spBefore;
    if (isMelee || damageType === 'half-armor') {
      // RAW Cyberpunk RED rule: Melee attacks halve the target's effective armor SP!
      effectiveSP = Math.floor(spBefore / 2);
    } else if (damageType === 'ignore-armor') {
      effectiveSP = 0;
    }

    spAbsorbed = Math.min(remainingDamage, effectiveSP);
    let netDamage = Math.max(0, remainingDamage - effectiveSP);

    // Headshots multiply penetrating damage by 2
    if (hitLocation === 'head') {
      netDamage *= 2;
    }

    // Critical Injury adds +5 bonus damage straight to HP
    if (isCritical) {
      netDamage += 5;
    }

    // Armor Ablation: if penetrating damage occurred
    if (netDamage > 0 && spBefore > 0) {
      // Armor-Piercing ammunition ablates 2 SP instead of 1 on penetrating hit!
      const ablateAmount = isAP ? 2 : 1;
      spAfter = Math.max(0, spBefore - ablateAmount);
    }

    hpDamage = netDamage;
  }

  const hpAfter = Math.max(0, hpBefore - hpDamage);
  const newWoundState = getWoundState(hpAfter, defender.maxHp);
  const downed = hpAfter <= 0;

  // Build updated defender participant
  const updatedArmor = {
    ...currentArmor,
    head: hitLocation === 'head' ? spAfter : currentArmor.head,
    body: hitLocation === 'body' ? spAfter : currentArmor.body
  };

  const updatedDefender: Participant = {
    ...defender,
    hp: hpAfter,
    armor: updatedArmor,
    cover: currentCover,
    woundState: newWoundState,
    dead: downed
  };

  const action: CombatAction = {
    id: crypto.randomUUID(),
    round,
    attackerId: attacker.id,
    attackerName: attacker.name,
    attackerAffiliation: attacker.affiliation || (attacker.isPC ? 'player' : 'hostile_npc'),
    defenderId: defender.id,
    defenderName: defender.name,
    defenderAffiliation: defender.affiliation || (defender.isPC ? 'player' : 'hostile_npc'),
    weaponName: weapon.name,
    damageFormula,
    attackRoll: totalAttack,
    attackBreakdown,
    defenseType: 'dodge',
    defenseRoll: totalDefense,
    defenseBreakdown,
    hit,
    hitLocation,
    damageRoll,
    damageDice,
    sixCount,
    isCritical,
    isTarotCrit,
    tarotCard,
    criticalInjuryName,
    criticalInjuryEffect,
    spBefore,
    spAbsorbed,
    spAfter,
    coverDamage,
    hpDamage,
    hpBefore,
    hpAfter,
    woundStateAfter: newWoundState,
    downed,
    timestamp: new Date().toLocaleTimeString()
  };

  return { action, updatedDefender };
}

/**
 * Automatically pairs attackers with opposing targets in the encounter
 */
export function autoPairTargets(participants: Participant[]): Map<string, Participant> {
  const targetMap = new Map<string, Participant>();
  const activeParticipants = participants.filter(p => !p.dead && p.hp > 0);

  const hostiles = activeParticipants.filter(p => p.affiliation === 'hostile_npc' || (!p.isPC && p.affiliation !== 'friendly_npc'));
  const friendlies = activeParticipants.filter(p => p.affiliation === 'friendly_npc' || p.isPC || p.affiliation === 'player');

  // Friendly NPCs target Hostile NPCs
  friendlies.forEach(friendly => {
    if (friendly.isPC) return; // PCs decide manually
    if (friendly.targetId) {
      const explicit = activeParticipants.find(p => p.id === friendly.targetId && !p.dead);
      if (explicit) {
        targetMap.set(friendly.id, explicit);
        return;
      }
    }
    if (hostiles.length > 0) {
      // Prioritize lowest HP hostile or first in list
      const sortedHostiles = [...hostiles].sort((a, b) => a.hp - b.hp);
      targetMap.set(friendly.id, sortedHostiles[0]);
    }
  });

  // Hostile NPCs target Friendly NPCs first (if any), otherwise target PCs
  hostiles.forEach(hostile => {
    if (hostile.targetId) {
      const explicit = activeParticipants.find(p => p.id === hostile.targetId && !p.dead);
      if (explicit) {
        targetMap.set(hostile.id, explicit);
        return;
      }
    }
    if (friendlies.length > 0) {
      // Prioritize friendly NPCs to keep players in the action, or distribute
      const friendlyNpcs = friendlies.filter(f => !f.isPC);
      if (friendlyNpcs.length > 0) {
        const sorted = [...friendlyNpcs].sort((a, b) => a.hp - b.hp);
        targetMap.set(hostile.id, sorted[0]);
      } else {
        // Target random or lowest HP PC
        const sortedPCs = [...friendlies].sort((a, b) => a.hp - b.hp);
        targetMap.set(hostile.id, sortedPCs[0]);
      }
    }
  });

  return targetMap;
}
