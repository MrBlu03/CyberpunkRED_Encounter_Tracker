// Narrative Engine for Cyberpunk RED Combat
// Strictly produces Tactical SITREP telemetry breakdowns with zero fluff for GM briefing and narration.

import type { CombatAction, RoundRecap, Participant } from '@/types';

export type NarrativeTone = 'tactical' | 'cyberpunk' | 'high_octane';

export function generateRoundNarrative(
  round: number,
  actions: CombatAction[],
  tone: NarrativeTone = 'tactical',
  spotlightParticipant?: Participant | null
): RoundRecap {
  const isPCSpotlight = spotlightParticipant ? (spotlightParticipant.isPC || spotlightParticipant.affiliation === 'player') : false;
  const spotlightLabel = spotlightParticipant 
    ? (isPCSpotlight ? 'Player Character' : 'Custom Friendly Ally (GM Manual Control)')
    : '';

  if (actions.length === 0) {
    const lines: string[] = [
      `========================================================================`,
      `[TACTICAL SITREP // COMBAT ROUND ${round}]`,
      `========================================================================`,
      `STATUS: Maneuver & Standoff Phase`,
      `No offensive attacks resolved during this cycle. Combatants repositioning behind cover and locking targets.`,
      ``
    ];

    if (spotlightParticipant) {
      lines.push(
        `--- ACTIVE INITIATIVE SPOTLIGHT ---`,
        `TURN HAND-OFF: [${spotlightParticipant.name}] (${spotlightLabel})`,
        `Automated round resolution complete. Standby for manual action declaration.`
      );
    }

    return {
      round,
      tone,
      actions: [],
      generatedAt: new Date().toLocaleTimeString(),
      narrative: lines.join('\n')
    };
  }

  const hits = actions.filter(a => a.hit);
  const misses = actions.filter(a => !a.hit);
  const crits = actions.filter(a => a.isCritical || a.isTarotCrit);
  const downeds = actions.filter(a => a.downed);

  const lines: string[] = [
    `========================================================================`,
    `[TACTICAL SITREP // COMBAT ROUND ${round}]`,
    `========================================================================`,
    `OVERVIEW: ${actions.length} Total Engagements | ${hits.length} Hits | ${misses.length} Evasions/Deflections | ${crits.length} Critical Traumas | ${downeds.length} Casualties`,
    ``,
    `--- ITEM-BY-ITEM ENGAGEMENT BREAKDOWN ---`
  ];

  actions.forEach((act, idx) => {
    lines.push(`\n[ENGAGEMENT #${idx + 1}]`);
    lines.push(`• COMBATANTS: [${act.attackerName}] ➔ [${act.defenderName}]`);
    lines.push(`• WEAPON: ${act.weaponName} (${act.damageFormula || 'Std'}) | LOCATION: ${act.hitLocation.toUpperCase()}`);

    if (act.hit) {
      lines.push(`• ATTACK CHECK: SUCCESS // Atk Roll: ${act.attackRoll} (${act.attackBreakdown || 'd10+Stat'})`);
      if (act.defenseType === 'dv') {
        lines.push(`• DEFENSE: Range Chart DV ${act.defenseRoll ?? 'N/A'}`);
      } else if (act.defenseRoll !== undefined) {
        lines.push(`• DEFENSE: Evade Roll ${act.defenseRoll} (${act.defenseBreakdown || 'd10+Stat'})`);
      }
      lines.push(`• BALLISTIC DAMAGE: Rolled ${act.damageRoll} DMG ${act.damageDice && act.damageDice.length > 0 ? `[Dice: ${act.damageDice.join(', ')}]` : ''}`);
      lines.push(`• ARMOR INTERACTION: SP Absorbed ${act.spAbsorbed} | Defender SP Ablated: ${act.spBefore} ➔ ${act.spAfter}`);
      lines.push(`• VITAL IMPACT: Net -${act.hpDamage} HP dealt | Defender HP: ${act.hpAfter}/${act.hpBefore} (${act.woundStateAfter || 'Active'})`);

      if (act.isTarotCrit && act.tarotCard) {
        lines.push(`• 🎴 CYBERPUNK TAROT CRITICAL: ${act.tarotCard.name}`);
        lines.push(`  EFFECT: ${act.tarotCard.effect}`);
      } else if (act.isCritical && act.criticalInjuryName) {
        lines.push(`• 💥 CRITICAL TRAUMA: ${act.criticalInjuryName}`);
        lines.push(`  EFFECT: ${act.criticalInjuryEffect || 'Standard Trauma penalty applies.'}`);
      }

      if (act.downed) {
        lines.push(`• 💀 CASUALTY CONFIRMATION: [${act.defenderName}] biological thresholds exceeded. DOWNED!`);
      }
    } else {
      lines.push(`• ATTACK CHECK: EVADED / DEFLECTED // Atk Roll: ${act.attackRoll} (${act.attackBreakdown || 'd10+Stat'})`);
      if (act.defenseType === 'dv') {
        lines.push(`• DEFENSE: Target DV ${act.defenseRoll ?? 'N/A'} (Shot failed to beat Range DV)`);
      } else {
        lines.push(`• DEFENSE: Opposed Evade Roll ${act.defenseRoll} (${act.defenseBreakdown || 'd10+Stat'}) (Target successfully dodged)`);
      }
      lines.push(`• OUTCOME: Zero damage inflicted. Defender SP ${act.spBefore} intact.`);
    }
  });

  lines.push(`\n------------------------------------------------------------------------`);
  lines.push(`--- CASUALTY SITREP ---`);
  if (downeds.length > 0) {
    lines.push(`CONFIRMED DOWNED COMBATANTS: ${downeds.map(d => `[${d.defenderName}]`).join(', ')}`);
  } else {
    lines.push(`CONFIRMED DOWNED COMBATANTS: None. All combatants remain operational.`);
  }

  if (spotlightParticipant) {
    lines.push(`\n------------------------------------------------------------------------`);
    lines.push(`--- ACTIVE INITIATIVE SPOTLIGHT ---`);
    lines.push(`ACTIVE TURN HAND-OFF: [${spotlightParticipant.name}] (${spotlightLabel})`);
    lines.push(`Automated exchanges resolved for Round ${round}. The spotlight is now on ${spotlightParticipant.name}.`);
    lines.push(`Standby for player or manual action declaration.`);
  }
  lines.push(`========================================================================`);

  return {
    round,
    tone,
    actions,
    generatedAt: new Date().toLocaleTimeString(),
    narrative: lines.join('\n')
  };
}
