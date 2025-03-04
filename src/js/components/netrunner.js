// Black ICE definitions with stats from the rulebook
const BLACK_ICE_TYPES = {
    hellhound: {
        name: "Hellhound",
        perception: 6,
        speed: 8,
        attack: 8,
        damage: "3d6",
        effect: "Move back 1 floor on hit, -2 to all Netrunning Actions until jacked out"
    },
    wisp: {
        name: "Wisp",
        perception: 2,
        speed: 6,
        attack: 6,
        damage: "2d6",
        effect: "On hit, Netrunner reveals location in meat space"
    },
    killer: {
        name: "Killer",
        perception: 6,
        speed: 4,
        attack: 6,
        damage: "3d6",
        effect: "Ignores Armor Programs"
    },
    raven: {
        name: "Raven",
        perception: 8,
        speed: 2,
        attack: 3,
        damage: "1d6",
        effect: "If hit, Netrunner can't jack out for 1d6 rounds"
    },
    asp: {
        name: "ASP",
        perception: 4,
        speed: 6,
        attack: 6,
        damage: "2d6",
        effect: "+2 additional damage per net action after the first"
    },
    sabertooth: {
        name: "Sabertooth",
        perception: 8,
        speed: 8,
        attack: 6,
        damage: "2d6",
        effect: "Attack ignores Defense Programs"
    },
    kraken: {
        name: "Kraken",
        perception: 6,
        speed: 2,
        attack: 10,
        damage: "6d6",
        effect: "Takes 3 Net Actions to use non-attack action"
    }
};

// Architecture generation templates
const ARCHITECTURE_TEMPLATES = {
    corporate: {
        namePrefix: ["Arasaka", "Militech", "Biotechnica", "Petrochem", "Orbital Air", "Trauma Team", "Continental", "Zetatech", "EuroBank"],
        nameSuffix: ["Secure Server", "Database", "HR System", "Security Grid", "R&D Network", "Financial Records", "Executive Suite"],
        fileProbability: 0.7,
        controlProbability: 0.4,
        blackICEProbability: 0.3,
        files: [
            "Quarterly Earnings", "Employee Records", "Security Protocols", "Research Data", 
            "Executive Emails", "Project Plans", "Blackmail Material", "Competitor Analysis"
        ],
        controls: ["Security Cameras", "Door Controls", "Automated Defenses", "Communications", "Climate Control"]
    },
    military: {
        namePrefix: ["Military", "NUSA Armed Forces", "Special Operations", "Intelligence", "Strategic Command", "Defense Network"],
        nameSuffix: ["Mainframe", "Command Center", "Weapons System", "Intelligence Database", "Operations Network"],
        fileProbability: 0.6,
        controlProbability: 0.6,
        blackICEProbability: 0.5,
        files: [
            "Mission Briefings", "Weapon Schematics", "Deployment Records", "Intelligence Reports",
            "Personnel Files", "Black Operations", "Enemy Analysis", "Strategic Plans"
        ],
        controls: ["Weapons Systems", "Surveillance Grid", "Communication Array", "Base Security", "Drone Control"]
    },
    personal: {
        namePrefix: ["Private", "Personal", "Home", "Secure", "Protected"],
        nameSuffix: ["System", "Network", "Server", "Database", "Files"],
        fileProbability: 0.8,
        controlProbability: 0.2,
        blackICEProbability: 0.2,
        files: [
            "Personal Photos", "Financial Records", "Medical History", "Private Messages", 
            "Client Data", "Business Plans", "Diary Entries", "Contact Information"
        ],
        controls: ["Smart Home", "Security Cameras", "Door Locks", "Climate Control", "Entertainment System"]
    },
    government: {
        namePrefix: ["NCPD", "City Hall", "Municipal", "Government", "Public Records", "Night City"],
        nameSuffix: ["Database", "Archive", "Records", "Network", "Registry"],
        fileProbability: 0.9,
        controlProbability: 0.5,
        blackICEProbability: 0.4,
        files: [
            "Criminal Records", "Citizen Database", "Tax Records", "Property Registry", 
            "Surveillance Logs", "Police Reports", "Classified Operations", "City Plans"
        ],
        controls: ["Traffic Systems", "Public Cameras", "Government Building Security", "Emergency Services", "Power Grid"]
    },
    criminal: {
        namePrefix: ["Maelstrom", "Tyger Claws", "Voodoo Boys", "Animals", "6th Street", "Moxes", "Valentinos"],
        nameSuffix: ["Hideout System", "Operations Network", "Stash Records", "Gang Database", "Black Market"],
        fileProbability: 0.6,
        controlProbability: 0.3,
        blackICEProbability: 0.4,
        files: [
            "Hit Lists", "Territory Maps", "Dealer Networks", "Heist Plans", 
            "Blackmail Data", "Membership Records", "Rival Gang Intel", "Weapon Caches"
        ],
        controls: ["Hideout Security", "Drug Lab Equipment", "Surveillance", "Alarm Systems", "Escape Routes"]
    }
};

// Control node types
const CONTROL_TYPES = {
    door: "Door Control",
    elevator: "Elevator System",
    cameras: "Security Cameras",
    turrets: "Automated Turrets",
    alarm: "Alarm System",
    lights: "Lighting Control",
    airlocks: "Airlock System",
    comms: "Communications",
    ventilation: "Ventilation Control",
    electrical: "Electrical Systems"
};

// Track the state of the architecture
let netArchitecture = {
    nodes: [],
    name: "Corporate Server",
    difficulty: "standard"
};

// Track the active netrunner
let activeNetrunner = {
    name: "",
    interface: 4, // Default value if not specified
    netActions: 4,
    netActionsRemaining: 4,
    currentHP: 25,
    maxHP: 25,
    programs: [
        "Sword",
        "Banhammer",
        "Worm",
        "Armor",
        "Flak"
    ]
};

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Node type selector handler
    document.getElementById('node-type').addEventListener('change', function(e) {
        const blackICEOptions = document.getElementById('blackICE-options');
        if (e.target.value === 'blackICE') {
            blackICEOptions.style.display = 'block';
        } else {
            blackICEOptions.style.display = 'none';
        }
    });
    
    // Add Node button
    document.getElementById('add-node-btn').addEventListener('click', addNodeToArchitecture);
    
    // Custom DV field toggler
    document.getElementById('difficulty').addEventListener('change', function(e) {
        const customDV = document.getElementById('custom-dv');
        if (e.target.value === 'custom') {
            customDV.style.display = 'block';
        } else {
            customDV.style.display = 'none';
        }
    });
    
    // Add custom program button
    document.querySelector('.add-custom-program').addEventListener('click', function() {
        const programInput = document.querySelector('.program-custom input');
        if (programInput.value.trim() !== '') {
            addCustomProgram(programInput.value.trim());
            programInput.value = '';
        }
    });
    
    // Use program button handler
    document.querySelectorAll('.use-program-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const programName = e.target.previousElementSibling.textContent;
            useProgram(programName);
        });
    });
    
    // Reset actions button handler
    document.getElementById('reset-actions').addEventListener('click', function() {
        resetNetActions();
    });
    
    // Save architecture button handler
    document.getElementById('save-architecture').addEventListener('click', function() {
        saveArchitecture();
    });
    
    // Load architecture button handler
    document.getElementById('load-architecture').addEventListener('click', function() {
        loadArchitecture();
    });
    
    // Clear architecture button handler
    document.getElementById('clear-architecture').addEventListener('click', function() {
        if (confirm("Are you sure you want to clear the architecture? This cannot be undone.")) {
            clearArchitecture();
        }
    });
    
    // Populate netrunner select from player characters
    populateNetrunnerSelect();
    
    // Netrunner select change handler
    document.getElementById('netrunner-select').addEventListener('change', function(e) {
        setActiveNetrunner(e.target.value);
    });
    
    // Add new event listeners for architecture generation
    document.getElementById('generate-architecture-btn').addEventListener('click', generateRandomArchitecture);
    
    // Export/import architecture
    document.getElementById('export-architecture').addEventListener('click', exportArchitecture);
    document.getElementById('import-architecture').addEventListener('click', function() {
        document.getElementById('import-architecture-file').click();
    });
    
    document.getElementById('import-architecture-file').addEventListener('change', importArchitecture);
    
    // Modal close button
    document.querySelector('.close-modal')?.addEventListener('click', function() {
        document.getElementById('architecture-modal').style.display = 'none';
    });
    
    // Copy JSON to clipboard
    document.getElementById('copy-json')?.addEventListener('click', function() {
        const jsonText = document.getElementById('export-json').value;
        navigator.clipboard.writeText(jsonText).then(() => {
            addLogEntry('Architecture JSON copied to clipboard', 'success');
        });
    });
    
    // Download JSON file
    document.getElementById('download-json')?.addEventListener('click', function() {
        const jsonText = document.getElementById('export-json').value;
        const blob = new Blob([jsonText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${netArchitecture.name.replace(/\s+/g, '_')}_architecture.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addLogEntry(`Architecture downloaded as ${a.download}`, 'success');
    });
    
    // Initialize interface
    initializeNetInterface();
});

// Function to add a node to the architecture
function addNodeToArchitecture(nodeType, nodeName, blackICEType) {
    let name = nodeName;
    
    if (!name) {
        if (nodeType === 'password') {
            name = `Password Layer ${netArchitecture.nodes.filter(n => n.type === 'password').length + 1}`;
        } else if (nodeType === 'file') {
            name = `Data File ${netArchitecture.nodes.filter(n => n.type === 'file').length + 1}`;
        } else if (nodeType === 'control') {
            name = `Control Node ${netArchitecture.nodes.filter(n => n.type === 'control').length + 1}`;
        } else if (nodeType === 'blackICE' && blackICEType) {
            name = BLACK_ICE_TYPES[blackICEType].name;
        }
    }
    
    let nodeData = {
        type: nodeType,
        name: name
    };
    
    // Add special properties based on node type
    if (nodeType === 'blackICE' && blackICEType) {
        nodeData.blackICEType = blackICEType;
        nodeData.stats = BLACK_ICE_TYPES[blackICEType];
    } else if (nodeType === 'control') {
        const controlTypes = Object.keys(CONTROL_TYPES);
        nodeData.controlType = CONTROL_TYPES[controlTypes[Math.floor(Math.random() * controlTypes.length)]];
    } else if (nodeType === 'file') {
        nodeData.fileContent = 'Classified corporate data';
    }
    
    // Add node to data model
    netArchitecture.nodes.push(nodeData);
    
    return nodeData;
}

// Function to get default node name based on type
function getDefaultNodeName(nodeType) {
    switch(nodeType) {
        case 'password':
            return `Password Layer ${netArchitecture.nodes.filter(n => n.type === 'password').length + 1}`;
        case 'file':
            return `Data File ${netArchitecture.nodes.filter(n => n.type === 'file').length + 1}`;
        case 'control':
            return `Control Node ${netArchitecture.nodes.filter(n => n.type === 'control').length + 1}`;
        case 'blackICE':
            const blackICEType = document.getElementById('blackICE-type').value;
            return BLACK_ICE_TYPES[blackICEType].name;
        default:
            return `Node ${netArchitecture.nodes.length + 1}`;
    }
}

// Function to render the architecture visualization
function renderArchitecture() {
    const container = document.getElementById('node-container');
    container.innerHTML = '';
    
    netArchitecture.nodes.forEach((node, index) => {
        const nodeElement = document.createElement('div');
        nodeElement.className = `node ${node.type}-node`;
        
        // Set content based on node type
        let nodeContent = '';
        const dv = getDVForNodeType(node.type);
        switch(node.type) {
            case 'password':
                nodeContent = `
                    <div class="node-content">
                        <h4>${node.name}</h4>
                        <p>Bypass DV: ${dv}</p>
                        <div class="node-controls">
                            <button onclick="prepareNodeAction('password', ${index}, ${dv})">Hack</button>
                            <button onclick="removeNode(${index})">Remove</button>
                        </div>
                    </div>
                `;
                break;
            case 'file':
                nodeContent = `
                    <div class="node-content">
                        <h4>${node.name}</h4>
                        <p>Data File: DV ${dv}</p>
                        <div class="node-controls">
                            <button onclick="prepareNodeAction('file', ${index}, ${dv})">Access</button>
                            <button onclick="removeNode(${index})">Remove</button>
                        </div>
                    </div>
                `;
                break;
            case 'control':
                nodeContent = `
                    <div class="node-content">
                        <h4>${node.name}</h4>
                        <p>${node.controlType} - DV: ${dv}</p>
                        <div class="node-controls">
                            <button onclick="prepareNodeAction('control', ${index}, ${dv})">Activate</button>
                            <button onclick="removeNode(${index})">Remove</button>
                        </div>
                    </div>
                `;
                break;
            case 'blackICE':
                nodeContent = `
                    <div class="node-content">
                        <h4>${node.stats.name}</h4>
                        <p>ATK: ${node.stats.attack} - DMG: ${node.stats.damage}</p>
                        <div class="node-controls">
                            <button onclick="engageBlackICE(${index})">Engage</button>
                            <button onclick="removeNode(${index})">Remove</button>
                        </div>
                    </div>
                `;
                break;
        }
        
        nodeElement.innerHTML = nodeContent;
        container.appendChild(nodeElement);
    });
    
    // Update architecture name
    netArchitecture.name = document.getElementById('architecture-name').value || "Corporate Server";
    
    // Update difficulty
    const difficultySelect = document.getElementById('difficulty');
    netArchitecture.difficulty = difficultySelect.value;
}

// Function to get difficulty value based on node type and architecture difficulty
function getDVForNodeType(nodeType) {
    let baseDV = 0;
    
    // Set base DV according to architecture difficulty
    switch(netArchitecture.difficulty) {
        case 'basic': baseDV = 6; break;
        case 'standard': baseDV = 8; break;
        case 'advanced': baseDV = 10; break;
        case 'blackICE': baseDV = 12; break;
        case 'custom':
            baseDV = parseInt(document.getElementById('custom-dv').value) || 8;
            break;
        default: baseDV = 8;
    }
    
    // Adjust for node type
    switch(nodeType) {
        case 'password': return baseDV;
        case 'file': return baseDV - 1;
        case 'control': return baseDV + 2;
        default: return baseDV;
    }
}

// Function to add a log entry
function addLogEntry(text, type = 'info') {
    const logEntries = document.getElementById('log-entries');
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `
        <span class="log-timestamp">[${timestamp}]</span> ${text}
    `;
    logEntries.appendChild(entry);
    logEntries.scrollTop = logEntries.scrollHeight;
    
    // Keep only the last 100 entries to prevent memory issues
    while (logEntries.children.length > 100) {
        logEntries.removeChild(logEntries.firstChild);
    }
}

// Function to remove a node from the architecture
function removeNode(index) {
    if (confirm(`Are you sure you want to remove the node "${netArchitecture.nodes[index].name}"?`)) {
        const nodeName = netArchitecture.nodes[index].name;
        const nodeType = netArchitecture.nodes[index].type;
        netArchitecture.nodes.splice(index, 1);
        renderArchitecture();
        addLogEntry(`Node "${nodeName}" (${nodeType}) removed from architecture.`, 'info');
    }
}

// Function to hack a password node
function hackNode(index, playerRoll) {
    const node = netArchitecture.nodes[index];
    if (!activeNetrunner.name) {
        addLogEntry('No active netrunner selected.', 'failure');
        return;
    }
    
    if (activeNetrunner.netActionsRemaining <= 0) {
        addLogEntry('Not enough NET Actions remaining.', 'failure');
        return;
    }
    
    // Calculate success chance using provided roll
    const dv = getDVForNodeType('password');
    const roll = playerRoll;
    const total = roll + activeNetrunner.interface;
    
    addLogEntry(`Attempting to hack ${node.name}... (DV ${dv}, Roll: ${roll} + Interface ${activeNetrunner.interface} = ${total})`, 'info');
    
    if (total >= dv) {
        addLogEntry(`Success! ${node.name} has been bypassed.`, 'success');
        // In a real implementation we might mark this node as bypassed
    } else {
        addLogEntry(`Failed to hack ${node.name}. The security system detects the intrusion attempt.`, 'failure');
        // In a real implementation this might trigger an alarm or black ICE response
    }
    
    // Consume a NET action
    activeNetrunner.netActionsRemaining--;
    updateNetrunnerDisplay();
}

// Function to access a file node
function accessFile(index, playerRoll) {
    const node = netArchitecture.nodes[index];
    if (!activeNetrunner.name) {
        addLogEntry('No active netrunner selected.', 'failure');
        return;
    }
    
    if (activeNetrunner.netActionsRemaining <= 0) {
        addLogEntry('Not enough NET Actions remaining.', 'failure');
        return;
    }
    
    // Calculate success chance using provided roll
    const dv = getDVForNodeType('file');
    const roll = playerRoll;
    const total = roll + activeNetrunner.interface;
    
    addLogEntry(`Attempting to access ${node.name}... (DV ${dv}, Roll: ${roll} + Interface ${activeNetrunner.interface} = ${total})`, 'info');
    
    if (total >= dv) {
        // Generate some random corporate data
        const dataTypes = [
            "Personal emails between executives",
            "Financial statements showing embezzlement",
            "Plans for a new cyber implant prototype",
            "Security codes for a corporate facility",
            "Blackmail material on a corporate exec",
            "Schematics for automated security systems",
            "Research data on experimental drugs",
            "Personnel files flagged for 'special handling'"
        ];
        
        const data = dataTypes[Math.floor(Math.random() * dataTypes.length)];
        addLogEntry(`Success! Accessed ${node.name}: "${data}"`, 'success');
    } else {
        addLogEntry(`Failed to access ${node.name}. The file is encrypted beyond your capabilities.`, 'failure');
    }
    
    // Consume a NET action
    activeNetrunner.netActionsRemaining--;
    updateNetrunnerDisplay();
}

// Function to activate a control node
function activateControl(index, playerRoll) {
    const node = netArchitecture.nodes[index];
    if (!activeNetrunner.name) {
        addLogEntry('No active netrunner selected.', 'failure');
        return;
    }
    
    if (activeNetrunner.netActionsRemaining <= 0) {
        addLogEntry('Not enough NET Actions remaining.', 'failure');
        return;
    }
    
    // Calculate success chance using provided roll
    const dv = getDVForNodeType('control');
    const roll = playerRoll;
    const total = roll + activeNetrunner.interface;
    
    addLogEntry(`Attempting to activate ${node.name}... (DV ${dv}, Roll: ${roll} + Interface ${activeNetrunner.interface} = ${total})`, 'info');
    
    if (total >= dv) {
        let effect = "";
        switch(node.controlType) {
            case "Door Control":
                effect = "All electronic doors in the area are now unlocked.";
                break;
            case "Elevator System":
                effect = "You can now control elevator movement throughout the building.";
                break;
            case "Security Cameras":
                effect = "You have visual access to all security camera feeds.";
                break;
            case "Automated Turrets":
                effect = "The automated turrets are now under your control.";
                break;
            case "Alarm System":
                effect = "You have disabled the alarm system in this area.";
                break;
            case "Lighting Control":
                effect = "You can manipulate all lighting systems in the area.";
                break;
            default:
                effect = `You've taken control of the ${node.controlType}.`;
        }
        
        addLogEntry(`Success! Activated ${node.name}. ${effect}`, 'success');
    } else {
        addLogEntry(`Failed to activate ${node.name}. The system rejects your commands.`, 'failure');
    }
    
    // Consume a NET action
    activeNetrunner.netActionsRemaining--;
    updateNetrunnerDisplay();
}

// Function to engage black ICE
function engageBlackICE(index) {
    const node = netArchitecture.nodes[index];
    if (!activeNetrunner.name) {
        addLogEntry('No active netrunner selected.', 'failure');
        return;
    }
    
    // Black ICE always activates, no skill check needed
    addLogEntry(`WARNING: ${node.stats.name} Black ICE has detected your presence and is attacking!`, 'attack');
    
    // Black ICE attacks the netrunner
    const attackRoll = Math.floor(Math.random() * 10) + 1; // d10 roll
    const attack = attackRoll + node.stats.attack;
    
    addLogEntry(`${node.stats.name} attacks: ${attackRoll} + ${node.stats.attack} = ${attack} vs. your Defense Programs`, 'attack');
    
    // Roll damage based on the damage formula
    let damage = 0;
    if (node.stats.damage.includes('d6')) {
        const diceCount = parseInt(node.stats.damage.charAt(0));
        for (let i = 0; i < diceCount; i++) {
            damage += Math.floor(Math.random() * 6) + 1;
        }
    } else {
        damage = parseInt(node.stats.damage) || 0;
    }
    
    // Apply the damage to the netrunner
    addLogEntry(`${node.stats.name} does ${damage} damage to your brain!`, 'attack');
    activeNetrunner.currentHP = Math.max(0, activeNetrunner.currentHP - damage);
    
    if (activeNetrunner.currentHP <= 0) {
        addLogEntry(`CRITICAL FAILURE: Your netrunner has flatlined! Brain functions terminated.`, 'failure');
    } else {
        addLogEntry(`${node.stats.name} Special Effect: ${node.stats.effect}`, 'attack');
    }
    
    // Update the display
    updateNetrunnerDisplay();
}

// Function to add custom program
function addCustomProgram(programName) {
    if (!programName) return;
    
    const programList = document.querySelector('.program-list');
    const newProgram = document.createElement('div');
    newProgram.className = 'program';
    newProgram.innerHTML = `
        <span>${programName}</span>
        <button class="use-program-btn">Use</button>
    `;
    
    // Add to list before the custom program input
    const customProgramDiv = document.querySelector('.program-custom');
    programList.insertBefore(newProgram, customProgramDiv);
    
    // Add event listener to the new use button
    newProgram.querySelector('.use-program-btn').addEventListener('click', function() {
        useProgram(programName);
    });
    
    // Add to active netrunner's programs
    activeNetrunner.programs.push(programName);
    
    addLogEntry(`Added new program: ${programName}`, 'info');
}

// Function to use a program
function useProgram(programName) {
    if (!activeNetrunner.name) {
        addLogEntry('No active netrunner selected.', 'failure');
        return;
    }
    
    if (activeNetrunner.netActionsRemaining <= 0) {
        addLogEntry('Not enough NET Actions remaining.', 'failure');
        return;
    }
    
    let effect = "";
    switch(programName.toLowerCase()) {
        case "sword":
            effect = "Deals 3d6 damage to a Black ICE program.";
            break;
        case "banhammer":
            effect = "Deals 2d6 damage to a Black ICE program and jacks it out of the NET Architecture.";
            break;
        case "worm":
            effect = "Reduces the DV of all Pathfinder, Control Node, and File checks by 2.";
            break;
        case "armor":
            effect = "Adds +2 to your Defense against Black ICE attacks.";
            break;
        case "flak":
            effect = "Can be burned to automatically avoid one Black ICE attack completely.";
            break;
        default:
            effect = "Custom program activated.";
    }
    
    addLogEntry(`Using program: ${programName}. Effect: ${effect}`, 'info');
    
    // Consume a NET action
    activeNetrunner.netActionsRemaining--;
    updateNetrunnerDisplay();
}

// Function to populate netrunner select from player characters
function populateNetrunnerSelect() {
    const netrunnerSelect = document.getElementById('netrunner-select');
    
    // Clear options except the first one
    while (netrunnerSelect.options.length > 1) {
        netrunnerSelect.options.remove(1);
    }
    
    // Get player characters from localStorage
    const playerCharacters = JSON.parse(localStorage.getItem('playerCharacters') || '[]');
    
    // Add only characters with Interface skill > 0
    playerCharacters.forEach(pc => {
        // Check if the character has Interface skill
        if (pc.interface > 0) {
            const option = document.createElement('option');
            option.value = pc.name;
            option.textContent = `${pc.name} (Interface: ${pc.interface})`;
            netrunnerSelect.appendChild(option);
        }
    });
}

// Function to set the active netrunner
function setActiveNetrunner(name) {
    // Get player characters from localStorage
    const playerCharacters = JSON.parse(localStorage.getItem('playerCharacters') || '[]');
    const character = playerCharacters.find(pc => pc.name === name);
    
    if (character) {
        activeNetrunner.name = character.name;
        activeNetrunner.interface = character.interface || 4; // Use character's interface value or default
        // Max net actions equals interface skill
        activeNetrunner.netActions = character.interface || 4;
        activeNetrunner.netActionsRemaining = character.interface || 4;
        activeNetrunner.currentHP = character.health || character.maxHealth;
        activeNetrunner.maxHP = character.maxHealth;
        
        // Update the display
        updateNetrunnerDisplay();
        
        addLogEntry(`${character.name} is now the active netrunner!`, 'info');
    } else {
        activeNetrunner.name = "";
        activeNetrunner.interface = 4;
        activeNetrunner.netActions = 4;
        activeNetrunner.netActionsRemaining = 4;
        activeNetrunner.currentHP = 25;
        activeNetrunner.maxHP = 25;
        
        // Update the display
        updateNetrunnerDisplay();
        
        addLogEntry('No netrunner selected', 'info');
    }
}

// Function to reset net actions
function resetNetActions() {
    if (!activeNetrunner.name) {
        addLogEntry('No active netrunner selected.', 'failure');
        return;
    }
    
    // Reset net actions to match interface skill
    activeNetrunner.netActionsRemaining = activeNetrunner.netActions;
    updateNetrunnerDisplay();
    addLogEntry('NET Actions reset.', 'success');
}

// Function to update the netrunner display
function updateNetrunnerDisplay() {
    document.getElementById('interface-value').textContent = activeNetrunner.interface;
    document.getElementById('net-actions-remaining').textContent = activeNetrunner.netActionsRemaining;
    document.getElementById('net-actions-total').textContent = activeNetrunner.netActions;
    document.getElementById('runner-hp').textContent = activeNetrunner.currentHP;
    document.getElementById('runner-max-hp').textContent = activeNetrunner.maxHP;
}

// Function to save the current architecture
function saveArchitecture() {
    const name = document.getElementById('architecture-name').value || "Corporate Server";
    netArchitecture.name = name;
    
    // Get existing saved architectures
    const savedArchitectures = JSON.parse(localStorage.getItem('netArchitectures') || '[]');
    
    // Check if this one already exists
    const existingIndex = savedArchitectures.findIndex(a => a.name === name);
    if (existingIndex >= 0) {
        if (!confirm(`An architecture with the name "${name}" already exists. Overwrite it?`)) {
            return;
        }
        savedArchitectures[existingIndex] = netArchitecture;
    } else {
        savedArchitectures.push(netArchitecture);
    }
    
    // Save back to localStorage
    localStorage.setItem('netArchitectures', JSON.stringify(savedArchitectures));
    addLogEntry(`Architecture "${name}" saved successfully.`, 'success');
}

// Function to load an architecture
function loadArchitecture() {
    const savedArchitectures = JSON.parse(localStorage.getItem('netArchitectures') || '[]');
    
    if (savedArchitectures.length === 0) {
        addLogEntry("No saved architectures found.", 'failure');
        return;
    }
    
    // Create a modal dialog to select which architecture to load
    const modal = document.createElement('div');
    modal.className = 'net-modal';
    modal.innerHTML = `
        <div class="net-modal-content">
            <h3>Select Architecture to Load</h3>
            <select id="architecture-select">
                ${savedArchitectures.map(arch => `
                    <option value="${arch.name}">${arch.name}</option>
                `).join('')}
            </select>
            <div class="modal-buttons">
                <button id="load-btn" class="neon-button load-btn">Load</button>
                <button id="cancel-btn" class="neon-button">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners for the buttons
    document.getElementById('load-btn').addEventListener('click', function() {
        const selectedName = document.getElementById('architecture-select').value;
        const selected = savedArchitectures.find(a => a.name === selectedName);
        
        if (selected) {
            netArchitecture = selected;
            document.getElementById('architecture-name').value = selected.name;
            document.getElementById('difficulty').value = selected.difficulty;
            
            renderArchitecture();
            addLogEntry(`Architecture "${selected.name}" loaded successfully.`, 'success');
        }
        
        document.body.removeChild(modal);
    });
    
    document.getElementById('cancel-btn').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
}

// Function to clear the current architecture
function clearArchitecture() {
    netArchitecture.nodes = [];
    renderArchitecture();
    addLogEntry("Architecture cleared.", 'info');
}

// Function to initialize the netrunner interface
function initializeNetInterface() {
    // Set up initial state
    renderArchitecture();
    setActiveNetrunner("");
    addLogEntry("Netrunner interface initialized. Welcome to the NET, Runner.", 'info');
}

// Function to generate a random architecture
function generateRandomArchitecture() {
    const difficulty = document.getElementById('random-difficulty').value;
    const archType = document.getElementById('architecture-type').value;
    
    // Clear existing architecture
    netArchitecture.nodes = [];
    
    // Set difficulty
    netArchitecture.difficulty = difficulty;
    
    // Generate name
    const template = ARCHITECTURE_TEMPLATES[archType];
    const prefix = template.namePrefix[Math.floor(Math.random() * template.namePrefix.length)];
    const suffix = template.nameSuffix[Math.floor(Math.random() * template.nameSuffix.length)];
    netArchitecture.name = `${prefix} ${suffix}`;
    document.getElementById('architecture-name').value = netArchitecture.name;
    
    // Determine number of floors (3d6 as per the rulebook)
    const floors = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 3;
    
    // Add a password to the first floor
    addNodeToArchitecture('password', `Password Layer 1`, null);
    
    // Populate remaining floors
    for (let i = 1; i < floors; i++) {
        const roll = Math.random();
        
        // Every floor needs something
        if (roll < template.fileProbability) {
            // Add a file
            const fileName = template.files[Math.floor(Math.random() * template.files.length)];
            addNodeToArchitecture('file', `File: ${fileName}`, null);
        } else if (roll < template.fileProbability + template.controlProbability) {
            // Add a control node
            const controlType = template.controls[Math.floor(Math.random() * template.controls.length)];
            addNodeToArchitecture('control', `Control: ${controlType}`, null);
        }
        
        // Add password or Black ICE with certain probability
        const securityRoll = Math.random();
        if (securityRoll < 0.3) {
            // Add a password
            addNodeToArchitecture('password', `Password Layer ${i + 1}`, null);
        } else if (securityRoll < 0.3 + template.blackICEProbability) {
            // Add Black ICE
            const blackICETypes = Object.keys(BLACK_ICE_TYPES);
            const blackICEType = blackICETypes[Math.floor(Math.random() * blackICETypes.length)];
            addNodeToArchitecture('blackICE', null, blackICEType);
        }
    }
    
    // Render the architecture
    renderArchitecture();
    addLogEntry(`Generated random ${difficulty} ${archType} architecture with ${netArchitecture.nodes.length} nodes`, 'info');
}

// Function to export the architecture
function exportArchitecture() {
    const architectureData = JSON.stringify(netArchitecture, null, 2);
    document.getElementById('export-json').value = architectureData;
    document.getElementById('modal-title').textContent = 'Export Architecture';
    document.getElementById('architecture-modal').style.display = 'block';
    addLogEntry(`Architecture "${netArchitecture.name}" prepared for export`, 'info');
}

// Function to import an architecture
function importArchitecture(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedArchitecture = JSON.parse(e.target.result);
            
            // Basic validation
            if (!importedArchitecture.nodes || !Array.isArray(importedArchitecture.nodes)) {
                throw new Error('Invalid architecture format');
            }
            
            netArchitecture = importedArchitecture;
            document.getElementById('architecture-name').value = netArchitecture.name;
            document.getElementById('difficulty').value = netArchitecture.difficulty || 'standard';
            
            renderArchitecture();
            addLogEntry(`Architecture "${netArchitecture.name}" imported successfully`, 'success');
        } catch (error) {
            addLogEntry(`Failed to import architecture: ${error.message}`, 'failure');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

// Add these functions to update the UI with target DV values
function updateTargetDV(nodeType) {
    const dv = getDVForNodeType(nodeType);
    document.getElementById('target-dv').value = dv;
    updateRollTotal();
}

function updateRollTotal() {
    const playerRoll = parseInt(document.getElementById('player-roll').value) || 0;
    const interfaceValue = activeNetrunner.interface || 0;
    const targetDV = parseInt(document.getElementById('target-dv').value) || 0;
    
    const total = playerRoll + interfaceValue;
    const result = total >= targetDV ? "SUCCESS" : "FAILURE";
    const resultClass = total >= targetDV ? "success" : "failure";
    
    document.getElementById('roll-total').textContent = `${playerRoll} + ${interfaceValue} = ${total}`;
    document.getElementById('roll-result').textContent = result;
    document.getElementById('roll-result').className = `log-${resultClass}`;
    
    return { total, success: total >= targetDV };
}

// New function to prepare for node interaction
function prepareNodeAction(nodeType, index, dv) {
    // First check if we have an active netrunner
    if (!activeNetrunner.name) {
        addLogEntry('No active netrunner selected.', 'failure');
        return;
    }
    
    if (activeNetrunner.netActionsRemaining <= 0) {
        addLogEntry('Not enough NET Actions remaining.', 'failure');
        return;
    }
    
    // Update target DV field
    updateTargetDV(nodeType);
    
    // Clear previous roll input
    document.getElementById('player-roll').value = '';
    
    // Add a handler for the roll input
    const rollInput = document.getElementById('player-roll');
    rollInput.onchange = function() {
        updateRollTotal();
    };
    
    // Add a confirmation button to the roll section
    const rollContainer = document.querySelector('.roll-input-container');
    
    // Remove any existing confirm button
    const existingButton = document.getElementById('confirm-roll-btn');
    if (existingButton) {
        existingButton.remove();
    }
    
    const confirmButton = document.createElement('button');
    confirmButton.id = 'confirm-roll-btn';
    confirmButton.className = 'neon-button';
    confirmButton.textContent = 'Confirm Roll';
    confirmButton.onclick = function() {
        const roll = parseInt(document.getElementById('player-roll').value);
        if (isNaN(roll) || roll < 1 || roll > 10) {
            addLogEntry('Please enter a valid roll between 1 and 10.', 'failure');
            return;
        }
        
        // Execute the appropriate action based on node type
        switch(nodeType) {
            case 'password':
                hackNode(index, roll);
                break;
            case 'file':
                accessFile(index, roll);
                break;
            case 'control':
                activateControl(index, roll);
                break;
        }
        
        // Clear the roll input and remove the confirmation button
        document.getElementById('player-roll').value = '';
        confirmButton.remove();
    };
    
    rollContainer.appendChild(confirmButton);
    
    // Scroll to the roll input area and focus it
    rollInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    rollInput.focus();
    
    addLogEntry(`Preparing to interact with ${netArchitecture.nodes[index].name}. Enter player's roll.`, 'info');
}

