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
        this.notes = '';
        this.customDamagePresets = [];
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

    calculateDamage(baseDamage, options = {}) {
        const {
            isAP = false,
            isHalfArmor = false,
            isHeadshot = false,
            ignoreArmor = false,
            location = 'body',
            attackType = 'ranged',  // 'ranged', 'melee', 'brawling', 'martialArts'
            diceRolls = [],        // Array of individual dice results for critical detection
            hasCrackedSkull = false
        } = options;

        // Calculate initial damage
        let finalDamage = baseDamage;
        let armorAblationAmount = 1;
        let damageGotThrough = false;

        // Process armor and damage
        if (!ignoreArmor) {
            let armor = this.getEffectiveArmor(location);
            
            // Handle special armor piercing cases
            if (isAP) {
                armorAblationAmount = 2;
            }

            // Handle armor halving for melee and martial arts
            if (isHalfArmor && attackType !== 'brawling') {
                armor = Math.ceil(armor / 2);
            }

            // Subtract armor from damage
            finalDamage = Math.max(0, finalDamage - armor);
            damageGotThrough = finalDamage > 0;

            // Apply armor ablation if damage was dealt
            if (damageGotThrough) {
                this.ablateArmor(location, armorAblationAmount);
            }
        }

        // Apply headshot multiplier after armor reduction
        if (isHeadshot && damageGotThrough) {
            finalDamage *= hasCrackedSkull ? 3 : 2;
        }

        // Check for critical injury
        let criticalDamage = 0;
        if (this.hasCriticalFromDice(diceRolls)) {
            criticalDamage = 5; // Critical injuries always deal 5 bonus damage
        }

        // Return detailed damage information
        return {
            totalDamage: finalDamage + criticalDamage,
            baseDamage: finalDamage,
            criticalDamage: criticalDamage,
            damageGotThrough,
            armorAblated: damageGotThrough ? armorAblationAmount : 0
        };
    }

    hasCriticalFromDice(diceRolls) {
        if (!Array.isArray(diceRolls) || diceRolls.length < 2) return false;
        let sixes = diceRolls.filter(roll => roll === 6).length;
        return sixes >= 2;
    }

    ablateArmor(location, amount) {
        if (location === 'head') {
            this.headArmor = Math.max(0, this.headArmor - amount);
        } else {
            this.bodyArmor = Math.max(0, this.bodyArmor - amount);
        }
    }

    saveDamagePreset(name, options) {
        this.customDamagePresets.push({ name, options });
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
            weaponNotes: this.weaponNotes, // Add this line
            criticalInjuries: this.criticalInjuries,
            cover: this.cover,
            humanShield: this.humanShield,
            notes: this.notes,
            customDamagePresets: this.customDamagePresets
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
        
        // Scroll to active participant
        const activeParticipant = document.querySelector('.active-participant');
        if (activeParticipant) {
            activeParticipant.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center'
            });
        }
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
                    <div id="weapon-fields-${this.id}"></div>
                    <button type="button" onclick="addWeaponFields(${this.id})">Add Weapon</button>
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
                    const weaponsDisplay = `
                        <div class="weapons-section">
                            <h4>Weapons & Notes</h4>
                            ${p.weapons && p.weapons.length > 0 ? `
                                <div class="weapons-list">
                                    ${p.weapons.map(w => `
                                        <div class="weapon-entry-readonly">
                                            ${w.name}: ${w.damage}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            <textarea 
                                class="weapon-notes character-notes" 
                                onchange="updateCharacterNotes(event)"
                                data-character-name="${p.name}"
                                placeholder="Enter weapons, abilities, cyberware, and other notes here..."
                            >${p.notes || ''}</textarea>
                        </div>
                    `;

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
                                <div class="damage-controls">
                                    <div class="damage-inputs">
                                        <select id="hit-location-${this.id}-${p.name}">
                                            <option value="body">Body</option>
                                            <option value="head">Head</option>
                                        </select>
                                        <input type="number" class="damage-input" id="damage-${this.id}-${p.name}" placeholder="Amount">
                                    </div>
                                    <div class="damage-options">
                                        <select id="attack-type-${this.id}-${p.name}">
                                            <option value="ranged">Ranged Attack</option>
                                            <option value="melee">Melee Attack</option>
                                            <option value="brawling">Brawling</option>
                                            <option value="martialArts">Martial Arts</option>
                                        </select>
                                        <label class="damage-modifier">
                                            <input type="checkbox" id="armor-piercing-${this.id}-${p.name}">
                                            Armor Piercing
                                        </label>
                                        <label class="damage-modifier">
                                            <input type="checkbox" id="half-armor-${this.id}-${p.name}">
                                            Halved Armor
                                        </label>
                                        <label class="damage-modifier">
                                            <input type="checkbox" id="ignore-armor-${this.id}-${p.name}">
                                            Ignore Armor
                                        </label>
                                    </div>
                                    <div class="damage-buttons">
                                        <button onclick="applyDamage(${this.id}, '${p.name}')">Damage</button>
                                        <button onclick="applyHealing(${this.id}, '${p.name}')">Heal</button>
                                        ${p.shield > 0 ? `
                                            <button class="shield-toggle ${p.shieldActive ? 'shield-active' : ''}" 
                                                  onclick="toggleShield(${this.id}, '${p.name}')">
                                                ${p.shieldActive ? 'Deactivate Shield' : 'Activate Shield'}
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="initiative-tracker">
                                <div class="initiative-controls-box">
                                    <div class="initiative-inputs">
                                        <input type="number" class="initiative-input" id="initiative-${this.id}-${p.name}" placeholder="Total">
                                    </div>
                                    <div class="initiative-buttons">
                                        <button onclick="setManualInitiative(${this.id}, '${p.name}')">Set Initiative</button>
                                        <button onclick="rollIndividualInitiative(${this.id}, '${p.name}')">Roll Initiative</button>
                                        <button onclick="resetInitiative(${this.id}, '${p.name}')">Reset Initiative</button>
                                    </div>
                                </div>
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

        // Add floating next turn button if encounter is active
        if (this.active) {
            const floatingButton = document.createElement('button');
            floatingButton.className = 'floating-next-turn';
            floatingButton.innerHTML = `
                Next Turn
                <span class="round-info">Round ${this.currentRound}</span>
            `;
            floatingButton.onclick = () => nextTurn(this.id);

            // Remove any existing floating button before adding new one
            const existingButton = document.querySelector('.floating-next-turn');
            if (existingButton) {
                existingButton.remove();
            }
            document.body.appendChild(floatingButton);
        } else {
            // Remove floating button when encounter ends
            const existingButton = document.querySelector('.floating-next-turn');
            if (existingButton) {
                existingButton.remove();
            }
        }
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            participants: this.participants.map(p => p.toJSON()),
            active: this.active,
            selected: this.selected,
            currentRound: this.currentRound,
            currentTurn: this.currentTurn
        };
    }
}

let encounters = [];
let encounterCounter = 1;
let playerCharacters = [];

class PlayerCharacter {
    constructor(name, base, maxHealth, bodyArmor, headArmor, shield, weapons = [], criticalInjuries = []) {
        this.name = name;
        this.base = parseInt(base);
        this.maxHealth = parseInt(maxHealth);
        this.bodyArmor = bodyArmor || 0;
        this.headArmor = headArmor || 0;
        this.shield = shield || 0;
        this.shieldActive = false;
        this.health = parseInt(maxHealth);
        this.weapons = weapons;         // Store weapons here
        this.criticalInjuries = criticalInjuries; // Store critical injuries here
        this.notes = '';
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
            weapons: this.weapons,
            criticalInjuries: this.criticalInjuries,
            notes: this.notes
        };
    }
}

// Update savePlayerCharacter function to properly save notes
function savePlayerCharacter() {
    const name = document.getElementById('pc-name').value;
    const baseInit = parseInt(document.getElementById('pc-base').value) || 0;
    const maxHealth = parseInt(document.getElementById('pc-maxHealth').value) || 0;
    const bodyArmor = parseInt(document.getElementById('pc-bodyArmor').value) || 0;
    const headArmor = parseInt(document.getElementById('pc-headArmor').value) || 0;
    const shield = parseInt(document.getElementById('pc-shield').value) || 0;
    const notes = document.getElementById('pc-notes').value;
    
    // Get weapons from weapon fields
    const weapons = [];
    const weaponFields = document.getElementById('pc-weapon-fields').getElementsByClassName('weapon-field-pair');
    Array.from(weaponFields).forEach(field => {
        const nameInput = field.querySelector('.weapon-name-field');
        const damageInput = field.querySelector('.weapon-damage-field');
        if (nameInput && damageInput && nameInput.value && damageInput.value) {
            weapons.push({
                name: nameInput.value,
                damage: damageInput.value
            });
        }
    });

    // Create new character with proper order of parameters
    const character = new PlayerCharacter(
        name,
        baseInit,
        maxHealth,
        bodyArmor,
        headArmor,
        shield,
        weapons,    // Pass weapons array here
        []         // Empty array for critical injuries
    );
    character.notes = notes; // Make sure notes are saved

    // Load existing characters
    let characters = JSON.parse(localStorage.getItem('playerCharacters') || '[]');
    
    // Update if character exists, otherwise add new
    const existingIndex = characters.findIndex(c => c.name === character.name);
    if (existingIndex >= 0) {
        // Preserve existing critical injuries and notes when updating
        character.criticalInjuries = characters[existingIndex].criticalInjuries || [];
        character.health = characters[existingIndex].health;
        characters[existingIndex] = character;
    } else {
        characters.push(character);
    }
    
    // Save back to localStorage
    localStorage.setItem('playerCharacters', JSON.stringify(characters));
    
    // Refresh the display
    loadPlayerCharacters();
    
    // Clear the form
    document.getElementById('pc-name').value = '';
    document.getElementById('pc-base').value = '';
    document.getElementById('pc-maxHealth').value = '';
    document.getElementById('pc-bodyArmor').value = '';
    document.getElementById('pc-headArmor').value = '';
    document.getElementById('pc-shield').value = '';
    document.getElementById('pc-notes').value = '';
    document.getElementById('pc-weapon-fields').innerHTML = '';
    addWeaponFields('pc-weapon-fields');
}

// Add this new function to handle note updates
function updateCharacterNotes(event) {
    const notes = event.target.value;
    const participantDiv = event.target.closest('.participant, .pc-card-compact');
    if (!participantDiv) return;

    const participantName = participantDiv.querySelector('.participant-name')?.textContent?.split(' ')[0] || 
                          participantDiv.querySelector('h4')?.textContent;
    if (!participantName) return;

    // Update in player characters
    const playerCharacters = JSON.parse(localStorage.getItem('playerCharacters') || '[]');
    const pcIndex = playerCharacters.findIndex(pc => pc.name === participantName);
    if (pcIndex !== -1) {
        playerCharacters[pcIndex].notes = notes;
        localStorage.setItem('playerCharacters', JSON.stringify(playerCharacters));
    }

    // Update in active encounters
    let encounters = JSON.parse(localStorage.getItem('encounters') || '[]');
    let updated = false;
    encounters.forEach(encounter => {
        encounter.participants.forEach(participant => {
            if (participant.name === participantName) {
                participant.notes = notes;
                updated = true;
            }
        });
    });

    if (updated) {
        localStorage.setItem('encounters', JSON.stringify(encounters));
        // Refresh all instances where this character appears
        document.querySelectorAll(`textarea[data-character-name="${participantName}"]`).forEach(textarea => {
            if (textarea !== event.target) {
                textarea.value = notes;
            }
        });
    }
}

// Update editCharacter function to load notes
function editCharacter(index) {
    const characters = JSON.parse(localStorage.getItem('playerCharacters') || '[]');
    const character = characters[index];
    
    document.getElementById('pc-name').value = character.name;
    document.getElementById('pc-base').value = character.base;
    document.getElementById('pc-maxHealth').value = character.maxHealth;
    document.getElementById('pc-bodyArmor').value = character.bodyArmor;
    document.getElementById('pc-headArmor').value = character.headArmor;
    document.getElementById('pc-shield').value = character.shield || 0;
    document.getElementById('pc-notes').value = character.notes || '';
    
    // Clear and recreate weapon fields
    const weaponFields = document.getElementById('pc-weapon-fields');
    weaponFields.innerHTML = '';
    if (character.weapons && character.weapons.length > 0) {
        character.weapons.forEach(weapon => {
            addWeaponFields('pc-weapon-fields', weapon.name, weapon.damage);
        });
    } else {
        addWeaponFields('pc-weapon-fields');
    }
}

// Update loadPlayerCharacters to properly display notes in PC list
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
                charData.weapons || [],
                charData.criticalInjuries || []
            );
            
            if (charData.health !== undefined) {
                pc.health = charData.health;
            }
            if (charData.shieldActive !== undefined) {
                pc.shieldActive = charData.shieldActive;
            }
            if (charData.notes !== undefined) {
                pc.notes = charData.notes;
            }
            
            playerCharacters.push(pc);
        });

        // Update PC Manager list if we're on that page
        const pcList = document.getElementById('pc-list');
        if (pcList) {
            pcList.innerHTML = playerCharacters.map((pc, index) => `
                <div class="pc-card-compact">
                    <h4>${pc.name}</h4>
                    <div class="stats">
                        <div>Base Initiative: ${pc.base}</div>
                        <div>Health: ${pc.maxHealth}</div>
                        <div>Body Armor: ${pc.bodyArmor}</div>
                        <div>Head Armor: ${pc.headArmor}</div>
                        ${pc.shield ? `<div>Shield: ${pc.shield}</div>` : ''}
                    </div>
                    <div class="weapons-section">
                        <h4>Weapons</h4>
                        ${pc.weapons && pc.weapons.length > 0 ? `
                            <div class="weapons-list">
                                ${pc.weapons.map(w => `
                                    <div class="weapon-entry-readonly">
                                        ${w.name}: ${w.damage}
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<div class="weapon-entry-readonly">No weapons</div>'}
                    </div>
                    ${pc.notes ? `
                        <div class="notes-section">
                            <h4>Notes</h4>
                            <div class="notes-display">${pc.notes}</div>
                        </div>
                    ` : ''}
                    <div class="actions">
                        <button onclick="editCharacter(${index})">Edit</button>
                        <button onclick="deleteCharacter(${index})" class="danger-button">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        // Update compact list if we're on main page
        const pcListCompact = document.querySelector('.pc-list-compact');
        if (pcListCompact) {
            renderCompactPCList();
        }
    }
}

function deleteCharacter(index) {
    if (!confirm('Are you sure you want to delete this character?')) return;
    
    let characters = JSON.parse(localStorage.getItem('playerCharacters') || '[]');
    characters.splice(index, 1);
    localStorage.setItem('playerCharacters', JSON.stringify(characters));
    loadPlayerCharacters();
}

function addWeaponFields(containerId, name = '', damage = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const fieldPair = document.createElement('div');
    fieldPair.className = 'weapon-field-pair';
    fieldPair.innerHTML = `
        <input type="text" class="weapon-name-field" placeholder="Weapon Name" value="${name}">
        <input type="text" class="weapon-damage-field" placeholder="Damage (e.g. 3d6)" value="${damage}">
        <button type="button" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(fieldPair);
}

function renderPlayerCharacterList() {
    const pcListDiv = document.getElementById('pc-list');
    if (!pcListDiv) return;
    
    pcListDiv.innerHTML = playerCharacters.map(pc => `
        <div class="participant">
            <span>${pc.name}</span>
            <div class="stats">
                <span>Base: ${pc.base}</span>
                <span>HP: ${pc.health || pc.maxHealth}/${pc.maxHealth}</span>
                <span>Body SP: ${pc.bodyArmor}</span>
                <span>Head SP: ${pc.headArmor}</span>
            </div>
            ${pc.notes ? `
                <div class="notes-section">
                    <p class="notes">${pc.notes}</p>
                </div>
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
            </div>
        </div>
    `).join('');
}

function renderCompactPCList() {
    const pcListCompact = document.querySelector('.pc-list-compact');
    if (!pcListCompact) return;
    
    const hasSelectedEncounters = encounters.some(e => e.selected);
    
    pcListCompact.innerHTML = playerCharacters.map(pc => `
        <div class="pc-card-compact">
            <h4>${pc.name}</h4>
            <div class="stats">
                Base: ${pc.base} | HP: ${pc.health}/${pc.maxHealth}<br>
                SP: ${pc.bodyArmor}/${pc.headArmor}
            </div>
            <div class="actions">
                <button onclick="addPlayerCharacterToEncounter('${pc.name}')"
                    ${!hasSelectedEncounters ? 'disabled' : ''}>
                    Add to Encounter
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
    renderCompactPCList();
}

function addPlayerCharacterToEncounter(name) {
    const selectedEncounters = encounters.filter(e => e.selected);
    if (selectedEncounters.length === 0) {
        console.log('No encounters selected');
        return;
    }
    
    const pc = playerCharacters.find(p => p.name === name);
    if (!pc) {
        console.log('Player character not found');
        return;
    }

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
                pc.weapons,
                pc.criticalInjuries
            );
            participant.shieldActive = pc.shieldActive;
            participant.notes = pc.notes; // Add this line
            encounter.participants.push(participant);
            encounter.sortParticipants();
            encounter.render();
        }
    });
    
    localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
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
    const diceRolls = window.lastDiceRolls || []; // Get dice rolls from dice roller

    if (!participant || !damageInput.value) return;

    const baseDamage = parseInt(damageInput.value);
    const location = locationSelect.value;
    
    // Get all damage modifiers
    const options = {
        isAP: document.getElementById(`armor-piercing-${encounterId}-${participantName}`).checked,
        isHalfArmor: document.getElementById(`half-armor-${encounterId}-${participantName}`).checked,
        isHeadshot: location === 'head',
        ignoreArmor: document.getElementById(`ignore-armor-${encounterId}-${participantName}`)?.checked || false,
        location: location,
        attackType: document.getElementById(`attack-type-${encounterId}-${participantName}`).value,
        diceRolls: diceRolls,
        hasCrackedSkull: participant.criticalInjuries.some(ci => ci.name === "Cracked Skull")
    };

    const damageResult = participant.calculateDamage(baseDamage, options);
    
    // Apply the calculated damage
    participant.health = Math.max(0, participant.health - damageResult.totalDamage);
    
    // Show damage breakdown
    const damageMessage = `Damage dealt: ${damageResult.totalDamage} (${damageResult.baseDamage} base + ${damageResult.criticalDamage} critical)`;
    console.log(damageMessage);
    
    // Update display
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
                        if (p.weaponNotes !== undefined) {
                            participant.weaponNotes = p.weaponNotes;
                        }
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
                if (p.weaponNotes !== undefined) {
                    participant.weaponNotes = p.weaponNotes;
                }
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
                        charData.shield,
                        charData.weapons || [],
                        charData.criticalInjuries || []
                    );
                    
                    // Copy additional properties
                    if (charData.shieldActive !== undefined) {
                        pc.shieldActive = charData.shieldActive;
                    }
                    if (charData.notes !== undefined) {
                        pc.notes = charData.notes;
                    }
                    if (charData.health !== undefined) {
                        pc.health = charData.health;
                    }
                    
                    // Check if character already exists
                    const existingIndex = playerCharacters.findIndex(p => p.name === pc.name);
                    if (existingIndex !== -1) {
                        playerCharacters[existingIndex] = pc;
                    } else {
                        playerCharacters.push(pc);
                    }
                });
                
                localStorage.setItem('playerCharacters', JSON.stringify(playerCharacters));
                loadPlayerCharacters(); // Call this instead of render functions
                document.getElementById('pc-import-export-status').textContent = 'Characters imported successfully';
            } catch (error) {
                alert('Error importing characters: ' + error.message);
            }
        };
        reader.readAsText(file);
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

window.onload = async function() {
    // Apply theme first
    const currentTheme = localStorage.getItem('theme') || 'default';
    document.documentElement.style.setProperty('--theme-transition', 'none');
    document.body.className = `theme-${currentTheme}`;
    document.body.offsetHeight; // Force reflow
    document.documentElement.style.removeProperty('--theme-transition');
    
    // Then load the data
    await loadEncounters();
    await loadPlayerCharacters();
    
    // Add initial weapon field if on PC manager page
    if (document.getElementById('pc-weapon-fields')) {
        addWeaponFields('pc-weapon-fields');
    }
    
    // Call both renderers
    renderPlayerCharacterList();
    renderCompactPCList();
    
    // Initial update of player character buttons
    updatePlayerCharacterButtons();
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
        
        // Update all encounter checkboxes to match their encounter's selected state
        encounters.forEach(e => {
            const checkbox = document.getElementById(`select-${e.id}`);
            if (checkbox) {
                checkbox.checked = e.selected;
            }
        });
        
        // Immediately update the PC list to reflect new selection state
        renderCompactPCList();
        renderPlayerCharacterList();
    }
}

function updatePlayerCharacterButtons() {
    const hasSelectedEncounters = encounters.some(e => e.selected);
    
    // Update buttons on the main page
    document.querySelectorAll('.add-to-encounter-button').forEach(button => {
        button.disabled = !hasSelectedEncounters;
        button.style.backgroundColor = hasSelectedEncounters ? 'var(--accent-primary)' : '#772';
    });
}

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

let currentTheme = localStorage.getItem('theme') || 'default';
let largeText = localStorage.getItem('largeText') === 'true';
let disableAnimations = localStorage.getItem('disableAnimations') === 'true';

function initializeThemeSystem() {
    // Apply saved settings
    if (currentTheme === 'custom' && localStorage.getItem('customTheme')) {
        const customTheme = JSON.parse(localStorage.getItem('customTheme'));
        Object.entries(customTheme).forEach(([property, value]) => {
            document.documentElement.style.setProperty(property, value);
        });
    }
    
    document.body.className = `theme-${currentTheme}`;
    document.body.classList.toggle('large-text', largeText);
    document.body.classList.toggle('disable-animations', disableAnimations);
    
    // Set initial select value
    document.getElementById('theme-select').value = currentTheme;
    document.getElementById('large-text').checked = largeText;
    document.getElementById('disable-animations').checked = disableAnimations;
    
    // Add event listeners
    document.getElementById('theme-select').addEventListener('change', (e) => {
        currentTheme = e.target.value;
        document.body.className = `theme-${currentTheme}`;
        localStorage.setItem('theme', currentTheme);
    });
    
    document.getElementById('large-text').addEventListener('change', (e) => {
        largeText = e.target.checked;
        document.body.classList.toggle('large-text', largeText);
        localStorage.setItem('largeText', largeText);
    });
    
    document.getElementById('disable-animations').addEventListener('change', (e) => {
        disableAnimations = e.target.checked;
        document.body.classList.toggle('disable-animations', disableAnimations);
        localStorage.setItem('disableAnimations', disableAnimations);
    });
}

function updateWeaponNotes(encounterId, participantName, notes) {
    const encounter = encounters.find(e => e.id === encounterId);
    if (!encounter) return;

    const participant = encounter.participants.find(p => p.name === participantName);
    if (!participant) return;

    participant.weaponNotes = notes;
    localStorage.setItem('encounters', JSON.stringify(encounters.map(e => e.toJSON())));
}

function addWeaponFields(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const fieldPair = document.createElement('div');
    fieldPair.className = 'weapon-field-pair';
    fieldPair.innerHTML = `
        <input type="text" class="weapon-name-field" placeholder="Weapon Name">
        <input type="text" class="weapon-damage-field" placeholder="Damage (e.g. 3d6)">
        <button type="button" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(fieldPair);
}

document.addEventListener('DOMContentLoaded', function() {
    loadPlayerCharacters();
    
    // Initialize player character select if we're on the main page
    const pcSelect = document.getElementById('player-character-select');
    if (pcSelect) {
        const characters = JSON.parse(localStorage.getItem('playerCharacters') || '[]');
        pcSelect.innerHTML = '<option value="">Select a character...</option>' +
            characters.map(char => `<option value="${char.name}">${char.name}</option>`).join('');
    }
});

function updateUI() {
    // ...existing code...

    // Enable/disable "Add to Selected Encounters" button based on encounter selection
    const selectedEncounters = encounters.filter(encounter => encounter.selected);
    const addToEncounterButton = document.getElementById('add-to-encounter-button');

    if (addToEncounterButton) {
        addToEncounterButton.disabled = selectedEncounters.length === 0;
    }
}

function renderPlayerCharacterList() {
    const pcList = document.getElementById('pc-list');
    const characters = JSON.parse(localStorage.getItem('playerCharacters')) || [];

    pcList.innerHTML = characters.map((pc, index) => `
        <div class="pc-card-compact">
            <h4>${pc.name}</h4>
            <div class="stats">
                <div>Base Initiative: ${pc.base}</div>
                <div>Health: ${pc.maxHealth}</div>
                <div>Body Armor: ${pc.bodyArmor}</div>
                <div>Head Armor: ${pc.headArmor}</div>
                ${pc.shield ? `<div>Shield: ${pc.shield}</div>` : ''}
            </div>
            <div class="weapons-section">
                <div class="weapons-list">
                    ${pc.weapons ? pc.weapons.map(weapon => `
                        <div class="weapon-entry-readonly">
                            <span class="weapon-name">${weapon.name}</span>
                            <span class="weapon-damage">${weapon.damage}</span>
                        </div>
                    `).join('') : ''}
                </div>
            </div>
            <div class="actions">
                <button onclick="deletePlayerCharacter(${index})">Delete</button>
            </div>
        </div>
    `).join('');
}

// ...existing code...

function renderPlayerCharacterList() {
    const pcListContainer = document.querySelector('.pc-list-compact');
    if (!pcListContainer) return;

    const playerCharacters = JSON.parse(localStorage.getItem('playerCharacters') || '[]');
    pcListContainer.innerHTML = '';

    playerCharacters.forEach(pc => {
        const pcCard = document.createElement('div');
        pcCard.className = 'pc-card-compact';
        pcCard.innerHTML = `
            <h4>${pc.name}</h4>
            <div class="stats">
                HP: ${pc.maxHealth} | SP: ${pc.bodyArmor}/${pc.headArmor}
            </div>
            <div class="actions">
                <button onclick="addPCToEncounter('${encodeURIComponent(JSON.stringify(pc))}')">Add to Encounter</button>
            </div>
        `;
        pcListContainer.appendChild(pcCard);
    });
}

function addPCToEncounter(pcData) {
    const pc = JSON.parse(decodeURIComponent(pcData));
    const encounter = getCurrentEncounter();
    if (!encounter) {
        alert('Please create an encounter first');
        return;
    }

    const participant = {
        id: generateId(),
        name: pc.name,
        baseInitiative: pc.baseInitiative || 0,
        initiative: 0,
        maxHealth: pc.maxHealth,
        currentHealth: pc.maxHealth,
        bodyArmor: pc.bodyArmor,
        headArmor: pc.headArmor,
        shield: pc.shield || 0,
        weapons: pc.weapons || [],
        notes: pc.notes || '',
        isPC: true
    };

    encounter.participants.push(participant);
    saveEncounters();
    renderEncounters();
}

// Add this to your initialization code or DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
    // ...existing initialization code...
    renderPlayerCharacterList();
});

// Update this existing function to include re-rendering the PC list
function loadAndDisplayData() {
    // ...existing code...
    renderEncounters();
    renderPlayerCharacterList();
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
                charData.weapons || [],
                charData.criticalInjuries || []
            );
            
            // Copy all additional properties
            if (charData.health !== undefined) pc.health = charData.health;
            if (charData.shieldActive !== undefined) pc.shieldActive = charData.shieldActive;
            if (charData.notes !== undefined) pc.notes = charData.notes;
            if (charData.deathSaves !== undefined) pc.deathSaves = charData.deathSaves;
            if (charData.deathSavePenalty !== undefined) pc.deathSavePenalty = charData.deathSavePenalty;
            
            playerCharacters.push(pc);
        });

        // Update both display types
        renderPlayerCharacterList();
        renderCompactPCList();
    }
}

// Merged renderPlayerCharacterList function
function renderPlayerCharacterList() {
    const pcList = document.getElementById('pc-list');
    if (!pcList) return;

    pcList.innerHTML = playerCharacters.map((pc, index) => `
        <div class="pc-card-compact" data-character-id="${pc.name}">
            <h4>${pc.name}</h4>
            <div class="stats">
                <div>Base Initiative: ${pc.base}</div>
                <div>Health: ${pc.health}/${pc.maxHealth}</div>
                <div>Body Armor: ${pc.bodyArmor}</div>
                <div>Head Armor: ${pc.headArmor}</div>
                ${pc.shield ? `<div>Shield: ${pc.shield} [${pc.shieldActive ? 'Active' : 'Inactive'}]</div>` : ''}
            </div>
            <div class="weapons-section">
                <h4>Weapons</h4>
                ${pc.weapons && pc.weapons.length > 0 ? `
                    <div class="weapons-list">
                        ${pc.weapons.map(w => `
                            <div class="weapon-entry-readonly">
                                ${w.name}: ${w.damage}
                            </div>
                        `).join('')}
                    </div>
                ` : '<div class="weapon-entry-readonly">No weapons</div>'}
            </div>
            <div class="critical-injuries-section">
                <h4>Critical Injuries</h4>
                ${pc.criticalInjuries && pc.criticalInjuries.length > 0 ? `
                    <div class="critical-injuries-list">
                        ${pc.criticalInjuries.map((injury, idx) => `
                            <div class="critical-injury">
                                ${injury.name}
                                <button onclick="removeCriticalInjury('${pc.name}', ${idx}, true)">×</button>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div>No critical injuries</div>'}
            </div>
            <div class="notes-section">
                <h4>Notes</h4>
                <textarea 
                    class="character-notes"
                    onchange="updateCharacterNotes(event)"
                >${pc.notes || ''}</textarea>
            </div>
            <div class="actions">
                <button onclick="editCharacter(${index})">Edit</button>
                <button onclick="deleteCharacter(${index})" class="danger-button">Delete</button>
            </div>
        </div>
    `).join('');
}

// Keep only one editCharacter function
function editCharacter(index) {
    const characters = JSON.parse(localStorage.getItem('playerCharacters') || '[]');
    const character = characters[index];
    
    document.getElementById('pc-name').value = character.name;
    document.getElementById('pc-base').value = character.base;
    document.getElementById('pc-maxHealth').value = character.maxHealth;
    document.getElementById('pc-bodyArmor').value = character.bodyArmor;
    document.getElementById('pc-headArmor').value = character.headArmor;
    document.getElementById('pc-shield').value = character.shield || 0;
    document.getElementById('pc-notes').value = character.notes || '';
    
    // Clear and recreate weapon fields
    const weaponFields = document.getElementById('pc-weapon-fields');
    weaponFields.innerHTML = '';
    if (character.weapons && character.weapons.length > 0) {
        character.weapons.forEach(weapon => {
            addWeaponFields('pc-weapon-fields', weapon.name, weapon.damage);
        });
    } else {
        addWeaponFields('pc-weapon-fields');
    }
}

// ...rest of existing code...

const UIRenderer = {
    renderAllViews() {
        this.renderPlayerLists();
        this.renderEncounters();
        this.updateUI();
    },

    renderPlayerLists() {
        this.renderMainPlayerList();
        this.renderCompactPlayerList();
    },

    renderMainPlayerList() {
        const pcList = document.getElementById('pc-list');
        if (!pcList) return;

        pcList.innerHTML = playerCharacters.map((pc, index) => `
            <div class="pc-card-compact" data-character-id="${pc.name}">
                ${this.renderPlayerHeader(pc)}
                ${this.renderWeaponsSection(pc)}
                ${this.renderCriticalInjuries(pc)}
                ${this.renderNotesSection(pc)}
                ${this.renderActionButtons(pc, index)}
            </div>
        `).join('');
    },

    renderCompactPlayerList() {
        const pcListCompact = document.querySelector('.pc-list-compact');
        if (!pcListCompact) return;
        
        const hasSelectedEncounters = encounters.some(e => e.selected);
        
        pcListCompact.innerHTML = playerCharacters.map(pc => `
            <div class="pc-card-compact">
                <h4>${pc.name}</h4>
                <div class="stats">
                    Base: ${pc.base} | HP: ${pc.health}/${pc.maxHealth}<br>
                    SP: ${pc.bodyArmor}/${pc.headArmor}
                </div>
                <div class="actions">
                    <button onclick="addPlayerCharacterToEncounter('${pc.name}')"
                        ${!hasSelectedEncounters ? 'disabled' : ''}>
                        Add to Encounter
                    </button>
                </div>
            </div>
        `).join('');
    },

    // Helper render functions
    renderPlayerHeader(pc) {
        return `
            <h4>${pc.name}</h4>
            <div class="stats">
                <div>Base Initiative: ${pc.base}</div>
                <div>Health: ${pc.health}/${pc.maxHealth}</div>
                <div>Body Armor: ${pc.bodyArmor}</div>
                <div>Head Armor: ${pc.headArmor}</div>
                ${pc.shield ? `<div>Shield: ${pc.shield} [${pc.shieldActive ? 'Active' : 'Inactive'}]</div>` : ''}
            </div>
        `;
    },

    renderWeaponsSection(pc) {
        return `
            <div class="weapons-section">
                <h4>Weapons</h4>
                ${pc.weapons && pc.weapons.length > 0 ? `
                    <div class="weapons-list">
                        ${pc.weapons.map(w => `
                            <div class="weapon-entry-readonly">
                                ${w.name}: ${w.damage}
                            </div>
                        `).join('')}
                    </div>
                ` : '<div class="weapon-entry-readonly">No weapons</div>'}
            </div>
        `;
    }
};

const DamageSystem = {
    applyDamage(participant, damage, options = {}) {
        if (participant.humanShield && options.rangeType === 'RANGED' && options.location !== 'head') {
            return this.applyHumanShieldDamage(participant, damage, options);
        }
        return this.applyStandardDamage(participant, damage, options);
    },

    applyHumanShieldDamage(target, damage, options) {
        let remainingDamage = this.applyStandardDamage(target, damage, options);
        
        if (target.health <= 0) {
            const shieldUsers = target.getHumanShieldUsers();
            shieldUsers.forEach(user => {
                user.releaseHumanShield();
                if (remainingDamage > 0) {
                    this.applyStandardDamage(user, remainingDamage, options);
                }
            });
        }
        
        return 0;
    },

    applyStandardDamage(participant, damage, options) {
        let remainingDamage = damage;
        
        // Apply cover damage
        remainingDamage = this.applyCoverDamage(participant, remainingDamage);
        
        // Apply shield damage
        remainingDamage = this.applyShieldDamage(participant, remainingDamage);
        
        // Apply armor and health damage
        remainingDamage = this.applyArmorAndHealthDamage(participant, remainingDamage, options.location);
        
        return remainingDamage;
    }
};

const CharacterManager = {
    saveCharacter(character) {
        const existingIndex = playerCharacters.findIndex(p => p.name === character.name);
        if (existingIndex >= 0) {
            this.updateExistingCharacter(existingIndex, character);
        } else {
            playerCharacters.push(character);
        }
        this.saveToStorage();
        UIRenderer.renderAllViews();
    },

    updateCharacterNotes(characterId, notes) {
        const character = this.findCharacterById(characterId);
        if (character) {
            character.notes = notes;
            this.saveToStorage();
            UIRenderer.renderAllViews();
        }
    },

    editCharacter(index) {
        const character = playerCharacters[index];
        if (!character) return;
        
        this.populateEditForm(character);
    }
};