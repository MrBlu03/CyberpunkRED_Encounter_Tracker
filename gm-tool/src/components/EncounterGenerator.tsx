import { useState, useEffect } from 'react';
import { 
  Users, Plus, Trash2, Save, Bot, Crosshair, 
  Wrench, ChevronDown, ChevronUp, Sparkles, LayoutPanelTop
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { Participant, CritMode, TarotDeckState } from '@/types';

interface EncounterGeneratorProps {
  onAddToEncounter?: (participants: Participant[]) => void;
  critMode?: CritMode;
  tarotDeck?: TarotDeckState;
}

interface EncounterParticipant {
  id: string;
  name: string;
  type: 'enemy' | 'turret' | 'drone' | 'vehicle' | 'bot';
  count: number;
  difficulty: 'easy' | 'moderate' | 'hard' | 'very-hard';
  hp?: number;
  ref?: number;
  initiative?: number;
  armor?: { head: number; body: number };
  weapons?: string[];
}

interface EncounterTemplate {
  name: string;
  description: string;
  enemyCount: { min: number; max: number };
  difficulty: 'easy' | 'moderate' | 'hard' | 'very-hard';
  includeTurrets: boolean;
  turretCount: number;
  includeDrones: boolean;
  droneCount: number;
  enemyTypes: string[];
  location: string;
}

const ENCOUNTER_TEMPLATES: EncounterTemplate[] = [
  {
    name: 'Street Gang Ambush',
    description: 'A group of gangers looking for trouble',
    enemyCount: { min: 3, max: 6 },
    difficulty: 'easy',
    includeTurrets: false,
    turretCount: 0,
    includeDrones: false,
    droneCount: 0,
    enemyTypes: ['Ganger', 'Thug', 'Street Rat'],
    location: 'Street'
  },
  {
    name: 'Corporate Security',
    description: 'Corporate security team with tactical support',
    enemyCount: { min: 4, max: 8 },
    difficulty: 'moderate',
    includeTurrets: true,
    turretCount: 1,
    includeDrones: true,
    droneCount: 2,
    enemyTypes: ['Corpo Security', 'Solo', 'Techie'],
    location: 'Corporate Facility'
  },
  {
    name: 'High-Security Compound',
    description: 'Heavily defended facility with automated defenses',
    enemyCount: { min: 6, max: 10 },
    difficulty: 'hard',
    includeTurrets: true,
    turretCount: 3,
    includeDrones: true,
    droneCount: 4,
    enemyTypes: ['Elite Solo', 'Corpo Security', 'Boss'],
    location: 'Secure Compound'
  },
  {
    name: 'Cyberpsycho Hunt',
    description: 'A dangerous cyberpsycho with minions',
    enemyCount: { min: 2, max: 4 },
    difficulty: 'very-hard',
    includeTurrets: false,
    turretCount: 0,
    includeDrones: true,
    droneCount: 2,
    enemyTypes: ['Cyber Psycho', 'Ganger'],
    location: 'Combat Zone'
  }
];

// Automated unit stats
const AUTOMATED_UNIT_STATS: Record<string, { hp: number; armor: number; ref: number; weapons: string[] }> = {
  turret: { hp: 25, armor: 15, ref: 8, weapons: ['Assault Rifle'] },
  drone: { hp: 15, armor: 7, ref: 10, weapons: ['Heavy Pistol'] },
  vehicle: { hp: 50, armor: 25, ref: 6, weapons: ['Assault Rifle', 'Heavy Pistol'] },
  bot: { hp: 25, armor: 11, ref: 6, weapons: ['Heavy Pistol'] }
};

// Difficulty modifiers
const DIFFICULTY_MODS = {
  easy: { statMod: -2, hpMod: 0.8, armorMod: 0 },
  moderate: { statMod: 0, hpMod: 1, armorMod: 2 },
  hard: { statMod: 2, hpMod: 1.2, armorMod: 4 },
  'very-hard': { statMod: 4, hpMod: 1.5, armorMod: 6 }
};

export function EncounterGenerator({ 
  onAddToEncounter,
  critMode = 'raw',
  tarotDeck
}: EncounterGeneratorProps) {
  const [participants, setParticipants] = useState<EncounterParticipant[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [manualEntry, setManualEntry] = useState<EncounterParticipant>({
    id: '',
    name: '',
    type: 'enemy',
    count: 1,
    difficulty: 'moderate',
    hp: 25,
    ref: 6,
    initiative: 0
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [shopWeapons, setShopWeapons] = useState<any[]>([]);
  
  // Load shop weapons
  useEffect(() => {
    loadShopData();
  }, []);
  
  const loadShopData = async () => {
    try {
      const response = await fetch('/data/core.json');
      const data = await response.json();
      if (Array.isArray(data)) {
        const seenIds = new Set<string>();
        const weapons = data.filter((item: any) => {
          if (item.type === 'weapon' && item._id) {
            if (seenIds.has(item._id)) return false;
            seenIds.add(item._id);
            return true;
          }
          return false;
        });
        setShopWeapons(weapons);
      }
    } catch (error) {
      console.error('Failed to load shop data:', error);
    }
  };
  
  // Generate participants from template
  const generateFromTemplate = (templateIndex: number) => {
    const template = ENCOUNTER_TEMPLATES[templateIndex];
    const diffMod = DIFFICULTY_MODS[template.difficulty];
    const newParticipants: EncounterParticipant[] = [];
    
    // Generate enemies
    const enemyCount = Math.floor(Math.random() * (template.enemyCount.max - template.enemyCount.min + 1)) + template.enemyCount.min;
    
    for (let i = 0; i < enemyCount; i++) {
      const enemyType = template.enemyTypes[Math.floor(Math.random() * template.enemyTypes.length)];
      const baseHp = 25;
      const baseRef = 6;
      
      newParticipants.push({
        id: crypto.randomUUID(),
        name: `${enemyType} ${i + 1}`,
        type: 'enemy',
        count: 1,
        difficulty: template.difficulty,
        hp: Math.floor(baseHp * diffMod.hpMod),
        ref: Math.min(10, Math.max(2, baseRef + diffMod.statMod)),
        initiative: Math.floor(Math.random() * 5),
        armor: { head: diffMod.armorMod, body: diffMod.armorMod + 4 }
      });
    }
    
    // Generate turrets
    if (template.includeTurrets) {
      for (let i = 0; i < template.turretCount; i++) {
        newParticipants.push({
          id: crypto.randomUUID(),
          name: `Turret ${i + 1}`,
          type: 'turret',
          count: 1,
          difficulty: template.difficulty,
          hp: AUTOMATED_UNIT_STATS.turret.hp,
          ref: AUTOMATED_UNIT_STATS.turret.ref,
          initiative: AUTOMATED_UNIT_STATS.turret.ref,
          armor: { head: 0, body: AUTOMATED_UNIT_STATS.turret.armor },
          weapons: AUTOMATED_UNIT_STATS.turret.weapons
        });
      }
    }
    
    // Generate drones
    if (template.includeDrones) {
      for (let i = 0; i < template.droneCount; i++) {
        newParticipants.push({
          id: crypto.randomUUID(),
          name: `Drone ${i + 1}`,
          type: 'drone',
          count: 1,
          difficulty: template.difficulty,
          hp: AUTOMATED_UNIT_STATS.drone.hp,
          ref: AUTOMATED_UNIT_STATS.drone.ref,
          initiative: AUTOMATED_UNIT_STATS.drone.ref,
          armor: { head: 0, body: AUTOMATED_UNIT_STATS.drone.armor },
          weapons: AUTOMATED_UNIT_STATS.drone.weapons
        });
      }
    }
    
    setParticipants(newParticipants);
    toast.success(`Generated ${newParticipants.length} participants from template`);
  };
  
  // Add manual participant
  const addManualParticipant = () => {
    if (!manualEntry.name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    const newParticipant: EncounterParticipant = {
      ...manualEntry,
      id: crypto.randomUUID(),
      name: manualEntry.name
    };
    
    // Set default stats for automated units
    if (manualEntry.type !== 'enemy' && AUTOMATED_UNIT_STATS[manualEntry.type]) {
      const stats = AUTOMATED_UNIT_STATS[manualEntry.type];
      newParticipant.hp = stats.hp;
      newParticipant.ref = stats.ref;
      newParticipant.initiative = stats.ref;
      newParticipant.armor = { head: 0, body: stats.armor };
      newParticipant.weapons = stats.weapons;
    }
    
    setParticipants(prev => [...prev, newParticipant]);
    setManualEntry({
      id: '',
      name: '',
      type: 'enemy',
      count: 1,
      difficulty: 'moderate',
      hp: 25,
      ref: 6,
      initiative: 0
    });
    toast.success(`Added ${newParticipant.name}`);
  };
  
  // Remove participant
  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };
  
  // Clear all participants
  const clearAll = () => {
    setParticipants([]);
    setSelectedTemplate(null);
  };
  
  // Convert to encounter participants and add
  const addToEncounter = () => {
    if (participants.length === 0) {
      toast.error('No participants to add');
      return;
    }
    
    const encounterParticipants: Participant[] = [];
    
    participants.forEach(p => {
      // Add multiple if count > 1
      for (let i = 0; i < p.count; i++) {
        const name = p.count > 1 ? `${p.name} ${i + 1}` : p.name;
        
        // Find weapons from shop
        const weapons: import('@/types').Weapon[] = [];
        p.weapons?.forEach(wName => {
          const shopWeapon = shopWeapons.find((w: any) => 
            w.name.toLowerCase().includes(wName.toLowerCase().split(' ')[0])
          );
          if (shopWeapon) {
            weapons.push({
              _id: shopWeapon._id,
              name: shopWeapon.name,
              system: {
                damage: shopWeapon.system.damage || '2d6',
                weaponSkill: shopWeapon.system.weaponSkill || 'Handgun',
                attackmod: shopWeapon.system.attackmod || 0,
                rof: shopWeapon.system.rof,
                ranges: shopWeapon.system.ranges
              }
            });
          }
        });
        
        encounterParticipants.push({
          id: crypto.randomUUID(),
          name,
          ref: p.ref || 6,
          initiativeSkill: p.initiative || 0,
          hp: p.hp || 25,
          maxHp: p.hp || 25,
          dead: false,
          woundState: 'not-wounded',
          isPC: false,
          armor: p.armor || { head: 0, body: 0 },
          weapons: weapons.length > 0 ? weapons : undefined
        });
      }
    });
    
    if (onAddToEncounter) {
      onAddToEncounter(encounterParticipants);
      toast.success(`Added ${encounterParticipants.length} participants to encounter`);
    }
  };
  
  // Toggle expanded row
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
  
  // Get icon for participant type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'turret': return <Crosshair className="w-4 h-4 text-destructive" />;
      case 'drone': return <Bot className="w-4 h-4 text-cyan-400" />;
      case 'vehicle': return <Wrench className="w-4 h-4 text-warning" />;
      case 'bot': return <Bot className="w-4 h-4 text-muted-foreground" />;
      default: return <Crosshair className="w-4 h-4 text-primary" />;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Advanced Encounter Generator
          </h2>
          <p className="text-sm text-muted-foreground">
            Build encounters with templates or manual entry
          </p>
        </div>
      </div>
      
      {/* Templates */}
      <div className="glass-card rounded-xl p-4">
        <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
          Quick Templates
        </label>
        <div className="grid md:grid-cols-2 gap-2">
          {ENCOUNTER_TEMPLATES.map((template, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedTemplate(idx);
                generateFromTemplate(idx);
              }}
              className={`px-4 py-3 rounded-lg border transition-all text-left ${
                selectedTemplate === idx
                  ? 'bg-primary/20 border-primary'
                  : 'border-border hover:border-primary/50 bg-secondary/50'
              }`}
            >
              <div className="font-medium">{template.name}</div>
              <div className="text-xs opacity-70">{template.description}</div>
              <div className="text-xs mt-1 flex gap-2">
                <span>{template.enemyCount.min}-{template.enemyCount.max} enemies</span>
                <span className="capitalize">{template.difficulty}</span>
                {template.includeTurrets && <span>{template.turretCount} turrets</span>}
                {template.includeDrones && <span>{template.droneCount} drones</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Manual Entry */}
      <div className="glass-card rounded-xl p-4">
        <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
          Manual Entry
        </label>
        <div className="grid md:grid-cols-6 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Name</label>
            <Input
              value={manualEntry.name}
              onChange={e => setManualEntry(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enemy name"
              className="cyber-input"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Type</label>
            <select
              value={manualEntry.type}
              onChange={e => setManualEntry(prev => ({ 
                ...prev, 
                type: e.target.value as EncounterParticipant['type']
              }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              <option value="enemy">Human</option>
              <option value="turret">Turret</option>
              <option value="drone">Drone</option>
              <option value="vehicle">Vehicle</option>
              <option value="bot">Bot</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Count</label>
            <Input
              type="number"
              value={manualEntry.count}
              onChange={e => setManualEntry(prev => ({ 
                ...prev, 
                count: Math.max(1, parseInt(e.target.value) || 1)
              }))}
              className="cyber-input"
              min={1}
              max={10}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">HP</label>
            <Input
              type="number"
              value={manualEntry.hp}
              onChange={e => setManualEntry(prev => ({ 
                ...prev, 
                hp: parseInt(e.target.value) || 25
              }))}
              className="cyber-input"
              min={1}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">REF</label>
            <Input
              type="number"
              value={manualEntry.ref}
              onChange={e => setManualEntry(prev => ({ 
                ...prev, 
                ref: parseInt(e.target.value) || 6
              }))}
              className="cyber-input"
              min={1}
              max={10}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={addManualParticipant} className="cyber-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Participant
          </Button>
        </div>
      </div>
      
      {/* Participants List */}
      {participants.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              Participants ({participants.length})
            </h3>
            <div className="flex gap-2">
              <Button onClick={clearAll} variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            {participants.map((p) => (
              <div key={p.id} className="bg-secondary/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(p.type)}
                    <div>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        HP:{p.hp} REF:{p.ref} Armor:{p.armor?.body || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpanded(p.id)}
                      className="p-1 hover:bg-secondary rounded"
                    >
                      {expandedRows.has(p.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <Button 
                      onClick={() => removeParticipant(p.id)}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {expandedRows.has(p.id) && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div>
                        <label className="text-xs text-muted-foreground">HP</label>
                        <Input
                          type="number"
                          value={p.hp}
                          onChange={e => {
                            const newHp = parseInt(e.target.value) || 25;
                            setParticipants(prev => prev.map(part => 
                              part.id === p.id ? { ...part, hp: newHp } : part
                            ));
                          }}
                          className="cyber-input mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">REF</label>
                        <Input
                          type="number"
                          value={p.ref}
                          onChange={e => {
                            const newRef = parseInt(e.target.value) || 6;
                            setParticipants(prev => prev.map(part => 
                              part.id === p.id ? { ...part, ref: newRef } : part
                            ));
                          }}
                          className="cyber-input mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Initiative</label>
                        <Input
                          type="number"
                          value={p.initiative}
                          onChange={e => {
                            const newInit = parseInt(e.target.value) || 0;
                            setParticipants(prev => prev.map(part => 
                              part.id === p.id ? { ...part, initiative: newInit } : part
                            ));
                          }}
                          className="cyber-input mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Body Armor</label>
                        <Input
                          type="number"
                          value={p.armor?.body || 0}
                          onChange={e => {
                            const newArmor = parseInt(e.target.value) || 0;
                            setParticipants(prev => prev.map(part => 
                              part.id === p.id ? { ...part, armor: { ...part.armor, head: part.armor?.head || 0, body: newArmor } } : part
                            ));
                          }}
                          className="cyber-input mt-1"
                        />
                      </div>
                    </div>
                    
                    {/* Weapons */}
                    {p.weapons && p.weapons.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {p.weapons.map((w, widx) => (
                          <span key={widx} className="text-xs px-2 py-1 bg-background/50 rounded">
                            {w}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Add to Encounter Button */}
          <div className="mt-4 flex justify-center">
            <Button onClick={addToEncounter} className="cyber-btn text-lg px-8">
              <Save className="w-5 h-5 mr-2" />
              Add to Encounter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
