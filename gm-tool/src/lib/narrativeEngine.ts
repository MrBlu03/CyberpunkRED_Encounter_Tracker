// Narrative Engine for Cyberpunk RED Combat
// Transforms round combat actions into immersive, ready-to-read combat prose.

import type { CombatAction, RoundRecap, Participant } from '@/types';

export type NarrativeTone = 'cyberpunk' | 'high_octane' | 'tactical';

const ATMOSPHERIC_OPENERS = [
  "Acrid cordite and vaporized lead fill the air as muzzle flashes illuminate the darkness in stuttering strobes.",
  "Neon reflections shatter in the puddles as high-velocity rounds chew through concrete and drywall.",
  "Sparks spray violently from severed conduits as the firefight erupts into deafening chaos.",
  "The sharp percussion of heavy gunfire rattles teeth while ricochets whistle past ear-level.",
  "Thermal smoke billows across the killing zone as weapons cycle brass at breakneck speeds."
];

const DODGE_DESCRIPTIONS = [
  (def: string, att: string, wep: string) => `${def} reads the trajectory of ${att}'s ${wep} and slides into a combat roll beneath the spray.`,
  (def: string, att: string, wep: string) => `${def} pivots on reflex with cybernetic agility, letting the burst from ${att}'s ${wep} punch uselessly into the wall behind.`,
  (def: string, att: string, wep: string) => `Rounds from ${att}'s ${wep} snap centimeters from ${def}'s face as they duck cleanly into the blind spot.`,
  (def: string, att: string, wep: string) => `${def} sidesteps the incoming fire from ${att}'s ${wep} with chilling composure.`
];

const HIT_DESCRIPTIONS = [
  (att: string, def: string, wep: string, dmg: number) => `${att} lines up their sights and drills ${def} with a solid hit from their ${wep}, dealing ${dmg} damage.`,
  (att: string, def: string, wep: string, dmg: number) => `${att} opens up with their ${wep}, the impact slamming hard into ${def} for ${dmg} damage.`,
  (att: string, def: string, wep: string, dmg: number) => `A deafening discharge from ${att}'s ${wep} catches ${def} square in the chest, racking up ${dmg} damage.`
];

const CRIT_DESCRIPTIONS = [
  (att: string, def: string, crit: string, effect: string) => `💥 CRITICAL TRAUMA! ${att}'s shot inflicts catastrophic damage: ${def} suffers a **${crit}** (${effect})!`,
  (att: string, def: string, crit: string, effect: string) => `💥 DEVASTATING HIT! Bones crunch and chrome tears as ${att} inflicts **${crit}** on ${def}! (${effect})`,
  (att: string, def: string, crit: string, effect: string) => `💥 GORE AND CHROME! A brutal strike from ${att} leaves ${def} reeling with a **${crit}**! (${effect})`
];

const DOWNED_DESCRIPTIONS = [
  (def: string) => `With their biological thresholds exceeded, **${def}** drops hard to the deck, lifeless.`,
  (def: string) => `The lethal trauma proves too much—**${def}** collapses in a heap of smoking cyberware and blood.`,
  (def: string) => `**${def}** crumples against the wall and slides to the floor, out of the fight!`
];

export function generateRoundNarrative(
  round: number,
  actions: CombatAction[],
  tone: NarrativeTone = 'cyberpunk',
  spotlightParticipant?: Participant | null
): RoundRecap {
  if (actions.length === 0) {
    let emptyMsg = `Round ${round}: Combatants maneuver for position behind cover, weapons drawn and eyes scanning for movement. No shots connected this round.`;
    if (spotlightParticipant) {
      emptyMsg += `\n\n🎯 **INITIATIVE SPOTLIGHT**: Active turn passes to **${spotlightParticipant.name}** (${spotlightParticipant.isPC ? 'Player Character' : 'GM Controlled Ally'}). What do you do?`;
    }
    return {
      round,
      tone,
      actions: [],
      generatedAt: new Date().toLocaleTimeString(),
      narrative: emptyMsg
    };
  }

  const hits = actions.filter(a => a.hit);
  const misses = actions.filter(a => !a.hit);
  const crits = actions.filter(a => a.isCritical);
  const downeds = actions.filter(a => a.downed);

  const paragraphs: string[] = [];

  if (tone === 'tactical') {
    // Militech / Trauma Team Tactical Log
    paragraphs.push(`[TACTICAL SITREP // ROUND ${round}]`);
    paragraphs.push(`Total Engagements: ${actions.length} | Effective Hits: ${hits.length} | Evasions/Deflections: ${misses.length} | Critical Trauma Events: ${crits.length} | Casualties: ${downeds.length}`);
    
    actions.forEach((act, idx) => {
      const status = act.hit ? `HIT (${act.hpDamage} HP dmg, SP ablated to ${act.spAfter})` : `EVADED (Atk ${act.attackRoll} vs Def ${act.defenseRoll})`;
      const critStr = act.isCritical ? ` [CRIT INJURY: ${act.criticalInjuryName}]` : '';
      const downStr = act.downed ? ` [TARGET DOWNED]` : '';
      paragraphs.push(`${idx + 1}. [${act.attackerName}] -> [${act.defenderName}] with ${act.weaponName}: ${status}${critStr}${downStr}`);
    });

    if (downeds.length > 0) {
      paragraphs.push(`CASUALTY REPORT: Confirmed down: ${downeds.map(d => d.defenderName).join(', ')}.`);
    }

    if (spotlightParticipant) {
      paragraphs.push(`ACTIVE ENGAGEMENT ORDER: Combat initiative shifts to [${spotlightParticipant.name}] (${spotlightParticipant.isPC ? 'Player Character' : 'Custom Allied VIP - GM Manual Command'}). Standby for action declaration.`);
    }

    return {
      round,
      tone,
      actions,
      generatedAt: new Date().toLocaleTimeString(),
      narrative: paragraphs.join('\n\n')
    };
  }

  // Gritty Cyberpunk or High-Octane Action
  const opener = ATMOSPHERIC_OPENERS[Math.floor(Math.random() * ATMOSPHERIC_OPENERS.length)];
  paragraphs.push(`### 🎬 Round ${round} Action Sequence\n\n${opener}`);

  const actionNarratives: string[] = [];

  actions.forEach(action => {
    const { attackerName, defenderName, weaponName, hit, damageRoll, hpDamage, isCritical, criticalInjuryName, criticalInjuryEffect, downed } = action;

    if (!hit) {
      const dodgePicker = DODGE_DESCRIPTIONS[Math.floor(Math.random() * DODGE_DESCRIPTIONS.length)];
      actionNarratives.push(dodgePicker(defenderName, attackerName, weaponName));
    } else {
      const hitPicker = HIT_DESCRIPTIONS[Math.floor(Math.random() * HIT_DESCRIPTIONS.length)];
      let sentence = hitPicker(attackerName, defenderName, weaponName, hpDamage || damageRoll);

      if (isCritical && criticalInjuryName) {
        const critPicker = CRIT_DESCRIPTIONS[Math.floor(Math.random() * CRIT_DESCRIPTIONS.length)];
        sentence += `\n${critPicker(attackerName, defenderName, criticalInjuryName, criticalInjuryEffect || '')}`;
      }

      if (downed) {
        const downPicker = DOWNED_DESCRIPTIONS[Math.floor(Math.random() * DOWNED_DESCRIPTIONS.length)];
        sentence += `\n${downPicker(defenderName)}`;
      }

      actionNarratives.push(sentence);
    }
  });

  paragraphs.push(actionNarratives.join('\n\n'));

  // Conclusion / transition
  if (downeds.length > 0) {
    paragraphs.push(`The deafening echoes begin to settle, leaving ${downeds.map(d => d.defenderName).join(' and ')} motionless on the floor while the survivors frantically recalculate their odds.`);
  } else {
    paragraphs.push(`With spent casings rolling across the floor, both sides hold their ground, locked in a deadly standoff as the next split-second of violence approaches.`);
  }

  // Spotlight transition to Player's turn or Custom Friendly NPC under GM control
  if (spotlightParticipant) {
    const isPC = spotlightParticipant.isPC || spotlightParticipant.affiliation === 'player';
    const label = isPC ? 'Player Turn' : 'Allied Operative (GM Manual Control)';
    paragraphs.push(`🎯 **INITIATIVE SPOTLIGHT // [${label}]**\nAs the smoke and cordite disperse from this exchange, tactical focus snaps to **${spotlightParticipant.name}**. The auto-combat phase has resolved—the spotlight is on you. **What is your action?**`);
  }

  return {
    round,
    tone,
    actions,
    generatedAt: new Date().toLocaleTimeString(),
    narrative: paragraphs.join('\n\n')
  };
}
