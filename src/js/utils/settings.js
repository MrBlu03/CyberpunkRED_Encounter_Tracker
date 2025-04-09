document.addEventListener('DOMContentLoaded', function() {
    // Theme selection functionality
    const themeSelect = document.getElementById('theme-select');
    
    // Only run theme logic if the select element exists
    if (themeSelect) {
        // Load current theme
        const currentTheme = localStorage.getItem('theme') || 'default';
        themeSelect.value = currentTheme;
        
        // Apply theme when changed
        themeSelect.addEventListener('change', function() {
            const selectedTheme = themeSelect.value;
            localStorage.setItem('theme', selectedTheme);
            applyTheme(selectedTheme);
        });
        
        // Apply the current theme on page load
        applyTheme(currentTheme);
    } else {
        // If themeSelect doesn't exist, still apply the theme from localStorage
        const currentTheme = localStorage.getItem('theme') || 'default';
        applyTheme(currentTheme);
    }
    
    // Critical Injury System selection functionality
    const criticalInjurySystemSelect = document.getElementById('critical-injury-system');
    const tarotInfo = document.querySelector('.tarot-info');
    
    // Only run critical injury system logic if the select element exists
    if (criticalInjurySystemSelect) {
        // Load current critical injury system
        const currentCriticalSystem = localStorage.getItem('criticalInjurySystem') || 'default';
        criticalInjurySystemSelect.value = currentCriticalSystem;
        if (tarotInfo) {
             tarotInfo.style.display = currentCriticalSystem === 'tarot' ? 'block' : 'none';
        }
        
        // Handle critical injury system changes
        criticalInjurySystemSelect.addEventListener('change', function() {
            const selectedSystem = criticalInjurySystemSelect.value;
            localStorage.setItem('criticalInjurySystem', selectedSystem);
            if (tarotInfo) {
                tarotInfo.style.display = selectedSystem === 'tarot' ? 'block' : 'none';
            }
        });
    }
    
    // Export all data button functionality (assuming this button might only be on settings page)
    const exportButton = document.querySelector('button[onclick="exportAllData()"]');
    if (exportButton) {
        exportButton.addEventListener('click', function() {
            exportAllData();
        });
    }
    
    // Import data button functionality (assuming this button might only be on settings page)
    const importButton = document.querySelector('button[onclick="importAllData()"]');
    const importFile = document.getElementById('importDataFile');
    if (importButton && importFile) {
        importButton.addEventListener('click', function() {
            importFile.click();
        });
        
        // Setup file input listener
        importFile.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        importAllData(e.target.result);
                    } catch (error) {
                        showNotification('Error importing data: ' + error.message, 'error');
                    }
                };
                reader.readAsText(file);
            }
        });
    }
    
    // Clear all data button functionality (assuming this button might only be on settings page)
    const clearButton = document.querySelector('button[onclick="clearAllData()"]');
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to clear all data? This cannot be undone!')) {
                clearAllData();
            }
        });
    }
});

// Apply theme function (defined globally)
function applyTheme(theme) {
    // Apply theme using class on <html> for earlier application
    document.documentElement.className = `theme-${theme}`;
}

// Export all data function (defined globally)
function exportAllData() {
    // Collect all data from localStorage
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
            // Try to parse the value as JSON
            allData[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
            // If it's not valid JSON, store as is
            allData[key] = localStorage.getItem(key);
        }
    }
    
    // Convert to JSON string
    const dataStr = JSON.stringify(allData, null, 2);
    
    // Create a download link
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'cyberpunk_red_tracker_data.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.style.display = 'none';
    
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    
    showNotification('All data successfully exported!', 'success');
}

// Import all data function
function importAllData(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        
        // First, back up current theme if it exists
        const currentTheme = localStorage.getItem('theme') || 'default';
        const currentCriticalSystem = localStorage.getItem('criticalInjurySystem') || 'default';
        
        // Clear existing data
        localStorage.clear();
        
        // Import all data
        for (const key in data) {
            if (typeof data[key] === 'object' && data[key] !== null) {
                localStorage.setItem(key, JSON.stringify(data[key]));
            } else {
                localStorage.setItem(key, data[key]);
            }
        }
        
        // Reapply the theme that was in the imported data, or fall back to the backed-up theme
        const importedTheme = localStorage.getItem('theme') || currentTheme;
        applyTheme(importedTheme);
        
        // Update theme select dropdown
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = importedTheme;
        }
        
        // Update critical injury system select dropdown
        const criticalInjurySystemSelect = document.getElementById('critical-injury-system');
        if (criticalInjurySystemSelect) {
            criticalInjurySystemSelect.value = localStorage.getItem('criticalInjurySystem') || currentCriticalSystem;
            const tarotInfo = document.querySelector('.tarot-info');
            if (tarotInfo) {
                tarotInfo.style.display = criticalInjurySystemSelect.value === 'tarot' ? 'block' : 'none';
            }
        }
        
        showNotification('Data successfully imported! Refresh other open pages to see changes.', 'success');
    } catch (error) {
        console.error("Import error:", error);
        showNotification('Error importing data: Invalid JSON format', 'error');
    }
}

// Clear all data function
function clearAllData() {
    // Save the current theme and critical injury system before clearing
    const currentTheme = localStorage.getItem('theme') || 'default';
    const currentCriticalSystem = localStorage.getItem('criticalInjurySystem') || 'default';
    
    // Clear all data
    localStorage.clear();
    
    // Restore the theme and critical injury system
    localStorage.setItem('theme', currentTheme);
    localStorage.setItem('criticalInjurySystem', currentCriticalSystem);
    
    showNotification('All data has been cleared!', 'warning');
}

// Notification function
function showNotification(message, type = 'info') {
    // Remove any existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        ${message}
        <span class="close-notification">&times;</span>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Add close functionality
    notification.querySelector('.close-notification').addEventListener('click', function() {
        notification.remove();
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }
    }, 5000);
}


