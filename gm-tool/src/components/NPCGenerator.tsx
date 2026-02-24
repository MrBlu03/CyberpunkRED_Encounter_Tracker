import { useState, useEffect, useCallback } from 'react';
import { 
  UserPlus, RefreshCw, Dices, Save, Users, Swords, Cpu, 
  Trash2, Shield, Zap, Sparkles, Bot, Crosshair,
  Wrench, ChevronDown, ChevronUp, LayoutPanelTop
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { generateFullName, rollDiceDetailed } from '@/lib/dice';
import { getWoundState } from '@/lib/damage';
import type { GeneratedNPC, SavedNPC, Weapon, CritMode, TarotDeckState } from '@/types';

interface NPCGeneratorProps {
  onAddToEncounter?: (npc: GeneratedNPC) => void;
  onAddMultiple?: (npcs: GeneratedNPC[]) => void;
  mode?: 'single' | 'encounter';
  savedNPCs?: SavedNPC[];
  setSavedNPCs?: React.Dispatch<React.SetStateAction<SavedNPC[]>>;
  critMode?: CritMode;
  tarotDeck?: TarotDeckState;
}

// Difficulty presets matching the GitHub version
const DIFFICULTY_PRESETS = {
  mook: {
    name: 'Mook',
    description: 'Basic enemies, street gangers, security guards',
    statRange: [3, 6] as [number, number],
    skillRange: [2, 4] as [number, number],
    weaponCount: [1, 1] as [number, number],
    armorChance: 0.3,
    cyberChance: 0.2,
    templates: ['Ganger', 'Security Guard', 'Street Rat', 'Thug']
  },
  lieutenant: {
    name: 'Lieutenant',
    description: 'Mid-level threats, experienced gangers, corpo security',
    statRange: [5, 8] as [number, number],
    skillRange: [4, 7] as [number, number],
    weaponCount: [1, 2] as [number, number],
    armorChance: 0.6,
    cyberChance: 0.5,
    templates: ['Corpo Security', 'Gang Lieutenant', 'Experienced Solo', 'Techie']
  },
  boss: {
    name: 'Boss',
    description: 'Major threats, gang leaders, elite solos',
    statRange: [7, 10] as [number, number],
    skillRange: [6, 10] as [number, number],
    weaponCount: [2, 3] as [number, number],
    armorChance: 0.8,
    cyberChance: 0.8,
    templates: ['Gang Boss', 'Elite Solo', 'Corpo Exec Security', 'Cyber Psycho']
  }
};

// Automated Units (Drones, Turrets, etc.)
const AUTOMATED_UNITS = [
  {
    type: 'turret',
    name: 'Basic Turret',
    description: 'Automated defensive turret',
    hp: 20,
    armor: { head: 0, body: 15 },
    weapons: ['Assault Rifle'],
    ref: 8,
    initiative: 8
  },
  {
    type: 'turret',
    name: 'Heavy Turret',
    description: 'Heavy automated turret with reinforced armor',
    hp: 35,
    armor: { head: 0, body: 20 },
    weapons: ['Heavy SMG', 'Shotgun'],
    ref: 8,
    initiative: 8
  },
  {
    type: 'drone',
    name: 'Combat Drone',
    description: 'Small autonomous combat drone',
    hp: 15,
    armor: { head: 0, body: 7 },
    weapons: ['Heavy Pistol'],
    ref: 10,
    initiative: 10
  },
  {
    type: 'drone',
    name: 'Heavy Combat Drone',
    description: 'Larger combat drone with heavy weapons',
    hp: 30,
    armor: { head: 0, body: 11 },
    weapons: ['Assault Rifle'],
    ref: 8,
    initiative: 8
  },
  {
    type: 'vehicle',
    name: 'Security AV',
    description: 'Armored security aerodyne vehicle',
    hp: 50,
    armor: { head: 0, body: 25 },
    weapons: ['Assault Rifle', 'Heavy Pistol'],
    ref: 6,
    initiative: 6
  },
  {
    type: 'bot',
    name: 'Service Bot',
    description: 'Modified service robot with weapons',
    hp: 25,
    armor: { head: 0, body: 11 },
    weapons: ['Heavy Pistol', 'Light Melee Weapon'],
    ref: 6,
    initiative: 6
  }
];

// Shop item types
interface ShopItem {
  _id: string;
  name: string;
  type: 'weapon' | 'armor' | 'cyberware' | 'gear';
  system: {
    damage?: string;
    weaponSkill?: string;
    attackmod?: number;
    rof?: number;
    ranges?: {
      pointBlank?: { range: number; dv: number };
      close?: { range: number; dv: number };
      medium?: { range: number; dv: number };
      long?: { range: number; dv: number };
      extreme?: { range: number; dv: number };
    };
    bodyLocation?: { sp: number };
    headLocation?: { sp: number };
    price?: { market: number };
    hlCost?: number;
    category?: string;
    description?: { value: string };
  };
}

export function NPCGenerator({ 
  onAddToEncounter, 
  onAddMultiple, 
  mode = 'single',
  savedNPCs = [],
  setSavedNPCs,
  critMode = 'raw',
  tarotDeck
}: NPCGeneratorProps) {
  const [generatedNPC, setGeneratedNPC] = useState<GeneratedNPC | null>(null);
  const [generatedEncounter, setGeneratedEncounter] = useState<GeneratedNPC[]>([]);
  const [encounterSize, setEncounterSize] = useState(3);
  const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTY_PRESETS>('mook');
  const [isGenerating, setIsGenerating] = useState(false);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [isLoadingShop, setIsLoadingShop] = useState(true);
  const [npcType, setNpcType] = useState<'human' | 'automated'>('human');
  const [selectedUnitType, setSelectedUnitType] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [guaranteeArmor, setGuaranteeArmor] = useState(false);
  
  // Load shop data
  useEffect(() => {
    loadShopData();
  }, []);
  
  const loadShopData = async () => {
    try {
      let allData: ShopItem[] = [];
      const seenIds = new Set<string>();
      
      const normalizeItems = (data: any): ShopItem[] => {
        if (!data) return [];
        
        // Helper to filter duplicates
        const filterDuplicates = (items: any[]): ShopItem[] => {
          return items.filter(item => {
            if (item && item._id) {
              if (seenIds.has(item._id)) return false;
              seenIds.add(item._id);
              return true;
            }
            return false;
          }) as ShopItem[];
        };

        if (Array.isArray(data)) {
          return filterDuplicates(data);
        }
        
        if (typeof data === 'object' && data._id && data.name && data.type) {
          if (!seenIds.has(data._id)) {
            seenIds.add(data._id);
            return [data as ShopItem];
          }
          return [];
        }
        
        if (typeof data === 'object' && Object.values(data).every(v => typeof v === 'object')) {
          return filterDuplicates(Object.values(data));
        }
        
        return [];
      };
      
      // Try loading combined FVTT items file for fast loading
      try {
        const response = await fetch('/fvtt/packs_json/all-items.json', { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          const data = await response.json();
          allData = normalizeItems(data);
        }
      } catch (e) {
        console.log('All-items loading error, trying manifest:', e);
        
        // Fallback to manifest-based loading
        try {
          const manifestResp = await fetch('/fvtt/packs_json/manifest.json', { signal: AbortSignal.timeout(5000) });
          if (manifestResp.ok) {
            const manifest = await manifestResp.json();
            if (Array.isArray(manifest)) {
              const batchSize = 20;
              for (let i = 0; i < manifest.length; i += batchSize) {
                const batch = manifest.slice(i, i + batchSize);
                const results = await Promise.allSettled(
                  batch.map(async (relPath) => {
                    const jsonFile = `/fvtt/packs_json/${relPath}`;
                    const resp = await fetch(jsonFile, { signal: AbortSignal.timeout(3000) });
                    if (resp.ok) {
                      const data = await resp.json();
                      return normalizeItems(data);
                    }
                    return [];
                  })
                );
                for (const result of results) {
                  if (result.status === 'fulfilled') {
                    allData = [...allData, ...result.value];
                  }
                }
              }
            }
          }
        } catch (e2) {
          console.log('FVTT packs loading error:', e2);
        }
      }
      
      // Fallback to bundled data if no FVTT data
      if (allData.length === 0) {
        try {
          const response = await fetch('/data/core.json', { signal: AbortSignal.timeout(3000) });
          const data = await response.json();
          allData = data as ShopItem[];
        } catch (e) {
          console.log('Fallback data loading error:', e);
        }
      }
      
      setShopItems(allData);
      setIsLoadingShop(false);
    } catch (error) {
      console.error('Failed to load shop data:', error);
      toast.error('Failed to load shop data');
      setIsLoadingShop(false);
    }
  };
  
  // Get items by type from shop
  const getShopWeapons = () => shopItems.filter(item => item.type === 'weapon');
  const getShopArmor = () => shopItems.filter(item => item.type === 'armor');
  const getShopCyberware = () => shopItems.filter(item => item.type === 'cyberware');
  
  // Get combat cyberware only
  const getCombatCyberware = () => {
    const combatKeywords = ['scratchers', 'rippers', 'knucks', 'slice', 'wolvers', 'subdermal', 'armor'];
    return getShopCyberware().filter(cyber => 
      combatKeywords.some(keyword => 
        cyber.name.toLowerCase().includes(keyword)
      )
    );
  };
  
  // Roll random equipment from shop
  const rollEquipmentFromShop = (diffPreset: typeof DIFFICULTY_PRESETS['mook']) => {
    const weapons = getShopWeapons();
    const armor = getShopArmor();
    const combatCyber = getCombatCyberware();
    
    // Roll 1-2 ranged weapons
    const rangedWeapons: ShopItem[] = [];
    const rangedShopWeapons = weapons.filter(w => {
      const skill = w.system.weaponSkill?.toLowerCase() || '';
      return skill.includes('handgun') || skill.includes('shoulder') || skill.includes('autofire');
    });
    
    if (rangedShopWeapons.length > 0) {
      const weaponCount = Math.floor(Math.random() * 2) + 1; // 1-2 weapons
      for (let i = 0; i < weaponCount; i++) {
        const weapon = rangedShopWeapons[Math.floor(Math.random() * rangedShopWeapons.length)];
        if (!rangedWeapons.find(w => w._id === weapon._id)) {
          rangedWeapons.push(weapon);
        }
      }
    }
    
    // Roll 0-1 melee weapons
    const meleeWeapons: ShopItem[] = [];
    const meleeShopWeapons = weapons.filter(w => {
      const skill = w.system.weaponSkill?.toLowerCase() || '';
      return skill.includes('melee') || skill.includes('brawling');
    });
    
    if (meleeShopWeapons.length > 0 && Math.random() < 0.7) {
      const weapon = meleeShopWeapons[Math.floor(Math.random() * meleeShopWeapons.length)];
      meleeWeapons.push(weapon);
    }
    
    // Roll armor based on difficulty
    let selectedArmor: ShopItem | null = null;
    const shouldHaveArmor = guaranteeArmor || Math.random() < diffPreset.armorChance;
    
    if (shouldHaveArmor && armor.length > 0) {
      // Filter by difficulty - harder enemies get better armor
      let availableArmor = armor;
      if (diffPreset.name === 'Mook') {
        availableArmor = armor.filter(a => (a.system.bodyLocation?.sp || 0) <= 11);
      } else if (diffPreset.name === 'Boss') {
        availableArmor = armor.filter(a => (a.system.bodyLocation?.sp || 0) >= 11);
      }
      
      if (availableArmor.length > 0) {
        selectedArmor = availableArmor[Math.floor(Math.random() * availableArmor.length)];
      } else {
        selectedArmor = armor[Math.floor(Math.random() * armor.length)];
      }
    }
    
    // Roll 0-5 combat cyberware pieces based on difficulty
    const selectedCyberware: ShopItem[] = [];
    const cyberRoll = Math.random();
    let numCyberware = 0;
    
    if (cyberRoll < diffPreset.cyberChance) {
      numCyberware = Math.floor(Math.random() * 5); // 0-4 pieces
      if (diffPreset.name === 'Boss' && Math.random() < 0.5) {
        numCyberware = Math.min(5, numCyberware + 1); // Bosses can have up to 5
      }
    }
    
    if (combatCyber.length > 0) {
      for (let i = 0; i < numCyberware; i++) {
        const cyber = combatCyber[Math.floor(Math.random() * combatCyber.length)];
        if (!selectedCyberware.find(c => c._id === cyber._id)) {
          selectedCyberware.push(cyber);
        }
      }
    }
    
    return {
      rangedWeapons,
      meleeWeapons,
      armor: selectedArmor,
      cyberware: selectedCyberware
    };
  };
  
  // Convert shop weapon to Weapon type
  const convertShopWeapon = (shopWeapon: ShopItem): Weapon => ({
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
  
  // Clickable Dice Component
  const ClickableDice = ({ notation, label }: { notation: string; label?: string }) => {
    const handleRoll = () => {
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
  
  // Generate stats based on difficulty
  const generateStats = (diffPreset: typeof DIFFICULTY_PRESETS['mook']) => {
    const randomInRange = (min: number, max: number) => 
      Math.floor(Math.random() * (max - min + 1)) + min;
    
    return {
      int: randomInRange(diffPreset.statRange[0], diffPreset.statRange[1]),
      ref: randomInRange(diffPreset.statRange[0], diffPreset.statRange[1]),
      dex: randomInRange(diffPreset.statRange[0], diffPreset.statRange[1]),
      tech: randomInRange(diffPreset.statRange[0], diffPreset.statRange[1]),
      cool: randomInRange(diffPreset.statRange[0], diffPreset.statRange[1]),
      will: randomInRange(diffPreset.statRange[0], diffPreset.statRange[1]),
      luck: randomInRange(diffPreset.statRange[0], diffPreset.statRange[1]),
      move: randomInRange(diffPreset.statRange[0], diffPreset.statRange[1]),
      body: randomInRange(diffPreset.statRange[0], diffPreset.statRange[1]),
      emp: randomInRange(diffPreset.statRange[0], diffPreset.statRange[1])
    };
  };
  
  // Generate skills based on template
  const generateSkills = (diffPreset: typeof DIFFICULTY_PRESETS['mook']) => {
    const randomInRange = (min: number, max: number) => 
      Math.floor(Math.random() * (max - min + 1)) + min;
    
    const commonSkills = ['Handgun', 'Brawling', 'Stealth', 'Perception', 'Athletics'];
    const skills: Record<string, number> = {};
    
    commonSkills.forEach(skill => {
      skills[skill.toLowerCase()] = randomInRange(diffPreset.skillRange[0], diffPreset.skillRange[1]);
    });
    
    return skills;
  };
  
  // Generate human NPC
  const generateHumanNPC = (forcedDifficulty?: keyof typeof DIFFICULTY_PRESETS): GeneratedNPC => {
    const diffPreset = DIFFICULTY_PRESETS[forcedDifficulty || difficulty];
    const template = diffPreset.templates[Math.floor(Math.random() * diffPreset.templates.length)];
    const stats = generateStats(diffPreset);
    const skills = generateSkills(diffPreset);
    const equipment = rollEquipmentFromShop(diffPreset);
    
    const maxHp = 10 + Math.floor((stats.body + stats.will) / 2) * 5;
    
    // Combine all weapons
    const allWeapons: Weapon[] = [
      ...equipment.rangedWeapons.map(convertShopWeapon),
      ...equipment.meleeWeapons.map(convertShopWeapon)
    ];
    
    return {
      id: crypto.randomUUID(),
      name: generateFullName(),
      role: template,
      stats,
      skills,
      hitPoints: { current: maxHp, max: maxHp },
      woundState: 'Not Wounded',
      difficulty: diffPreset.name,
      equipment: {
        armor: equipment.armor ? {
          name: equipment.armor.name,
          head: equipment.armor.system.headLocation?.sp || 0,
          body: equipment.armor.system.bodyLocation?.sp || 0,
          system: {
            headLocation: { sp: equipment.armor.system.headLocation?.sp || 0 },
            bodyLocation: { sp: equipment.armor.system.bodyLocation?.sp || 0 }
          }
        } : undefined,
        weapons: allWeapons,
        cyberware: equipment.cyberware.map(c => c.name),
        gear: ['Agent', 'Credchip']
      }
    };
  };
  
  // Generate automated unit (drone/turret/etc.)
  const generateAutomatedUnit = (unitIndex: number = selectedUnitType): GeneratedNPC => {
    const unitTemplate = AUTOMATED_UNITS[unitIndex];
    const weapons = getShopWeapons();
    
    // Find matching weapons from shop
    const unitWeapons: Weapon[] = [];
    unitTemplate.weapons.forEach(weaponName => {
      const shopWeapon = weapons.find(w => 
        w.name.toLowerCase().includes(weaponName.toLowerCase().split(' ')[0])
      );
      if (shopWeapon) {
        unitWeapons.push(convertShopWeapon(shopWeapon));
      }
    });
    
    // If no weapons found, add a default
    if (unitWeapons.length === 0 && weapons.length > 0) {
      unitWeapons.push(convertShopWeapon(weapons[0]));
    }
    
    return {
      id: crypto.randomUUID(),
      name: `${unitTemplate.name} ${Math.floor(Math.random() * 99) + 1}`,
      role: unitTemplate.type.toUpperCase(),
      stats: {
        int: 0,
        ref: unitTemplate.ref,
        dex: unitTemplate.ref,
        tech: 0,
        cool: 0,
        will: 0,
        luck: 0,
        move: unitTemplate.type === 'drone' ? 8 : 0,
        body: Math.floor(unitTemplate.hp / 5),
        emp: 0
      },
      skills: {},
      hitPoints: { current: unitTemplate.hp, max: unitTemplate.hp },
      woundState: 'Not Wounded',
      difficulty: 'Automated',
      equipment: {
        armor: {
          name: 'Built-in Armor',
          head: unitTemplate.armor.head,
          body: unitTemplate.armor.body,
          system: {
            headLocation: { sp: unitTemplate.armor.head },
            bodyLocation: { sp: unitTemplate.armor.body }
          }
        },
        weapons: unitWeapons,
        cyberware: [],
        gear: []
      }
    };
  };
  
  // Main generate function
  const generateNPC = useCallback((forcedDifficulty?: keyof typeof DIFFICULTY_PRESETS): GeneratedNPC => {
    if (npcType === 'automated') {
      return generateAutomatedUnit();
    }
    return generateHumanNPC(forcedDifficulty);
  }, [difficulty, npcType, selectedUnitType, guaranteeArmor, shopItems]);
  
  const handleGenerate = () => {
    if (isLoadingShop) {
      toast.error('Shop data still loading...');
      return;
    }
    
    setIsGenerating(true);
    
    setTimeout(() => {
      const npc = generateNPC();
      setGeneratedNPC(npc);
      setIsGenerating(false);
      toast.success(`Generated ${npc.name} (${npc.difficulty})`);
    }, 300);
  };
  
  const handleGenerateEncounter = () => {
    if (isLoadingShop) {
      toast.error('Shop data still loading...');
      return;
    }
    
    setIsGenerating(true);
    
    setTimeout(() => {
      const npcs: GeneratedNPC[] = [];
      for (let i = 0; i < encounterSize; i++) {
        npcs.push(generateNPC());
      }
      setGeneratedEncounter(npcs);
      setIsGenerating(false);
      toast.success(`Generated encounter with ${npcs.length} NPCs`);
    }, 500);
  };
  
  const handleSaveNPC = () => {
    if (!generatedNPC || !setSavedNPCs) return;
    
    const savedNPC: SavedNPC = {
      id: crypto.randomUUID(),
      name: generatedNPC.name,
      npc: {
        id: '',
        name: generatedNPC.name,
        ref: generatedNPC.stats.ref,
        initiativeSkill: generatedNPC.skills.initiative || 0,
        hp: generatedNPC.hitPoints.current,
        maxHp: generatedNPC.hitPoints.max,
        woundState: getWoundState(generatedNPC.hitPoints.current, generatedNPC.hitPoints.max),
        dead: false,
        isPC: false,
        armor: {
          head: generatedNPC.equipment.armor?.head || 0,
          body: generatedNPC.equipment.armor?.body || 0
        },
        weapons: generatedNPC.equipment.weapons
      },
      savedAt: new Date().toISOString()
    };
    
    setSavedNPCs(prev => [...prev, savedNPC]);
    toast.success(`${generatedNPC.name} saved as template`);
  };
  
  const handleDeleteSaved = (id: string) => {
    if (!setSavedNPCs) return;
    setSavedNPCs(prev => prev.filter(npc => npc.id !== id));
    toast.info('NPC deleted');
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
  
  // Difficulty badge colors
  const getDifficultyColor = (difficultyName: string) => {
    switch (difficultyName) {
      case 'Mook': return 'text-success bg-success/10 border-success/30';
      case 'Lieutenant': return 'text-primary bg-primary/10 border-primary/30';
      case 'Boss': return 'text-warning bg-warning/10 border-warning/30';
      case 'Automated': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30';
      default: return 'text-muted-foreground bg-secondary';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          {npcType === 'automated' ? <Bot className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            {mode === 'encounter' ? 'Encounter Generator' : 'NPC Generator'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === 'encounter' 
              ? 'Generate entire encounters with multiple NPCs' 
              : 'Generate individual NPCs with stats and equipment'}
          </p>
        </div>
      </div>
      
      {/* NPC Type Selector */}
      <div className="glass-card rounded-xl p-4">
        <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
          NPC Type
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setNpcType('human')}
            className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
              npcType === 'human'
                ? 'bg-primary/20 border-primary text-primary'
                : 'border-border hover:border-primary/50 bg-secondary/50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Human
          </button>
          <button
            onClick={() => setNpcType('automated')}
            className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
              npcType === 'automated'
                ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400'
                : 'border-border hover:border-cyan-400/50 bg-secondary/50'
            }`}
          >
            <Bot className="w-4 h-4" />
            Automated (Drones/Turrets)
          </button>
        </div>
      </div>
      
      {npcType === 'human' ? (
        <>
          {/* Difficulty Selector */}
          <div className="glass-card rounded-xl p-4">
            <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
              Difficulty
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(key as keyof typeof DIFFICULTY_PRESETS)}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    difficulty === key
                      ? getDifficultyColor(preset.name)
                      : 'border-border hover:border-primary/50 bg-secondary/50'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-[10px] opacity-70">{preset.description}</div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Armor Guarantee Toggle */}
            <div className="mt-4 flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={guaranteeArmor}
                  onChange={e => setGuaranteeArmor(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm">Guarantee Armor</span>
              </label>
            </div>
          </div>
        </>
      ) : (
        /* Automated Unit Selector */
        <div className="glass-card rounded-xl p-4">
          <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
            Unit Type
          </label>
          <div className="grid md:grid-cols-2 gap-2">
            {AUTOMATED_UNITS.map((unit, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedUnitType(idx)}
                className={`px-4 py-3 rounded-lg border transition-all text-left ${
                  selectedUnitType === idx
                    ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400'
                    : 'border-border hover:border-cyan-400/50 bg-secondary/50'
                }`}
              >
                <div className="font-medium flex items-center gap-2">
                  {unit.type === 'turret' && <Crosshair className="w-4 h-4" />}
                  {unit.type === 'drone' && <Bot className="w-4 h-4" />}
                  {unit.type === 'vehicle' && <Wrench className="w-4 h-4" />}
                  {unit.type === 'bot' && <Bot className="w-4 h-4" />}
                  {unit.name}
                </div>
                <div className="text-xs opacity-70 mt-1">{unit.description}</div>
                <div className="text-xs mt-1 flex gap-2">
                  <span>HP: {unit.hp}</span>
                  <span>Armor: {unit.armor.body}</span>
                  <span>REF: {unit.ref}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {mode === 'single' ? (
        <>
          {/* Single NPC Generator */}
          <div className="flex justify-center">
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || isLoadingShop}
              className="cyber-btn text-lg px-8 py-6"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : isLoadingShop ? 'Loading Shop Data...' : 'Generate NPC'}
            </Button>
          </div>
          
          {generatedNPC && (
            <div className="glass-card rounded-xl p-6 animate-in">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-bold text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                      {generatedNPC.name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded border ${getDifficultyColor(generatedNPC.difficulty || 'Mook')}`}>
                      {generatedNPC.difficulty}
                    </span>
                    {generatedNPC.role && (
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                        {generatedNPC.role}
                      </span>
                    )}
                  </div>
                  {npcType === 'human' && (
                    <p className="text-lg text-muted-foreground">{generatedNPC.role}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveNPC} variant="outline" size="sm">
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  {onAddToEncounter && (
                    <Button onClick={() => onAddToEncounter(generatedNPC)} className="cyber-btn" size="sm">
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add to Encounter
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Stats */}
                {npcType === 'human' && (
                  <div>
                    <h4 className="font-bold mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                      <Dices className="w-4 h-4 text-primary" />
                      Stats
                    </h4>
                    <div className="grid grid-cols-5 gap-2">
                      {Object.entries(generatedNPC.stats).map(([stat, value]) => (
                        <div key={stat} className="text-center p-2 bg-secondary/50 rounded-lg">
                          <div className="text-xs uppercase text-muted-foreground">{stat}</div>
                          <div className="font-mono font-bold text-lg">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* HP & Status */}
                <div>
                  <h4 className="font-bold mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                    <Swords className="w-4 h-4 text-primary" />
                    Combat
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-secondary/50 rounded-lg">
                      <span className="text-muted-foreground">Hit Points</span>
                      <span className="font-mono font-bold">{generatedNPC.hitPoints.max}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-secondary/50 rounded-lg">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Armor
                      </span>
                      <span className="font-mono">
                        {generatedNPC.equipment.armor 
                          ? `${generatedNPC.equipment.armor.name} (H:${generatedNPC.equipment.armor.head} B:${generatedNPC.equipment.armor.body})`
                          : 'None'
                        }
                      </span>
                    </div>
                    {npcType === 'automated' && (
                      <div className="flex justify-between p-2 bg-secondary/50 rounded-lg">
                        <span className="text-muted-foreground">REF/Initiative</span>
                        <span className="font-mono">{generatedNPC.stats.ref}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Weapons */}
              {generatedNPC.equipment.weapons.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-bold mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                    <Zap className="w-4 h-4 text-primary" />
                    Weapons ({generatedNPC.equipment.weapons.length})
                  </h4>
                  <div className="space-y-2">
                    {generatedNPC.equipment.weapons.map((weapon, idx) => (
                      <div key={idx} className="p-3 bg-secondary/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{weapon.name}</span>
                          <div className="flex gap-2">
                            <ClickableDice notation={weapon.system.damage} label="DMG" />
                            {weapon.system.rof && (
                              <span className="px-2 py-0.5 bg-secondary rounded font-mono text-xs">
                                ROF:{weapon.system.rof}
                              </span>
                            )}
                          </div>
                        </div>
                        {weapon.system.ranges && (
                          <div className="flex gap-1 text-xs">
                            {Object.entries(weapon.system.ranges).map(([name, data]) => (
                              <div key={name} className="bg-background/50 rounded px-1.5 py-0.5 text-center">
                                <span className="text-muted-foreground uppercase text-[9px]">{name.slice(0,2)}</span>
                                <span className="font-mono ml-1">{data.range}m</span>
                                <span className="text-primary font-bold ml-1">DV{data.dv}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Skills */}
              {npcType === 'human' && Object.keys(generatedNPC.skills).length > 0 && (
                <div className="mt-6">
                  <h4 className="font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>Key Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(generatedNPC.skills).slice(0, 5).map(([skill, value]) => (
                      <span key={skill} className="px-3 py-1 bg-secondary/50 rounded-full text-sm">
                        {skill}: <span className="font-mono font-bold">{value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Cyberware */}
              {generatedNPC.equipment.cyberware.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-bold mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                    <Cpu className="w-4 h-4 text-primary" />
                    Combat Cyberware ({generatedNPC.equipment.cyberware.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {generatedNPC.equipment.cyberware.map((item, i) => (
                      <span key={i} className="px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-sm text-primary">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Saved NPCs */}
          {savedNPCs.length > 0 && setSavedNPCs && (
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Saved NPCs ({savedNPCs.length})</h3>
              <div className="space-y-2">
                {savedNPCs.map(saved => (
                  <div key={saved.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="font-medium">{saved.name}</p>
                      <p className="text-xs text-muted-foreground">
                        HP: {saved.npc.hp}/{saved.npc.maxHp}
                        {saved.npc.armor && ` • Armor: ${saved.npc.armor.head}/${saved.npc.armor.body}`}
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
                        onClick={() => handleDeleteSaved(saved.id)}
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
        </>
      ) : (
        <>
          {/* Encounter Generator */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
                  Encounter Size
                </label>
                <Input
                  type="number"
                  value={encounterSize}
                  onChange={e => setEncounterSize(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="cyber-input w-24"
                  min={1}
                  max={10}
                />
              </div>
              <div className="flex-1" />
              <Button 
                onClick={handleGenerateEncounter} 
                disabled={isGenerating || isLoadingShop}
                className="cyber-btn"
              >
                <Users className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-pulse' : ''}`} />
                {isGenerating ? 'Generating...' : isLoadingShop ? 'Loading...' : 'Generate Encounter'}
              </Button>
            </div>
          </div>
          
          {generatedEncounter.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  Generated Encounter ({generatedEncounter.length} NPCs)
                </h3>
                {onAddMultiple && (
                  <Button onClick={() => onAddMultiple(generatedEncounter)} className="cyber-btn">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add All to Encounter
                  </Button>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedEncounter.map((npc, index) => (
                  <div key={npc.id} className="glass-card rounded-xl p-4 animate-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-primary">{npc.name}</h4>
                        <p className="text-sm text-muted-foreground">{npc.role}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs bg-secondary px-2 py-1 rounded">#{index + 1}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getDifficultyColor(npc.difficulty || 'Mook')}`}>
                          {npc.difficulty}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">HP</span>
                        <span className="font-mono">{npc.hitPoints.max}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Armor</span>
                        <span className="font-mono">
                          {npc.equipment.armor 
                            ? `H:${npc.equipment.armor.head} B:${npc.equipment.armor.body}`
                            : 'None'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weapons</span>
                        <span className="font-mono">{npc.equipment.weapons.length}</span>
                      </div>
                    </div>
                    
                    {/* Expandable Weapon Details */}
                    {npc.equipment.weapons.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <button
                          onClick={() => toggleExpanded(npc.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          {expandedRows.has(npc.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {expandedRows.has(npc.id) ? 'Hide' : 'Show'} Weapons
                        </button>
                        
                        {expandedRows.has(npc.id) && (
                          <div className="mt-2 space-y-1">
                            {npc.equipment.weapons.map((weapon, widx) => (
                              <div key={widx} className="flex items-center gap-2">
                                <ClickableDice notation={weapon.system.damage} />
                                <span className="text-xs text-muted-foreground">{weapon.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 bg-secondary/50 rounded">REF: {npc.stats.ref}</span>
                        {npc.stats.body > 0 && (
                          <span className="px-2 py-1 bg-secondary/50 rounded">BODY: {npc.stats.body}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
