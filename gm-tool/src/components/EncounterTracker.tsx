import { useState, useRef, useEffect } from 'react';
import { 
  Play, Dices, Swords, Shield, Heart, Skull, 
  Crosshair, Sparkles, Copy, Check, AlertTriangle,
  Flame, Plus, Trash2, ArrowRight, ShieldAlert,
  Clock, Save, FolderOpen, Download, Upload,
  Bomb, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { rollD10Exploding, resolveAttack, autoPairTargets, rollDamage, rollCriticalInjury, getNPCStatNumber } from '@/lib/combatEngine';
import { generateRoundNarrative } from '@/lib/narrativeEngine';
import type { NarrativeTone } from '@/lib/narrativeEngine';
import { getWoundState, canAct } from '@/lib/damage';
import { 
  WeaponRangeChart, 
  WeaponQuickBadge, 
  RangeDVReferenceModal 
} from '@/components/WeaponRangeChart';
import { formatWeaponCategory } from '@/lib/weaponRanges';
import { drawRandomTarotCard } from '@/lib/tarot';
import type { 
  Participant, EncounterState, SavedEncounter, Weapon, 
  CombatAction, RoundRecap, Affiliation, OrdnanceItem
} from '@/types';

interface EncounterTrackerProps {
  participants: Participant[];
  orderedParticipants: Participant[];
  encounter: EncounterState;
  activeTurnParticipant: Participant | null;
  savedEncounters: SavedEncounter[];
  onAddParticipant?: (participant: Omit<Participant, 'id' | 'woundState' | 'dead'>) => void;
  onUpdateParticipant: (id: string, updates: Partial<Participant>) => void;
  onRemoveParticipant: (id: string) => void;
  onRollAllNPCs: () => void;
  onRollAllWithPCs?: () => void;
  onClearRolls: () => void;
  onStartEncounter: () => void;
  onEndEncounter: () => void;
  onNextTurn: () => void;
  onSaveEncounter: () => void;
  onLoadEncounter: (encounter: SavedEncounter) => void;
  onDeleteEncounter: (id: string) => void;
  onExportEncounters: () => void;
  onImportEncounters: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function EncounterTracker({
  participants,
  orderedParticipants,
  encounter,
  activeTurnParticipant,
  savedEncounters,
  onUpdateParticipant,
  onRemoveParticipant,
  onRollAllNPCs,
  onRollAllWithPCs,
  onClearRolls,
  onStartEncounter,
  onEndEncounter,
  onNextTurn,
  onSaveEncounter,
  onLoadEncounter,
  onDeleteEncounter,
  onExportEncounters,
  onImportEncounters
}: EncounterTrackerProps) {
  // Combat history and narration state
  const [combatActions, setCombatActions] = useState<CombatAction[]>([]);
  const [currentRoundRecap, setCurrentRoundRecap] = useState<RoundRecap | null>(null);
  const [showNarrationModal, setShowNarrationModal] = useState(false);
  const [selectedTone, setSelectedTone] = useState<NarrativeTone>('cyberpunk');
  const [copiedNarration, setCopiedNarration] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);

  // GM Review Intercept Modal state (for attacks targeting PCs)
  const [pendingPCAttack, setPendingPCAttack] = useState<{
    attacker: Participant;
    pcDefender: Participant;
    weapon: Weapon;
    attackRoll: number;
    attackBreakdown: string;
    defenseRoll: number;
    defenseBreakdown: string;
    damageRoll: number;
    damageDice: number[];
    sixCount: number;
    isCritical: boolean;
    isTarotCrit: boolean;
    tarotCard?: { id?: string; name: string; number?: number; roman?: string; effect: string };
    criticalInjuryName?: string;
    criticalInjuryEffect?: string;
    hitLocation: 'head' | 'body';
    hit: boolean;
    modifiedDamage: number;
    overrideHit: boolean;
  } | null>(null);

  // Quick manual add participant modal
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddAffiliation, setQuickAddAffiliation] = useState<Affiliation>('hostile_npc');
  const [quickAddHP, setQuickAddHP] = useState(30);
  const [quickAddSP, setQuickAddSP] = useState(11);
  const [quickAddRef, setQuickAddRef] = useState(6);

  // Opposed / Contest Check State (1d10 exploding + single NPC Stat Number vs player roll)
  const [activeContest, setActiveContest] = useState<{
    npc: Participant;
    statNumber: number;
    contestName: string;
    d10Result: { total: number; baseRoll: number; explosion?: number; botch?: number; breakdown: string };
    npcTotal: number;
    playerRoll: number | '';
  } | null>(null);

  const handleTriggerContest = (npc: Participant, defaultName: string = 'General Opposed Check') => {
    const statNumber = getNPCStatNumber(npc);
    const d10Result = rollD10Exploding();
    const npcTotal = d10Result.total + statNumber;

    setActiveContest({
      npc,
      statNumber,
      contestName: defaultName,
      d10Result,
      npcTotal,
      playerRoll: ''
    });

    toast.success(`🎲 ${npc.name} Opposed Roll: ${npcTotal} (1d10 + Stat #${statNumber})`);
  };

  const handleRerollContest = () => {
    if (!activeContest) return;
    const d10Result = rollD10Exploding();
    const npcTotal = d10Result.total + activeContest.statNumber;
    setActiveContest(prev => prev ? ({ ...prev, d10Result, npcTotal }) : null);
    toast.info(`🎲 Re-rolled ${activeContest.npc.name}: ${npcTotal}`);
  };

  const handleLogContestAction = () => {
    if (!activeContest) return;
    const pRoll = typeof activeContest.playerRoll === 'number' ? activeContest.playerRoll : null;
    let outcomeText = '';
    let hit = true;
    if (pRoll !== null) {
      if (activeContest.npcTotal > pRoll) {
        outcomeText = `[NPC Wins vs PC ${pRoll} by ${activeContest.npcTotal - pRoll}]`;
        hit = true;
      } else if (pRoll > activeContest.npcTotal) {
        outcomeText = `[Player Wins with ${pRoll} vs NPC ${activeContest.npcTotal}]`;
        hit = false;
      } else {
        outcomeText = `[Tie at ${activeContest.npcTotal} - Status Quo Holds]`;
        hit = true;
      }
    }

    const action: CombatAction = {
      id: crypto.randomUUID(),
      round: encounter.round,
      attackerId: activeContest.npc.id,
      attackerName: activeContest.npc.name,
      attackerAffiliation: activeContest.npc.affiliation || 'hostile_npc',
      defenderId: 'player',
      defenderName: 'Player Character',
      defenderAffiliation: 'player',
      weaponName: `Contest: ${activeContest.contestName} ${outcomeText}`,
      damageFormula: '-',
      attackRoll: activeContest.npcTotal,
      attackBreakdown: `1d10(${activeContest.d10Result.breakdown}) + Stat#(${activeContest.statNumber}) = ${activeContest.npcTotal}`,
      defenseType: 'dodge',
      defenseRoll: pRoll ?? 0,
      defenseBreakdown: pRoll !== null ? `PC Roll = ${pRoll}` : undefined,
      hit,
      hitLocation: 'body',
      damageRoll: 0,
      damageDice: [],
      isCritical: false,
      spBefore: 0,
      spAbsorbed: 0,
      spAfter: 0,
      hpDamage: 0,
      hpBefore: 0,
      hpAfter: 0,
      woundStateAfter: 'not-wounded',
      downed: false,
      timestamp: new Date().toISOString()
    };

    setCombatActions(prev => [action, ...prev]);
    toast.success(`Logged opposed check to combat log`);
    setActiveContest(null);
  };

  // Target pairings for active combat
  const targetMap = autoPairTargets(participants);

  // Helper to determine the spotlight participant (PC or GM-controlled custom friendly NPC)
  const getSpotlightParticipant = (): Participant | null => {
    if (activeTurnParticipant && (activeTurnParticipant.isPC || activeTurnParticipant.manualControl || activeTurnParticipant.isCustomNPC)) {
      return activeTurnParticipant;
    }
    const pcOrManualAlly = orderedParticipants.find(p => (p.isPC || p.manualControl || (p.isCustomNPC && p.affiliation === 'friendly_npc')) && p.hp > 0 && !p.dead);
    return pcOrManualAlly || activeTurnParticipant;
  };

  // Auto-generate round narrative when advancing round
  const prevRoundRef = useRef<number>(encounter.round);
  useEffect(() => {
    if (encounter.round > 1 && encounter.round !== prevRoundRef.current) {
      prevRoundRef.current = encounter.round;
      const lastRoundActions = combatActions.filter(a => a.round === encounter.round - 1);
      if (lastRoundActions.length > 0) {
        const recap = generateRoundNarrative(encounter.round - 1, lastRoundActions, selectedTone, getSpotlightParticipant());
        setCurrentRoundRecap(recap);
        setShowNarrationModal(true);
      }
    }
  }, [encounter.round, combatActions, selectedTone, activeTurnParticipant]);

  // Handle single manual attack from an attacker
  const handleAttackAction = (attacker: Participant, weapon: Weapon, customTarget?: Participant) => {
    const target = customTarget || targetMap.get(attacker.id);
    if (!target) {
      toast.error(`No target found for ${attacker.name}. Assign a target first!`);
      return;
    }

    // Check if target is a Player Character
    if (target.isPC || target.affiliation === 'player') {
      // Intercept with GM Review Dialog
      const attackerBonus = attacker.isGoon ? (attacker.combatNumber ?? 11) : (attacker.ref + 4);
      const atkD10 = rollD10Exploding();
      const totalAttack = atkD10.total + attackerBonus;

      // Initial PC Evasion roll (1d10 + DEX + Evasion)
      const defBonus = (target.dex ?? target.ref ?? 6) + (target.evasionSkill ?? 4);
      const defD10 = rollD10Exploding();
      const totalDefense = defD10.total + defBonus;

      const hit = totalAttack > totalDefense;

      // Preliminary damage calculation
      const rolled = rollDamage(weapon.system?.damage || '3d6');
      const dice = rolled.dice;
      const sum = rolled.total;
      const sixCount = rolled.sixCount;
      const isCrit = rolled.isCritical;
      const isTarotCrit = rolled.isTarotCrit;
      let critName: string | undefined;
      let critEffect: string | undefined;
      if (isCrit) {
        const crit = rollCriticalInjury('body');
        critName = crit.injury.name;
        critEffect = crit.injury.effect;
      }

      let tarotCard: { id?: string; name: string; number?: number; roman?: string; effect: string } | undefined;
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

      setPendingPCAttack({
        attacker,
        pcDefender: target,
        weapon,
        attackRoll: totalAttack,
        attackBreakdown: `d10(${atkD10.breakdown}) + Bonus(${attackerBonus}) = ${totalAttack}`,
        defenseRoll: totalDefense,
        defenseBreakdown: `d10(${defD10.breakdown}) + Bonus(${defBonus}) = ${totalDefense}`,
        damageRoll: sum,
        damageDice: dice,
        sixCount,
        isCritical: isCrit,
        isTarotCrit,
        tarotCard,
        criticalInjuryName: critName,
        criticalInjuryEffect: critEffect,
        hitLocation: 'body',
        hit,
        modifiedDamage: sum,
        overrideHit: hit
      });
      return;
    }

    // Target is an NPC: Resolve automatically with bullet dodging rule!
    const { action, updatedDefender } = resolveAttack({
      attacker,
      defender: target,
      weapon,
      round: Math.max(1, encounter.round)
    });

    // Update defender in state
    onUpdateParticipant(updatedDefender.id, updatedDefender);

    // Record action in combat log
    setCombatActions(prev => [action, ...prev]);

    // Show toast
    if (action.hit) {
      const critStr = action.isCritical ? ` 💥 CRIT! (${action.criticalInjuryName})` : '';
      const downStr = action.downed ? ' 💀 DOWNED!' : '';
      toast.success(`${attacker.name} hit ${target.name} for ${action.hpDamage} HP damage!${critStr}${downStr}`, {
        icon: <Crosshair className="w-5 h-5 text-primary" />
      });
    } else {
      toast.info(`${target.name} dodged ${attacker.name}'s attack! (Atk ${action.attackRoll} vs Evasion ${action.defenseRoll})`);
    }
  };

  // Confirm GM Review Attack against PC
  const handleConfirmPCAttack = () => {
    if (!pendingPCAttack) return;
    const { attacker, pcDefender, weapon, overrideHit, modifiedDamage, hitLocation, isCritical, criticalInjuryName, criticalInjuryEffect } = pendingPCAttack;

    if (!overrideHit) {
      toast.info(`${pcDefender.name} successfully dodged or deflected the attack!`);
      const action: CombatAction = {
        id: crypto.randomUUID(),
        round: Math.max(1, encounter.round),
        attackerId: attacker.id,
        attackerName: attacker.name,
        attackerAffiliation: attacker.affiliation || 'hostile_npc',
        defenderId: pcDefender.id,
        defenderName: pcDefender.name,
        defenderAffiliation: 'player',
        weaponName: weapon.name,
        damageFormula: weapon.system?.damage || '3d6',
        attackRoll: pendingPCAttack.attackRoll,
        attackBreakdown: pendingPCAttack.attackBreakdown,
        defenseType: 'dodge',
        defenseRoll: pendingPCAttack.defenseRoll,
        defenseBreakdown: pendingPCAttack.defenseBreakdown,
        hit: false,
        hitLocation,
        damageRoll: 0,
        damageDice: [],
        isCritical: false,
        spBefore: hitLocation === 'head' ? (pcDefender.armor?.head ?? 0) : (pcDefender.armor?.body ?? 0),
        spAbsorbed: 0,
        spAfter: hitLocation === 'head' ? (pcDefender.armor?.head ?? 0) : (pcDefender.armor?.body ?? 0),
        hpDamage: 0,
        hpBefore: pcDefender.hp,
        hpAfter: pcDefender.hp,
        woundStateAfter: pcDefender.woundState,
        downed: false,
        timestamp: new Date().toLocaleTimeString()
      };
      setCombatActions(prev => [action, ...prev]);
      setPendingPCAttack(null);
      return;
    }

    // Hit confirmed: Apply Armor SP reduction & ablation
    const currentArmor = pcDefender.armor || { head: 0, body: 0 };
    const currentSP = hitLocation === 'head' ? (currentArmor.head ?? 0) : (currentArmor.body ?? 0);
    const spAbsorbed = Math.min(modifiedDamage, currentSP);
    let hpDamage = Math.max(0, modifiedDamage - currentSP);

    if (isCritical) {
      hpDamage += 5;
    }

    let spAfter = currentSP;
    if (hpDamage > 0 && currentSP > 0) {
      spAfter = Math.max(0, currentSP - 1);
    }

    const hpAfter = Math.max(0, pcDefender.hp - hpDamage);
    const updatedArmor = {
      ...currentArmor,
      head: hitLocation === 'head' ? spAfter : currentArmor.head,
      body: hitLocation === 'body' ? spAfter : currentArmor.body
    };
    const woundState = getWoundState(hpAfter, pcDefender.maxHp);
    const downed = hpAfter <= 0;

    const updatedPC: Participant = {
      ...pcDefender,
      hp: hpAfter,
      armor: updatedArmor,
      woundState,
      dead: downed
    };

    onUpdateParticipant(pcDefender.id, updatedPC);

    const action: CombatAction = {
      id: crypto.randomUUID(),
      round: Math.max(1, encounter.round),
      attackerId: attacker.id,
      attackerName: attacker.name,
      attackerAffiliation: attacker.affiliation || 'hostile_npc',
      defenderId: pcDefender.id,
      defenderName: pcDefender.name,
      defenderAffiliation: 'player',
      weaponName: weapon.name,
      damageFormula: weapon.system?.damage || '3d6',
      attackRoll: pendingPCAttack.attackRoll,
      attackBreakdown: pendingPCAttack.attackBreakdown,
      defenseType: 'dodge',
      defenseRoll: pendingPCAttack.defenseRoll,
      defenseBreakdown: pendingPCAttack.defenseBreakdown,
      hit: true,
      hitLocation,
      damageRoll: modifiedDamage,
      damageDice: pendingPCAttack.damageDice,
      isCritical,
      criticalInjuryName,
      criticalInjuryEffect,
      spBefore: currentSP,
      spAbsorbed,
      spAfter,
      hpDamage,
      hpBefore: pcDefender.hp,
      hpAfter,
      woundStateAfter: woundState,
      downed,
      timestamp: new Date().toLocaleTimeString()
    };

    setCombatActions(prev => [action, ...prev]);
    toast.success(`Damage applied to ${pcDefender.name}: -${hpDamage} HP (Armor ablated to ${spAfter})`);
    setPendingPCAttack(null);
  };

  // Auto-resolve all generic NPC vs NPC combat in one batch
  // Custom-made NPCs and participants with manualControl are EXCLUDED from auto-resolution so GM retains 100% control
  const handleAutoResolveNPCCombat = () => {
    const activeNPCs = participants.filter(
      p => !p.isPC && !p.isCustomNPC && !p.manualControl && p.hp > 0 && !p.dead && canAct(p.woundState)
    );
    if (activeNPCs.length === 0) {
      toast.info('No generic auto-combat NPCs available. (Custom NPCs remain under GM manual control).');
      return;
    }

    let resolvedCount = 0;
    const currentParticipantsMap = new Map(participants.map(p => [p.id, p]));
    const batchActions: CombatAction[] = [];

    activeNPCs.forEach(attacker => {
      const weapon = attacker.weapons && attacker.weapons.length > 0 ? attacker.weapons[0] : null;
      if (!weapon) return;

      const target = targetMap.get(attacker.id);
      // Only auto-resolve if target is another generic NPC (Friendly vs Hostile)!
      // Never auto-target PCs or GM-controlled custom friendly NPCs
      if (!target || target.isPC || target.manualControl || (target.isCustomNPC && target.affiliation === 'friendly_npc') || target.hp <= 0) return;

      const currentDefender = currentParticipantsMap.get(target.id) || target;
      if (currentDefender.hp <= 0) return;

      const { action, updatedDefender } = resolveAttack({
        attacker,
        defender: currentDefender,
        weapon,
        round: Math.max(1, encounter.round)
      });

      currentParticipantsMap.set(updatedDefender.id, updatedDefender);
      batchActions.push(action);
      resolvedCount++;
    });

    if (resolvedCount === 0) {
      toast.info('No valid generic NPC vs NPC targets found. (Hostiles may be targeting PCs or GM-controlled allies).');
      return;
    }

    // Apply all updated defender participants
    currentParticipantsMap.forEach((updated, id) => {
      onUpdateParticipant(id, updated);
    });

    setCombatActions(prev => [...batchActions, ...prev]);

    // Generate cinematic round narrative immediately with GM initiative spotlight handoff!
    const recap = generateRoundNarrative(Math.max(1, encounter.round), batchActions, selectedTone, getSpotlightParticipant());
    setCurrentRoundRecap(recap);

    toast.success(`⚡ Auto-resolved ${resolvedCount} generic NPC combat actions with bullet dodging!`, {
      icon: <Sparkles className="w-5 h-5 text-primary" />
    });
  };

  // Detonate / Throw Ordnance (Grenade, Rocket, Explosive)
  const handleUseOrdnance = (attacker: Participant, ordnanceItem: OrdnanceItem) => {
    const target = targetMap.get(attacker.id);
    if (!target) {
      toast.error(`No target assigned for ${attacker.name}.`);
      return;
    }

    const damageFormula = ordnanceItem.damage || '6d6';
    const rolled = rollDamage(damageFormula);
    const isCrit = rolled.isCritical;
    const isTarotCrit = rolled.isTarotCrit;

    // Explosives in Cyberpunk RED ablate 2 SP on penetrating damage
    const currentArmor = target.armor || { head: 0, body: 0 };
    const currentSP = currentArmor.body ?? 0;
    const spAbsorbed = Math.min(rolled.total, currentSP);
    let hpDamage = Math.max(0, rolled.total - currentSP);
    if (isCrit) hpDamage += 5;

    let spAfter = currentSP;
    if (hpDamage > 0 && currentSP > 0) {
      spAfter = Math.max(0, currentSP - 2); // Explosives ablate 2 SP!
    }

    const hpAfter = Math.max(0, target.hp - hpDamage);
    const woundState = getWoundState(hpAfter, target.maxHp);
    const downed = hpAfter <= 0;

    const updatedDefender: Participant = {
      ...target,
      hp: hpAfter,
      armor: {
        ...currentArmor,
        body: spAfter
      },
      woundState,
      dead: downed
    };

    onUpdateParticipant(target.id, updatedDefender);

    // Update attacker ordnance quantity
    const updatedOrdnance = (attacker.ordinance || [])
      .map(o => o.name === ordnanceItem.name ? { ...o, count: o.count - 1 } : o)
      .filter(o => o.count > 0);
    onUpdateParticipant(attacker.id, { ordinance: updatedOrdnance });

    let critInjuryName: string | undefined;
    if (isCrit) {
      const crit = rollCriticalInjury('body');
      critInjuryName = crit.injury.name;
    }

    let tarotCard: { id?: string; name: string; number?: number; roman?: string; effect: string } | undefined;
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

    const action: CombatAction = {
      id: crypto.randomUUID(),
      round: Math.max(1, encounter.round),
      attackerId: attacker.id,
      attackerName: attacker.name,
      attackerAffiliation: attacker.affiliation || 'hostile_npc',
      defenderId: target.id,
      defenderName: target.name,
      defenderAffiliation: target.affiliation || 'hostile_npc',
      weaponName: `💣 ${ordnanceItem.name}`,
      damageFormula,
      attackRoll: 15,
      attackBreakdown: 'Thrown Ordnance Blast (DV 15)',
      defenseType: 'dodge',
      defenseRoll: target.dex ?? 6,
      defenseBreakdown: 'Blast Avoidance',
      hit: true,
      hitLocation: 'body',
      damageRoll: rolled.total,
      damageDice: rolled.dice,
      isCritical: isCrit,
      isTarotCrit,
      tarotCard,
      criticalInjuryName: critInjuryName,
      spBefore: currentSP,
      spAbsorbed,
      spAfter,
      hpDamage,
      hpBefore: target.hp,
      hpAfter,
      woundStateAfter: woundState,
      downed,
      timestamp: new Date().toLocaleTimeString()
    };

    setCombatActions(prev => [action, ...prev]);
    toast.success(`💣 ${attacker.name} threw ${ordnanceItem.name} at ${target.name}! -${hpDamage} HP (SP ablated -2 to ${spAfter})`, {
      icon: <Flame className="w-5 h-5 text-warning" />
    });
  };

  // Generate or regenerate narration
  const handleGenerateNarration = () => {
    const roundActions = combatActions.filter(a => a.round === Math.max(1, encounter.round));
    const recap = generateRoundNarrative(
      Math.max(1, encounter.round), 
      roundActions.length > 0 ? roundActions : combatActions.slice(0, 8), 
      selectedTone,
      getSpotlightParticipant()
    );
    setCurrentRoundRecap(recap);
    setShowNarrationModal(true);
  };

  const handleCopyNarration = () => {
    if (currentRoundRecap) {
      navigator.clipboard.writeText(currentRoundRecap.narrative);
      setCopiedNarration(true);
      toast.success('Cinematic combat narrative copied to clipboard!');
      setTimeout(() => setCopiedNarration(false), 2000);
    }
  };

  // Inline PC initiative update
  const handleUpdateInitiative = (id: string, value: number) => {
    onUpdateParticipant(id, { total: value, rolled: value });
  };

  // Adjust participant HP
  const handleAdjustHP = (p: Participant, amount: number) => {
    const newHP = Math.max(0, Math.min(p.maxHp, p.hp + amount));
    const woundState = getWoundState(newHP, p.maxHp);
    onUpdateParticipant(p.id, {
      hp: newHP,
      woundState,
      dead: newHP <= 0
    });
  };

  // Adjust participant SP
  const handleAdjustSP = (p: Participant, location: 'head' | 'body', amount: number) => {
    const armor = p.armor || { head: 0, body: 0 };
    const current = location === 'head' ? (armor.head ?? 0) : (armor.body ?? 0);
    const updatedSP = Math.max(0, current + amount);
    onUpdateParticipant(p.id, {
      armor: {
        ...armor,
        [location]: updatedSP
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* TOP CONTROL BAR: Round, Turn, and Auto-Combat Commands */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-card via-card/70 to-primary/10 border-2 border-primary/30 backdrop-blur-md shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Round & Encounter status */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center p-3 px-4 rounded-xl bg-primary/20 border border-primary/30 text-primary">
            <span className="text-[10px] font-mono uppercase tracking-widest block text-muted-foreground font-bold">ROUND</span>
            <span className="text-3xl font-black font-mono leading-none">{encounter.round}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black uppercase tracking-wide text-foreground">
                Encounter Tracker
              </h2>
              <span className={`px-2.5 py-0.5 text-xs font-bold font-mono rounded-full border ${
                encounter.active 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse' 
                  : 'bg-muted text-muted-foreground border-border'
              }`}>
                {encounter.active ? 'ACTIVE COMBAT' : 'STANDBY'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {participants.length} combatants ({participants.filter(p => p.isPC).length} PCs, {participants.filter(p => !p.isPC && p.affiliation === 'friendly_npc').length} Friendly NPCs, {participants.filter(p => !p.isPC && p.affiliation !== 'friendly_npc').length} Hostiles)
            </p>
          </div>
        </div>

        {/* Center & Right: High-Impact Automation Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto justify-end">
          {/* Roll All NPC Initiative Button */}
          <Button
            onClick={onRollAllNPCs}
            className="cyber-btn bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-mono text-xs"
            title="Rolls 1d10 + REF + Init for all NPCs. PCs enter manually inline."
          >
            <Dices className="w-4 h-4 mr-1.5" />
            Roll NPC Initiatives
          </Button>

          {/* Auto-Resolve NPC vs NPC Combat Button */}
          <Button
            onClick={handleAutoResolveNPCCombat}
            disabled={!encounter.active}
            className="cyber-btn bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-md shadow-primary/20"
            title="Auto-resolves all Friendly vs Hostile NPC attacks with bullet dodging & damage!"
          >
            <Swords className="w-4 h-4 mr-1.5" />
            Auto-Resolve NPC vs NPC
          </Button>

          {/* Cinematic Round Narration Button */}
          <Button
            onClick={handleGenerateNarration}
            variant="outline"
            className="cyber-btn border-border/80 hover:border-primary text-xs"
            title="View or regenerate the cinematic action sequence recap for this round."
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-warning" />
            Round Narration
          </Button>

          {/* Encounter Lifecycle */}
          {!encounter.active ? (
            <Button
              onClick={onStartEncounter}
              className="cyber-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              <Play className="w-4 h-4 mr-1.5" />
              Start Combat
            </Button>
          ) : (
            <>
              <Button
                onClick={onNextTurn}
                className="cyber-btn bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
              >
                <ArrowRight className="w-4 h-4 mr-1.5" />
                Next Turn
              </Button>
              <Button
                onClick={onEndEncounter}
                variant="outline"
                className="cyber-btn border-destructive/40 hover:bg-destructive/20 text-destructive text-xs"
              >
                End Combat
              </Button>
            </>
          )}

          {/* Range DVs Reference Modal */}
          <RangeDVReferenceModal />

          {/* Saved Encounters Button */}
          <Button
            onClick={() => setShowSavedModal(true)}
            variant="outline"
            className="cyber-btn border-border text-xs"
            title="Manage Saved Encounters"
          >
            <FolderOpen className="w-3.5 h-3.5 mr-1" />
            Saved ({savedEncounters.length})
          </Button>

          {/* Save Encounter Button */}
          <Button
            onClick={onSaveEncounter}
            variant="outline"
            className="cyber-btn border-border text-xs"
            title="Save Current Encounter"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            Save
          </Button>

          {/* Quick Add Button */}
          <Button
            onClick={() => setShowQuickAdd(true)}
            variant="ghost"
            size="sm"
            className="cyber-btn text-xs"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* QUICK INITIATIVE HELPER BANNER */}
      <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-secondary/30 border border-border text-xs text-muted-foreground font-mono">
        <span className="flex items-center gap-2">
          <Dices className="w-4 h-4 text-primary" />
          <strong className="text-foreground">Turn Order Tip:</strong> Click "Roll NPC Initiatives" to auto-roll all foes/allies. Type your Players' rolls directly into the <span className="text-primary font-bold">INIT</span> box on their card.
        </span>
        <div className="flex items-center gap-3">
          {onRollAllWithPCs && (
            <button
              onClick={onRollAllWithPCs}
              className="hover:text-foreground text-[11px] underline cursor-pointer"
            >
              Roll All (inc PCs)
            </button>
          )}
          <button
            onClick={onClearRolls}
            className="hover:text-foreground text-[11px] underline cursor-pointer"
          >
            Clear All Rolls
          </button>
        </div>
      </div>

      {/* PARTICIPANT CARDS LIST (ORDERED BY INITIATIVE) */}
      <div className="space-y-3">
        {orderedParticipants.map((p, index) => {
          const isTurn = activeTurnParticipant?.id === p.id;
          const affiliation = p.affiliation || (p.isPC ? 'player' : 'hostile_npc');

          const borderColor = 
            isTurn ? 'border-primary shadow-lg shadow-primary/20 bg-primary/5' :
            affiliation === 'player' ? 'border-emerald-500/40 bg-emerald-950/10' :
            affiliation === 'friendly_npc' ? 'border-blue-500/40 bg-blue-950/10' :
            'border-rose-500/30 bg-card';

          const badgeColor =
            affiliation === 'player' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
            affiliation === 'friendly_npc' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
            'bg-rose-500/20 text-rose-400 border-rose-500/30';

          const target = targetMap.get(p.id);

          return (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border-2 transition-all backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${borderColor}`}
            >
              {/* Turn indicator accent */}
              {isTurn && (
                <div className="absolute top-0 left-0 w-2 h-full bg-primary animate-pulse" />
              )}

              {/* Left Column: Turn rank, Initiative Input, Character Identity */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-secondary/50 font-mono text-xs font-bold text-muted-foreground">
                  #{index + 1}
                </div>

                {/* Inline Initiative Input */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono uppercase text-muted-foreground font-bold">INIT</span>
                  <Input
                    type="number"
                    value={p.total ?? ''}
                    onChange={e => handleUpdateInitiative(p.id, parseInt(e.target.value) || 0)}
                    placeholder="--"
                    className={`cyber-input w-14 h-9 text-center font-mono font-black text-sm ${
                      p.isPC ? 'border-emerald-500/60 text-emerald-400 bg-emerald-950/20' : 'text-primary'
                    }`}
                  />
                </div>

                {/* Name & Badges */}
                <div className="pl-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-base text-foreground">
                      {p.name}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md border ${badgeColor}`}>
                      {affiliation.replace('_', ' ')}
                    </span>
                    {(p.manualControl || (p.isCustomNPC && p.affiliation === 'friendly_npc')) && (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40" title="GM has exclusive manual control over movesets and actions (excluded from auto-combat)">
                        GM Controlled
                      </span>
                    )}
                    {p.ammoType && p.ammoType !== 'Basic' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-primary/20 text-primary border border-primary/40 flex items-center gap-1" title={`Equipped Ammo: ${p.ammoType}`}>
                        <Zap className="w-2.5 h-2.5" />
                        {p.ammoType}
                      </span>
                    )}
                    {p.combatStyle && p.combatStyle !== 'balanced' && (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground uppercase border border-border/50 rounded">
                        {p.combatStyle.replace('_', ' ')}
                      </span>
                    )}
                    {p.woundState !== 'not-wounded' && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {p.woundState.replace('-', ' ')}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2 font-mono mt-1 flex-wrap">
                    {!p.isPC && p.affiliation !== 'player' ? (
                      <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-md text-foreground" title="Single Stat Number that derives all modifiers (Attacks, Evasion, Contests)">
                        <span className="text-[10px] font-black uppercase text-primary tracking-wider">Stat #</span>
                        <span className="font-mono font-black text-xs text-primary">{getNPCStatNumber(p)}</span>
                        <div className="flex items-center gap-0.5 ml-1 border-l border-primary/30 pl-1">
                          <button
                            type="button"
                            onClick={() => {
                              const cur = getNPCStatNumber(p);
                              onUpdateParticipant(p.id, { combatNumber: cur + 1, ref: cur + 1, dex: cur + 1 });
                            }}
                            className="w-4 h-3.5 flex items-center justify-center text-[10px] bg-secondary hover:bg-primary/30 rounded text-foreground font-bold cursor-pointer"
                            title="Increase Stat Number (+1 to all checks)"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = getNPCStatNumber(p);
                              const next = Math.max(1, cur - 1);
                              onUpdateParticipant(p.id, { combatNumber: next, ref: next, dex: next });
                            }}
                            className="w-4 h-3.5 flex items-center justify-center text-[10px] bg-secondary hover:bg-destructive/30 rounded text-foreground font-bold cursor-pointer"
                            title="Decrease Stat Number (-1 to all checks)"
                          >
                            -
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span>REF {p.ref} | DEX {p.dex ?? p.ref}</span>
                    )}
                    <span>•</span>
                    <span>Init Skill +{p.initiativeSkill}</span>
                  </div>

                  {p.cyberware && p.cyberware.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mt-1">
                      <span className="text-[9px] font-mono text-purple-400 font-bold uppercase">CW:</span>
                      {p.cyberware.slice(0, 3).map((cw, cidx) => (
                        <span
                          key={cw._id || cidx}
                          className="px-1.5 py-0.2 text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded"
                          title={cw.name}
                        >
                          {cw.name}
                        </span>
                      ))}
                      {p.cyberware.length > 3 && (
                        <span className="text-[9px] font-mono text-purple-400 font-bold">+{p.cyberware.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Middle Column: HP & Armor Trackers with +/- Buttons */}
              <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
                {/* HP Tracker */}
                <div className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-xl bg-secondary/30 border border-border">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <div className="text-center min-w-[54px]">
                    <span className="text-[9px] font-mono uppercase text-muted-foreground block leading-tight">HP</span>
                    <span className="font-mono font-black text-sm text-rose-400">
                      {p.hp}/{p.maxHp}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 ml-1">
                    <button
                      onClick={() => handleAdjustHP(p, 1)}
                      className="w-5 h-4 flex items-center justify-center text-[10px] bg-secondary hover:bg-primary/30 rounded text-foreground font-bold cursor-pointer"
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleAdjustHP(p, -1)}
                      className="w-5 h-4 flex items-center justify-center text-[10px] bg-secondary hover:bg-destructive/30 rounded text-foreground font-bold cursor-pointer"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Armor SP Head */}
                <div className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-xl bg-secondary/30 border border-border">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <div className="text-center min-w-[42px]">
                    <span className="text-[9px] font-mono uppercase text-muted-foreground block leading-tight">HEAD</span>
                    <span className="font-mono font-black text-sm text-cyan-400">
                      {p.armor?.head ?? 0}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 ml-1">
                    <button
                      onClick={() => handleAdjustSP(p, 'head', 1)}
                      className="w-5 h-4 flex items-center justify-center text-[10px] bg-secondary hover:bg-cyan-400/30 rounded text-foreground font-bold cursor-pointer"
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleAdjustSP(p, 'head', -1)}
                      className="w-5 h-4 flex items-center justify-center text-[10px] bg-secondary hover:bg-destructive/30 rounded text-foreground font-bold cursor-pointer"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Armor SP Body */}
                <div className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-xl bg-secondary/30 border border-border">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <div className="text-center min-w-[42px]">
                    <span className="text-[9px] font-mono uppercase text-muted-foreground block leading-tight">BODY</span>
                    <span className="font-mono font-black text-sm text-cyan-400">
                      {p.armor?.body ?? 0}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 ml-1">
                    <button
                      onClick={() => handleAdjustSP(p, 'body', 1)}
                      className="w-5 h-4 flex items-center justify-center text-[10px] bg-secondary hover:bg-cyan-400/30 rounded text-foreground font-bold cursor-pointer"
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleAdjustSP(p, 'body', -1)}
                      className="w-5 h-4 flex items-center justify-center text-[10px] bg-secondary hover:bg-destructive/30 rounded text-foreground font-bold cursor-pointer"
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Weapon Attacks & Target Assignment */}
              <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto">
                {/* Target Selector */}
                <div className="flex items-center gap-1">
                  <Crosshair className="w-3.5 h-3.5 text-muted-foreground" />
                  <select
                    value={p.targetId || (target?.id ?? '')}
                    onChange={e => onUpdateParticipant(p.id, { targetId: e.target.value })}
                    className="cyber-input text-xs h-8 max-w-[130px] truncate bg-background border-border"
                    title="Target combatant"
                  >
                    <option value="">Auto-Target</option>
                    {participants
                      .filter(other => other.id !== p.id && !other.dead && other.hp > 0)
                      .map(other => (
                        <option key={other.id} value={other.id}>
                          {other.name} ({other.affiliation === 'player' ? 'PC' : other.affiliation === 'friendly_npc' ? 'Ally' : 'Foe'})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Oppose / Contest Any Player Check Button */}
                {!p.isPC && p.affiliation !== 'player' && (
                  <Button
                    size="sm"
                    disabled={p.hp <= 0}
                    onClick={() => handleTriggerContest(p)}
                    className="cyber-btn text-xs px-2.5 h-8 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-mono flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
                    title={`Oppose or contest any player check using Stat #${getNPCStatNumber(p)}`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>OPPOSE</span>
                  </Button>
                )}

                {/* Weapons Attack Action Buttons with Normalized Category & Range DV Access */}
                {p.weapons && p.weapons.length > 0 ? (
                  p.weapons.slice(0, 2).map((weapon, widx) => (
                    <div key={widx} className="flex items-center gap-1">
                      <Button
                        size="sm"
                        disabled={p.hp <= 0}
                        onClick={() => handleAttackAction(p, weapon)}
                        className="cyber-btn text-xs px-2 h-8 bg-secondary/80 hover:bg-primary/20 hover:text-primary border border-border font-mono flex items-center gap-1"
                        title={`Attack with ${weapon.name} (${weapon.system.damage})`}
                      >
                        <Swords className="w-3.5 h-3.5 text-primary" />
                        <span>ATK</span>
                      </Button>
                      <WeaponQuickBadge
                        weapon={weapon}
                        onAttackClick={() => handleAttackAction(p, weapon)}
                      />
                    </div>
                  ))
                ) : (
                  <Button
                    size="sm"
                    disabled={p.hp <= 0}
                    onClick={() => handleAttackAction(p, {
                      _id: 'unarmed',
                      name: 'Brawl',
                      system: { damage: '1d6', weaponSkill: 'Brawling' }
                    })}
                    className="cyber-btn text-xs h-8"
                  >
                    Brawl (1d6)
                  </Button>
                )}

                {/* Equipped Ordnance / Explosives Throw Action */}
                {p.ordinance && p.ordinance.length > 0 && p.ordinance.map((ord, ordIdx) => (
                  <Button
                    key={ordIdx}
                    size="sm"
                    disabled={p.hp <= 0 || ord.count <= 0}
                    onClick={() => handleUseOrdnance(p, ord)}
                    className="cyber-btn text-xs px-2 h-8 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-mono flex items-center gap-1 shadow-sm cursor-pointer"
                    title={`Detonate / Throw ${ord.name} (${ord.damage}) - ${ord.count} remaining (Ablates 2 SP on penetrating)`}
                  >
                    <Bomb className="w-3.5 h-3.5 text-rose-400" />
                    <span className="truncate max-w-[80px]">
                      {ord.name.replace('Grenade (', '').replace('Rocket (', '').replace(')', '')}
                    </span>
                    <span className="px-1 rounded bg-rose-500/20 text-rose-200 text-[10px] font-bold">
                      x{ord.count}
                    </span>
                  </Button>
                ))}

                {/* Remove button */}
                <button
                  onClick={() => onRemoveParticipant(p.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  title="Remove from encounter"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {participants.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-border/60 rounded-2xl bg-card/20">
            <Skull className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-1">No Combatants in Encounter</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
              Go to the <strong>Party Manager</strong> to deploy your players, or open the <strong>NPC & Squad Spawner</strong> to spawn goons, Arasaka sentries, or Tyger Claws!
            </p>
          </div>
        )}
      </div>

      {/* GM REVIEW INTERCEPT MODAL (TRIGGERED WHEN NPC TARGETS A PC) */}
      {pendingPCAttack && (
        <Dialog open={!!pendingPCAttack} onOpenChange={open => { if (!open) setPendingPCAttack(null); }}>
          <DialogContent className="max-w-xl bg-card border-2 border-primary/50 shadow-2xl backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-wide text-primary flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-warning animate-bounce" />
                GM COMBAT REVIEW: Attack Targeting Player
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Threat Summary */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
                <div className="text-sm font-bold text-foreground flex items-center justify-between">
                  <span>{pendingPCAttack.attacker.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">VS</span>
                  <span className="text-primary font-black">{pendingPCAttack.pcDefender.name}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-1">
                  <span>
                    Weapon: <strong className="text-foreground">{pendingPCAttack.weapon.name}</strong>{' '}
                    <span className="text-primary font-mono font-bold">
                      [{formatWeaponCategory(pendingPCAttack.weapon)}]
                    </span>{' '}
                    ({pendingPCAttack.weapon.system?.damage})
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    ROF: {pendingPCAttack.weapon.system?.rof ?? 1}
                  </span>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <WeaponRangeChart weapon={pendingPCAttack.weapon} compact />
                </div>
              </div>

              {/* Attack vs Defense Rolls */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-secondary/20 border border-border">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Attacker Roll</span>
                  <div className="text-2xl font-black font-mono text-foreground mt-1">
                    {pendingPCAttack.attackRoll}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {pendingPCAttack.attackBreakdown}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-secondary/20 border border-border">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">PC Evasion Check</span>
                  <div className="text-2xl font-black font-mono text-foreground mt-1">
                    {pendingPCAttack.defenseRoll}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {pendingPCAttack.defenseBreakdown}
                  </span>
                </div>
              </div>

              {/* Hit Status & Critical Injury */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                pendingPCAttack.overrideHit 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}>
                <div className="flex items-center gap-2">
                  {pendingPCAttack.overrideHit ? (
                    <Flame className="w-5 h-5 text-rose-500" />
                  ) : (
                    <Shield className="w-5 h-5 text-emerald-500" />
                  )}
                  <div>
                    <span className="font-bold text-sm">
                      {pendingPCAttack.overrideHit ? 'ATTACK HITS PC' : 'PC DODGED / EVADED'}
                    </span>
                    {pendingPCAttack.isCritical && pendingPCAttack.overrideHit && (
                      <span className="text-xs text-warning block font-mono">
                        {pendingPCAttack.isTarotCrit 
                          ? `🎴 NIGHT CITY TAROT CRIT (${pendingPCAttack.sixCount}x 6s rolled!)` 
                          : `💥 CRITICAL INJURY: ${pendingPCAttack.criticalInjuryName} (+5 direct HP damage!)`}
                      </span>
                    )}
                  </div>
                </div>

                {/* GM Override Hit Toggle */}
                <button
                  onClick={() => setPendingPCAttack(prev => prev ? ({ ...prev, overrideHit: !prev.overrideHit }) : null)}
                  className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-xs font-mono font-bold text-foreground border border-border cursor-pointer"
                >
                  Toggle Hit / Dodge
                </button>
              </div>

              {/* Night City Tarot Drawn Card Display (3+ Sixes) */}
              {pendingPCAttack.overrideHit && pendingPCAttack.isTarotCrit && pendingPCAttack.tarotCard && (
                <div className="p-3.5 rounded-xl bg-primary/10 border-2 border-primary/40 space-y-1.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-primary flex items-center gap-1.5 font-mono">
                      <Sparkles className="w-4 h-4 text-warning" />
                      Night City Tarot Drawn: {pendingPCAttack.tarotCard.name} ({pendingPCAttack.tarotCard.roman})
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/50">
                      {pendingPCAttack.sixCount}x SIXES
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 font-sans leading-relaxed">
                    {pendingPCAttack.tarotCard.effect}
                  </p>
                </div>
              )}

              {/* Damage & Location Review */}
              {pendingPCAttack.overrideHit && (
                <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">
                        Damage Dice:
                      </label>
                      <div className="flex items-center gap-1">
                        {pendingPCAttack.damageDice.map((d, i) => (
                          <span
                            key={i}
                            className={`w-6 h-6 flex items-center justify-center rounded font-mono text-xs font-bold border ${
                              d === 6 ? 'bg-amber-500/30 border-amber-500 text-amber-300' : 'bg-secondary/40 border-border text-foreground'
                            }`}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                      {typeof pendingPCAttack.sixCount === 'number' && pendingPCAttack.sixCount > 0 && (
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          pendingPCAttack.sixCount >= 3 
                            ? 'bg-primary/20 text-primary border-primary/50' 
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {pendingPCAttack.sixCount}x [6]s
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Hit Location:</span>
                      <select
                        value={pendingPCAttack.hitLocation}
                        onChange={e => setPendingPCAttack(prev => prev ? ({ ...prev, hitLocation: e.target.value as 'head' | 'body' }) : null)}
                        className="cyber-input text-xs h-7 bg-background border-border"
                      >
                        <option value="body">Body (SP {pendingPCAttack.pcDefender.armor?.body ?? 0})</option>
                        <option value="head">Head (SP {pendingPCAttack.pcDefender.armor?.head ?? 0}) - x2 Dmg</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={pendingPCAttack.modifiedDamage}
                      onChange={e => setPendingPCAttack(prev => prev ? ({ ...prev, modifiedDamage: parseInt(e.target.value) || 0 }) : null)}
                      className="cyber-input font-mono font-black text-xl text-primary w-28 text-center"
                    />
                    <div className="text-xs text-muted-foreground">
                      Target SP will absorb damage first. Any penetrating damage reduces HP and ablates SP by 1.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setPendingPCAttack(null)}
                className="cyber-btn text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPCAttack}
                className="cyber-btn bg-primary text-primary-foreground font-bold text-xs"
              >
                <Check className="w-4 h-4 mr-1.5" />
                {pendingPCAttack.overrideHit ? 'Confirm & Apply Damage' : 'Record Dodge / Miss'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* OPPOSED / CONTEST CHECK RESOLVER MODAL */}
      {activeContest && (
        <Dialog open={!!activeContest} onOpenChange={open => !open && setActiveContest(null)}>
          <DialogContent className="max-w-lg bg-card border-2 border-amber-500/50 shadow-2xl backdrop-blur-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-black tracking-wider uppercase text-amber-400 flex items-center gap-2 font-mono">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  Opposed Check vs Player
                </DialogTitle>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {activeContest.npc.name} (Stat #{activeContest.statNumber})
                </span>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Contest Skill / Context Selector */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1.5">
                  Contest Type / Check Context
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Perception vs Stealth',
                    'Athletics / Grapple',
                    'Brawling / Melee',
                    'Social / Interrogation',
                    'Cybertech / Interface',
                    'General Opposed Check'
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setActiveContest(prev => prev ? ({ ...prev, contestName: preset }) : null)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                        activeContest.contestName === preset
                          ? 'bg-amber-500 text-black font-black border-amber-400 shadow-sm'
                          : 'bg-secondary/40 hover:bg-secondary text-muted-foreground border-border'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Side-by-Side: NPC Opposed Roll vs Player Input */}
              <div className="grid grid-cols-2 gap-3">
                {/* NPC Roll Box */}
                <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-400 block tracking-wider">
                    {activeContest.npc.name} Roll
                  </span>
                  <div className="text-4xl font-black font-mono text-amber-300 leading-tight">
                    {activeContest.npcTotal}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    1d10 ({activeContest.d10Result.breakdown}) + Stat#({activeContest.statNumber})
                  </div>
                  {activeContest.d10Result.baseRoll === 10 && (
                    <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ⚡ Natural 10 Exploded!
                    </span>
                  )}
                  {activeContest.d10Result.baseRoll === 1 && (
                    <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      💥 Natural 1 Botched!
                    </span>
                  )}
                </div>

                {/* Player Roll Box */}
                <div className="p-4 rounded-xl bg-secondary/30 border border-border text-center space-y-2 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block tracking-wider">
                    Player's Total Roll
                  </span>
                  <Input
                    type="number"
                    placeholder="Enter total..."
                    value={activeContest.playerRoll}
                    onChange={e => {
                      const val = e.target.value === '' ? '' : parseInt(e.target.value);
                      setActiveContest(prev => prev ? ({ ...prev, playerRoll: val }) : null);
                    }}
                    className="cyber-input font-mono font-black text-2xl text-center h-12 w-full text-foreground"
                    autoFocus
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Type what player rolled on their check
                  </span>
                </div>
              </div>

              {/* Outcome Comparison Banner */}
              {typeof activeContest.playerRoll === 'number' && (
                <div className={`p-3 rounded-xl border text-center font-bold text-sm flex items-center justify-center gap-2 ${
                  activeContest.npcTotal > activeContest.playerRoll
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : activeContest.playerRoll > activeContest.npcTotal
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                }`}>
                  {activeContest.npcTotal > activeContest.playerRoll ? (
                    <>
                      <span>🏆 NPC WINS CONTEST!</span>
                      <span className="font-mono text-xs font-normal">
                        ({activeContest.npcTotal} vs {activeContest.playerRoll}, beats player by {activeContest.npcTotal - activeContest.playerRoll})
                      </span>
                    </>
                  ) : activeContest.playerRoll > activeContest.npcTotal ? (
                    <>
                      <span>🛡️ PLAYER WINS CONTEST!</span>
                      <span className="font-mono text-xs font-normal">
                        ({activeContest.playerRoll} vs {activeContest.npcTotal}, beats NPC by {activeContest.playerRoll - activeContest.npcTotal})
                      </span>
                    </>
                  ) : (
                    <>
                      <span>🤝 TIE AT {activeContest.npcTotal}!</span>
                      <span className="font-mono text-xs font-normal">
                        (Defender / Existing status quo holds in CP:R)
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full gap-2">
              <Button
                variant="outline"
                onClick={handleRerollContest}
                className="cyber-btn text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
              >
                <Dices className="w-3.5 h-3.5 mr-1" />
                Re-Roll NPC (1d10)
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setActiveContest(null)}
                  className="cyber-btn text-xs"
                >
                  Close
                </Button>
                <Button
                  onClick={handleLogContestAction}
                  className="cyber-btn bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md"
                >
                  <Check className="w-3.5 h-3.5 mr-1 text-black" />
                  Record to Combat Log
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CINEMATIC ROUND ACTION RECAP MODAL */}
      {showNarrationModal && currentRoundRecap && (
        <Dialog open={showNarrationModal} onOpenChange={setShowNarrationModal}>
          <DialogContent className="max-w-2xl bg-card border-2 border-primary shadow-2xl backdrop-blur-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-black tracking-wider uppercase text-primary flex items-center gap-2 font-mono">
                  <Sparkles className="w-5 h-5 text-warning" />
                  Round {currentRoundRecap.round} Action Narration
                </DialogTitle>
                <div className="flex items-center gap-1 bg-secondary/40 p-1 rounded-lg border border-border">
                  {(['cyberpunk', 'high_octane', 'tactical'] as NarrativeTone[]).map(tone => (
                    <button
                      key={tone}
                      onClick={() => {
                        setSelectedTone(tone);
                        const recap = generateRoundNarrative(currentRoundRecap.round, currentRoundRecap.actions, tone, getSpotlightParticipant());
                        setCurrentRoundRecap(recap);
                      }}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        selectedTone === tone ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tone.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </DialogHeader>

            <div className="p-4 rounded-xl bg-secondary/20 border border-border max-h-[60vh] overflow-y-auto font-sans leading-relaxed text-sm text-foreground/90 whitespace-pre-line space-y-3">
              {currentRoundRecap.narrative}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <span className="text-[11px] text-muted-foreground font-mono">
                {currentRoundRecap.actions.length} combat engagements resolved
              </span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCopyNarration}
                  className="cyber-btn bg-primary text-primary-foreground font-bold text-xs"
                >
                  {copiedNarration ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copy Narration
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowNarrationModal(false)}
                  className="cyber-btn text-xs"
                >
                  Done
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* COMBAT ACTIONS HISTORY LOG */}
      {combatActions.length > 0 && (
        <div className="p-5 rounded-2xl bg-card/60 border border-border backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Combat Action Log ({combatActions.length})
            </h3>
            <button
              onClick={() => setCombatActions([])}
              className="text-[11px] text-muted-foreground hover:text-destructive underline cursor-pointer"
            >
              Clear Log
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {combatActions.slice(0, 15).map(act => (
              <div
                key={act.id}
                className="p-2.5 rounded-xl bg-secondary/20 border border-border text-xs flex items-center justify-between gap-3 font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">R{act.round}</span>
                  <span className="font-bold text-foreground">{act.attackerName}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-bold text-foreground">{act.defenderName}</span>
                  <span className="text-muted-foreground">({act.weaponName})</span>
                </div>

                <div className="flex items-center gap-2 text-right">
                  {act.hit ? (
                    <span className="text-rose-400 font-bold">
                      HIT (-{act.hpDamage} HP, SP {act.spAfter})
                      {act.isTarotCrit && act.tarotCard ? (
                        <span className="text-primary ml-1 font-bold">🎴 Tarot: {act.tarotCard.name}</span>
                      ) : act.isCritical ? (
                        <span className="text-warning ml-1 font-bold">💥 {act.criticalInjuryName}</span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-emerald-400">
                      EVADED (Atk {act.attackRoll} vs Def {act.defenseRoll})
                    </span>
                  )}
                  {act.downed && <span className="text-rose-500 font-black">💀 DOWN</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUICK ADD PARTICIPANT MODAL */}
      {showQuickAdd && (
        <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
          <DialogContent className="max-w-md bg-card border-2 border-primary/50 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black uppercase text-primary">
                Quick Add Combatant
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Name</label>
                <Input
                  value={quickAddName}
                  onChange={e => setQuickAddName(e.target.value)}
                  placeholder="e.g. Scavenger #1, Officer Miller"
                  className="cyber-input"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Affiliation / Side</label>
                <select
                  value={quickAddAffiliation}
                  onChange={e => setQuickAddAffiliation(e.target.value as Affiliation)}
                  className="cyber-input w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                >
                  <option value="hostile_npc">Hostile NPC (Enemy)</option>
                  <option value="friendly_npc">Friendly NPC (Allied with PCs)</option>
                  <option value="player">Player Character (PC)</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">REF</label>
                  <Input
                    type="number"
                    value={quickAddRef}
                    onChange={e => setQuickAddRef(parseInt(e.target.value) || 1)}
                    className="cyber-input font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">HP</label>
                  <Input
                    type="number"
                    value={quickAddHP}
                    onChange={e => setQuickAddHP(parseInt(e.target.value) || 1)}
                    className="cyber-input font-mono text-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">SP</label>
                  <Input
                    type="number"
                    value={quickAddSP}
                    onChange={e => setQuickAddSP(parseInt(e.target.value) || 0)}
                    className="cyber-input font-mono text-cyan-400"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowQuickAdd(false)} className="cyber-btn text-xs">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!quickAddName.trim()) {
                    toast.error('Name required');
                    return;
                  }
                  const isPC = quickAddAffiliation === 'player';
                  const p: Participant = {
                    id: crypto.randomUUID(),
                    name: quickAddName.trim(),
                    affiliation: quickAddAffiliation,
                    ref: quickAddRef,
                    dex: quickAddRef,
                    body: 6,
                    will: 6,
                    initiativeSkill: 0,
                    hp: quickAddHP,
                    maxHp: quickAddHP,
                    seriouslyWoundedThreshold: Math.ceil(quickAddHP / 2),
                    woundState: 'not-wounded',
                    dead: false,
                    isPC,
                    isGoon: !isPC,
                    combatNumber: quickAddRef + 4,
                    armor: {
                      head: quickAddSP,
                      body: quickAddSP,
                      maxHead: quickAddSP,
                      maxBody: quickAddSP
                    },
                    weapons: [{
                      _id: 'w-default',
                      name: 'Heavy Pistol',
                      system: { damage: '3d6', weaponSkill: 'Handgun' }
                    }]
                  };
                  onUpdateParticipant(p.id, p);
                  toast.success(`Added ${p.name} to encounter!`);
                  setQuickAddName('');
                  setShowQuickAdd(false);
                }}
                className="cyber-btn bg-primary text-primary-foreground font-bold text-xs"
              >
                Add Combatant
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* SAVED ENCOUNTERS MANAGEMENT MODAL */}
      {showSavedModal && (
        <Dialog open={showSavedModal} onOpenChange={setShowSavedModal}>
          <DialogContent className="max-w-xl bg-card border-2 border-primary/50 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-black uppercase text-primary flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  Saved Encounters ({savedEncounters.length})
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onExportEncounters}
                    className="cyber-btn text-xs"
                    title="Export encounters as JSON"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Export
                  </Button>
                  <label className="cyber-btn text-xs border border-border px-2.5 py-1 rounded-md hover:bg-secondary cursor-pointer flex items-center">
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Import
                    <input
                      type="file"
                      accept=".json"
                      onChange={onImportEncounters}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-3 max-h-80 overflow-y-auto">
              {savedEncounters.map(saved => (
                <div
                  key={saved.id}
                  className="p-3.5 rounded-xl bg-secondary/20 border border-border hover:border-primary/50 flex items-center justify-between gap-3 transition-colors"
                >
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{saved.name}</h4>
                    <span className="text-xs text-muted-foreground font-mono">
                      {saved.participants.length} combatants • {new Date(saved.savedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        onLoadEncounter(saved);
                        setShowSavedModal(false);
                      }}
                      className="cyber-btn bg-primary text-primary-foreground text-xs"
                    >
                      Load
                    </Button>
                    <button
                      onClick={() => onDeleteEncounter(saved.id)}
                      className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {savedEncounters.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  No saved encounters yet. Click "Save" on the top bar to save your current combat setup.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSavedModal(false)}
                className="cyber-btn text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
