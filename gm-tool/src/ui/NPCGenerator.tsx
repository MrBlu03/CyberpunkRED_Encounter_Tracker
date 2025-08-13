import React, { useState, useEffect } from 'react';

interface Stat {
  name: string;
  value: number;
  max: number;
}

interface Skill {
  _id: string;
  name: string;
  system: {
    basic: boolean;
    category: string;
    core: boolean;
    stat: string;
    level: number;
  };
}

interface Weapon {
  _id: string;
  name: string;
  system: {
    damage: string;
    weaponSkill: string;
    attackmod: number;
    concealable?: {
      concealable: boolean;
    };
  };
}

interface Armor {
  _id: string;
  name: string;
  system: {
    bodyLocation: {
      ablation: number;
      sp: number;
    };
    headLocation: {
      ablation: number;
      sp: number;
    };
    isBodyLocation: boolean;
    isHeadLocation: boolean;
    penalty: number;
    price: {
      market: number;
    };
    description: {
      value: string;
    };
  };
}

interface DifficultyPreset {
  name: string;
  description: string;
  statRange: [number, number];
  skillRange: [number, number];
  weaponCount: [number, number];
  armorChance: number;
  templates: string[];
}

interface NPC {
  id: string;
  name: string;
  stats: { [key: string]: number };
  skills: { [key: string]: number };
  equipment: {
    weapons: Weapon[];
    armor?: Armor;
    armorPieces?: Armor[];
    gear?: any[];
  };
  hitPoints: {
    max: number;
    current: number;
  };
  woundState: 'Not Wounded' | 'Lightly Wounded' | 'Seriously Wounded' | 'Mortally Wounded' | 'Dead';
  initiative?: number;
  difficultyRating?: string;
}

interface NPCGeneratorProps {
  onAddToEncounter?: (npc: NPC) => void;
}

export default function NPCGenerator({ onAddToEncounter }: NPCGeneratorProps) {
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [availableWeapons, setAvailableWeapons] = useState<Weapon[]>([]);
  const [availableArmor, setAvailableArmor] = useState<Armor[]>([]);
  const [generatedNPCs, setGeneratedNPCs] = useState<NPC[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('mook');
  const [guaranteeArmor, setGuaranteeArmor] = useState<boolean>(false);
  
  const [currentNPC, setCurrentNPC] = useState<Partial<NPC>>({
    name: '',
    stats: {
      int: 6,
      ref: 6,
      dex: 6,
      tech: 6,
      cool: 6,
      will: 6,
      luck: 6,
      move: 6,
      body: 6,
      emp: 6
    },
    skills: {},
    equipment: { weapons: [] },
    hitPoints: { max: 40, current: 40 },
    woundState: 'Not Wounded'
  });

  const difficultyPresets: { [key: string]: DifficultyPreset } = {
    mook: {
      name: 'Mook',
      description: 'Basic enemies, street gangers, security guards',
      statRange: [3, 6],
      skillRange: [2, 4],
      weaponCount: [1, 1],
      armorChance: 0.3,
      templates: ['Ganger', 'Security Guard', 'Street Rat', 'Thug']
    },
    lieutenant: {
      name: 'Lieutenant',
      description: 'Mid-level threats, experienced gangers, corpo security',
      statRange: [5, 8],
      skillRange: [4, 7],
      weaponCount: [1, 2],
      armorChance: 0.6,
      templates: ['Corpo Security', 'Gang Lieutenant', 'Experienced Solo', 'Techie']
    },
    boss: {
      name: 'Boss',
      description: 'Major threats, gang leaders, elite solos',
      statRange: [7, 10],
      skillRange: [6, 10],
      weaponCount: [2, 3],
      armorChance: 0.8,
      templates: ['Gang Boss', 'Elite Solo', 'Corpo Exec Security', 'Cyber Psycho']
    }
  };

  const statNames = [
    { key: 'int', name: 'Intelligence' },
    { key: 'ref', name: 'Reflexes' },
    { key: 'dex', name: 'Dexterity' },
    { key: 'tech', name: 'Technical Ability' },
    { key: 'cool', name: 'Cool' },
    { key: 'will', name: 'Willpower' },
    { key: 'luck', name: 'Luck' },
    { key: 'move', name: 'Movement' },
    { key: 'body', name: 'Body' },
    { key: 'emp', name: 'Empathy' }
  ];

  // Load data on component mount
  useEffect(() => {
    loadGameData();
  }, []);

  // Load saved NPCs on component mount
  useEffect(() => {
    try {
      const savedNPCs = localStorage.getItem('cyberpunk-generated-npcs');
      if (savedNPCs) {
        const parsed = JSON.parse(savedNPCs);
        if (Array.isArray(parsed)) {
          setGeneratedNPCs(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading saved NPCs:', error);
    }
  }, []);

  // Save NPCs when they change
  useEffect(() => {
    try {
      localStorage.setItem('cyberpunk-generated-npcs', JSON.stringify(generatedNPCs));
    } catch (error) {
      console.error('Error saving NPCs:', error);
    }
  }, [generatedNPCs]);

  const loadGameData = async () => {
    try {
      const response = await fetch('/data/core.json');
      const data = await response.json();
      
      // Filter skills - get core skills and common ones
      const skills = data.filter((item: any) => 
        item.type === 'skill' && 
        (item.system.core === true || 
         item.name.includes('Handgun') || 
         item.name.includes('Shoulder Arms') ||
         item.name.includes('Brawling') ||
         item.name.includes('Athletics') ||
         item.name.includes('Stealth') ||
         item.name.includes('Perception') ||
         item.name.includes('Electronics') ||
         item.name.includes('Basic Tech') ||
         item.name.includes('Streetwise'))
      );
      
      // Filter weapons - get common weapons
      const weapons = data.filter((item: any) => 
        item.type === 'weapon' && 
        !item.name.includes('(Poor)') && 
        !item.name.includes('(Excellent)') &&
        !item.name.includes('Exotic')
      ).slice(0, 30); // Limit to most common

      // Filter armor
      const armor = data.filter((item: any) => 
        item.type === 'armor' && 
        (item.system?.bodyLocation?.sp > 0 || item.system?.headLocation?.sp > 0)
      ).slice(0, 20);
      
      console.log('Available armor count:', armor.length);
      console.log('Sample armor:', armor.slice(0, 3));
      
      setAvailableSkills(skills);
      setAvailableWeapons(weapons);
      setAvailableArmor(armor);
    } catch (error) {
      console.error('Failed to load game data:', error);
    }
  };

  const updateStat = (statKey: string, value: number) => {
    setCurrentNPC(prev => ({
      ...prev,
      stats: {
        ...prev.stats!,
        [statKey]: Math.max(3, Math.min(10, value))
      },
      hitPoints: statKey === 'body' ? {
        max: (value + Math.floor((prev.stats?.will || 6) / 2)) * 5,
        current: (value + Math.floor((prev.stats?.will || 6) / 2)) * 5
      } : prev.hitPoints
    }));
  };

  const updateSkill = (skillId: string, level: number) => {
    setCurrentNPC(prev => ({
      ...prev,
      skills: {
        ...prev.skills!,
        [skillId]: Math.max(2, Math.min(10, level))
      }
    }));
  };

  const addWeapon = (weaponId: string) => {
    const weapon = availableWeapons.find(w => w._id === weaponId);
    if (weapon && currentNPC.equipment) {
      setCurrentNPC(prev => ({
        ...prev,
        equipment: {
          ...prev.equipment!,
          weapons: [...(prev.equipment?.weapons || []), weapon]
        }
      }));
    }
  };

  const removeWeapon = (weaponId: string) => {
    setCurrentNPC(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment!,
        weapons: prev.equipment?.weapons?.filter(w => w._id !== weaponId) || []
      }
    }));
  };

  const selectArmor = (armorId: string) => {
    const armor = availableArmor.find(a => a._id === armorId);
    setCurrentNPC(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment!,
        armor
      }
    }));
  };

  const generateRandomNPCWithDifficulty = () => {
    const preset = difficultyPresets[selectedDifficulty];
    const templates = [
      { name: 'Ganger', bodyRange: [preset.statRange[0], preset.statRange[1]], refRange: [preset.statRange[0], preset.statRange[1]], skills: ['Handgun', 'Brawling', 'Stealth'] },
      { name: 'Corpo Security', bodyRange: [preset.statRange[0], preset.statRange[1]], refRange: [preset.statRange[0], preset.statRange[1]], skills: ['Shoulder Arms', 'Athletics', 'Perception'] },
      { name: 'Street Rat', bodyRange: [preset.statRange[0], Math.min(preset.statRange[1], 6)], refRange: [Math.max(preset.statRange[0], 6), preset.statRange[1]], skills: ['Handgun', 'Stealth', 'Streetwise'] },
      { name: 'Techie', bodyRange: [preset.statRange[0], Math.min(preset.statRange[1], 6)], refRange: [preset.statRange[0], preset.statRange[1]], skills: ['Electronics/Security Tech', 'Basic Tech', 'Perception'] },
      { name: 'Solo', bodyRange: [Math.max(preset.statRange[0], 6), preset.statRange[1]], refRange: [Math.max(preset.statRange[0], 6), preset.statRange[1]], skills: ['Shoulder Arms', 'Handgun', 'Athletics'] }
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    
    const randomStats = {
      int: Math.floor(Math.random() * (preset.statRange[1] - preset.statRange[0] + 1)) + preset.statRange[0],
      ref: Math.floor(Math.random() * (template.refRange[1] - template.refRange[0] + 1)) + template.refRange[0],
      dex: Math.floor(Math.random() * (preset.statRange[1] - preset.statRange[0] + 1)) + preset.statRange[0],
      tech: Math.floor(Math.random() * (preset.statRange[1] - preset.statRange[0] + 1)) + preset.statRange[0],
      cool: Math.floor(Math.random() * (preset.statRange[1] - preset.statRange[0] + 1)) + preset.statRange[0],
      will: Math.floor(Math.random() * (preset.statRange[1] - preset.statRange[0] + 1)) + preset.statRange[0],
      luck: Math.floor(Math.random() * (preset.statRange[1] - preset.statRange[0] + 1)) + preset.statRange[0],
      move: Math.floor(Math.random() * (preset.statRange[1] - preset.statRange[0] + 1)) + preset.statRange[0],
      body: Math.floor(Math.random() * (template.bodyRange[1] - template.bodyRange[0] + 1)) + template.bodyRange[0],
      emp: Math.floor(Math.random() * (preset.statRange[1] - preset.statRange[0] + 1)) + preset.statRange[0]
    };

    const randomSkills: { [key: string]: number } = {};
    template.skills.forEach(skillName => {
      const skill = availableSkills.find(s => s.name.includes(skillName));
      if (skill) {
        randomSkills[skill._id] = Math.floor(Math.random() * (preset.skillRange[1] - preset.skillRange[0] + 1)) + preset.skillRange[0];
      }
    });

    // Generate 1-3 weapons
    const weaponCount = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3 weapons
    const selectedWeapons: Weapon[] = [];
    const shuffledWeapons = [...availableWeapons].sort(() => Math.random() - 0.5);
    for (let i = 0; i < weaponCount && i < shuffledWeapons.length; i++) {
      selectedWeapons.push(shuffledWeapons[i]);
    }

    // Generate 1-2 armor pieces (body and/or head, not same type)
    const armorPieces: Armor[] = [];
    const shouldHaveArmor = guaranteeArmor || Math.random() < preset.armorChance;
    
    console.log('Armor generation:', {
      guaranteeArmor,
      armorChance: preset.armorChance,
      shouldHaveArmor,
      availableArmorCount: availableArmor.length
    });
    
    if (shouldHaveArmor && availableArmor.length > 0) {
      const armorCount = Math.floor(Math.random() * 2) + 1; // 1 or 2 pieces
      
      // Separate armor by type (body vs head)
      const bodyArmor = availableArmor.filter(armor => 
        armor.system?.bodyLocation?.sp && armor.system.bodyLocation.sp > 0
      );
      const headArmor = availableArmor.filter(armor => 
        armor.system?.headLocation?.sp && armor.system.headLocation.sp > 0
      );
      
      // First piece - randomly choose body or head if both are available
      if (bodyArmor.length > 0 && headArmor.length > 0) {
        if (Math.random() < 0.5) {
          // Choose body armor first
          armorPieces.push(bodyArmor[Math.floor(Math.random() * bodyArmor.length)]);
          // If getting 2 pieces, add head armor
          if (armorCount === 2) {
            armorPieces.push(headArmor[Math.floor(Math.random() * headArmor.length)]);
          }
        } else {
          // Choose head armor first
          armorPieces.push(headArmor[Math.floor(Math.random() * headArmor.length)]);
          // If getting 2 pieces, add body armor
          if (armorCount === 2) {
            armorPieces.push(bodyArmor[Math.floor(Math.random() * bodyArmor.length)]);
          }
        }
      } else if (bodyArmor.length > 0) {
        // Only body armor available
        armorPieces.push(bodyArmor[Math.floor(Math.random() * bodyArmor.length)]);
      } else if (headArmor.length > 0) {
        // Only head armor available
        armorPieces.push(headArmor[Math.floor(Math.random() * headArmor.length)]);
      }
    }

    const maxHP = (randomStats.body + Math.floor(randomStats.will / 2)) * 5;

    setCurrentNPC({
      name: `${template.name} #${Math.floor(Math.random() * 1000)}`,
      stats: randomStats,
      skills: randomSkills,
      equipment: { 
        weapons: selectedWeapons,
        armorPieces: armorPieces
      },
      hitPoints: { max: maxHP, current: maxHP },
      woundState: 'Not Wounded',
      difficultyRating: preset.name
    });
  };

  const saveNPC = () => {
    if (!currentNPC.name) return;
    
    const npc: NPC = {
      ...currentNPC as NPC,
      id: Date.now().toString()
    };
    
    setGeneratedNPCs(prev => [...prev, npc]);
    
    // Reset form
    setCurrentNPC({
      name: '',
      stats: {
        int: 6, ref: 6, dex: 6, tech: 6, cool: 6,
        will: 6, luck: 6, move: 6, body: 6, emp: 6
      },
      skills: {},
      equipment: { weapons: [] },
      hitPoints: { max: 40, current: 40 },
      woundState: 'Not Wounded'
    });
  };

  const deleteNPC = (id: string) => {
    setGeneratedNPCs(prev => prev.filter(npc => npc.id !== id));
  };

  const addToEncounter = (npc: NPC) => {
    if (onAddToEncounter) {
      onAddToEncounter(npc);
    }
  };

  const getSkillTotal = (skill: Skill, npcStats: any) => {
    const statValue = npcStats[skill.system.stat] || 6;
    const skillLevel = currentNPC.skills?.[skill._id] || 2;
    return statValue + skillLevel;
  };

  return (
    <div className="npc-generator">
      <div className="npc-builder">
        <h2>NPC Builder</h2>
        
        <div className="builder-row">
          <div className="name-section">
            <label>
              Name:
              <input 
                type="text" 
                value={currentNPC.name || ''} 
                onChange={(e) => setCurrentNPC(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter NPC name"
              />
            </label>
          </div>
          <div className="difficulty-section">
            <label>
              Difficulty Preset:
              <select 
                value={selectedDifficulty} 
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                {Object.entries(difficultyPresets).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.name} - {preset.description}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={generateRandomNPCWithDifficulty} className="random-btn">
              Generate Random {difficultyPresets[selectedDifficulty].name}
            </button>
            <div className="armor-guarantee-section">
              <label>
                <input 
                  type="checkbox"
                  checked={guaranteeArmor}
                  onChange={(e) => setGuaranteeArmor(e.target.checked)}
                />
                Guarantee Armor on Generated NPCs
              </label>
            </div>
          </div>
        </div>

        <div className="builder-row">
          <div className="stats-section">
            <h3>Stats</h3>
            <div className="stats-grid">
              {statNames.map(stat => (
                <div key={stat.key} className="stat-input">
                  <label>{stat.name}:</label>
                  <input 
                    type="number" 
                    min="3" 
                    max="10" 
                    value={currentNPC.stats?.[stat.key] || 6}
                    onChange={(e) => updateStat(stat.key, parseInt(e.target.value))}
                  />
                </div>
              ))}
            </div>
            <div className="hp-display">
              <strong>Hit Points: {currentNPC.hitPoints?.max || 40}</strong>
              <span className="hp-formula">
                (Body {currentNPC.stats?.body || 6} + Will {Math.floor((currentNPC.stats?.will || 6) / 2)}) × 5
              </span>
            </div>
          </div>

          <div className="skills-section">
            <h3>Key Skills</h3>
            <div className="skills-list">
              {availableSkills.slice(0, 10).map(skill => (
                <div key={skill._id} className="skill-input">
                  <label>{skill.name}:</label>
                  <input 
                    type="number" 
                    min="2" 
                    max="10" 
                    value={currentNPC.skills?.[skill._id] || 2}
                    onChange={(e) => updateSkill(skill._id, parseInt(e.target.value))}
                  />
                  <span className="skill-total">
                    Total: {getSkillTotal(skill, currentNPC.stats)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="builder-row">
          <div className="equipment-section">
            <h3>Equipment</h3>
            
            <div className="weapons-section">
              <h4>Weapons ({currentNPC.equipment?.weapons?.length || 0}/3)</h4>
              <div className="weapon-add">
                <select 
                  onChange={(e) => e.target.value && addWeapon(e.target.value)}
                  value=""
                >
                  <option value="">Add weapon...</option>
                  {availableWeapons.slice(0, 20).map(weapon => (
                    <option key={weapon._id} value={weapon._id}>
                      {weapon.name} ({weapon.system.damage} damage)
                    </option>
                  ))}
                </select>
              </div>
              <div className="weapons-list">
                {currentNPC.equipment?.weapons?.map((weapon, index) => (
                  <div key={weapon._id + index} className="weapon-item">
                    <span className="weapon-name">{weapon.name}</span>
                    <span className="weapon-damage">{weapon.system.damage}</span>
                    <span className="weapon-skill">{weapon.system.weaponSkill}</span>
                    <button 
                      onClick={() => removeWeapon(weapon._id)} 
                      className="remove-weapon-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="armor-section">
              <h4>Armor</h4>
              <select 
                value={currentNPC.equipment?.armor?._id || ''}
                onChange={(e) => selectArmor(e.target.value)}
              >
                <option value="">None</option>
                {availableArmor.slice(0, 15).map(armor => (
                  <option key={armor._id} value={armor._id}>
                    {armor.name} (H:{armor.system.headLocation.sp} B:{armor.system.bodyLocation.sp})
                  </option>
                ))}
              </select>
              {currentNPC.equipment?.armor && (
                <div className="armor-details">
                  <span>Head: {currentNPC.equipment.armor.system.headLocation.sp}</span>
                  <span>Body: {currentNPC.equipment.armor.system.bodyLocation.sp}</span>
                  <span>Penalty: -{currentNPC.equipment.armor.system.penalty || 0}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="builder-actions">
          <button onClick={saveNPC} disabled={!currentNPC.name} className="save-btn">
            Save NPC
          </button>
        </div>
      </div>

      <div className="npc-roster">
        <h2>Generated NPCs ({generatedNPCs.length})</h2>
        <div className="npc-list">
          {generatedNPCs.map(npc => (
            <div key={npc.id} className="npc-card">
              <div className="npc-header">
                <h4>{npc.name}</h4>
                <div className="npc-actions">
                  {onAddToEncounter && (
                    <button onClick={() => addToEncounter(npc)} className="add-encounter-btn">
                      Add to Encounter
                    </button>
                  )}
                  <button onClick={() => deleteNPC(npc.id)} className="delete-btn">×</button>
                </div>
              </div>
              <div className="npc-summary">
                <div className="npc-stats">
                  <span>Body: {npc.stats.body}</span>
                  <span>Ref: {npc.stats.ref}</span>
                  <span>Cool: {npc.stats.cool}</span>
                  <span>HP: {npc.hitPoints.current}/{npc.hitPoints.max}</span>
                  {npc.difficultyRating && <span className="difficulty">({npc.difficultyRating})</span>}
                </div>
                {npc.equipment.weapons && npc.equipment.weapons.length > 0 && (
                  <div className="npc-weapons">
                    <strong>Weapons:</strong>
                    {npc.equipment.weapons.map((weapon, index) => (
                      <span key={weapon._id + index} className="weapon-entry">
                        {weapon.name} ({weapon.system.damage})
                      </span>
                    ))}
                  </div>
                )}
                {npc.equipment.armor && (
                  <div className="npc-armor">
                    <strong>Armor:</strong>
                    <span>{npc.equipment.armor.name} (H:{npc.equipment.armor.system.headLocation.sp} B:{npc.equipment.armor.system.bodyLocation.sp})</span>
                  </div>
                )}
                <div className="npc-skills">
                  {Object.entries(npc.skills).slice(0, 3).map(([skillId, level]) => {
                    const skill = availableSkills.find(s => s._id === skillId);
                    if (!skill) return null;
                    const total = npc.stats[skill.system.stat] + level;
                    return (
                      <span key={skillId}>{skill.name}: {total}</span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
