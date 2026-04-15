import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import {
  Plus, Trash2, Save, Upload, Download, Dices, Play, RotateCcw,
  Skull, Heart, Crosshair, ChevronDown, ChevronUp,
  User, Bot, AlertTriangle, Users, Target, Sparkles, Zap, LayoutPanelTop, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { rollDiceDetailed, d10 } from '@/lib/dice';
import type { Participant, EncounterState, SavedEncounter, Weapon, CritMode, TarotDeckState } from '@/types';

interface EncounterTrackerProps {
  participants: Participant[];
  orderedParticipants: Participant[];
  encounter: EncounterState;
  activeTurnParticipant: Participant | null;
  savedEncounters: SavedEncounter[];
  onAddParticipant: (participant: Omit<Participant, 'id' | 'woundState' | 'dead'>) => void;
  onUpdateParticipant: (id: string, updates: Partial<Participant>) => void;
  onRemoveParticipant: (id: string) => void;
  onRollAll: () => void;
  onRollAllWithPCs?: () => void;
  onClearRolls: () => void;
  onStartEncounter: () => void;
  onSaveEncounter: () => void;
  onLoadEncounter: (encounter: SavedEncounter) => void;
  onDeleteEncounter: (id: string) => void;
  onExportEncounters: () => void;
  onImportEncounters: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRollDamage?: (notation: string, label?: string) => void;
  onOpenDamageDialog: (participant: Participant) => void;
  critMode?: CritMode;
  tarotDeck?: TarotDeckState;
}

// Attack roll calculation: d10 + REF + Weapon Skill + Weapon Attack Mod
const calculateAttackRoll = (ref: number, weaponSkill: number = 0, attackMod: number = 0): { roll: number; total: number } => {
  const roll = d10();
  return { roll, total: roll + ref + weaponSkill + attackMod };
};

const formatWeaponCategory = (weapon: Weapon): string => {
  const type = weapon.system?.weaponType;
  if (typeof type === 'string' && type) {
    const result = type.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
  
  // Fallback for older saves or custom weapons that didn't retain weaponType
  if (weapon.name) {
    const lowerName = weapon.name.toLowerCase();
    if (lowerName.includes('assault rifle')) return 'Assault Rifle';
    if (lowerName.includes('sniper rifle')) return 'Sniper Rifle';
    if (lowerName.includes('shotgun')) return 'Shotgun';
    if (lowerName.includes('smg') || lowerName.includes('submachine')) return 'SMG';
    
    // If the name explicitly says what it is
    if (lowerName.includes('heavy pistol')) return 'Heavy Pistol';
    if (lowerName.includes('very heavy pistol')) return 'Very Heavy Pistol';
    if (lowerName.includes('medium pistol')) return 'Medium Pistol';
    if (lowerName.includes('pistol')) return 'Pistol';
    
    if (lowerName.includes('melee') || lowerName.includes('katana') || lowerName.includes('sword') || lowerName.includes('knife')) return 'Melee Weapon';
    if (lowerName.includes('bow')) return 'Bow / Crossbow';
    if (lowerName.includes('grenade')) return 'Grenade Launcher';
    if (lowerName.includes('rocket')) return 'Rocket Launcher';
  }
  
  if (weapon.system?.weaponSkill) {
    const skill = weapon.system.weaponSkill.toLowerCase();
    const damage = weapon.system.damage || '';
    
    if (skill.includes('handgun')) {
      if (damage.includes('4d6')) return 'Very Heavy Pistol';
      if (damage.includes('3d6')) return 'Heavy Pistol';
      if (damage.includes('2d6')) return 'Medium Pistol';
      return 'Pistol';
    }
    
    if (skill.includes('shoulder arms')) {
      if (damage.includes('5d6')) return 'Assault Rifle';
      if (damage.includes('3d6')) return 'Shotgun';
      return 'Rifle';
    }
    
    if (skill.includes('melee')) return 'Melee Weapon';
    if (skill.includes('heavy')) return 'Heavy Weapon';
    if (skill.includes('archery')) return 'Bow / Crossbow';
    
    return weapon.system.weaponSkill;
  }
  
  return 'Weapon';
};

export function EncounterTracker({
  participants,
  orderedParticipants,
  encounter,
  activeTurnParticipant,
  savedEncounters,
  onAddParticipant,
  onUpdateParticipant,
  onRemoveParticipant,
  onRollAll,
  onRollAllWithPCs,
  onClearRolls,
  onStartEncounter,
  onSaveEncounter,
  onLoadEncounter,
  onDeleteEncounter,
  onExportEncounters,
  onImportEncounters,
  onRollDamage,
  onOpenDamageDialog,
  critMode = 'raw',
  tarotDeck
}: EncounterTrackerProps) {
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    ref: 6,
    initiativeSkill: 0,
    hp: 25,
    isPC: false
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showSaved, setShowSaved] = useState(false);
  const [attackRolls, setAttackRolls] = useState<Record<string, Array<{ roll: number; total: number; weaponName: string }>>>({});
  const lastAutoRolledRound = useRef(-1);
  const tableRef = useRef<HTMLTableElement>(null);
  
  // Animate new rows
  useEffect(() => {
    if (tableRef.current) {
      const rows = tableRef.current.querySelectorAll('tbody tr');
      gsap.from(rows[rows.length - 1], {
        y: -20,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  }, [participants.length]);
  
  const handleAdd = () => {
    if (!newParticipant.name.trim()) {
      toast.error('Name is required');
      return;
    }
    onAddParticipant({
      name: newParticipant.name,
      ref: newParticipant.ref,
      initiativeSkill: newParticipant.initiativeSkill,
      hp: newParticipant.hp,
      maxHp: newParticipant.hp,
      isPC: newParticipant.isPC
    });
    setNewParticipant({ name: '', ref: 6, initiativeSkill: 0, hp: 25, isPC: false });
  };
  
  const toggleExpanded = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const getWoundIcon = (woundState: string) => {
    switch (woundState) {
      case 'dead': return <Skull className="w-4 h-4 text-destructive" />;
      case 'mortally-wounded': return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'seriously-wounded': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'lightly-wounded': return <Heart className="w-4 h-4 text-warning" />;
      default: return <Heart className="w-4 h-4 text-success" />;
    }
  };
  
  const getWoundClass = (woundState: string) => {
    return `wound-${woundState}`;
  };
  
  // Clickable Dice Component
  const ClickableDice = ({ notation, label }: { notation: string; label?: string }) => {
    const handleRoll = () => {
      if (onRollDamage) {
        onRollDamage(notation, label);
        return;
      }
      const result = rollDiceDetailed(notation);
      const critCount = result.rolls.filter(r => r === 6).length;
      const isCritical = critCount >= 2;
      const isTarotCrit = critMode === 'tarot' && critCount >= 3;
      
      if (isTarotCrit) {
        if (tarotDeck?.drawnThisSession) {
          toast.success(`🎲 CRITICAL! ${label ? `${label}: ` : ''}Rolled ${critCount} sixes! (Tarot limit reached - use RAW crit)`, {
            icon: <Sparkles className="w-5 h-5 text-warning" />
          });
        } else {
          toast.success(`🎴 NIGHT CITY TAROT! ${label ? `${label}: ` : ''}Rolled ${critCount} sixes! Draw a card!`, {
            icon: <LayoutPanelTop className="w-5 h-5 text-primary" />,
            duration: 10000
          });
        }
      } else if (isCritical) {
        toast.success(`🎲 CRITICAL! ${label ? `${label}: ` : ''}Rolled ${critCount} sixes! (+5 damage)`, {
          icon: <Sparkles className="w-5 h-5 text-warning" />
        });
      } else {
        toast.success(`${label ? `${label}: ` : ''}Rolled ${notation}: ${result.total}`);
      }
    };
    
    return (
      <button 
        onClick={handleRoll}
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary hover:bg-primary/20 hover:text-primary rounded font-mono text-xs transition-colors cursor-pointer"
        title="Click to roll"
      >
        <Dices className="w-3 h-3" />
        {notation}
      </button>
    );
  };
  
  // Roll Attack for a weapon
  const rollAttack = (participantId: string, weapon: Weapon) => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    let weaponSkill = 0;
    let baseRef = participant.ref;
    
    if (participant.isGoon) {
      // 3-Goon method: Combat number replaces REF + Skill
      baseRef = participant.combatNumber || 11;
      weaponSkill = 0; 
    } else {
      const skillName = weapon.system.weaponSkill || '';
      weaponSkill = participant.skills?.[skillName] || 0;
    }

    const attackMod = weapon.system.attackmod || 0;
    const rof = weapon.system.rof || 1;

    // Support ROF by rolling multiple times
    const attacks: Array<{ roll: number; total: number; weaponName: string }> = [];
    for (let i = 0; i < rof; i++) {
        attacks.push({ ...calculateAttackRoll(baseRef, weaponSkill, attackMod), weaponName: weapon.name });
    }

    setAttackRolls(prev => ({
      ...prev,
      [`${participantId}-${weapon._id}`]: attacks
    }));

    attacks.forEach((result, idx) => {
        const isCrit = result.roll === 10;
        const prefix = rof > 1 ? `[Shot ${idx + 1}] ` : '';
        const modStr = attackMod ? ` + Mod(${attackMod})` : '';
        const statsStr = participant.isGoon 
          ? `CN(${participant.combatNumber || 11})${modStr}`
          : `REF(${participant.ref}) + Skill(${weaponSkill})${modStr}`;

        if (isCrit) {
          toast.success(`🎲 ${prefix}CRITICAL ATTACK! ${weapon.name}: d10(${result.roll}) + ${statsStr} = ${result.total}`, {
            icon: <Sparkles className="w-5 h-5 text-warning" />
          });
        } else {
          toast.success(`${prefix}Attack Roll - ${weapon.name}: d10(${result.roll}) + ${statsStr} = ${result.total}`);
        }
    });
  };

  const rollAllNPCAttacks = () => {
    const npcs = participants.filter(p => !p.isPC && p.hp > 0);
    if (npcs.length === 0) {
      toast.info("No active NPCs to roll attacks for.");
      return;
    }
    
    let rollCount = 0;
    npcs.forEach(npc => {
      if (npc.weapons && npc.weapons.length > 0) {
        rollAttack(npc.id, npc.weapons[0]);
        rollCount++;
      }
    });
    
    if (rollCount > 0) {
      toast.success(`Rolled attacks for ${rollCount} NPCs!`, {
        icon: <Crosshair className="w-5 h-5 text-primary" />
      });
    }
  };

  // Auto-roll attacks on new round
  useEffect(() => {
    if (encounter.active && encounter.round > 0 && lastAutoRolledRound.current !== encounter.round) {
      lastAutoRolledRound.current = encounter.round;
      rollAllNPCAttacks();
    }
  }, [encounter.active, encounter.round]);
  
  // Attack Quick View Component with Attack Button
  const AttackQuickView = ({ participant }: { participant: Participant }) => {
    const weapons = participant.weapons;
    if (!weapons || weapons.length === 0) return <span className="text-muted-foreground text-xs">-</span>;

    return (
      <div className="flex flex-wrap gap-2">
        {weapons.map((weapon, idx) => {
          const attackKey = `${participant.id}-${weapon._id}`;
          const attackResult = attackRolls[attackKey];

          if (!attackResult || attackResult.length === 0) return null;

          return (
            <div key={idx} className="flex flex-col gap-1 bg-secondary/10 border border-border/50 rounded-md p-1.5 min-w-[60px] items-center">
                {!participant.isPC ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="text-[10px] text-muted-foreground hover:text-primary transition-colors focus:outline-none leading-none truncate max-w-[80px]" title="View details">
                      {formatWeaponCategory(weapon)}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="p-2">
                      <DropdownMenuLabel className="font-medium text-sm">
                        {weapon.name}
                      </DropdownMenuLabel>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="text-[10px] text-muted-foreground leading-none truncate max-w-[80px]" title={weapon.name}>
                    {weapon.name}
                  </span>
                )}
              <div className="flex gap-1 flex-wrap justify-center">
                {attackResult.map((res, i) => (
                  <div key={i} className={`flex items-center justify-center w-7 h-7 rounded border shadow-sm ${res.roll === 10 ? 'bg-warning/20 border-warning text-warning' : 'bg-background border-border'}`}>
                    <span className="font-mono font-bold text-sm" title={`Roll: ${res.roll}`}>{res.total}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Weapon Quick View just lists weapons
  const WeaponQuickView = ({ participant }: { participant: Participant }) => {
    const weapons = participant.weapons;
    if (!weapons || weapons.length === 0) return <span className="text-muted-foreground text-xs">-</span>;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {weapons.map((weapon, idx) => (
          <div key={idx} className="text-xs">
            <div className="flex items-center gap-1.5 flex-nowrap bg-secondary/10 p-1.5 rounded-md">
              <Target className="w-3 h-3 text-primary" />
                {!participant.isPC ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="font-medium truncate max-w-[100px] hover:text-primary transition-colors focus:outline-none" title="View details">
                      {formatWeaponCategory(weapon)}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="p-2">
                      <DropdownMenuLabel className="font-medium text-sm">
                        {weapon.name}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="text-xs text-muted-foreground px-2 py-1 space-y-1">
                        <p>Skill: {weapon.system.weaponSkill || 'N/A'}</p>
                        <p>Damage: {weapon.system.damage || 'N/A'}</p>
                        <p>ROF: {weapon.system.rof || 1}</p>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="font-medium truncate max-w-[100px]" title={weapon.name}>
                    {weapon.name}
                  </span>
                )}

              {/* Attack Roll Button */}
              <button
                onClick={() => rollAttack(participant.id, weapon)}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/20 hover:bg-primary/40 text-primary rounded font-mono text-xs transition-colors"
                title="Roll Attack"
              >
                <Zap className="w-3 h-3" />
                ATK
              </button>

              {/* Damage Dice */}
              {weapon.system.damage && <ClickableDice notation={weapon.system.damage} label="DMG" />}

              {weapon.system.rof && (
                <span className="px-1.5 py-0.5 bg-secondary rounded font-mono">ROF:{weapon.system.rof}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Add Participant Form */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Plus className="w-5 h-5 text-primary" />
          Add Participant
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="col-span-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Name</label>
            <Input
              value={newParticipant.name}
              onChange={e => setNewParticipant(p => ({ ...p, name: e.target.value }))}
              placeholder="Character name"
              className="cyber-input"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">REF</label>
            <Input
              type="number"
              value={newParticipant.ref}
              onChange={e => setNewParticipant(p => ({ ...p, ref: parseInt(e.target.value) || 0 }))}
              className="cyber-input"
              min={1}
              max={10}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Initiative</label>
            <Input
              type="number"
              value={newParticipant.initiativeSkill}
              onChange={e => setNewParticipant(p => ({ ...p, initiativeSkill: parseInt(e.target.value) || 0 }))}
              className="cyber-input"
              min={0}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">HP</label>
            <Input
              type="number"
              value={newParticipant.hp}
              onChange={e => setNewParticipant(p => ({ ...p, hp: parseInt(e.target.value) || 1 }))}
              className="cyber-input"
              min={1}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAdd} className="cyber-btn w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newParticipant.isPC}
              onChange={e => setNewParticipant(p => ({ ...p, isPC: e.target.checked }))}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm">This is a Player Character</span>
          </label>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        {encounter.active && (
          <Button onClick={rollAllNPCAttacks} className="gap-2 cyber-btn bg-destructive/80 hover:bg-destructive text-destructive-foreground">
            <Crosshair className="w-4 h-4" />
            NPC Attacks
          </Button>
        )}
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-primary/20">
              <Info className="w-4 h-4" />
              Range DVs
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] md:max-w-3xl max-h-[85vh] overflow-y-auto cyber-panel p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold font-display text-primary mb-4">
                Range DV Reference
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-sm space-y-6 text-foreground/90">
              <p><strong>To hit a target with a ranged attack:</strong> REF + Relevant Weapon Skill + 1d10 must beat the Difficulty Value (DV) listed for the weapon at that specific range.</p>
              
              <div className="space-y-2">
                <h3 className="text-primary font-bold">Single Shot DVs</h3>
                <div className="overflow-x-auto border border-border rounded-md">
                  <table className="w-full text-left text-xs bg-card">
                    <thead className="bg-secondary/20">
                      <tr>
                        <th className="p-2 border-b">Weapon Type</th>
                        <th className="p-2 border-b">0-6m</th>
                        <th className="p-2 border-b">7-12m</th>
                        <th className="p-2 border-b">13-25m</th>
                        <th className="p-2 border-b">26-50m</th>
                        <th className="p-2 border-b">51-100m</th>
                        <th className="p-2 border-b">101-200m</th>
                        <th className="p-2 border-b">201-400m</th>
                        <th className="p-2 border-b">401-800m</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50"><td className="p-2 font-bold">Pistol</td><td className="p-2">13</td><td className="p-2">15</td><td className="p-2">20</td><td className="p-2">25</td><td className="p-2">30</td><td className="p-2">30</td><td className="p-2">-</td><td className="p-2">-</td></tr>
                      <tr className="border-b border-border/50"><td className="p-2 font-bold">SMG</td><td className="p-2">15</td><td className="p-2">13</td><td className="p-2">15</td><td className="p-2">20</td><td className="p-2">25</td><td className="p-2">25</td><td className="p-2">30</td><td className="p-2">-</td></tr>
                      <tr className="border-b border-border/50"><td className="p-2 font-bold">Shotgun (Slug)</td><td className="p-2">13</td><td className="p-2">15</td><td className="p-2">20</td><td className="p-2">25</td><td className="p-2">30</td><td className="p-2">35</td><td className="p-2">-</td><td className="p-2">-</td></tr>
                      <tr className="border-b border-border/50"><td className="p-2 font-bold">Assault Rifle</td><td className="p-2">17</td><td className="p-2">16</td><td className="p-2">15</td><td className="p-2">13</td><td className="p-2">15</td><td className="p-2">20</td><td className="p-2">25</td><td className="p-2">30</td></tr>
                      <tr className="border-b border-border/50"><td className="p-2 font-bold">Sniper Rifle</td><td className="p-2">30</td><td className="p-2">25</td><td className="p-2">25</td><td className="p-2">20</td><td className="p-2">15</td><td className="p-2">16</td><td className="p-2">17</td><td className="p-2">20</td></tr>
                      <tr className="border-b border-border/50"><td className="p-2 font-bold">Bows/Crossbows</td><td className="p-2">15</td><td className="p-2">13</td><td className="p-2">15</td><td className="p-2">17</td><td className="p-2">20</td><td className="p-2">22</td><td className="p-2">-</td><td className="p-2">-</td></tr>
                      <tr className="border-b border-border/50"><td className="p-2 font-bold">Grenade Launcher</td><td className="p-2">16</td><td className="p-2">15</td><td className="p-2">15</td><td className="p-2">17</td><td className="p-2">20</td><td className="p-2">22</td><td className="p-2">25</td><td className="p-2">-</td></tr>
                      <tr className="border-b border-border/50"><td className="p-2 font-bold">Rocket Launcher</td><td className="p-2">17</td><td className="p-2">16</td><td className="p-2">15</td><td className="p-2">15</td><td className="p-2">20</td><td className="p-2">20</td><td className="p-2">25</td><td className="p-2">30</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-secondary font-bold">Autofire DVs (Core)</h3>
                  <div className="overflow-x-auto border border-border rounded-md">
                    <table className="w-full text-left text-xs bg-card">
                      <thead className="bg-secondary/20">
                        <tr>
                          <th className="p-2 border-b">Type</th>
                          <th className="p-2 border-b">0-6m</th>
                          <th className="p-2 border-b">7-12m</th>
                          <th className="p-2 border-b">13-25m</th>
                          <th className="p-2 border-b">26-50m</th>
                          <th className="p-2 border-b">51-100m</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/50"><td className="p-2 font-bold">SMG</td><td className="p-2">15</td><td className="p-2">13</td><td className="p-2">15</td><td className="p-2">20</td><td className="p-2">25</td></tr>
                        <tr className="border-b border-border/50"><td className="p-2 font-bold">AR</td><td className="p-2">17</td><td className="p-2">16</td><td className="p-2">15</td><td className="p-2">13</td><td className="p-2">15</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-secondary font-bold">Autofire DVs (Edgerunners DLC)</h3>
                  <div className="overflow-x-auto border border-border rounded-md">
                    <table className="w-full text-left text-xs bg-card">
                      <thead className="bg-secondary/20">
                        <tr>
                          <th className="p-2 border-b">Type</th>
                          <th className="p-2 border-b">0-6m</th>
                          <th className="p-2 border-b">7-12m</th>
                          <th className="p-2 border-b">13-25m</th>
                          <th className="p-2 border-b">26-50m</th>
                          <th className="p-2 border-b">51-100m</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/50"><td className="p-2 font-bold">SMG</td><td className="p-2">20</td><td className="p-2">17</td><td className="p-2">20</td><td className="p-2">25</td><td className="p-2">30</td></tr>
                        <tr className="border-b border-border/50"><td className="p-2 font-bold">AR</td><td className="p-2">22</td><td className="p-2">20</td><td className="p-2">17</td><td className="p-2">20</td><td className="p-2">25</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-muted-foreground font-bold">Thrown Weapons</h3>
                <p className="text-xs">Cannot throw further than 25m. Attack is resolved using the <strong>Athletics</strong> skill.</p>
                <div className="border border-border rounded-md max-w-sm">
                  <table className="w-full text-left text-xs bg-card">
                    <thead className="bg-secondary/20">
                      <tr><th className="p-2 border-b">Range</th><th className="p-2 border-b">DV</th></tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50"><td className="p-2 font-bold">0-6m</td><td className="p-2">16</td></tr>
                      <tr className="border-b border-border/50"><td className="p-2 font-bold">7-25m</td><td className="p-2">15</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button onClick={onRollAll} variant="outline" className="gap-2">
          <Dices className="w-4 h-4" />
          Roll NPCs
        </Button>
        {onRollAllWithPCs && (
          <Button onClick={onRollAllWithPCs} variant="outline" className="gap-2">
            <Dices className="w-4 h-4" />
            Roll All
          </Button>
        )}
        <Button onClick={onClearRolls} variant="outline" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Clear Rolls
        </Button>
        {!encounter.active && (
          <Button onClick={onStartEncounter} className="cyber-btn gap-2">
            <Play className="w-4 h-4" />
            Start Encounter
          </Button>
        )}
        <Button onClick={onSaveEncounter} variant="outline" className="gap-2">
          <Save className="w-4 h-4" />
          Save
        </Button>
        <Button onClick={() => setShowSaved(!showSaved)} variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          {showSaved ? 'Hide Saved' : 'Load'}
        </Button>
      </div>
      
      {/* Saved Encounters */}
      {showSaved && (
        <div className="glass-card rounded-xl p-4 animate-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Saved Encounters</h3>
            <div className="flex gap-2">
              <Button onClick={onExportEncounters} variant="outline" size="sm" disabled={savedEncounters.length === 0}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportEncounters}
                  className="hidden"
                />
                <span className="inline-flex items-center px-3 py-1.5 text-sm border rounded-md hover:bg-secondary">
                  <Upload className="w-4 h-4 mr-1" />
                  Import
                </span>
              </label>
            </div>
          </div>
          {savedEncounters.length === 0 ? (
            <p className="text-muted-foreground text-sm">No saved encounters</p>
          ) : (
            <div className="space-y-2">
              {savedEncounters.map(saved => (
                <div key={saved.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium">{saved.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {saved.participants.length} participants • {new Date(saved.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => onLoadEncounter(saved)} size="sm" variant="outline">
                      Load
                    </Button>
                    <Button onClick={() => onDeleteEncounter(saved.id)} size="sm" variant="destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Participants Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Users className="w-5 h-5 text-primary" />
            Participants ({participants.length})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table ref={tableRef} className="data-grid w-full">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Name</th>
                  <th className="text-center">REF/TIER</th>
                  <th className="text-center">INIT</th>
                <th className="text-center">HP</th>
                <th className="text-center">Armor</th>
                  <th className="min-w-[150px] max-w-[400px]">Weapons</th>
                  <th className="text-center">Status</th>
                  <th className="min-w-[100px] max-w-[350px]">Attacks</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orderedParticipants.map(participant => {
                const isCurrentTurn = encounter.active && activeTurnParticipant?.id === participant.id;
                const isExpanded = expandedRows.has(participant.id);
                
                return (
                  <React.Fragment key={participant.id}>
                    <tr 
                      className={`${getWoundClass(participant.woundState)} ${isCurrentTurn ? 'bg-primary/20 border-l-2 border-l-primary' : ''}`}
                    >
                      <td>
                        <button 
                          onClick={() => toggleExpanded(participant.id)}
                          className="p-1 hover:bg-secondary rounded"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {participant.isPC ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-muted-foreground" />}
                          <span className={isCurrentTurn ? 'font-bold text-primary' : ''}>{participant.name}</span>
                          {isCurrentTurn && <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">TURN</span>}
                        </div>
                      </td>
                      <td className="text-center">
                        {participant.isGoon ? (
                          <div className="flex flex-col items-center justify-center leading-tight">
                            <span className="font-bold text-accent capitalize text-xs">{participant.tier}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">CN:{participant.combatNumber} NC:{participant.nonCombatNumber}</span>
                          </div>
                        ) : (
                          participant.ref
                        )}
                      </td>
                      <td className="text-center">
                        {participant.isPC ? (
                          <Input
                            type="number"
                            value={participant.total ?? ''}
                            onChange={e => onUpdateParticipant(participant.id, { total: parseInt(e.target.value) || 0 })}
                            placeholder="INIT"
                            className="w-16 mx-auto text-center cyber-input py-1 font-bold"
                            title="Player's total initiative"
                          />
                        ) : (
                          <span className="font-mono font-bold">{participant.total ?? '-'}</span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type="number"
                            value={participant.hp}
                            onChange={e => onUpdateParticipant(participant.id, { hp: parseInt(e.target.value) || 0 })}
                            className={`w-16 text-center cyber-input py-1 ${participant.hp <= participant.maxHp * 0.25 ? 'border-destructive' : ''}`}
                          />
                          <span className="text-muted-foreground">/</span>
                          <span className="text-muted-foreground w-8">{participant.maxHp}</span>
                        </div>
                      </td>
                      <td className="text-center">
                        {participant.armor ? (
                          <div className="text-xs space-y-1">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-muted-foreground">H:</span>
                              <Input
                                type="number"
                                value={participant.armor.head}
                                onChange={e => onUpdateParticipant(participant.id, {
                                  armor: { ...participant.armor!, head: parseInt(e.target.value) || 0 }
                                })}
                                className="w-10 text-center cyber-input py-0.5 text-xs h-6"
                                title="Head Armor SP (ablation reduces this)"
                              />
                              <span className="text-muted-foreground">B:</span>
                              <Input
                                type="number"
                                value={participant.armor.body}
                                onChange={e => onUpdateParticipant(participant.id, {
                                  armor: { ...participant.armor!, body: parseInt(e.target.value) || 0 }
                                })}
                                className="w-10 text-center cyber-input py-0.5 text-xs h-6"
                                title="Body Armor SP (ablation reduces this)"
                              />
                            </div>
                            {participant.armor.shield && participant.armor.shield > 0 && (
                              <div className="text-muted-foreground flex items-center justify-center gap-1">
                                <span>S:</span>
                                <Input
                                  type="number"
                                  value={participant.armor.shield}
                                  onChange={e => onUpdateParticipant(participant.id, {
                                    armor: { ...participant.armor!, shield: parseInt(e.target.value) || 0 }
                                  })}
                                  className="w-10 text-center cyber-input py-0.5 text-xs h-6"
                                  title="Shield SP"
                                />
                                <button
                                  onClick={() => onUpdateParticipant(participant.id, {
                                    armor: { ...participant.armor!, shieldEquipped: !participant.armor!.shieldEquipped }
                                  })}
                                  className="text-xs"
                                  title={participant.armor.shieldEquipped ? 'Unequip shield' : 'Equip shield'}
                                >
                                  {participant.armor.shieldEquipped ? '🛡️' : '🚫'}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </td>
                        <td>
                          <WeaponQuickView participant={participant} />
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {getWoundIcon(participant.woundState)}
                            <span className="text-xs capitalize">{participant.woundState.replace(/-/g, ' ')}</span>
                          </div>
                        </td>
                        <td>
                          <AttackQuickView participant={participant} />
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            onClick={() => onOpenDamageDialog(participant)}
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                          >
                            <Crosshair className="w-3 h-3 mr-1" />
                            Damage
                          </Button>
                          <Button 
                            onClick={() => onRemoveParticipant(participant.id)}
                            size="sm"
                            variant="destructive"
                            className="h-8 px-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <tr className="bg-secondary/30">
                        <td colSpan={11} className="p-4">
                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Armor Editor */}
                            <div>
                              <label className="text-xs uppercase text-muted-foreground">Head Armor SP</label>
                              <Input
                                type="number"
                                value={participant.armor?.head || 0}
                                onChange={e => onUpdateParticipant(participant.id, {
                                  armor: { ...(participant.armor || { head: 0, body: 0 }), head: parseInt(e.target.value) || 0 }
                                })}
                                className="cyber-input mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs uppercase text-muted-foreground">Body Armor SP</label>
                              <Input
                                type="number"
                                value={participant.armor?.body || 0}
                                onChange={e => onUpdateParticipant(participant.id, {
                                  armor: { ...(participant.armor || { head: 0, body: 0 }), body: parseInt(e.target.value) || 0 }
                                })}
                                className="cyber-input mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs uppercase text-muted-foreground">Shield SP</label>
                              <Input
                                type="number"
                                value={participant.armor?.shield || 0}
                                onChange={e => onUpdateParticipant(participant.id, {
                                  armor: { ...(participant.armor || { head: 0, body: 0 }), shield: parseInt(e.target.value) || 0 }
                                })}
                                className="cyber-input mt-1"
                              />
                            </div>
                            <div className="flex items-end">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={participant.armor?.shieldEquipped || false}
                                  onChange={e => onUpdateParticipant(participant.id, {
                                    armor: { ...(participant.armor || { head: 0, body: 0 }), shieldEquipped: e.target.checked }
                                  })}
                                  className="w-4 h-4 accent-primary"
                                />
                                <span className="text-sm">Shield Equipped</span>
                              </label>
                            </div>
                          </div>
                          
                          {/* Cover */}
                          <div className="mt-4">
                            <label className="text-xs uppercase text-muted-foreground">Cover</label>
                            <div className="flex gap-2 mt-1">
                              {(['light', 'medium', 'heavy', 'human-shield'] as const).map(type => (
                                <Button
                                  key={type}
                                  onClick={() => onUpdateParticipant(participant.id, {
                                    cover: participant.cover?.type === type ? undefined : {
                                      type,
                                      hp: type === 'light' ? 10 : type === 'medium' ? 15 : type === 'heavy' ? 20 : 40,
                                      maxHp: type === 'light' ? 10 : type === 'medium' ? 15 : type === 'heavy' ? 20 : 40
                                    }
                                  })}
                                  variant={participant.cover?.type === type ? 'default' : 'outline'}
                                  size="sm"
                                >
                                  {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                                </Button>
                              ))}
                            </div>
                            {participant.cover && (
                              <div className="mt-2 flex items-center gap-4">
                                <span className="text-sm">Cover HP: {participant.cover.hp}/{participant.cover.maxHp}</span>
                                <Button 
                                  onClick={() => onUpdateParticipant(participant.id, { cover: undefined })}
                                  variant="destructive"
                                  size="sm"
                                >
                                  Remove Cover
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {/* Notes */}
                          <div className="mt-4">
                            <label className="text-xs uppercase text-muted-foreground">Notes</label>
                            <Input
                              value={participant.notes || ''}
                              onChange={e => onUpdateParticipant(participant.id, { notes: e.target.value })}
                              placeholder="Add notes..."
                              className="cyber-input mt-1"
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              
              {participants.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-muted-foreground">
                    No participants yet. Add some to start tracking!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Help text */}
      <p className="text-sm text-muted-foreground">
        <strong>RAW:</strong> Initiative = 1d10 + REF + Initiative skill. Rounds = 10 seconds. Attack = 1d10 + REF + Skill. Seriously Wounded and Dead participants are skipped automatically.
      </p>
    </div>
  );
}
