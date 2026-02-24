import { useState, useEffect } from 'react';
import { 
  UserPlus, Save, Trash2, Plus, Minus, Search, 
  Shield, Swords, Cpu, Zap, Crosshair,
  X, Edit3, Copy, Dices, Wrench, Sparkles, LayoutPanelTop
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getWoundState } from '@/lib/damage';
import type { GeneratedNPC, Weapon, SavedNPC, CritMode, TarotDeckState } from '@/types';

// FVTT Item interface
interface FVTTItem {
  _id: string;
  name: string;
  type: 'weapon' | 'armor' | 'cyberware' | 'gear' | 'drug' | 'ammo' | 'clothing';
  system: {
    price?: { market: number };
    cost?: number;
    description?: { value: string };
    damage?: string;
    weaponSkill?: string;
    attackmod?: number;
    rof?: number;
    magazine?: { max: number };
    ranges?: {
      pointBlank?: { range: number; dv: number };
      close?: { range: number; dv: number };
      medium?: { range: number; dv: number };
      long?: { range: number; dv: number };
      extreme?: { range: number; dv: number };
    };
    bodyLocation?: { sp: number };
    headLocation?: { sp: number };
    hlCost?: number;
    slots?: number;
    category?: string;
    quality?: string;
  };
}

interface ManualNPCCreatorProps {
  onAddToEncounter?: (npc: GeneratedNPC) => void;
  savedNPCs?: SavedNPC[];
  setSavedNPCs?: React.Dispatch<React.SetStateAction<SavedNPC[]>>;
  critMode?: CritMode;
  tarotDeck?: TarotDeckState;
}

const ROLES = [
  'Solo', 'Netrunner', 'Tech', 'Medtech', 'Media', 
  'Exec', 'Lawman', 'Fixer', 'Nomad', 'Rockerboy'
];

const DEFAULT_STATS = {
  int: 5,
  ref: 5,
  dex: 5,
  tech: 5,
  cool: 5,
  will: 5,
  luck: 5,
  move: 5,
  body: 5,
  emp: 5
};

export function ManualNPCCreator({ 
  onAddToEncounter, 
  savedNPCs = [], 
  setSavedNPCs,
  critMode = 'raw',
  tarotDeck
}: ManualNPCCreatorProps) {
  const [allItems, setAllItems] = useState<FVTTItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // NPC State
  const [npc, setNpc] = useState<GeneratedNPC>({
    id: crypto.randomUUID(),
    name: '',
    role: 'Solo',
    stats: { ...DEFAULT_STATS },
    skills: {},
    hitPoints: { current: 35, max: 35 },
    woundState: 'Not Wounded',
    equipment: {
      weapons: [],
      cyberware: [],
      gear: []
    }
  });
  
  // UI State
  const [activeTab, setActiveTab] = useState<'stats' | 'equipment' | 'skills'>('stats');
  const [showItemBrowser, setShowItemBrowser] = useState(false);
  const [itemFilter, setItemFilter] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillValue, setNewSkillValue] = useState(0);
  
  // Custom item creation state
  const [showCustomWeaponForm, setShowCustomWeaponForm] = useState(false);
  const [showCustomCyberwareForm, setShowCustomCyberwareForm] = useState(false);
  const [customWeapon, setCustomWeapon] = useState<Partial<Weapon>>({
    name: '',
    system: { damage: '2d6', weaponSkill: 'Handgun', attackmod: 0, rof: 1 }
  });
  const [customCyberware, setCustomCyberware] = useState({
    name: '',
    description: '',
    hlCost: 0,
    slots: 0
  });
  
  // Load FVTT data
  useEffect(() => {
    loadItems();
  }, []);
  
  const loadItems = async () => {
    try {
      const packs = ['core', 'black-chrome', 'dlc'];
      let allData: FVTTItem[] = [];
      const seenIds = new Set<string>();
      
      for (const pack of packs) {
        try {
          const response = await fetch(`/data/${pack}.json`);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              // Deduplicate while adding
              const uniqueItems = data.filter(item => {
                if (item && item._id) {
                  if (seenIds.has(item._id)) return false;
                  seenIds.add(item._id);
                  return true;
                }
                return false;
              });
              allData = [...allData, ...uniqueItems];
            }
          }
        } catch (e) {
          console.log(`Pack ${pack} not available`);
        }
      }
      
      setAllItems(allData);
      setIsLoading(false);
    } catch (error) {
      toast.error('Failed to load item data');
      setIsLoading(false);
    }
  };
  
  // Calculate HP from BODY and WILL
  const calculateHP = (body: number, will: number) => {
    return 10 + Math.floor((body + will) / 2) * 5;
  };
  
  // Update stat and recalculate HP
  const updateStat = (stat: keyof typeof DEFAULT_STATS, value: number) => {
    const newStats = { ...npc.stats, [stat]: Math.max(2, Math.min(10, value)) };
    const newMaxHp = calculateHP(newStats.body, newStats.will);
    
    setNpc(prev => ({
      ...prev,
      stats: newStats,
      hitPoints: {
        current: Math.min(prev.hitPoints.current, newMaxHp),
        max: newMaxHp
      }
    }));
  };
  
  // Add skill
  const addSkill = () => {
    if (!newSkillName.trim()) return;
    
    setNpc(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [newSkillName.toLowerCase()]: newSkillValue
      }
    }));
    
    setNewSkillName('');
    setNewSkillValue(0);
    toast.success(`Added skill: ${newSkillName}`);
  };
  
  // Remove skill
  const removeSkill = (skillName: string) => {
    setNpc(prev => {
      const newSkills = { ...prev.skills };
      delete newSkills[skillName];
      return { ...prev, skills: newSkills };
    });
  };
  
  // Add item to NPC
  const addItem = (item: FVTTItem) => {
    if (item.type === 'weapon') {
      const weapon: Weapon = {
        _id: item._id,
        name: item.name,
        system: {
          damage: item.system.damage || '2d6',
          weaponSkill: item.system.weaponSkill || 'Handgun',
          attackmod: item.system.attackmod || 0,
          rof: item.system.rof,
          ranges: item.system.ranges
        }
      };
      
      setNpc(prev => ({
        ...prev,
        equipment: {
          ...prev.equipment,
          weapons: [...prev.equipment.weapons, weapon]
        }
      }));
    } else if (item.type === 'cyberware') {
      setNpc(prev => ({
        ...prev,
        equipment: {
          ...prev.equipment,
          cyberware: [...prev.equipment.cyberware, item.name]
        }
      }));
    } else {
      setNpc(prev => ({
        ...prev,
        equipment: {
          ...prev.equipment,
          gear: [...prev.equipment.gear, item.name]
        }
      }));
    }
    
    toast.success(`Added ${item.name}`);
  };
  
  // Remove item
  const removeWeapon = (index: number) => {
    setNpc(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        weapons: prev.equipment.weapons.filter((_, i) => i !== index)
      }
    }));
  };
  
  // Add custom weapon
  const addCustomWeapon = () => {
    if (!customWeapon.name?.trim()) {
      toast.error('Weapon needs a name');
      return;
    }
    
    const newWeapon: Weapon = {
      _id: `custom-${crypto.randomUUID()}`,
      name: customWeapon.name!,
      system: {
        damage: customWeapon.system?.damage || '2d6',
        weaponSkill: customWeapon.system?.weaponSkill || 'Handgun',
        attackmod: customWeapon.system?.attackmod || 0,
        rof: customWeapon.system?.rof || 1
      }
    };
    
    setNpc(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        weapons: [...prev.equipment.weapons, newWeapon]
      }
    }));
    
    setCustomWeapon({
      name: '',
      system: { damage: '2d6', weaponSkill: 'Handgun', attackmod: 0, rof: 1 }
    });
    setShowCustomWeaponForm(false);
    toast.success(`Created ${newWeapon.name}`);
  };
  
  // Add custom cyberware
  const addCustomCyberware = () => {
    if (!customCyberware.name.trim()) {
      toast.error('Cyberware needs a name');
      return;
    }
    
    const nameWithStats = customCyberware.hlCost > 0 || customCyberware.slots > 0
      ? `${customCyberware.name} (HL:${customCyberware.hlCost} Slots:${customCyberware.slots})`
      : customCyberware.name;
    
    setNpc(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        cyberware: [...prev.equipment.cyberware, nameWithStats]
      }
    }));
    
    setCustomCyberware({ name: '', description: '', hlCost: 0, slots: 0 });
    setShowCustomCyberwareForm(false);
    toast.success(`Added ${customCyberware.name}`);
  };
  
  const removeCyberware = (index: number) => {
    setNpc(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        cyberware: prev.equipment.cyberware.filter((_, i) => i !== index)
      }
    }));
  };
  
  const removeGear = (index: number) => {
    setNpc(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        gear: prev.equipment.gear.filter((_, i) => i !== index)
      }
    }));
  };
  
  // Set armor
  const setArmor = (item: FVTTItem) => {
    setNpc(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        armor: {
          name: item.name,
          head: item.system.headLocation?.sp || 0,
          body: item.system.bodyLocation?.sp || 0,
          system: {
            headLocation: { sp: item.system.headLocation?.sp || 0 },
            bodyLocation: { sp: item.system.bodyLocation?.sp || 0 }
          }
        }
      }
    }));
    toast.success(`Equipped ${item.name}`);
  };
  
  // Remove armor
  const removeArmor = () => {
    setNpc(prev => {
      const newEquip = { ...prev.equipment };
      delete newEquip.armor;
      return { ...prev, equipment: newEquip };
    });
  };
  
  // Save NPC
  const saveNPC = () => {
    if (!npc.name.trim()) {
      toast.error('NPC needs a name');
      return;
    }
    
    if (!setSavedNPCs) return;
    
    const savedNPC: SavedNPC = {
      id: crypto.randomUUID(),
      name: npc.name,
      npc: {
        id: npc.id,
        name: npc.name,
        ref: npc.stats.ref,
        initiativeSkill: npc.skills.initiative || 0,
        hp: npc.hitPoints.current,
        maxHp: npc.hitPoints.max,
        woundState: getWoundState(npc.hitPoints.current, npc.hitPoints.max),
        dead: false,
        isPC: false,
        armor: npc.equipment.armor ? {
          head: npc.equipment.armor.head,
          body: npc.equipment.armor.body
        } : undefined,
        weapons: npc.equipment.weapons
      },
      savedAt: new Date().toISOString()
    };
    
    setSavedNPCs(prev => [...prev, savedNPC]);
    toast.success(`${npc.name} saved!`);
  };
  
  // Reset NPC
  const resetNPC = () => {
    setNpc({
      id: crypto.randomUUID(),
      name: '',
      role: 'Solo',
      stats: { ...DEFAULT_STATS },
      skills: {},
      hitPoints: { current: 35, max: 35 },
      woundState: 'Not Wounded',
      equipment: {
        weapons: [],
        cyberware: [],
        gear: []
      }
    });
    toast.info('NPC reset');
  };
  
  // Clone NPC
  const cloneNPC = () => {
    const cloned = {
      ...npc,
      id: crypto.randomUUID(),
      name: `${npc.name} (Copy)`
    };
    setNpc(cloned);
    toast.success('NPC cloned');
  };
  
  // Filter items
  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(itemFilter.toLowerCase());
    const matchesType = itemTypeFilter === 'all' || item.type === itemTypeFilter;
    return matchesSearch && matchesType;
  });
  
  // Get items by type
  const weapons = filteredItems.filter(i => i.type === 'weapon');
  const armor = filteredItems.filter(i => i.type === 'armor');
  const cyberware = filteredItems.filter(i => i.type === 'cyberware');
  const gear = filteredItems.filter(i => i.type === 'gear' || i.type === 'drug' || i.type === 'ammo');
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Edit3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Manual NPC Creator
          </h2>
          <p className="text-sm text-muted-foreground">
            Build custom NPCs with full gear selection
          </p>
        </div>
      </div>
      
      {/* Basic Info */}
      <div className="glass-card rounded-xl p-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Name</label>
            <Input
              value={npc.name}
              onChange={e => setNpc(prev => ({ ...prev, name: e.target.value }))}
              placeholder="NPC Name"
              className="cyber-input"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Role</label>
            <select
              value={npc.role}
              onChange={e => setNpc(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-input rounded-md"
            >
              {ROLES.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">HP</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={npc.hitPoints.current}
                onChange={e => {
                  const val = parseInt(e.target.value) || 0;
                  setNpc(prev => ({
                    ...prev,
                    hitPoints: { ...prev.hitPoints, current: Math.min(val, prev.hitPoints.max) }
                  }));
                }}
                className="cyber-input w-20"
              />
              <span className="text-muted-foreground">/</span>
              <span className="font-mono">{npc.hitPoints.max}</span>
              <span className="text-xs text-muted-foreground">(auto from BODY+WILL)</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'stats' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
          }`}
        >
          <Dices className="w-4 h-4 inline mr-2" />
          Stats
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'skills' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
          }`}
        >
          <Zap className="w-4 h-4 inline mr-2" />
          Skills ({Object.keys(npc.skills).length})
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'equipment' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
          }`}
        >
          <Swords className="w-4 h-4 inline mr-2" />
          Equipment
        </button>
      </div>
      
      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Statistics</h3>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {Object.entries(npc.stats).map(([stat, value]) => (
              <div key={stat} className="text-center">
                <label className="text-xs uppercase text-muted-foreground block mb-1">{stat}</label>
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => updateStat(stat as keyof typeof DEFAULT_STATS, value - 1)}
                    className="w-6 h-6 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono font-bold text-lg w-8">{value}</span>
                  <button
                    onClick={() => updateStat(stat as keyof typeof DEFAULT_STATS, value + 1)}
                    className="w-6 h-6 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-secondary/30 rounded-lg">
            <h4 className="font-semibold mb-2">Derived Stats</h4>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Max HP:</span>
                <span className="font-mono ml-2">{npc.hitPoints.max}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Run:</span>
                <span className="font-mono ml-2">{npc.stats.move * 3}m</span>
              </div>
              <div>
                <span className="text-muted-foreground">Leap:</span>
                <span className="font-mono ml-2">{Math.floor(npc.stats.move * 3 / 4)}m</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Skills</h3>
          
          {/* Add Skill */}
          <div className="flex gap-2 mb-4">
            <Input
              value={newSkillName}
              onChange={e => setNewSkillName(e.target.value)}
              placeholder="Skill name (e.g., Handgun, Stealth)"
              className="cyber-input flex-1"
            />
            <Input
              type="number"
              value={newSkillValue}
              onChange={e => setNewSkillValue(parseInt(e.target.value) || 0)}
              className="cyber-input w-20"
              min={0}
              max={10}
            />
            <Button onClick={addSkill} variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Skill List */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(npc.skills).map(([skill, value]) => (
              <div key={skill} className="flex items-center gap-1 px-3 py-1 bg-secondary/50 rounded-full">
                <span className="capitalize">{skill}:</span>
                <span className="font-mono font-bold">{value}</span>
                <button
                  onClick={() => removeSkill(skill)}
                  className="ml-1 p-0.5 hover:bg-destructive/20 text-destructive rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          
          {Object.keys(npc.skills).length === 0 && (
            <p className="text-muted-foreground text-center py-4">No skills added yet</p>
          )}
          
          {/* Quick Add Skills */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">Quick Add Common Skills:</p>
            <div className="flex flex-wrap gap-2">
              {['Handgun', 'Brawling', 'Stealth', 'Perception', 'Athletics', 'Persuasion', 'Intimidation'].map(skill => (
                <button
                  key={skill}
                  onClick={() => {
                    setNewSkillName(skill);
                    setNewSkillValue(4);
                  }}
                  className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded"
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
        <div className="space-y-4">
          {/* Current Equipment */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Current Equipment</h3>
              <Button onClick={() => setShowItemBrowser(true)} className="cyber-btn">
                <Plus className="w-4 h-4 mr-2" />
                Browse Items
              </Button>
            </div>
            
            {/* Armor */}
            <div className="mb-4">
              <h4 className="text-sm uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Armor
              </h4>
              {npc.equipment.armor ? (
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <span className="font-medium">{npc.equipment.armor.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      H:{npc.equipment.armor.head} B:{npc.equipment.armor.body}
                    </span>
                  </div>
                  <button
                    onClick={removeArmor}
                    className="p-1 hover:bg-destructive/20 text-destructive rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No armor equipped</p>
              )}
            </div>
            
            {/* Weapons */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Swords className="w-4 h-4" /> Weapons ({npc.equipment.weapons.length})
                </h4>
                <Button onClick={() => setShowCustomWeaponForm(true)} variant="outline" size="sm">
                  <Wrench className="w-3 h-3 mr-1" />
                  Custom Weapon
                </Button>
              </div>
              {npc.equipment.weapons.length > 0 ? (
                <div className="space-y-2">
                  {npc.equipment.weapons.map((weapon, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <span className="font-medium">{weapon.name}</span>
                        <span className="text-sm text-muted-foreground ml-2 font-mono">
                          {weapon.system.damage}
                          {weapon.system.rof && ` | ROF:${weapon.system.rof}`}
                        </span>
                      </div>
                      <button
                        onClick={() => removeWeapon(idx)}
                        className="p-1 hover:bg-destructive/20 text-destructive rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No weapons</p>
              )}
            </div>
            
            {/* Custom Weapon Form */}
            {showCustomWeaponForm && (
              <div className="mb-4 p-4 bg-secondary/30 rounded-lg border border-primary/30">
                <h5 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Create Custom Weapon
                </h5>
                <div className="grid md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Name</label>
                    <Input
                      value={customWeapon.name}
                      onChange={e => setCustomWeapon(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Weapon name"
                      className="cyber-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Damage</label>
                    <Input
                      value={customWeapon.system?.damage}
                      onChange={e => setCustomWeapon(prev => ({ 
                        ...prev, 
                        system: { ...prev.system!, damage: e.target.value }
                      }))}
                      placeholder="e.g., 3d6"
                      className="cyber-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Skill</label>
                    <select
                      value={customWeapon.system?.weaponSkill}
                      onChange={e => setCustomWeapon(prev => ({ 
                        ...prev, 
                        system: { ...prev.system!, weaponSkill: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md"
                    >
                      <option value="Handgun">Handgun</option>
                      <option value="Shoulder Arms">Shoulder Arms</option>
                      <option value="Autofire">Autofire</option>
                      <option value="Melee Weapon">Melee Weapon</option>
                      <option value="Brawling">Brawling</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">ROF</label>
                    <Input
                      type="number"
                      value={customWeapon.system?.rof}
                      onChange={e => setCustomWeapon(prev => ({ 
                        ...prev, 
                        system: { ...prev.system!, rof: parseInt(e.target.value) || 1 }
                      }))}
                      className="cyber-input"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Attack Mod</label>
                    <Input
                      type="number"
                      value={customWeapon.system?.attackmod}
                      onChange={e => setCustomWeapon(prev => ({ 
                        ...prev, 
                        system: { ...prev.system!, attackmod: parseInt(e.target.value) || 0 }
                      }))}
                      className="cyber-input"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addCustomWeapon} className="cyber-btn" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Weapon
                  </Button>
                  <Button onClick={() => setShowCustomWeaponForm(false)} variant="ghost" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            {/* Cyberware */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> Cyberware ({npc.equipment.cyberware.length})
                </h4>
                <Button onClick={() => setShowCustomCyberwareForm(true)} variant="outline" size="sm">
                  <Wrench className="w-3 h-3 mr-1" />
                  Custom Cyberware
                </Button>
              </div>
              {npc.equipment.cyberware.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {npc.equipment.cyberware.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-primary text-sm">
                      {item}
                      <button
                        onClick={() => removeCyberware(idx)}
                        className="ml-1 p-0.5 hover:bg-destructive/20 text-destructive rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No cyberware</p>
              )}
            </div>
            
            {/* Custom Cyberware Form */}
            {showCustomCyberwareForm && (
              <div className="mb-4 p-4 bg-secondary/30 rounded-lg border border-primary/30">
                <h5 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Create Custom Cyberware
                </h5>
                <div className="grid md:grid-cols-2 gap-3 mb-3">
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground">Name</label>
                    <Input
                      value={customCyberware.name}
                      onChange={e => setCustomCyberware(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Cyberware name"
                      className="cyber-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Humanity Loss</label>
                    <Input
                      type="number"
                      value={customCyberware.hlCost}
                      onChange={e => setCustomCyberware(prev => ({ ...prev, hlCost: parseInt(e.target.value) || 0 }))}
                      className="cyber-input"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Slots</label>
                    <Input
                      type="number"
                      value={customCyberware.slots}
                      onChange={e => setCustomCyberware(prev => ({ ...prev, slots: parseInt(e.target.value) || 0 }))}
                      className="cyber-input"
                      min={0}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground">Description</label>
                    <Input
                      value={customCyberware.description}
                      onChange={e => setCustomCyberware(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="What does this cyberware do?"
                      className="cyber-input"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addCustomCyberware} className="cyber-btn" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Cyberware
                  </Button>
                  <Button onClick={() => setShowCustomCyberwareForm(false)} variant="ghost" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            {/* Gear */}
            <div>
              <h4 className="text-sm uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <Crosshair className="w-4 h-4" /> Gear ({npc.equipment.gear.length})
              </h4>
              {npc.equipment.gear.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {npc.equipment.gear.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-secondary/50 rounded-full text-sm">
                      {item}
                      <button
                        onClick={() => removeGear(idx)}
                        className="ml-1 p-0.5 hover:bg-destructive/20 text-destructive rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No gear</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Item Browser Modal */}
      {showItemBrowser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-card rounded-xl p-6 max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                Item Browser
              </h3>
              <button
                onClick={() => setShowItemBrowser(false)}
                className="p-1 hover:bg-secondary rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Filters */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={itemFilter}
                  onChange={e => setItemFilter(e.target.value)}
                  placeholder="Search items..."
                  className="cyber-input pl-10"
                />
              </div>
              <select
                value={itemTypeFilter}
                onChange={e => setItemTypeFilter(e.target.value)}
                className="px-3 py-2 bg-background border border-input rounded-md"
              >
                <option value="all">All Types</option>
                <option value="weapon">Weapons</option>
                <option value="armor">Armor</option>
                <option value="cyberware">Cyberware</option>
                <option value="gear">Gear</option>
              </select>
            </div>
            
            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto">
              {/* Weapons */}
              {(itemTypeFilter === 'all' || itemTypeFilter === 'weapon') && weapons.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-primary">Weapons ({weapons.length})</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {weapons.slice(0, 20).map(item => (
                      <button
                        key={item._id}
                        onClick={() => addItem(item)}
                        className="text-left p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.system.damage && `DMG: ${item.system.damage}`}
                          {item.system.rof && ` | ROF: ${item.system.rof}`}
                          {item.system.weaponSkill && ` | ${item.system.weaponSkill}`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Armor */}
              {(itemTypeFilter === 'all' || itemTypeFilter === 'armor') && armor.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-primary">Armor ({armor.length})</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {armor.slice(0, 20).map(item => (
                      <button
                        key={item._id}
                        onClick={() => setArmor(item)}
                        className="text-left p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Head SP: {item.system.headLocation?.sp || 0} | Body SP: {item.system.bodyLocation?.sp || 0}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Cyberware */}
              {(itemTypeFilter === 'all' || itemTypeFilter === 'cyberware') && cyberware.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-primary">Cyberware ({cyberware.length})</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {cyberware.slice(0, 20).map(item => (
                      <button
                        key={item._id}
                        onClick={() => addItem(item)}
                        className="text-left p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.system.hlCost && `HL: ${item.system.hlCost}`}
                          {item.system.slots && ` | Slots: ${item.system.slots}`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Gear */}
              {(itemTypeFilter === 'all' || itemTypeFilter === 'gear') && gear.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-primary">Gear ({gear.length})</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {gear.slice(0, 20).map(item => (
                      <button
                        key={item._id}
                        onClick={() => addItem(item)}
                        className="text-left p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.type}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={saveNPC} className="cyber-btn gap-2">
          <Save className="w-4 h-4" />
          Save NPC
        </Button>
        {onAddToEncounter && (
          <Button 
            onClick={() => onAddToEncounter(npc)} 
            variant="outline"
            className="gap-2"
            disabled={!npc.name.trim()}
          >
            <UserPlus className="w-4 h-4" />
            Add to Encounter
          </Button>
        )}
        <Button onClick={cloneNPC} variant="outline" className="gap-2">
          <Copy className="w-4 h-4" />
          Clone
        </Button>
        <Button onClick={resetNPC} variant="ghost" className="gap-2 text-destructive">
          <Trash2 className="w-4 h-4" />
          Reset
        </Button>
      </div>
      
      {/* Saved NPCs */}
      {savedNPCs.length > 0 && setSavedNPCs && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Saved NPCs ({savedNPCs.length})
          </h3>
          <div className="space-y-2">
            {savedNPCs.map(saved => (
              <div key={saved.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{saved.name}</p>
                  <p className="text-xs text-muted-foreground">
                    HP: {saved.npc.hp}/{saved.npc.maxHp}
                    {saved.npc.armor && ` • Armor: ${saved.npc.armor.head}/${saved.npc.armor.body}`}
                    {saved.npc.weapons && ` • Weapons: ${saved.npc.weapons.length}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {onAddToEncounter && (
                    <Button 
                      onClick={() => onAddToEncounter(saved.npc as unknown as GeneratedNPC)}
                      size="sm"
                      variant="outline"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  )}
                  <Button 
                    onClick={() => setSavedNPCs(prev => prev.filter(n => n.id !== saved.id))}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
