import React, { useMemo, useState } from 'react';

type Injury = { key: string; name: string; location: 'head' | 'body'; brief: string };

const HEAD_INJURIES: Injury[] = [
  { key: 'brain-injury', name: 'Brain Injury', location: 'head', brief: 'INT, REF, DEX -2; death save +1.' },
  { key: 'cracked-skull', name: 'Cracked Skull', location: 'head', brief: 'Stunned; move halved; DV +2 to actions.' },
  { key: 'concussion', name: 'Concussion', location: 'head', brief: 'Dazed; -2 to actions; cannot sprint.' },
  { key: 'damaged-eye', name: 'Damaged Eye', location: 'head', brief: '-2 to sight-based checks; aim penalties.' },
  { key: 'lost-eye', name: 'Lost Eye', location: 'head', brief: 'Blind in one eye; significant sight penalties.' },
  { key: 'damaged-ear', name: 'Damaged Ear', location: 'head', brief: '-2 to hearing checks; comms issues.' },
  { key: 'lost-ear', name: 'Lost Ear', location: 'head', brief: 'One ear gone; hearing penalties.' },
  { key: 'whiplash', name: 'Whiplash', location: 'head', brief: 'Move -2; -2 to some checks.' },
  { key: 'crushed-windpipe', name: 'Crushed Windpipe', location: 'head', brief: 'Can’t speak; penalties to actions.' },
  { key: 'foreign-object', name: 'Foreign Object', location: 'head', brief: 'Ongoing impairment until removed.' },
];

const BODY_INJURIES: Injury[] = [
  { key: 'broken-arm', name: 'Broken Arm', location: 'body', brief: 'One arm unusable; -2 to actions using it.' },
  { key: 'broken-leg', name: 'Broken Leg', location: 'body', brief: 'Move halved; -2 to move checks.' },
  { key: 'broken-ribs', name: 'Broken Ribs', location: 'body', brief: 'Breathing pain; -2 to many actions.' },
  { key: 'collapsed-lung', name: 'Collapsed Lung', location: 'body', brief: 'Death save +1; stamina penalties.' },
  { key: 'spinal-injury', name: 'Spinal Injury', location: 'body', brief: 'Severe penalties; movement impaired.' },
  { key: 'foreign-object', name: 'Foreign Object', location: 'body', brief: 'Bleeding; penalties until removed.' },
  { key: 'crushed-fingers', name: 'Crushed Fingers', location: 'body', brief: '-2 to fine motor actions.' },
  { key: 'dismembered-hand', name: 'Dismembered Hand', location: 'body', brief: 'Hand lost.' },
  { key: 'dismembered-arm', name: 'Dismembered Arm', location: 'body', brief: 'Arm lost.' },
  { key: 'dismembered-leg', name: 'Dismembered Leg', location: 'body', brief: 'Leg lost.' },
];

export default function CriticalInjuryRoller() {
  const [location, setLocation] = useState<'head' | 'body'>('body');
  const [lastRoll, setLastRoll] = useState<{ injury: Injury; roll: number } | null>(null);
  const [history, setHistory] = useState<Array<{ injury: Injury; roll: number; time: string }>>([]);

  const table = useMemo(() => (location === 'head' ? HEAD_INJURIES : BODY_INJURIES), [location]);

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
          <div style={{ color: '#ccc', marginTop: 6 }}>2d6: {lastRoll.roll}</div>
          <div style={{ marginTop: 8 }}>{lastRoll.injury.brief}</div>
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
                  <strong>{h.injury.name}</strong> <span style={{ color: '#888' }}>({h.injury.location})</span>
                </div>
                <div style={{ color: 'var(--accent)' }}>2d6: {h.roll}</div>
                <div style={{ color: '#888' }}>{h.time}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


