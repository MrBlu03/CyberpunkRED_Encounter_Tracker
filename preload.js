const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // File system access
  readFile: (filePath) => {
    try {
      return fs.readFileSync(path.resolve(__dirname, filePath), 'utf8');
    } catch (error) {
      console.error('Failed to read file:', error);
      return null;
    }
  },
  writeFile: (filePath, data) => {
    try {
      fs.writeFileSync(path.resolve(__dirname, filePath), data, 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to write file:', error);
      return false;
    }
  },
  // You can add more API functions here as needed
});
