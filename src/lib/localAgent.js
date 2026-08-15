// Punto único de integración con la aplicación de escritorio (servicio local, ver
// carpeta local-agent/) que ejecuta las acciones reales sobre Windows: limpieza de
// historial, paneles del sistema, impresión, etc. Requiere que el servicio local esté
// corriendo (npm start dentro de local-agent/). Si no está disponible, la promesa se
// rechaza y quien llame debe mostrar el error al usuario.

const LOCAL_AGENT_BASE_URL = 'http://localhost:5177'
const CONTROL_BASE_URL = 'http://localhost:5178'

async function requestLocalAction(action, payload = {}) {
  const res = await fetch(`${LOCAL_AGENT_BASE_URL}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    throw new Error('No se pudo conectar con el servicio local. ¿Está corriendo local-agent?')
  })

  const data = await res.json()
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'La acción solicitada falló en el servicio local.')
  }
  return data
}

async function requestLocalGet(path) {
  const res = await fetch(`${LOCAL_AGENT_BASE_URL}/${path}`).catch(() => {
    throw new Error('No se pudo conectar con el servicio local. ¿Está corriendo local-agent?')
  })

  const data = await res.json()
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'La consulta falló en el servicio local.')
  }
  return data
}

export function clearBrowserData(browserId, types) {
  return requestLocalAction('clear-browser-data', { browserId, types })
}

export function clearDomainData(domain) {
  return requestLocalAction('clear-domain-data', { domain })
}

export function resetBrowserProfile(browserId) {
  return requestLocalAction('reset-browser-profile', { browserId })
}

export function openControlPanel() {
  return requestLocalAction('open-control-panel')
}

export function openWindowsSettings() {
  return requestLocalAction('open-windows-settings')
}

export function openTaskManager() {
  return requestLocalAction('open-task-manager')
}

export function openCmdAsAdmin() {
  return requestLocalAction('open-cmd-admin')
}

export function openPowerShell() {
  return requestLocalAction('open-powershell')
}

export function openServices() {
  return requestLocalAction('open-services')
}

export function openDeviceManager() {
  return requestLocalAction('open-device-manager')
}

export function openPrinterMaintenance(printerName) {
  return requestLocalAction('open-printer-maintenance', { printerName })
}

export function printTestPage(printerName) {
  return requestLocalAction('print-test-page', { printerName })
}

export function getInstalledBrowsers() {
  return requestLocalGet('installed-browsers')
}

export function getNetworkStatus() {
  return requestLocalGet('network-status')
}

export function getPrinters() {
  return requestLocalGet('printers')
}

export function setDefaultPrinter(printerName) {
  return requestLocalAction('set-default-printer', { printerName })
}

export function clearPrintQueue(printerName) {
  return requestLocalAction('clear-print-queue', { printerName })
}

export function removeStuckJobs(printerName) {
  return requestLocalAction('remove-stuck-jobs', { printerName })
}

export function restartSpooler() {
  return requestLocalAction('restart-spooler')
}

export function getSystemInfo() {
  return requestLocalGet('system-info')
}

export function openQuickFolder(folderKey) {
  return requestLocalAction('open-quick-folder', { folderKey })
}

export function runSfcScan() {
  return requestLocalAction('sfc-scan')
}

export function runDismRestoreHealth() {
  return requestLocalAction('dism-restore-health')
}

export function runChkdskScan() {
  return requestLocalAction('chkdsk-scan')
}

export function flushDns() {
  return requestLocalAction('flush-dns')
}

export function resetWinsock() {
  return requestLocalAction('reset-winsock')
}

export async function startAllRepairs() {
  const res = await fetch(`${LOCAL_AGENT_BASE_URL}/run-all-repairs`, { method: 'POST' }).catch(() => {
    throw new Error('No se pudo conectar con el servicio local. ¿Está corriendo local-agent?')
  })
  const data = await res.json()
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'No se pudo iniciar la reparación.')
  }
  return data.jobId
}

export function getRepairStatus(jobId) {
  return requestLocalGet(`repair-status/${jobId}`)
}

export function isAdmin() {
  return requestLocalGet('is-admin')
}

export function openRemoteApp(appId) {
  return requestLocalAction('open-remote-app', { appId })
}

export async function isLocalAgentAvailable() {
  try {
    const res = await fetch(`${LOCAL_AGENT_BASE_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}

// El panel de control (puerto 5178) es un proceso aparte que sigue vivo aunque el
// servicio real (5177) esté apagado con "Stop" — por eso se puede consultar su estado
// y volver a prenderlo sin necesidad de reabrir el .exe manualmente.
export async function getServiceStatus() {
  try {
    const res = await fetch(`${CONTROL_BASE_URL}/status`)
    if (!res.ok) return { installed: false, running: false }
    const data = await res.json()
    return { installed: true, running: !!data.running }
  } catch {
    return { installed: false, running: false }
  }
}

export async function stopService() {
  const res = await fetch(`${CONTROL_BASE_URL}/stop`, { method: 'POST' }).catch(() => null)
  if (!res || !res.ok) throw new Error('No se pudo detener el servicio.')
  return res.json()
}

export async function startService() {
  const res = await fetch(`${CONTROL_BASE_URL}/start`, { method: 'POST' }).catch(() => null)
  if (!res || !res.ok) throw new Error('No se pudo iniciar el servicio.')
  return res.json()
}

export function backupBrowserProfile(browserId) {
  return requestLocalAction('backup-browser-profile', { browserId })
}

export function backupBrowserBookmarks(browserId) {
  return requestLocalAction('backup-browser-bookmarks', { browserId })
}

export function openPasswordManager(browserId) {
  return requestLocalAction('open-password-manager', { browserId })
}

export async function startBackupAll() {
  const res = await fetch(`${LOCAL_AGENT_BASE_URL}/backup-all`, { method: 'POST' }).catch(() => {
    throw new Error('No se pudo conectar con el servicio local. ¿Está corriendo local-agent?')
  })
  const data = await res.json()
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'No se pudo iniciar el respaldo.')
  }
  return data.jobId
}

export function getBackupStatus(jobId) {
  return requestLocalGet(`backup-status/${jobId}`)
}

export function openBackupFolder(date) {
  return requestLocalAction('open-backup-folder', { date })
}
