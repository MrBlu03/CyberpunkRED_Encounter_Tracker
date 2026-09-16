import { useState } from 'react';
import { Users, Plus, User, Trash2, Shield, Heart, Swords, Edit2, Check, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CORE_WEAPONS, CORE_ARMOR_PRESETS } from '@/lib/compendium';
import type { PC, Participant, Weapon } from '@/types';

interface PCManagerProps {
  onAddToEncounter?: (pc: Participant) => void;
  onAddPartyToEncounter?: (pcs: Participant[]) => void;
}

const PREMADE_CHARACTERS: Omit<PC, 'id'>[] = [
  {
    name: "Johnny 'Silver' Vex",
    handle: "Silver",
    role: "Solo",
    ref: 8,
    dex: 8,
    body: 7,
    will: 6,
    hp: 45,
    maxHp: 45,
    armorHead: 11,
    armorBody: 11,
    shieldSp: 0,
    initiativeSkill: 4,
    evasionSkill: 6,
    weapons: [
      CORE_WEAPONS.find(w => w.name === "Heavy Pistol") || CORE_WEAPONS[1],
      CORE_WEAPONS.find(w => w.name === "Assault Rifle") || CORE_WEAPONS[6]
    ]
  },
  {
    name: "Cipher / Kira Vance",
    handle: "Cipher",
    role: "Netrunner",
    ref: 6,
    dex: 7,
    body: 5,
    will: 7,
    hp: 40,
    maxHp: 40,
    armorHead: 7,
    armorBody: 11,
    shieldSp: 0,
    initiativeSkill: 2,
    evasionSkill: 5,
    weapons: [
      CORE_WEAPONS.find(w => w.name === "SMG") || CORE_WEAPONS[3]
    ]
  },
  {
    name: "Doc Axel 'Patch' Ramirez",
    handle: "Patch",
    role: "Medtech",
    ref: 6,
    dex: 6,
    body: 6,
    will: 6,
    hp: 40,
    maxHp: 40,
    armorHead: 7,
    armorBody: 7,
    shieldSp: 0,
    initiativeSkill: 3,
    evasionSkill: 4,
    weapons: [
      CORE_WEAPONS.find(w => w.name === "Medium Pistol") || CORE_WEAPONS[0]
    ]
  },
  {
    name: "Jax 'Wrench' Thorne",
    handle: "Jax",
    role: "Tech",
    ref: 7,
    dex: 6,
    body: 8,
    will: 5,
    hp: 45,
    maxHp: 45,
    armorHead: 11,
    armorBody: 11,
    shieldSp: 10,
    initiativeSkill: 3,
    evasionSkill: 4,
    weapons: [
      CORE_WEAPONS.find(w => w.name === "Shotgun") || CORE_WEAPONS[5],
      CORE_WEAPONS.find(w => w.name.includes("Heavy Melee")) || CORE_WEAPONS[10]
    ]
  }
];

export function PCManager({ onAddToEncounter, onAddPartyToEncounter }: PCManagerProps) {
  const [pcs, setPcs] = useLocalStorage<PC[]>('cyberpunk-pcs', []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formPC, setFormPC] = useState<Partial<PC>>({
    name: '',
    handle: '',
    role: 'Solo',
    ref: 7,
    dex: 7,
    body: 6,
    will: 6,
    hp: 40,
    maxHp: 40,
    armorHead: 11,
    armorBody: 11,
    shieldSp: 0,
    initiativeSkill: 3,
    evasionSkill: 4,
    weapons: [CORE_WEAPONS[1]]
  });

  // Calculate HP based on BODY and WILL (10 + 5 * ceil((BODY + WILL)/2))
  const handleStatChange = (key: 'body' | 'will', val: number) => {
    setFormPC(prev => {
      const b = key === 'body' ? val : (prev.body ?? 6);
      const w = key === 'will' ? val : (prev.will ?? 6);
      const calcHp = 10 + 5 * Math.ceil((b + w) / 2);
      return {
        ...prev,
        [key]: val,
        hp: calcHp,
        maxHp: calcHp
      };
    });
  };

  const convertPcToParticipant = (pc: PC): Participant => {
    return {
      id: pc.id,
      name: pc.handle ? `${pc.name} (${pc.handle})` : pc.name,
      role: pc.role,
      affiliation: 'player',
      ref: pc.ref,
      dex: pc.dex ?? pc.ref,
      body: pc.body ?? 6,
      will: pc.will ?? 6,
      initiativeSkill: pc.initiativeSkill ?? 0,
      evasionSkill: pc.evasionSkill ?? 4,
      hp: pc.hp,
      maxHp: pc.maxHp,
      seriouslyWoundedThreshold: Math.ceil(pc.maxHp / 2),
      woundState: 'not-wounded',
      dead: pc.hp <= 0,
      isPC: true,
      armor: {
        head: pc.armorHead,
        body: pc.armorBody,
        maxHead: pc.armorHead,
        maxBody: pc.armorBody,
        shield: pc.shieldSp,
        shieldEquipped: (pc.shieldSp || 0) > 0
      },
      weapons: pc.weapons && pc.weapons.length > 0 ? pc.weapons : [CORE_WEAPONS[1]]
    };
  };

  const handleSavePC = () => {
    if (!formPC.name?.trim()) {
      toast.error('Character Name is required');
      return;
    }

    if (editingId) {
      setPcs(prev => prev.map(p => p.id === editingId ? { ...p, ...formPC } as PC : p));
      toast.success(`${formPC.name} updated!`);
      setEditingId(null);
    } else {
      const newPC: PC = {
        id: crypto.randomUUID(),
        name: formPC.name!,
        handle: formPC.handle || '',
        role: formPC.role || 'Solo',
        ref: formPC.ref ?? 6,
        dex: formPC.dex ?? formPC.ref ?? 6,
        body: formPC.body ?? 6,
        will: formPC.will ?? 6,
        hp: formPC.hp ?? 40,
        maxHp: formPC.maxHp ?? 40,
        armorHead: formPC.armorHead ?? 0,
        armorBody: formPC.armorBody ?? 0,
        shieldSp: formPC.shieldSp ?? 0,
        initiativeSkill: formPC.initiativeSkill ?? 0,
        evasionSkill: formPC.evasionSkill ?? 4,
        weapons: formPC.weapons ?? [CORE_WEAPONS[1]]
      };
      setPcs(prev => [...prev, newPC]);
      toast.success(`${newPC.name} added to Party!`);
    }

    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setFormPC({
      name: '',
      handle: '',
      role: 'Solo',
      ref: 7,
      dex: 7,
      body: 6,
      will: 6,
      hp: 40,
      maxHp: 40,
      armorHead: 11,
      armorBody: 11,
      shieldSp: 0,
      initiativeSkill: 3,
      evasionSkill: 4,
      weapons: [CORE_WEAPONS[1]]
    });
    setEditingId(null);
  };

  const handleEdit = (pc: PC) => {
    setEditingId(pc.id);
    setFormPC({ ...pc });
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    setPcs(prev => prev.filter(pc => pc.id !== id));
    toast.info('Character removed from Party');
  };

  const handleAddSampleParty = () => {
    const samples: PC[] = PREMADE_CHARACTERS.map(p => ({
      ...p,
      id: crypto.randomUUID()
    }));
    setPcs(prev => [...prev, ...samples]);
    toast.success('Loaded sample edgerunner crew!');
  };

  const handleDeployParty = () => {
    if (pcs.length === 0) {
      toast.error('No players in your party roster to deploy');
      return;
    }
    const participants = pcs.map(convertPcToParticipant);
    if (onAddPartyToEncounter) {
      onAddPartyToEncounter(participants);
    } else if (onAddToEncounter) {
      participants.forEach(p => onAddToEncounter(p));
    }
    toast.success(`Deployed ${pcs.length} player(s) to active encounter!`, {
      icon: <Sparkles className="w-5 h-5 text-primary" />
    });
  };

  const toggleWeapon = (weapon: Weapon) => {
    setFormPC(prev => {
      const current = prev.weapons || [];
      const exists = current.some(w => w.name === weapon.name);
      if (exists) {
        return { ...prev, weapons: current.filter(w => w.name !== weapon.name) };
      } else {
        return { ...prev, weapons: [...current, weapon] };
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-card/90 via-card/50 to-primary/10 border border-primary/20 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-wide text-foreground uppercase" style={{ fontFamily: 'var(--font-display)' }}>
              Party Roster <span className="text-primary font-mono text-sm font-normal">({pcs.length} PCs)</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Manage player characters and deploy entire crew to the encounter in one click.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {pcs.length === 0 && (
            <Button onClick={handleAddSampleParty} variant="outline" className="cyber-btn border-border/80 text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-warning" />
              Load Sample Crew
            </Button>
          )}

          <Button 
            onClick={handleDeployParty} 
            disabled={pcs.length === 0}
            className="cyber-btn bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/20"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Deploy Crew to Encounter
          </Button>

          <Button 
            onClick={() => {
              if (isAdding) resetForm();
              setIsAdding(!isAdding);
            }} 
            variant="outline" 
            className="cyber-btn"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {isAdding ? 'Cancel' : 'New PC'}
          </Button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {isAdding && (
        <div className="p-6 rounded-2xl bg-card/95 border-2 border-primary/30 shadow-2xl backdrop-blur-md animate-in space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-lg font-black tracking-wider uppercase text-primary flex items-center gap-2">
              <User className="w-5 h-5" />
              {editingId ? 'Edit Player Character' : 'Create New Player Character'}
            </h3>
            <span className="text-xs text-muted-foreground font-mono">Cyberpunk RED RAW</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Name</label>
              <Input
                value={formPC.name || ''}
                onChange={e => setFormPC(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Johnny Vex"
                className="cyber-input font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Street Handle</label>
              <Input
                value={formPC.handle || ''}
                onChange={e => setFormPC(p => ({ ...p, handle: e.target.value }))}
                placeholder="e.g. Silver"
                className="cyber-input"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Role</label>
              <select
                value={formPC.role || 'Solo'}
                onChange={e => setFormPC(p => ({ ...p, role: e.target.value }))}
                className="cyber-input w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
              >
                {['Solo', 'Netrunner', 'Tech', 'Medtech', 'Media', 'Exec', 'Lawman', 'Fixer', 'Nomad', 'Rockerboy'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats & Derived */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 p-4 rounded-xl bg-secondary/15 border border-border/50">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase block">REF</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={formPC.ref ?? 6}
                onChange={e => setFormPC(p => ({ ...p, ref: parseInt(e.target.value) || 1 }))}
                className="cyber-input text-center font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase block">DEX</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={formPC.dex ?? 6}
                onChange={e => setFormPC(p => ({ ...p, dex: parseInt(e.target.value) || 1 }))}
                className="cyber-input text-center font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase block">BODY</label>
              <Input
                type="number"
                min={1}
                max={14}
                value={formPC.body ?? 6}
                onChange={e => handleStatChange('body', parseInt(e.target.value) || 1)}
                className="cyber-input text-center font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase block">WILL</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={formPC.will ?? 6}
                onChange={e => handleStatChange('will', parseInt(e.target.value) || 1)}
                className="cyber-input text-center font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase block">Init Skill</label>
              <Input
                type="number"
                min={0}
                max={10}
                value={formPC.initiativeSkill ?? 0}
                onChange={e => setFormPC(p => ({ ...p, initiativeSkill: parseInt(e.target.value) || 0 }))}
                className="cyber-input text-center font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase block">Evasion Skill</label>
              <Input
                type="number"
                min={0}
                max={10}
                value={formPC.evasionSkill ?? 4}
                onChange={e => setFormPC(p => ({ ...p, evasionSkill: parseInt(e.target.value) || 0 }))}
                className="cyber-input text-center font-mono font-bold"
              />
            </div>
          </div>

          {/* Health & Armor */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-card border border-border">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <Heart className="w-3.5 h-3.5 text-rose-500" /> Max HP
              </label>
              <Input
                type="number"
                value={formPC.maxHp ?? 40}
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setFormPC(p => ({ ...p, maxHp: val, hp: val }));
                }}
                className="cyber-input font-mono font-bold text-rose-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-card border border-border">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> Head SP
              </label>
              <Input
                type="number"
                min={0}
                value={formPC.armorHead ?? 0}
                onChange={e => setFormPC(p => ({ ...p, armorHead: parseInt(e.target.value) || 0 }))}
                className="cyber-input font-mono font-bold text-cyan-400"
              />
            </div>

            <div className="p-3 rounded-xl bg-card border border-border">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> Body SP
              </label>
              <Input
                type="number"
                min={0}
                value={formPC.armorBody ?? 0}
                onChange={e => setFormPC(p => ({ ...p, armorBody: parseInt(e.target.value) || 0 }))}
                className="cyber-input font-mono font-bold text-cyan-400"
              />
            </div>

            <div className="p-3 rounded-xl bg-card border border-border">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-amber-400" /> Shield SP
              </label>
              <Input
                type="number"
                min={0}
                value={formPC.shieldSp ?? 0}
                onChange={e => setFormPC(p => ({ ...p, shieldSp: parseInt(e.target.value) || 0 }))}
                className="cyber-input font-mono font-bold text-amber-400"
              />
            </div>
          </div>

          {/* Quick Armor Preset Selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Quick Armor Presets</label>
            <div className="flex flex-wrap gap-1.5">
              {CORE_ARMOR_PRESETS.slice(1, 8).map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setFormPC(p => ({
                    ...p,
                    armorHead: preset.head,
                    armorBody: preset.body,
                    shieldSp: preset.shield || p.shieldSp
                  }))}
                  className="px-2.5 py-1 text-xs rounded-lg bg-secondary/30 hover:bg-primary/20 hover:text-primary border border-border transition-colors cursor-pointer"
                >
                  {preset.name} (SP {preset.sp})
                </button>
              ))}
            </div>
          </div>

          {/* Equipped Weapons */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-primary" /> Equipped Weapons (Click to toggle)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CORE_WEAPONS.slice(0, 8).map(wep => {
                const isSelected = formPC.weapons?.some(w => w.name === wep.name);
                return (
                  <button
                    key={wep.name}
                    type="button"
                    onClick={() => toggleWeapon(wep)}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex items-center justify-between cursor-pointer ${
                      isSelected 
                        ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm shadow-primary/20' 
                        : 'bg-card hover:bg-secondary/40 border-border text-foreground'
                    }`}
                  >
                    <span className="truncate">{wep.name}</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-background/80 text-muted-foreground">
                      {wep.system.damage}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsAdding(false)} className="cyber-btn">
              Cancel
            </Button>
            <Button onClick={handleSavePC} className="cyber-btn bg-primary text-primary-foreground font-bold">
              <Check className="w-4 h-4 mr-1.5" />
              {editingId ? 'Save Changes' : 'Add Character'}
            </Button>
          </div>
        </div>
      )}

      {/* Roster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pcs.map(pc => (
          <div 
            key={pc.id} 
            className="p-5 rounded-2xl bg-card/70 hover:bg-card border border-border/80 hover:border-primary/50 transition-all shadow-md group relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/70 group-hover:bg-primary transition-colors" />

            <div>
              <div className="flex items-start justify-between gap-3 mb-3 pl-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {pc.name}
                    </h4>
                    {pc.handle && (
                      <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-primary/10 text-primary border border-primary/20">
                        "{pc.handle}"
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {pc.role}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleEdit(pc)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(pc.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-4 gap-2 text-center pl-2 my-3">
                <div className="p-2 rounded-xl bg-secondary/30 border border-border/50">
                  <span className="text-[10px] text-muted-foreground uppercase block">HP</span>
                  <span className="font-mono font-black text-sm text-rose-500">{pc.hp}/{pc.maxHp}</span>
                </div>
                <div className="p-2 rounded-xl bg-secondary/30 border border-border/50">
                  <span className="text-[10px] text-muted-foreground uppercase block">Head SP</span>
                  <span className="font-mono font-black text-sm text-cyan-400">{pc.armorHead}</span>
                </div>
                <div className="p-2 rounded-xl bg-secondary/30 border border-border/50">
                  <span className="text-[10px] text-muted-foreground uppercase block">Body SP</span>
                  <span className="font-mono font-black text-sm text-cyan-400">{pc.armorBody}</span>
                </div>
                <div className="p-2 rounded-xl bg-secondary/30 border border-border/50">
                  <span className="text-[10px] text-muted-foreground uppercase block">REF / DEX</span>
                  <span className="font-mono font-black text-sm text-amber-400">{pc.ref} / {pc.dex ?? pc.ref}</span>
                </div>
              </div>

              {/* Weapons list */}
              {pc.weapons && pc.weapons.length > 0 && (
                <div className="pl-2 mb-3 flex flex-wrap gap-1.5">
                  {pc.weapons.map((w, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-secondary/50 border border-border text-foreground">
                      <Swords className="w-3 h-3 text-primary" />
                      {w.name} ({w.system?.damage})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            <div className="pt-2 pl-2 border-t border-border/40 flex justify-end">
              <Button
                onClick={() => {
                  if (onAddToEncounter) {
                    onAddToEncounter(convertPcToParticipant(pc));
                    toast.success(`${pc.name} added to encounter!`);
                  }
                }}
                variant="outline"
                className="cyber-btn text-xs hover:border-primary hover:text-primary w-full sm:w-auto"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add to Current Encounter
              </Button>
            </div>
          </div>
        ))}

        {pcs.length === 0 && !isAdding && (
          <div className="col-span-full text-center py-12 border-2 border-dashed border-border/60 rounded-2xl bg-card/30">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-1">No Player Characters Saved</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
              Add your players here once, and you can deploy them to any encounter with a single click.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={handleAddSampleParty} variant="outline" className="cyber-btn text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-warning" />
                Load Sample Crew
              </Button>
              <Button onClick={() => setIsAdding(true)} className="cyber-btn bg-primary text-primary-foreground text-xs font-bold">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create Player
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
