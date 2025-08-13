import React, { useEffect, useState } from 'react';

type Mode = 'light' | 'dark';
type Palette = 'orange' | 'blue' | 'red';

export default function SettingsManager() {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('theme-mode') as Mode) || 'dark');
  const [palette, setPalette] = useState<Palette>(() => (localStorage.getItem('theme-palette') as Palette) || 'orange');
  const [enableRawCrit, setEnableRawCrit] = useState<boolean>(() => (localStorage.getItem('crit-mode') ?? 'raw') === 'raw');
  const [enableTarotCrit, setEnableTarotCrit] = useState<boolean>(() => (localStorage.getItem('crit-mode') ?? 'raw') === 'tarot');

  useEffect(() => {
    applyTheme(mode, palette);
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-palette', palette);
  }, [mode, palette]);

  useEffect(() => {
    const mode = enableTarotCrit ? 'tarot' : 'raw';
    localStorage.setItem('crit-mode', mode);
  }, [enableRawCrit, enableTarotCrit]);

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
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="radio" name="crit-mode" checked={enableRawCrit} onChange={() => { setEnableRawCrit(true); setEnableTarotCrit(false); }} />
            RAW Critical Injuries (2+ sixes on damage)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="radio" name="crit-mode" checked={enableTarotCrit} onChange={() => { setEnableRawCrit(false); setEnableTarotCrit(true); }} />
            Tarot Criticals (optional rule)
          </label>
        </div>
        <button onClick={exportAll}>Export All</button>
        <label className="file-input-label">
          Import All
          <input type="file" accept="application/json" style={{ display: 'none' }} onChange={e => e.target.files && importAll(e.target.files[0])} />
        </label>
        <button className="danger-btn" onClick={() => { if (confirm('Clear all local data?')) { localStorage.clear(); location.reload(); } }}>Clear All</button>
      </div>
      <p style={{ color: '#888' }}>Themes apply CSS variables; text maintains readable contrast across palettes.</p>
    </div>
  );
}

function applyTheme(mode: Mode, palette: Palette) {
  const r = document.documentElement;
  const bases = mode === 'dark'
    ? { bg: '#0a0a0a', surface: '#1a1a1a', text: '#e0e0e0', border: '#333' }
    : { bg: '#fafafa', surface: '#ffffff', text: '#1a1a1a', border: '#ddd' };

  const palettes: Record<Palette, { accent: string; accentAlt: string; subtle: string; textAccent: string }> = {
    orange: { accent: '#ff6b35', accentAlt: '#ff8c42', subtle: 'rgba(255,107,53,0.1)', textAccent: '#ff6b35' },
    blue:   { accent: '#4a9eff', accentAlt: '#6bb6ff', subtle: 'rgba(74,158,255,0.12)', textAccent: '#4a9eff' },
    red:    { accent: '#b33939', accentAlt: '#e55039', subtle: 'rgba(179,57,57,0.12)', textAccent: '#d96e6e' },
  };

  const p = palettes[palette];
  r.style.setProperty('--bg', bases.bg);
  r.style.setProperty('--surface', bases.surface);
  r.style.setProperty('--text', bases.text);
  r.style.setProperty('--border', bases.border);
  r.style.setProperty('--accent', p.accent);
  r.style.setProperty('--accent-alt', p.accentAlt);
  r.style.setProperty('--accent-subtle', p.subtle);
  r.style.setProperty('--text-accent', p.textAccent);
}


