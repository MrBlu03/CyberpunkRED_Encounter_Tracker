// Cyberpunk RED Night City Tarot DLC Rules & Card Deck
// Based on the official Night City Tarot DLC from R. Talsorian Games

export interface TarotCard {
  id: string;
  name: string;
  number: number;
  roman: string;
  suit: 'major';
  description: string;
  effect: string;
}

export interface TarotDeckState {
  cardIds: string[];
  drawnThisSession: boolean;
  cardsSeenCount: number;
  lastDrawnCard?: TarotCard;
}

export const TAROT_CARDS: TarotCard[] = [
  { 
    id: '0', 
    name: 'The Fool', 
    number: 0, 
    roman: '0',
    suit: 'major', 
    description: 'Innocence, New Beginnings, Spontaneity', 
    effect: "All of the victim's Cyberware is rendered inoperable for one hour. Cyberlimbs act as dismembered meat counterparts. If the victim has no Cyberware, they instead suffer the Foreign Object Critical Injury and take 3d6 Humanity Loss." 
  },
  { 
    id: '1', 
    name: 'The Magician', 
    number: 1, 
    roman: 'I',
    suit: 'major', 
    description: 'Manifestation, Resourcefulness, Power', 
    effect: "The GM selects one of the victim's pieces of cyberware. That piece of cyberware is destroyed. Additionally, the victim is now Deadly On Fire (CP:R p. 180). If no cyberware, they are Deadly On Fire and one held weapon malfunctions." 
  },
  { 
    id: '2', 
    name: 'The High Priestess', 
    number: 2, 
    roman: 'II',
    suit: 'major', 
    description: 'Intuition, Sacred Knowledge, Divine Feminine', 
    effect: "The victim suffers the Foreign Object Critical Injury. When moving more than 4 m/yds on foot in a Turn, they must beat a DV 15 Resist Torture/Drugs Skill Check or take 3d6 damage directly to HP." 
  },
  { 
    id: '3', 
    name: 'The Empress', 
    number: 3, 
    roman: 'III',
    suit: 'major', 
    description: 'Femininity, Beauty, Nature, Abundance', 
    effect: "The next three successful Attack Checks against a single opponent in this combat are guaranteed to inflict Critical Injuries, no matter the damage dice rolled (applies to light melee weapons)." 
  },
  { 
    id: '4', 
    name: 'The Emperor', 
    number: 4, 
    roman: 'IV',
    suit: 'major', 
    description: 'Authority, Structure, Control, Fatherhood', 
    effect: "The GM selects a Player to choose one Critical Injury from the Head table (CP:R p. 188) and one from the Body table (CP:R p. 187). The victim suffers both Critical Injuries." 
  },
  { 
    id: '5', 
    name: 'The Hierophant', 
    number: 5, 
    roman: 'V',
    suit: 'major', 
    description: 'Spiritual Wisdom, Religious Beliefs, Tradition', 
    effect: "The Attack deals double damage after armor and modifiers (like an Aimed Shot to the Head). If made with a weapon, that weapon is destroyed beyond repair." 
  },
  { 
    id: '6', 
    name: 'The Lovers', 
    number: 6, 
    roman: 'VI',
    suit: 'major', 
    description: 'Love, Harmony, Relationships, Choices', 
    effect: "This Attack now hits the head, even if originally aimed elsewhere. If it was a Melee Attack, the victim is now considered grappled by the attacker." 
  },
  { 
    id: '7', 
    name: 'The Chariot', 
    number: 7, 
    roman: 'VII',
    suit: 'major', 
    description: 'Control, Willpower, Success, Action', 
    effect: "The victim's armor location is ablated by an additional 5 points, even if the attack did not penetrate the armor SP." 
  },
  { 
    id: '8', 
    name: 'Strength', 
    number: 8, 
    roman: 'VIII',
    suit: 'major', 
    description: 'Strength, Courage, Persuasion, Influence', 
    effect: "The Attack deals an additional 25 damage. This damage is added before armor SP is subtracted or any multipliers are calculated." 
  },
  { 
    id: '9', 
    name: 'The Hermit', 
    number: 9, 
    roman: 'IX',
    suit: 'major', 
    description: 'Soul-searching, Introspection, Solitude', 
    effect: "The victim suffers the Lost Eye Critical Injury twice (penalty applied once). If left without any sight, all checks suffer a -4 modifier." 
  },
  { 
    id: '10', 
    name: 'Wheel of Fortune', 
    number: 10, 
    roman: 'X',
    suit: 'major', 
    description: 'Good Luck, Karma, Life Cycles, Destiny', 
    effect: "If Ranged Attack: GM randomly selects a new target within range. If Melee Attack: Attacker falls prone and misses. In either case, the weapon malfunctions and requires an Action to clear." 
  },
  { 
    id: '11', 
    name: 'Justice', 
    number: 11, 
    roman: 'XI',
    suit: 'major', 
    description: 'Justice, Fairness, Truth, Cause and Effect', 
    effect: "For the next 5 minutes, the victim suffers a -5 penalty to Evasion Skill Checks and cannot dodge Ranged Attacks." 
  },
  { 
    id: '12', 
    name: 'The Hanged Man', 
    number: 12, 
    roman: 'XII',
    suit: 'major', 
    description: 'Surrender, Letting Go, New Perspective', 
    effect: "The victim is knocked prone and suffers both the Spinal Injury and Whiplash Critical Injuries." 
  },
  { 
    id: '13', 
    name: 'Death', 
    number: 13, 
    roman: 'XIII',
    suit: 'major', 
    description: 'Endings, Change, Transformation, Transition', 
    effect: "The victim must immediately make a Death Save regardless of current HP. Failure reduces them to 0 HP (unconscious 1 min). Upon regaining consciousness, they regain 3d6 Humanity." 
  },
  { 
    id: '14', 
    name: 'Temperance', 
    number: 14, 
    roman: 'XIV',
    suit: 'major', 
    description: 'Balance, Moderation, Patience, Purpose', 
    effect: "The victim chooses one of their limbs to suffer Dismembered Limb, and another limb to suffer Broken Limb." 
  },
  { 
    id: '15', 
    name: 'The Devil', 
    number: 15, 
    roman: 'XV',
    suit: 'major', 
    description: 'Shadow Self, Attachment, Addiction, Restriction', 
    effect: "The Attack is treated as an Aimed Shot to the Head. The victim suffers both the Brain Injury and Lost Ear Critical Injuries." 
  },
  { 
    id: '16', 
    name: 'The Tower', 
    number: 16, 
    roman: 'XVI',
    suit: 'major', 
    description: 'Sudden Change, Upheaval, Chaos, Revelation', 
    effect: "The victim suffers Cracked Skull, Crushed Windpipe, and Whiplash (without taking their bonus damage). The victim feels no pain and ignores Seriously Wounded penalties for 1 hour." 
  },
  { 
    id: '17', 
    name: 'The Star', 
    number: 17, 
    roman: 'XVII',
    suit: 'major', 
    description: 'Hope, Faith, Purpose, Renewal, Spirituality', 
    effect: "If Ranged: Hits victim AND hits a second target within 20m (GM choice, rolls new damage). If Melee: Victim suffers Broken Ribs and Collapsed Lung." 
  },
  { 
    id: '18', 
    name: 'The Moon', 
    number: 18, 
    roman: 'XVIII',
    suit: 'major', 
    description: 'Illusion, Fear, Anxiety, Subconscious, Intuition', 
    effect: "The victim suffers the Foreign Object Critical Injury twice (Head and Body). If Melee: weapon is embedded in victim's flesh and attacker is disarmed." 
  },
  { 
    id: '19', 
    name: 'The Sun', 
    number: 19, 
    roman: 'XIX',
    suit: 'major', 
    description: 'Positivity, Fun, Warmth, Success, Vitality', 
    effect: "If victim carries explosives, GM chooses one to detonate. If no explosives, one piece of non-weapon equipment is destroyed beyond repair." 
  },
  { 
    id: '20', 
    name: 'Judgement', 
    number: 20, 
    roman: 'XX',
    suit: 'major', 
    description: 'Judgement, Rebirth, Inner Calling, Absolution', 
    effect: "The victim suffers Crushed Fingers on one hand, and Dismembered Hand on the other hand." 
  },
  { 
    id: '21', 
    name: 'The World', 
    number: 21, 
    roman: 'XXI',
    suit: 'major', 
    description: 'Completion, Integration, Accomplishment, Travel', 
    effect: "The Attacker takes an immediate additional Turn right after this one. They gain +5 to all Skill Checks, ignore Wound State penalties, and ignore Death Saves if mortally wounded during that turn." 
  },
];

/**
 * Determines whether a damage dice roll qualifies as a Normal Critical Injury or Night City Tarot Critical.
 */
export function evaluateDamageSixes(sixCount: number): {
  isCritical: boolean;
  isTarotCrit: boolean;
  label: string;
} {
  if (sixCount >= 3) {
    return {
      isCritical: true,
      isTarotCrit: true,
      label: `🎴 Night City Tarot Critical (${sixCount} sixes rolled!)`
    };
  }
  if (sixCount === 2) {
    return {
      isCritical: true,
      isTarotCrit: false,
      label: `🎲 Normal Critical Injury (2 sixes rolled: +5 HP damage)`
    };
  }
  return {
    isCritical: false,
    isTarotCrit: false,
    label: 'Normal Damage (no critical)'
  };
}

/**
 * Draws a random tarot card from the 22-card Night City Tarot deck.
 */
export function drawRandomTarotCard(): TarotCard {
  const index = Math.floor(Math.random() * TAROT_CARDS.length);
  return TAROT_CARDS[index];
}
