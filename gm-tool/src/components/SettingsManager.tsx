import React from 'react';
import { Settings, Moon, Sun, Palette, Skull, Sparkles, Download, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { CritMode, ThemeMode, ColorPalette } from '@/types';

interface SettingsManagerProps {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colorPalette: ColorPalette;
  setColorPalette: (palette: ColorPalette) => void;
  critMode: CritMode;
  setCritMode: (mode: CritMode) => void;
}

export function SettingsManager({
  themeMode,
  setThemeMode,
  colorPalette,
  setColorPalette,
  critMode,
  setCritMode
}: SettingsManagerProps) {
  const exportAllData = () => {
    const data = {
      participants: localStorage.getItem('cyberpunk-participants'),
      encounter: localStorage.getItem('cyberpunk-encounter'),
      savedEncounters: localStorage.getItem('cyberpunk-saved-encounters'),
      savedNPCs: localStorage.getItem('cyberpunk-saved-npcs'),
      pcs: localStorage.getItem('cyberpunk-pcs'),
      time: localStorage.getItem('cyberpunk-time'),
      settings: {
        themeMode,
        colorPalette,
        critMode
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyberpunk-red-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('All data exported');
  };
  
  const importAllData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.participants) localStorage.setItem('cyberpunk-participants', data.participants);
        if (data.encounter) localStorage.setItem('cyberpunk-encounter', data.encounter);
        if (data.savedEncounters) localStorage.setItem('cyberpunk-saved-encounters', data.savedEncounters);
        if (data.savedNPCs) localStorage.setItem('cyberpunk-saved-npcs', data.savedNPCs);
        if (data.pcs) localStorage.setItem('cyberpunk-pcs', data.pcs);
        if (data.time) localStorage.setItem('cyberpunk-time', data.time);
        if (data.settings) {
          setThemeMode(data.settings.themeMode);
          setColorPalette(data.settings.colorPalette);
          setCritMode(data.settings.critMode);
        }
        
        toast.success('Data imported successfully! Reloading...');
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        toast.error('Failed to import: Invalid file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  
  const clearAllData = () => {
    if (confirm('Are you sure? This will delete ALL saved data!')) {
      localStorage.removeItem('cyberpunk-participants');
      localStorage.removeItem('cyberpunk-encounter');
      localStorage.removeItem('cyberpunk-saved-encounters');
      localStorage.removeItem('cyberpunk-saved-npcs');
      localStorage.removeItem('cyberpunk-pcs');
      localStorage.removeItem('cyberpunk-time');
      localStorage.removeItem('cyberpunk-dice-history');
      toast.info('All data cleared! Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Customize your GM tool experience
          </p>
        </div>
      </div>
      
      {/* Theme Settings */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Palette className="w-5 h-5 text-primary" />
          Theme
        </h3>
        
        {/* Light/Dark Mode */}
        <div className="mb-6">
          <label className="text-sm text-muted-foreground mb-2 block">Color Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => setThemeMode('dark')}
              className={`flex-1 p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                themeMode === 'dark'
                  ? 'border-primary bg-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Moon className="w-6 h-6" />
              <span className="text-sm">Dark</span>
            </button>
            <button
              onClick={() => setThemeMode('light')}
              className={`flex-1 p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                themeMode === 'light'
                  ? 'border-primary bg-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Sun className="w-6 h-6" />
              <span className="text-sm">Light</span>
            </button>
          </div>
        </div>
        
        {/* Color Palette */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Accent Color</label>
          <div className="flex gap-2">
            <button
              onClick={() => setColorPalette('orange')}
              className={`flex-1 p-3 rounded-lg border transition-all ${
                colorPalette === 'orange'
                  ? 'border-[#ff6b35] bg-[#ff6b35]/20'
                  : 'border-border hover:border-[#ff6b35]/50'
              }`}
            >
              <div className="w-full h-4 rounded bg-[#ff6b35] mb-2" />
              <span className="text-sm">Neon Orange</span>
            </button>
            <button
              onClick={() => setColorPalette('blue')}
              className={`flex-1 p-3 rounded-lg border transition-all ${
                colorPalette === 'blue'
                  ? 'border-[#4a9eff] bg-[#4a9eff]/20'
                  : 'border-border hover:border-[#4a9eff]/50'
              }`}
            >
              <div className="w-full h-4 rounded bg-[#4a9eff] mb-2" />
              <span className="text-sm">Cyber Blue</span>
            </button>
            <button
              onClick={() => setColorPalette('red')}
              className={`flex-1 p-3 rounded-lg border transition-all ${
                colorPalette === 'red'
                  ? 'border-[#ff4757] bg-[#ff4757]/20'
                  : 'border-border hover:border-[#ff4757]/50'
              }`}
            >
              <div className="w-full h-4 rounded bg-[#ff4757] mb-2" />
              <span className="text-sm">Alert Red</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Critical Injury Mode */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Skull className="w-5 h-5 text-primary" />
          Critical Injury System
        </h3>
        
        <div className="flex gap-2">
          <button
            onClick={() => setCritMode('raw')}
            className={`flex-1 p-4 rounded-lg border transition-all ${
              critMode === 'raw'
                ? 'border-primary bg-primary/20'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Skull className="w-6 h-6 mb-2" />
            <div className="font-medium">RAW Criticals</div>
            <div className="text-xs text-muted-foreground mt-1">
              Standard Cyberpunk RED injury tables
            </div>
          </button>
          <button
            onClick={() => setCritMode('tarot')}
            className={`flex-1 p-4 rounded-lg border transition-all ${
              critMode === 'tarot'
                ? 'border-primary bg-primary/20'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Sparkles className="w-6 h-6 mb-2" />
            <div className="font-medium">Night City Tarot</div>
            <div className="text-xs text-muted-foreground mt-1">
              Tarot card-based narrative events
            </div>
          </button>
        </div>
      </div>
      
      {/* Data Management */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Download className="w-5 h-5 text-primary" />
          Data Management
        </h3>
        
        <div className="space-y-3">
          <Button onClick={exportAllData} variant="outline" className="w-full justify-start">
            <Download className="w-4 h-4 mr-2" />
            Export All Data
          </Button>
          
          <label className="w-full">
            <input
              type="file"
              accept=".json"
              onChange={importAllData}
              className="hidden"
            />
            <span className="inline-flex items-center w-full px-4 py-2 border rounded-md hover:bg-secondary cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </span>
          </label>
          
          <Button onClick={clearAllData} variant="destructive" className="w-full justify-start">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Data
          </Button>
        </div>
      </div>
      
      {/* About */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>About</h3>
        <p className="text-sm text-muted-foreground">
          Cyberpunk RED GM Tool - A comprehensive encounter tracker and utility for Game Masters running Cyberpunk RED tabletop RPG sessions.
        </p>
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Features:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Initiative tracking with automatic sorting</li>
            <li>RAW-compliant damage calculation</li>
            <li>Armor ablation and cover mechanics</li>
            <li>NPC and encounter generation</li>
            <li>Critical injury rolling</li>
            <li>Shop inventory generation</li>
            <li>Time tracking</li>
            <li>Dice roller with history</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
