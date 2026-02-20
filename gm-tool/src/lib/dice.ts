// Dice rolling utilities for Cyberpunk RED

/**
 * Roll a die with the specified number of sides
 */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll a d10 (standard Cyberpunk die)
 */
export function d10(): number {
  return rollDie(10);
}

/**
 * Roll a d6
 */
export function d6(): number {
  return rollDie(6);
}

/**
 * Roll a d100 (percentile)
 */
export function d100(): number {
  return rollDie(100);
}

/**
 * Roll multiple dice and sum the results
 */
export function rollDice(count: number, sides: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += rollDie(sides);
  }
  return total;
}

/**
 * Parse and roll dice notation (e.g., "2d6+3", "1d10", "3d6-2")
 * Returns the total result
 */
export function rollDiceNotation(diceString: string): number {
  const dicePattern = /(\d*)d(\d+)(?:\+(\d+))?(?:-(\d+))?/gi;
  let totalResult = 0;
  let match;
  
  while ((match = dicePattern.exec(diceString)) !== null) {
    const count = parseInt(match[1]) || 1;
    const sides = parseInt(match[2]);
    const plus = parseInt(match[3]) || 0;
    const minus = parseInt(match[4]) || 0;
    
    let diceTotal = 0;
    for (let i = 0; i < count; i++) {
      diceTotal += Math.floor(Math.random() * sides) + 1;
    }
    
    totalResult += diceTotal + plus - minus;
  }
  
  // If no dice pattern found, try to parse as a simple number
  if (totalResult === 0) {
    const num = parseInt(diceString);
    return isNaN(num) ? 0 : num;
  }
  
  return totalResult;
}

/**
 * Parse dice notation and return detailed results
 */
export function rollDiceDetailed(diceString: string): {
  total: number;
  rolls: number[];
  modifier: number;
} {
  const dicePattern = /(\d*)d(\d+)(?:\+(\d+))?(?:-(\d+))?/i;
  const match = diceString.match(dicePattern);
  
  if (!match) {
    const num = parseInt(diceString);
    return {
      total: isNaN(num) ? 0 : num,
      rolls: [],
      modifier: 0
    };
  }
  
  const count = parseInt(match[1]) || 1;
  const sides = parseInt(match[2]);
  const plus = parseInt(match[3]) || 0;
  const minus = parseInt(match[4]) || 0;
  const modifier = plus - minus;
  
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  
  return { total, rolls, modifier };
}

/**
 * Roll Cyberpunk RED initiative (1d10 + REF + Initiative Skill)
 */
export function rollInitiative(ref: number, initiativeSkill: number = 0): {
  roll: number;
  total: number;
} {
  const roll = d10();
  return {
    roll,
    total: roll + ref + initiativeSkill
  };
}

/**
 * Roll critical injury (1d6 for location, then 1d6 for severity)
 */
export function rollCriticalInjury(): {
  locationRoll: number;
  severityRoll: number;
} {
  return {
    locationRoll: d6(),
    severityRoll: d6()
  };
}

/**
 * Get hit location based on d10 roll
 */
export function getHitLocation(roll: number): string {
  if (roll === 1) return 'Head';
  if (roll <= 4) return 'Body';
  if (roll <= 6) return 'Right Arm';
  if (roll <= 8) return 'Left Arm';
  if (roll === 9) return 'Right Leg';
  return 'Left Leg';
}

/**
 * Roll on a table with weighted results
 */
export function rollOnTable<T>(table: { min: number; max: number; result: T }[]): T | null {
  const roll = d100();
  const entry = table.find(e => roll >= e.min && roll <= e.max);
  return entry?.result || null;
}

/**
 * Roll stats for NPC generation (using 4d6 drop lowest or similar)
 */
export function rollStat(method: 'standard' | 'heroic' = 'standard'): number {
  switch (method) {
    case 'heroic':
      // Roll 2d6+6 for heroic stats
      return rollDice(2, 6) + 6;
    case 'standard':
    default:
      // Roll 3d6 for standard stats
      return rollDice(3, 6);
  }
}

/**
 * Generate a random name from syllables
 */
export function generateName(): string {
  const firstSyllables = ['Nik', 'Vex', 'Kor', 'Zed', 'Jax', 'Ryn', 'Tex', 'Lux', 'Dex', 'Fox'];
  const secondSyllables = ['a', 'o', 'i', 'an', 'on', 'en', 'ar', 'or', 'is', 'us'];
  const thirdSyllables = ['', 's', 'x', 'z', 'n', 'r', 'k', 't'];
  
  const first = firstSyllables[Math.floor(Math.random() * firstSyllables.length)];
  const second = secondSyllables[Math.floor(Math.random() * secondSyllables.length)];
  const third = thirdSyllables[Math.floor(Math.random() * thirdSyllables.length)];
  
  return first + second + third;
}

/**
 * Generate a full name (first + last)
 */
export function generateFullName(): string {
  const firstName = generateName();
  const lastName = generateName();
  return `${firstName} ${lastName}`;
}
