import React, { useMemo, useState, useEffect } from 'react'
import { DamageCalculator } from './DamageCalculator'
import NPCGenerator from './NPCGenerator'
import ShopGenerator from './ShopGenerator'
import EncounterGenerator from './EncounterGenerator'
import DiceRoller from './DiceRoller'

export type WoundState = 'not-wounded' | 'lightly-wounded' | 'seriously-wounded' | 'mortally-wounded' | 'dead'

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
  armor?: {
    head: number
    body: number
    shield?: number
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
  const [name, setName] = useState('')
  const [ref, setRef] = useState<number>(6)
  const [initiativeSkill, setInitiativeSkill] = useState<number>(0)
  const [hp, setHp] = useState<number>(25)
  
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
        shield: 0
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
        shield: 0
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

  // Apply damage to specific participant
  const applyDamageToParticipant = (participantId: string, damage: number) => {
    setParticipants(prev => 
      prev.map(p => {
        if (p.id === participantId) {
          const newHp = Math.max(0, (p.hp || 0) - damage);
          const newWoundState = getWoundState(newHp, p.maxHp || 25);
          return {
            ...p,
            hp: newHp,
            woundState: newWoundState,
            dead: newHp <= 0
          };
        }
        return p;
      })
    );
  };

  // Armor and cover management
  const toggleArmorEditor = (participantId: string) => {
    const headSP = prompt('Enter Head Armor SP:', '0');
    const bodySP = prompt('Enter Body Armor SP:', '0');
    const shieldSP = prompt('Enter Shield SP (optional):', '0');
    
    if (headSP !== null && bodySP !== null) {
      updateParticipant(participantId, {
        armor: {
          head: parseInt(headSP) || 0,
          body: parseInt(bodySP) || 0,
          shield: shieldSP && parseInt(shieldSP) > 0 ? parseInt(shieldSP) : undefined
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
          cover = { type: 'light' as const, hp: 10, maxHp: 10 };
          break;
        case '2':
          cover = { type: 'medium' as const, hp: 15, maxHp: 15 };
          break;
        case '3':
          cover = { type: 'heavy' as const, hp: 20, maxHp: 20 };
          break;
        case '4':
          cover = { type: 'human-shield' as const, hp: 40, maxHp: 40 };
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
      woundState: 'not-wounded'
    }])
    setName('')
  }

  const rollAll = () => {
    setParticipants((p: Participant[]) => p.map((x: Participant) => {
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
      <h1 style={{ marginBottom: '24px', fontSize: '28px', color: '#ff6b35' }}>Cyberpunk RED GM Tool</h1>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'encounter' ? 'active' : ''}`}
          onClick={() => setActiveTab('encounter')}
        >
          Encounters
        </button>
        <button 
          className={`tab ${activeTab === 'damage' ? 'active' : ''}`}
          onClick={() => setActiveTab('damage')}
        >
          Damage
        </button>
        <button 
          className={`tab ${activeTab === 'npc' ? 'active' : ''}`}
          onClick={() => setActiveTab('npc')}
        >
          NPCs
        </button>
        <button 
          className={`tab ${activeTab === 'shop' ? 'active' : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          Shop
        </button>
        <button 
          className={`tab ${activeTab === 'encounter-gen' ? 'active' : ''}`}
          onClick={() => setActiveTab('encounter-gen')}
        >
          Random Encounters
        </button>
      </div>

      <div className="main-content">

      {activeTab === 'encounter' && (
        <div className="encounter-page">
          <div className="encounter-layout">
            {/* Main encounter content */}
            <div className="encounter-main">
              {encounter.active && (
                <div className="section">
                  <h2>Combat Round {encounter.round}</h2>
                  <div className="controls">
                    <span>Current Turn: <strong>{activeTurnParticipant?.name || 'None'}</strong></span>
                    <button onClick={nextTurn}>Next Turn</button>
                    <button onClick={endEncounter}>End Encounter</button>
                  </div>
                </div>
              )}

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
                          <td style={{ textAlign: 'center' }}>{p.ref}</td>
                          <td style={{ textAlign: 'center' }}>{p.initiativeSkill ?? 0}</td>
                          <td style={{ textAlign: 'center' }}>{p.rolled ?? '-'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{p.total ?? '-'}</td>
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
                                <div>H:{p.armor.head}</div>
                                <div>B:{p.armor.body}</div>
                                {p.armor.shield && <div>S:{p.armor.shield}</div>}
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
                            {!canAct(p) && <span style={{ color: '#ff6b35' }}>Skip Turn</span>}
                            <button 
                              onClick={() => applyDamageToParticipant(p.id, 1)} 
                              className="small-btn damage-btn"
                              title="Apply 1 damage"
                            >
                              +1 Dmg
                            </button>
                            <button 
                              onClick={() => applyDamageToParticipant(p.id, -1)} 
                              className="small-btn heal-btn"
                              title="Heal 1 HP"
                            >
                              +1 HP
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
                      </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <p style={{ marginTop: 16, color: '#888', fontSize: 14 }}>
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

      {activeTab === 'npc' && <NPCGenerator onAddToEncounter={addNPCToEncounter} />}

      {activeTab === 'shop' && <ShopGenerator />}

      {activeTab === 'encounter-gen' && <EncounterGenerator onAddToEncounter={addMultipleNPCsToEncounter} />}
      </div>
    </div>
  )
}

export default App;
