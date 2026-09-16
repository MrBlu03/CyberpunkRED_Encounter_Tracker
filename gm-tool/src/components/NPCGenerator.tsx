import { useState, useEffect } from 'react';
import { 
  Bot, Plus, Shield, Swords, Trash2, Save, Sparkles, Search,
  ArrowRight, UserPlus, Heart, Target, Crosshair, Bomb, Zap, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { compendium, CORE_WEAPONS } from '@/lib/compendium';
import type { EquippedCyberware } from '@/lib/compendium';
import type { Participant, SavedNPC, Weapon, Affiliation, CombatStyle, EncounterDifficulty, OrdnanceItem } from '@/types';

interface NPCGeneratorProps {
  onAddToEncounter?: (npc: Participant) => void;
  onAddMultipleToEncounter?: (npcs: Participant[]) => void;
}

interface GoonPreset {
  id: string;
  name: string;
  role: string;
  category: 'street' | 'corpo' | 'police' | 'automated' | 'elite';
  tier: 'mook' | 'lieutenant' | 'boss';
  combatNumber: number;
  hp: number;
  armorHead: number;
  armorBody: number;
  defaultAffiliation: Affiliation;
  weapons: Weapon[];
  cyberware?: EquippedCyberware[];
  description: string;
}

const GOON_PRESETS: GoonPreset[] = [
  {
    id: 'maelstrom-ganger',
    name: 'Maelstrom Booster',
    role: 'Ganger',
    category: 'street',
    tier: 'mook',
    combatNumber: 10,
    hp: 25,
    armorHead: 4,
    armorBody: 7,
    defaultAffiliation: 'hostile_npc',
    weapons: [CORE_WEAPONS[1], CORE_WEAPONS[8]], // Heavy Pistol, Combat Knife / Melee
    cyberware: compendium.getCombatCyberwareForRole('ganger', 'mook'),
    description: 'Cyber-augmented street thug hopped up on combat stims.'
  },
  {
    id: 'tyger-claw-operative',
    name: 'Tyger Claw Operative',
    role: 'Ganger',
    category: 'street',
    tier: 'mook',
    combatNumber: 11,
    hp: 30,
    armorHead: 7,
    armorBody: 11,
    defaultAffiliation: 'hostile_npc',
    weapons: [CORE_WEAPONS[3], CORE_WEAPONS[9]], // SMG, Katana
    cyberware: compendium.getCombatCyberwareForRole('ganger', 'lieutenant'),
    description: 'Agile booster biker armed with high-rate SMG and mono-edge blade.'
  },
  {
    id: 'arasaka-guard',
    name: 'Arasaka Security Guard',
    role: 'Corpo Sec',
    category: 'corpo',
    tier: 'mook',
    combatNumber: 11,
    hp: 35,
    armorHead: 11,
    armorBody: 11,
    defaultAffiliation: 'hostile_npc',
    weapons: [CORE_WEAPONS[6]], // Assault Rifle
    cyberware: compendium.getCombatCyberwareForRole('corpo', 'mook'),
    description: 'Disciplined corporate sentry in Light Armorjack with Arasaka gear.'
  },
  {
    id: 'militech-trooper',
    name: 'Militech Shock Trooper',
    role: 'Military Merc',
    category: 'corpo',
    tier: 'lieutenant',
    combatNumber: 13,
    hp: 45,
    armorHead: 12,
    armorBody: 12,
    defaultAffiliation: 'hostile_npc',
    weapons: [CORE_WEAPONS[6], CORE_WEAPONS[1]], // Assault Rifle, Heavy Pistol
    cyberware: compendium.getCombatCyberwareForRole('solo', 'lieutenant'),
    description: 'Heavy armor, military training, and integrated smartlink targeting.'
  },
  {
    id: 'ncpd-patrol',
    name: 'NCPD Beat Officer',
    role: 'Lawman',
    category: 'police',
    tier: 'mook',
    combatNumber: 10,
    hp: 30,
    armorHead: 7,
    armorBody: 7,
    defaultAffiliation: 'friendly_npc',
    weapons: [CORE_WEAPONS[1], CORE_WEAPONS[5]], // Heavy Pistol, Shotgun
    cyberware: compendium.getCombatCyberwareForRole('police', 'mook'),
    description: 'Standard Night City beat cop trying to survive the shift.'
  },
  {
    id: 'ncpd-swat',
    name: 'NCPD Max-Tac Tactical Solo',
    role: 'Solo',
    category: 'police',
    tier: 'boss',
    combatNumber: 15,
    hp: 55,
    armorHead: 15,
    armorBody: 15,
    defaultAffiliation: 'hostile_npc',
    weapons: [CORE_WEAPONS[2], CORE_WEAPONS[6]], // Very Heavy Pistol, Assault Rifle
    cyberware: compendium.getCombatCyberwareForRole('police', 'boss'),
    description: 'Psycho Squad heavy hitter deployed to eliminate cyberpsychos with extreme prejudice.'
  },
  {
    id: 'combat-drone',
    name: 'Militech Combat Drone',
    role: 'Automated Drone',
    category: 'automated',
    tier: 'mook',
    combatNumber: 12,
    hp: 20,
    armorHead: 0,
    armorBody: 7,
    defaultAffiliation: 'hostile_npc',
    weapons: [CORE_WEAPONS[4]], // Heavy SMG
    cyberware: [],
    description: 'Autonomous hovering drone with optical sensors and rapid-fire SMG.'
  },
  {
    id: 'sentry-turret',
    name: 'Automated Sentry Turret',
    role: 'Automated Turret',
    category: 'automated',
    tier: 'lieutenant',
    combatNumber: 13,
    hp: 35,
    armorHead: 0,
    armorBody: 15,
    defaultAffiliation: 'hostile_npc',
    weapons: [CORE_WEAPONS[6]], // Assault Rifle
    cyberware: [],
    description: 'Reinforced ceiling or floor-mounted turret covering choke points.'
  },
  {
    id: 'cyberpsycho-boss',
    name: 'Chromed Cyberpsycho',
    role: 'Solo / Psycho',
    category: 'elite',
    tier: 'boss',
    combatNumber: 15,
    hp: 65,
    armorHead: 13,
    armorBody: 13,
    defaultAffiliation: 'hostile_npc',
    weapons: [CORE_WEAPONS[5], CORE_WEAPONS[9]], // Shotgun, Katana
    cyberware: compendium.getCombatCyberwareForRole('solo', 'boss'),
    description: 'Utterly unhinged, loaded with subdermal armor, mantis blades, and heavy shotgun.'
  }
];

export function NPCGenerator({ onAddToEncounter, onAddMultipleToEncounter }: NPCGeneratorProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'saved'>('presets');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [savedNPCs, setSavedNPCs] = useLocalStorage<SavedNPC[]>('cyberpunk-saved-npcs', []);

  // Compendium state
  const [compendiumItems, setCompendiumItems] = useState<Weapon[]>(CORE_WEAPONS);
  const [compendiumSearch, setCompendiumSearch] = useState('');

  // Tactical Loadout & Threat Settings for Generation
  const [selectedStyle, setSelectedStyle] = useState<CombatStyle>('balanced');
  const [selectedDifficulty, setSelectedDifficulty] = useState<EncounterDifficulty>('medium');

  // Custom NPC form state
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState('Solo');
  const [customAffiliation, setCustomAffiliation] = useState<Affiliation>('hostile_npc');
  const [customTier, setCustomTier] = useState<'mook' | 'lieutenant' | 'boss'>('mook');
  const [customCN, setCustomCN] = useState(11);
  const [customHP, setCustomHP] = useState(35);
  const [customHeadSP, setCustomHeadSP] = useState(11);
  const [customBodySP, setCustomBodySP] = useState(11);
  const [customWeapons, setCustomWeapons] = useState<Weapon[]>([CORE_WEAPONS[1]]);
  const [customCyberware, setCustomCyberware] = useState<EquippedCyberware[]>(() => compendium.getCombatCyberwareForRole('Solo', 'mook'));
  const [customAmmoType, setCustomAmmoType] = useState<string>('Basic');
  const [customOrdnance, setCustomOrdnance] = useState<OrdnanceItem[]>([]);
  const [customManualControl, setCustomManualControl] = useState<boolean>(false);

  // Load compendium items on mount
  useEffect(() => {
    compendium.loadAll().then(() => {
      const weps = compendium.getWeapons();
      if (weps.length > 0) {
        setCompendiumItems(weps);
      }
    });
  }, []);

  const handleSpawnPreset = (preset: GoonPreset, count: number = 1, affiliationOverride?: Affiliation) => {
    const affiliation = affiliationOverride || preset.defaultAffiliation;
    const newParticipants: Participant[] = [];

    const loadout = compendium.getTacticalLoadout({
      role: preset.role,
      style: selectedStyle,
      difficulty: selectedDifficulty,
      tier: preset.tier
    });

    const cyber = preset.cyberware || loadout.cyberware;
    let initBonus = 0;
    if (cyber.some(c => c.name.toLowerCase().includes('kerenzikov'))) initBonus += 2;
    if (cyber.some(c => c.name.toLowerCase().includes('sandevistan'))) initBonus += 3;

    // Difficulty scaling: higher difficulties scale combat stats and SP
    const diffStatBonus = selectedDifficulty === 'extreme' ? 2 : selectedDifficulty === 'hard' ? 1 : 0;
    const diffArmorBonus = selectedDifficulty === 'extreme' ? 3 : selectedDifficulty === 'hard' ? 2 : 0;

    const weaponsToUse = selectedStyle !== 'balanced' ? loadout.weapons : (preset.weapons && preset.weapons.length > 0 ? preset.weapons : loadout.weapons);

    for (let i = 1; i <= count; i++) {
      const suffix = count > 1 ? ` #${i}` : '';
      const participant: Participant = {
        id: crypto.randomUUID(),
        name: `${preset.name}${suffix}`,
        role: preset.role,
        affiliation,
        ref: Math.min(10, Math.floor(preset.combatNumber / 1.5) + diffStatBonus),
        dex: Math.min(10, Math.floor(preset.combatNumber / 1.5) + diffStatBonus),
        body: 6 + diffStatBonus,
        will: 6,
        initiativeSkill: initBonus,
        hp: preset.hp + (diffStatBonus * 5),
        maxHp: preset.hp + (diffStatBonus * 5),
        seriouslyWoundedThreshold: Math.ceil((preset.hp + (diffStatBonus * 5)) / 2),
        woundState: 'not-wounded',
        dead: false,
        isPC: false,
        isGoon: true,
        tier: preset.tier,
        combatNumber: preset.combatNumber + diffStatBonus,
        nonCombatNumber: Math.max(7, preset.combatNumber - 2 + diffStatBonus),
        armor: {
          head: preset.armorHead + diffArmorBonus,
          body: preset.armorBody + diffArmorBonus,
          maxHead: preset.armorHead + diffArmorBonus,
          maxBody: preset.armorBody + diffArmorBonus
        },
        weapons: weaponsToUse.map(w => ({ ...w, ammoType: loadout.ammoType })),
        ammoType: loadout.ammoType,
        ordinance: loadout.ordinance,
        combatStyle: selectedStyle,
        difficulty: selectedDifficulty,
        cyberware: cyber,
        isCustomNPC: false,
        manualControl: false
      };
      newParticipants.push(participant);
    }

    if (onAddMultipleToEncounter) {
      onAddMultipleToEncounter(newParticipants);
    } else if (onAddToEncounter) {
      newParticipants.forEach(p => onAddToEncounter(p));
    }

    toast.success(`Spawned ${count}x ${preset.name} (${selectedDifficulty.toUpperCase()} / ${selectedStyle.replace('_', ' ')} loadout)!`, {
      icon: <Sparkles className="w-5 h-5 text-primary" />
    });
  };

  const handleCreateCustom = (andSave: boolean = false) => {
    if (!customName.trim()) {
      toast.error('Enemy Name is required');
      return;
    }

    let initBonus = 0;
    if (customCyberware.some(c => c.name.toLowerCase().includes('kerenzikov'))) initBonus += 2;
    if (customCyberware.some(c => c.name.toLowerCase().includes('sandevistan'))) initBonus += 3;

    const participant: Participant = {
      id: crypto.randomUUID(),
      name: customName.trim(),
      role: customRole,
      affiliation: customAffiliation,
      ref: Math.min(10, Math.floor(customCN / 1.5)),
      dex: Math.min(10, Math.floor(customCN / 1.5)),
      body: 6,
      will: 6,
      initiativeSkill: initBonus,
      hp: customHP,
      maxHp: customHP,
      seriouslyWoundedThreshold: Math.ceil(customHP / 2),
      woundState: 'not-wounded',
      dead: false,
      isPC: false,
      isGoon: true,
      tier: customTier,
      combatNumber: customCN,
      nonCombatNumber: Math.max(7, customCN - 2),
      armor: {
        head: customHeadSP,
        body: customBodySP,
        maxHead: customHeadSP,
        maxBody: customBodySP
      },
      weapons: customWeapons.length > 0 ? customWeapons.map(w => ({ ...w, ammoType: customAmmoType })) : [CORE_WEAPONS[0]],
      ammoType: customAmmoType,
      ordinance: customOrdnance,
      cyberware: customCyberware,
      isCustomNPC: true,
      manualControl: customManualControl
    };

    if (andSave) {
      const saved: SavedNPC = {
        id: crypto.randomUUID(),
        name: participant.name,
        npc: participant,
        savedAt: new Date().toISOString()
      };
      setSavedNPCs(prev => [...prev, saved]);
      toast.success(`Saved "${participant.name}" to NPC Catalog!`);
    }

    if (onAddToEncounter) {
      onAddToEncounter(participant);
      toast.success(`Added ${participant.name} to encounter!`);
    }

    // Reset name
    setCustomName('');
  };

  const filteredPresets = GOON_PRESETS.filter(p => {
    if (categoryFilter === 'all') return true;
    return p.category === categoryFilter;
  });

  const searchedWeapons = compendiumItems.filter(w => {
    if (!compendiumSearch) return true;
    return w.name.toLowerCase().includes(compendiumSearch.toLowerCase());
  }).slice(0, 16);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-card/90 via-card/50 to-primary/10 border border-primary/20 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-wide text-foreground uppercase" style={{ fontFamily: 'var(--font-display)' }}>
              NPC & Squad Spawner
            </h2>
            <p className="text-xs text-muted-foreground">
              Instant 1-click goon squads, threat tier balance, and compendium custom enemy creator.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/40 border border-border">
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'presets' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Squad Presets
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'custom' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Custom Creator
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'saved' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Saved Catalog ({savedNPCs.length})
          </button>
        </div>
      </div>

      {/* PRESETS TAB */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          {/* Tactical Bias & Threat Scaling Controls */}
          <div className="p-4 rounded-2xl bg-card border border-primary/20 space-y-3.5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Encounter Threat / Difficulty */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-1.5 font-mono">
                  <ShieldAlert className="w-3.5 h-3.5 text-warning" />
                  Encounter Threat Difficulty:
                </span>
                <div className="flex items-center flex-wrap gap-1.5">
                  {[
                    { id: 'easy' as const, label: 'Street (Easy)', desc: 'Standard Mooks, SP 4-7, Basic Ammo' },
                    { id: 'medium' as const, label: 'Dangerous (Med)', desc: 'Veterans, SP 7-11, Smoke/Basic' },
                    { id: 'hard' as const, label: 'Deadly (Hard)', desc: '+1 Stats, SP 11-13, AP Ammo, Flash/AP Grenades' },
                    { id: 'extreme' as const, label: 'Overkill (Extreme)', desc: '+2 Stats, SP 13-18, Incendiary/Smart, Heavy Rockets' }
                  ].map(diff => (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setSelectedDifficulty(diff.id)}
                      title={diff.desc}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                        selectedDifficulty === diff.id
                          ? diff.id === 'extreme' 
                            ? 'bg-rose-500 text-white font-black border-rose-400 shadow-md shadow-rose-500/20'
                            : diff.id === 'hard'
                              ? 'bg-amber-500 text-black font-black border-amber-400 shadow-md shadow-amber-500/20'
                              : 'bg-primary text-primary-foreground font-black border-primary shadow-sm'
                          : 'bg-secondary/40 hover:bg-secondary text-muted-foreground border-border'
                      }`}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Combat Style / Tactical Bias */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-1.5 font-mono">
                  <Swords className="w-3.5 h-3.5 text-primary" />
                  Tactical Loadout Bias:
                </span>
                <div className="flex items-center flex-wrap gap-1.5">
                  {[
                    { id: 'balanced' as const, label: 'Balanced', icon: Target },
                    { id: 'melee_focused' as const, label: 'Melee Focused', icon: Swords },
                    { id: 'ranged_focused' as const, label: 'Ranged Specialist', icon: Crosshair },
                    { id: 'demolitionist' as const, label: 'Demolitionist', icon: Bomb }
                  ].map(style => {
                    const Icon = style.icon;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedStyle(style.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
                          selectedStyle === style.id
                            ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm'
                            : 'bg-secondary/40 hover:bg-secondary text-muted-foreground border-border'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between border-t border-border/40 pt-2">
              <span>
                Equips authentic Foundry VTT weapons, ammo (AP, Incendiary, Smart), and ordnance (Grenades/Rockets) based on threat level.
              </span>
              <span className="text-primary font-bold">
                {selectedDifficulty.toUpperCase()} • {selectedStyle.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Faction:</span>
            {[
              { id: 'all', label: 'All Archetypes' },
              { id: 'street', label: 'Street Gangs' },
              { id: 'corpo', label: 'Megacorp Security' },
              { id: 'police', label: 'NCPD & Law' },
              { id: 'automated', label: 'Drones & Turrets' },
              { id: 'elite', label: 'Cyberpsychos & Elites' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm'
                    : 'bg-card border-border hover:bg-secondary/50 text-muted-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Preset Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPresets.map(preset => {
              const tierBadgeColor = 
                preset.tier === 'boss' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                preset.tier === 'lieutenant' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                'bg-blue-500/20 text-blue-400 border-blue-500/30';

              return (
                <div 
                  key={preset.id}
                  className="p-5 rounded-2xl bg-card/80 hover:bg-card border border-border/80 hover:border-primary/50 transition-all shadow-md flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-black text-base text-foreground group-hover:text-primary transition-colors">
                          {preset.name}
                        </h4>
                        <span className="text-xs text-muted-foreground">{preset.role}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${tierBadgeColor}`}>
                        {preset.tier}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground/90 line-clamp-2 mb-3">
                      {preset.description}
                    </p>

                    {/* Stats strip */}
                    <div className="grid grid-cols-3 gap-2 text-center my-2 p-2 rounded-xl bg-secondary/20 border border-border/40">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block">Combat #</span>
                        <span className="font-mono font-black text-xs text-primary">{preset.combatNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block">HP</span>
                        <span className="font-mono font-black text-xs text-rose-400">{preset.hp}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block">Armor SP</span>
                        <span className="font-mono font-black text-xs text-cyan-400">{preset.armorHead}/{preset.armorBody}</span>
                      </div>
                    </div>

                    {/* Weapons */}
                    <div className="flex flex-wrap gap-1.5 my-2">
                      {preset.weapons.map((w, i) => (
                        <span key={i} className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary/60 border border-border/60 text-foreground flex items-center gap-1">
                          <Swords className="w-3 h-3 text-primary" />
                          {w.name} ({w.system.damage})
                        </span>
                      ))}
                    </div>

                    {/* Combat Cyberware from Foundry packs */}
                    {preset.cyberware && preset.cyberware.length > 0 && (
                      <div className="flex flex-wrap gap-1 my-2">
                        {preset.cyberware.map((c, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1"
                            title={`${c.name}: ${c.benefit || c.description}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            {c.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Spawn Quick Buttons */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">Spawn Squad:</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleSpawnPreset(preset, 1)}
                        className="cyber-btn text-xs px-2.5 h-8 bg-secondary hover:bg-primary/20 hover:text-primary font-mono"
                        title="Spawn 1"
                      >
                        +1
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSpawnPreset(preset, 3)}
                        className="cyber-btn text-xs px-2.5 h-8 bg-secondary hover:bg-primary/20 hover:text-primary font-mono"
                        title="Spawn squad of 3"
                      >
                        +3
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSpawnPreset(preset, 5)}
                        className="cyber-btn text-xs px-2.5 h-8 bg-secondary hover:bg-primary/20 hover:text-primary font-mono"
                        title="Spawn mob of 5"
                      >
                        +5
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CUSTOM CREATOR TAB */}
      {activeTab === 'custom' && (
        <div className="p-6 rounded-2xl bg-card border-2 border-primary/30 shadow-2xl backdrop-blur-md space-y-6 animate-in">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-lg font-black tracking-wider uppercase text-primary flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Custom Enemy & Goon Creator
              </h3>
              <p className="text-xs text-muted-foreground">
                Set combat numbers, threat tiers, and equip official Foundry VTT weapons directly.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCustomName('Combat Zone Cyberpsycho');
                  setCustomRole('Cyberpsycho');
                  setCustomCN(14);
                  setCustomHP(55);
                  setCustomHeadSP(13);
                  setCustomBodySP(13);
                  setCustomTier('boss');
                }}
                className="cyber-btn text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-warning" />
                Fill Cyberpsycho
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">NPC Name</label>
              <Input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Arasaka Black Ops Assassin"
                className="cyber-input font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Role / Subtitle</label>
              <Input
                value={customRole}
                onChange={e => setCustomRole(e.target.value)}
                placeholder="e.g. Solo, Fixer"
                className="cyber-input"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Affiliation / Side</label>
              <select
                value={customAffiliation}
                onChange={e => setCustomAffiliation(e.target.value as Affiliation)}
                className="cyber-input w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
              >
                <option value="hostile_npc">Hostile (Enemy)</option>
                <option value="friendly_npc">Friendly (Allied NPC)</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>

          {/* GM Manual Control Option */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border">
            <input
              type="checkbox"
              id="customManualControl"
              checked={customManualControl}
              onChange={e => setCustomManualControl(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
            />
            <label htmlFor="customManualControl" className="text-xs font-bold text-foreground cursor-pointer flex flex-col">
              <span className="flex items-center gap-1.5 text-primary">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                GM Exclusive Manual Control (Custom Friendly / Hostile NPC)
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                You retain complete manual control of movesets and abilities. This NPC will be <strong>excluded from automated combat resolution</strong>, allowing you to manually decide what they do and when.
              </span>
            </label>
          </div>

          {/* Quick Threat Tier Presets */}
          <div className="p-4 rounded-xl bg-secondary/15 border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground uppercase">Threat Tier Balance</label>
              <span className="text-xs text-primary font-mono font-bold">Combat Number: {customCN}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { tier: 'mook' as const, label: 'Mook (Street Scum)', cn: 10, hp: 25, sp: 7 },
                { tier: 'lieutenant' as const, label: 'Lieutenant (Veteran)', cn: 12, hp: 40, sp: 11 },
                { tier: 'boss' as const, label: 'Boss / Cyberpsycho', cn: 15, hp: 60, sp: 13 }
              ].map(t => (
                <button
                  key={t.tier}
                  type="button"
                  onClick={() => {
                    setCustomTier(t.tier);
                    setCustomCN(t.cn);
                    setCustomHP(t.hp);
                    setCustomHeadSP(t.sp);
                    setCustomBodySP(t.sp);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    customTier === t.tier
                      ? 'bg-primary/20 border-primary text-primary font-bold shadow-md shadow-primary/20'
                      : 'bg-card hover:bg-secondary/40 border-border text-foreground'
                  }`}
                >
                  <div className="font-bold text-xs">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    CN {t.cn} | HP {t.hp} | SP {t.sp}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Fine-tuning Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-card border border-border">
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">
                Combat Number
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={customCN}
                onChange={e => setCustomCN(parseInt(e.target.value) || 1)}
                className="cyber-input font-mono font-bold text-primary"
              />
            </div>

            <div className="p-3 rounded-xl bg-card border border-border">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                <Heart className="w-3.5 h-3.5 text-rose-500" /> Max HP
              </label>
              <Input
                type="number"
                min={1}
                value={customHP}
                onChange={e => setCustomHP(parseInt(e.target.value) || 1)}
                className="cyber-input font-mono font-bold text-rose-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-card border border-border">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> Head SP
              </label>
              <Input
                type="number"
                min={0}
                value={customHeadSP}
                onChange={e => setCustomHeadSP(parseInt(e.target.value) || 0)}
                className="cyber-input font-mono font-bold text-cyan-400"
              />
            </div>

            <div className="p-3 rounded-xl bg-card border border-border">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> Body SP
              </label>
              <Input
                type="number"
                min={0}
                value={customBodySP}
                onChange={e => setCustomBodySP(parseInt(e.target.value) || 0)}
                className="cyber-input font-mono font-bold text-cyan-400"
              />
            </div>
          </div>

          {/* Compendium Weapon Picker */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-primary" />
                Equipped Weapons ({customWeapons.length})
              </label>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search FVTT Weapons compendium..."
                  value={compendiumSearch}
                  onChange={e => setCompendiumSearch(e.target.value)}
                  className="cyber-input pl-8 text-xs h-9"
                />
              </div>
            </div>

            {/* Currently Selected Weapons */}
            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-secondary/15 border border-border min-h-[46px]">
              {customWeapons.map((w, idx) => (
                <span 
                  key={idx} 
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/20 border border-primary text-primary font-mono text-xs"
                >
                  <Swords className="w-3 h-3" />
                  {w.name} ({w.system.damage})
                  <button 
                    type="button"
                    onClick={() => setCustomWeapons(prev => prev.filter((_, i) => i !== idx))}
                    className="ml-1 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              {customWeapons.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No weapons equipped. Click weapons below to add.</span>
              )}
            </div>

            {/* Weapon search suggestions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
              {searchedWeapons.map(wep => (
                <button
                  key={wep._id || wep.name}
                  type="button"
                  onClick={() => {
                    if (!customWeapons.some(w => w.name === wep.name)) {
                      setCustomWeapons(prev => [...prev, wep]);
                    }
                  }}
                  className="p-2 rounded-lg bg-card hover:bg-secondary/40 border border-border text-left text-xs flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="truncate pr-1">{wep.name}</span>
                  <span className="font-mono text-[10px] px-1 rounded bg-secondary text-muted-foreground whitespace-nowrap">
                    {wep.system.damage}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Role-Based Combat Cyberware from Foundry Packs */}
          <div className="space-y-3 p-4 rounded-xl bg-secondary/15 border border-border/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Combat Cyberware from Foundry Packs ({customCyberware.length})
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const autoCyber = compendium.getCombatCyberwareForRole(customRole, customTier);
                  setCustomCyberware(autoCyber);
                  toast.success(`Auto-equipped ${autoCyber.length} combat cyberware items for ${customRole}!`);
                }}
                className="cyber-btn text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10 h-8"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400" />
                Auto-Equip {customRole} Cyberware
              </Button>
            </div>

            {/* Currently Selected Cyberware */}
            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-secondary/15 border border-border min-h-[46px]">
              {customCyberware.map((c, idx) => (
                <span 
                  key={idx} 
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs"
                  title={c.benefit || c.description}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {c.name}
                  <button 
                    type="button"
                    onClick={() => setCustomCyberware(prev => prev.filter((_, i) => i !== idx))}
                    className="ml-1 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              {customCyberware.length === 0 && (
                <span className="text-xs text-muted-foreground italic">
                  No cyberware equipped. Click "Auto-Equip" above or select below.
                </span>
              )}
            </div>

            {/* Quick Cyberware options from Foundry pack */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
              {compendium.getCyberwareItems().slice(0, 16).map(item => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => {
                    if (!customCyberware.some(c => c.name === item.name)) {
                      setCustomCyberware(prev => [...prev, {
                        _id: item._id,
                        name: item.name,
                        type: item.system?.type || 'cyberware',
                        description: item.system?.description?.value?.replace(/<[^>]*>?/gm, '').trim() || item.name,
                        benefit: item.system?.type || 'Combat Cyberware'
                      }]);
                    }
                  }}
                  className="p-2 rounded-lg bg-card hover:bg-secondary/40 border border-border text-left text-xs flex items-center justify-between cursor-pointer transition-colors"
                  title={item.name}
                >
                  <span className="truncate pr-1">{item.name}</span>
                  <span className="font-mono text-[9px] px-1 rounded bg-secondary text-amber-400 whitespace-nowrap">
                    +Add
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Ammunition Selection (Directly from Foundry Packs) */}
          <div className="space-y-2 p-3.5 rounded-xl bg-secondary/15 border border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Ammunition Type ({customAmmoType})
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {customAmmoType === 'Armor-Piercing' ? 'Ablates 2 SP on penetrating damage' :
                 customAmmoType === 'Incendiary' ? 'Sets target on fire (2 dmg/turn)' :
                 customAmmoType === 'Smart' ? '+1 to attack rolls with smartlink' :
                 customAmmoType === 'Expansive' ? 'Critical injury on 2+ sixes' :
                 'Standard ammunition'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['Basic', 'Armor-Piercing', 'Incendiary', 'Smart', 'Expansive', 'Acid', 'EMP', 'Biotoxin', 'Rubber'].map(ammo => (
                <button
                  key={ammo}
                  type="button"
                  onClick={() => setCustomAmmoType(ammo)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                    customAmmoType === ammo
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                      : 'bg-card hover:bg-secondary/40 text-muted-foreground border-border'
                  }`}
                >
                  {ammo}
                </button>
              ))}
            </div>
          </div>

          {/* Ordnance & Explosives Selection (Directly from Foundry Packs) */}
          <div className="space-y-2.5 p-3.5 rounded-xl bg-secondary/15 border border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Bomb className="w-3.5 h-3.5 text-rose-400" />
                Ordnance & Explosives ({customOrdnance.length})
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                Directly equipped from Foundry VTT pack
              </span>
            </div>

            {/* Currently equipped ordnance */}
            <div className="flex flex-wrap gap-2 p-2.5 rounded-lg bg-card/60 border border-border min-h-[38px]">
              {customOrdnance.map((ord, oidx) => (
                <span
                  key={oidx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono text-xs"
                >
                  <Bomb className="w-3 h-3" />
                  {ord.name} ({ord.damage}) x{ord.count}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomOrdnance(prev => prev.filter((_, i) => i !== oidx));
                    }}
                    className="ml-1 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              {customOrdnance.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No ordnance equipped. Click options below to add.</span>
              )}
            </div>

            {/* Quick ordnance buttons from compendium */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {compendium.getOrdnanceItems().slice(0, 8).map(ordItem => (
                <button
                  key={ordItem._id}
                  type="button"
                  onClick={() => {
                    setCustomOrdnance(prev => {
                      const existing = prev.find(o => o.name === ordItem.name);
                      if (existing) {
                        return prev.map(o => o.name === ordItem.name ? { ...o, count: o.count + 1 } : o);
                      }
                      return [...prev, { ...ordItem, count: 1 }];
                    });
                  }}
                  className="p-1.5 px-2 rounded-lg bg-card hover:bg-secondary/40 border border-border text-left text-xs flex items-center justify-between cursor-pointer transition-colors"
                  title={ordItem.name}
                >
                  <span className="truncate pr-1">{ordItem.name}</span>
                  <span className="font-mono text-[9px] px-1 rounded bg-secondary text-rose-400 whitespace-nowrap">
                    +1
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              variant="outline"
              onClick={() => handleCreateCustom(true)}
              className="cyber-btn text-xs"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save to Catalog & Add
            </Button>
            <Button
              onClick={() => handleCreateCustom(false)}
              className="cyber-btn bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
            >
              <ArrowRight className="w-4 h-4 mr-1.5" />
              Add to Active Encounter
            </Button>
          </div>
        </div>
      )}

      {/* SAVED CATALOG TAB */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedNPCs.map(saved => (
              <div 
                key={saved.id}
                className="p-5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-base text-foreground">{saved.name}</h4>
                    <button
                      onClick={() => {
                        setSavedNPCs(prev => prev.filter(s => s.id !== saved.id));
                        toast.info(`Removed ${saved.name} from catalog`);
                      }}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center my-2 p-2 rounded-xl bg-secondary/20 border border-border/40">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block">CN</span>
                      <span className="font-mono font-bold text-xs text-primary">{saved.npc.combatNumber ?? 11}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block">HP</span>
                      <span className="font-mono font-bold text-xs text-rose-400">{saved.npc.hp}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block">SP</span>
                      <span className="font-mono font-bold text-xs text-cyan-400">
                        {saved.npc.armor?.head ?? 0}/{saved.npc.armor?.body ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (onAddToEncounter) {
                        onAddToEncounter({ ...saved.npc, id: crypto.randomUUID() });
                        toast.success(`Spawned ${saved.name}!`);
                      }
                    }}
                    className="cyber-btn bg-primary text-primary-foreground text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Deploy to Encounter
                  </Button>
                </div>
              </div>
            ))}

            {savedNPCs.length === 0 && (
              <div className="col-span-full text-center py-12 border-2 border-dashed border-border/60 rounded-2xl bg-card/30">
                <Bot className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="text-lg font-bold text-foreground mb-1">No Saved Custom NPCs</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Use the Custom Creator tab to design custom bosses, lieutenants, and save them for reuse.
                </p>
                <Button onClick={() => setActiveTab('custom')} className="cyber-btn bg-primary text-primary-foreground text-xs">
                  Create Custom Enemy
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
