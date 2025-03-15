const DIFFICULTY_PRESETS = {
    easy: {
        npcTypes: ["Street Scum"],
        maxLevel: 1,
        weaponSets: ["standard"]
    },
    medium: {
        npcTypes: ["Street Scum", "Edgerunners"],
        maxLevel: 2,
        weaponSets: ["standard", "melee", "heavy"]
    },
    hard: {
        npcTypes: ["Edgerunners", "Max-Tac"],
        maxLevel: 3,
        weaponSets: ["heavy", "cyber", "sniper"]
    }
};

const LEVEL_SCALING = {
    "Street Scum": {
        1: 9,
        2: 10,
        3: 11
    },
    "Edgerunners": {
        1: 12,
        2: 13,
        3: 14
    },
    "Max-Tac": {
        1: 14,
        2: 15,
        3: 16
    },
    "Turrets": {
        1: 10,
        2: 11,
        3: 12
    }
};

// Add event listener for turret checkbox
document.addEventListener('DOMContentLoaded', function() {
    const turretCheckbox = document.getElementById('include-turrets');
    const turretCount = document.getElementById('turret-count');
    
    turretCheckbox.addEventListener('change', function() {
        turretCount.disabled = !this.checked;
        if (!this.checked) turretCount.value = 0;
    });
});

// Encounter Generator for Cyberpunk RED
// This provides procedurally generated encounters based on difficulty

// Encounter templates
const ENCOUNTER_TEMPLATES = {
    easy: [
        {
            name: "Street Scum Ambush",
            enemyType: "Street Scum",
            enemyCount: { min: 2, max: 4 },
            include_turrets: false
        },
        {
            name: "Gang Territory Patrol",
            enemyType: "Street Scum",
            enemyCount: { min: 2, max: 5 },
            include_turrets: false
        }
    ],
    medium: [
        {
            name: "Corporate Security Detail",
            enemyType: "Edgerunners",
            enemyCount: { min: 3, max: 6 },
            include_turrets: false
        },
        {
            name: "Gang Showdown",
            enemyType: "Street Scum",
            enemyCount: { min: 4, max: 8 },
            include_turrets: false
        },
        {
            name: "Security Checkpoint",
            enemyType: "Edgerunners",
            enemyCount: { min: 2, max: 4 },
            include_turrets: true,
            turret_count: { min: 1, max: 2 }
        }
    ],
    hard: [
        {
            name: "Corporate Strike Team",
            enemyType: "Edgerunners",
            enemyCount: { min: 4, max: 6 },
            include_turrets: true,
            turret_count: { min: 1, max: 3 }
        },
        {
            name: "Max-Tac Raid",
            enemyType: "Max-Tac",
            enemyCount: { min: 2, max: 4 },
            include_turrets: false
        },
        {
            name: "Security Lockdown",
            enemyType: "Edgerunners",
            enemyCount: { min: 3, max: 5 },
            include_turrets: true,
            turret_count: { min: 2, max: 4 }
        }
    ]
};

// Cyberpunk-themed location names for encounters
const LOCATION_NAMES = [
    "Abandoned Mallplex",
    "Night City Subway",
    "Corpo Plaza",
    "Combat Zone Alley",
    "Watson District",
    "Japantown Market",
    "Pacifica Ruins",
    "Arasaka Tower",
    "Militech R&D Lab",
    "Afterlife Club",
    "Kabuki Market",
    "Charter Hill Penthouse",
    "Biotechnica Farms",
    "City Center Plaza",
    "The Badlands Outpost",
    "Orbital Air Spaceport",
    "Megabuilding H10",
    "Trauma Team Landing Zone",
    "Underground Ripperdoc Clinic",
    "Petrochem Refinery"
];

// Generate a random encounter based on difficulty
function generateRandomEncounter(difficulty, enemyCount) {
    const preset = DIFFICULTY_PRESETS[difficulty];
    if (!preset) return null;

    const includeTurrets = document.getElementById('include-turrets').checked;
    const turretCount = parseInt(document.getElementById('turret-count').value) || 0;

    const encounter = {
        name: generateEncounterName(difficulty, includeTurrets),
        participants: []
    };

    // Generate regular enemies
    for (let i = 0; i < enemyCount; i++) {
        // Select random NPC type from allowed types for this difficulty
        const npcType = preset.npcTypes[Math.floor(Math.random() * preset.npcTypes.length)];
        const npcBase = NPC_PRESETS[npcType];

        // Determine level scaling for this NPC
		const level = Math.floor(Math.random() * preset.maxLevel) + 1;
        const combatSkill = `1d10+${LEVEL_SCALING[npcType][level]}`;
        
        // Get the correct initiative value, checking both possible property names
        const baseInitiative = npcBase.base !== undefined ? npcBase.base : npcBase.baseInitiative;
		
        // Create base participant from NPC preset
        const participant = {
            name: generateNPCName(npcType, i + 1),
            base: baseInitiative,
            maxHealth: npcBase.maxHealth,
            roll: 0,
            total: baseInitiative,
            health: npcBase.maxHealth,
            hasRolled: false,
            bodyArmor: npcBase.bodyArmor,
            headArmor: npcBase.headArmor,
            shield: npcBase.shield,
            shieldActive: false,
            weapons: generateWeaponLoadout(preset.weaponSets, combatSkill),
            criticalInjuries: []
        };

        encounter.participants.push(participant);
    }

    // Generate turrets if enabled
    if (includeTurrets && turretCount > 0) {
        const turretType = "Turrets";
        const turretBase = NPC_PRESETS[turretType];
		
		// Determine level scaling for this NPC
		const level = Math.floor(Math.random() * preset.maxLevel) + 1;
        const combatSkill = `1d10+${LEVEL_SCALING[turretType][level]}`;
        
        // Get the correct initiative value for turrets
        const turretInitiative = turretBase.base !== undefined ? turretBase.base : turretBase.baseInitiative;
        
        for (let i = 0; i < turretCount; i++) {
            const turret = {
                name: generateNPCName(turretType, i + 1),
                base: turretInitiative,
                maxHealth: turretBase.maxHealth,
                roll: 0,
                total: turretInitiative,
                health: turretBase.maxHealth,
                hasRolled: false,
                bodyArmor: turretBase.bodyArmor,
                headArmor: turretBase.headArmor,
                shield: turretBase.shield,
                shieldActive: false,
                weapons: generateWeaponLoadout(preset.weaponSets, combatSkill),
                criticalInjuries: []
            };
            
            encounter.participants.push(turret);
        }
    }

    return encounter;
}

function generateNPCName(type, index) {
    const preset = NPC_PRESETS[type];
    const prefix = preset.namePrefixes[Math.floor(Math.random() * preset.namePrefixes.length)];
    const suffix = preset.namePool[Math.floor(Math.random() * preset.namePool.length)];
    return `${prefix}-${suffix} ${index}`;
}

function generateEncounterName(difficulty, hasTurrets) {
    const locations = ["Alley", "Warehouse", "Mall", "Subway", "Rooftop", "Market", "Corporate Plaza", "Nightclub"];
    const types = ["Ambush", "Standoff", "Firefight", "Showdown", "Operation", "Hit"];
    
    const location = locations[Math.floor(Math.random() * locations.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const turretSuffix = hasTurrets ? ' with Turrets' : '';
    
    return `${location} ${type}${turretSuffix} (${difficulty})`;
}

function generateWeaponLoadout(allowedSets, combatSkill) {
    const weapons = [];
    
    // Always include combat skills
    weapons.push({ name: "Combat/Skills", damage: combatSkill });
    
    // Add 2-3 random weapons from allowed sets
    const weaponCount = 2 + Math.floor(Math.random() * 2);
    const availableWeapons = allowedSets.flatMap(set => WEAPON_PRESETS[set]);
    
    for (let i = 0; i < weaponCount; i++) {
        const weapon = availableWeapons[Math.floor(Math.random() * availableWeapons.length)];
        if (!weapons.some(w => w.name === weapon.name)) {
            weapons.push(weapon);
        }
    }
    
    // 25% chance to add Mantis Blades for medium/hard encounters
    if (allowedSets.includes("cyber") && Math.random() < 0.25) {
        weapons.push({ name: "Mantis Blades", damage: "4d6" });
    }
    
    return weapons;
}


