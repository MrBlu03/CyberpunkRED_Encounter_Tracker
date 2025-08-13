import React, { useState, useEffect } from 'react';

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

interface EncounterTemplate {
  id: string;
  name: string;
  enemyTypes: string[];
  difficulty: 'easy' | 'moderate' | 'hard' | 'very-hard';
  description: string;
  location: string[];
  groupSize: [number, number];
}

interface GeneratedEncounter {
  id: string;
  name: string;
  enemies: Array<{
    name: string;
    type: string;
    count: number;
    difficulty: string;
  }>;
  difficulty: string;
  location: string;
  description: string;
  tacticalNotes: string[];
}

const encounterTemplates: EncounterTemplate[] = [
  {
    id: 'gang-patrol',
    name: 'Gang Patrol',
    enemyTypes: ['Ganger', 'Gang Lieutenant'],
    difficulty: 'moderate',
    description: 'A patrol of local gang members protecting their territory',
    location: ['Street', 'Alley', 'Gang Territory', 'Combat Zone'],
    groupSize: [2, 5]
  },
  {
    id: 'corpo-security',
    name: 'Corporate Security',
    enemyTypes: ['Corpo Security', 'Security Chief'],
    difficulty: 'hard',
    description: 'Corporate security team investigating unauthorized activity',
    location: ['Corporate Plaza', 'Office Building', 'Corpo Facility'],
    groupSize: [2, 4]
  },
  {
    id: 'scavenger-squad',
    name: 'Scavenger Squad',
    enemyTypes: ['Scavenger', 'Scav Butcher'],
    difficulty: 'easy',
    description: 'Scavengers looking for easy targets to harvest cyberware from',
    location: ['Combat Zone', 'Abandoned Building', 'Junkyard'],
    groupSize: [3, 6]
  },
  {
    id: 'maelstrom-team',
    name: 'Maelstrom Cyberpunks',
    enemyTypes: ['Maelstrom Ganger', 'Maelstrom Cyber-warrior'],
    difficulty: 'hard',
    description: 'Heavily augmented Maelstrom gang members on a mission',
    location: ['Industrial Zone', 'Underground', 'Gang Territory'],
    groupSize: [2, 4]
  },
  {
    id: 'netwatch-agents',
    name: 'NetWatch Operation',
    enemyTypes: ['NetWatch Agent', 'NetWatch Tech'],
    difficulty: 'very-hard',
    description: 'NetWatch agents conducting a cyber-security operation',
    location: ['Corporate Plaza', 'Data Fortress', 'Tech Facility'],
    groupSize: [2, 3]
  },
  {
    id: 'street-punks',
    name: 'Street Punks',
    enemyTypes: ['Street Rat', 'Punk Leader'],
    difficulty: 'easy',
    description: 'Young street punks looking for trouble and easy score',
    location: ['Street', 'Market', 'Residential'],
    groupSize: [3, 7]
  },
  {
    id: 'solo-operative',
    name: 'Solo Operative',
    enemyTypes: ['Solo'],
    difficulty: 'very-hard',
    description: 'A professional solo on a contract mission',
    location: ['Any'],
    groupSize: [1, 1]
  },
  {
    id: 'ripper-doc-guards',
    name: 'Ripperdoc Security',
    enemyTypes: ['Bodyguard', 'Ripper Doc'],
    difficulty: 'moderate',
    description: 'Security team protecting an illegal ripperdoc operation',
    location: ['Clinic', 'Underground', 'Back Alley'],
    groupSize: [2, 4]
  }
];

const difficultyPresets = {
  easy: { name: 'Easy', statRange: [3, 6], skillRange: [2, 4], description: 'Weak opponents' },
  moderate: { name: 'Moderate', statRange: [4, 7], skillRange: [3, 6], description: 'Average opponents' },
  hard: { name: 'Hard', statRange: [6, 8], skillRange: [5, 8], description: 'Tough opponents' },
  'very-hard': { name: 'Very Hard', statRange: [7, 10], skillRange: [6, 10], description: 'Elite opponents' }
};

interface EncounterGeneratorProps {
  onAddToEncounter: (npcs: any[]) => void;
}

export default function EncounterGenerator({ onAddToEncounter }: EncounterGeneratorProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'moderate' | 'hard' | 'very-hard'>('moderate');
  const [selectedLocation, setSelectedLocation] = useState<string>('any');
  const [selectedEnemyType, setSelectedEnemyType] = useState<string>('any');
  const [generatedEncounters, setGeneratedEncounters] = useState<GeneratedEncounter[]>([]);
  const [availableWeapons, setAvailableWeapons] = useState<Weapon[]>([]);

  useEffect(() => {
    // Load weapons data
    fetch('/data/core.json')
      .then(response => response.json())
      .then(data => {
        try {
          // Filter weapons
          const weapons = data.filter((item: any) => 
            item.type === 'weapon' && 
            item.system?.damage && 
            item.name && 
            item.name !== 'Template'
          ).map((weapon: any) => ({
            _id: weapon._id,
            name: weapon.name,
            system: {
              damage: weapon.system.damage,
              weaponSkill: weapon.system.weaponSkill || 'Handgun',
              attackmod: weapon.system.attackmod || 0,
              concealable: weapon.system.concealable
            }
          }));
          
          console.log('EncounterGenerator loaded weapons:', weapons.length);
          setAvailableWeapons(weapons);
        } catch (error) {
          console.error('Error parsing weapon data:', error);
        }
      })
      .catch(error => console.error('Error loading weapons:', error));
  }, []);

  // Load saved encounters on component mount
  useEffect(() => {
    try {
      const savedEncounters = localStorage.getItem('cyberpunk-generated-encounters');
      if (savedEncounters) {
        const parsed = JSON.parse(savedEncounters);
        if (Array.isArray(parsed)) {
          setGeneratedEncounters(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading saved encounters:', error);
    }
  }, []);

  // Save encounters when they change
  useEffect(() => {
    try {
      localStorage.setItem('cyberpunk-generated-encounters', JSON.stringify(generatedEncounters));
    } catch (error) {
      console.error('Error saving encounters:', error);
    }
  }, [generatedEncounters]);

  const generateRandomEncounter = () => {
    // Filter templates based on difficulty and location
    let availableTemplates = encounterTemplates.filter(template => {
      const difficultyMatch = selectedDifficulty === template.difficulty;
      const locationMatch = selectedLocation === 'any' || template.location.includes(selectedLocation) || template.location.includes('Any');
      const enemyMatch = selectedEnemyType === 'any' || template.enemyTypes.some(type => 
        type.toLowerCase().includes(selectedEnemyType.toLowerCase())
      );
      
      return difficultyMatch && locationMatch && enemyMatch;
    });

    if (availableTemplates.length === 0) {
      availableTemplates = encounterTemplates; // Fallback to all templates
    }

    const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
    const groupSize = Math.floor(Math.random() * (template.groupSize[1] - template.groupSize[0] + 1)) + template.groupSize[0];
    
    const enemies = [];
    const mainEnemyType = template.enemyTypes[0];
    const leaderType = template.enemyTypes[1] || mainEnemyType;
    
    // Add main enemies
    const mainCount = Math.max(1, groupSize - 1);
    enemies.push({
      name: mainEnemyType,
      type: mainEnemyType,
      count: mainCount,
      difficulty: template.difficulty
    });
    
    // Add leader if group is large enough
    if (groupSize > 2 && template.enemyTypes.length > 1) {
      enemies.push({
        name: leaderType,
        type: leaderType,
        count: 1,
        difficulty: template.difficulty
      });
    }

    const location = selectedLocation === 'any' 
      ? template.location[Math.floor(Math.random() * template.location.length)]
      : selectedLocation;

    const tacticalNotes = generateTacticalNotes(template, location);

    const encounter: GeneratedEncounter = {
      id: Date.now().toString(),
      name: `${template.name} - ${location}`,
      enemies,
      difficulty: template.difficulty,
      location,
      description: template.description,
      tacticalNotes
    };

    setGeneratedEncounters(prev => [encounter, ...prev.slice(0, 4)]); // Keep last 5 encounters
  };

  const generateTacticalNotes = (template: EncounterTemplate, location: string): string[] => {
    const notes = [];
    
    // Location-based notes
    if (location === 'Street') {
      notes.push('Civilians may be present', 'Traffic provides cover and obstacles');
    } else if (location === 'Corporate Plaza') {
      notes.push('Security cameras everywhere', 'Well-lit area', 'Corp security backup possible');
    } else if (location === 'Combat Zone') {
      notes.push('Dangerous environment', 'Poor lighting', 'Potential environmental hazards');
    } else if (location === 'Underground') {
      notes.push('Limited escape routes', 'Echo effects', 'Potential for ambush');
    }

    // Template-based notes
    if (template.name.includes('Gang')) {
      notes.push('May call for backup', 'Know local area well');
    } else if (template.name.includes('Corporate')) {
      notes.push('Well-equipped', 'Professional training', 'Coordinated tactics');
    } else if (template.name.includes('Scavenger')) {
      notes.push('Prioritize valuable targets', 'May retreat if outmatched');
    }

    return notes;
  };

  const addEncounterToTracker = (encounter: GeneratedEncounter) => {
    // This would generate actual NPCs based on the encounter
    const npcs = [];
    
    for (const enemy of encounter.enemies) {
      for (let i = 0; i < enemy.count; i++) {
        const npc = {
          id: `${encounter.id}-${enemy.type}-${i}`,
          name: `${enemy.name} #${i + 1}`,
          type: enemy.type,
          difficulty: enemy.difficulty,
          // These would be properly generated based on difficulty
          stats: generateStatsForDifficulty(enemy.difficulty),
          hitPoints: { max: 40, current: 40 }, // Placeholder
          woundState: 'Not Wounded',
          equipment: { 
            weapons: assignWeapons(enemy.type, enemy.difficulty)
          }
        };
        npcs.push(npc);
      }
    }
    
    onAddToEncounter(npcs);
  };

  const assignWeapons = (enemyType: string, difficulty: string): Weapon[] => {
    if (availableWeapons.length === 0) return [];
    
    const weaponCount = Math.floor(Math.random() * 2) + 1; // 1-2 weapons
    const weapons: Weapon[] = [];
    
    // Define weapon preferences by enemy type
    let preferredWeapons: Weapon[] = [];
    
    if (enemyType.toLowerCase().includes('ganger') || enemyType.toLowerCase().includes('gang')) {
      // Gangers prefer handguns and melee weapons
      preferredWeapons = availableWeapons.filter(w => 
        w.system.weaponSkill?.toLowerCase().includes('handgun') ||
        w.system.weaponSkill?.toLowerCase().includes('melee') ||
        w.name.toLowerCase().includes('pistol') ||
        w.name.toLowerCase().includes('knife')
      );
    } else if (enemyType.toLowerCase().includes('corpo') || enemyType.toLowerCase().includes('security')) {
      // Corporate security prefers professional weapons
      preferredWeapons = availableWeapons.filter(w => 
        w.system.weaponSkill?.toLowerCase().includes('shoulder') ||
        w.system.weaponSkill?.toLowerCase().includes('handgun') ||
        w.name.toLowerCase().includes('assault') ||
        w.name.toLowerCase().includes('smg')
      );
    } else if (enemyType.toLowerCase().includes('scav')) {
      // Scavengers use makeshift and cheap weapons
      preferredWeapons = availableWeapons.filter(w => 
        w.name.toLowerCase().includes('knife') ||
        w.name.toLowerCase().includes('shotgun') ||
        w.name.toLowerCase().includes('pistol')
      );
    } else if (enemyType.toLowerCase().includes('solo')) {
      // Solos use high-quality weapons
      preferredWeapons = availableWeapons.filter(w => 
        w.system.weaponSkill?.toLowerCase().includes('shoulder') ||
        w.name.toLowerCase().includes('assault') ||
        w.name.toLowerCase().includes('sniper')
      );
    }
    
    // Fallback to random weapons if no preferences match
    if (preferredWeapons.length === 0) {
      preferredWeapons = availableWeapons;
    }
    
    // Select weapons
    const shuffledWeapons = [...preferredWeapons].sort(() => Math.random() - 0.5);
    for (let i = 0; i < weaponCount && i < shuffledWeapons.length; i++) {
      weapons.push(shuffledWeapons[i]);
    }
    
    return weapons;
  };

  const generateStatsForDifficulty = (difficulty: string) => {
    const preset = difficultyPresets[difficulty as keyof typeof difficultyPresets];
    const statRange = preset.statRange;
    
    return {
      int: Math.floor(Math.random() * (statRange[1] - statRange[0] + 1)) + statRange[0],
      ref: Math.floor(Math.random() * (statRange[1] - statRange[0] + 1)) + statRange[0],
      dex: Math.floor(Math.random() * (statRange[1] - statRange[0] + 1)) + statRange[0],
      tech: Math.floor(Math.random() * (statRange[1] - statRange[0] + 1)) + statRange[0],
      cool: Math.floor(Math.random() * (statRange[1] - statRange[0] + 1)) + statRange[0],
      will: Math.floor(Math.random() * (statRange[1] - statRange[0] + 1)) + statRange[0],
      luck: Math.floor(Math.random() * (statRange[1] - statRange[0] + 1)) + statRange[0],
      move: Math.floor(Math.random() * (statRange[1] - statRange[0] + 1)) + statRange[0],
      body: Math.floor(Math.random() * (statRange[1] - statRange[0] + 1)) + statRange[0],
      emp: Math.floor(Math.random() * (statRange[1] - statRange[0] + 1)) + statRange[0]
    };
  };

  return (
    <div className="encounter-generator">
      <div className="generator-controls">
        <h2>Random Encounter Generator</h2>
        
        <div className="control-row">
          <div className="control-group">
            <label>Difficulty:</label>
            <select 
              value={selectedDifficulty} 
              onChange={(e) => setSelectedDifficulty(e.target.value as any)}
            >
              {Object.entries(difficultyPresets).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.name} - {preset.description}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Location:</label>
            <select 
              value={selectedLocation} 
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="any">Any Location</option>
              <option value="Street">Street</option>
              <option value="Corporate Plaza">Corporate Plaza</option>
              <option value="Combat Zone">Combat Zone</option>
              <option value="Gang Territory">Gang Territory</option>
              <option value="Underground">Underground</option>
              <option value="Industrial Zone">Industrial Zone</option>
              <option value="Residential">Residential</option>
              <option value="Market">Market</option>
            </select>
          </div>

          <div className="control-group">
            <label>Enemy Type:</label>
            <select 
              value={selectedEnemyType} 
              onChange={(e) => setSelectedEnemyType(e.target.value)}
            >
              <option value="any">Any Enemy</option>
              <option value="gang">Gang Members</option>
              <option value="corpo">Corporate</option>
              <option value="scav">Scavengers</option>
              <option value="solo">Solo</option>
              <option value="netwatch">NetWatch</option>
              <option value="street">Street Punks</option>
            </select>
          </div>
        </div>

        <button onClick={generateRandomEncounter} className="generate-btn">
          Generate Random Encounter
        </button>
      </div>

      <div className="generated-encounters">
        <h3>Generated Encounters ({generatedEncounters.length})</h3>
        
        {generatedEncounters.map(encounter => (
          <div key={encounter.id} className="encounter-card">
            <div className="encounter-header">
              <h4>{encounter.name}</h4>
              <span className={`difficulty-badge ${encounter.difficulty}`}>
                {encounter.difficulty.toUpperCase()}
              </span>
            </div>
            
            <div className="encounter-details">
              <p><strong>Location:</strong> {encounter.location}</p>
              <p><strong>Description:</strong> {encounter.description}</p>
              
              <div className="encounter-enemies">
                <strong>Enemies:</strong>
                <ul>
                  {encounter.enemies.map((enemy, index) => (
                    <li key={index}>
                      {enemy.count}x {enemy.name} ({enemy.difficulty})
                    </li>
                  ))}
                </ul>
              </div>

              {encounter.tacticalNotes.length > 0 && (
                <div className="tactical-notes">
                  <strong>Tactical Notes:</strong>
                  <ul>
                    {encounter.tacticalNotes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="encounter-actions">
              <button 
                onClick={() => addEncounterToTracker(encounter)} 
                className="add-encounter-btn"
              >
                Add to Initiative Tracker
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
