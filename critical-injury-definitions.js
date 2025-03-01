// Critical Injury definitions from Cyberpunk RED rulebook
const CRITICAL_INJURIES = {
    Head: [
        {
            name: "Lightly Wounded Head",
            description: "Minor Concussion. -1 to all actions until healed. Healing time: 1 week."
        },
        {
            name: "Seriously Wounded Head",
            description: "Moderate Concussion. -2 to all actions until healed. Healing time: 2 weeks."
        },
        {
            name: "Damaged Eye",
            description: "-2 to Perception Checks, Ranged Attacks, and any other task using vision. Healing time: 2 weeks."
        },
        {
            name: "Foreign Object in the Eye",
            description: "As Damaged Eye but surgery removes foreign body. Without surgery, -4 to Perception, Ranged Attacks, and other vision tasks. Healing time: 2 weeks."
        },
        {
            name: "Destroyed Eye",
            description: "Person loses eye, suffers -4 to Perception, Ranged Attacks, and other vision tasks. Surgery and cybereye restore penalties. Healing time: 3 weeks."
        },
        {
            name: "Brain Injury",
            description: "-2 to all INT, REF, & DEX based Actions. Healing time: 4 weeks."
        },
        {
            name: "Damaged Ear",
            description: "-2 to Perception involving hearing, -2 to Balance checks. Healing time: 2 weeks."
        },
        {
            name: "Foreign Object in the Ear",
            description: "As Damaged Ear but surgery removes object. Without surgery, -4 to hearing and balance. Healing time: 2 weeks."
        },
        {
            name: "Destroyed Ear",
            description: "Person loses ear, -4 to hearing and balance. Surgery and cyberaudio restore penalties. Healing time: 3 weeks."
        },
        {
            name: "Damaged Jaw",
            description: "-2 to verbal communication. Healing time: 2 weeks."
        },
        {
            name: "Cracked Skull",
            description: "Headshots do 2x damage (instead of 2x) until healed. Healing time: 4 weeks."
        },
        {
            name: "Broken Nose",
            description: "-2 to Personal Grooming checks. Healing time: 1 week."
        }
    ],
    Body: [
        {
            name: "Lightly Wounded Torso",
            description: "Minor Bruises. -1 to all actions until healed. Healing time: 1 week."
        },
        {
            name: "Seriously Wounded Torso",
            description: "Moderate Bruises. -2 to all actions until healed. Healing time: 2 weeks."
        },
        {
            name: "Broken Ribs",
            description: "Extra 1d6 damage when hit in body area, -2 to all physical actions. Healing time: 3 weeks."
        },
        {
            name: "Foreign Object in Torso",
            description: "As Broken Ribs but surgery removes foreign body. Without surgery, -4 to all physical actions. Healing time: 3 weeks."
        },
        {
            name: "Collapsed Lung",
            description: "Move halved. Doubles movement penalties from wounds. Healing time: 4 weeks."
        },
        {
            name: "Damaged Heart",
            description: "Character takes 1d6 damage per round of strenuous activity. Healing time: 1 month."
        },
        {
            name: "Damaged Spine",
            description: "-2 to all physical actions. Healing time: 1 month."
        },
        {
            name: "Major Organ Damage",
            description: "-2 to Body checks. Character takes 1d6 damage per day. Healing time: 1 month."
        },
        {
            name: "Crushed Windpipe",
            description: "Cannot speak. -4 to all actions due to pain. Healing time: 4 weeks."
        },
        {
            name: "Broken Arm",
            description: "Arm unusable. -2 to all actions due to pain. Healing time: 3 weeks."
        },
        {
            name: "Broken Leg",
            description: "Move halved. -2 to all actions due to pain. Healing time: 3 weeks."
        },
        {
            name: "Severed Limb",
            description: "Limb is gone, surgery and cyberimplant needed. +2 to death saves until wounds stabilized. Healing time: 4 weeks."
        }
    ],
    Death: [
        {
            name: "Lucky Break",
            description: "Despite all odds, you survive! You have 1 HP and are considered stabilized."
        }
    ]
};

// Used for random critical injury rolls
function rollCriticalInjury(location) {
    const table = CRITICAL_INJURIES[location];
    if (!table) return null;
    
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;
    
    // Convert 2-12 roll to 0-11 index
    const index = Math.min(Math.max(total - 2, 0), table.length - 1);
    return { ...table[index], rollResult: total };
}

// Function to simulate a death save
function makeDeathSave(penalty = 0) {
    const roll = Math.floor(Math.random() * 10) + 1; // d10 roll
    const body = 5; // Default body value, replace with actual character body if available
    const result = roll + body - penalty;
    
    if (result > 0) {
        return {
            success: true,
            roll: roll,
            body: body,
            penalty: penalty,
            total: result,
            message: "Death Save successful! Character survives but is unconscious."
        };
    } else {
        const criticalInjury = rollCriticalInjury('Death');
        return {
            success: false,
            roll: roll,
            body: body,
            penalty: penalty,
            total: result,
            message: "Death Save failed! Character is dead.",
            criticalInjury: criticalInjury
        };
    }
}

// Function to check if an injury is a head injury
function isHeadInjury(injuryName) {
    return CRITICAL_INJURIES.Head.some(injury => injury.name === injuryName);
}

// Function to check if an injury is a body injury
function isBodyInjury(injuryName) {
    return CRITICAL_INJURIES.Body.some(injury => injury.name === injuryName);
}

// Add to window global scope if in browser
if (typeof window !== 'undefined') {
    window.CRITICAL_INJURIES = CRITICAL_INJURIES;
    window.rollCriticalInjury = rollCriticalInjury;
    window.makeDeathSave = makeDeathSave;
    window.isHeadInjury = isHeadInjury;
    window.isBodyInjury = isBodyInjury;
}
