document.addEventListener('DOMContentLoaded', function() {
    // Load current theme
    const currentTheme = localStorage.getItem('theme') || 'default';
    document.getElementById('theme-select').value = currentTheme;
    document.body.className = `theme-${currentTheme}`;
    
    // Theme select change handler
    document.getElementById('theme-select').addEventListener('change', function(e) {
        const theme = e.target.value;
        document.body.className = `theme-${theme}`;
        localStorage.setItem('theme', theme);
    });
    
    // Setup data management buttons
    document.getElementById('importDataFile').addEventListener('change', handleDataImport);
});

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This will delete all encounters and player characters.')) {
        localStorage.clear();
        alert('All data has been cleared. Refresh the page to start fresh.');
    }
}

function exportAllData() {
    const data = {
        playerCharacters: JSON.parse(localStorage.getItem('playerCharacters') || '[]'),
        encounters: JSON.parse(localStorage.getItem('encounters') || '[]'),
        encounterCounter: localStorage.getItem('encounterCounter'),
        theme: localStorage.getItem('theme')
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cpred_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importAllData() {
    document.getElementById('importDataFile').click();
}

function handleDataImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Import all data
            if (data.playerCharacters) {
                localStorage.setItem('playerCharacters', JSON.stringify(data.playerCharacters));
            }
            
            if (data.encounters) {
                localStorage.setItem('encounters', JSON.stringify(data.encounters));
            }
            
            if (data.encounterCounter) {
                localStorage.setItem('encounterCounter', data.encounterCounter);
            }
            
            if (data.theme) {
                localStorage.setItem('theme', data.theme);
                document.body.className = `theme-${data.theme}`;
                document.getElementById('theme-select').value = data.theme;
            }
            
            alert('Data imported successfully. Refresh the page to see changes.');
        } catch (error) {
            alert('Error importing data: ' + error.message);
        }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    event.target.value = '';
}
