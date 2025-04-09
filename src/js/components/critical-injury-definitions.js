// Critical Injury definitions from Cyberpunk RED rulebook
const CRITICAL_INJURIES = {
    Head: [
        {
            name: "Lost Eye",
            description: "The Lost Eye is gone. -4 to Ranged Attacks & Perception Checks involving vision. Base Death Save Penalty is increased by 1. Quick Fix: N/A. Treatment: Surgery DV17"
        },
        {
            name: "Brain Injury",
            description: "-2 to all Actions. Base Death Save Penalty is increased by 1. Quick Fix: N/A. Treatment: Surgery DV17"
        },
        {
            name: "Damaged Eye",
            description: "-2 to Ranged Attacks & Perception Checks involving vision. Quick Fix: Paramedic DV15. Treatment: Surgery DV13"
        },
        {
            name: "Concussion",
            description: "-2 to all Actions. Quick Fix: First Aid or Paramedic DV13. Treatment: Quick Fix removes Injury Effect permanently"
        },
        {
            name: "Broken Jaw",
            description: "-4 to all Actions involving speech. Quick Fix: Paramedic DV13. Treatment: Paramedic or Surgery DV13"
        },
        {
            name: "Foreign Object",
            description: "At the end of every Turn where you move farther than 4m/yds on foot, you re-suffer this Critical Injury's Bonus Damage directly to your Hit Points. Quick Fix: First Aid or Paramedic DV13. Treatment: Quick Fix removes Injury Effect permanently"
        },
        {
            name: "Whiplash",
            description: "Base Death Save Penalty is increased by 1. Quick Fix: Paramedic DV13. Treatment: Paramedic or Surgery DV13"
        },
        {
            name: "Cracked Skull",
            description: "Aimed Shots to your head multiply the damage that gets through your SP by 3 instead of 2. Base Death Save Penalty is increased by 1. Quick Fix: Paramedic DV15. Treatment: Paramedic or Surgery DV15"
        },
        {
            name: "Damaged Ear",
            description: "Whenever you move farther than 4m/yds on foot in a Turn, you cannot take a Move Action on your next Turn. Additionally you take a -2 to Perception Checks involving hearing. Quick Fix: Paramedic DV13. Treatment: Surgery DV13"
        },
        {
            name: "Crushed Windpipe",
            description: "You cannot speak. Base Death Save Penalty is increased by 1. Quick Fix: N/A. Treatment: Surgery DV15"
        },
        {
            name: "Lost Ear",
            description: "The Lost Ear is gone. Whenever you move farther than 4m/yds on foot in a Turn, you cannot take a Move Action on your next Turn. Additionally you take a -4 to Perception Checks involving hearing. Base Death Save Penalty is increased by 1. Quick Fix: N/A. Treatment: Surgery DV17"
        }
    ],
    Body: [
        {
            name: "Dismembered Arm",
            description: "The Dismembered Arm is gone. You drop any items in that dismembered arm's hand immediately. Base Death Save Penalty is increased by 1. Quick Fix: N/A. Treatment: Surgery DV17"
        },
        {
            name: "Dismembered Hand",
            description: "The Dismembered Hand is gone. You drop any items in the dismembered hand immediately. Base Death Save Penalty is increased by 1. Quick Fix: N/A. Treatment: Surgery DV17"
        },
        {
            name: "Collapsed Lung",
            description: "-2 to MOVE (minimum 1). Base Death Save Penalty is increased by 1. Quick Fix: Paramedic DV15. Treatment: Surgery DV15"
        },
        {
            name: "Broken Ribs",
            description: "At the end of every turn where you move farther than 4m/yds on foot, you re-suffer this Critical Injury's Bonus Damage directly to your Hit Points. Quick Fix: Paramedic DV13. Treatment: Paramedic DV15 or Surgery DV13"
        },
        {
            name: "Broken Arm",
            description: "The Broken Arm cannot be used. You drop any items in that arm's hand immediately. Quick Fix: Paramedic DV13. Treatment: Paramedic DV15 or Surgery DV13"
        },
        {
            name: "Foreign Object",
            description: "At the end of every Turn where you move farther than 4m/yds on foot, you re-suffer this Critical Injury's Bonus Damage directly to your Hit Points. Quick Fix: First Aid or Paramedic DV13. Treatment: Quick Fix removes Injury Effect permanently"
        },
        {
            name: "Broken Leg",
            description: "-4 to MOVE (minimum 1). Quick Fix: Paramedic DV13. Treatment: Surgery DV13 or Paramedic DV15"
        },
        {
            name: "Torn Muscle",
            description: "-2 to Melee Attacks. Quick Fix: First Aid or Paramedic DV13. Treatment: Quick Fix removes Injury Effect permanently"
        },
        {
            name: "Spinal Injury",
            description: "Next Turn, you cannot take an Action, but you can still take a Move Action. Base Death Save Penalty is increased by 1. Quick Fix: Paramedic DV15. Treatment: Surgery DV15"
        },
        {
            name: "Crushed Fingers",
            description: "-4 to all Actions involving that hand. Quick Fix: Paramedic DV13. Treatment: Surgery DV15"
        },
        {
            name: "Dismembered Leg",
            description: "The Dismembered Leg is gone. -6 to MOVE (minimum 1). You cannot dodge attacks. Base Death Save Penalty is increased by 1. Quick Fix: N/A. Treatment: Surgery DV17"
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


