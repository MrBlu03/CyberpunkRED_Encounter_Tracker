const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Ensure single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Persist window state (size/position)
const windowStateFile = path.join(app.getPath('userData'), 'window-state.json');
function loadWindowState() {
  try {
    const data = JSON.parse(fs.readFileSync(windowStateFile, 'utf8'));
    return {
      width: Math.max(800, data.width || 1200),
      height: Math.max(600, data.height || 800),
      x: typeof data.x === 'number' ? data.x : undefined,
      y: typeof data.y === 'number' ? data.y : undefined,
    };
  } catch {
    return { width: 1200, height: 800 };
  }
}

function saveWindowState(browserWindow) {
  if (!browserWindow) return;
  const bounds = browserWindow.getBounds();
  try {
    fs.writeFileSync(windowStateFile, JSON.stringify(bounds));
  } catch {
    // ignore
  }
}

function createWindow() {
  // Create the browser window
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
  },
  // Use packaged icon from src/assets
  icon: path.join(__dirname, 'src', 'assets', 'icon.png')
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
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            const { dialog } = require('electron');
            const version = app.getVersion();
            dialog.showMessageBox(mainWindow, {
              title: 'About Cyberpunk RED Encounter Tracker',
              message: `Cyberpunk RED Encounter Tracker v${version}\nDeveloped by MrBlu03`,
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Clean up reference
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Save window state on close
  mainWindow.on('close', () => saveWindowState(mainWindow));
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Improve Windows integration (notifications, taskbar grouping)
  app.setAppUserModelId('com.MrBlu03.cyberpunkredtracker');
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

// ----------------------------
// Catalog loading (Foundry packs YAML)
// ----------------------------
const KNOWN_CATEGORIES = new Set([
  'ammo','armor','clothing','critical-injuries-body','critical-injuries-head',
  'cyberware','drugs','gear','programs','roles','skills-languages',
  'skills-local-expert','skills-martial-arts','skills-play-instrument','skills-science',
  'upgrades','vehicles','weapons','weapons-branded','archetypes','cover'
]);

let catalogCache = null;

function listYamlFiles(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...listYamlFiles(full));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.yaml')) {
        results.push(full);
      }
    }
  } catch {
    // ignore missing dirs
  }
  return results;
}

function parseCatalog() {
  const packRoots = [
    path.join(__dirname, 'fvtt-cyberpunk-red-core-master', 'src', 'packs'),
    path.join(__dirname, 'packs') // optional local overrides/internal data
  ].filter(p => fs.existsSync(p));

  const itemsByCategory = Object.create(null);
  const byId = Object.create(null);
  const counts = Object.create(null);

  for (const root of packRoots) {
    const files = listYamlFiles(root);
    for (const file of files) {
      const relParts = path.relative(root, file).split(path.sep);
      // Determine category (first segment that matches known categories)
      let category = null;
      const prefix = [];
      for (let i = 0; i < relParts.length - 1; i++) {
        const seg = relParts[i];
        if (KNOWN_CATEGORIES.has(seg)) { category = seg; break; }
        prefix.push(seg);
      }
      if (!category) {
        const maybe = relParts.length > 1 ? relParts[relParts.length - 2] : null;
        if (maybe && KNOWN_CATEGORIES.has(maybe)) category = maybe;
      }
      const source = prefix.length ? prefix.join('/') : path.basename(root);
      const fileBase = path.basename(file, path.extname(file));

      let data;
      try {
        const raw = fs.readFileSync(file, 'utf8');
        data = yaml.load(raw);
      } catch (e) {
        data = { __parseError: String(e) };
      }

      const name = (data && (data.name || data.title)) || fileBase;
      const id = [source, category || 'misc', fileBase].filter(Boolean).join('/');
      const item = { id, name, category: category || 'misc', source, file: path.relative(root, file).replace(/\\/g, '/'), data };

      if (!itemsByCategory[item.category]) itemsByCategory[item.category] = [];
      itemsByCategory[item.category].push(item);
      byId[id] = item;
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
  }

  catalogCache = {
    meta: {
      loadedAt: Date.now(),
      roots: packRoots.map(r => path.relative(__dirname, r).replace(/\\/g, '/')),
      counts,
    },
    items: itemsByCategory,
    byId,
  };
  return catalogCache;
}

function getCatalog(forceReload = false) {
  if (!catalogCache || forceReload) {
    return parseCatalog();
  }
  return catalogCache;
}

ipcMain.handle('catalog:get', (_evt, { reload } = { reload: false }) => getCatalog(Boolean(reload)));

ipcMain.on('app:getVersion', (event) => {
  event.returnValue = app.getVersion();
});
