const WEAPON_PRESETS = {
    standard: [
        { name: "Combat/Skills", damage: "1d10+12" },
        { name: "Very Heavy Pistol", damage: "4d6" },
        { name: "SMG", damage: "4d6" },
    ],
    heavy: [
        { name: "Combat/Skills", damage: "1d10+12" },
        { name: "Assault Rifle", damage: "5d6" },
        { name: "Shotgun", damage: "5d6" },
        { name: "Grenades", damage: "2d6+2" },
    ],
    melee: [
        { name: "Combat/Skills", damage: "1d10+12" },
        { name: "Sword", damage: "3d6" },
        { name: "Sledgehammer", damage: "4d6" },
    ],
    cyber: [
        { name: "Combat/Skills", damage: "1d10+12" },
        { name: "Mantis Blades", damage: "4d6" },
        { name: "Wolvers", damage: "3d6" },
        { name: "Big Knuckles", damage: "2d6" },
    ],
    sniper: [
        { name: "Combat/Skills", damage: "1d10+12" },
        { name: "Sniper Rifle", damage: "5d6" },
        { name: "Very Heavy Pistol", damage: "4d6" },
    ],
};

const COVER_TYPES = {
    "Bank Vault Door": { type: "Thick Steel", hp: 50, movable: false },
    "Bank Window Glass": { type: "Thick Bulletproof Glass", hp: 30, movable: false },
    "Bar": { type: "Thick Wood", hp: 20, movable: true },
    "Boulder": { type: "Thick Stone", hp: 40, movable: false },
    "Car Door": { type: "Thin Steel", hp: 25, movable: true },
    "Data Term": { type: "Thick Concrete", hp: 25, movable: false },
    "Engine Block": { type: "Thick Steel", hp: 50, movable: false },
    "Hydrant": { type: "Thick Steel", hp: 50, movable: false },
    "Metal Door": { type: "Thin Steel", hp: 20, movable: true },
    "Office Wall": { type: "Thick Plaster", hp: 15, movable: false },
    "Overturned Table": { type: "Thin Wood", hp: 5, movable: true },
    "Refrigerator": { type: "Thin Steel", hp: 25, movable: true },
    "Shipping Container": { type: "Thin Steel", hp: 25, movable: false },
    "Sofa": { type: "Thick Plaster", hp: 15, movable: true },
    "Tree": { type: "Thick Wood", hp: 20, movable: false },
    "Wooden Door": { type: "Thin Wood", hp: 5, movable: true },
    "Low Cover": { hp: 10 },
    "Medium Cover": { hp: 20 },
    "Heavy Cover": { hp: 30 },
    "Reinforced Cover": { hp: 50 },
    "Vehicle Door": { hp: 15 },
    "Vehicle Body": { hp: 25 },
    "Metal Crate": { hp: 20 },
    "Concrete Barrier": { hp: 40 }
};

const NPC_PRESETS = {
    "Max-Tac": {
        baseInitiative: 8,
        maxHealth: 60,
        bodyArmor: 13,
        headArmor: 12,
        shield: 0,
        weapons: [
            ...WEAPON_PRESETS.heavy,
            { name: "Mantis Blades", damage: "4d6" }
        ],
        namePrefixes: ["M-Officer", "M-Agent", "M-Specialist", "M-Lieutenant"],
        namePool: ["Smith", "Johnson", "Williams", "Rodriguez", "Chen", "Kowalski", "Petrov", "Martinez"]
    },
    "Edgerunners": {
        baseInitiative: 7,
        maxHealth: 40,
        bodyArmor: 10,
        headArmor: 7,
        shield: 0,
        weapons: [
            ...WEAPON_PRESETS.standard,
            { name: "Mantis Blades", damage: "4d6" }
        ],
        namePrefixes: ["E-Chrome", "E-Spike", "E-Ghost", "E-Viper", "E-Jester", "E-Demon"],
        namePool: ["Red", "Fox", "Wolf", "Blade", "Runner", "Shadow", "Night", "Fist"]
    },
    "Street Scum": {
        baseInitiative: 5,
        maxHealth: 30,
        bodyArmor: 8,
        headArmor: 2,
        shield: 0,
        weapons: [
            { name: "Combat/Skills", damage: "1d10+8" },
            { name: "Baseball Bat", damage: "2d6" },
            { name: "Very Heavy Pistol", damage: "4d6" }
        ],
        namePrefixes: ["S-Scav", "S-Thug", "S-Punk", "S-Gang"],
        namePool: ["Rat", "Dog", "Snake", "Knife", "Gun", "Fist", "Blade", "Head"]
    },
    "Turrets": {
        baseInitiative: 3,
        maxHealth: 35,
        bodyArmor: 12,
        headArmor: 12,
        shield: 0,
        weapons: [
            { name: "Heavy Machine Gun", damage: "5d6" },
            { name: "Microwaver", damage: "DV15" }
        ],
        namePrefixes: ["T-Arasaka", "T-Militech", "T-Kang-Tao", "T-Budget"],
        namePool: ["Defender", "Guardian", "Sentry", "Watcher", "Protector"]
    },
    "Boostergang Member": {
        base: 7,
        maxHealth: 25,
        bodyArmor: 7,
        headArmor: 7,
        weapons: [
            { name: "Poor Quality Assault Rifle", damage: "5d6" },
            { name: "Poor Quality Heavy Pistol", damage: "3d6" }
        ]
    },
    "Security Guard": {
        base: 6,
        maxHealth: 20,
        bodyArmor: 11,
        headArmor: 11,
        weapons: [
            { name: "Standard Quality SMG", damage: "2d6" },
            { name: "Standard Quality Medium Pistol", damage: "2d6" }
        ]
    },
    "Corporate Security": {
        base: 8,
        maxHealth: 30,
        bodyArmor: 12,
        headArmor: 12,
        weapons: [
            { name: "Standard Quality Assault Rifle", damage: "5d6" },
            { name: "Standard Quality Heavy Pistol", damage: "3d6" }
        ]
    },
    "Street Thug": {
        base: 5,
        maxHealth: 15,
        bodyArmor: 4,
        headArmor: 0,
        weapons: [
            { name: "Poor Quality Medium Pistol", damage: "2d6" },
            { name: "Knife", damage: "1d6" }
        ]
    },
    "Combat Netrunner": {
        base: 7,
        maxHealth: 22,
        bodyArmor: 11,
        headArmor: 11,
        interface: 6,
        weapons: [
            { name: "Very Heavy Pistol", damage: "4d6" },
            { name: "Neural Link Zapper", damage: "3d6 (vs. INT)" }
        ]
    },
    "Solo": {
        base: 10,
        maxHealth: 40,
        bodyArmor: 13,
        headArmor: 13,
        shield: 7,
        weapons: [
            { name: "Excellent Quality Assault Rifle", damage: "5d6" },
            { name: "Smart Pistol", damage: "3d6" },
            { name: "Combat Knife", damage: "1d6+2" }
        ]
    },
    "Turret": {
        base: 8,
        maxHealth: 30,
        bodyArmor: 13,
        headArmor: 13,
        weapons: [
            { name: "Mounted Machine Gun", damage: "5d6" }
        ]
    }
};

