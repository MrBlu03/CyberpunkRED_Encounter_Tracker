// Cyberpunk RED Cyberware System (RAW compliant)

export type CyberwareCategory = 
  | 'neuralware' 
  | 'cyberoptics'
  | 'cyberaudio'
  | 'internal-body-cyberware'
  | 'external-body-cyberware'
  | 'cyberlimbs'
  | 'borgware'
  | 'fashionware';

export type InstallSource = 'mall' | 'clinic' | 'hospital';

export interface CyberwareSlot {
  category: CyberwareCategory;
  used: number;
  maximum: number;
}

export interface Cyberware {
  id: string;
  name: string;
  category: CyberwareCategory;
  slots: number;
  hlCost: number;
  price: number;
  description: string;
  foundational?: boolean; // Required for other cyberware
  requires?: string[]; // IDs of required foundational cyberware
  installSource: InstallSource;
  installTime: string; // "1 hour", "1 day", etc.
  quality: 'poor' | 'standard' | 'excellent';
  installed: boolean;
  installDate?: Date;
}

export interface CyberwareLoadout {
  items: Cyberware[];
  totalHL: number;
  slots: Record<CyberwareCategory, CyberwareSlot>;
}

// RAW slot limits per category
export const CYBERWARE_SLOT_LIMITS: Record<CyberwareCategory, number> = {
  neuralware: 10,
  cyberoptics: 3,
  cyberaudio: 3,
  'internal-body-cyberware': 10,
  'external-body-cyberware': 7,
  cyberlimbs: 4,
  borgware: 40, // For full borgs
  fashionware: 7
};

// Install times by source
export const INSTALL_TIMES: Record<InstallSource, Record<string, string>> = {
  mall: {
    basic: '1 hour',
    complex: '2 hours'
  },
  clinic: {
    basic: '30 minutes',
    complex: '1 hour',
    major: '2 hours'
  },
  hospital: {
    basic: '15 minutes',
    complex: '30 minutes',
    major: '1 hour',
    extreme: '2 hours'
  }
};

export function createCyberwareLoadout(): CyberwareLoadout {
  const slots: Record<CyberwareCategory, CyberwareSlot> = {} as any;
  
  Object.entries(CYBERWARE_SLOT_LIMITS).forEach(([category, maximum]) => {
    slots[category as CyberwareCategory] = {
      category: category as CyberwareCategory,
      used: 0,
      maximum
    };
  });

  return {
    items: [],
    totalHL: 0,
    slots
  };
}

export function canInstallCyberware(
  cyberware: Cyberware, 
  loadout: CyberwareLoadout
): { canInstall: boolean; reason?: string } {
  // Check slot availability
  const categorySlot = loadout.slots[cyberware.category];
  if (categorySlot.used + cyberware.slots > categorySlot.maximum) {
    return {
      canInstall: false,
      reason: `Not enough ${cyberware.category} slots (need ${cyberware.slots}, have ${categorySlot.maximum - categorySlot.used})`
    };
  }

  // Check foundational requirements
  if (cyberware.requires && cyberware.requires.length > 0) {
    const missingRequirements = cyberware.requires.filter(reqId => 
      !loadout.items.some(item => item.id === reqId && item.installed)
    );
    
    if (missingRequirements.length > 0) {
      return {
        canInstall: false,
        reason: `Missing required foundational cyberware: ${missingRequirements.join(', ')}`
      };
    }
  }

  return { canInstall: true };
}

export function installCyberware(
  cyberware: Cyberware,
  loadout: CyberwareLoadout
): CyberwareLoadout {
  const validation = canInstallCyberware(cyberware, loadout);
  if (!validation.canInstall) {
    throw new Error(validation.reason);
  }

  const installedCyberware = {
    ...cyberware,
    installed: true,
    installDate: new Date()
  };

  const updatedSlots = { ...loadout.slots };
  updatedSlots[cyberware.category] = {
    ...updatedSlots[cyberware.category],
    used: updatedSlots[cyberware.category].used + cyberware.slots
  };

  return {
    items: [...loadout.items, installedCyberware],
    totalHL: loadout.totalHL + cyberware.hlCost,
    slots: updatedSlots
  };
}

export function removeCyberware(
  cyberwareId: string,
  loadout: CyberwareLoadout
): CyberwareLoadout {
  const cyberware = loadout.items.find(item => item.id === cyberwareId);
  if (!cyberware) {
    throw new Error('Cyberware not found');
  }

  // Check if other cyberware depends on this one
  const dependents = loadout.items.filter(item => 
    item.requires?.includes(cyberwareId) && item.installed
  );
  
  if (dependents.length > 0) {
    throw new Error(`Cannot remove: Other cyberware depends on this (${dependents.map(d => d.name).join(', ')})`);
  }

  const updatedSlots = { ...loadout.slots };
  updatedSlots[cyberware.category] = {
    ...updatedSlots[cyberware.category],
    used: updatedSlots[cyberware.category].used - cyberware.slots
  };

  return {
    items: loadout.items.filter(item => item.id !== cyberwareId),
    totalHL: loadout.totalHL - cyberware.hlCost,
    slots: updatedSlots
  };
}

// Standard foundational cyberware
export const FOUNDATIONAL_CYBERWARE = {
  neuralProcessor: {
    name: 'Neural Processor',
    category: 'neuralware' as CyberwareCategory,
    slots: 1,
    hlCost: 0,
    foundational: true,
    description: 'Basic neural interface required for most neuralware'
  },
  cyberOptics: {
    name: 'Cybernetic Eyes',
    category: 'cyberoptics' as CyberwareCategory,
    slots: 2,
    hlCost: 2,
    foundational: true,
    description: 'Replacement eyes with optical enhancement capability'
  },
  cyberAudio: {
    name: 'Cybernetic Ears',
    category: 'cyberaudio' as CyberwareCategory,
    slots: 2,
    hlCost: 2,
    foundational: true,
    description: 'Replacement ears with audio enhancement capability'
  }
} as const;

export function getInstallCostAndTime(
  cyberware: Cyberware,
  source: InstallSource
): { cost: number; time: string } {
  const baseCost = cyberware.price;
  let installCost = 0;
  let time = '';

  switch (source) {
    case 'mall':
      installCost = Math.floor(baseCost * 0.1); // 10% of cyberware cost
      time = cyberware.slots <= 2 ? INSTALL_TIMES.mall.basic : INSTALL_TIMES.mall.complex;
      break;
    case 'clinic':
      installCost = Math.floor(baseCost * 0.2); // 20% of cyberware cost
      time = cyberware.slots <= 2 ? INSTALL_TIMES.clinic.basic : 
             cyberware.slots <= 4 ? INSTALL_TIMES.clinic.complex : INSTALL_TIMES.clinic.major;
      break;
    case 'hospital':
      installCost = Math.floor(baseCost * 0.5); // 50% of cyberware cost
      time = cyberware.slots <= 2 ? INSTALL_TIMES.hospital.basic :
             cyberware.slots <= 4 ? INSTALL_TIMES.hospital.complex :
             cyberware.slots <= 8 ? INSTALL_TIMES.hospital.major : INSTALL_TIMES.hospital.extreme;
      break;
  }

  return { cost: installCost, time };
}
