class Participant {
    constructor(name, base, maxHealth, roll, total, health, bodyArmor, headArmor, shield, weapons, criticalInjuries = []) {
        this.name = name;
        this.base = parseInt(base);
        this.maxHealth = parseInt(maxHealth) || 0;
        this.roll = roll || 0;
        this.total = total || (this.base + this.roll);
        this.health = health || this.maxHealth;
        this.hasRolled = false;
        this.bodyArmor = bodyArmor || 0;
        this.headArmor = headArmor || 0;
        this.shield = shield || 0;
        this.shieldActive = false;
        this.weapons = weapons || [];
        this.criticalInjuries = criticalInjuries;
        this.cover = null; // { type: string, hp: number, maxHp: number }
        this.humanShield = null; // Store reference to participant being used as shield
        this.isGrappling = false;
    }

    rollInitiative() {
        this.roll = Math.floor(Math.random() * 10) + 1;
        this.total = this.base + this.roll;
        this.hasRolled = true;
        return this;
    }

    setManualInitiative(total) {
        this.total = parseInt(total);
        this.roll = this.total - this.base;
        this.hasRolled = true;
        return this;
    }

    resetInitiative() {
        this.roll = 0;
        this.total = this.base;
        this.hasRolled = false;
        return this;
    }

    toggleShield() {
        this.shieldActive = !this.shieldActive;
        return this;
    }

    getEffectiveArmor(location) {
        let baseArmor = location === 'head' ? this.headArmor : this.bodyArmor;
        // Instead of adding shield SP to base armor, return the higher of the two when shield is active
        return this.shieldActive ? Math.max(baseArmor, this.shield) : baseArmor;
    }

    takeCover(coverType) {
        if (!COVER_TYPES[coverType]) return false;
        const cover = COVER_TYPES[coverType];
        this.cover = {
            type: coverType,
            hp: cover.hp,
            maxHp: cover.hp
        };
        return true;
    }

    leaveCover() {
        this.cover = null;
    }

    damageCurrentCover(damage) {
        if (!this.cover) return;
        this.cover.hp = Math.max(0, this.cover.hp - damage);
        if (this.cover.hp === 0) {
            this.cover = null;
        }
    }

    takeHumanShield(target) {
        if (this.humanShield || this.cover || 
            target.health <= 0 || target.humanShield ||
            this.weapons.some(w => w.name === 'Shield')) {
            return false;
        }
        
        this.humanShield = target.name;
        this.isGrappling = true;
        return true;
    }

    releaseHumanShield() {
        if (!this.humanShield) return;
        
        const encounter = encounters.find(e => 
            e.participants.some(p => p.name === this.humanShield)
        );
        
        if (!encounter) return;
        
        const humanShield = encounter.participants.find(p => 
            p.name === this.humanShield
        );
        
        if (humanShield) {
            if (humanShield.health <= 0) {
                // Convert to corpse shield with half maxHealth
                this.cover = {
                    type: "Corpse Shield",
                    hp: Math.floor(humanShield.maxHealth / 2),
                    maxHp: Math.floor(humanShield.maxHealth / 2)
                };
            }
        }
        
        this.humanShield = null;
        this.isGrappling = false;
    }

    getHumanShieldUsers() {
        return encounters.flatMap(e => 
            e.participants.filter(p => 
                p.humanShield === this.name && p.health > 0
            )
        );
    }

    toJSON() {
        return {
            name: this.name,
            base: this.base,
            maxHealth: this.maxHealth,
            roll: this.roll,
            total: this.total,
            health: this.health,
            hasRolled: this.hasRolled,
            bodyArmor: this.bodyArmor,
            headArmor: this.headArmor,
            shield: this.shield,
            shieldActive: this.shieldActive,
            weapons: this.weapons,
            criticalInjuries: this.criticalInjuries,
            cover: this.cover,
            humanShield: this.humanShield
        };
    }
}

class Encounter {
    constructor(id, name) {
        this.id = id;
        this.name = name || `Encounter ${id}`;
        this.participants = [];
        this.active = false;
        this.currentRound = 0;
        this.currentTurn = -1;
        this.selected = false;
    }

    addParticipant(name, base, maxHealth, bodyArmor, headArmor, shield, weapons) {
        const participant = new Participant(name, base, maxHealth, 0, 0, maxHealth, bodyArmor, headArmor, shield, weapons);
        this.participants.push(participant);
        this.sortParticipants();
        this.render();
    }

    sortParticipants() {
        this.participants.sort((a, b) => b.total - a.total);
    }

    rollAllInitiative() {
        this.participants.forEach(p => p.resetInitiative().rollInitiative());
        this.sortParticipants();
        this.render();
    }

    startEncounter() {
        this.active = true;
        this.currentRound = 1;
        this.currentTurn = 0;
        this.render();
    }

    endEncounter() {
        this.active = false;
        this.currentRound = 0;
        this.currentTurn = -1;
        this.participants.forEach(p => p.resetInitiative());
        this.render();
    }

    nextTurn() {
        if (!this.active) return;

        let attempts = 0;
        const maxAttempts = this.participants.length; // Prevent infinite loops

        while (attempts < maxAttempts) {
            this.currentTurn++;
            if (this.currentTurn >= this.participants.length) {
                this.currentTurn = 0;
                this.currentRound++;
            }

            if (this.participants[this.currentTurn].health > 0) {
                // Found a living participant
                break;
            }

            attempts++;
        }

        // If all participants are flatlined, currentTurn will loop back to 0 after maxAttempts
        if (attempts >= maxAttempts) {
            // Optionally, handle the case where all participants are flatlined
            console.log("All participants are flatlined or incapacitated.");
        }

        this.render();
    }

    render() {
        const encounterDiv = document.getElementById(`encounter-${this.id}`);
        if (!encounterDiv) return;

        encounterDiv.className = `encounter ${this.selected ? 'selected' : ''}`;
        encounterDiv.innerHTML = `
            <div class="encounter-select-wrapper">
                <input type="checkbox" id="select-${this.id}" 
                       ${this.selected ? 'checked' : ''} 
                       onchange="toggleEncounterSelection(${this.id})">
                <label for="select-${this.id}">Select Encounter</label>
            </div>
            <h3>${this.name}</h3>
            <div class="controls-group">
                <label>Create Custom NPC</label>
                <div class="import-export-controls">
                    <input type="text" id="name-${this.id}" placeholder="Participant Name">
                    <input type="number" id="base-${this.id}" placeholder="Base Initiative">
                    <input type="number" id="maxHealth-${this.id}" placeholder="Max Health">
                    <input type="number" id="bodyArmor-${this.id}" placeholder="Body SP">
                    <input type="number" id="headArmor-${this.id}" placeholder="Head SP">
                    <input type="number" id="shield-${this.id}" placeholder="Shield SP">
                    <button onclick="addParticipantToEncounter(${this.id})">Add Participant</button>
                </div>
                <label>Encounter Controls</label>
                <div class="encounter-controls">
                    <button onclick="rollInitiativeForEncounter(${this.id})">Roll All Initiative</button>
                    <button onclick="removeEncounter(${this.id})">Remove Encounter</button>
                    ${!this.active ? 
                        `<button onclick="startEncounter(${this.id})">Start Encounter</button>` :
                        `<button onclick="endEncounter(${this.id})">End Encounter</button>`
                    }
                </div>
            </div>
            <label>Add NPC Preset</label>
            <div class="npc-controls">
                <select id="npc-type-${this.id}">
                    ${Object.keys(NPC_PRESETS).map(type => `<option value="${type}">${type}</option>`).join('')}
                </select>
                <input type="number" id="npc-count-${this.id}" min="1" value="1" placeholder="Count">
                <button onclick="addNPCsToEncounter(${this.id})">Add NPCs</button>
            </div>
            ${this.active ? `
                <div class="round-counter">
                    Round: ${this.currentRound}
                    <button onclick="nextTurn(${this.id})">Next Turn</button>
                </div>
            ` : ''}
            <div class="participants">
                ${this.participants.map((p, index) => {
                    const weaponsDisplay = p.weapons && p.weapons.length > 0 ? 
                        `<div class="npc-details">Weapons: ${p.weapons.map(w => `${w.name} (${w.damage})`).join(', ')}</div>` : '';
                    
                    const effectiveBodyArmor = p.getEffectiveArmor('body');
                    const effectiveHeadArmor = p.getEffectiveArmor('head');

                    const humanShieldedBy = this.participants.find(attacker => attacker.humanShield === p.name);
                    const isBeingUsedAsShield = !!humanShieldedBy;
                    
                    return `
                    <div class="participant ${this.active && index === this.currentTurn ? 'active-participant' : ''} ${p.health <= 0 ? 'flatlined' : ''} ${isBeingUsedAsShield ? 'using-human-shield' : ''}">
                        <div class="participant-name">${p.name} ${p.health <= 0 ? '(FLATLINED)' : ''}</div>
                        
                        <div class="participant-stats">
                            <div class="stat-item">Base: ${p.base}</div>
                            <div class="stat-item">Roll: ${p.roll}</div>
                            <div class="stat-item">Total: ${p.total}</div>
                            <div class="stat-item">HP: ${p.health}/${p.maxHealth}</div>
                            <div class="stat-item">Body SP: ${effectiveBodyArmor}</div>
                            <div class="stat-item">Head SP: ${effectiveHeadArmor}</div>
                            ${p.shield > 0 ? `<div class="stat-item">Shield: ${p.shield} [${p.shieldActive ? 'Active' : 'Inactive'}]</div>` : ''}
                        </div>
                        
                        ${weaponsDisplay}

                        <div class="critical-injuries">
                            ${p.criticalInjuries.map(injury => `
                                <div>
                                    <span class="critical-injury">
                                        ${injury.name}
                                        <button onclick="removeCriticalInjury('${p.name}', ${p.criticalInjuries.indexOf(injury)}, false)">×</button>
                                    </span>
                                    <div class="injury-description">
                                        ${injury.description}
                                        ${injury.autoApplied ? '<div class="auto-crit-message">(Automatically applied at 0 HP)</div>' : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ${p.health <= 0 && playerCharacters.some(pc => pc.name === p.name) ? `
                            <div class="death-saves">
                                <span class="death-save-counter">Death Save Penalty: ${p.deathSavePenalty || 0}</span>
                                <div class="death-save-buttons">
                                    <button onclick="recordDeathSave(${this.id}, '${p.name}', true)">Record Success</button>
                                    <button onclick="recordDeathSave(${this.id}, '${p.name}', false)">Record Failure</button>
                                    <button onclick="adjustDeathSavePenalty(${this.id}, '${p.name}', 1)">+1 Penalty</button>
                                    <button onclick="adjustDeathSavePenalty(${this.id}, '${p.name}', -1)">-1 Penalty</button>
                                </div>
                            </div>
                        ` : ''}
                        <div class="cover-controls">
                            ${p.cover ? `
                                <div class="current-cover">
                                    In cover: ${p.cover.type} (${p.cover.hp}/${p.cover.maxHp} HP)
                                    <button onclick="leaveCover(${this.id}, '${p.name}')">Leave Cover</button>
                                </div>
                            ` : `
                                <select id="cover-type-${this.id}-${p.name}">
                                    <option value="">Select Cover</option>
                                    ${Object.keys(COVER_TYPES).map(type => 
                                        `<option value="${type}">${type} (${COVER_TYPES[type].hp} HP)</option>`
                                    ).join('')}
                                </select>
                                <button onclick="takeCover(${this.id}, '${p.name}')">Take Cover</button>
                            `}
                            ${!p.cover && !p.humanShield && !isBeingUsedAsShield ? `
                                <select id="human-shield-${this.id}-${p.name}">
                                    <option value="">Select Human Shield</option>
                                    ${this.participants.filter(target => 
                                        target.name !== p.name && target.health > 0 && !target.humanShield && !this.participants.find(attacker => attacker.humanShield === target.name)
                                    ).map(target => 
                                        `<option value="${target.name}">${target.name}</option>`
                                    ).join('')}
                                </select>
                                <button onclick="takeHumanShield(${this.id}, '${p.name}')">Take Human Shield</button>
                            ` : ''}
                            ${p.humanShield ? `
                                <div class="human-shield">
                                    Using ${this.participants.find(hs => hs.name === p.humanShield)?.name || 'Unknown'} as human shield
                                    <button onclick="releaseHumanShield(${this.id}, '${p.name}')">Release</button>
                                </div>
                            ` : ''}
                        </div>
                        <div class="character-actions">
                            <div class="health-tracker">
                                <select id="hit-location-${this.id}-${p.name}">
                                    <option value="body">Body</option>
                                    <option value="head">Head</option>
                                </select>
                                <input type="number" class="damage-input" id="damage-${this.id}-${p.name}" placeholder="Amount">
                                <button onclick="applyDamage(${this.id}, '${p.name}')">Damage</button>
                                <button onclick="applyHealing(${this.id}, '${p.name}')">Heal</button>
                                ${p.shield > 0 ? `
                                    <button class="shield-toggle ${p.shieldActive ? 'shield-active' : ''}" 
                                          onclick="toggleShield(${this.id}, '${p.name}')">
                                        ${p.shieldActive ? 'Deactivate Shield' : 'Activate Shield'}
                                    </button>
                                ` : ''}
                            </div>
                            
                            <div class="initiative-controls">
                                <input type="number" class="initiative-input" id="initiative-${this.id}-${p.name}" placeholder="Total">
                                <button onclick="setManualInitiative(${this.id}, '${p.name}')">Set Initiative</button>
                                <button onclick="rollIndividualInitiative(${this.id}, '${p.name}')">Roll Initiative</button>
                                <button onclick="resetInitiative(${this.id}, '${p.name}')">Reset Initiative</button>
                            </div>
                            <div>
                                <select id="critical-injury-select-${this.id}-${p.name}">
                                    ${Object.keys(CRITICAL_INJURIES).map(location => `
                                        <optgroup label="${location}">
                                            ${CRITICAL_INJURIES[location].map(injury => `
                                                <option value="${injury.name}">${injury.name}</option>
                                            `).join('')}
                                        </optgroup>
                                    `).join('')}
                                </select>
                                <button onclick="applyCriticalInjury(${this.id}, '${p.name}')">Apply Critical Injury</button>
                            </div>
                            <button onclick="removeParticipant(${this.id}, '${p.name}')">Remove</button>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            participants: this.participants.map(p => p.toJSON()),
            active: this.active,
            currentRound: this.currentRound,
            currentTurn: this.currentTurn
        };
    }
}

let encounters = [];
let encounterCounter = 1;
let playerCharacters = [];

class PlayerCharacter {
    constructor(name, base, maxHealth, bodyArmor, headArmor, shield, criticalInjuries = []) {
        this.name = name;
        this.base = parseInt(base);
        this.maxHealth = parseInt(maxHealth);
        this.bodyArmor = bodyArmor || 0;
        this.headArmor = headArmor || 0;
        this.shield = shield || 0;
        this.shieldActive = false;
        this.health = parseInt(maxHealth);
        this.criticalInjuries = criticalInjuries;
    }

    toJSON() {
        return {
            name: this.name,
            base: this.base,
            maxHealth: this.maxHealth,
            health: this.health,
            bodyArmor: this.bodyArmor,
            headArmor: this.headArmor,
            shield: this.shield,
            shieldActive: this.shieldActive,
            criticalInjuries: this.criticalInjuries
        };
    }
}

function createNewEncounter() {
    const nameInput = document.getElementById('new-encounter-name');
    const name = nameInput.value || `Encounter ${encounterCounter}`;
    const encounter = new Encounter(encounterCounter++, name);
    encounters.push(encounter);
    
    const encountersDiv = document.getElementById('encounters');
    const newEncounterDiv = document.createElement('div');
    newEncounterDiv.id = `encounter-${encounter.id}`;
    newEncounterDiv.className = 'encounter';
    encountersDiv.appendChild(newEncounterDiv);
    
    encounter.render();
    localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
    localStorage.setItem('encounterCounter', encounterCounter.toString());
    nameInput.value = '';
}

function addParticipantToEncounter(encounterId) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (!encounter) return;

    const nameInput = document.getElementById(`name-${encounterId}`);
    const baseInput = document.getElementById(`base-${encounterId}`);
    const maxHealthInput = document.getElementById(`maxHealth-${encounterId}`);
    const bodyArmorInput = document.getElementById(`bodyArmor-${encounterId}`);
    const headArmorInput = document.getElementById(`headArmor-${encounterId}`);
    const shieldInput = document.getElementById(`shield-${encounterId}`);
    
    if (nameInput.value && baseInput.value && maxHealthInput.value) {
        encounter.addParticipant(
            nameInput.value, 
            baseInput.value, 
            maxHealthInput.value,
            bodyArmorInput.value || 0,
            headArmorInput.value || 0,
            shieldInput.value || 0,
            []
        );
        nameInput.value = '';
        baseInput.value = '';
        maxHealthInput.value = '';
        bodyArmorInput.value = '';
        headArmorInput.value = '';
        shieldInput.value = '';
        localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
    }
}

function addNPCsToEncounter(encounterId) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (!encounter) return;

    const npcTypeSelect = document.getElementById(`npc-type-${encounterId}`);
    const npcCountInput = document.getElementById(`npc-count-${encounterId}`);
    const npcType = npcTypeSelect.value;
    const npcCount = parseInt(npcCountInput.value) || 1;
    
    if (NPC_PRESETS[npcType]) {
        const preset = NPC_PRESETS[npcType];
        
        for (let i = 0; i < npcCount; i++) {
            const namePrefix = preset.namePrefixes[Math.floor(Math.random() * preset.namePrefixes.length)];
            const nameSuffix = preset.namePool[Math.floor(Math.random() * preset.namePool.length)];
            const name = `${namePrefix} ${nameSuffix}`;
            
            encounter.addParticipant(
                name,
                preset.baseInitiative,
                preset.maxHealth,
                preset.bodyArmor || 0,
                preset.headArmor || 0,
                preset.shield || 0,
                []
            );
        }
        
        localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
    }
}

function savePlayerCharacter() {
    const nameInput = document.getElementById('pc-name');
    const baseInput = document.getElementById('pc-base');
    const maxHealthInput = document.getElementById('pc-maxHealth');
    const bodyArmorInput = document.getElementById('pc-bodyArmor');
    const headArmorInput = document.getElementById('pc-headArmor');
    const shieldInput = document.getElementById('pc-shield');
    
    if (nameInput.value && baseInput.value && maxHealthInput.value) {
        const pc = new PlayerCharacter(
            nameInput.value,
            baseInput.value,
            maxHealthInput.value,
            bodyArmorInput.value || 0,
            headArmorInput.value || 0,
            shieldInput.value || 0
        );
        
        // Check if PC with same name exists and replace it
        const existingIndex = playerCharacters.findIndex(p => p.name === pc.name);
        if (existingIndex !== -1) {
            playerCharacters[existingIndex] = pc;
        } else {
            playerCharacters.push(pc);
        }
        
        localStorage.setItem('playerCharacters', JSON.stringify(playerCharacters.map(p => p.toJSON())));
        renderPlayerCharacterList();
        
        // Clear inputs
        nameInput.value = '';
        baseInput.value = '';
        maxHealthInput.value = '';
        bodyArmorInput.value = '';
        headArmorInput.value = '';
        shieldInput.value = '';
    }
}


function renderPlayerCharacterList() {
    const pcListDiv = document.getElementById('pc-list');
    if (!pcListDiv) return;
    
    const hasSelectedEncounters = encounters.some(e => e.selected);
    
    pcListDiv.innerHTML = playerCharacters.map(pc => `
        <div class="participant">
            <span>${pc.name}</span>
            <span>Base: ${pc.base}</span>
            <span>HP: ${pc.health || pc.maxHealth}/${pc.maxHealth}</span>
            <span>Body SP: ${pc.bodyArmor}</span>
            <span>Head SP: ${pc.headArmor}</span>
            ${pc.shield > 0 ? `
                <span>Shield SP: ${pc.shield} [${pc.shieldActive ? 'Active' : 'Inactive'}]</span>
                <button class="shield-toggle ${pc.shieldActive ? 'shield-active' : ''}" 
                        onclick="togglePlayerCharacterShield('${pc.name}')">
                    ${pc.shieldActive ? 'Deactivate Shield' : 'Activate Shield'}
                </button>
            ` : ''}
            <div class="critical-injuries">
                ${pc.criticalInjuries.map((injury, index) => `
                    <div>
                        <span class="critical-injury">
                            ${injury.name}
                            <button onclick="removeCriticalInjury('${pc.name}', ${index}, true)">×</button>
                        </span>
                        <div class="injury-description">
                            ${injury.description}
                            ${injury.autoApplied ? '<div class="auto-crit-message">(Automatically applied at 0 HP)</div>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="player-actions">
                <button onclick="deletePlayerCharacter('${pc.name}')">Delete</button>
                <button onclick="addPlayerCharacterToEncounter('${pc.name}')"
                        ${!hasSelectedEncounters ? 'disabled' : ''}
                        style="background-color: ${hasSelectedEncounters ? '#f88' : '#772'}">
                    Add to Selected Encounters ${hasSelectedEncounters ? '' : '(Select encounters first)'}
                </button>
            </div>
        </div>
    `).join('');
}

function togglePlayerCharacterShield(name) {
    const pc = playerCharacters.find(p => p.name === name);
    if (pc) {
        pc.shieldActive = !pc.shieldActive;
        localStorage.setItem('playerCharacters', JSON.stringify(playerCharacters.map(p => p.toJSON())));
        renderPlayerCharacterList();
    }
}

function deletePlayerCharacter(name) {
    playerCharacters = playerCharacters.filter(pc => pc.name !== name);
    localStorage.setItem('playerCharacters', JSON.stringify(playerCharacters.map(p => p.toJSON())));
    renderPlayerCharacterList();
}

function addPlayerCharacterToEncounter(name) {
    const selectedEncounters = encounters.filter(e => e.selected);
    if (selectedEncounters.length === 0) {
        return; // Silently return if no encounters selected
    }
    
    const pc = playerCharacters.find(p => p.name === name);
    if (pc) {
        selectedEncounters.forEach(encounter => {
            // Only add if the PC isn't already in the encounter
            if (!encounter.participants.some(p => p.name === pc.name)) {
                const participant = new Participant(
                    pc.name,
                    pc.base,
                    pc.maxHealth,
                    0,
                    pc.base,
                    pc.health || pc.maxHealth,
                    pc.bodyArmor,
                    pc.headArmor,
                    pc.shield,
                    [],
                    pc.criticalInjuries
                );
                participant.shieldActive = pc.shieldActive;
                encounter.participants.push(participant);
                encounter.sortParticipants();
                encounter.render();
            }
        });
        localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
    }
}

function removeParticipant(encounterId, participantName) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        encounter.participants = encounter.participants.filter(p => p.name !== participantName);
        encounter.render();
        localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
    }
}

function removeEncounter(encounterId) {
    encounters = encounters.filter(e => e.id !== encounterId);
    const encounterDiv = document.getElementById(`encounter-${encounterId}`);
    if (encounterDiv) {
        encounterDiv.remove();
    }
    localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
}

function rollInitiativeForEncounter(encounterId) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        encounter.rollAllInitiative();
        localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
    }
}

function rollIndividualInitiative(encounterId, participantName) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        const participant = encounter.participants.find(p => p.name === participantName);
        if (participant) {
            participant.resetInitiative().rollInitiative();
            encounter.sortParticipants();
            encounter.render();
            localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
        }
    }
}

function resetInitiative(encounterId, participantName) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        const participant = encounter.participants.find(p => p.name === participantName);
        if (participant) {
            participant.resetInitiative();
            encounter.sortParticipants();
            encounter.render();
            localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
        }
    }
}

function toggleShield(encounterId, participantName) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        const participant = encounter.participants.find(p => p.name === participantName);
        if (participant) {
            participant.toggleShield();
            
            // Update the corresponding player character in the manager
            updatePlayerCharacterState(participant);
            
            encounter.render();
            localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
        }
    }
}

function setManualInitiative(encounterId, participantName) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        const participant = encounter.participants.find(p => p.name === participantName);
        const initiativeInput = document.getElementById(`initiative-${encounterId}-${participantName}`);
        if (participant && initiativeInput.value) {
            participant.setManualInitiative(initiativeInput.value);
            encounter.sortParticipants();
            encounter.render();
            localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
        }
    }
}

function applyDamage(encounterId, participantName) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (!encounter) return;
    
    const participant = encounter.participants.find(p => p.name === participantName);
    const damageInput = document.getElementById(`damage-${encounterId}-${participantName}`);
    const locationSelect = document.getElementById(`hit-location-${encounterId}-${participantName}`);
    
    if (!participant || !damageInput.value) return;

    let incomingDamage = parseInt(damageInput.value);
    const location = locationSelect.value;

    // Find if someone is using this participant as a human shield
    const shieldUser = encounter.participants.find(p => 
        p.humanShield === participant.name
    );

    if (shieldUser) {
        // This participant is being used as a human shield
        applyDamageToParticipant(participant, incomingDamage, location, encounter, shieldUser);
    } else if (participant.humanShield) {
        // This participant is using someone as a shield
        // Apply damage to the human shield instead
		const humanShield = encounter.participants.find(p => p.name === participant.humanShield);
		if (!humanShield) {
			participant.releaseHumanShield();
			encounter.render();
			localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
			return;
		}
		const damageToShield = incomingDamage;
		
		applyDamageToParticipant(humanShield, damageToShield, location, encounter);
		
        damageInput.value = '';
        encounter.render();
        localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
        return;
    } else {
        // Normal damage application
        applyDamageToParticipant(participant, incomingDamage, location, encounter);
    }

    damageInput.value = '';
    encounter.render();
    localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
}

// Helper function to handle the actual damage application
function applyDamageToParticipant(participant, incomingDamage, location, encounter, damageSource = null) {
    const originalHealth = participant.health;
    let remainingDamage = incomingDamage;

    const shieldUsers = participant.getHumanShieldUsers();
    
    if (shieldUsers.length > 0 && damageSource && damageSource.rangeType === 'RANGED' && location !== 'head') {
        const shieldUser = shieldUsers[0];
        remainingDamage = applyHumanShieldDamage(participant, shieldUser, remainingDamage, location, encounter);
    } else {
        remainingDamage = applyStandardDamage(participant, remainingDamage, location);
    }

    if (participant.health <= 0) {
        handleParticipantDeath(participant, encounter);
        
        shieldUsers.forEach(shieldUser => {
            shieldUser.releaseHumanShield();
            
            const overflow = Math.abs(participant.health);
            if (overflow > 0) {
                applyDamageToParticipant(
                    shieldUser,
                    overflow,
                    location,
                    encounter,
                    { rangeType: 'OVERRUN', source: participant.name }
                );
            }
        });
    }

    updatePlayerCharacterState(participant);
}

function applyHumanShieldDamage(target, shieldUser, damage, location, encounter) {
    let remainingDamage = damage;
    
    remainingDamage = applyStandardDamage(target, remainingDamage, location);
    
    if (target.health <= 0) {
        shieldUser.releaseHumanShield();
        
        if (remainingDamage > 0) {
            applyStandardDamage(shieldUser, remainingDamage, location);
        }
    }
    
    return 0;
}

function applyStandardDamage(participant, damage, location) {
    let remainingDamage = damage;
    
    if (participant.cover) {
        const coverDamage = Math.min(remainingDamage, participant.cover.hp);
        participant.cover.hp -= coverDamage;
        remainingDamage -= coverDamage;
        
        if (participant.cover.hp <= 0) {
            participant.cover = null;
        }
    }
    
    if (remainingDamage > 0 && participant.shieldActive && participant.shield > 0) {
        const shieldProtection = Math.min(remainingDamage, participant.shield);
        participant.shield -= shieldProtection;
        remainingDamage -= shieldProtection;
        
        if (participant.shield <= 0) {
            participant.shieldActive = false;
        }
    }
    
    if (remainingDamage > 0) {
        const armor = location === 'head' ? participant.headArmor : participant.bodyArmor;
        
        if (remainingDamage >= armor) {
            const effectiveDamage = remainingDamage - armor;
            participant.health = Math.max(-participant.maxHealth, participant.health - effectiveDamage);
            
            if (location === 'head') {
                participant.headArmor = Math.max(0, participant.headArmor - 1);
            } else {
                participant.bodyArmor = Math.max(0, participant.bodyArmor - 1);
            }
            
            remainingDamage = 0;
        } else {
            remainingDamage = 0;
        }
    }
    
    return remainingDamage;
}

function handleParticipantDeath(participant, encounter) {
    const criticalInjury = rollCriticalInjury('Body');
    if (criticalInjury && !participant.criticalInjuries.some(ci => ci.name === criticalInjury.name)) {
        participant.criticalInjuries.push({ ...criticalInjury, autoApplied: true });
    }
    
    participant.getHumanShieldUsers().forEach(user => {
        user.releaseHumanShield();
        encounter.render();
    });
    
    if (encounter.active) {
        participant.resetInitiative();
    }
}

function applyHealing(encounterId, participantName) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        const participant = encounter.participants.find(p => p.name === participantName);
        const healInput = document.getElementById(`damage-${encounterId}-${participantName}`);
        if (participant && healInput.value) {
            const previousHealth = participant.health;
            const healing = parseInt(healInput.value);
            participant.health = Math.min(participant.maxHealth, participant.health + healing);
            
            // Reset death save penalty if healed above 0
            if (previousHealth <= 0 && participant.health > 0) {
                participant.deathSavePenalty = 0;
                participant.deathSaves = [];
            }
            
            // Update the corresponding player character in the manager
            updatePlayerCharacterState(participant);
            
            healInput.value = '';
            encounter.render();
            localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
        }
    }
}

function updatePlayerCharacterState(participant) {
    const pc = playerCharacters.find(p => p.name === participant.name);
    if (pc) {
        // Update stats that can change during combat
        pc.bodyArmor = participant.bodyArmor;
        pc.headArmor = participant.headArmor;
        pc.shield = participant.shield;
        pc.shieldActive = participant.shieldActive;
        pc.health = participant.health; // Update health
        
        // Save to local storage and rerender
        localStorage.setItem('playerCharacters', JSON.stringify(playerCharacters.map(p => p.toJSON())));
        renderPlayerCharacterList();
    }
}

function startEncounter(encounterId) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        encounter.startEncounter();
        localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
    }
}

function endEncounter(encounterId) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        encounter.endEncounter();
        localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
    }
}

function nextTurn(encounterId) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        encounter.nextTurn();
        localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
    }
}

function selectEncounterForExport(encounterId) {
    encounters.forEach(e => {
        e.selected = (e.id === encounterId);
        e.render();
    });
    updateImportExportStatus();
}

function updateImportExportStatus() {
    const statusElement = document.getElementById('import-export-status');
    const selectedCount = encounters.filter(e => e.selected).length;
    if (selectedCount > 0) {
        statusElement.textContent = `${selectedCount} encounter${selectedCount > 1 ? 's' : ''} selected`;
    } else {
        statusElement.textContent = 'No encounters selected';
    }
}

function exportSelectedEncounters() {
    const selectedEncounters = encounters.filter(e => e.selected);
    if (selectedEncounters.length === 0) {
        alert('Please select one or more encounters to export');
        return;
    }

    const encountersData = JSON.stringify(selectedEncounters.map(e => e.toJSON()), null, 2);
    const blob = new Blob([encountersData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `encounters_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importEncounters(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    let processedFiles = 0;
    let importedCount = 0;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                const encountersToImport = Array.isArray(data) ? data : [data];

                encountersToImport.forEach(encounterData => {
                    const encounter = new Encounter(encounterCounter++, encounterData.name);
                    encounter.participants = encounterData.participants.map(p => {
                        const participant = new Participant(
                            p.name, 
                            p.base, 
                            p.maxHealth, 
                            p.roll, 
                            p.total, 
                            p.health, 
                            p.bodyArmor || 0, 
                            p.headArmor || 0, 
                            p.shield || 0,
                            p.weapons || [],
                            p.criticalInjuries || []
                        );
                        if (p.shieldActive !== undefined) {
                            participant.shieldActive = p.shieldActive;
                        }
                        participant.humanShield = p.humanShield || null;
                        return participant;
                    });
                    encounter.active = encounterData.active;
                    encounter.currentRound = encounterData.currentRound;
                    encounter.currentTurn = encounterData.currentTurn;
                    encounters.push(encounter);
                    
                    const encountersDiv = document.getElementById('encounters');
                    const newEncounterDiv = document.createElement('div');
                    newEncounterDiv.id = `encounter-${encounter.id}`;
                    newEncounterDiv.className = 'encounter';
                    encountersDiv.appendChild(newEncounterDiv);
                    
                    encounter.render();
                    localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
                    localStorage.setItem('encounterCounter', encounterCounter.toString());
                    document.getElementById('import-export-status').textContent = `Successfully imported: ${encounter.name}`;
                    importedCount++;
                });
            } catch (error) {
                console.error(`Error importing file ${file.name}:`, error);
            } finally {
                processedFiles++;
                if (processedFiles === files.length) {
                    document.getElementById('import-export-status').textContent = 
                        `Successfully imported ${importedCount} encounters`;
                }
            }
        };
        reader.readAsText(file);
    });
}

function loadEncounters() {
    const savedEncounters = localStorage.getItem('encounters');
    const savedCounter = localStorage.getItem('encounterCounter');
    
    if (savedEncounters && savedCounter) {
        document.getElementById('encounters').innerHTML = '';
        encounters = [];
        
        encounterCounter = parseInt(savedCounter);
        
        const loadedEncounters = JSON.parse(savedEncounters);
        loadedEncounters.forEach(encounterData => {
            const encounter = new Encounter(encounterData.id, encounterData.name);
            encounter.participants = encounterData.participants.map(p => {
                const participant = new Participant(
                    p.name, 
                    p.base, 
                    p.maxHealth, 
                    p.roll, 
                    p.total, 
                    p.health, 
                    p.bodyArmor || 0, 
                    p.headArmor || 0, 
                    p.shield || 0,
                    p.weapons || [],
                    p.criticalInjuries || []
                );
                if (p.shieldActive !== undefined) {
                    participant.shieldActive = p.shieldActive;
                }
                participant.humanShield = p.humanShield || null;
                return participant;
            });
            encounter.active = encounterData.active;
            encounter.currentRound = encounterData.currentRound;
            encounter.currentTurn = encounterData.currentTurn;
            encounters.push(encounter);
            
            const encountersDiv = document.getElementById('encounters');
            const newEncounterDiv = document.createElement('div');
            newEncounterDiv.id = `encounter-${encounter.id}`;
            newEncounterDiv.className = 'encounter';
            encountersDiv.appendChild(newEncounterDiv);
            
            encounter.render();
        });
        document.getElementById('import-export-status').textContent = 'All encounters loaded from storage';
    } else {
        alert('No saved encounters found!');
    }
}


// Add export and import functions for player characters
function exportPlayerCharacters() {
    const charactersData = JSON.stringify(playerCharacters.map(p => p.toJSON()), null, 2);
    const blob = new Blob([charactersData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'player_characters.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    document.getElementById('pc-import-export-status').textContent = 'Characters exported successfully';
}

function importPlayerCharacters(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const charactersData = JSON.parse(e.target.result);
                
                charactersData.forEach(charData => {
                    const pc = new PlayerCharacter(
                        charData.name,
                        charData.base,
                        charData.maxHealth,
                        charData.bodyArmor,
                        charData.headArmor,
                        charData.shield || 0,
                        charData.criticalInjuries || []
                    );
                    
                    // Copy shield active state if present
                    if (charData.shieldActive !== undefined) {
                        pc.shieldActive = charData.shieldActive;
                    }
                    
                    // Check if character already exists
                    const existingIndex = playerCharacters.findIndex(p => p.name === pc.name);
                    if (existingIndex !== -1) {
                        playerCharacters[existingIndex] = pc;
                    } else {
                        playerCharacters.push(pc);
                    }
                });
                
                localStorage.setItem('playerCharacters', JSON.stringify(playerCharacters.map(p => p.toJSON())));
                renderPlayerCharacterList();
                document.getElementById('pc-import-export-status').textContent = 'Characters imported successfully';
            } catch (error) {
                alert('Error importing characters: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
}

function loadPlayerCharacters() {
    const savedCharacters = localStorage.getItem('playerCharacters');
    if (savedCharacters) {
        playerCharacters = [];
        const loadedCharacters = JSON.parse(savedCharacters);
        loadedCharacters.forEach(charData => {
            const pc = new PlayerCharacter(
                charData.name,
                charData.base,
                charData.maxHealth,
                charData.bodyArmor || 0,
                charData.headArmor || 0,
                charData.shield || 0,
                charData.criticalInjuries || []
            );
            
            // Copy health if present
            if (charData.health !== undefined) {
                pc.health = charData.health;
            }
            
            // Copy shield active state if present
            if (charData.shieldActive !== undefined) {
                pc.shieldActive = charData.shieldActive;
            }
            
            playerCharacters.push(pc);
        });
        renderPlayerCharacterList();
    }
}

function applyCriticalInjury(encounterId, participantName) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        const participant = encounter.participants.find(p => p.name === participantName);
        const injurySelect = document.getElementById(`critical-injury-select-${encounterId}-${participantName}`);
        const injuryName = injurySelect.value;

        // Find the injury in CRITICAL_INJURIES
        let selectedInjury = null;
        for (const location in CRITICAL_INJURIES) {
            selectedInjury = CRITICAL_INJURIES[location].find(injury => injury.name === injuryName);
            if (selectedInjury) break;
        }

        if (participant && selectedInjury) {
            // Check if the injury already exists
            const injuryExists = participant.criticalInjuries.some(injury => injury.name === selectedInjury.name);
            if (!injuryExists) {
                participant.criticalInjuries.push(selectedInjury);
            }

            // If the participant is a player character, update the player character list
            const pc = playerCharacters.find(p => p.name === participant.name);
            if (pc) {
                const pcInjuryExists = pc.criticalInjuries.some(injury => injury.name === selectedInjury.name);
                if (!pcInjuryExists) {
                    pc.criticalInjuries.push(selectedInjury);
                }
                localStorage.setItem('playerCharacters', JSON.stringify(playerCharacters.map(p => p.toJSON())));
                renderPlayerCharacterList();
            }

            encounter.render();
            localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
        }
    }
}

function removeCriticalInjury(characterName, injuryIndex, isPC) {
    let character;
    if (isPC) {
        character = playerCharacters.find(p => p.name === characterName);
    }

    // Also check if this is a player character even if we're removing from encounter
    const pc = playerCharacters.find(p => p.name === characterName);
    
    // Remove from any encounters
    encounters.forEach(encounter => {
        const participant = encounter.participants.find(p => p.name === characterName);
        if (participant && participant.criticalInjuries[injuryIndex]) {
            participant.criticalInjuries.splice(injuryIndex, 1);
            encounter.render();
            localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
        }
    });

    // If this is a player character (either directly or in an encounter), update PC manager
    if (pc && pc.criticalInjuries[injuryIndex]) {
        pc.criticalInjuries.splice(injuryIndex, 1);
        localStorage.setItem('playerCharacters', JSON.stringify(playerCharacters.map(p => p.toJSON())));
        renderPlayerCharacterList();
    }
}

window.onload = function() {
    loadEncounters();
    loadPlayerCharacters();
};

function rollCriticalInjury(location) {
    const table = CRITICAL_INJURIES[location];
    if (!table) {
        console.error(`No critical injuries found for location: ${location}`);
        return null;
    }

    let roll1 = Math.floor(Math.random() * 6) + 1;
    let roll2 = Math.floor(Math.random() * 6) + 1;
    let index = roll1 + roll2 - 2; // Adjust for 0-based index

    if (index < 0 || index >= table.length) {
        console.error(`Invalid index ${index} for critical injury table with length ${table.length}`);
        return null;
    }

    return table[index];
}

function recordDeathSave(encounterId, participantName, success) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        const participant = encounter.participants.find(p => p.name === participantName);
        if (participant) {
            // Initialize death saves if not present
            participant.deathSaves = participant.deathSaves || [];
            participant.deathSaves.push(success);
            
            // If it's a failure, the character dies
            if (!success) {
                alert(`${participant.name} has failed their Death Save and is dead.`);
            }

            // Increment death save penalty
            participant.deathSavePenalty = (participant.deathSavePenalty || 0) + 1;
            
            // Update the corresponding player character
            const pc = playerCharacters.find(p => p.name === participant.name);
            if (pc) {
                pc.deathSaves = participant.deathSaves;
                pc.deathSavePenalty = participant.deathSavePenalty;
                localStorage.setItem('playerCharacters', JSON.stringify(playerCharacters.map(p => p.toJSON())));
                renderPlayerCharacterList();
            }

            encounter.render();
            localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
        }
    }
}

function adjustDeathSavePenalty(encounterId, participantName, amount) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        const participant = encounter.participants.find(p => p.name === participantName);
        if (participant) {
            participant.deathSavePenalty = Math.max(0, (participant.deathSavePenalty || 0) + amount);
            
            // Update the corresponding player character
            const pc = playerCharacters.find(p => p.name === participant.name);
            if (pc) {
                pc.deathSavePenalty = participant.deathSavePenalty;
                localStorage.setItem('playerCharacters', JSON.stringify(playerCharacters.map(p => p.toJSON())));
                renderPlayerCharacterList();
            }

            encounter.render();
            localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
        }
    }
}

function toggleEncounterSelection(encounterId) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (encounter) {
        encounter.selected = !encounter.selected;
        encounter.render();
        updateImportExportStatus();
        renderPlayerCharacterList(); // Refresh player list to update button states
    }
}

// Add this new function after your existing functions
function generateEncounter() {
    const difficulty = document.getElementById('encounter-difficulty').value;
    const enemyCount = parseInt(document.getElementById('enemy-count').value) || 4;
    
    const encounterData = generateRandomEncounter(difficulty, enemyCount);
    if (!encounterData) return;

    // Create new encounter with generated data
    const encounter = new Encounter(encounterCounter++, encounterData.name);
    
    // Add all participants
    encounterData.participants.forEach(p => {
        encounter.addParticipant(
            p.name,
            p.base,
            p.maxHealth,
            p.bodyArmor,
            p.headArmor,
            p.shield,
            p.weapons
        );
    });
    
    // Add to encounter list
    encounters.push(encounter);
    
    // Create DOM element
    const encountersDiv = document.getElementById('encounters');
    const newEncounterDiv = document.createElement('div');
    newEncounterDiv.id = `encounter-${encounter.id}`;
    newEncounterDiv.className = 'encounter';
    encountersDiv.appendChild(newEncounterDiv);
    
    // Render and save
    encounter.render();
    localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
    localStorage.setItem('encounterCounter', encounterCounter.toString());
}

function takeCover(encounterId, participantName) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (!encounter) return;

    const participant = encounter.participants.find(p => p.name === participantName);
    const coverSelect = document.getElementById(`cover-type-${encounterId}-${participantName}`);
    
    if (participant && coverSelect.value) {
        participant.takeCover(coverSelect.value);
        encounter.render();
        localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
    }
}

function leaveCover(encounterId, participantName) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (!encounter) return;

    const participant = encounter.participants.find(p => p.name === participantName);
    if (participant) {
        participant.leaveCover();
        encounter.render();
        localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
    }
}

function damageCover(encounterId, participantName) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (!encounter) return;

    const participant = encounter.participants.find(p => p.name === participantName);
    const damageInput = document.getElementById(`cover-damage-${encounterId}-${participantName}`);
    
    if (participant && damageInput.value) {
        participant.damageCurrentCover(parseInt(damageInput.value));
        damageInput.value = '';
        encounter.render();
        localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
    }
}

function takeHumanShield(encounterId, participantName) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (!encounter) return;

    const participant = encounter.participants.find(p => p.name === participantName);
    const shieldSelect = document.getElementById(`human-shield-${encounterId}-${participantName}`);
    
    if (participant && shieldSelect.value) {
        const target = encounter.participants.find(p => p.name === shieldSelect.value);
        if (target) {
            participant.takeHumanShield(target);
            encounter.render();
            localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
        }
    }
}

function releaseHumanShield(encounterId, participantName) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (!encounter) return;

    const participant = encounter.participants.find(p => p.name === participantName);
    if (!participant) return;

    const humanShield = encounter.participants.find(p => p.name === participant.humanShield);
    if (!humanShield) {
        participant.humanShield = null;
        encounter.render();
        localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
        return;
    }

    if (humanShield.health <= 0) {
        // Convert dead human shield to regular cover with half maxHealth
        participant.cover = {
            type: "Dead Body",
            hp: Math.floor(humanShield.maxHealth / 2),
            maxHp: Math.floor(humanShield.maxHealth / 2)
        };
    }
    participant.humanShield = null;
    encounter.render();
    localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
}