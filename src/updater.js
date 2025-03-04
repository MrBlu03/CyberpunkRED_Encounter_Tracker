document.addEventListener('DOMContentLoaded', () => {
  // Create the update notification element
  const updateContainer = document.createElement('div');
  updateContainer.id = 'update-container';
  updateContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1a1a1a;
    color: white;
    border: 1px solid #ff0077;
    padding: 15px;
    border-radius: 5px;
    font-family: 'Arial', sans-serif;
    z-index: 1000;
    display: none;
    box-shadow: 0 0 10px rgba(255, 0, 119, 0.5);
  `;
  
  document.body.appendChild(updateContainer);
  
  // Setup event listeners for auto-updater
  if (window.electronAPI) {
    // Checking for update
    window.electronAPI.onUpdateChecking(() => {
      console.log('Checking for updates...');
    });
    
    // Update available
    window.electronAPI.onUpdateAvailable(() => {
      updateContainer.innerHTML = `
        <div style="margin-bottom: 10px;">A new update is available and downloading...</div>
        <div id="download-progress">0%</div>
      `;
      updateContainer.style.display = 'block';
    });
    
    // Update not available
    window.electronAPI.onUpdateNotAvailable(() => {
      console.log('No updates available');
    });
    
    // Update error
    window.electronAPI.onUpdateError((message) => {
      console.error('Update error:', message);
    });
    
    // Download progress
    window.electronAPI.onUpdateProgress((progressObj) => {
      const progressElement = document.getElementById('download-progress');
      if (progressElement) {
        progressElement.textContent = `${Math.round(progressObj.percent)}%`;
      }
    });
    
    // Update downloaded
    window.electronAPI.onUpdateDownloaded(() => {
      updateContainer.innerHTML = `
        <div style="margin-bottom: 10px;">Update downloaded! Restart to install.</div>
        <button id="restart-button" style="background: #ff0077; color: white; border: none; padding: 8px 15px; border-radius: 3px; cursor: pointer;">
          Restart Now
        </button>
      `;
      
      document.getElementById('restart-button').addEventListener('click', () => {
        window.electronAPI.restartAndInstall();
      });
    });
    
    // Check for updates on startup (optional)
    setTimeout(() => {
      window.electronAPI.checkForUpdates();
    }, 3000);
  }
});

// Function to manually check for updates
function checkForUpdates() {
  if (window.electronAPI) {
    window.electronAPI.checkForUpdates();
  }
}
