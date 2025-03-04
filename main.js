const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'src', 'html', 'index.html'));

  // Set up application menu
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Netrunner',
          click: () => mainWindow.loadFile(path.join(__dirname, 'src', 'html', 'netrunner.html'))
        },
        {
          label: 'PC Manager',
          click: () => mainWindow.loadFile(path.join(__dirname, 'src', 'html', 'pc-manager.html'))
        },
        {
          label: 'Time Tracker',
          click: () => mainWindow.loadFile(path.join(__dirname, 'src', 'html', 'timetracker.html'))
        },
        {
          label: 'Settings',
          click: () => mainWindow.loadFile(path.join(__dirname, 'src', 'html', 'settings.html'))
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              title: 'About Cyberpunk RED Encounter Tracker',
              message: 'Cyberpunk RED Encounter Tracker v1.0.0\nDeveloped by MrBlu03',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
