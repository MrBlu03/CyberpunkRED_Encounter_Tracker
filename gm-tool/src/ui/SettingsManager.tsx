import React, { useEffect, useState } from 'react';

type Mode = 'light' | 'dark';
type Palette = 'orange' | 'blue' | 'red';

export default function SettingsManager() {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('theme-mode') as Mode) || 'dark');
  const [palette, setPalette] = useState<Palette>(() => (localStorage.getItem('theme-palette') as Palette) || 'orange');
  const [critMode, setCritMode] = useState<'raw' | 'tarot'>(() => (localStorage.getItem('crit-mode') as 'raw' | 'tarot') ?? 'raw');

  useEffect(() => {
    applyTheme(mode, palette);
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-palette', palette);
  }, [mode, palette]);

  // Apply theme on mount
  useEffect(() => {
    applyTheme(mode, palette);
  }, []);

  useEffect(() => {
    localStorage.setItem('crit-mode', critMode);
  }, [critMode]);

  const exportAll = () => {
    const data = {
      participants: localStorage.getItem('cyberpunk-participants'),
      encounter: localStorage.getItem('cyberpunk-encounter'),
      generatedNPCs: localStorage.getItem('cyberpunk-generated-npcs'),
      diceHistory: localStorage.getItem('dice-history')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `gm-tool-export-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const importAll = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result || '{}'));
        if (json.participants) localStorage.setItem('cyberpunk-participants', json.participants);
        if (json.encounter) localStorage.setItem('cyberpunk-encounter', json.encounter);
        if (json.generatedNPCs) localStorage.setItem('cyberpunk-generated-npcs', json.generatedNPCs);
        if (json.diceHistory) localStorage.setItem('dice-history', json.diceHistory);
        alert('Import complete. Reload to apply.');
      } catch (e) {
        alert('Invalid import file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="section">
      <h2>Settings & Data</h2>
      <div className="controls">
        <label>
          <div>Mode</div>
          <select value={mode} onChange={e => setMode(e.target.value as Mode)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          <div>Palette</div>
          <select value={palette} onChange={e => setPalette(e.target.value as Palette)}>
            <option value="orange">Orange</option>
            <option value="blue">Light Blue</option>
            <option value="red">Darker Red</option>
          </select>
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label>Critical Hit Mode</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
            <span style={{ color: critMode === 'raw' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: critMode === 'raw' ? 'bold' : 'normal' }}>RAW (2+ sixes)</span>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={critMode === 'tarot'} 
                onChange={() => setCritMode(critMode === 'raw' ? 'tarot' : 'raw')}
                style={{ appearance: 'none', width: 44, height: 20, background: critMode === 'tarot' ? 'var(--accent)' : 'var(--text-muted)', borderRadius: 10, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
              />
              <div style={{ 
                position: 'absolute', 
                width: 16, 
                height: 16, 
                background: 'white', 
                borderRadius: '50%', 
                top: 2, 
                left: critMode === 'tarot' ? 26 : 2, 
                transition: 'left 0.2s',
                pointerEvents: 'none'
              }} />
            </label>
            <span style={{ color: critMode === 'tarot' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: critMode === 'tarot' ? 'bold' : 'normal' }}>Tarot</span>
          </div>
        </div>
        <button onClick={exportAll}>Export All</button>
        <label className="file-input-label">
          Import All
          <input type="file" accept="application/json" style={{ display: 'none' }} onChange={e => e.target.files && importAll(e.target.files[0])} />
        </label>
        <button className="danger-btn" onClick={() => { if (confirm('Clear all local data?')) { localStorage.clear(); location.reload(); } }}>Clear All</button>
      </div>
      <p style={{ color: 'var(--text-muted)' }}>Themes apply CSS variables; text maintains readable contrast across palettes.</p>
    </div>
  );
}

function applyTheme(mode: Mode, palette: Palette) {
  const r = document.documentElement;
  
  const bases = mode === 'dark'
    ? { 
        bg: '#0a0a0a', 
        surface: '#1a1a1a', 
        surface2: '#2a2a2a',
        text: '#e0e0e0', 
        textMuted: '#888',
        border: '#333' 
      }
    : { 
        bg: '#f8f9fa', 
        surface: '#ffffff', 
        surface2: '#f1f3f4',
        text: '#212529', 
        textMuted: '#6c757d',
        border: '#dee2e6' 
      };

  const palettes: Record<Palette, { accent: string; accentAlt: string; subtle: string; textAccent: string; hover: string }> = {
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
  r.style.setProperty('--accent', p.accent, 'important');
  r.style.setProperty('--accent-alt', p.accentAlt, 'important');
  r.style.setProperty('--accent-subtle', p.subtle, 'important');
  r.style.setProperty('--text-accent', p.textAccent, 'important');
  r.style.setProperty('--accent-hover', p.hover, 'important');
}


