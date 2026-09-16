import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Swords, Users, Skull, Clock, ShoppingCart, Settings, 
  Zap, UserPlus, Dices, ChevronRight, Crosshair,
  Menu, X, Network
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { calculateDamage, getWoundState, canAct } from '@/lib/damage';
import type { 
  Participant, EncounterState, SavedEncounter, 
  DamageType, CritMode, ThemeMode, ColorPalette,
  TarotDeckState
} from '@/types';

// Components
import { EncounterTracker } from '@/components/EncounterTracker';
import { DamageCalculator } from '@/components/DamageCalculator';
import { NPCGenerator } from '@/components/NPCGenerator';
import { EncounterGenerator } from '@/components/EncounterGenerator';
import { CriticalInjuryRoller } from '@/components/CriticalInjuryRoller';
import { TarotRoller } from '@/components/TarotRoller';
import { ShopGenerator } from '@/components/ShopGenerator';
import { TimeTracker } from '@/components/TimeTracker';
import { DiceRoller } from '@/components/DiceRoller';
import { PCManager } from '@/components/PCManager';
import { SettingsManager } from '@/components/SettingsManager';
import { DamageDialog } from '@/components/DamageDialog';
import { FloatingCombatControls } from '@/components/FloatingCombatControls';
import { NetrunningArchitecture } from '@/components/NetrunningArchitecture';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type TabType = 'encounter' | 'pcs' | 'npc' | 'encounter-gen' | 'damage' | 'crit' | 'tarot' | 'time' | 'shop' | 'netrunning' | 'settings';

function App() {
  // Theme state
  const [themeMode, setThemeMode] = useLocalStorage<ThemeMode>('theme-mode', 'dark');
  const [colorPalette, setColorPalette] = useLocalStorage<ColorPalette>('color-palette', 'orange');
  const [critMode, setCritMode] = useLocalStorage<CritMode>('crit-mode', 'raw');
  
  // Tarot deck state
  const [tarotDeck, setTarotDeck] = useLocalStorage<TarotDeckState>('cyberpunk-tarot-deck', {
    cardIds: Array.from({ length: 22 }, (_, i) => i.toString()),
    drawnThisSession: false,
    cardsSeenCount: 0
  });
  
  // Navigation state
  const [activeTab, setActiveTab] = useLocalStorage<TabType>('active-tab', 'encounter');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Encounter state
  const [participants, setParticipants] = useLocalStorage<Participant[]>('cyberpunk-participants', []);
  const [encounter, setEncounter] = useLocalStorage<EncounterState>('cyberpunk-encounter', {
    active: false,
    round: 0,
    turnIndex: 0,
    archived: false
  });
  
  // Saved data
  const [savedEncounters, setSavedEncounters] = useLocalStorage<SavedEncounter[]>('cyberpunk-saved-encounters', []);
  
  // UI state
  const [damageDialogOpen, setDamageDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Refs for animations and accessing inner components
  const mainRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const diceRollerRef = useRef<{ rollCustom: (expr: string) => void }>(null);
  
  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('light', themeMode === 'light');
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    
    // Apply color palette
    const palettes = {
      orange: { accent: '#ff6b35', accentAlt: '#ff8c42', hsl: '17 100% 60%' },
      blue: { accent: '#4a9eff', accentAlt: '#6bb6ff', hsl: '209 100% 65%' },
      red: { accent: '#ff4757', accentAlt: '#ff6b7a', hsl: '355 100% 64%' }
    };
    
    const p = palettes[colorPalette];
    document.documentElement.style.setProperty('--neon-orange', p.accent);
    document.documentElement.style.setProperty('--primary', p.hsl);
    document.documentElement.style.setProperty('--ring', p.hsl);
  }, [themeMode, colorPalette]);
  
  // Initial animation - simplified to prevent flash
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      document.body.style.opacity = '1';
    }, 50);
    return () => clearTimeout(timer);
  }, []);
  
  // Derived state
  const orderedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  }, [participants]);
  
  const activeTurnParticipant = useMemo(() => {
    if (!encounter.active || orderedParticipants.length === 0) return null;
    const acting = orderedParticipants.filter(p => canAct(p.woundState));
    if (acting.length === 0) return null;
    return acting[encounter.turnIndex % acting.length] || null;
  }, [encounter, orderedParticipants]);
  
  // Actions
  const addParticipant = useCallback((participant: Omit<Participant, 'id' | 'woundState' | 'dead'>) => {
    const newParticipant: Participant = {
      ...participant,
      id: crypto.randomUUID(),
      woundState: getWoundState(participant.hp, participant.maxHp),
      dead: participant.hp <= 0
    };
    setParticipants(prev => [...prev, newParticipant]);
    toast.success(`${participant.name} added to encounter`);
  }, [setParticipants]);
  
  const updateParticipant = useCallback((id: string, updates: Partial<Participant>) => {
    setParticipants(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, ...updates };
      if (updated.hp !== undefined && updated.maxHp !== undefined) {
        updated.woundState = getWoundState(updated.hp, updated.maxHp);
        updated.dead = updated.hp <= 0;
      }
      return updated;
    }));
  }, [setParticipants]);
  
  const removeParticipant = useCallback((id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  }, [setParticipants]);
  
  const rollAllInitiative = useCallback(() => {
    setParticipants(prev => prev.map(p => {
      if (p.isPC) return p; // PCs enter their own initiative
      const bonus = p.isGoon ? (p.combatNumber ?? 11) : (p.ref + (p.initiativeSkill || 0));
      const roll = Math.floor(Math.random() * 10) + 1;
      const total = roll + bonus;
      return { ...p, rolled: roll, total };
    }));
    toast.success('Initiative rolled for all NPCs (PCs enter manually)');
  }, [setParticipants]);
  
  const rollAllInitiativeIncludingPCs = useCallback(() => {
    setParticipants(prev => prev.map(p => {
      const bonus = p.isGoon ? (p.combatNumber ?? 11) : (p.ref + (p.initiativeSkill || 0));
      const roll = Math.floor(Math.random() * 10) + 1;
      const total = roll + bonus;
      return { ...p, rolled: roll, total };
    }));
    toast.success('Initiative rolled for all participants');
  }, [setParticipants]);
  
  const clearRolls = useCallback(() => {
    setParticipants(prev => prev.map(p => ({ ...p, rolled: undefined, total: undefined })));
  }, [setParticipants]);
  
  const startEncounter = useCallback(() => {
    if (orderedParticipants.filter(p => p.total !== undefined).length === 0) {
      toast.error('Roll initiative first!');
      return;
    }
    setEncounter({ active: true, round: 1, turnIndex: 0, archived: false });
    toast.success('Encounter started!');
  }, [orderedParticipants, setEncounter]);
  
  const resumeEncounter = useCallback(() => {
    // Resume without checking for initiative - used when unpausing
    setEncounter(prev => ({ ...prev, active: true }));
    toast.success('Encounter resumed!');
  }, [setEncounter]);
  
  const endEncounter = useCallback(() => {
    setEncounter(prev => ({ ...prev, active: false, archived: true }));
    toast.info('Encounter ended');
  }, [setEncounter]);

  const clearAllCombatants = useCallback(() => {
    setParticipants([]);
    setEncounter({ active: false, round: 0, turnIndex: 0, archived: false });
    toast.info('Cleared all combatants from encounter');
  }, [setParticipants, setEncounter]);

  const clearNPCsOnly = useCallback(() => {
    setParticipants(prev => prev.filter(p => p.isPC));
    setEncounter({ active: false, round: 0, turnIndex: 0, archived: false });
    toast.info('Cleared all NPCs. Player Characters retained.');
  }, [setParticipants, setEncounter]);

  const resetCombatState = useCallback(() => {
    setParticipants(prev => prev.map(p => ({
      ...p,
      hp: p.maxHp,
      armor: p.armor ? {
        ...p.armor,
        head: p.armor.maxHead ?? p.armor.head,
        body: p.armor.maxBody ?? p.armor.body
      } : undefined,
      woundState: 'not-wounded' as const,
      dead: false,
      rolled: undefined,
      total: undefined
    })));
    setEncounter({ active: false, round: 1, turnIndex: 0, archived: false });
    toast.success('Reset encounter state: HP & Armor restored to maximum, round set to 1');
  }, [setParticipants, setEncounter]);
  
  const nextTurn = useCallback(() => {
    if (!encounter.active) return;
    setEncounter(prev => {
      const acting = orderedParticipants.filter(p => canAct(p.woundState));
      const nextIndex = prev.turnIndex + 1;
      const newRound = nextIndex >= acting.length ? prev.round + 1 : prev.round;
      const wrappedIndex = nextIndex % Math.max(acting.length, 1);
      return { ...prev, round: newRound, turnIndex: wrappedIndex };
    });
  }, [encounter.active, orderedParticipants, setEncounter]);
  
  const saveCurrentEncounter = useCallback(() => {
    if (participants.length === 0) {
      toast.error('No participants to save');
      return;
    }
    const name = prompt('Enter name for this encounter:', `Encounter ${savedEncounters.length + 1}`);
    if (name) {
      const newEncounter: SavedEncounter = {
        id: crypto.randomUUID(),
        name,
        participants: [...participants],
        encounter: { ...encounter },
        savedAt: new Date().toISOString()
      };
      setSavedEncounters(prev => [...prev, newEncounter]);
      toast.success(`Encounter "${name}" saved!`);
    }
  }, [participants, encounter, savedEncounters.length, setSavedEncounters]);
  
  const loadSavedEncounter = useCallback((saved: SavedEncounter) => {
    setParticipants([...saved.participants]);
    setEncounter({ ...saved.encounter });
    toast.success(`Loaded "${saved.name}"`);
  }, [setParticipants, setEncounter]);
  
  const deleteSavedEncounter = useCallback((id: string) => {
    setSavedEncounters(prev => prev.filter(e => e.id !== id));
    toast.info('Encounter deleted');
  }, [setSavedEncounters]);
  
  const exportEncounters = useCallback(() => {
    const dataStr = JSON.stringify(savedEncounters, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyberpunk-encounters-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Encounters exported');
  }, [savedEncounters]);
  
  const importEncounters = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          setSavedEncounters(prev => [...prev, ...imported]);
          toast.success(`Imported ${imported.length} encounters`);
        } else {
          toast.error('Invalid file format');
        }
      } catch {
        toast.error('Failed to import: Invalid JSON');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [setSavedEncounters]);
  
  const handleDamageApply = useCallback((damage: number, options: {
    location: 'head' | 'body';
    damageType: DamageType;
    isCritical: boolean;
  }) => {
    if (!selectedParticipant) return;
    
    const armorSP = options.location === 'head' 
      ? (selectedParticipant.armor?.head || 0)
      : (selectedParticipant.armor?.body || 0);
    
    const result = calculateDamage(
      damage,
      armorSP,
      options.damageType,
      options.location,
      options.isCritical,
      selectedParticipant.cover?.type,
      selectedParticipant.cover?.hp,
      selectedParticipant.armor?.shield,
      selectedParticipant.armor?.shieldEquipped
    );
    
    // Apply damage to participant
    updateParticipant(selectedParticipant.id, {
      hp: Math.max(0, selectedParticipant.hp - result.finalDamage),
      armor: selectedParticipant.armor ? {
        ...selectedParticipant.armor,
        [options.location === 'head' ? 'head' : 'body']: Math.max(0, 
          (selectedParticipant.armor[options.location === 'head' ? 'head' : 'body'] || 0) - result.armorAblation
        )
      } : undefined,
      cover: selectedParticipant.cover && result.coverDamage > 0 ? {
        ...selectedParticipant.cover,
        hp: Math.max(0, selectedParticipant.cover.hp - result.coverDamage)
      } : undefined
    });
    
    toast.success(`${selectedParticipant.name} took ${result.finalDamage} damage!`);
    setDamageDialogOpen(false);
    setSelectedParticipant(null);
  }, [selectedParticipant, updateParticipant]);
  
  // Navigation items
  const navItems: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'encounter', label: 'Encounter', icon: Swords },
    { id: 'pcs', label: 'PCs', icon: Users },
    { id: 'npc', label: 'NPCs', icon: UserPlus },
    { id: 'encounter-gen', label: 'Generator', icon: Zap },
    { id: 'damage', label: 'Damage', icon: Crosshair },
    ...(critMode === 'raw' ? [{ id: 'crit' as TabType, label: 'Critical', icon: Skull }] : []),
    ...(critMode === 'tarot' ? [{ id: 'tarot' as TabType, label: 'Tarot', icon: Dices }] : []),
    { id: 'time', label: 'Time', icon: Clock },
    { id: 'shop', label: 'Shop', icon: ShoppingCart },
    { id: 'netrunning', label: 'NET', icon: Network },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  
  return (
    <div className={`min-h-screen bg-background text-foreground ${themeMode}`}>
      {/* Noise overlay */}
      <div className="noise-overlay" />
      
      {/* Mobile header - visible on small screens */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur-xl sticky top-0 z-50">
        <h1 className="text-xl font-bold neon-text-orange" style={{ fontFamily: 'var(--font-display)' }}>
          RED//GM
        </h1>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-xl pt-16">
          <nav className="p-4 space-y-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === item.id 
                    ? 'bg-primary/20 text-primary border border-primary/50' 
                    : 'hover:bg-secondary'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-semibold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
      
      <div className="flex min-h-screen">
        {/* Sidebar - Always visible on desktop, hidden on mobile */}
        <aside 
          ref={sidebarRef}
          className={`flex-col fixed left-0 top-0 h-screen bg-card/95 backdrop-blur-xl border-r border-border z-50 transition-all duration-300 hidden md:flex ${
            sidebarOpen ? 'w-64' : 'w-16'
          }`}
        >
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--neon-orange)] to-[var(--neon-red)] flex items-center justify-center">
                <Swords className="w-5 h-5 text-white" />
              </div>
              {sidebarOpen && (
                <h1 className="text-xl font-bold neon-text-orange" style={{ fontFamily: 'var(--font-display)' }}>
                  RED//GM
                </h1>
              )}
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  activeTab === item.id 
                    ? 'bg-primary/20 text-primary border-l-2 border-primary' 
                    : 'hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
                } ${!sidebarOpen && 'justify-center'}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === item.id && 'text-primary'}`} />
                {sidebarOpen && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
              </button>
            ))}
          </nav>
          
          {/* Toggle button */}
          <div className="p-3 border-t border-border">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </aside>
        
        {/* Main content */}
        <main 
          ref={mainRef}
          className={`main-content flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-16'} ml-0`}
        >
          <div className="p-4 lg:p-8 w-full max-w-[1920px] mx-auto">
            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === 'encounter' && (
                <EncounterTracker
                  participants={participants}
                  orderedParticipants={orderedParticipants}
                  encounter={encounter}
                  activeTurnParticipant={activeTurnParticipant}
                  savedEncounters={savedEncounters}
                  onAddParticipant={addParticipant}
                  onUpdateParticipant={updateParticipant}
                  onRemoveParticipant={removeParticipant}
                  onRollAllNPCs={rollAllInitiative}
                  onRollAllWithPCs={rollAllInitiativeIncludingPCs}
                  onClearRolls={clearRolls}
                  onStartEncounter={startEncounter}
                  onEndEncounter={endEncounter}
                  onNextTurn={nextTurn}
                  onSaveEncounter={saveCurrentEncounter}
                  onLoadEncounter={loadSavedEncounter}
                  onDeleteEncounter={deleteSavedEncounter}
                  onExportEncounters={exportEncounters}
                  onImportEncounters={importEncounters}
                  onClearAllCombatants={clearAllCombatants}
                  onClearNPCsOnly={clearNPCsOnly}
                  onResetCombatState={resetCombatState}
                />
              )}
              
              {activeTab === 'damage' && (
                <DamageCalculator />
              )}
              
              {activeTab === 'npc' && (
                <NPCGenerator 
                  onAddToEncounter={(npc) => {
                    setParticipants(prev => [...prev, npc]);
                    setActiveTab('encounter');
                  }}
                  onAddMultipleToEncounter={(npcs) => {
                    setParticipants(prev => [...prev, ...npcs]);
                    setActiveTab('encounter');
                  }}
                />
              )}
              
              {activeTab === 'encounter-gen' && (
                <EncounterGenerator 
                  onAddToEncounter={(newParticipants) => {
                    setParticipants(prev => [...prev, ...newParticipants]);
                    setActiveTab('encounter');
                    toast.success(`${newParticipants.length} participants added to encounter!`);
                  }}
                />
              )}
              
              {activeTab === 'crit' && critMode === 'raw' && (
                <CriticalInjuryRoller />
              )}
              
              {activeTab === 'tarot' && critMode === 'tarot' && (
                <TarotRoller 
                  deckState={tarotDeck}
                  setDeckState={setTarotDeck}
                />
              )}
              
              {activeTab === 'shop' && (
                <ShopGenerator 
                  critMode={critMode}
                  tarotDeck={tarotDeck}
                />
              )}
              
              {activeTab === 'netrunning' && (
                <NetrunningArchitecture />
              )}
              
              {activeTab === 'time' && (
                <TimeTracker />
              )}
              
              {activeTab === 'pcs' && (
                <PCManager 
                  onAddToEncounter={(pc) => {
                    setParticipants(prev => {
                      const exists = prev.some(p => p.id === pc.id);
                      if (exists) return prev.map(p => p.id === pc.id ? pc : p);
                      return [...prev, pc];
                    });
                    setActiveTab('encounter');
                  }}
                  onAddPartyToEncounter={(party) => {
                    setParticipants(prev => {
                      const existingIds = new Set(prev.map(p => p.id));
                      const newOnly = party.filter(p => !existingIds.has(p.id));
                      return [...prev, ...newOnly];
                    });
                    setActiveTab('encounter');
                  }}
                />
              )}
              
              {activeTab === 'settings' && (
                <SettingsManager
                  themeMode={themeMode}
                  setThemeMode={setThemeMode}
                  colorPalette={colorPalette}
                  setColorPalette={setColorPalette}
                  critMode={critMode}
                  setCritMode={setCritMode}
                />
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* Floating Dice Roller */}
<DiceRoller ref={diceRollerRef} critMode={critMode} tarotDeck={tarotDeck} />
      
      {/* Damage Dialog */}
      <DamageDialog
        open={damageDialogOpen}
        onOpenChange={setDamageDialogOpen}
        participant={selectedParticipant}
        onApply={handleDamageApply}
      />
      
      {/* Floating Combat Controls */}
      <FloatingCombatControls
        encounter={encounter}
        participants={participants}
        activeTurnParticipant={activeTurnParticipant}
        onNextTurn={nextTurn}
        onPauseEncounter={endEncounter}
        onResumeEncounter={resumeEncounter}
        onEndEncounter={endEncounter}
        onResetEncounter={() => {
          setEncounter({ active: false, round: 0, turnIndex: 0, archived: false });
          clearRolls();
        }}
      />
    </div>
  );
}

export default App;
