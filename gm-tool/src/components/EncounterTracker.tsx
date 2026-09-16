import { useState, useRef, useEffect } from 'react';
import { 
  Play, Dices, Swords, Shield, Heart, Skull, 
  Crosshair, Sparkles, Copy, Check, AlertTriangle,
  Flame, Plus, Trash2, ArrowRight, ShieldAlert,
  Save, FolderOpen, Download, Upload,
  Bomb, Zap, RotateCcw, Maximize2, Minimize2, Users,
  ScrollText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  rollD10Exploding, resolveAttack, autoPairTargets, rollDamage, 
  rollCriticalInjury, getNPCStatNumber, applyPlayerDamageToDefender,
  retargetEnemiesForRound
} from '@/lib/combatEngine';
import { generateRoundNarrative } from '@/lib/narrativeEngine';
import type { NarrativeTone } from '@/lib/narrativeEngine';
import { getWoundState, canAct } from '@/lib/damage';
import { 
  WeaponQuickBadge, 
  RangeDVReferenceModal 
} from '@/components/WeaponRangeChart';
import { formatWeaponCategory, getWeaponRangeResolution } from '@/lib/weaponRanges';
import { drawRandomTarotCard } from '@/lib/tarot';
import type { 
  Participant, EncounterState, SavedEncounter, Weapon, 
  CombatAction, RoundRecap, Affiliation, OrdnanceItem
} from '@/types';

export interface PendingPCAttackItem {
  id: string;
  attacker: Participant;
  pcDefender: Participant;
  weapon: Weapon;
  attackRoll: number;
  attackBreakdown: string;
  rangeBands: Array<{ label: string; dv: number | null }>;
  selectedBandIndex: number;
  selectedDV: number | null;
  declaredEvade: boolean;
  evadeBonus: number;
  evadeBreakdown: string;
  evadeRoll: number | '';
  overrideHit: boolean;
  damageRoll: number;
  damageDice: number[];
  sixCount: number;
  isCritical: boolean;
  isTarotCrit: boolean;
  tarotCard?: { id?: string; name: string; number?: number; roman?: string; effect: string };
  criticalInjuryName?: string;
  criticalInjuryEffect?: string;
  hitLocation: 'head' | 'body';
  modifiedDamage: number;
}

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
  onClearAllCombatants?: () => void;
  onClearNPCsOnly?: () => void;
  onResetCombatState?: () => void;
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
  onImportEncounters,
  onClearAllCombatants,
  onClearNPCsOnly,
  onResetCombatState
}: EncounterTrackerProps) {
  // Combat history and narration state
  const [combatActions, setCombatActions] = useState<CombatAction[]>([]);
  const [currentRoundRecap, setCurrentRoundRecap] = useState<RoundRecap | null>(null);
  const [showNarrationModal, setShowNarrationModal] = useState(false);
  const [isFullscreenNarration, setIsFullscreenNarration] = useState(true);
  const [narrationFontSize, setNarrationFontSize] = useState<'normal' | 'large' | 'teleprompter'>('large');
  const [selectedTone] = useState<NarrativeTone>('tactical');
  const [combatLogFilter, setCombatLogFilter] = useState<'all' | 'hits' | 'evades' | 'crits' | 'oppose'>('all');
  const [copiedNarration, setCopiedNarration] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // GM Review Intercept Modal queue (for attacks targeting PCs)
  const [pendingPCAttacks, setPendingPCAttacks] = useState<PendingPCAttackItem[]>([]);
  const currentPendingPCAttack = pendingPCAttacks[0] || null;

  // Inline Player Damage input state per enemy NPC
  const [playerDamageInputs, setPlayerDamageInputs] = useState<Record<string, {
    damage: string;
    location: 'body' | 'head';
    ap: boolean;
  }>>({});

  // Quick manual add participant modal
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddAffiliation, setQuickAddAffiliation] = useState<Affiliation>('hostile_npc');
  const [quickAddHP, setQuickAddHP] = useState(30);
  const [quickAddSP, setQuickAddSP] = useState(11);
  const [quickAddRef, setQuickAddRef] = useState(6);

  // Opposed Check State (1d10 exploding + single NPC Stat Number)
  const [lastOpposeRolls, setLastOpposeRolls] = useState<Record<string, {
    total: number;
    breakdown: string;
    statNumber: number;
    exploded?: boolean;
    botched?: boolean;
  }>>({});

  const handleQuickOppose = (npc: Participant) => {
    const statNumber = getNPCStatNumber(npc);
    const d10Result = rollD10Exploding();
    const npcTotal = d10Result.total + statNumber;

    setLastOpposeRolls(prev => ({
      ...prev,
      [npc.id]: {
        total: npcTotal,
        breakdown: d10Result.breakdown,
        statNumber,
        exploded: d10Result.baseRoll === 10,
        botched: d10Result.baseRoll === 1
      }
    }));

    toast.success(`🎲 ${npc.name} Oppose Roll: ${npcTotal} (${d10Result.breakdown} + Stat #${statNumber})`);

    const action: CombatAction = {
      id: crypto.randomUUID(),
      round: encounter.round,
      attackerId: npc.id,
      attackerName: npc.name,
      attackerAffiliation: npc.affiliation || 'hostile_npc',
      defenderId: 'player',
      defenderName: 'Player Check',
      defenderAffiliation: 'player',
      weaponName: 'Opposed Check',
      damageFormula: '-',
      attackRoll: npcTotal,
      attackBreakdown: `1d10(${d10Result.breakdown}) + Stat#(${statNumber}) = ${npcTotal}`,
      defenseType: 'dodge',
      defenseRoll: 0,
      hit: true,
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
  // Helper to create a structured pending attack targeting a PC
  const createPendingPCAttackItem = (
    attacker: Participant, 
    pcDefender: Participant, 
    weapon: Weapon,
    _roundNumber: number = Math.max(1, encounter.round)
  ): PendingPCAttackItem => {
    const attackerBonus = attacker.isGoon ? (attacker.combatNumber ?? 11) : (attacker.ref + 4);
    const atkD10 = rollD10Exploding();
    const totalAttack = atkD10.total + attackerBonus;

    // Resolve weapon range DVs
    const rangeRes = getWeaponRangeResolution(weapon);
    const rangeBands = rangeRes.singleShotDVs;
    let defaultBandIndex = rangeBands.findIndex(b => b.label === '7-12m' && b.dv !== null);
    if (defaultBandIndex === -1) {
      defaultBandIndex = rangeBands.findIndex(b => b.dv !== null);
    }
    if (defaultBandIndex === -1) defaultBandIndex = 0;
    const selectedDV = rangeBands[defaultBandIndex]?.dv ?? (rangeRes.isRanged ? 15 : null);

    // Player Evade stats (DEX + Evasion skill)
    const defBonus = (pcDefender.dex ?? pcDefender.ref ?? 6) + (pcDefender.evasionSkill ?? 4);

    // Preliminary damage calculation
    const rolled = rollDamage(weapon.system?.damage || '3d6');
    let critName: string | undefined;
    let critEffect: string | undefined;
    if (rolled.isCritical) {
      const crit = rollCriticalInjury('body');
      critName = crit.injury.name;
      critEffect = crit.injury.effect;
    }

    let tarotCard: { id?: string; name: string; number?: number; roman?: string; effect: string } | undefined;
    if (rolled.isTarotCrit) {
      const card = drawRandomTarotCard();
      tarotCard = {
        id: card.id,
        name: card.name,
        number: card.number,
        roman: card.roman,
        effect: card.effect
      };
    }

    // Default Hit rule: Unless player declares an evade, weapon hit is determined by Range Chart!
    const defaultHit = selectedDV !== null ? totalAttack >= selectedDV : true;

    return {
      id: crypto.randomUUID(),
      attacker,
      pcDefender,
      weapon,
      attackRoll: totalAttack,
      attackBreakdown: `d10(${atkD10.breakdown}) + Bonus(${attackerBonus}) = ${totalAttack}`,
      rangeBands,
      selectedBandIndex: defaultBandIndex,
      selectedDV,
      declaredEvade: !rangeRes.isRanged, // If melee, evasion is opposed by default; if ranged, default to Range Chart!
      evadeBonus: defBonus,
      evadeBreakdown: `DEX(${pcDefender.dex ?? 6}) + Evasion(${pcDefender.evasionSkill ?? 4}) = +${defBonus}`,
      evadeRoll: '',
      overrideHit: defaultHit,
      damageRoll: rolled.total,
      damageDice: rolled.dice,
      sixCount: rolled.sixCount,
      isCritical: rolled.isCritical,
      isTarotCrit: rolled.isTarotCrit,
      tarotCard,
      criticalInjuryName: critName,
      criticalInjuryEffect: critEffect,
      hitLocation: 'body',
      modifiedDamage: rolled.total
    };
  };

  // Execute Automatic Combat for all generic NPCs at round start
  const executeRoundCombat = (roundNumber: number) => {
    const activeNPCs = participants.filter(
      p => !p.isPC && !p.isCustomNPC && !p.manualControl && p.hp > 0 && !p.dead && canAct(p.woundState)
    );
    if (activeNPCs.length === 0) return;

    // Dynamically rotate and re-assign opponents at round start for all enemies and allies
    const roundTargetMap = retargetEnemiesForRound(participants, roundNumber);

    // Update participants with new targetIds so the UI immediately reflects the dynamic new opponent for each combatant
    roundTargetMap.forEach((newTarget, attackerId) => {
      onUpdateParticipant(attackerId, { targetId: newTarget.id });
    });

    let resolvedCount = 0;
    const currentParticipantsMap = new Map(participants.map(p => [p.id, p]));
    const batchActions: CombatAction[] = [];
    const incomingPCAttacks: PendingPCAttackItem[] = [];

    activeNPCs.forEach(attacker => {
      const weapon = attacker.weapons && attacker.weapons.length > 0 ? attacker.weapons[0] : null;
      if (!weapon) return;

      // Primary target: dynamic round target acquired at round start, falling back to manual assignment
      const dynamicTarget = roundTargetMap.get(attacker.id);
      const target = dynamicTarget 
        ? (currentParticipantsMap.get(dynamicTarget.id) || dynamicTarget)
        : (attacker.targetId ? currentParticipantsMap.get(attacker.targetId) : targetMap.get(attacker.id));
      if (!target || target.hp <= 0 || target.dead) return;

      // Case 1: Target is an NPC (Generic NPC vs Generic NPC: Friendly vs Hostile, or Hostile vs Friendly)
      if (!target.isPC && target.affiliation !== 'player' && !target.manualControl && !(target.isCustomNPC && target.affiliation === 'friendly_npc')) {
        const currentDefender = currentParticipantsMap.get(target.id) || target;
        if (currentDefender.hp <= 0) return;

        const { action, updatedDefender } = resolveAttack({
          attacker,
          defender: currentDefender,
          weapon,
          round: roundNumber
        });

        currentParticipantsMap.set(updatedDefender.id, updatedDefender);
        batchActions.push(action);
        resolvedCount++;
        return;
      }

      // Case 2: Target is a Player Character (PC)
      if (target.isPC || target.affiliation === 'player') {
        const pendingItem = createPendingPCAttackItem(attacker, target, weapon, roundNumber);
        incomingPCAttacks.push(pendingItem);
      }
    });

    // Apply updated NPC defenders
    if (resolvedCount > 0) {
      currentParticipantsMap.forEach((updated, id) => {
        onUpdateParticipant(id, updated);
      });
      setCombatActions(prev => [...batchActions, ...prev]);

      // Generate round narration recap
      const recap = generateRoundNarrative(roundNumber, batchActions, selectedTone, getSpotlightParticipant());
      setCurrentRoundRecap(recap);

      toast.success(`⚡ Round ${roundNumber}: Auto-resolved ${resolvedCount} NPC vs NPC combat actions!`, {
        icon: <Sparkles className="w-5 h-5 text-primary" />
      });
    }

    // Queue incoming attacks targeting PCs for GM adjudication
    if (incomingPCAttacks.length > 0) {
      setPendingPCAttacks(prev => [...prev, ...incomingPCAttacks]);
      toast.warning(`⚠️ Round ${roundNumber}: ${incomingPCAttacks.length} incoming attack(s) targeting players! Reviewing now...`, {
        icon: <AlertTriangle className="w-5 h-5 text-warning" />
      });
    }
  };

  // Automatic Round-Start Trigger: runs automatically when encounter starts or round advances
  const lastProcessedRoundRef = useRef<number>(0);
  useEffect(() => {
    if (!encounter.active || encounter.round <= 0) {
      lastProcessedRoundRef.current = 0;
      return;
    }
    if (encounter.round !== lastProcessedRoundRef.current) {
      lastProcessedRoundRef.current = encounter.round;
      executeRoundCombat(encounter.round);
    }
  }, [encounter.active, encounter.round]);

  // Handle manual attack from an attacker card
  const handleAttackAction = (attacker: Participant, weapon: Weapon, customTarget?: Participant) => {
    const target = customTarget || targetMap.get(attacker.id);
    if (!target) {
      toast.error(`No target found for ${attacker.name}. Assign a target first!`);
      return;
    }

    // Check if target is a Player Character
    if (target.isPC || target.affiliation === 'player') {
      const pendingItem = createPendingPCAttackItem(attacker, target, weapon, Math.max(1, encounter.round));
      setPendingPCAttacks(prev => [...prev, pendingItem]);
      return;
    }

    // Target is an NPC: Resolve automatically!
    const { action, updatedDefender } = resolveAttack({
      attacker,
      defender: target,
      weapon,
      round: Math.max(1, encounter.round)
    });

    onUpdateParticipant(updatedDefender.id, updatedDefender);
    setCombatActions(prev => [action, ...prev]);

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

  // Update active pending attack in queue
  const updateCurrentPendingPCAttack = (updates: Partial<PendingPCAttackItem>) => {
    setPendingPCAttacks(prev => {
      if (prev.length === 0) return prev;
      return [{ ...prev[0], ...updates }, ...prev.slice(1)];
    });
  };

  // Confirm GM Review Attack against PC
  const handleConfirmPCAttack = (forceHit?: boolean) => {
    if (!currentPendingPCAttack) return;
    const item = currentPendingPCAttack;
    const isHit = forceHit !== undefined ? forceHit : item.overrideHit;

    if (!isHit) {
      toast.info(`${item.pcDefender.name} avoided the attack! (Range DV or Evaded)`);
      const action: CombatAction = {
        id: crypto.randomUUID(),
        round: Math.max(1, encounter.round),
        attackerId: item.attacker.id,
        attackerName: item.attacker.name,
        attackerAffiliation: item.attacker.affiliation || 'hostile_npc',
        defenderId: item.pcDefender.id,
        defenderName: item.pcDefender.name,
        defenderAffiliation: 'player',
        weaponName: item.weapon.name,
        damageFormula: item.weapon.system?.damage || '3d6',
        attackRoll: item.attackRoll,
        attackBreakdown: item.attackBreakdown,
        defenseType: item.declaredEvade ? 'dodge' : 'dv',
        defenseRoll: item.declaredEvade ? (typeof item.evadeRoll === 'number' ? item.evadeRoll : item.evadeBonus) : (item.selectedDV ?? 15),
        defenseBreakdown: item.declaredEvade ? `PC Evade (${item.evadeRoll !== '' ? item.evadeRoll : item.evadeBonus})` : `Range DV ${item.selectedDV}`,
        hit: false,
        hitLocation: item.hitLocation,
        damageRoll: 0,
        damageDice: [],
        isCritical: false,
        spBefore: item.hitLocation === 'head' ? (item.pcDefender.armor?.head ?? 0) : (item.pcDefender.armor?.body ?? 0),
        spAbsorbed: 0,
        spAfter: item.hitLocation === 'head' ? (item.pcDefender.armor?.head ?? 0) : (item.pcDefender.armor?.body ?? 0),
        hpDamage: 0,
        hpBefore: item.pcDefender.hp,
        hpAfter: item.pcDefender.hp,
        woundStateAfter: item.pcDefender.woundState,
        downed: false,
        timestamp: new Date().toLocaleTimeString()
      };
      setCombatActions(prev => [action, ...prev]);
      setPendingPCAttacks(prev => prev.slice(1));
      return;
    }

    // Hit confirmed: Apply Armor SP reduction & ablation
    const currentArmor = item.pcDefender.armor || { head: 0, body: 0 };
    const currentSP = item.hitLocation === 'head' ? (currentArmor.head ?? 0) : (currentArmor.body ?? 0);
    const spAbsorbed = Math.min(item.modifiedDamage, currentSP);
    let hpDamage = Math.max(0, item.modifiedDamage - currentSP);

    if (item.hitLocation === 'head') {
      hpDamage *= 2;
    }

    if (item.isCritical) {
      hpDamage += 5;
    }

    let spAfter = currentSP;
    if (hpDamage > 0 && currentSP > 0) {
      const isAP = item.weapon.ammoType === 'Armor-Piercing';
      spAfter = Math.max(0, currentSP - (isAP ? 2 : 1));
    }

    const hpAfter = Math.max(0, item.pcDefender.hp - hpDamage);
    const updatedArmor = {
      ...currentArmor,
      head: item.hitLocation === 'head' ? spAfter : currentArmor.head,
      body: item.hitLocation === 'body' ? spAfter : currentArmor.body
    };
    const woundState = getWoundState(hpAfter, item.pcDefender.maxHp);
    const downed = hpAfter <= 0;

    const updatedPC: Participant = {
      ...item.pcDefender,
      hp: hpAfter,
      armor: updatedArmor,
      woundState,
      dead: downed
    };

    onUpdateParticipant(item.pcDefender.id, updatedPC);

    const action: CombatAction = {
      id: crypto.randomUUID(),
      round: Math.max(1, encounter.round),
      attackerId: item.attacker.id,
      attackerName: item.attacker.name,
      attackerAffiliation: item.attacker.affiliation || 'hostile_npc',
      defenderId: item.pcDefender.id,
      defenderName: item.pcDefender.name,
      defenderAffiliation: 'player',
      weaponName: item.weapon.name,
      damageFormula: item.weapon.system?.damage || '3d6',
      attackRoll: item.attackRoll,
      attackBreakdown: item.attackBreakdown,
      defenseType: item.declaredEvade ? 'dodge' : 'dv',
      defenseRoll: item.declaredEvade ? (typeof item.evadeRoll === 'number' ? item.evadeRoll : item.evadeBonus) : (item.selectedDV ?? 15),
      defenseBreakdown: item.declaredEvade ? `PC Evade (${item.evadeRoll !== '' ? item.evadeRoll : item.evadeBonus})` : `Range DV ${item.selectedDV}`,
      hit: true,
      hitLocation: item.hitLocation,
      damageRoll: item.modifiedDamage,
      damageDice: item.damageDice,
      isCritical: item.isCritical,
      isTarotCrit: item.isTarotCrit,
      tarotCard: item.tarotCard,
      criticalInjuryName: item.criticalInjuryName,
      criticalInjuryEffect: item.criticalInjuryEffect,
      spBefore: currentSP,
      spAbsorbed,
      spAfter,
      hpDamage,
      hpBefore: item.pcDefender.hp,
      hpAfter,
      woundStateAfter: woundState,
      downed,
      timestamp: new Date().toLocaleTimeString()
    };

    setCombatActions(prev => [action, ...prev]);
    toast.success(`Damage applied to ${item.pcDefender.name}: -${hpDamage} HP (Armor ablated to ${spAfter})`);
    setPendingPCAttacks(prev => prev.slice(1));
  };

  // Helper to handle GM applying player damage to an enemy/defender
  const handleApplyPlayerDamage = (defender: Participant) => {
    const input = playerDamageInputs[defender.id];
    const damage = parseInt(input?.damage || '');
    if (isNaN(damage) || damage <= 0) {
      toast.error('Enter a valid damage number dealt by player');
      return;
    }
    const location = input?.location || 'body';
    const damageType = input?.ap ? 'armor-piercing' : 'normal';

    const result = applyPlayerDamageToDefender({
      defender,
      damage,
      hitLocation: location,
      damageType,
      round: Math.max(1, encounter.round)
    });

    onUpdateParticipant(defender.id, result.updatedDefender);
    setCombatActions(prev => [result.action, ...prev]);

    setPlayerDamageInputs(prev => ({
      ...prev,
      [defender.id]: { damage: '', location: 'body', ap: false }
    }));

    if (result.hpDamage > 0) {
      toast.success(`💥 Applied ${result.hpDamage} HP damage to ${defender.name}! (${location.toUpperCase()} SP ${result.spBefore} ➔ ${result.spAfter})`);
    } else {
      toast.info(`🛡️ ${defender.name}'s armor absorbed all ${damage} damage! SP remains ${result.spBefore}.`);
    }
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



          {/* Live Combat & Roll Log Quick-Jump Button */}
          <Button
            onClick={() => {
              const el = document.getElementById('combat-action-log');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                el.classList.add('ring-2', 'ring-primary');
                setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 1500);
              }
            }}
            variant="outline"
            className={`cyber-btn text-xs font-mono font-bold transition-all cursor-pointer ${
              combatActions.length > 0
                ? 'border-primary/60 bg-primary/10 text-primary hover:bg-primary/20 shadow-sm'
                : 'border-border text-muted-foreground'
            }`}
            title="Jump down to view all dice rolls and combat actions in the Live Combat Log"
          >
            <ScrollText className="w-4 h-4 mr-1.5 text-primary" />
            <span>Rolls & Log</span>
            {combatActions.length > 0 ? (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-primary text-primary-foreground font-black">
                {combatActions.length}
              </span>
            ) : null}
          </Button>

          {/* Tactical SITREP Narration Button */}
          <Button
            onClick={handleGenerateNarration}
            variant="outline"
            className="cyber-btn border-border/80 hover:border-primary text-xs"
            title="View the Tactical SITREP telemetry recap for this round (zero fluff)."
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-warning" />
            Tactical SITREP
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

          {/* Reset / Clear Encounter Button */}
          <Button
            onClick={() => setShowResetModal(true)}
            variant="outline"
            className="cyber-btn border-destructive/50 hover:bg-destructive/20 text-destructive text-xs font-mono font-bold"
            title="Reset or clear combatants, rounds, and combat state"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset / Clear
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
                {/* Take Player Damage Widget (for Enemies / NPCs) */}
                {!p.isPC && (
                  <div className="flex items-center gap-1.5 p-1 px-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
                    <span className="text-[10px] font-mono uppercase font-bold text-rose-400">Player Dmg:</span>
                    <Input
                      type="number"
                      placeholder="Dmg"
                      value={playerDamageInputs[p.id]?.damage || ''}
                      onChange={e => setPlayerDamageInputs(prev => ({
                        ...prev,
                        [p.id]: { ...(prev[p.id] || { location: 'body', ap: false }), damage: e.target.value }
                      }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleApplyPlayerDamage(p);
                      }}
                      className="cyber-input w-16 h-8 text-xs font-mono font-black text-center bg-background border-border p-1"
                      title="Enter total damage dealt by player and press Enter"
                    />
                    <select
                      value={playerDamageInputs[p.id]?.location || 'body'}
                      onChange={e => setPlayerDamageInputs(prev => ({
                        ...prev,
                        [p.id]: { ...(prev[p.id] || { damage: '', ap: false }), location: e.target.value as 'body' | 'head' }
                      }))}
                      className="cyber-input h-8 text-[11px] font-mono bg-background border-border px-1"
                    >
                      <option value="body">Body (SP {p.armor?.body ?? 0})</option>
                      <option value="head">Head (SP {p.armor?.head ?? 0} x2)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setPlayerDamageInputs(prev => ({
                        ...prev,
                        [p.id]: { ...(prev[p.id] || { damage: '', location: 'body' }), ap: !prev[p.id]?.ap }
                      }))}
                      className={`h-8 px-2 rounded text-[10px] font-mono font-bold border transition-colors ${
                        playerDamageInputs[p.id]?.ap
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                          : 'bg-secondary/40 text-muted-foreground border-border hover:text-foreground'
                      }`}
                      title="Armor-Piercing Ammunition (-2 SP ablation on hit)"
                    >
                      AP
                    </button>
                    <Button
                      size="sm"
                      onClick={() => handleApplyPlayerDamage(p)}
                      className="cyber-btn h-8 px-3 text-xs bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold shadow-sm cursor-pointer"
                      title="Apply damage: ablates target SP and reduces target HP"
                    >
                      Apply
                    </Button>
                  </div>
                )}

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

                {/* Oppose Any Player Check Button & Instant Outcome Display */}
                {!p.isPC && p.affiliation !== 'player' && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      disabled={p.hp <= 0}
                      onClick={() => handleQuickOppose(p)}
                      className="cyber-btn text-xs px-2.5 h-8 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-mono flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
                      title={`Roll Oppose check: 1d10 (exploding) + Stat #${getNPCStatNumber(p)}`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>OPPOSE</span>
                    </Button>

                    {lastOpposeRolls[p.id] && (
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono font-bold animate-in fade-in zoom-in-95 duration-150 ${
                          lastOpposeRolls[p.id].exploded
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                            : lastOpposeRolls[p.id].botched
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        }`}
                        title={`Breakdown: 1d10(${lastOpposeRolls[p.id].breakdown}) + Stat #${lastOpposeRolls[p.id].statNumber} = ${lastOpposeRolls[p.id].total}`}
                      >
                        <span className="text-[10px] text-muted-foreground uppercase">Roll:</span>
                        <span className="text-sm font-black text-white">{lastOpposeRolls[p.id].total}</span>
                        {lastOpposeRolls[p.id].exploded && <span className="text-[10px] text-emerald-400 font-normal" title="Exploded!">⚡</span>}
                        {lastOpposeRolls[p.id].botched && <span className="text-[10px] text-rose-400 font-normal" title="Botched!">💥</span>}
                      </div>
                    )}
                  </div>
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

      {/* GM REVIEW INTERCEPT MODAL (FOR ATTACKS TARGETING PCS: RANGE CHART VS EVADE) */}
      {currentPendingPCAttack && (
        <Dialog open={!!currentPendingPCAttack} onOpenChange={open => { if (!open) setPendingPCAttacks([]); }}>
          <DialogContent className="max-w-xl bg-card border-2 border-primary/50 shadow-2xl backdrop-blur-xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-black tracking-wide text-primary flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-5 h-5 text-warning animate-bounce" />
                  GM COMBAT REVIEW: Attack Targeting Player
                </DialogTitle>
                {pendingPCAttacks.length > 1 && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/40">
                    Attack 1 of {pendingPCAttacks.length}
                  </span>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Threat Summary */}
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-2">
                <div className="text-sm font-bold text-foreground flex items-center justify-between">
                  <span className="font-mono text-rose-400 font-bold">{currentPendingPCAttack.attacker.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">ATTACKING</span>
                  <span className="text-primary font-black font-mono text-base">{currentPendingPCAttack.pcDefender.name}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-1">
                  <span>
                    Weapon: <strong className="text-foreground">{currentPendingPCAttack.weapon.name}</strong>{' '}
                    <span className="text-primary font-mono font-bold">
                      [{formatWeaponCategory(currentPendingPCAttack.weapon)}]
                    </span>{' '}
                    ({currentPendingPCAttack.weapon.system?.damage || '3d6'})
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    ROF: {currentPendingPCAttack.weapon.system?.rof ?? 1}
                  </span>
                </div>
              </div>

              {/* Attacker Roll & Defense Resolution Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Attacker Roll Box */}
                <div className="p-3 rounded-xl bg-secondary/20 border border-border flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block font-mono">
                      Attacker Roll ({currentPendingPCAttack.attacker.name})
                    </span>
                    <div className="text-3xl font-black font-mono text-amber-400 mt-1">
                      {currentPendingPCAttack.attackRoll}
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono mt-2">
                    {currentPendingPCAttack.attackBreakdown}
                  </span>
                </div>

                {/* Defense Resolution: Range Chart DV or Evade */}
                <div className="p-3 rounded-xl bg-secondary/20 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block font-mono">
                      Defense Mode
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-mono font-bold text-foreground">
                      <input
                        type="checkbox"
                        checked={currentPendingPCAttack.declaredEvade}
                        onChange={e => {
                          const declared = e.target.checked;
                          let newHit = currentPendingPCAttack.overrideHit;
                          if (!declared) {
                            newHit = currentPendingPCAttack.selectedDV !== null 
                              ? currentPendingPCAttack.attackRoll >= currentPendingPCAttack.selectedDV 
                              : true;
                          } else if (typeof currentPendingPCAttack.evadeRoll === 'number') {
                            newHit = currentPendingPCAttack.attackRoll > currentPendingPCAttack.evadeRoll;
                          }
                          updateCurrentPendingPCAttack({ declaredEvade: declared, overrideHit: newHit });
                        }}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>Player Evades?</span>
                    </label>
                  </div>

                  {!currentPendingPCAttack.declaredEvade ? (
                    /* Default: Range Chart DV Selection */
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground font-mono block">
                        Target Range DV (Single Shot):
                      </span>
                      {currentPendingPCAttack.rangeBands.length > 0 ? (
                        <div className="grid grid-cols-3 gap-1">
                          {currentPendingPCAttack.rangeBands.map((band, idx) => {
                            const isSelected = currentPendingPCAttack.selectedBandIndex === idx;
                            const isNA = band.dv === null;
                            return (
                              <button
                                key={band.label}
                                type="button"
                                disabled={isNA}
                                onClick={() => {
                                  const hit = band.dv !== null && currentPendingPCAttack.attackRoll >= band.dv;
                                  updateCurrentPendingPCAttack({
                                    selectedBandIndex: idx,
                                    selectedDV: band.dv,
                                    overrideHit: hit
                                  });
                                }}
                                className={`p-1 text-center rounded border font-mono text-[10px] transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground font-bold border-primary shadow-sm'
                                    : isNA
                                      ? 'bg-secondary/10 text-muted-foreground/30 border-transparent cursor-not-allowed'
                                      : 'bg-secondary/40 hover:bg-secondary text-foreground border-border'
                                }`}
                              >
                                <div className="text-[9px] opacity-80">{band.label}</div>
                                <div className="font-black">{isNA ? '-' : `DV ${band.dv}`}</div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-muted-foreground italic">
                          Melee Attack (Opposed check against Evasion)
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Player Declared Evade Input & Quick Roll */
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-muted-foreground">Evasion Skill:</span>
                        <span className="text-foreground font-bold">{currentPendingPCAttack.evadeBreakdown}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          placeholder="Player Total"
                          value={currentPendingPCAttack.evadeRoll}
                          onChange={e => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value);
                            const hit = typeof val === 'number' ? currentPendingPCAttack.attackRoll > val : currentPendingPCAttack.overrideHit;
                            updateCurrentPendingPCAttack({ evadeRoll: val, overrideHit: hit });
                          }}
                          className="cyber-input font-mono font-black text-sm h-8 text-center"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const d10 = rollD10Exploding();
                            const total = d10.total + currentPendingPCAttack.evadeBonus;
                            const hit = currentPendingPCAttack.attackRoll > total;
                            updateCurrentPendingPCAttack({
                              evadeRoll: total,
                              overrideHit: hit
                            });
                            toast.info(`🎲 Rolled PC Evade: ${total} (1d10 + ${currentPendingPCAttack.evadeBonus})`);
                          }}
                          className="cyber-btn h-8 px-2.5 text-xs bg-secondary hover:bg-primary/20 text-foreground font-mono"
                          title="Roll 1d10 exploding + DEX + Evasion"
                        >
                          <Dices className="w-3.5 h-3.5 mr-1 text-primary" />
                          Roll
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hit Status & Critical Injury Banner */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                currentPendingPCAttack.overrideHit 
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300' 
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              }`}>
                <div className="flex items-center gap-2.5">
                  {currentPendingPCAttack.overrideHit ? (
                    <Flame className="w-5 h-5 text-rose-400 shrink-0" />
                  ) : (
                    <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-sm block">
                      {currentPendingPCAttack.overrideHit ? 'ATTACK HITS PLAYER' : 'PLAYER EVADED / MISSED'}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {!currentPendingPCAttack.declaredEvade
                        ? (currentPendingPCAttack.selectedDV !== null 
                            ? `Attack ${currentPendingPCAttack.attackRoll} vs Range DV ${currentPendingPCAttack.selectedDV}`
                            : 'Range DV Check')
                        : `Attack ${currentPendingPCAttack.attackRoll} vs PC Evade ${currentPendingPCAttack.evadeRoll !== '' ? currentPendingPCAttack.evadeRoll : '?'}`}
                    </span>
                    {currentPendingPCAttack.isCritical && currentPendingPCAttack.overrideHit && (
                      <span className="text-xs text-amber-400 block font-mono font-bold mt-0.5">
                        {currentPendingPCAttack.isTarotCrit 
                          ? `🎴 TAROT CRIT (${currentPendingPCAttack.sixCount}x 6s rolled!)` 
                          : `💥 CRITICAL INJURY: ${currentPendingPCAttack.criticalInjuryName} (+5 direct HP!)`}
                      </span>
                    )}
                  </div>
                </div>

                {/* GM Override Hit Toggle */}
                <button
                  type="button"
                  onClick={() => updateCurrentPendingPCAttack({ overrideHit: !currentPendingPCAttack.overrideHit })}
                  className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-xs font-mono font-bold text-foreground border border-border cursor-pointer shrink-0"
                >
                  Toggle Hit / Miss
                </button>
              </div>

              {/* Night City Tarot Drawn Card Display */}
              {currentPendingPCAttack.overrideHit && currentPendingPCAttack.isTarotCrit && currentPendingPCAttack.tarotCard && (
                <div className="p-3.5 rounded-xl bg-primary/10 border-2 border-primary/40 space-y-1.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-primary flex items-center gap-1.5 font-mono">
                      <Sparkles className="w-4 h-4 text-warning" />
                      Night City Tarot Drawn: {currentPendingPCAttack.tarotCard.name} ({currentPendingPCAttack.tarotCard.roman})
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/50">
                      {currentPendingPCAttack.sixCount}x SIXES
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 font-sans leading-relaxed">
                    {currentPendingPCAttack.tarotCard.effect}
                  </p>
                </div>
              )}

              {/* Damage & Location Review */}
              {currentPendingPCAttack.overrideHit && (
                <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
                        Damage Dice:
                      </label>
                      <div className="flex items-center gap-1">
                        {currentPendingPCAttack.damageDice.map((d, i) => (
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
                      {typeof currentPendingPCAttack.sixCount === 'number' && currentPendingPCAttack.sixCount > 0 && (
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          currentPendingPCAttack.sixCount >= 3 
                            ? 'bg-primary/20 text-primary border-primary/50' 
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {currentPendingPCAttack.sixCount}x [6]s
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">Location:</span>
                      <select
                        value={currentPendingPCAttack.hitLocation}
                        onChange={e => updateCurrentPendingPCAttack({ hitLocation: e.target.value as 'head' | 'body' })}
                        className="cyber-input text-xs h-7 bg-background border-border font-mono"
                      >
                        <option value="body">Body (SP {currentPendingPCAttack.pcDefender.armor?.body ?? 0})</option>
                        <option value="head">Head (SP {currentPendingPCAttack.pcDefender.armor?.head ?? 0}) - x2 Dmg</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={currentPendingPCAttack.modifiedDamage}
                      onChange={e => updateCurrentPendingPCAttack({ modifiedDamage: parseInt(e.target.value) || 0 })}
                      className="cyber-input font-mono font-black text-xl text-primary w-24 text-center h-9"
                    />
                    <div className="text-xs text-muted-foreground font-mono">
                      Damage vs SP {currentPendingPCAttack.hitLocation === 'head' ? (currentPendingPCAttack.pcDefender.armor?.head ?? 0) : (currentPendingPCAttack.pcDefender.armor?.body ?? 0)}: penetrates and ablates armor by 1.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full gap-2">
              <Button
                variant="outline"
                onClick={() => handleConfirmPCAttack(false)}
                className="cyber-btn text-xs border-border/80 text-muted-foreground hover:text-foreground"
              >
                Record Miss / Evaded
              </Button>
              <Button
                onClick={() => handleConfirmPCAttack(true)}
                className="cyber-btn bg-primary text-primary-foreground font-bold text-xs shadow-md"
              >
                <Check className="w-4 h-4 mr-1.5" />
                {currentPendingPCAttack.overrideHit ? 'Confirm & Apply Damage' : 'Apply Damage Anyway'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}



      {/* TACTICAL ROUND SITREP TELEPROMPTER MODAL (WITH FULL-SCREEN THEATER & TELEPROMPTER MODE) */}
      {showNarrationModal && currentRoundRecap && (
        <Dialog open={showNarrationModal} onOpenChange={setShowNarrationModal}>
          <DialogContent className={
            isFullscreenNarration
              ? "fixed inset-0 z-50 max-w-none w-screen h-screen m-0 rounded-none bg-background/98 backdrop-blur-3xl flex flex-col border-0 p-6 md:p-10 overflow-hidden shadow-2xl"
              : "max-w-4xl bg-card border-2 border-primary shadow-2xl backdrop-blur-2xl"
          }>
            <DialogHeader className="border-b border-border/60 pb-3 flex-shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                    <Sparkles className="w-5 h-5 text-warning animate-pulse" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg md:text-xl font-black tracking-wider uppercase text-primary flex items-center gap-2 font-mono">
                      Round {currentRoundRecap.round} Tactical SITREP
                    </DialogTitle>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Strict Telemetry Breakdown • Zero Fluff • {currentRoundRecap.actions.length} Engagements
                    </span>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono tracking-wider">
                    TACTICAL VIEW ONLY
                  </span>

                  {/* Font Size Selector for Reading / Teleprompter */}
                  <div className="flex items-center gap-1 bg-secondary/40 p-1 rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground font-mono px-1 font-bold">FONT:</span>
                    {(['normal', 'large', 'teleprompter'] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => setNarrationFontSize(size)}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          narrationFontSize === size ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title={`${size.toUpperCase()} Reading Size`}
                      >
                        {size === 'normal' ? 'Normal' : size === 'large' ? 'Large' : 'Teleprompter'}
                      </button>
                    ))}
                  </div>

                  {/* Toggle Full-Screen Theater */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsFullscreenNarration(!isFullscreenNarration)}
                    className="cyber-btn text-xs h-8 border-primary/40 text-primary hover:bg-primary/10"
                    title={isFullscreenNarration ? 'Exit Full-Screen Theater' : 'Open Full-Screen Theater'}
                  >
                    {isFullscreenNarration ? <Minimize2 className="w-3.5 h-3.5 mr-1" /> : <Maximize2 className="w-3.5 h-3.5 mr-1" />}
                    <span>{isFullscreenNarration ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Main SITREP Reading Body */}
            <div className={`flex-1 overflow-y-auto my-4 p-6 md:p-8 rounded-2xl bg-black/85 border-2 border-primary/30 shadow-inner font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed ${
              narrationFontSize === 'teleprompter'
                ? 'text-lg md:text-xl tracking-wide max-w-5xl mx-auto'
                : narrationFontSize === 'large'
                  ? 'text-sm md:text-base max-w-4xl mx-auto'
                  : 'text-xs md:text-sm max-w-3xl mx-auto'
            }`}>
              {currentRoundRecap.narrative}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full border-t border-border/60 pt-3 flex-shrink-0">
              <span className="text-xs text-muted-foreground font-mono">
                Itemized telemetry sitrep for GM narration and manual flavor.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCopyNarration}
                  className="cyber-btn bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs border border-border"
                >
                  {copiedNarration ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copy Text
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowNarrationModal(false)}
                  className="cyber-btn bg-primary text-primary-foreground font-bold text-xs"
                >
                  Close Theater View
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* RESET / CLEAR ENCOUNTER MODAL */}
      {showResetModal && (
        <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
          <DialogContent className="max-w-lg bg-card border-2 border-destructive/60 shadow-2xl backdrop-blur-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase text-destructive flex items-center gap-2 font-mono">
                <RotateCcw className="w-5 h-5 text-destructive" />
                Reset / Clear Encounter
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <p className="text-xs text-muted-foreground">
                Choose how you would like to reset or clear this encounter:
              </p>

              {/* Option 1: Clear NPCs Only (Keep PCs) */}
              <div className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border transition-all flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Clear NPCs Only (Keep PCs)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Removes all hostile and friendly NPCs. Keeps Player Characters intact in standby mode. Wipes combat actions log.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (onClearNPCsOnly) onClearNPCsOnly();
                    setCombatActions([]);
                    setCurrentRoundRecap(null);
                    setShowResetModal(false);
                  }}
                  className="cyber-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs whitespace-nowrap"
                >
                  Clear NPCs
                </Button>
              </div>

              {/* Option 2: Reset Combat State (Keep Combatants) */}
              <div className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border transition-all flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    Reset Combat State (Restore HP & SP)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Keeps all current combatants. Restores full HP and armor SP to maximum, clears wounds, resets round to 1, turn to 0, and clears initiatives.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (onResetCombatState) onResetCombatState();
                    setCombatActions([]);
                    setCurrentRoundRecap(null);
                    setShowResetModal(false);
                  }}
                  className="cyber-btn bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs whitespace-nowrap"
                >
                  Reset State
                </Button>
              </div>

              {/* Option 3: Full Wipe (Clear Everything) */}
              <div className="p-4 rounded-xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 transition-all flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-destructive flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-destructive" />
                    Wipe Everything (Full Reset)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Completely wipes all combatants (PCs and NPCs), resets round to 0/standby, and clears the combat log.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (onClearAllCombatants) onClearAllCombatants();
                    setCombatActions([]);
                    setCurrentRoundRecap(null);
                    setShowResetModal(false);
                  }}
                  className="cyber-btn bg-destructive hover:bg-destructive/90 text-white font-bold text-xs whitespace-nowrap"
                >
                  Wipe All
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setShowResetModal(false)}
                className="cyber-btn text-xs"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* COMBAT ACTIONS & LIVE DICE ROLLS LOG */}
      <div id="combat-action-log" className="p-5 md:p-6 rounded-2xl bg-card/90 border-2 border-primary/40 backdrop-blur-xl shadow-2xl space-y-4 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <ScrollText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-wider text-primary font-mono flex items-center gap-2">
                  Live Combat & Dice Roll Feed
                </h3>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                All automatic attack rolls, range chart DVs, defense checks, damage math, and SP ablations stream here.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {combatActions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCombatActions([]);
                  toast.info('Combat action log cleared.');
                }}
                className="cyber-btn text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
              >
                Clear Log
              </Button>
            )}
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center flex-wrap gap-2 pt-1">
          <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase mr-1">FILTER:</span>
          {(['all', 'hits', 'evades', 'crits', 'oppose'] as const).map(filterKey => {
            const count = 
              filterKey === 'all' ? combatActions.length :
              filterKey === 'hits' ? combatActions.filter(a => a.hit && a.weaponName !== 'Opposed Check').length :
              filterKey === 'evades' ? combatActions.filter(a => !a.hit).length :
              filterKey === 'crits' ? combatActions.filter(a => a.isCritical || a.isTarotCrit).length :
              combatActions.filter(a => a.weaponName === 'Opposed Check').length;

            const label = 
              filterKey === 'all' ? 'All Rolls' :
              filterKey === 'hits' ? 'Hits' :
              filterKey === 'evades' ? 'Evades/Misses' :
              filterKey === 'crits' ? 'Crits' : 'Opposed Checks';

            return (
              <button
                key={filterKey}
                onClick={() => setCombatLogFilter(filterKey)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  combatLogFilter === filterKey
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-secondary/40 text-muted-foreground hover:text-foreground border border-border/50'
                }`}
              >
                <span>{label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/50 font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Log Entries or Empty Placeholder */}
        {combatActions.length === 0 ? (
          <div className="p-8 rounded-xl bg-secondary/15 border border-dashed border-border/70 text-center space-y-2">
            <div className="flex justify-center">
              <ScrollText className="w-8 h-8 text-muted-foreground/50 animate-pulse" />
            </div>
            <h4 className="text-sm font-bold font-mono text-muted-foreground uppercase">
              No Combat Actions Recorded Yet
            </h4>
            <p className="text-xs text-muted-foreground/80 max-w-md mx-auto font-sans">
              Advance combat rounds or declare attacks from combatant cards above. All weapon hit/evade checks, exploding d10 rolls, and damage calculations will display here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {combatActions
              .filter(act => {
                if (combatLogFilter === 'hits') return act.hit && act.weaponName !== 'Opposed Check';
                if (combatLogFilter === 'evades') return !act.hit;
                if (combatLogFilter === 'crits') return act.isCritical || act.isTarotCrit;
                if (combatLogFilter === 'oppose') return act.weaponName === 'Opposed Check';
                return true;
              })
              .map(act => {
                const isOppose = act.weaponName === 'Opposed Check';
                const isHit = act.hit && !isOppose;

                return (
                  <div
                    key={act.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2 font-mono text-xs ${
                      isOppose
                        ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                        : isHit
                          ? 'bg-rose-950/15 border-rose-500/40 text-foreground'
                          : 'bg-secondary/20 border-border text-muted-foreground'
                    }`}
                  >
                    {/* Header Row: Round, Combatants, Result Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-black text-[10px] border border-primary/30">
                          R{act.round}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{act.timestamp || ''}</span>
                        
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <span className={act.attackerAffiliation === 'player' ? 'text-emerald-400' : act.attackerAffiliation === 'friendly_npc' ? 'text-blue-400' : 'text-rose-400'}>
                            [{act.attackerName}]
                          </span>
                          <span className="text-muted-foreground">➔</span>
                          <span className={act.defenderAffiliation === 'player' ? 'text-emerald-400' : act.defenderAffiliation === 'friendly_npc' ? 'text-blue-400' : 'text-rose-400'}>
                            [{act.defenderName}]
                          </span>
                        </div>

                        <span className="px-2 py-0.5 rounded bg-secondary/50 border border-border text-[11px] text-muted-foreground">
                          {act.weaponName} {act.damageFormula && act.damageFormula !== '-' ? `(${act.damageFormula})` : ''}
                        </span>
                      </div>

                      {/* Result Tag */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isOppose ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                            OPPOSED CHECK: {act.attackRoll}
                          </span>
                        ) : act.hit ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold flex items-center gap-1">
                            ✓ HIT (-{act.hpDamage} HP)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                            ✗ EVADED / MISSED
                          </span>
                        )}

                        {act.isTarotCrit && act.tarotCard && (
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                            🎴 TAROT: {act.tarotCard.name}
                          </span>
                        )}

                        {act.isCritical && act.criticalInjuryName && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                            💥 {act.criticalInjuryName}
                          </span>
                        )}

                        {act.downed && (
                          <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black animate-pulse">
                            💀 DOWNED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Detailed Dice Breakdown & Damage Telemetry */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-lg bg-background/60 border border-border/40 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase">Attack Check:</span>
                        <span className="text-foreground">
                          🎲 <strong>Atk Roll:</strong> {act.attackRoll} {act.attackBreakdown ? `(${act.attackBreakdown})` : ''}
                        </span>
                        <span className="text-muted-foreground block mt-0.5">
                          🛡️ <strong>Defense:</strong> {
                            act.defenseType === 'dv' 
                              ? `Range Chart DV ${act.defenseRoll ?? '-'}`
                              : act.defenseRoll !== undefined
                                ? `Evade Roll ${act.defenseRoll} (${act.defenseBreakdown || 'Opposed'})`
                                : 'None'
                          }
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase">Ballistic Impact:</span>
                        {isOppose ? (
                          <span className="text-muted-foreground">Contested check resolution complete.</span>
                        ) : act.hit ? (
                          <span className="text-foreground">
                            💥 <strong>Dmg Roll:</strong> {act.damageRoll} {act.damageDice && act.damageDice.length > 0 ? `[${act.damageDice.join('+')}]` : ''} vs SP {act.spBefore} ➔ Net <strong>-{act.hpDamage} HP</strong> (Armor ablated to SP {act.spAfter})
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Attack deflected or evaded. No armor or HP damage taken.</span>
                        )}
                        {!isOppose && act.hit && (
                          <span className="text-muted-foreground block mt-0.5 text-[10px]">
                            Vital Status: Defender HP {act.hpAfter}/{act.hpBefore} ({act.woundStateAfter || 'Normal'})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Critical Injury Detail (if any) */}
                    {(act.isTarotCrit || act.isCritical) && (
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                        <span>💥 <strong>Critical Trauma:</strong></span>
                        <span>{act.isTarotCrit && act.tarotCard ? `${act.tarotCard.name} (${act.tarotCard.effect})` : `${act.criticalInjuryName} (${act.criticalInjuryEffect || 'Injury penalty applied'})`}</span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

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
