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
    // Make the notation case insensitive
    notation = notation.toLowerCase();
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

function makeDiceNotationsClickable(element) {
    if (!element) return;
    
    // Regular expression to match dice notations (case insensitive)
    const diceRegex = /\b(\d+)[dD](\d+)([+-]\d+)?\b/g;
    
    // Function to process a text node
    function processTextNode(textNode) {
        const text = textNode.nodeValue;
        const matches = [...text.matchAll(diceRegex)];
        
        if (matches.length === 0) return;
        
        // Create a document fragment to hold the new nodes
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        
        matches.forEach(match => {
            // Add text before the match
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }
            
            // Create clickable span for the dice notation
            const span = document.createElement('span');
            span.className = 'clickable-dice';
            span.textContent = match[0];
            span.onclick = () => quickRoll(match[0].toLowerCase());
            
            fragment.appendChild(span);
            lastIndex = match.index + match[0].length;
        });
        
        // Add remaining text after the last match
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        
        // Replace the original text node with the fragment
        textNode.parentNode.replaceChild(fragment, textNode);
    }
    
    // Function to recursively process all text nodes in an element
    function processElement(element) {
        // Skip if element is a script or style tag
        if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return;
        
        // Process all child nodes
        const childNodes = Array.from(element.childNodes);
        childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                processTextNode(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                processElement(node);
            }
        });
    }
    
    // Process the element and all its children
    processElement(element);
}

// Initialize clickable dice notations for weapons and notes sections
document.addEventListener('DOMContentLoaded', () => {
    // Process all weapons sections
    const weaponsSections = document.querySelectorAll('.weapons-section');
    weaponsSections.forEach(section => {
        makeDiceNotationsClickable(section);
    });
    
    // Also handle any dynamically added weapons sections
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check if the node is a weapons section or contains one
                        if (node.classList.contains('weapons-section')) {
                            makeDiceNotationsClickable(node);
                        } else {
                            const weaponsSections = node.querySelectorAll('.weapons-section');
                            weaponsSections.forEach(section => {
                                makeDiceNotationsClickable(section);
                            });
                        }
                    }
                });
            }
        });
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        characterData: true
    });
});


