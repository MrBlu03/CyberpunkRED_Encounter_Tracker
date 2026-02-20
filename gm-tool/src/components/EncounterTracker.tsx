import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { 
  Plus, Trash2, Save, Upload, Download, Dices, Play, RotateCcw, 
  Skull, Heart, Crosshair, ChevronDown, ChevronUp,
  User, Bot, AlertTriangle, Users, Target, Sparkles, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { rollDiceDetailed, d10 } from '@/lib/dice';
import type { Participant, EncounterState, SavedEncounter, Weapon } from '@/types';

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
  onOpenDamageDialog: (participant: Participant) => void;
}

// Attack roll calculation: d10 + REF + Weapon Skill + Weapon Attack Mod
const calculateAttackRoll = (ref: number, weaponSkill: number = 0, attackMod: number = 0): { roll: number; total: number } => {
  const roll = d10();
  return { roll, total: roll + ref + weaponSkill + attackMod };
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
  onOpenDamageDialog
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
  const [attackRolls, setAttackRolls] = useState<Record<string, { roll: number; total: number; weaponName: string }>>({});
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
      const result = rollDiceDetailed(notation);
      const critCount = result.rolls.filter(r => r === 6).length;
      const isCritical = critCount > 0;
      
      if (isCritical) {
        toast.success(`🎲 CRITICAL! ${label ? `${label}: ` : ''}Rolled ${critCount} six${critCount > 1 ? 'es' : ''}! Total: ${result.total}`, {
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
    
    const weaponSkill = 0; // Could be expanded to track skills per participant
    const attackMod = weapon.system.attackmod || 0;
    const result = calculateAttackRoll(participant.ref, weaponSkill, attackMod);
    
    setAttackRolls(prev => ({
      ...prev,
      [`${participantId}-${weapon._id}`]: { ...result, weaponName: weapon.name }
    }));
    
    const isCrit = result.roll === 6;
    if (isCrit) {
      toast.success(`🎲 CRITICAL ATTACK! ${weapon.name}: d10(${result.roll}) + REF(${participant.ref}) = ${result.total}`, {
        icon: <Sparkles className="w-5 h-5 text-warning" />
      });
    } else {
      toast.success(`Attack Roll - ${weapon.name}: d10(${result.roll}) + REF(${participant.ref}) = ${result.total}`);
    }
  };
  
  // Weapon Range Display Component
  const WeaponRangeChart = ({ weapon }: { weapon: { name: string; system: { damage?: string; rof?: number; ranges?: Record<string, { range: number; dv: number }> } } }) => {
    const ranges = weapon.system.ranges;
    if (!ranges) return null;
    
    const rangeEntries = Object.entries(ranges).filter(([_, data]) => data && typeof data === 'object');
    if (rangeEntries.length === 0) return null;
    
    return (
      <div className="mt-1 text-xs">
        <div className="flex gap-1 flex-wrap">
          {rangeEntries.map(([name, data]) => (
            <div key={name} className="bg-background/50 rounded px-1.5 py-0.5 text-center">
              <span className="text-muted-foreground uppercase text-[9px]">{name.slice(0,2)}</span>
              <span className="font-mono ml-1">{data.range}m</span>
              <span className="text-primary font-bold ml-1">DV{data.dv}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Weapon Quick View Component with Attack Button
  const WeaponQuickView = ({ participant }: { participant: Participant }) => {
    const weapons = participant.weapons;
    if (!weapons || weapons.length === 0) return <span className="text-muted-foreground text-xs">-</span>;
    
    return (
      <div className="space-y-1">
        {weapons.map((weapon, idx) => {
          const attackKey = `${participant.id}-${weapon._id}`;
          const attackResult = attackRolls[attackKey];
          
          return (
            <div key={idx} className="text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <Target className="w-3 h-3 text-primary" />
                <span className="font-medium">{weapon.name}</span>
                
                {/* Attack Roll Button */}
                <button
                  onClick={() => rollAttack(participant.id, weapon)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/20 hover:bg-primary/40 text-primary rounded font-mono text-xs transition-colors"
                  title="Roll Attack"
                >
                  <Zap className="w-3 h-3" />
                  ATK
                </button>
                
                {/* Show Attack Result */}
                {attackResult && (
                  <span className={`px-2 py-0.5 rounded font-mono font-bold ${attackResult.roll === 6 ? 'bg-warning/30 text-warning' : 'bg-secondary'}`}>
                    {attackResult.total}
                  </span>
                )}
                
                {/* Damage Dice */}
                {weapon.system.damage && <ClickableDice notation={weapon.system.damage} label="DMG" />}
                
                {weapon.system.rof && (
                  <span className="px-1.5 py-0.5 bg-secondary rounded font-mono">ROF:{weapon.system.rof}</span>
                )}
              </div>
              <WeaponRangeChart weapon={weapon} />
            </div>
          );
        })}
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
                <th className="text-center">REF</th>
                <th className="text-center">Init</th>
                <th className="text-center">Roll</th>
                <th className="text-center">Total</th>
                <th className="text-center">HP</th>
                <th className="text-center">Armor</th>
                <th>Weapons</th>
                <th className="text-center">Status</th>
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
                      className={`${getWoundClass(participant.woundState)} ${isCurrentTurn ? 'pulse-glow bg-primary/10' : ''}`}
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
                      <td className="text-center">{participant.ref}</td>
                      <td className="text-center">{participant.initiativeSkill}</td>
                      <td className="text-center">
                        {participant.isPC ? (
                          <Input
                            type="number"
                            value={participant.rolled ?? ''}
                            onChange={e => {
                              const roll = parseInt(e.target.value) || 0;
                              const total = roll + participant.ref + participant.initiativeSkill;
                              onUpdateParticipant(participant.id, { rolled: roll, total });
                            }}
                            placeholder="d10"
                            className="w-14 mx-auto text-center cyber-input py-1 text-xs"
                            title="Enter player's d10 roll"
                          />
                        ) : (
                          <span className="font-mono">{participant.rolled ?? '-'}</span>
                        )}
                      </td>
                      <td className="text-center">
                        {participant.isPC ? (
                          <Input
                            type="number"
                            value={participant.total ?? ''}
                            onChange={e => onUpdateParticipant(participant.id, { total: parseInt(e.target.value) || 0 })}
                            placeholder="Total"
                            className="w-16 mx-auto text-center cyber-input py-1 font-bold"
                            title="Player's total initiative (auto-calculated from roll)"
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
                      <td className="min-w-[200px]">
                        <WeaponQuickView participant={participant} />
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getWoundIcon(participant.woundState)}
                          <span className="text-xs capitalize">{participant.woundState.replace(/-/g, ' ')}</span>
                        </div>
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
