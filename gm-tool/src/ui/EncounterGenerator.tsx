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

interface EncounterParameters {
  enemyCount: { min: number; max: number };
  difficulty: 'easy' | 'moderate' | 'hard' | 'very-hard';
  includeTurrets: boolean;
  turretCount: number;
  includeDrones: boolean;
  droneCount: number;
  enemyTypes: string[];
  location: string;
  specialRules: string[];
}

interface ManualParticipant {
  name: string;
  type: 'enemy' | 'turret' | 'drone' | 'saved-npc';
  count: number;
  difficulty: 'easy' | 'moderate' | 'hard' | 'very-hard';
  hp?: number;
  ref?: number;
  initiative?: number;
  savedNpcId?: string;
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
    savedNpcId?: string;
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

interface SavedNPC {
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

interface EncounterGeneratorProps {
  onAddToEncounter: (npcs: any[]) => void;
  onSaveEncounter?: (encounter: GeneratedEncounter) => void;
}

export default function EncounterGenerator({ onAddToEncounter, onSaveEncounter }: EncounterGeneratorProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'moderate' | 'hard' | 'very-hard'>('moderate');
  const [selectedLocation, setSelectedLocation] = useState<string>('any');
  const [selectedEnemyType, setSelectedEnemyType] = useState<string>('any');
  const [generatedEncounters, setGeneratedEncounters] = useState<GeneratedEncounter[]>([]);
  const [availableWeapons, setAvailableWeapons] = useState<Weapon[]>([]);
  const [availableArmor, setAvailableArmor] = useState<Armor[]>([]);
  const [savedNPCs, setSavedNPCs] = useState<SavedNPC[]>([]);
  
  // Enhanced encounter parameters
  const [encounterParams, setEncounterParams] = useState<EncounterParameters>({
    enemyCount: { min: 1, max: 6 },
    difficulty: 'moderate',
    includeTurrets: false,
    turretCount: 1,
    includeDrones: false,
    droneCount: 1,
    enemyTypes: [],
    location: 'any',
    specialRules: []
  });
  
  // Manual encounter creation
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualEncounter, setManualEncounter] = useState<ManualParticipant[]>([]);
  const [newParticipant, setNewParticipant] = useState<ManualParticipant>({
    name: '',
    type: 'enemy',
    count: 1,
    difficulty: 'moderate',
    savedNpcId: undefined
  });

  useEffect(() => {
    // Load weapons and armor data
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
          
          // Filter armor
          const armor = data.filter((item: any) => 
            item.type === 'armor' && 
            (item.system?.bodyLocation?.sp > 0 || item.system?.headLocation?.sp > 0)
          ).map((armor: any) => ({
            _id: armor._id,
            name: armor.name,
            system: {
              bodyLocation: armor.system.bodyLocation || { ablation: 0, sp: 0 },
              headLocation: armor.system.headLocation || { ablation: 0, sp: 0 },
              isBodyLocation: armor.system.isBodyLocation || false,
              isHeadLocation: armor.system.isHeadLocation || false,
              penalty: armor.system.penalty || 0,
              price: armor.system.price || { market: 100 },
              description: armor.system.description || { value: '' }
            }
          }));
          
          console.log('EncounterGenerator loaded weapons:', weapons.length);
          console.log('EncounterGenerator loaded armor:', armor.length);
          setAvailableWeapons(weapons);
          setAvailableArmor(armor);
        } catch (error) {
          console.error('Error parsing weapon/armor data:', error);
        }
      })
      .catch(error => console.error('Error loading weapons/armor:', error));
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

  // Load saved NPCs on component mount
  useEffect(() => {
    try {
      const savedNPCsData = localStorage.getItem('cyberpunk-generated-npcs');
      if (savedNPCsData) {
        const parsed = JSON.parse(savedNPCsData);
        if (Array.isArray(parsed)) {
          setSavedNPCs(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading saved NPCs:', error);
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
    
    // Use enhanced enemy count parameters
    const enemyCount = Math.floor(Math.random() * (encounterParams.enemyCount.max - encounterParams.enemyCount.min + 1)) + encounterParams.enemyCount.min;
    
    const enemies = [];
    const mainEnemyType = template.enemyTypes[0];
    const leaderType = template.enemyTypes[1] || mainEnemyType;
    
    // Add main enemies
    const mainCount = Math.max(1, enemyCount - 1);
    enemies.push({
      name: mainEnemyType,
      type: mainEnemyType,
      count: mainCount,
      difficulty: template.difficulty
    });
    
    // Add leader if group is large enough
    if (enemyCount > 2 && template.enemyTypes.length > 1) {
      enemies.push({
        name: leaderType,
        type: leaderType,
        count: 1,
        difficulty: template.difficulty
      });
    }
    
    // Add turrets if enabled
    if (encounterParams.includeTurrets && encounterParams.turretCount > 0) {
      enemies.push({
        name: 'Security Turret',
        type: 'turret',
        count: encounterParams.turretCount,
        difficulty: template.difficulty
      });
    }
    
    // Add drones if enabled
    if (encounterParams.includeDrones && encounterParams.droneCount > 0) {
      enemies.push({
        name: 'Combat Drone',
        type: 'drone',
        count: encounterParams.droneCount,
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

  const addManualParticipant = () => {
    if (newParticipant.type === 'saved-npc') {
      if (newParticipant.savedNpcId) {
        const savedNpc = savedNPCs.find(npc => npc.id === newParticipant.savedNpcId);
        if (savedNpc) {
          setManualEncounter(prev => [...prev, { 
            ...newParticipant, 
            name: savedNpc.name 
          }]);
        }
      } else {
        return; // Don't add if no saved NPC selected
      }
    } else if (newParticipant.name.trim()) {
      setManualEncounter(prev => [...prev, { ...newParticipant }]);
    } else {
      return; // Don't add if no name provided
    }
    
    setNewParticipant({
      name: '',
      type: 'enemy',
      count: 1,
      difficulty: 'moderate',
      savedNpcId: undefined
    });
  };

  const removeManualParticipant = (index: number) => {
    setManualEncounter(prev => prev.filter((_, i) => i !== index));
  };

  const createManualEncounter = () => {
    if (manualEncounter.length === 0) return;

    const enemies = manualEncounter.map(participant => ({
      name: participant.name,
      type: participant.type,
      count: participant.count,
      difficulty: participant.difficulty,
      savedNpcId: participant.savedNpcId
    }));

    const encounter: GeneratedEncounter = {
      id: Date.now().toString(),
      name: `Manual Encounter - ${selectedLocation}`,
      enemies,
      difficulty: selectedDifficulty,
      location: selectedLocation,
      description: 'Manually created encounter',
      tacticalNotes: []
    };

    setGeneratedEncounters(prev => [encounter, ...prev.slice(0, 4)]);
    setManualEncounter([]);
    setIsManualMode(false);
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
        let npc;
        
        if (enemy.type === 'saved-npc') {
          // Find the saved NPC by ID first, then fall back to name
          const savedNpc = enemy.savedNpcId 
            ? savedNPCs.find(s => s.id === enemy.savedNpcId)
            : savedNPCs.find(s => s.name === enemy.name);
          
          if (savedNpc) {
            npc = {
              ...savedNpc,
              id: `${encounter.id}-saved-${savedNpc.id}-${i}`,
              name: `${savedNpc.name} #${i + 1}`,
              hitPoints: { ...savedNpc.hitPoints }
            };
          }
        } else if (enemy.type === 'turret') {
          npc = {
            id: `${encounter.id}-${enemy.type}-${i}`,
            name: `${enemy.name} #${i + 1}`,
            type: enemy.type,
            difficulty: enemy.difficulty,
            stats: { ref: 8, dex: 8, int: 6, tech: 8, cool: 8, will: 6, luck: 6, move: 0, body: 10, emp: 0 },
            hitPoints: { max: 50, current: 50 },
            woundState: 'Not Wounded',
            equipment: { 
              weapons: [{ 
                _id: 'turret-gun', 
                name: 'Mounted Gun', 
                system: { 
                  damage: '4d6', 
                  weaponSkill: 'AutoFire', 
                  attackmod: 2,
                  concealable: { concealable: false }
                }
              }]
            }
          };
        } else if (enemy.type === 'drone') {
          npc = {
            id: `${encounter.id}-${enemy.type}-${i}`,
            name: `${enemy.name} #${i + 1}`,
            type: enemy.type,
            difficulty: enemy.difficulty,
            stats: { ref: 10, dex: 10, int: 8, tech: 6, cool: 8, will: 6, luck: 6, move: 12, body: 6, emp: 0 },
            hitPoints: { max: 30, current: 30 },
            woundState: 'Not Wounded',
            equipment: { 
              weapons: [{ 
                _id: 'drone-weapon', 
                name: 'Drone Weapon', 
                system: { 
                  damage: '2d6+2', 
                  weaponSkill: 'Handgun', 
                  attackmod: 1,
                  concealable: { concealable: false }
                }
              }]
            }
          };
        } else {
          // Regular enemy
          const assignedArmor = assignArmor(enemy.type, enemy.difficulty);
          npc = {
            id: `${encounter.id}-${enemy.type}-${i}`,
            name: `${enemy.name} #${i + 1}`,
            type: enemy.type,
            difficulty: enemy.difficulty,
            stats: generateStatsForDifficulty(enemy.difficulty),
            hitPoints: { max: 40, current: 40 },
            woundState: 'Not Wounded',
            equipment: { 
              weapons: assignWeapons(enemy.type, enemy.difficulty),
              armor: assignedArmor
            }
          };
        }
        
        npcs.push(npc);
      }
    }
    
    onAddToEncounter(npcs);
  };

  const removeEncounter = (encounterId: string) => {
    if (confirm('Are you sure you want to remove this encounter?')) {
      setGeneratedEncounters(prev => prev.filter(encounter => encounter.id !== encounterId));
    }
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

  const assignArmor = (enemyType: string, difficulty: string): Armor | undefined => {
    if (availableArmor.length === 0) return undefined;
    
    // Determine armor chance based on difficulty and enemy type
    let armorChance = 0;
    if (difficulty === 'easy') armorChance = 0.3;
    else if (difficulty === 'moderate') armorChance = 0.5;
    else if (difficulty === 'hard') armorChance = 0.7;
    else if (difficulty === 'very-hard') armorChance = 0.8;
    
    // Adjust based on enemy type
    if (enemyType.toLowerCase().includes('corpo') || enemyType.toLowerCase().includes('security')) {
      armorChance += 0.2; // Corporate security more likely to have armor
    } else if (enemyType.toLowerCase().includes('scav')) {
      armorChance -= 0.2; // Scavengers less likely to have good armor
    }
    
    // Roll for armor
    if (Math.random() > armorChance) return undefined;
    
    // Select appropriate armor based on enemy type and difficulty
    let preferredArmor: Armor[] = [];
    
    if (difficulty === 'easy') {
      // Basic armor, lower SP
      preferredArmor = availableArmor.filter(a => 
        (a.system.bodyLocation.sp <= 11 && a.system.bodyLocation.sp > 0) ||
        (a.system.headLocation.sp <= 11 && a.system.headLocation.sp > 0)
      );
    } else if (difficulty === 'moderate') {
      // Medium armor
      preferredArmor = availableArmor.filter(a => 
        (a.system.bodyLocation.sp <= 15 && a.system.bodyLocation.sp > 0) ||
        (a.system.headLocation.sp <= 15 && a.system.headLocation.sp > 0)
      );
    } else {
      // High-end armor for hard/very-hard
      preferredArmor = availableArmor.filter(a => 
        a.system.bodyLocation.sp > 0 || a.system.headLocation.sp > 0
      );
    }
    
    if (preferredArmor.length === 0) {
      preferredArmor = availableArmor; // Fallback to any armor
    }
    
    return preferredArmor[Math.floor(Math.random() * preferredArmor.length)];
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
        <h2>Encounter Generator</h2>
        
        <div className="generator-mode">
          <label>
            <input
              type="radio"
              name="generatorMode"
              checked={!isManualMode}
              onChange={() => setIsManualMode(false)}
            />
            Random Generation
          </label>
          <label>
            <input
              type="radio"
              name="generatorMode"
              checked={isManualMode}
              onChange={() => setIsManualMode(true)}
            />
            Manual Creation
          </label>
        </div>

        {!isManualMode ? (
          <div className="random-generation">
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

            <div className="encounter-params">
              <h3>Encounter Parameters</h3>
              
              <div className="param-row">
                <div className="param-group">
                  <label>Enemy Count:</label>
                  <div className="number-range">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={encounterParams.enemyCount.min}
                      onChange={(e) => setEncounterParams(prev => ({
                        ...prev,
                        enemyCount: { ...prev.enemyCount, min: parseInt(e.target.value) || 1 }
                      }))}
                    />
                    <span>to</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={encounterParams.enemyCount.max}
                      onChange={(e) => setEncounterParams(prev => ({
                        ...prev,
                        enemyCount: { ...prev.enemyCount, max: parseInt(e.target.value) || 6 }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div className="param-row">
                <div className="param-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={encounterParams.includeTurrets}
                      onChange={(e) => setEncounterParams(prev => ({
                        ...prev,
                        includeTurrets: e.target.checked
                      }))}
                    />
                    Include Turrets
                  </label>
                  {encounterParams.includeTurrets && (
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={encounterParams.turretCount}
                      onChange={(e) => setEncounterParams(prev => ({
                        ...prev,
                        turretCount: parseInt(e.target.value) || 1
                      }))}
                    />
                  )}
                </div>

                <div className="param-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={encounterParams.includeDrones}
                      onChange={(e) => setEncounterParams(prev => ({
                        ...prev,
                        includeDrones: e.target.checked
                      }))}
                    />
                    Include Drones
                  </label>
                  {encounterParams.includeDrones && (
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={encounterParams.droneCount}
                      onChange={(e) => setEncounterParams(prev => ({
                        ...prev,
                        droneCount: parseInt(e.target.value) || 1
                      }))}
                    />
                  )}
                </div>
              </div>
            </div>

            <button onClick={generateRandomEncounter} className="generate-btn">
              Generate Random Encounter
            </button>
          </div>
        ) : (
          <div className="manual-encounter">
            <h3>Manual Encounter Creation</h3>
            
            <div className="manual-participant-form">
              <div className="form-row">
                {newParticipant.type !== 'saved-npc' && (
                  <input
                    type="text"
                    placeholder="Participant Name"
                    value={newParticipant.name}
                    onChange={(e) => setNewParticipant(prev => ({ ...prev, name: e.target.value }))}
                  />
                )}
                
                <select
                  value={newParticipant.type}
                  onChange={(e) => setNewParticipant(prev => ({ ...prev, type: e.target.value as any, savedNpcId: undefined }))}
                >
                  <option value="enemy">Enemy</option>
                  <option value="turret">Turret</option>
                  <option value="drone">Drone</option>
                  <option value="saved-npc">Saved NPC</option>
                </select>
                
                {newParticipant.type === 'saved-npc' && (
                  <select
                    value={newParticipant.savedNpcId || ''}
                    onChange={(e) => setNewParticipant(prev => ({ ...prev, savedNpcId: e.target.value }))}
                  >
                    <option value="">Select Saved NPC...</option>
                    {savedNPCs.map(npc => (
                      <option key={npc.id} value={npc.id}>
                        {npc.name} ({npc.difficultyRating || 'Unknown'})
                      </option>
                    ))}
                  </select>
                )}
                
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newParticipant.count}
                  onChange={(e) => setNewParticipant(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                />
                
                <select
                  value={newParticipant.difficulty}
                  onChange={(e) => setNewParticipant(prev => ({ ...prev, difficulty: e.target.value as any }))}
                >
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="hard">Hard</option>
                  <option value="very-hard">Very Hard</option>
                </select>
                
                <button onClick={addManualParticipant} className="add-participant-btn">
                  Add
                </button>
              </div>
            </div>

            {manualEncounter.length > 0 && (
              <div className="manual-participants">
                <h4>Encounter Participants:</h4>
                {manualEncounter.map((participant, index) => (
                  <div key={index} className="participant-item">
                    <span>{participant.count}x {participant.name} ({participant.type}, {participant.difficulty})</span>
                    <button onClick={() => removeManualParticipant(index)} className="remove-btn">
                      Remove
                    </button>
                  </div>
                ))}
                
                <button onClick={createManualEncounter} className="create-encounter-btn">
                  Create Encounter
                </button>
              </div>
            )}
          </div>
        )}
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
                      {enemy.type === 'turret' && <span className="enemy-type"> [TURRET]</span>}
                      {enemy.type === 'drone' && <span className="enemy-type"> [DRONE]</span>}
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
              {onSaveEncounter && (
                <button 
                  onClick={() => onSaveEncounter(encounter)} 
                  className="save-encounter-btn"
                  title="Save this encounter as template"
                >
                  Save as Template
                </button>
              )}
              <button 
                onClick={() => removeEncounter(encounter.id)} 
                className="remove-encounter-btn"
                title="Remove this encounter"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
