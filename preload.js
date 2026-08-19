const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Protected Domains
  getProtectedDomains: () => ipcRenderer.invoke('get-protected-domains'),
  addDomain: (item) => ipcRenderer.invoke('add-domain', item),
  removeDomain: (domain) => ipcRenderer.invoke('remove-domain', domain),
  isProtected: (domain) => ipcRenderer.invoke('is-protected', domain),
  exportDomains: () => ipcRenderer.invoke('export-domains'),
  importDomains: () => ipcRenderer.invoke('import-domains'),

  // Browsers
  detectBrowsers: () => ipcRenderer.invoke('detect-browsers'),
  clearData: (browserId, profilePath, dataTypes) =>
    ipcRenderer.invoke('clear-data', browserId, profilePath, dataTypes),
  cleanDomain: (domain) => ipcRenderer.invoke('clean-domain', domain),
  backup: (browserId, profilePath, dataTypes) =>
    ipcRenderer.invoke('backup', browserId, profilePath, dataTypes),

  // Activity Log
  getActivityLog: () => ipcRenderer.invoke('get-activity-log'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),

  // Dialogs
  confirmCleanDomain: (domain) => ipcRenderer.invoke('confirm-clean-domain', domain),
});
