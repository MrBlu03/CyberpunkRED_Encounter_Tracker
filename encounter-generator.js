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
		
        // Create base participant from NPC preset
        const participant = {
            name: generateNPCName(npcType, i + 1),
            base: npcBase.baseInitiative,
            maxHealth: npcBase.maxHealth,
            roll: 0,
            total: npcBase.baseInitiative,
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
        
        for (let i = 0; i < turretCount; i++) {
            const turret = {
                name: generateNPCName(turretType, i + 1),
                base: turretBase.baseInitiative,
                maxHealth: turretBase.maxHealth,
                roll: 0,
                total: turretBase.baseInitiative,
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
