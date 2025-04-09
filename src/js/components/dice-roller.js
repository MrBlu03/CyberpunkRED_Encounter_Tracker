let rollHistory = [];

function rollDice(diceNotation) {
    const diceInput = document.getElementById('dice-input');
    const resultDiv = document.getElementById('dice-result');
    const historyDiv = document.getElementById('roll-history');
    const criticalInjuryDiv = document.getElementById('critical-injury-result');
    const hitLocationSelect = document.getElementById('hit-location');
    const hitLocation = hitLocationSelect.value;
    
    diceNotation = diceNotation || diceInput.value.trim();

    if (!diceNotation) {
        resultDiv.textContent = 'Please enter dice notation (e.g., 2d6+3).';
        return;
    }

    let resultText = '';
    let criticalInjuryText = '';
    let isCritical = false;
    let result = null;

    try {
        result = parseDiceNotation(diceNotation);
        // Format rolls to highlight 6s
        const formattedRolls = result.rolls.map(roll => 
            roll === 6 ? `<span class="highlight-six">${roll}</span>` : roll
        );
        resultText = `Result: ${result.total} (${formattedRolls.join(', ')})`;

        // Critical Injury Detection
        const criticalSystem = localStorage.getItem('criticalInjurySystem') || 'default';
        const sixes = result.rolls.filter(roll => roll === 6).length;
        
        if (criticalSystem === 'tarot') {
            isCritical = (result.rolls.length >= 3 && sixes >= 3);
            if (isCritical) {
                resultText += ' - Tarot Critical!';
                const card = drawTarotCard();
                criticalInjuryText = `Tarot Card: ${card.name} - ${card.description}`;
                criticalInjuryDiv.style.display = 'block';
            }
        } else {
            isCritical = (result.rolls.length >= 2 && sixes >= 2);
            if (isCritical) {
                resultText += ' - Critical Injury! +5 Bonus Damage';
                const table = CRITICAL_INJURIES[hitLocation.charAt(0).toUpperCase() + hitLocation.slice(1)];
                if (table) {
                    let roll1 = Math.floor(Math.random() * 6) + 1;
                    let roll2 = Math.floor(Math.random() * 6) + 1;
                    let index = roll1 + roll2 - 2;
                    if (index >= 0 && index < table.length) {
                        const injury = table[index];
                        criticalInjuryText = `Critical Injury (${roll1}+${roll2}=${roll1+roll2}): ${injury.name} - ${injury.description}`;
                        criticalInjuryDiv.style.display = 'block';
                    }
                }
            }
        }

    } catch (error) {
        resultText = 'Invalid dice notation. Please use the format XdY+Z.';
    }

    criticalInjuryDiv.innerHTML = criticalInjuryText;
    resultDiv.innerHTML = resultText;
    resultDiv.className = isCritical ? 'critical-injury' : '';

    if (!isCritical) {
        criticalInjuryDiv.style.display = 'none';
        criticalInjuryDiv.innerHTML = '';
    }

    // Update Roll History
    rollHistory.unshift(`${diceNotation}: ${resultText}`); // Add to the beginning
    if (rollHistory.length > 5) { // Limit history to last 5 rolls
        rollHistory.pop(); // Remove the last element
    }

    // Render Roll History
    historyDiv.innerHTML = rollHistory.map(roll => `<div>${roll}</div>`).join('');
}

function parseDiceNotation(notation) {
    const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) {
        throw new Error('Invalid dice notation');
    }

    const numDice = parseInt(match[1]);
    const diceSides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;
    const rolls = [];
    let total = 0;

    for (let i = 0; i < numDice; i++) {
        const roll = Math.floor(Math.random() * diceSides) + 1;
        rolls.push(roll);
        total += roll;
    }

    total += modifier;

    return {
        total: total,
        rolls: rolls
    };
}

function quickRoll(diceNotation, hitLocation) {
    document.getElementById('dice-input').value = diceNotation;
    rollDice(diceNotation);
}


