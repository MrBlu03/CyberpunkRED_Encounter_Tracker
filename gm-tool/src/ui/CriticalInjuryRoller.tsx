import React, { useMemo, useState, useEffect } from 'react';

type Injury = { 
  key: string; 
  name: string; 
  location: 'head' | 'body'; 
  description: string;
  deathSaveIncrease: boolean;
  quickFix: any;
  treatment: any;
  source: any;
};

export default function CriticalInjuryRoller() {
  const [location, setLocation] = useState<'head' | 'body'>('body');
  const [lastRoll, setLastRoll] = useState<{ injury: Injury; roll: number } | null>(null);
  const [history, setHistory] = useState<Array<{ injury: Injury; roll: number; time: string }>>([]);
  const [criticalInjuries, setCriticalInjuries] = useState<{ head: Injury[], body: Injury[] } | null>(null);

  useEffect(() => {
    // Rehydrate persisted state first
    try {
      const savedLast = localStorage.getItem('cpr-critical-last');
      const savedHist = localStorage.getItem('cpr-critical-history');
      if (savedLast) setLastRoll(JSON.parse(savedLast));
      if (savedHist) setHistory(JSON.parse(savedHist));
    } catch {}

    // Load critical injuries from JSON file
    const base = (import.meta as any).env?.BASE_URL || '/';
    const tryPaths = [base + 'data/critical-injuries.json', './data/critical-injuries.json', '/data/critical-injuries.json'];
    (async () => {
      for (const url of tryPaths) {
        try {
          const res = await fetch(new URL(url, window.location.href).toString(), { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            setCriticalInjuries(json);
            return;
          }
        } catch {}
      }
      console.warn('Could not load critical injuries data from any path. Falling back to minimal set.');
      
        // Fallback to simplified data
        setCriticalInjuries({
          head: [
            { key: 'brain-injury', name: 'Brain Injury', location: 'head', description: 'INT, REF, DEX -2; death save +1.', deathSaveIncrease: true, quickFix: {}, treatment: {}, source: {} },
            { key: 'concussion', name: 'Concussion', location: 'head', description: 'Dazed; -2 to actions; cannot sprint.', deathSaveIncrease: false, quickFix: {}, treatment: {}, source: {} },
          ],
          body: [
            { key: 'broken-arm', name: 'Broken Arm', location: 'body', description: 'One arm unusable; -2 to actions using it.', deathSaveIncrease: false, quickFix: {}, treatment: {}, source: {} },
            { key: 'collapsed-lung', name: 'Collapsed Lung', location: 'body', description: 'Death save +1; stamina penalties.', deathSaveIncrease: true, quickFix: {}, treatment: {}, source: {} },
          ]
        });
    })();
  }, []);

  // Persist across tab changes
  useEffect(() => {
    try {
      if (lastRoll) localStorage.setItem('cpr-critical-last', JSON.stringify(lastRoll));
      localStorage.setItem('cpr-critical-history', JSON.stringify(history));
    } catch {}
  }, [lastRoll, history]);

  const table = useMemo(() => {
    if (!criticalInjuries) return [];
    return location === 'head' ? criticalInjuries.head : criticalInjuries.body;
  }, [location, criticalInjuries]);

  const rollInjury = () => {
    // RAW uses 2d6 tables; for now select uniformly from curated entries
    const idx = Math.floor(Math.random() * table.length);
    const injury = table[idx];
    const roll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1; // 2d6 roll indicator
    const entry = { injury, roll, time: new Date().toLocaleTimeString() };
    setLastRoll({ injury, roll });
    setHistory(prev => [entry, ...prev.slice(0, 19)]);
  };

  const clearHistory = () => setHistory([]);

  return (
    <div className="section">
      <h2>Critical Injury Roller</h2>
      <div className="controls">
        <label>
          <div>Location</div>
          <select value={location} onChange={(e) => setLocation(e.target.value as 'head' | 'body')}>
            <option value="body">Body</option>
            <option value="head">Head</option>
          </select>
        </label>
        <button onClick={rollInjury}>Roll Critical Injury</button>
        {history.length > 0 && (
          <button onClick={clearHistory}>Clear</button>
        )}
      </div>

      {lastRoll && (
        <div className="section" style={{ marginTop: 12 }}>
          <h3>Result</h3>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{lastRoll.injury.name} ({lastRoll.injury.location})</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>2d6: {lastRoll.roll}</div>
          <div style={{ marginTop: 8 }}>{lastRoll.injury.description}</div>
          {lastRoll.injury.deathSaveIncrease && (
            <div style={{ marginTop: 6, color: 'var(--accent)', fontWeight: 'bold' }}>⚠️ Death Save increased by +1</div>
          )}
          {lastRoll.injury.treatment && (
            <div style={{ marginTop: 8 }}>
              <strong>Treatment:</strong>
              {lastRoll.injury.treatment.type === 'surgery' && ` Surgery DV ${lastRoll.injury.treatment.dvSurgery}`}
              {lastRoll.injury.treatment.type === 'quickFix' && ' Quick Fix only'}
              {lastRoll.injury.treatment.type === 'paramedic' && ` Paramedic DV ${lastRoll.injury.treatment.dvParamedic}`}
              {lastRoll.injury.treatment.type === 'paramedicSurgery' && ` Paramedic DV ${lastRoll.injury.treatment.dvParamedic} or Surgery DV ${lastRoll.injury.treatment.dvSurgery}`}
            </div>
          )}
          {lastRoll.injury.quickFix && lastRoll.injury.quickFix.type !== 'notApplicable' && (
            <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-muted)' }}>
              <strong>Quick Fix:</strong>
              {lastRoll.injury.quickFix.type === 'firstAid' && ` First Aid DV ${lastRoll.injury.quickFix.dvFirstAid}`}
              {lastRoll.injury.quickFix.type === 'paramedic' && ` Paramedic DV ${lastRoll.injury.quickFix.dvParamedic}`}
              {lastRoll.injury.quickFix.type === 'firstAidParamedic' && ` First Aid DV ${lastRoll.injury.quickFix.dvFirstAid} or Paramedic DV ${lastRoll.injury.quickFix.dvParamedic}`}
            </div>
          )}
        </div>
      )}

      <div className="section" style={{ marginTop: 12 }}>
        <h3>History ({history.length})</h3>
        {history.length === 0 ? (
          <div className="no-results">No rolls yet</div>
        ) : (
          <div className="results-list">
            {history.map((h, i) => (
              <div key={i} className="result-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                <strong>{h.injury.name}</strong> <span style={{ color: 'var(--text-muted)' }}>({h.injury.location})</span>
                </div>
                <div style={{ color: 'var(--accent)' }}>2d6: {h.roll}</div>
              <div style={{ color: 'var(--text-muted)' }}>{h.time}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


