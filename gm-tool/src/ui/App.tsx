import React, { useMemo, useState, useEffect } from 'react'
import { DamageCalculator } from './DamageCalculator'
import { DamageDialog } from './DamageDialog'
import NPCGenerator from './NPCGenerator'
import ShopGenerator from './ShopGenerator'
import EncounterGenerator from './EncounterGenerator'
import DiceRoller from './DiceRoller'
import FloatingCombatControls from './FloatingCombatControls'
import TimeTracker from './TimeTracker'
import CriticalInjuryRoller from './CriticalInjuryRoller'
import Tarot from './Tarot'
import PCManager from './PCManager'
import SettingsManager from './SettingsManager'

export type WoundState = 'not-wounded' | 'lightly-wounded' | 'seriously-wounded' | 'mortally-wounded' | 'dead'

// Apply theme on app load
function initializeTheme() {
  const mode = (localStorage.getItem('theme-mode') as 'light' | 'dark') || 'dark';
  const palette = (localStorage.getItem('theme-palette') as 'orange' | 'blue' | 'red') || 'orange';
  
  const r = document.documentElement;
  const bases = mode === 'dark'
    ? { 
        bg: '#0a0a0a', 
        surface: '#1a1a1a', 
        surface2: '#2a2a2a',
        text: '#e0e0e0', 
        textMuted: '#888',
        border: '#333',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3',
        woundLight: 'rgba(255, 255, 0, 0.2)',
        woundSerious: 'rgba(255, 165, 0, 0.3)',
        woundMortal: 'rgba(255, 69, 0, 0.4)',
        woundDead: 'rgba(128, 0, 0, 0.5)',
        contrastText: '#fff'
      }
    : { 
        bg: '#f8f9fa', 
        surface: '#ffffff', 
        surface2: '#f1f3f4',
        text: '#212529', 
        textMuted: '#6c757d',
        border: '#dee2e6',
        success: '#2e7d32',
        warning: '#ed6c02',
        error: '#d32f2f',
        info: '#1976d2',
        woundLight: 'rgba(255, 235, 59, 0.4)',
        woundSerious: 'rgba(255, 152, 0, 0.5)',
        woundMortal: 'rgba(244, 67, 54, 0.6)',
        woundDead: 'rgba(183, 28, 28, 0.7)',
        contrastText: '#000'
      };

  const palettes = {
    orange: { 
      accent: mode === 'dark' ? '#ff6b35' : '#dc5222', 
      accentAlt: mode === 'dark' ? '#ff8c42' : '#f56500', 
      subtle: mode === 'dark' ? 'rgba(255,107,53,0.1)' : 'rgba(220,82,34,0.1)', 
      textAccent: mode === 'dark' ? '#ff6b35' : '#dc5222',
      hover: mode === 'dark' ? '#ff5722' : '#c44a1d'
    },
    blue: { 
      accent: mode === 'dark' ? '#4a9eff' : '#0d6efd', 
      accentAlt: mode === 'dark' ? '#6bb6ff' : '#3d8bfd', 
      subtle: mode === 'dark' ? 'rgba(74,158,255,0.12)' : 'rgba(13,110,253,0.1)', 
      textAccent: mode === 'dark' ? '#4a9eff' : '#0d6efd',
      hover: mode === 'dark' ? '#357abd' : '#0b5ed7'
    },
    red: { 
      accent: mode === 'dark' ? '#ff4757' : '#e74c3c', 
      accentAlt: mode === 'dark' ? '#ff6b7a' : '#ec7063', 
      subtle: mode === 'dark' ? 'rgba(255,71,87,0.15)' : 'rgba(231,76,60,0.12)', 
      textAccent: mode === 'dark' ? '#ff7675' : '#e74c3c',
      hover: mode === 'dark' ? '#ff3742' : '#cb4335'
    },
  };

  const p = palettes[palette];
  r.style.setProperty('--bg', bases.bg, 'important');
  r.style.setProperty('--surface', bases.surface, 'important');
  r.style.setProperty('--surface-2', bases.surface2, 'important');
  r.style.setProperty('--text', bases.text, 'important');
  r.style.setProperty('--text-muted', bases.textMuted, 'important');
  r.style.setProperty('--border', bases.border, 'important');
  r.style.setProperty('--success', bases.success, 'important');
  r.style.setProperty('--warning', bases.warning, 'important');
  r.style.setProperty('--error', bases.error, 'important');
  r.style.setProperty('--info', bases.info, 'important');
  r.style.setProperty('--wound-light', bases.woundLight, 'important');
  r.style.setProperty('--wound-serious', bases.woundSerious, 'important');
  r.style.setProperty('--wound-mortal', bases.woundMortal, 'important');
  r.style.setProperty('--wound-dead', bases.woundDead, 'important');
  r.style.setProperty('--contrast-text', bases.contrastText, 'important');
  r.style.setProperty('--accent', p.accent, 'important');
  r.style.setProperty('--accent-alt', p.accentAlt, 'important');
  r.style.setProperty('--accent-subtle', p.subtle, 'important');
  r.style.setProperty('--text-accent', p.textAccent, 'important');
  r.style.setProperty('--accent-hover', p.hover, 'important');
}

export type Participant = {
  id: string
  name: string
  ref: number
  initiativeSkill?: number
  rolled?: number
  total?: number
  hp?: number
  maxHp?: number
  dead?: boolean
  woundState?: WoundState
  notes?: string
  isPC?: boolean
  armor?: {
    head: number
    body: number
    shield?: number
    shieldEquipped?: boolean
  }
  cover?: {
    type: 'light' | 'medium' | 'heavy' | 'human-shield'
    hp: number
    maxHp: number
  }
  weapons?: Array<{
    _id: string
    name: string
    system: {
      damage: string
      weaponSkill: string
      attackmod: number
    }
  }>
}

export type EncounterState = {
  active: boolean
  round: number
  turnIndex: number
  archived: boolean
}

function d10() { return Math.floor(Math.random() * 10) + 1 }

function getWoundState(hp: number, maxHp: number): WoundState {
  if (hp <= 0) return 'dead'
  const ratio = hp / maxHp
  if (ratio <= 0.25) return 'mortally-wounded'
  if (ratio <= 0.5) return 'seriously-wounded'
  if (ratio <= 0.75) return 'lightly-wounded'
  return 'not-wounded'
}

function canAct(participant: Participant): boolean {
  return !participant.dead && participant.woundState !== 'seriously-wounded' && participant.woundState !== 'dead'
}

export function App() {
  const [activeTab, setActiveTab] = useState('encounter');
  const [participants, setParticipants] = useState<Participant[]>([])
  const [encounter, setEncounter] = useState<EncounterState>({ active: false, round: 0, turnIndex: 0, archived: false })
  const [critMode, setCritMode] = useState<'raw' | 'tarot'>(() => (localStorage.getItem('crit-mode') as 'raw' | 'tarot') ?? 'raw')

  // Initialize theme on app load
  useEffect(() => {
    initializeTheme();
  }, []);
  
  // Update critMode when it changes and handle tab switching
  useEffect(() => {
    const handleCritModeChange = () => {
      const newMode = (localStorage.getItem('crit-mode') as 'raw' | 'tarot') ?? 'raw';
      setCritMode(newMode);
      
      // Switch tabs if current tab becomes invalid
      if (activeTab === 'crit' && newMode === 'tarot') {
        setActiveTab('tarot');
      } else if (activeTab === 'tarot' && newMode === 'raw') {
        setActiveTab('crit');
      }
    };
    
    // Listen for custom event from SettingsManager
    window.addEventListener('critModeChanged', handleCritModeChange);
    return () => window.removeEventListener('critModeChanged', handleCritModeChange);
  }, [activeTab]);
  const [name, setName] = useState('')
  const [ref, setRef] = useState<number>(6)
  const [initiativeSkill, setInitiativeSkill] = useState<number>(0)
  const [hp, setHp] = useState<number>(25)
  
  // Persistence state
  const [savedEncounters, setSavedEncounters] = useState<Array<{
    id: string;
    name: string;
    participants: Participant[];
    encounter: EncounterState;
    savedAt: string;
  }>>([])
  const [savedNPCs, setSavedNPCs] = useState<Array<{
    id: string;
    name: string;
    npc: Participant;
    savedAt: string;
  }>>([])
  
  // Damage dialog state
  const [damageDialog, setDamageDialog] = useState<{ participantId: string; participantName: string } | null>(null)
  
  // Quick tools state
  const [lastQuickRoll, setLastQuickRoll] = useState<{type: string, result: number} | null>(null)
  const [quickDamage, setQuickDamage] = useState({
    damage: 0,
    armorSP: 0,
    isHeadshot: false,
    isCritical: false
  })
  const [quickDamageResult, setQuickDamageResult] = useState<{
    finalDamage: number,
    baseDamage: number,
    isHeadshot: boolean,
    isCritical: boolean,
    armorSP: number
  } | null>(null)

  // Load saved data on component mount
  useEffect(() => {
    const savedEncountersData = localStorage.getItem('cyberpunk-saved-encounters');
    if (savedEncountersData) {
      try {
        setSavedEncounters(JSON.parse(savedEncountersData));
      } catch (e) {
        console.error('Failed to load saved encounters:', e);
      }
    }

    const savedNPCsData = localStorage.getItem('cyberpunk-saved-npcs');
    if (savedNPCsData) {
      try {
        setSavedNPCs(JSON.parse(savedNPCsData));
      } catch (e) {
        console.error('Failed to load saved NPCs:', e);
      }
    }

    // Load current encounter if exists
    const currentEncounterData = localStorage.getItem('cyberpunk-current-encounter');
    if (currentEncounterData) {
      try {
        const data = JSON.parse(currentEncounterData);
        setParticipants(data.participants || []);
        setEncounter(data.encounter || { active: false, round: 0, turnIndex: 0, archived: false });
      } catch (e) {
        console.error('Failed to load current encounter:', e);
      }
    }
  }, []);

  // Save current encounter when it changes
  useEffect(() => {
    const currentEncounterData = {
      participants,
      encounter
    };
    localStorage.setItem('cyberpunk-current-encounter', JSON.stringify(currentEncounterData));
  }, [participants, encounter]);

  // Save encounters list when it changes
  useEffect(() => {
    localStorage.setItem('cyberpunk-saved-encounters', JSON.stringify(savedEncounters));
  }, [savedEncounters]);

  // Save NPCs list when it changes
  useEffect(() => {
    localStorage.setItem('cyberpunk-saved-npcs', JSON.stringify(savedNPCs));
  }, [savedNPCs]);

  // Load saved data on component mount
  useEffect(() => {
    try {
      const savedParticipants = localStorage.getItem('cyberpunk-participants');
      const savedEncounter = localStorage.getItem('cyberpunk-encounter');
      
      if (savedParticipants) {
        const parsed = JSON.parse(savedParticipants);
        if (Array.isArray(parsed)) {
          setParticipants(parsed);
        }
      }
      
      if (savedEncounter) {
        const parsed = JSON.parse(savedEncounter);
        if (parsed && typeof parsed === 'object') {
          setEncounter(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }, []);

  // Save data when participants or encounter changes
  useEffect(() => {
    try {
      localStorage.setItem('cyberpunk-participants', JSON.stringify(participants));
    } catch (error) {
      console.error('Error saving participants:', error);
    }
  }, [participants]);

  useEffect(() => {
    try {
      localStorage.setItem('cyberpunk-encounter', JSON.stringify(encounter));
    } catch (error) {
      console.error('Error saving encounter:', error);
    }
  }, [encounter]);

  const ordered = useMemo(() =>
    [...participants].sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
  , [participants])

  const activeTurnParticipant = useMemo(() => {
    if (!encounter.active || ordered.length === 0) return null
    const acting = ordered.filter(canAct)
    if (acting.length === 0) return null
    return acting[encounter.turnIndex % acting.length] || null
  }, [encounter, ordered])

  const addNPCToEncounter = (npc: any) => {
    const participant: Participant = {
      id: Date.now().toString(),
      name: npc.name,
      ref: npc.stats.ref,
      initiativeSkill: 0, // Could pull from skills if needed
      hp: npc.hitPoints.current,
      maxHp: npc.hitPoints.max,
      woundState: npc.woundState as WoundState,
      notes: `Generated NPC - Body: ${npc.stats.body}, Cool: ${npc.stats.cool}`,
      weapons: npc.equipment?.weapons || [],
      armor: npc.equipment?.armor ? {
        head: npc.equipment.armor.system.headLocation.sp,
        body: npc.equipment.armor.system.bodyLocation.sp,
        shield: (npc.equipment.armor as any).shield || 0,
        shieldEquipped: true // NPCs always have shields equipped
      } : undefined
    };
    setParticipants(prev => [...prev, participant]);
    setActiveTab('encounter'); // Switch to encounter tab
  };

  const addMultipleNPCsToEncounter = (npcs: any[]) => {
    const participants: Participant[] = npcs.map(npc => ({
      id: Date.now().toString() + Math.random(),
      name: npc.name,
      ref: npc.stats?.ref || 6,
      initiativeSkill: 0,
      hp: npc.hitPoints?.current || 40,
      maxHp: npc.hitPoints?.max || 40,
      woundState: 'not-wounded' as WoundState,
      notes: `Generated Encounter NPC`,
      weapons: npc.equipment?.weapons || [],
      armor: npc.equipment?.armor ? {
        head: npc.equipment.armor.system?.headLocation?.sp || 0,
        body: npc.equipment.armor.system?.bodyLocation?.sp || 0,
        shield: (npc.equipment.armor as any).shield || 0,
        shieldEquipped: true // NPCs always have shields equipped
      } : undefined
    }));
    
    setParticipants(prev => [...prev, ...participants]);
    setActiveTab('encounter'); // Switch to encounter tab
  };

  // Quick dice rolling
  const rollQuickDice = (diceExpression: string, type: string) => {
    let result = 0;
    
    if (diceExpression.includes('d10')) {
      if (diceExpression.includes('+')) {
        const parts = diceExpression.split('+');
        result = d10() + parseInt(parts[1]);
      } else {
        result = d10();
      }
    } else if (diceExpression.includes('2d6')) {
      result = d10() + d10(); // Using d10 for now, could implement proper 2d6
    }
    
    setLastQuickRoll({ type, result });
  };

  const getHitLocation = (roll: number): string => {
    if (roll === 1) return 'Head';
    if (roll <= 4) return 'Body';
    if (roll <= 6) return 'Right Arm';
    if (roll <= 8) return 'Left Arm';
    if (roll <= 9) return 'Right Leg';
    return 'Left Leg';
  };

  // Quick damage calculation
  const calculateQuickDamage = () => {
    let finalDamage = quickDamage.damage;
    
    if (quickDamage.isHeadshot) {
      finalDamage *= 2;
    }
    
    if (quickDamage.isCritical) {
      finalDamage += 5;
    }
    
    finalDamage = Math.max(0, finalDamage - quickDamage.armorSP);
    
    setQuickDamageResult({
      finalDamage,
      baseDamage: quickDamage.damage,
      isHeadshot: quickDamage.isHeadshot,
      isCritical: quickDamage.isCritical,
      armorSP: quickDamage.armorSP
    });
  };

  // Apply damage to specific participant using Cyberpunk RED damage rules
  const applyDamageToParticipant = (participantId: string, damage: number, options: {
    location?: 'head' | 'body',
    damageType?: 'normal' | 'armor-piercing' | 'half-armor' | 'ignore-armor',
    isCritical?: boolean
  } = {}) => {
    const { location = 'body', damageType = 'normal', isCritical = false } = options;
    
    setParticipants(prev => 
      prev.map(p => {
        if (p.id === participantId) {
          let remainingDamage = damage;
          const damageReport = { cover: 0, armor: 0, health: 0, ablation: '' };
          
          // Step 1: Apply Cover RAW: SP first, remaining damages cover HP. Only overflow after HP reaches 0 passes through.
          if (p.cover && p.cover.hp > 0) {
            const coverSP = typeof p.cover.sp === 'number' ? p.cover.sp : getCoverSP(p.cover.type);
            const afterSP = Math.max(0, remainingDamage - coverSP);
            const hpAbsorb = Math.min(afterSP, p.cover.hp);
            const overflow = Math.max(0, afterSP - p.cover.hp);

            damageReport.cover = remainingDamage - overflow; // amount fully mitigated by cover overall

            const updatedCover = { ...p.cover, hp: Math.max(0, p.cover.hp - hpAbsorb) };
            p = { ...p, cover: updatedCover.hp > 0 ? updatedCover : undefined };

            if (overflow <= 0) {
              // All damage stopped by cover
              return p;
            }

            remainingDamage = overflow;
          }
          
          // Step 2: Apply Armor SP for hit location
          if (remainingDamage > 0 && damageType !== 'ignore-armor') {
            const currentArmor = p.armor || { head: 0, body: 0, shield: 0 };
            let armorSP = location === 'head' ? currentArmor.head : currentArmor.body;
            
            // Add shield SP to body armor (RAW: shields only protect body, and only when equipped)
            if (location === 'body' && currentArmor.shield && currentArmor.shieldEquipped) {
              armorSP += currentArmor.shield;
            }
            
            // Handle special damage types
            if (damageType === 'half-armor') {
              armorSP = Math.floor(armorSP / 2);
            } else if (damageType === 'armor-piercing') {
              armorSP = Math.floor(armorSP / 2);
            }
            
            const armorReduction = Math.min(armorSP, remainingDamage);
            const damagePenetrated = remainingDamage > armorReduction;
            remainingDamage -= armorReduction;
            damageReport.armor = armorReduction;
            
            // Step 3: Armor Ablation (only if damage penetrated)
            if (damagePenetrated) {
              const ablationAmount = damageType === 'armor-piercing' ? 2 : 1;
              const newArmor = { ...currentArmor };
              
              if (location === 'head') {
                newArmor.head = Math.max(0, newArmor.head - ablationAmount);
              } else {
                newArmor.body = Math.max(0, newArmor.body - ablationAmount);
                // Also ablate shield if present and equipped
                if (newArmor.shield && newArmor.shieldEquipped) {
                  newArmor.shield = Math.max(0, newArmor.shield - ablationAmount);
                }
              }
              
              p = { ...p, armor: newArmor };
              damageReport.ablation = `Armor ablated: -${ablationAmount} SP`;
            }
          }
          
          // Step 4: Remaining damage goes to HP
          if (remainingDamage > 0) {
            // Apply headshot multiplier (after armor)
            if (location === 'head') {
              remainingDamage *= 2;
            }
            
            // Add critical damage
            if (isCritical) {
              remainingDamage += 5;
            }
            
            const newHp = Math.max(0, (p.hp || 0) - remainingDamage);
            const newWoundState = getWoundState(newHp, p.maxHp || 25);
            damageReport.health = remainingDamage;
            
            p = {
              ...p,
              hp: newHp,
              woundState: newWoundState,
              dead: newHp <= 0
            };
          }
          
          // Log damage resolution for GM feedback
          console.log(`Damage to ${p.name}:`, damageReport);
          
          return p;
        }
        return p;
      })
    );
  };
  
  // Helper function to get cover SP values per RAW
  const getCoverSP = (coverType: 'light' | 'medium' | 'heavy' | 'human-shield'): number => {
    switch (coverType) {
      case 'light': return 10;
      case 'medium': return 15;  
      case 'heavy': return 20;
      case 'human-shield': return 0; // Human shields provide no SP
      default: return 0;
    }
  };

  // Damage dialog handlers
  const openDamageDialog = (participantId: string, participantName: string) => {
    setDamageDialog({ participantId, participantName });
  };

  const closeDamageDialog = () => {
    setDamageDialog(null);
  };

  const handleDamageDialogApply = (damage: number, options: {
    location: 'head' | 'body';
    damageType: 'normal' | 'armor-piercing' | 'half-armor' | 'ignore-armor';
    isCritical: boolean;
  }) => {
    if (damageDialog) {
      applyDamageToParticipant(damageDialog.participantId, damage, options);
    }
  };

  // Persistence functions
  const saveCurrentEncounter = () => {
    const encounterName = prompt('Enter name for this encounter:', `Encounter ${savedEncounters.length + 1}`);
    if (encounterName && participants.length > 0) {
      const newSavedEncounter = {
        id: Date.now().toString(),
        name: encounterName,
        participants: [...participants],
        encounter: { ...encounter },
        savedAt: new Date().toISOString()
      };
      setSavedEncounters(prev => [...prev, newSavedEncounter]);
      alert(`Encounter "${encounterName}" saved!`);
    }
  };

  const loadSavedEncounter = (savedEncounter: typeof savedEncounters[0]) => {
    if (confirm(`Load encounter "${savedEncounter.name}"? This will replace the current encounter.`)) {
      setParticipants([...savedEncounter.participants]);
      setEncounter({ ...savedEncounter.encounter });
    }
  };

  const deleteSavedEncounter = (id: string) => {
    setSavedEncounters(prev => prev.filter(enc => enc.id !== id));
  };

  const saveNPC = (npc: Participant) => {
    const npcName = prompt('Enter name for this NPC template:', npc.name || `NPC ${savedNPCs.length + 1}`);
    if (npcName) {
      const newSavedNPC = {
        id: Date.now().toString(),
        name: npcName,
        npc: { ...npc, id: '', name: npcName }, // Reset ID for template
        savedAt: new Date().toISOString()
      };
      setSavedNPCs(prev => [...prev, newSavedNPC]);
      alert(`NPC "${npcName}" saved as template!`);
    }
  };

  const saveNPCFromGenerator = (npc: any) => {
    // Convert NPC from generator to Participant format
    const participant: Participant = {
      id: '',
      name: npc.name,
      ref: npc.stats.ref || 6,
      initiativeSkill: npc.skills.initiative || 0,
      hp: npc.hitPoints.current,
      maxHp: npc.hitPoints.max,
      dead: false,
      woundState: npc.woundState.toLowerCase().replace(' ', '-') as WoundState,
      armor: npc.equipment.armor ? {
        head: npc.equipment.armor.head || 0,
        body: npc.equipment.armor.body || 0,
        shield: npc.equipment.armor.shield
      } : undefined,
      weapons: npc.equipment.weapons?.map((weapon: any) => ({
        _id: weapon._id || Date.now().toString(),
        name: weapon.name,
        system: {
          damage: weapon.damage || '1d6',
          weaponSkill: weapon.skill || 'firearms',
          attackmod: weapon.attackMod || 0
        }
      }))
    };
    saveNPC(participant);
  };

  const saveEncounterFromGenerator = (encounter: any) => {
    // Save encounter as template to saved encounters
    try {
      const savedEncounters = JSON.parse(localStorage.getItem('cyberpunk-saved-encounter-templates') || '[]');
      const encounterTemplate = {
        id: Date.now().toString(),
        name: encounter.name,
        encounter: encounter,
        createdAt: new Date().toISOString()
      };
      
      savedEncounters.push(encounterTemplate);
      localStorage.setItem('cyberpunk-saved-encounter-templates', JSON.stringify(savedEncounters));
      alert(`Encounter "${encounter.name}" saved as template!`);
    } catch (error) {
      console.error('Error saving encounter template:', error);
      alert('Failed to save encounter template');
    }
  };

  const loadSavedNPC = (savedNPC: typeof savedNPCs[0]) => {
    const newNPC = {
      ...savedNPC.npc,
      id: Date.now().toString(),
      name: savedNPC.npc.name + ` (Copy)`
    };
    setParticipants(prev => [...prev, newNPC]);
    alert(`NPC "${savedNPC.name}" added to encounter!`);
  };

  const deleteSavedNPC = (id: string) => {
    setSavedNPCs(prev => prev.filter(npc => npc.id !== id));
  };

  // Import/Export functions
  const exportEncounters = () => {
    const dataStr = JSON.stringify(savedEncounters, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyberpunk-encounters-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importEncounters = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedEncounters = JSON.parse(e.target?.result as string);
          if (Array.isArray(importedEncounters)) {
            setSavedEncounters(prev => [...prev, ...importedEncounters]);
            alert(`Imported ${importedEncounters.length} encounters!`);
          } else {
            alert('Invalid file format');
          }
        } catch (error) {
          alert('Failed to import encounters: Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
    // Reset input
    event.target.value = '';
  };

  const exportNPCs = () => {
    const dataStr = JSON.stringify(savedNPCs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyberpunk-npcs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importNPCs = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedNPCs = JSON.parse(e.target?.result as string);
          if (Array.isArray(importedNPCs)) {
            setSavedNPCs(prev => [...prev, ...importedNPCs]);
            alert(`Imported ${importedNPCs.length} NPCs!`);
          } else {
            alert('Invalid file format');
          }
        } catch (error) {
          alert('Failed to import NPCs: Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
    // Reset input
    event.target.value = '';
  };

  // Armor and cover management
  const toggleArmorEditor = (participantId: string) => {
    const participant = participants.find(p => p.id === participantId);
    const currentArmor = participant?.armor;
    
    const headSP = prompt('Enter Head Armor SP:', currentArmor?.head?.toString() || '0');
    const bodySP = prompt('Enter Body Armor SP:', currentArmor?.body?.toString() || '0');
    const shieldSP = prompt('Enter Shield SP (optional):', currentArmor?.shield?.toString() || '0');
    
    if (headSP !== null && bodySP !== null) {
      const isPC = participant?.isPC;
      const hasShield = shieldSP && parseInt(shieldSP) > 0;
      
      // For PCs with shields, ask about shield equipped status
      let shieldEquipped = !isPC; // NPCs always have shields equipped
      if (isPC && hasShield) {
        const currentlyEquipped = currentArmor?.shieldEquipped;
        const equipChoice = confirm(`Shield equipped? Current: ${currentlyEquipped ? 'Equipped' : 'Unequipped'}\n\nClick OK to equip shield, Cancel to unequip`);
        shieldEquipped = equipChoice;
      }
      
      updateParticipant(participantId, {
        armor: {
          head: parseInt(headSP) || 0,
          body: parseInt(bodySP) || 0,
          shield: hasShield ? parseInt(shieldSP) : undefined,
          shieldEquipped: hasShield ? shieldEquipped : undefined
        }
      });
    }
  };

  const toggleCoverEditor = (participantId: string) => {
    const coverType = prompt('Select cover type:\n1. Light (10 HP)\n2. Medium (15 HP)\n3. Heavy (20 HP)\n4. Human Shield (40 HP)', '1');
    
    if (coverType) {
      let cover;
      switch (coverType) {
        case '1':
          cover = { type: 'light' as const, hp: 10, maxHp: 10, sp: 10, maxSp: 10 };
          break;
        case '2':
          cover = { type: 'medium' as const, hp: 15, maxHp: 15, sp: 15, maxSp: 15 };
          break;
        case '3':
          cover = { type: 'heavy' as const, hp: 20, maxHp: 20, sp: 20, maxSp: 20 };
          break;
        case '4':
          cover = { type: 'human-shield' as const, hp: 40, maxHp: 40, sp: 0, maxSp: 0 };
          break;
        default:
          return;
      }
      
      updateParticipant(participantId, { cover });
    }
  };

  const removeCover = (participantId: string) => {
    updateParticipant(participantId, { cover: undefined });
  };

  const add = () => {
    if (!name.trim()) return
    setParticipants((p: Participant[]) => [...p, { 
      id: crypto.randomUUID(), 
      name, 
      ref, 
      initiativeSkill,
      hp,
      maxHp: hp,
      woundState: 'not-wounded',
      isPC: false
    }])
    setName('')
  }

  const rollAll = () => {
    setParticipants((p: Participant[]) => p.map((x: Participant) => {
      if (x.isPC) return x
      const roll = d10()
      const total = roll + x.ref + (x.initiativeSkill ?? 0)
      return { ...x, rolled: roll, total }
    }))
  }

  const clear = () => setParticipants((p: Participant[]) => p.map((x: Participant) => ({ ...x, rolled: undefined, total: undefined })))

  const startEncounter = () => {
    if (ordered.filter(p => p.total !== undefined).length === 0) {
      alert('Roll initiative first!')
      return
    }
    setEncounter({ active: true, round: 1, turnIndex: 0, archived: false })
  }

  const endEncounter = () => {
    setEncounter(prev => ({ ...prev, active: false, archived: true }))
  }

  const nextTurn = () => {
    if (!encounter.active) return
    setEncounter(prev => {
      const acting = ordered.filter(canAct)
      const nextIndex = prev.turnIndex + 1
      const newRound = nextIndex >= acting.length ? prev.round + 1 : prev.round
      const wrappedIndex = nextIndex % Math.max(acting.length, 1)
      return { ...prev, round: newRound, turnIndex: wrappedIndex }
    })
  }

  const removeParticipant = (id: string) => {
    if (confirm('Remove this participant from the encounter?')) {
      setParticipants((p: Participant[]) => p.filter((x: Participant) => x.id !== id))
    }
  }

  const clearAllParticipants = () => {
    if (confirm('Remove all participants and reset the encounter?')) {
      setParticipants([])
      setEncounter({ active: false, round: 0, turnIndex: 0, archived: false })
    }
  }

  const updateParticipant = (id: string, updates: Partial<Participant>) => {
    setParticipants((p: Participant[]) => p.map((x: Participant) => {
      if (x.id !== id) return x
      const updated = { ...x, ...updates }
      if (updated.hp !== undefined && updated.maxHp !== undefined) {
        updated.woundState = getWoundState(updated.hp, updated.maxHp)
        updated.dead = updated.hp <= 0
      }
      return updated
    }))
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <button 
          className="settings-button"
          onClick={() => setActiveTab('settings')}
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
          </svg>
          <span>Settings</span>
        </button>
        <h1 style={{ flex: '1', textAlign: 'center', margin: '0', fontSize: '28px', color: 'var(--accent)' }}>Cyberpunk RED GM Tool</h1>
        <div style={{ width: '100px' }}></div> {/* Spacer for centering */}
      </div>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'encounter' ? 'active' : ''}`}
          onClick={() => setActiveTab('encounter')}
        >
          Encounters
        </button>
        <button 
          className={`tab ${activeTab === 'pcs' ? 'active' : ''}`}
          onClick={() => setActiveTab('pcs')}
        >
          PCs
        </button>
        <button 
          className={`tab ${activeTab === 'npc' ? 'active' : ''}`}
          onClick={() => setActiveTab('npc')}
        >
          NPCs
        </button>
        <button 
          className={`tab ${activeTab === 'encounter-gen' ? 'active' : ''}`}
          onClick={() => setActiveTab('encounter-gen')}
        >
          Encounter Creator
        </button>
        <button 
          className={`tab ${activeTab === 'damage' ? 'active' : ''}`}
          onClick={() => setActiveTab('damage')}
        >
          Damage
        </button>
        {critMode === 'raw' && (
          <button 
            className={`tab ${activeTab === 'crit' ? 'active' : ''}`}
            onClick={() => setActiveTab('crit')}
          >
            Criticals
          </button>
        )}
        {critMode === 'tarot' && (
          <button 
            className={`tab ${activeTab === 'tarot' ? 'active' : ''}`}
            onClick={() => setActiveTab('tarot')}
          >
            Tarot
          </button>
        )}
        <button 
          className={`tab ${activeTab === 'time' ? 'active' : ''}`}
          onClick={() => setActiveTab('time')}
        >
          Time
        </button>
        <button 
          className={`tab ${activeTab === 'shop' ? 'active' : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          Shop
        </button>
      </div>

      <div className="main-content">

      {activeTab === 'encounter' && (
        <div className="encounter-page">
          <div className="encounter-layout">
            {/* Main encounter content */}
            <div className="encounter-main">
              <div className="section">
                <h2>Add Participant</h2>
                <div className="grid" style={{ gridTemplateColumns: '2fr repeat(4, 1fr) auto' }}>
                  <label>
                    <div>Name</div>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
                  </label>
                  <label>
                    <div>REF</div>
                    <input type="number" value={ref} onChange={e => setRef(Number(e.target.value))} />
                  </label>
                  <label>
                    <div>Initiative</div>
                    <input type="number" value={initiativeSkill} onChange={e => setInitiativeSkill(Number(e.target.value))} />
                  </label>
                  <label>
                    <div>HP</div>
                    <input type="number" value={hp} onChange={e => setHp(Number(e.target.value))} />
                  </label>
                  <button onClick={add}>Add</button>
                </div>
              </div>

              <div className="section">
                <h2>Initiative & Combat</h2>
                <div className="controls">
                  <button onClick={rollAll}>Roll All Initiative</button>
                  <button onClick={clear}>Clear Rolls</button>
                  <button onClick={clearAllParticipants} className="danger-btn">Clear All</button>
                  {!encounter.active && <button onClick={startEncounter}>Start Encounter</button>}
                </div>
              </div>

              <div className="section">
                <h2>Save & Load Encounters</h2>
                <div className="controls">
                  <button onClick={saveCurrentEncounter} disabled={participants.length === 0}>
                    Save Current Encounter
                  </button>
                  <button onClick={exportEncounters} disabled={savedEncounters.length === 0}>
                    Export All Encounters
                  </button>
                  <label className="file-input-label">
                    Import Encounters
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={importEncounters} 
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                
                {savedEncounters.length > 0 && (
                  <div className="saved-items">
                    <h3>Saved Encounters ({savedEncounters.length})</h3>
                    <div className="saved-items-list">
                      {savedEncounters.map(savedEnc => (
                        <div key={savedEnc.id} className="saved-item">
                          <div className="saved-item-info">
                            <div className="saved-item-name">{savedEnc.name}</div>
                            <div className="saved-item-details">
                              {savedEnc.participants.length} participants • {new Date(savedEnc.savedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="saved-item-actions">
                            <button onClick={() => loadSavedEncounter(savedEnc)} className="small-btn">
                              Load
                            </button>
                            <button onClick={() => deleteSavedEncounter(savedEnc.id)} className="small-btn danger-btn">
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="section">
                <h2>Encounter Table</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>REF</th>
                      <th>Init</th>
                      <th>Roll</th>
                      <th>Total</th>
                      <th>HP</th>
                      <th>Armor</th>
                      <th>Cover</th>
                      <th>Wound State</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordered.map(p => {
                      const isCurrentTurn = encounter.active && activeTurnParticipant?.id === p.id
                      const woundClass = p.woundState ? `wound-${p.woundState.replace('-', '')}` : ''
                      const rowClass = `${woundClass} ${isCurrentTurn ? 'current-turn' : ''}`.trim()
                      
                      return (
                        <React.Fragment key={p.id}>
                          <tr className={rowClass}>
                          <td>{p.name}</td>
                          <td style={{ textAlign: 'center' }}>
                            {p.ref}
                            {p.isPC && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)' }}>(PC)</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>{p.initiativeSkill ?? 0}</td>
                          <td style={{ textAlign: 'center' }}>{p.rolled ?? (p.isPC ? '-' : '-')}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            {p.isPC ? (
                              <input type="number" value={p.total ?? 0} onChange={e => updateParticipant(p.id, { total: Number(e.target.value) })} style={{ width: 70, textAlign: 'center' }} />
                            ) : (
                              p.total ?? '-'
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="number" 
                              value={p.hp ?? 0} 
                              onChange={e => updateParticipant(p.id, { hp: Number(e.target.value) })}
                              style={{ width: 60, textAlign: 'center' }}
                            />
                            /{p.maxHp ?? 0}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '12px' }}>
                            {p.armor ? (
                              <div className="armor-display">
                                <div>H:{p.armor.head} B:{p.armor.body}</div>
                                {p.armor.shield && (
                                  <div style={{ fontSize: 10, marginTop: 2 }}>
                                    Shield:{p.armor.shield} {p.isPC && (p.armor.shieldEquipped ? '🛡️' : '🚫')}
                                  </div>
                                )}
                                <button 
                                  onClick={() => toggleArmorEditor(p.id)} 
                                  className="small-btn"
                                  style={{ marginTop: 2, fontSize: 8 }}
                                  title="Edit Armor"
                                >
                                  Edit
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => toggleArmorEditor(p.id)} 
                                className="small-btn"
                                title="Add Armor"
                              >
                                +Armor
                              </button>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '12px' }}>
                            {p.cover ? (
                              <div className="cover-display">
                                <div className="cover-type">{p.cover.type}</div>
                                <div className="cover-hp">{p.cover.hp}/{p.cover.maxHp}</div>
                                <button 
                                  onClick={() => removeCover(p.id)}
                                  className="small-btn remove-btn"
                                  title="Remove Cover"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => toggleCoverEditor(p.id)} 
                                className="small-btn"
                                title="Add Cover"
                              >
                                +Cover
                              </button>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {p.woundState?.replace('-', ' ') || 'unknown'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {!canAct(p) && <span style={{ color: 'var(--accent)' }}>Skip Turn</span>}
                            <button 
                              onClick={() => openDamageDialog(p.id, p.name)} 
                              className="small-btn damage-btn"
                              title="Apply damage with Cyberpunk RED rules (cover → armor → HP)"
                            >
                              Damage
                            </button>
                            <button 
                              onClick={() => {
                                const healAmount = parseInt(prompt('Heal how much HP?', '1') || '0');
                                if (healAmount > 0) {
                                  setParticipants(prev => 
                                    prev.map(participant => {
                                      if (participant.id === p.id) {
                                        const newHp = Math.min((participant.maxHp || 25), (participant.hp || 0) + healAmount);
                                        const newWoundState = getWoundState(newHp, participant.maxHp || 25);
                                        return {
                                          ...participant,
                                          hp: newHp,
                                          woundState: newWoundState,
                                          dead: false
                                        };
                                      }
                                      return participant;
                                    })
                                  );
                                }
                              }} 
                              className="small-btn heal-btn"
                              title="Heal HP (no armor/cover involved)"
                            >
                              Heal
                            </button>
                            <button 
                              onClick={() => saveNPC(p)} 
                              className="small-btn save-npc-btn"
                              title="Save as NPC template"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => removeParticipant(p.id)} 
                              className="small-btn remove-btn"
                              title="Remove from encounter"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                        {/* Weapons row */}
                        {p.weapons && p.weapons.length > 0 && (
                          <tr className={`weapons-row ${rowClass}`}>
                            <td colSpan={10} className="weapons-cell">
                              <div className="weapons-display-expanded">
                                <strong>Weapons:</strong>
                                {p.weapons.map((weapon: any, index: number) => (
                                  <div key={weapon._id + index} className="weapon-item-expanded">
                                    <span className="weapon-name-expanded">{weapon.name}</span>
                                    <span className="weapon-damage-expanded">({weapon.system.damage})</span>
                                    <span className="weapon-skill-expanded">{weapon.system.weaponSkill}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                        {/* Armor row */}
                        {p.armor && (
                          <tr className={`armor-row ${rowClass}`}>
                            <td colSpan={10} className="armor-cell">
                              <div className="armor-display-expanded">
                                <strong>Armor:</strong>
                                <div className="armor-details-expanded">
                                  {p.armor.head > 0 && (
                                    <div className="armor-piece-expanded">
                                      <span className="armor-location">Head:</span>
                                      <span className="armor-sp">{p.armor.head} SP</span>
                                    </div>
                                  )}
                                  {p.armor.body > 0 && (
                                    <div className="armor-piece-expanded">
                                      <span className="armor-location">Body:</span>
                                      <span className="armor-sp">{p.armor.body} SP</span>
                                    </div>
                                  )}
                                  {p.armor.shield && p.armor.shield > 0 && (
                                    <div className="armor-piece-expanded">
                                      <span className="armor-location">Shield:</span>
                                      <span className="armor-sp">{p.armor.shield} SP</span>
                                      {p.isPC && (
                                        <div className="shield-controls" style={{ marginLeft: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <button
                                            onClick={() => updateParticipant(p.id, { 
                                              armor: { ...p.armor!, shieldEquipped: !p.armor!.shieldEquipped } 
                                            })}
                                            className={`shield-toggle-btn ${p.armor.shieldEquipped ? 'equipped' : 'unequipped'}`}
                                            style={{ 
                                              padding: '4px 8px',
                                              fontSize: '12px',
                                              backgroundColor: p.armor.shieldEquipped ? 'var(--accent)' : 'var(--text-muted)',
                                              color: p.armor.shieldEquipped ? 'white' : 'var(--surface)',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: 'pointer'
                                            }}
                                            title={p.armor.shieldEquipped ? 'Click to unequip shield' : 'Click to equip shield'}
                                          >
                                            {p.armor.shieldEquipped ? '🛡️ Equipped' : '🚫 Unequipped'}
                                          </button>
                                          <span style={{ 
                                            fontSize: '10px', 
                                            color: p.armor.shieldEquipped ? 'var(--accent)' : 'var(--text-muted)',
                                            fontStyle: 'italic'
                                          }}>
                                            {p.armor.shieldEquipped ? 'Protecting' : 'Not protecting'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 14 }}>
                RAW: Initiative = 1d10 + REF + Initiative skill (p. 168). 
                Rounds = 10 seconds. Auto-skips Seriously Wounded/Dead participants.
              </p>
            </div>

            {/* Sidebar with quick tools */}
            <div className="encounter-sidebar">
              <DiceRoller />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'damage' && <DamageCalculator />}

      {activeTab === 'npc' && (
        <div className="npc-page">
          <div className="section">
            <h2>NPC Generator</h2>
            <NPCGenerator onAddToEncounter={addNPCToEncounter} onSaveNPC={saveNPCFromGenerator} />
          </div>

          <div className="section">
            <h2>Save & Load NPCs</h2>
            <div className="controls">
              <button onClick={exportNPCs} disabled={savedNPCs.length === 0}>
                Export All NPCs
              </button>
              <label className="file-input-label">
                Import NPCs
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={importNPCs} 
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            
            {savedNPCs.length > 0 && (
              <div className="saved-items">
                <h3>Saved NPCs ({savedNPCs.length})</h3>
                <div className="saved-items-list">
                  {savedNPCs.map(savedNPC => (
                    <div key={savedNPC.id} className="saved-item">
                      <div className="saved-item-info">
                        <div className="saved-item-name">{savedNPC.name}</div>
                        <div className="saved-item-details">
                          HP: {savedNPC.npc.hp}/{savedNPC.npc.maxHp} • 
                          {savedNPC.npc.armor ? ` Armor: ${savedNPC.npc.armor.head}/${savedNPC.npc.armor.body}` : ' No armor'} • 
                          {new Date(savedNPC.savedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="saved-item-actions">
                        <button onClick={() => loadSavedNPC(savedNPC)} className="small-btn">
                          Add to Encounter
                        </button>
                        <button onClick={() => deleteSavedNPC(savedNPC.id)} className="small-btn danger-btn">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'shop' && <ShopGenerator />}

      {activeTab === 'time' && <TimeTracker />}
      {activeTab === 'crit' && <CriticalInjuryRoller />}
      {activeTab === 'tarot' && <Tarot />}
      {activeTab === 'pcs' && <PCManager onAddToEncounter={(pc) => {
        setParticipants(prev => [...prev, {
          id: crypto.randomUUID(),
          name: pc.name,
          ref: pc.ref,
          initiativeSkill: 0,
          hp: pc.hp,
          maxHp: pc.maxHp,
          woundState: getWoundState(pc.hp, pc.maxHp),
          isPC: true,
          armor: { head: pc.armorHead, body: pc.armorBody, shield: pc.shieldSp, shieldEquipped: false }
        }])
      }} />}
      {activeTab === 'settings' && <SettingsManager />}

      {activeTab === 'encounter-gen' && (
        <EncounterGenerator 
          onAddToEncounter={addMultipleNPCsToEncounter} 
          onSaveEncounter={saveEncounterFromGenerator}
        />
      )}
      </div>

      {/* Floating Combat Controls - Always visible when encounter is active */}
      <FloatingCombatControls 
        encounter={encounter}
        activeTurnParticipant={activeTurnParticipant}
        nextTurn={nextTurn}
        endEncounter={endEncounter}
      />

      {/* Damage Dialog */}
      {damageDialog && (
        <DamageDialog
          participantName={damageDialog.participantName}
          onApplyDamage={handleDamageDialogApply}
          onClose={closeDamageDialog}
        />
      )}
    </div>
  )
}

export default App;
