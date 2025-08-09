// Difficulty presets now refer to archetype tags instead of hardcoded types
const DIFFICULTY_PRESETS = {
    easy: { tags: ["gang"], maxLevel: 1 },
    medium: { tags: ["edgerunner", "gang"], maxLevel: 2 },
    hard: { tags: ["elite", "edgerunner"], maxLevel: 3 }
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
async function generateRandomEncounter(difficulty, enemyCount) {
    const preset = DIFFICULTY_PRESETS[difficulty];
    if (!preset) return null;

    const includeTurrets = document.getElementById('include-turrets').checked;
    const turretCount = parseInt(document.getElementById('turret-count').value) || 0;

    const encounter = {
        name: generateEncounterName(difficulty, includeTurrets),
        participants: []
    };

    // Load catalog archetypes
    const catalog = await Catalog.loadCatalog();
    const allArchetypes = CatalogAdapters.getArchetypesFromCatalog(catalog);
    const archetypes = allArchetypes.filter(a => a.tags.some(t => preset.tags.includes(t)));

    // Generate regular enemies
    for (let i = 0; i < enemyCount; i++) {
        // Select random archetype
        const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];

        // Determine level scaling (retained for backward compatibility; can evolve later)
		const level = Math.floor(Math.random() * preset.maxLevel) + 1;
        const participant = CatalogAdapters.generateNPCFromArchetype(catalog, archetype, i + 1);
        // Add dynamic "Combat/Skills" entry for readability
        participant.weapons = [{ name: 'Combat/Skills', damage: `1d10+${LEVEL_SCALING[archetype.name]?.[level] || 10}` }, ...participant.weapons];
        encounter.participants.push(participant);
    }

    // Generate turrets if enabled
    if (includeTurrets && turretCount > 0) {
        // If you have a turret archetype, filter by tags e.g., ["turret"]
        const turretArchetypes = allArchetypes.filter(a => a.tags.includes('turret'));
        for (let i = 0; i < turretCount; i++) {
            const archetype = turretArchetypes[0] || archetypes[0];
            const participant = CatalogAdapters.generateNPCFromArchetype(catalog, archetype, i + 1);
            participant.name = `Turret ${i + 1}`;
            encounter.participants.push(participant);
        }
    }

    return encounter;
}

function generateNPCName(type, index) {
    return `${type} ${index}`;
}

function generateEncounterName(difficulty, hasTurrets) {
    const locations = ["Alley", "Warehouse", "Mall", "Subway", "Rooftop", "Market", "Corporate Plaza", "Nightclub"];
    const types = ["Ambush", "Standoff", "Firefight", "Showdown", "Operation", "Hit"];
    
    const location = locations[Math.floor(Math.random() * locations.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const turretSuffix = hasTurrets ? ' with Turrets' : '';
    
    return `${location} ${type}${turretSuffix} (${difficulty})`;
}

// Legacy no-op retained for compatibility with existing calls in UI templates
function generateWeaponLoadout() { return []; }


