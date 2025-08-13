import React, { useEffect, useState } from 'react';

type PC = {
  id: string;
  name: string;
  ref: number;
  initiative: number;
  hp: number;
  maxHp: number;
  armorHead: number;
  armorBody: number;
  shieldSp: number;
};

export default function PCManager({ onAddToEncounter }: { onAddToEncounter?: (pc: PC) => void } ) {
  const [pcs, setPcs] = useState<PC[]>(() => {
    try { const raw = localStorage.getItem('gm-pcs'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [form, setForm] = useState<Omit<PC, 'id'>>({ name: '', ref: 6, initiative: 0, hp: 35, maxHp: 35, armorHead: 0, armorBody: 0, shieldSp: 0 });

  useEffect(() => { localStorage.setItem('gm-pcs', JSON.stringify(pcs)); }, [pcs]);

  const addPC = () => {
    if (!form.name.trim()) return;
    setPcs(prev => [...prev, { id: crypto.randomUUID(), ...form }]);
    setForm({ name: '', ref: 6, initiative: 0, hp: 35, maxHp: 35, armorHead: 0, armorBody: 0, shieldSp: 0 });
  };

  const updatePC = (id: string, patch: Partial<PC>) => setPcs(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  const removePC = (id: string) => setPcs(prev => prev.filter(p => p.id !== id));

  return (
    <div className="section">
      <h2>Player Character Manager</h2>

      <div className="controls" style={{ alignItems: 'end' }}>
        <label><div>Name</div><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label><div>REF</div><input type="number" value={form.ref} onChange={e => setForm({ ...form, ref: Number(e.target.value) })} /></label>
        <label><div>Initiative</div><input type="number" value={form.initiative} onChange={e => setForm({ ...form, initiative: Number(e.target.value) })} /></label>
        <label><div>HP</div><input type="number" value={form.hp} onChange={e => setForm({ ...form, hp: Number(e.target.value) })} /></label>
        <label><div>Max HP</div><input type="number" value={form.maxHp} onChange={e => setForm({ ...form, maxHp: Number(e.target.value) })} /></label>
        <label><div>Head SP</div><input type="number" value={form.armorHead} onChange={e => setForm({ ...form, armorHead: Number(e.target.value) })} /></label>
        <label><div>Body SP</div><input type="number" value={form.armorBody} onChange={e => setForm({ ...form, armorBody: Number(e.target.value) })} /></label>
        <label><div>Shield SP</div><input type="number" value={form.shieldSp} onChange={e => setForm({ ...form, shieldSp: Number(e.target.value) })} /></label>
        <button onClick={addPC}>Add PC</button>
      </div>

      {pcs.length === 0 ? (
        <div className="no-results">No PCs yet</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>REF</th>
              <th>Initiative</th>
              <th>HP</th>
              <th>Armor (Head/Body/Shield)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pcs.map(pc => (
              <tr key={pc.id}>
                <td>{pc.name}</td>
                <td>{pc.ref}</td>
                <td>{pc.initiative}</td>
                <td>
                  <input type="number" value={pc.hp} onChange={e => updatePC(pc.id, { hp: Number(e.target.value) })} style={{ width: 70 }} /> / {pc.maxHp}
                </td>
                <td>{pc.armorHead} / {pc.armorBody} / {pc.shieldSp}</td>
                <td>
                  {onAddToEncounter && (
                    <button className="small-btn add-encounter-btn" onClick={() => onAddToEncounter(pc)}>Add to Encounter</button>
                  )}
                  <button className="small-btn" onClick={() => updatePC(pc.id, { hp: Math.min(pc.maxHp, pc.hp + 5) })}>Heal 5</button>
                  <button className="small-btn damage-btn" onClick={() => updatePC(pc.id, { hp: Math.max(0, pc.hp - 5) })}>Damage 5</button>
                  <button className="small-btn danger-btn" onClick={() => removePC(pc.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


