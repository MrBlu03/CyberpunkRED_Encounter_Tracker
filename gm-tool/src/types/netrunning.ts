// Netrunning Types for Cyberpunk RED

export type ArchitectureDifficulty = 'basic' | 'standard' | 'uncommon' | 'advanced';

export type FloorType = 
  | 'file' 
  | 'password' 
  | 'control-node' 
  | 'black-ice' 
  | 'demon' 
  | 'empty';

export type BlackICEType = 
  | 'asp' 
  | 'hellhound' 
  | 'killer' 
  | 'liche' 
  | 'raven' 
  | 'sabertooth' 
  | 'scorpion' 
  | 'skunk' 
  | 'wisp' 
  | 'kraken' 
  | 'giant' 
  | 'dragon';

export type DemonType = 'imp' | 'efreet' | 'balron';

export interface BlackICEDefinition {
  type: BlackICEType;
  name: string;
  class: 'anti-personnel' | 'anti-program';
  perception: number;
  speed: number;
  attack: number;
  defense: number;
  rez: number;
  effect: string;
  cost: number;
  description: string;
  flavorText: string;
}

export interface DemonDefinition {
  type: DemonType;
  name: string;
  rez: number;
  interface: number;
  netActions: number;
  combatNumber: number;
  description: string;
  cost: number;
}

export interface FloorContent {
  id: string;
  type: FloorType;
  name: string;
  dv: number;
  description?: string;
  blackICE?: BlackICEDefinition;
  demon?: DemonDefinition;
  controlNodeType?: string;
  fileContent?: string;
  defeated?: boolean;
  accessed?: boolean;
}

export interface ArchitectureFloor {
  id: string;
  floorNumber: number;
  branch: 'main' | number;
  contents: FloorContent[];
}

export interface NETArchitecture {
  id: string;
  name: string;
  description: string;
  difficulty: ArchitectureDifficulty;
  totalFloors: number;
  floors: ArchitectureFloor[];
  createdAt: string;
}

export interface NetrunnerState {
  name: string;
  interface: number;
  currentFloor: string | null;
  rezzedPrograms: string[];
  hp: number;
  maxHp: number;
  inCombat: boolean;
  encounteredICE: string[];
}

export interface ActiveNetrun {
  architecture: NETArchitecture;
  netrunner: NetrunnerState;
  log: NetrunLogEntry[];
  startedAt: string;
}

export interface NetrunLogEntry {
  id: string;
  timestamp: string;
  floorNumber: number;
  action: string;
  result: string;
  success?: boolean;
}

// Difficulty settings
export const difficultySettings: Record<ArchitectureDifficulty, {
  passwordDV: number;
  fileDV: number;
  controlDV: number;
  name: string;
}> = {
  basic: { passwordDV: 6, fileDV: 6, controlDV: 6, name: 'Basic' },
  standard: { passwordDV: 8, fileDV: 8, controlDV: 8, name: 'Standard' },
  uncommon: { passwordDV: 10, fileDV: 10, controlDV: 10, name: 'Uncommon' },
  advanced: { passwordDV: 12, fileDV: 12, controlDV: 12, name: 'Advanced' }
};

// Black ICE definitions with full descriptions
export const blackICEDefinitions: Record<BlackICEType, BlackICEDefinition> = {
  asp: {
    type: 'asp',
    name: 'Asp',
    class: 'anti-personnel',
    perception: 4,
    speed: 6,
    attack: 2,
    defense: 2,
    rez: 15,
    effect: 'Destroys a single Program installed on the enemy Netrunner\'s Cyberdeck at random.',
    cost: 100,
    description: 'Anti-personnel Black ICE. A viper made of silver light that strikes at the Netrunner\'s programs.',
    flavorText: 'The Asp slithers through code, seeking programs to destroy.'
  },
  hellhound: {
    type: 'hellhound',
    name: 'Hellhound',
    class: 'anti-personnel',
    perception: 2,
    speed: 2,
    attack: 8,
    defense: 4,
    rez: 25,
    effect: 'Does 3d6 damage direct to enemy Netrunner\'s brain. Forcibly and unsafely Jacks Out the Netrunner.',
    cost: 1000,
    description: 'Anti-personnel Black ICE. A burning dog of fire and shadow that mauls the Netrunner\'s mind.',
    flavorText: 'The Hellhound\'s bite burns through neural pathways, forcing a dangerous disconnect.'
  },
  killer: {
    type: 'killer',
    name: 'Killer',
    class: 'anti-program',
    perception: 4,
    speed: 4,
    attack: 4,
    defense: 2,
    rez: 20,
    effect: 'Does 2d6 damage to a Rezzed Program\'s REZ. If REZ reduced to 0, Program is destroyed.',
    cost: 500,
    description: 'Anti-program Black ICE. A simple but effective program destroyer. Fast and relentless.',
    flavorText: 'The Killer hunts programs, shredding their code with brutal efficiency.'
  },
  liche: {
    type: 'liche',
    name: 'Liche',
    class: 'anti-personnel',
    perception: 6,
    speed: 4,
    attack: 6,
    defense: 4,
    rez: 30,
    effect: 'Does 2d6 damage direct to Netrunner\'s brain and lowers total NET Actions next Turn by 1 (min 2).',
    cost: 1000,
    description: 'Anti-personnel Black ICE. A skeletal figure that drains the Netrunner\'s mental stamina.',
    flavorText: 'The Liche\'s touch drains focus, leaving the Netrunner sluggish and vulnerable.'
  },
  raven: {
    type: 'raven',
    name: 'Raven',
    class: 'anti-program',
    perception: 4,
    speed: 6,
    attack: 4,
    defense: 2,
    rez: 20,
    effect: 'Does 3d6 damage to a Rezzed Program\'s REZ. If REZ reduced to 0, Program is destroyed.',
    cost: 500,
    description: 'Anti-program Black ICE. A black bird of code that pecks programs to pieces.',
    flavorText: 'The Raven\'s beak tears through program defenses with terrifying speed.'
  },
  sabertooth: {
    type: 'sabertooth',
    name: 'Sabertooth',
    class: 'anti-personnel',
    perception: 4,
    speed: 4,
    attack: 6,
    defense: 2,
    rez: 25,
    effect: 'Does 3d6 damage direct to Netrunner\'s brain.',
    cost: 1000,
    description: 'Anti-personnel Black ICE. A massive cat with glowing fangs that tears at the Netrunner\'s mind.',
    flavorText: 'The Sabertooth\'s fangs pierce deep, dealing devastating neural damage.'
  },
  scorpion: {
    type: 'scorpion',
    name: 'Scorpion',
    class: 'anti-personnel',
    perception: 6,
    speed: 2,
    attack: 4,
    defense: 4,
    rez: 25,
    effect: 'Enemy Netrunner cannot progress deeper or Jack Out safely for 1d6 Rounds.',
    cost: 500,
    description: 'Anti-personnel Black ICE. A mechanical scorpion that traps the Netrunner in the NET.',
    flavorText: 'The Scorpion\'s sting paralyzes the escape routes, trapping the Netrunner in its web.'
  },
  skunk: {
    type: 'skunk',
    name: 'Skunk',
    class: 'anti-personnel',
    perception: 4,
    speed: 4,
    attack: 2,
    defense: 2,
    rez: 15,
    effect: 'Does 1d6 damage direct to Netrunner\'s brain and lowers total NET Actions next Turn by 1 (min 2).',
    cost: 100,
    description: 'Anti-personnel Black ICE. A striped creature that sprays debilitating code.',
    flavorText: 'The Skunk\'s spray clouds the Netrunner\'s mind, slowing their reactions.'
  },
  wisp: {
    type: 'wisp',
    name: 'Wisp',
    class: 'anti-program',
    perception: 2,
    speed: 6,
    attack: 2,
    defense: 2,
    rez: 10,
    effect: 'Does 1d6 damage to a Rezzed Program\'s REZ. If REZ reduced to 0, Program is destroyed.',
    cost: 50,
    description: 'Anti-program Black ICE. A small ball of light that flits around destroying programs.',
    flavorText: 'The Wisp darts through the NET, burning out programs with its touch.'
  },
  kraken: {
    type: 'kraken',
    name: 'Kraken',
    class: 'anti-program',
    perception: 6,
    speed: 4,
    attack: 8,
    defense: 4,
    rez: 35,
    effect: 'Destroys all copies of a single Program type installed on enemy Netrunner\'s Cyberdeck.',
    cost: 5000,
    description: 'Anti-program Black ICE. A massive tentacled beast that crushes all copies of a program.',
    flavorText: 'The Kraken\'s tentacles wrap around every instance of a program, destroying them all.'
  },
  giant: {
    type: 'giant',
    name: 'Giant',
    class: 'anti-personnel',
    perception: 2,
    speed: 2,
    attack: 10,
    defense: 6,
    rez: 40,
    effect: 'Does 4d6 damage direct to Netrunner\'s brain. Forcibly and unsafely Jacks Out the Netrunner.',
    cost: 5000,
    description: 'Anti-personnel Black ICE. A towering figure of stone and lightning that smashes minds.',
    flavorText: 'The Giant\'s hammer blow to the brain forces an immediate, dangerous disconnect.'
  },
  dragon: {
    type: 'dragon',
    name: 'Dragon',
    class: 'anti-personnel',
    perception: 6,
    speed: 4,
    attack: 8,
    defense: 6,
    rez: 45,
    effect: 'Does 4d6 damage direct to Netrunner\'s brain and lowers total NET Actions next Turn by 2 (min 2).',
    cost: 10000,
    description: 'Anti-personnel Black ICE. The ultimate defense - a massive dragon of fire and code.',
    flavorText: 'The Dragon\'s breath burns minds and shatters focus. Only the best survive.'
  }
};

// Demon definitions
export const demonDefinitions: Record<DemonType, DemonDefinition> = {
  imp: {
    type: 'imp',
    name: 'Imp',
    rez: 15,
    interface: 3,
    netActions: 2,
    combatNumber: 14,
    description: 'Small orange sphere of light with red horns. Basic Demon for simple operations. Acts as a semi-autonomous controller for the Architecture.',
    cost: 1000
  },
  efreet: {
    type: 'efreet',
    name: 'Efreet',
    rez: 25,
    interface: 4,
    netActions: 3,
    combatNumber: 14,
    description: 'Tall, powerfully built figure in elegant evening clothes with a fez and dagger. More powerful Demon that can actively defend the Architecture.',
    cost: 5000
  },
  balron: {
    type: 'balron',
    name: 'Balron',
    rez: 30,
    interface: 7,
    netActions: 4,
    combatNumber: 14,
    description: 'Huge humanoid monster in futuristic black armor covered with hissing green glowing tentacles. The most powerful Demon type, capable of devastating counterattacks.',
    cost: 10000
  }
};

// Lobby table (first 2 floors)
export const lobbyTable = [
  { type: 'file' as const, name: 'File' },
  { type: 'password' as const, name: 'Password' },
  { type: 'password' as const, name: 'Password' },
  { type: 'black-ice' as const, iceType: 'skunk' as const },
  { type: 'black-ice' as const, iceType: 'wisp' as const },
  { type: 'black-ice' as const, iceType: 'killer' as const }
];

// Architecture body tables by difficulty
export const architectureBodyTables: Record<ArchitectureDifficulty, Array<{ type: FloorType; iceType?: BlackICEType; count?: number }>> = {
  basic: [
    { type: 'black-ice', iceType: 'hellhound' },
    { type: 'black-ice', iceType: 'sabertooth' },
    { type: 'black-ice', iceType: 'wisp' },
    { type: 'black-ice', iceType: 'raven' },
    { type: 'password' },
    { type: 'file' },
    { type: 'control-node' },
    { type: 'password' },
    { type: 'black-ice', iceType: 'skunk' },
    { type: 'black-ice', iceType: 'asp' },
    { type: 'black-ice', iceType: 'killer' },
    { type: 'black-ice', iceType: 'wisp', count: 3 }
  ],
  standard: [
    { type: 'black-ice', iceType: 'hellhound' },
    { type: 'black-ice', iceType: 'hellhound' },
    { type: 'black-ice', iceType: 'sabertooth' },
    { type: 'black-ice', iceType: 'raven', count: 2 },
    { type: 'black-ice', iceType: 'hellhound' },
    { type: 'black-ice', iceType: 'skunk', count: 2 },
    { type: 'black-ice', iceType: 'scorpion' },
    { type: 'black-ice', iceType: 'hellhound' },
    { type: 'password' },
    { type: 'file' },
    { type: 'control-node' },
    { type: 'password' },
    { type: 'black-ice', iceType: 'asp' },
    { type: 'black-ice', iceType: 'killer' },
    { type: 'black-ice', iceType: 'liche' },
    { type: 'black-ice', iceType: 'raven', count: 3 }
  ],
  uncommon: [
    { type: 'black-ice', iceType: 'hellhound', count: 2 },
    { type: 'black-ice', iceType: 'liche' },
    { type: 'black-ice', iceType: 'hellhound' },
    { type: 'black-ice', iceType: 'wisp', count: 3 },
    { type: 'black-ice', iceType: 'sabertooth' },
    { type: 'black-ice', iceType: 'hellhound' },
    { type: 'black-ice', iceType: 'liche' },
    { type: 'black-ice', iceType: 'hellhound' },
    { type: 'black-ice', iceType: 'kraken' },
    { type: 'file' },
    { type: 'control-node' },
    { type: 'password' },
    { type: 'file' },
    { type: 'black-ice', iceType: 'killer' },
    { type: 'black-ice', iceType: 'liche' },
    { type: 'black-ice', iceType: 'dragon' },
    { type: 'black-ice', iceType: 'asp', count: 2 }
  ],
  advanced: [
    { type: 'black-ice', iceType: 'hellhound', count: 3 },
    { type: 'black-ice', iceType: 'kraken' },
    { type: 'black-ice', iceType: 'hellhound' },
    { type: 'black-ice', iceType: 'sabertooth' },
    { type: 'black-ice', iceType: 'dragon' },
    { type: 'black-ice', iceType: 'giant' },
    { type: 'black-ice', iceType: 'asp', count: 2 },
    { type: 'black-ice', iceType: 'dragon' },
    { type: 'black-ice', iceType: 'killer', count: 2 },
    { type: 'black-ice', iceType: 'kraken' },
    { type: 'password' },
    { type: 'file' },
    { type: 'control-node' },
    { type: 'password' },
    { type: 'file' },
    { type: 'black-ice', iceType: 'dragon', count: 2 },
    { type: 'black-ice', iceType: 'liche' },
    { type: 'black-ice', iceType: 'raven', count: 3 }
  ]
};

// Control node types
export const controlNodeTypes = [
  'Security Cameras',
  'Automated Door Locks',
  'Automated Turret',
  'Sprinkler System',
  'Alarm System',
  'Elevator Controls',
  'Lighting Controls',
  'HVAC System',
  'Assembly Line',
  'Soda Machine',
  'Massage Chair',
  'Video Display Feed',
  'Intercom System',
  'Fire Suppression',
  'Perimeter Sensors'
];

// File contents examples
export const fileContentExamples = [
  'Employee Records',
  'Financial Data',
  'Security Codes',
  'Research Notes',
  'Email Archives',
  'Blueprint Files',
  'Shipment Schedules',
  'Client Database',
  'Surveillance Footage',
  'Project Specifications',
  'Password List',
  'Encrypted Messages',
  'Inventory Logs',
  'Access Logs',
  'Personal Diary'
];
