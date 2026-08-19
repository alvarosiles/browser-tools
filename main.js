const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Import electron modules - these will be available when electron starts
let app, BrowserWindow, ipcMain, dialog;

// Try to get electron if available, otherwise use a deferred approach
try {
  const electron = require('electron');
  if (typeof electron === 'object' && electron.app) {
    // Direct access works
    ({ app, BrowserWindow, ipcMain, dialog } = electron);
  } else {
    // Module needs deferred loading
    throw new Error('Electron not ready');
  }
} catch (e) {
  // Electron might not be initialized yet, try getting from global
  Object.defineProperty(global, 'electronReady', {
    set(value) {
      ({ app, BrowserWindow, ipcMain, dialog } = value);
    },
  });

  // Try loading electron in a deferred way
  setImmediate(() => {
    try {
      const electron = require('electron');
      if (typeof electron === 'object' && electron.app) {
        app = electron.app;
        BrowserWindow = electron.BrowserWindow;
        ipcMain = electron.ipcMain;
        dialog = electron.dialog;
        console.log('Electron modules loaded in deferred mode');
      }
    } catch (err) {
      console.error('Could not load electron modules:', err.message);
    }
  });
}

const PROTECTED_FILE = path.join(__dirname, 'src', 'model', 'protectedDomains.json');

let modules = {};
let globals = {
  activityLog: null,
  browserManager: null,
};

function loadModules() {
  try {
    modules = {
      uuidv4,
      BrowserDetector: require('./src/core/BrowserDetector'),
      BrowserManager: require('./src/core/BrowserManager'),
      FsUtils: require('./src/utils/fsUtils'),
      DomainUtils: require('./src/utils/domainUtils'),
      ActivityLog: require('./src/core/ActivityLog'),
    };
    console.log('✓ Modules loaded');
    return true;
  } catch (e) {
    console.error('✗ Failed to load modules:', e.message);
    return false;
  }
}

function createWindow() {
  console.log('Creating window...');
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile('index.html');

  if (process.env.DEBUG) {
    win.webContents.openDevTools();
  }

  console.log('✓ Window created');
}

// Use setTimeout to defer electron access
setTimeout(() => {
  if (!app) {
    console.error('Electron app not available after timeout');
    return;
  }

  app.on('ready', () => {
    console.log('★ App ready');
    if (!loadModules()) {
      app.quit();
      return;
    }
    createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  console.log('✓ App event listeners registered');
}, 100);

// Helpers
const getActivityLog = () => {
  if (!modules.ActivityLog) return null;
  if (!globals.activityLog) {
    globals.activityLog = new modules.ActivityLog();
  }
  return globals.activityLog;
};

const getBrowserManager = () => {
  if (!modules.BrowserManager) return null;
  if (!globals.browserManager) {
    globals.browserManager = new modules.BrowserManager();
  }
  return globals.browserManager;
};

// ============ IPC HANDLERS ============
// These are registered immediately but will only work after app is ready

const registerIpcHandlers = () => {
  if (!ipcMain) {
    setTimeout(registerIpcHandlers, 100);
    return;
  }

  ipcMain.handle('get-protected-domains', async () => {
    try {
      const data = modules.FsUtils?.readJSON(PROTECTED_FILE);
      return data || [];
    } catch {
      return [];
    }
  });

  ipcMain.handle('add-domain', async (event, item) => {
    try {
      const domains = modules.FsUtils?.readJSON(PROTECTED_FILE) || [];
      domains.push({
        id: modules.uuidv4?.(),
        ...item,
        protected: true,
      });
      modules.FsUtils?.writeJSON(PROTECTED_FILE, domains);
      const log = getActivityLog();
      if (log) log.info(`Domain added: ${item.domain}`);
      return { success: true };
    } catch (error) {
      const log = getActivityLog();
      if (log) log.error(`Failed to add domain: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('remove-domain', async (event, domain) => {
    try {
      let domains = modules.FsUtils?.readJSON(PROTECTED_FILE) || [];
      domains = domains.filter(x => x.domain !== domain);
      modules.FsUtils?.writeJSON(PROTECTED_FILE, domains);
      const log = getActivityLog();
      if (log) log.info(`Domain removed: ${domain}`);
      return { success: true };
    } catch (error) {
      const log = getActivityLog();
      if (log) log.error(`Failed to remove domain: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('is-protected', async (event, domain) => {
    try {
      const domains = modules.FsUtils?.readJSON(PROTECTED_FILE) || [];
      const cleanDomain = modules.DomainUtils?.extractDomain(domain);
      return domains.some(pd => modules.DomainUtils?.matchesDomain(cleanDomain, pd.domain));
    } catch {
      return false;
    }
  });

  ipcMain.handle('export-domains', async (event) => {
    try {
      const result = await dialog.showSaveDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: 'protected-domains.json',
      });

      if (!result.canceled) {
        const domains = modules.FsUtils?.readJSON(PROTECTED_FILE) || [];
        modules.FsUtils?.writeJSON(result.filePath, domains);
        const log = getActivityLog();
        if (log) log.success(`Domains exported to ${result.filePath}`);
        return { success: true, path: result.filePath };
      }
      return { success: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('import-domains', async (event) => {
    try {
      const result = await dialog.showOpenDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const imported = modules.FsUtils?.readJSON(result.filePaths[0]);
        if (Array.isArray(imported)) {
          modules.FsUtils?.writeJSON(PROTECTED_FILE, imported);
          const log = getActivityLog();
          if (log) log.success(`Domains imported from ${result.filePaths[0]}`);
          return { success: true };
        }
      }
      return { success: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('detect-browsers', async () => {
    try {
      const manager = getBrowserManager();
      const browsers = manager?.detect() || [];
      const log = getActivityLog();
      if (log) log.info(`Browsers detected: ${browsers.filter(b => b.installed).map(b => b.name).join(', ')}`);
      return browsers;
    } catch (error) {
      const log = getActivityLog();
      if (log) log.error(`Browser detection failed: ${error.message}`);
      return [];
    }
  });

  ipcMain.handle('clear-data', async (event, browserId, profilePath, dataTypes) => {
    try {
      const log = getActivityLog();
      if (log) log.info(`Clearing data from ${browserId}...`);
      const manager = getBrowserManager();
      const domains = modules.FsUtils?.readJSON(PROTECTED_FILE) || [];

      const results = await manager?.clearData(browserId, profilePath, dataTypes, domains);

      if (log) log.success(`Data cleared from ${browserId}`);
      return { success: true, results };
    } catch (error) {
      const log = getActivityLog();
      if (log) log.error(`Clear data failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clean-domain', async (event, domain) => {
    try {
      const cleanDomain = modules.DomainUtils?.extractDomain(domain);
      const log = getActivityLog();
      if (log) log.info(`Cleaning data for domain: ${cleanDomain}`);

      const manager = getBrowserManager();
      const browsers = manager?.detect() || [];
      for (const browser of browsers) {
        if (!browser.installed) continue;
        for (const profile of browser.profiles) {
          await manager?.clearData(browser.id, profile.path, ['cookies', 'history'], []);
        }
      }

      if (log) log.success(`Domain ${cleanDomain} cleaned from all browsers`);
      return { success: true };
    } catch (error) {
      const log = getActivityLog();
      if (log) log.error(`Clean domain failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup', async (event, browserId, profilePath, dataTypes) => {
    try {
      const log = getActivityLog();
      if (log) log.info(`Backing up ${browserId}...`);
      const manager = getBrowserManager();
      const result = await manager?.backup(browserId, profilePath, dataTypes);

      if (result?.success) {
        if (log) log.success(`Backup created at ${result.path}`);
      } else {
        if (log) log.error(`Backup failed: ${result?.message}`);
      }

      return result || { success: false };
    } catch (error) {
      const log = getActivityLog();
      if (log) log.error(`Backup failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-activity-log', async () => {
    try {
      const log = getActivityLog();
      return log ? log.load() : [];
    } catch {
      return [];
    }
  });

  ipcMain.handle('clear-logs', async () => {
    try {
      const log = getActivityLog();
      if (log) log.clear();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('confirm-clean-domain', async (event, domain) => {
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Confirmar limpieza',
      message: `¿Borrar todos los datos de ${domain}?`,
      detail: 'Se eliminarán cookies, historial, permisos y datos guardados en todos los navegadores compatibles.',
      buttons: ['Cancelar', 'Borrar datos'],
    });
    return result.response === 1;
  });

  console.log('✓ IPC handlers registered');
};

registerIpcHandlers();
