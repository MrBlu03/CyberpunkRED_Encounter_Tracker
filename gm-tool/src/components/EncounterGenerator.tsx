import { useState } from 'react';
import { 
  Users, Plus, Trash2, Bot, Crosshair, 
  Wrench, ChevronDown, ChevronUp, Swords, Shield,
  Bomb, Sparkles, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { compendium, type EquippedCyberware } from '@/lib/compendium';
import type { 
  Participant, Weapon, OrdnanceItem, CombatStyle, 
  EncounterDifficulty 
} from '@/types';

interface EncounterGeneratorProps {
  onAddToEncounter?: (participants: Participant[]) => void;
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
  tacticalWeapons?: Weapon[];
  ammoType?: string;
  ordinance?: OrdnanceItem[];
  equippedCyberware?: EquippedCyberware[];
  combatStyle?: CombatStyle;
  isGoon?: boolean;
  tier?: 'easy' | 'average' | 'elite' | 'mook' | 'lieutenant' | 'boss';
  combatNumber?: number;
  nonCombatNumber?: number;
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
    description: 'A group of boostergangers looking for trouble in an alley',
    enemyCount: { min: 3, max: 6 },
    difficulty: 'easy',
    includeTurrets: false,
    turretCount: 0,
    includeDrones: false,
    droneCount: 0,
    enemyTypes: ['Ganger', 'Thug', 'Street Rat'],
    location: 'Back Alley'
  },
  {
    name: 'Corporate Extraction Security',
    description: 'Corporate security team with combat cyberware and tactical fire support',
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
    name: 'High-Security Compound Raid',
    description: 'Heavily defended military facility with automated defenses and elite solos',
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
    name: 'Cyberpsycho Hunt in Combat Zone',
    description: 'A heavily chromed cyberpsycho supported by combat drones and fanatical gangers',
    enemyCount: { min: 2, max: 4 },
    difficulty: 'very-hard',
    includeTurrets: false,
    turretCount: 0,
    includeDrones: true,
    droneCount: 2,
    enemyTypes: ['Cyber Psycho', 'Solo', 'Ganger'],
    location: 'Combat Zone'
  }
];

// Random street names for mooks
const RANDOM_STREET_NAMES = [
  'Ghost', 'Viper', 'Spike', 'Neon', 'Chrome', 'Jax', 'Rat', 'Zephyr', 'Rogue', 'Rex',
  'Blitz', 'Nova', 'Clutch', 'Ripper', 'Sly', 'Zen', 'Echo', 'Cipher', 'Vortex', 'Quake',
  'Crash', 'Havoc', 'Riot', 'Grit', 'Wire', 'Slash', 'Bolt', 'Dash', 'Razor', 'Scrap',
  'Torque', 'Byte', 'Glitch', 'Krypt', 'Null', 'Void', 'Hex', 'Pulse', 'Fuse', 'Grid'
];

// Automated unit stats
const AUTOMATED_UNIT_STATS: Record<string, { hp: number; armor: number; ref: number; weaponName: string }> = {
  turret: { hp: 25, armor: 15, ref: 8, weaponName: 'Assault Rifle' },
  drone: { hp: 15, armor: 7, ref: 10, weaponName: 'Heavy Pistol' },
  vehicle: { hp: 50, armor: 25, ref: 6, weaponName: 'Heavy SMG' },
  bot: { hp: 25, armor: 11, ref: 6, weaponName: 'Heavy Pistol' }
};

// Difficulty modifiers
const DIFFICULTY_MODS = {
  easy: { statMod: -2, hpMod: 0.8, armorMod: 0 },
  moderate: { statMod: 0, hpMod: 1, armorMod: 2 },
  hard: { statMod: 2, hpMod: 1.2, armorMod: 4 },
  'very-hard': { statMod: 4, hpMod: 1.5, armorMod: 6 }
};

export function EncounterGenerator({ 
  onAddToEncounter 
}: EncounterGeneratorProps) {
  const [participants, setParticipants] = useState<EncounterParticipant[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [combatStyle, setCombatStyle] = useState<CombatStyle>('balanced');
  
  const [manualEntry, setManualEntry] = useState<EncounterParticipant>({
    id: '',
    name: '',
    type: 'enemy',
    count: 1,
    difficulty: 'moderate',
    hp: 25,
    ref: 6,
    initiative: 0,
    tier: 'average',
    combatNumber: 11,
    nonCombatNumber: 6,
    weapons: [],
    armor: { head: 7, body: 7 },
    combatStyle: 'balanced'
  });
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Generate participants from template using authentic Foundry VTT compendium
  const generateFromTemplate = (templateIndex: number) => {
    const template = ENCOUNTER_TEMPLATES[templateIndex];
    const diffMod = DIFFICULTY_MODS[template.difficulty];
    const newParticipants: EncounterParticipant[] = [];
    
    // Map template difficulty to EncounterDifficulty
    const mappedDiff: EncounterDifficulty = 
      template.difficulty === 'easy' ? 'easy' :
      template.difficulty === 'moderate' ? 'medium' :
      template.difficulty === 'hard' ? 'hard' : 'extreme';

    // Generate enemies
    const enemyCount = Math.floor(Math.random() * (template.enemyCount.max - template.enemyCount.min + 1)) + template.enemyCount.min;
    
    for (let i = 0; i < enemyCount; i++) {
      const enemyType = template.enemyTypes[Math.floor(Math.random() * template.enemyTypes.length)];
      const baseRef = 6;

      let tier: 'mook' | 'lieutenant' | 'boss' = 'mook';
      let cn = 11;
      let ncn = 6;
      let hp = 30;
      let headSP = 7;
      let bodySP = 7;

      if (template.difficulty === 'easy') {
        tier = 'mook'; cn = 8; ncn = 4; hp = 20; headSP = 4; bodySP = 7;
      } else if (template.difficulty === 'moderate') {
        tier = i === 0 ? 'lieutenant' : 'mook'; cn = 11; ncn = 6; hp = 30; headSP = 7; bodySP = 11;
      } else if (template.difficulty === 'hard') {
        tier = i === 0 ? 'boss' : (i === 1 ? 'lieutenant' : 'mook'); cn = 14; ncn = 8; hp = 45; headSP = 11; bodySP = 13;
      } else { // very-hard
        tier = i === 0 ? 'boss' : 'lieutenant'; cn = 16; ncn = 10; hp = 55; headSP = 13; bodySP = 15;
      }

      // Generate complete authentic Foundry loadout tailored to style & difficulty
      const loadout = compendium.getTacticalLoadout({
        role: enemyType,
        style: combatStyle,
        difficulty: mappedDiff,
        tier
      });

      const streetName = RANDOM_STREET_NAMES[Math.floor(Math.random() * RANDOM_STREET_NAMES.length)];
      
      newParticipants.push({
        id: crypto.randomUUID(),
        name: `${enemyType} "${streetName}"`,
        type: 'enemy',
        count: 1,
        difficulty: template.difficulty,
        hp: Math.floor(hp * diffMod.hpMod),
        ref: Math.min(10, Math.max(2, baseRef + diffMod.statMod)),
        initiative: Math.floor(Math.random() * 5),
        armor: { head: headSP, body: bodySP },
        weapons: loadout.weapons.map(w => w.name),
        tacticalWeapons: loadout.weapons,
        ammoType: loadout.ammoType,
        ordinance: loadout.ordinance,
        equippedCyberware: loadout.cyberware,
        combatStyle,
        isGoon: true,
        tier,
        combatNumber: cn,
        nonCombatNumber: ncn
      });
    }

    // Generate turrets
    if (template.includeTurrets) {
      for (let i = 0; i < template.turretCount; i++) {
        const turretW = compendium.getWeaponByName(AUTOMATED_UNIT_STATS.turret.weaponName) || {
          _id: 'turret-w',
          name: 'Assault Rifle',
          system: { damage: '5d6', rof: 1, weaponSkill: 'Shoulder Arms' }
        };
        newParticipants.push({
          id: crypto.randomUUID(),
          name: `Automated Sentry Turret ${i + 1}`,
          type: 'turret',
          count: 1,
          difficulty: template.difficulty,
          hp: AUTOMATED_UNIT_STATS.turret.hp,
          ref: AUTOMATED_UNIT_STATS.turret.ref,
          initiative: AUTOMATED_UNIT_STATS.turret.ref,
          armor: { head: 0, body: AUTOMATED_UNIT_STATS.turret.armor },
          weapons: [turretW.name],
          tacticalWeapons: [turretW],
          combatNumber: 12,
          nonCombatNumber: 4,
          isGoon: true
        });
      }
    }
    
    // Generate drones
    if (template.includeDrones) {
      for (let i = 0; i < template.droneCount; i++) {
        const droneW = compendium.getWeaponByName(AUTOMATED_UNIT_STATS.drone.weaponName) || {
          _id: 'drone-w',
          name: 'Heavy Pistol',
          system: { damage: '3d6', rof: 2, weaponSkill: 'Handgun' }
        };
        newParticipants.push({
          id: crypto.randomUUID(),
          name: `Tactical Combat Drone ${i + 1}`,
          type: 'drone',
          count: 1,
          difficulty: template.difficulty,
          hp: AUTOMATED_UNIT_STATS.drone.hp,
          ref: AUTOMATED_UNIT_STATS.drone.ref,
          initiative: AUTOMATED_UNIT_STATS.drone.ref,
          armor: { head: 0, body: AUTOMATED_UNIT_STATS.drone.armor },
          weapons: [droneW.name],
          tacticalWeapons: [droneW],
          combatNumber: 11,
          nonCombatNumber: 4,
          isGoon: true
        });
      }
    }
    
    setSelectedTemplate(templateIndex);
    setParticipants(newParticipants);
    toast.success(`Generated ${newParticipants.length} combatants with ${combatStyle.replace('_', ' ')} tactical loadouts`);
  };
  
  // Add manual participant
  const addManualParticipant = () => {
    if (!manualEntry.name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    const count = manualEntry.count || 1;
    const newParticipants: EncounterParticipant[] = [];

    for (let i = 0; i < count; i++) {
      const isGoon = manualEntry.type === 'enemy';
      
      let name = manualEntry.name;
      if (count > 1) {
        if (isGoon) {
          const streetName = RANDOM_STREET_NAMES[Math.floor(Math.random() * RANDOM_STREET_NAMES.length)];
          name = `${manualEntry.name} "${streetName}"`;
        } else {
          name = `${manualEntry.name} ${i + 1}`;
        }
      }
      
      // Look up authentic weapon from compendium
      let tacticalWeapons: Weapon[] = [];
      if (manualEntry.weapons && manualEntry.weapons.length > 0) {
        const found = compendium.getWeaponByName(manualEntry.weapons[0]);
        if (found) tacticalWeapons.push(found);
      }
      if (tacticalWeapons.length === 0) {
        const defaultW = compendium.getWeaponByName('Heavy Pistol');
        if (defaultW) tacticalWeapons.push(defaultW);
      }

      const cyberware = isGoon 
        ? compendium.getCombatCyberwareForRole(manualEntry.name, manualEntry.tier === 'elite' ? 'boss' : 'mook')
        : undefined;

      const newParticipant: EncounterParticipant = {
        ...manualEntry,
        id: crypto.randomUUID(),
        name,
        count: 1,
        isGoon,
        tacticalWeapons,
        equippedCyberware: cyberware,
        ammoType: 'Basic'
      };

      newParticipants.push(newParticipant);
    }
    
    setParticipants(prev => [...prev, ...newParticipants]);
    setManualEntry({
      id: '',
      name: '',
      type: 'enemy',
      count: 1,
      difficulty: 'moderate',
      hp: 25,
      ref: 6,
      initiative: 0,
      tier: 'average',
      combatNumber: 11,
      nonCombatNumber: 6,
      weapons: [],
      armor: { head: 7, body: 7 },
      combatStyle: 'balanced'
    });
    toast.success(`Added ${newParticipants.length} combatant${newParticipants.length > 1 ? 's' : ''}`);
  };
  
  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };
  
  const clearAll = () => {
    setParticipants([]);
    setSelectedTemplate(null);
  };
  
  // Convert to encounter participants and add to active combat tracker
  const addToEncounter = () => {
    if (participants.length === 0) {
      toast.error('No participants to add');
      return;
    }
    
    const encounterParticipants: Participant[] = [];
    
    participants.forEach(p => {
      const weapons: Weapon[] = p.tacticalWeapons && p.tacticalWeapons.length > 0 
        ? p.tacticalWeapons 
        : (p.weapons?.map(wName => compendium.getWeaponByName(wName)).filter(Boolean) as Weapon[]) || [];

      encounterParticipants.push({
        id: crypto.randomUUID(),
        name: p.name,
        role: p.type === 'enemy' ? 'Goon' : p.type,
        affiliation: 'hostile_npc',
        ref: p.ref || 6,
        initiativeSkill: p.initiative || 0,
        hp: p.hp || 25,
        maxHp: p.hp || 25,
        dead: false,
        woundState: 'not-wounded',
        isPC: false,
        armor: p.armor ? {
          head: p.armor.head,
          body: p.armor.body,
          maxHead: p.armor.head,
          maxBody: p.armor.body
        } : { head: 0, body: 0, maxHead: 0, maxBody: 0 },
        weapons: weapons.length > 0 ? weapons : undefined,
        ammoType: p.ammoType || 'Basic',
        ordinance: p.ordinance,
        cyberware: p.equippedCyberware,
        combatStyle: p.combatStyle || combatStyle,
        isGoon: true,
        tier: p.tier,
        combatNumber: p.combatNumber || 11,
        nonCombatNumber: p.nonCombatNumber || 6
      });
    });
    
    if (onAddToEncounter) {
      onAddToEncounter(encounterParticipants);
      toast.success(`Transferred ${encounterParticipants.length} combatants to Encounter Tracker`);
    }
  };
  
  const toggleExpanded = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'turret': return <Crosshair className="w-4 h-4 text-destructive" />;
      case 'drone': return <Bot className="w-4 h-4 text-cyan-400" />;
      case 'vehicle': return <Wrench className="w-4 h-4 text-warning" />;
      case 'bot': return <Bot className="w-4 h-4 text-muted-foreground" />;
      default: return <Swords className="w-4 h-4 text-primary" />;
    }
  };

  const allAvailableWeapons = compendium.getWeapons();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold neon-text-orange" style={{ fontFamily: 'var(--font-display)' }}>
              Encounter & Squad Generator
            </h2>
            <p className="text-xs text-muted-foreground">
              Procedurally builds tactical enemy fireteams with authentic weapons, special ammo, grenades, and cyberware from Foundry packs
            </p>
          </div>
        </div>

        {/* Global Combat Style Selector */}
        <div className="flex items-center gap-2 bg-secondary/40 p-1.5 rounded-xl border border-border">
          <span className="text-xs font-semibold text-muted-foreground px-2">Combat Style:</span>
          {(['balanced', 'melee_focused', 'ranged_focused', 'demolitionist'] as CombatStyle[]).map(style => (
            <button
              key={style}
              onClick={() => setCombatStyle(style)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all capitalize ${
                combatStyle === style
                  ? 'bg-primary text-black shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {style === 'balanced' && '⚖️ Balanced'}
              {style === 'melee_focused' && '⚔️ Melee'}
              {style === 'ranged_focused' && '🎯 Ranged'}
              {style === 'demolitionist' && '💣 Explosives'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Preset Templates Grid */}
      <div>
        <label className="text-xs uppercase font-mono tracking-wider text-muted-foreground mb-3 block">
          Select Tactical Scenario Preset
        </label>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ENCOUNTER_TEMPLATES.map((template, idx) => {
            const isSelected = selectedTemplate === idx;
            return (
              <div 
                key={idx}
                className={`glass-card rounded-xl p-4 cursor-pointer transition-all border-2 flex flex-col justify-between ${
                  isSelected 
                    ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(255,102,0,0.2)]' 
                    : 'border-border/60 hover:border-primary/50'
                }`}
                onClick={() => generateFromTemplate(idx)}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-sm text-foreground">{template.name}</h3>
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-mono font-bold ${
                      template.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' :
                      template.difficulty === 'moderate' ? 'bg-cyan-500/20 text-cyan-400' :
                      template.difficulty === 'hard' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {template.difficulty}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    {template.description}
                  </p>
                </div>
                
                <div className="space-y-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Enemies:</span>
                    <span className="font-mono text-foreground">{template.enemyCount.min} - {template.enemyCount.max}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Defenses:</span>
                    <span className="font-mono text-foreground">
                      {template.turretCount > 0 ? `${template.turretCount} Turrets` : ''}
                      {template.droneCount > 0 ? ` · ${template.droneCount} Drones` : ''}
                      {template.turretCount === 0 && template.droneCount === 0 ? 'None' : ''}
                    </span>
                  </div>

                  <Button 
                    size="sm" 
                    className="w-full mt-2 cyber-btn-secondary text-xs h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      generateFromTemplate(idx);
                    }}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Roll Scenario
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Manual Entry Section */}
      <div className="glass-card rounded-xl p-5 border border-border space-y-4">
        <label className="text-xs uppercase font-mono tracking-wider text-muted-foreground block">
          Custom / Manual Unit Entry
        </label>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="text-[11px] text-muted-foreground mb-1 block">Name / Archetype</label>
            <Input
              value={manualEntry.name}
              onChange={e => setManualEntry(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Maelstrom Cyberbrawler"
              className="cyber-input text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Unit Category</label>
            <select
              value={manualEntry.type}
              onChange={e => setManualEntry(prev => ({ 
                ...prev, 
                type: e.target.value as EncounterParticipant['type']
              }))}
              className="cyber-input text-xs"
            >
              <option value="enemy">Human Goon</option>
              <option value="turret">Automated Turret</option>
              <option value="drone">Combat Drone</option>
              <option value="vehicle">Vehicle / Tank</option>
              <option value="bot">Combat Bot</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Spawn Count</label>
            <Input
              type="number"
              value={manualEntry.count}
              onChange={e => setManualEntry(prev => ({ 
                ...prev, 
                count: Math.max(1, parseInt(e.target.value) || 1)
              }))}
              className="cyber-input text-xs font-mono"
              min={1}
              max={12}
            />
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Tier & HP</label>
            <div className="flex gap-1.5">
              <select
                value={manualEntry.tier}
                onChange={e => {
                  const t = e.target.value as 'easy' | 'average' | 'elite';
                  const stats = {
                    easy: { hp: 20, cn: 8, ncn: 4 },
                    average: { hp: 30, cn: 11, ncn: 6 },
                    elite: { hp: 45, cn: 14, ncn: 8 }
                  }[t];
                  setManualEntry(prev => ({
                    ...prev, tier: t, hp: stats.hp, combatNumber: stats.cn, nonCombatNumber: stats.ncn
                  }));
                }}
                className="cyber-input text-xs w-1/2"
              >
                <option value="easy">Easy (HP 20)</option>
                <option value="average">Avg (HP 30)</option>
                <option value="elite">Elite (HP 45)</option>
              </select>
              <Input
                type="number"
                value={manualEntry.hp}
                onChange={e => setManualEntry(prev => ({ ...prev, hp: parseInt(e.target.value) || 1 }))}
                className="cyber-input text-xs font-mono w-1/2"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Single Stat Block (CN / NCN)</label>
            <div className="flex gap-1.5">
              <Input
                type="number"
                value={manualEntry.combatNumber}
                onChange={e => setManualEntry(prev => ({ ...prev, combatNumber: parseInt(e.target.value) || 1 }))}
                className="cyber-input text-xs font-mono w-1/2"
                title="Combat Number (Attacks, Dodges, Defense)"
              />
              <Input
                type="number"
                value={manualEntry.nonCombatNumber}
                onChange={e => setManualEntry(prev => ({ ...prev, nonCombatNumber: parseInt(e.target.value) || 1 }))}
                className="cyber-input text-xs font-mono w-1/2"
                title="Non-Combat Number (Athletics, Perception, Tech)"
              />
            </div>
          </div>
        </div>

        {/* Weapon and Armor Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <div className="md:col-span-2">
            <label className="text-[11px] text-muted-foreground mb-1 block">Primary Weapon (from Compendium)</label>
            <select 
              value={manualEntry.weapons?.[0] || ''}
              onChange={e => setManualEntry(prev => ({
                ...prev,
                weapons: [e.target.value]
              }))}
              className="cyber-input text-xs"
            >
              <option value="">Auto-Assign Based on Role...</option>
              {allAvailableWeapons.map(w => (
                <option key={w._id} value={w.name}>
                  {w.name} ({w.system.damage || '2d6'} · {w.system.weaponSkill || 'Weapon'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Head Armor SP</label>
            <Input
              type="number"
              value={manualEntry.armor?.head || 0}
              onChange={e => setManualEntry(prev => ({ ...prev, armor: { ...prev.armor!, head: parseInt(e.target.value) || 0 } }))}
              className="cyber-input text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Body Armor SP</label>
            <Input
              type="number"
              value={manualEntry.armor?.body || 0}
              onChange={e => setManualEntry(prev => ({ ...prev, armor: { ...prev.armor!, body: parseInt(e.target.value) || 0 } }))}
              className="cyber-input text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button onClick={addManualParticipant} className="cyber-btn text-xs">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Custom Combatant
          </Button>
        </div>
      </div>
      
      {/* Generated Roster List */}
      {participants.length > 0 && (
        <div className="glass-card rounded-xl p-5 border-2 border-primary/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-base" style={{ fontFamily: 'var(--font-display)' }}>
                Generated Combat Roster ({participants.length} Units Ready)
              </h3>
            </div>
            <div className="flex gap-2">
              <Button onClick={clearAll} variant="outline" size="sm" className="text-xs text-destructive hover:bg-destructive/10">
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Clear List
              </Button>
            </div>
          </div>
          
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {participants.map((p) => (
              <div key={p.id} className="glass-card rounded-xl p-3.5 bg-secondary/30 hover:bg-secondary/50 border border-border/80 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background border border-border">
                      {getTypeIcon(p.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{p.name}</span>
                        {p.isGoon && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono font-bold">
                            CN {p.combatNumber ?? 11} / NCN {p.nonCombatNumber ?? 6}
                          </span>
                        )}
                        {p.ammoType && p.ammoType !== 'Basic' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-mono font-bold border border-cyan-500/30">
                            {p.ammoType} Ammo
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>HP: <strong className="text-foreground">{p.hp}</strong></span>
                        <span>REF: <strong className="text-foreground">{p.ref}</strong></span>
                        <span>Armor: <strong className="text-foreground">Head {p.armor?.head || 0} / Body {p.armor?.body || 0}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpanded(p.id)}
                      className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground transition-colors"
                      title="Toggle Tactical Details"
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
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Weapons & Cyberware Pills */}
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/40">
                  {p.tacticalWeapons && p.tacticalWeapons.map((w, wIdx) => (
                    <span key={wIdx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-background/80 border border-border flex items-center gap-1 text-primary">
                      <Swords className="w-3 h-3 text-primary" />
                      {w.name} ({w.system.damage || '2d6'})
                    </span>
                  ))}

                  {p.ordinance && p.ordinance.map((ord, oIdx) => (
                    <span key={oIdx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-destructive/20 border border-destructive/30 text-destructive flex items-center gap-1 font-bold">
                      <Bomb className="w-3 h-3" />
                      {ord.count}x {ord.name} ({ord.damage})
                    </span>
                  ))}

                  {p.equippedCyberware && p.equippedCyberware.map((cyber, cIdx) => (
                    <span key={cIdx} className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {cyber.name}
                    </span>
                  ))}
                </div>
                
                {/* Expanded Details Form */}
                {expandedRows.has(p.id) && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">HP</label>
                        <Input
                          type="number"
                          value={p.hp}
                          onChange={e => {
                            const newHp = parseInt(e.target.value) || 25;
                            setParticipants(prev => prev.map(part => 
                              part.id === p.id ? { ...part, hp: newHp } : part
                            ));
                          }}
                          className="cyber-input text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">REF</label>
                        <Input
                          type="number"
                          value={p.ref}
                          onChange={e => {
                            const newRef = parseInt(e.target.value) || 6;
                            setParticipants(prev => prev.map(part => 
                              part.id === p.id ? { ...part, ref: newRef } : part
                            ));
                          }}
                          className="cyber-input text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Head SP</label>
                        <Input
                          type="number"
                          value={p.armor?.head || 0}
                          onChange={e => {
                            const sp = parseInt(e.target.value) || 0;
                            setParticipants(prev => prev.map(part => 
                              part.id === p.id ? { ...part, armor: { head: sp, body: part.armor?.body || 0 } } : part
                            ));
                          }}
                          className="cyber-input text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Body SP</label>
                        <Input
                          type="number"
                          value={p.armor?.body || 0}
                          onChange={e => {
                            const sp = parseInt(e.target.value) || 0;
                            setParticipants(prev => prev.map(part => 
                              part.id === p.id ? { ...part, armor: { head: part.armor?.head || 0, body: sp } } : part
                            ));
                          }}
                          className="cyber-input text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Transfer to Encounter Action */}
          <div className="pt-2 flex justify-center">
            <Button onClick={addToEncounter} className="cyber-btn text-sm font-bold px-8 h-10">
              <Check className="w-4 h-4 mr-2" />
              Transfer All {participants.length} Combatants to Encounter Tracker
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
