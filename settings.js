let currentTheme = localStorage.getItem('theme') || 'default';

function initializeSettings() {
    document.body.className = `theme-${currentTheme}`;
    document.getElementById('theme-select').value = currentTheme;
}

// Event Listeners
document.getElementById('theme-select').addEventListener('change', (e) => {
    const newTheme = e.target.value;
    // Apply theme before changing class to prevent flash
    document.documentElement.style.setProperty('--theme-transition', 'none');
    document.body.className = `theme-${newTheme}`;
    // Force reflow
    document.body.offsetHeight;
    document.documentElement.style.removeProperty('--theme-transition');
    
    currentTheme = newTheme;
    localStorage.setItem('theme', newTheme);
});

function clearAllData() {
    if (confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
        localStorage.clear();
        alert('All data has been cleared. The page will now reload.');
        window.location.reload();
    }
}

function exportAllData() {
    const data = {
        encounters: JSON.parse(localStorage.getItem('encounters') || '[]'),
        playerCharacters: JSON.parse(localStorage.getItem('playerCharacters') || '[]'),
        settings: {
            theme: currentTheme,
            largeText,
            disableAnimations,
            customTheme: JSON.parse(localStorage.getItem('customTheme') || '{}')
        }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cpred_tracker_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importAllData() {
    document.getElementById('importDataFile').click();
}

document.getElementById('importDataFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.encounters) localStorage.setItem('encounters', JSON.stringify(data.encounters));
            if (data.playerCharacters) localStorage.setItem('playerCharacters', JSON.stringify(data.playerCharacters));
            if (data.settings) {
                localStorage.setItem('theme', data.settings.theme);
                localStorage.setItem('largeText', data.settings.largeText);
                localStorage.setItem('disableAnimations', data.settings.disableAnimations);
                if (data.settings.customTheme) {
                    localStorage.setItem('customTheme', JSON.stringify(data.settings.customTheme));
                }
            }
            
            alert('Data imported successfully. The page will now reload.');
            window.location.reload();
        } catch (error) {
            alert('Error importing data: ' + error.message);
        }
    };
    reader.readAsText(file);
});

// Replace the existing back button handler
document.querySelector('.back-icon')?.addEventListener('click', (e) => {
    e.preventDefault();
    // Just navigate back, don't force reload
    window.location.href = 'index.html';
});

// Initialize settings when the page loads
document.addEventListener('DOMContentLoaded', initializeSettings);
