// Tarot card definitions from Cyberpunk RED
const TAROT_CARDS = {
    "The Fool": {
        name: "The Fool",
        description: "All of the victim's Cyberware is rendered inoperable for one hour. Cyberlimbs that are rendered inoperable act as their meat counterparts do when they have been dismembered, but they still hang loosely. Should this leave a target without any ability to sense an opponent, any Check they make suffers an additional -4 modifier, as if obscured by smoke or darkness. If the victim has no Cyberware they instead suffer the Foreign Object Critical Injury and experience 3d6 Humanity Loss.",
        effect: (target) => {
            // All cyberware is rendered inoperable for one hour
            // If no cyberware, suffer Foreign Object and 3d6 Humanity Loss
            return {
                type: "cyberware",
                duration: 3600, // 1 hour in seconds
                fallback: {
                    injury: "Foreign Object",
                    humanityLoss: "3d6"
                }
            };
        }
    },
    "The Magician": {
        name: "The Magician",
        description: "The GM selects one of the victim's pieces of cyberware. That piece of cyberware is destroyed (although not beyond repair). Additionally, the victim is now Deadly On Fire (CP:R page 180). If the victim has no Cyberware, they are now Deadly on Fire, and one of their worn or held weapons malfunctions, requiring an Action to reverse the malfunction before it can be used again.",
        effect: (target) => {
            // One piece of cyberware is destroyed
            // Target is now Deadly On Fire
            // If no cyberware, one weapon malfunctions
            return {
                type: "cyberware",
                effect: "destroy",
                status: "Deadly On Fire",
                fallback: {
                    weaponMalfunction: true
                }
            };
        }
    },
    "The High Priestess": {
        name: "The High Priestess",
        description: "The victim suffers the Foreign Object Critical Injury, except instead of re-suffering Bonus Damage whenever they move further than 4 m/yds on foot in a Turn, they must instead beat a DV 15 Resist Torture/Drugs Skill Check or suffer 3d6 damage directly to their Hit Points.",
        effect: (target) => {
            // Foreign Object with DV15 Resist Torture/Drugs check
            return {
                type: "injury",
                injury: "Foreign Object",
                check: {
                    skill: "Resist Torture/Drugs",
                    dv: 15,
                    damage: "3d6"
                }
            };
        }
    },
    "The Empress": {
        name: "The Empress",
        description: "The music swells. The next three successful Attack Checks made against a single opponent in this combat are guaranteed to inflict Critical Injuries, no matter what the damage dice say. This applies to Light Melee Weapons but not Biotoxins, Poisons, Stun Batons, and other weapons normally incapable of causing a Critical Injury.",
        effect: (target) => {
            // Next three successful attacks against target are guaranteed criticals
            return {
                type: "buff",
                effect: "guaranteed_criticals",
                count: 3
            };
        }
    },
    "The Emperor": {
        name: "The Emperor",
        description: "The GM selects a Player to choose one Critical Injury from the Head table (CP:R page 188), and one from the Body table (CP:R page 187). The victim suffers both of those Critical Injuries.",
        effect: (target) => {
            // Player chooses one Head and one Body critical injury
            return {
                type: "injury",
                selection: {
                    head: true,
                    body: true
                }
            };
        }
    },
    "The Hierophant": {
        name: "The Hierophant",
        description: "The Attack deals twice the amount of damage it would have done, after armor and any multipliers are taken into account. However, if it was made by a weapon, that weapon is destroyed beyond repair.",
        effect: (target) => {
            // Double damage but weapon is destroyed
            return {
                type: "damage",
                multiplier: 2,
                weaponDestroyed: true
            };
        }
    },
    "The Lovers": {
        name: "The Lovers",
        description: "This Attack now hits the head, even if it was originally aimed elsewhere. Additionally, if it was a Melee Attack that drew The Lovers, the victim is now considered to be defender in a grapple with the attacker.",
        effect: (target) => {
            // Attack hits head and if melee, target is grappled
            return {
                type: "attack",
                location: "head",
                grapple: true
            };
        }
    },
    "The Chariot": {
        name: "The Chariot",
        description: "The Attack finds a fortuitous flaw in the target's armor, which forms a gaping hole. The victim's armor in the damaged location is ablated by an additional 5 points, even if it was not penetrated by the Attack.",
        effect: (target) => {
            // Armor is ablated by 5 points
            return {
                type: "armor",
                ablation: 5
            };
        }
    },
    "Strength": {
        name: "Strength",
        description: "The Attack deals an additional 25 damage. This additional damage is added to the rolled damage before armor SP is subtracted and/or any multipliers are calculated.",
        effect: (target) => {
            // +25 damage before armor
            return {
                type: "damage",
                bonus: 25,
                beforeArmor: true
            };
        }
    },
    "The Hermit": {
        name: "The Hermit",
        description: "The victim suffers the Lost Eye Critical Injury twice, although the penalty for the injury is only applied once. Should this leave a target without any ability to sense an opponent, any Skill Check they make suffers an additional -4 modifier, as if obscured by smoke or darkness.",
        effect: (target) => {
            // Lost Eye twice
            return {
                type: "injury",
                injury: "Lost Eye",
                count: 2
            };
        }
    },
    "Wheel of Fortune": {
        name: "Wheel of Fortune",
        description: "The Attack goes wild. If it was a Ranged Attack, the GM randomly determines a new target to replace the intended target. If it was a Melee Attack, the person who caused Wheel of Fortune to be drawn immediately falls prone, and the Attack is considered a miss instead of a hit. Either way, any weapon used to make the Attack malfunctions, requiring an Action to reverse the malfunction before it can be used again.",
        effect: (target) => {
            // Attack goes wild, weapon malfunctions
            return {
                type: "attack",
                effect: "wild",
                weaponMalfunction: true
            };
        }
    },
    "Justice": {
        name: "Justice",
        description: "The Attack knocks the wind out of the victim. For the next minute they suffer a -5 penalty to Evasion Skill Checks when attempting to avoid a Melee Attack and they cannot dodge Ranged Attacks at all.",
        effect: (target) => {
            // -5 to Evasion vs Melee, cannot dodge Ranged
            return {
                type: "debuff",
                effect: "evasion_penalty",
                duration: 60, // 1 minute
                penalties: {
                    melee: -5,
                    ranged: "cannot_dodge"
                }
            };
        }
    },
    "The Hanged Man": {
        name: "The Hanged Man",
        description: "The victim is knocked prone and suffers the Spinal Injury and Whiplash Critical Injuries.",
        effect: (target) => {
            // Knocked prone, Spinal Injury and Whiplash
            return {
                type: "injury",
                injuries: ["Spinal Injury", "Whiplash"],
                status: "prone"
            };
        }
    },
    "Death": {
        name: "Death",
        description: "The victim must immediately roll a single Death Save. If they fail, they are reduced to 0 HP and are knocked unconscious for one minute. Upon regaining consciousness, the victim regains 3d6 Humanity Points (up to their maximum Humanity) from the experience.",
        effect: (target) => {
            // Death Save, if fail: unconscious for 1 minute, then +3d6 Humanity
            return {
                type: "death_save",
                onFail: {
                    unconscious: 60, // 1 minute
                    humanityGain: "3d6"
                }
            };
        }
    },
    "Temperance": {
        name: "Temperance",
        description: "The victim must choose one of their limbs to suffer a Dismembered Critical Injury, and then must choose a different one of their limbs to suffer a Broken Critical Injury.",
        effect: (target) => {
            // Choose one limb to be Dismembered, another to be Broken
            return {
                type: "injury",
                selection: {
                    dismembered: true,
                    broken: true
                }
            };
        }
    },
    "The Devil": {
        name: "The Devil",
        description: "This Attack now hits the head, even if it was originally aimed elsewhere. Additionally, the victim suffers the Brain Injury and Lost Ear Critical Injuries.",
        effect: (target) => {
            // Hits head, Brain Injury and Lost Ear
            return {
                type: "attack",
                location: "head",
                injuries: ["Brain Injury", "Lost Ear"]
            };
        }
    },
    "The Tower": {
        name: "The Tower",
        description: "The victim suffers the Cracked Skull, Crushed Windpipe, and Whiplash Critical Injuries. These Injuries deal no Bonus Damage. For one hour, the victim cannot feel pain and can ignore the effects of the Seriously Wounded Wound State.",
        effect: (target) => {
            // Cracked Skull, Crushed Windpipe, Whiplash, no pain for 1 hour
            return {
                type: "injury",
                injuries: ["Cracked Skull", "Crushed Windpipe", "Whiplash"],
                buff: {
                    effect: "no_pain",
                    duration: 3600 // 1 hour
                }
            };
        }
    },
    "The Star": {
        name: "The Star",
        description: "If the Star was drawn due to a Ranged Attack, it hits the first target, passes through, and ricochets into a second enemy within 20 m/yards, chosen by the GM. If there is no additional enemy, the ricochet instead hits the original target a second time. This ricochet Attack always hits and does so in the body. Roll new damage dice for the ricochet Attack. If The Star was drawn due to a Melee Attack, the victim suffers the Broken Ribs and Collapsed Lung Critical Injuries.",
        effect: (target) => {
            // If ranged: hits first target, ricochets to second within 20m
            // If melee: Broken Ribs and Collapsed Lung
            return {
                type: "attack",
                effect: "ricochet",
                range: 20,
                fallback: {
                    injuries: ["Broken Ribs", "Collapsed Lung"]
                }
            };
        }
    },
    "The Moon": {
        name: "The Moon",
        description: "The victim suffers the Foreign Object Critical Injury twice, once in the body and once in the head. If The Moon was drawn by a Melee Attack made using a melee weapon, that weapon is now stuck in the victim's body, and the attacker is disarmed.",
        effect: (target) => {
            // Foreign Object twice (body/head), melee weapon stuck
            return {
                type: "injury",
                injuries: [{ name: "Foreign Object", location: "Body" }, { name: "Foreign Object", location: "Head" }],
                weaponStuck: true
            };
        }
    },
    "The Sun": {
        name: "The Sun",
        description: "If the victim is carrying any grenades or other explosives, the GM chooses one of them to explode immediately. If they weren't carrying any grenades, the GM chooses a non-weapon piece of equipment on the victim to destroy beyond repair.",
        effect: (target) => {
            // Grenade explodes or equipment destroyed
            return {
                type: "equipment",
                effect: "explode_grenade",
                fallback: {
                    effect: "destroy_equipment"
                }
            };
        }
    },
    "Judgement": {
        name: "Judgement",
        description: "The victim suffers the Crushed Fingers Critical Injury on one of their hands, and the Dismembered Hand Critical Injury on another hand.",
        effect: (target) => {
            // Crushed Fingers (one hand), Dismembered Hand (other hand)
            return {
                type: "injury",
                injuries: [{ name: "Crushed Fingers", location: "Hand1" }, { name: "Dismembered Hand", location: "Hand2" }]
            };
        }
    },
    "The World": {
        name: "The World",
        description: "The character who caused The World to be drawn may take an additional Turn after this one. During this additional Turn they receive a +5 to any Skill Check, ignore the negative effects of all Wound States, and do not have to make a Death Save if Mortally Wounded.",
        effect: (target) => {
            // Attacker gets additional turn with buffs
            return {
                type: "turn",
                effect: "additional_turn",
                buffs: {
                    skillBonus: 5,
                    ignoreWoundState: true,
                    ignoreDeathSave: true
                }
            };
        }
    }
};

// Function to draw a random Tarot card
function drawTarotCard() {
    const cards = Object.keys(TAROT_CARDS);
    const randomIndex = Math.floor(Math.random() * cards.length);
    const cardName = cards[randomIndex];
    return TAROT_CARDS[cardName];
}

// Function to apply Tarot effect (example, can be expanded)
function applyTarotEffect(card, target) {
    console.log(`Applying effect for ${card.name} to ${target.name}`);
    // This is where you'd implement the logic based on card.effect
    // For now, just return the effect definition
    return card.effect(target);
}

// Example usage:
// const drawnCard = drawTarotCard();
// applyTarotEffect(drawnCard, someParticipant);

// Add to window global scope if in browser
if (typeof window !== 'undefined') {
    window.TAROT_CARDS = TAROT_CARDS;
    window.drawTarotCard = drawTarotCard;
    window.applyTarotEffect = applyTarotEffect;
} 