document.addEventListener('DOMContentLoaded', function() {
    // Initialize weapon fields for new character form
    if (typeof addWeaponFields === 'function') {
        addWeaponFields('pc-weapon-fields');
    } else {
        console.error('addWeaponFields function not found');
    }
    
    // Load existing player characters 
    if (typeof loadPlayerCharacters === 'function') {
        loadPlayerCharacters();
    } else {
        console.error('loadPlayerCharacters function not found');
    }
    
    // Fix main.js window.onload error
    // Override the window.onload function from main.js to avoid the error
    window.originalOnload = window.onload;
    window.onload = function() {
        // Call the original onload function in a safe way
        try {
            // Create safe versions of functions called in the original onload
            const safeLoadEncounters = function() {
                if (document.getElementById('encounters')) {
                    loadEncounters();
                } else {
                    console.log('Encounters element not found, skipping loadEncounters');
                }
            };
            
            // Replace the loadEncounters function temporarily
            const originalLoadEncounters = window.loadEncounters;
            window.loadEncounters = safeLoadEncounters;
            
            // Call the original onload
            if (typeof window.originalOnload === 'function') {
                window.originalOnload.call(window);
            }
            
            // Restore the original function
            window.loadEncounters = originalLoadEncounters;
        } catch (error) {
            console.error('Error in window.onload:', error);
        }
    };
    
    // Add event listeners for buttons
    document.getElementById('add-weapon-btn').addEventListener('click', function() {
        addWeaponFields('pc-weapon-fields');
    });
    
    document.getElementById('save-character-btn').addEventListener('click', function() {
        savePlayerCharacter();
    });
    
    document.getElementById('export-characters-btn').addEventListener('click', function() {
        exportPlayerCharacters();
    });
    
    document.getElementById('import-btn').addEventListener('click', function() {
        document.getElementById('importPCFile').click();
    });
    
    document.getElementById('importPCFile').addEventListener('change', function(event) {
        importPlayerCharacters(event);
    });
    
    document.getElementById('pc-notes').addEventListener('input', function(event) {
        updateCharacterNotes(event);
    });
});

// Add a fallback implementation of addWeaponFields in case it's not defined in main.js
if (typeof window.addWeaponFields !== 'function') {
    window.addWeaponFields = function(containerId) {
        console.log('Using fallback addWeaponFields');
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const fieldPair = document.createElement('div');
        fieldPair.className = 'weapon-field-pair';
        fieldPair.innerHTML = `
            <input type="text" class="weapon-name-field" placeholder="Weapon Name">
            <input type="text" class="weapon-damage-field" placeholder="Damage (e.g. 3d6)">
            <button type="button" class="remove-weapon-btn">×</button>
        `;
        
        // Add event listener for the remove button
        const removeBtn = fieldPair.querySelector('.remove-weapon-btn');
        removeBtn.addEventListener('click', function() {
            fieldPair.remove();
        });
        
        container.appendChild(fieldPair);
    };
}
