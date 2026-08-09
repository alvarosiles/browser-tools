import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { isSea } from 'node:sea'
import {
  clearBrowserData,
  clearDomainData,
  openControlPanel,
  openWindowsSettings,
  openTaskManager,
  openCmdAsAdmin,
  openPowerShell,
  openServices,
  openDeviceManager,
  openPrinterMaintenance,
  printTestPage,
  detectInstalledBrowsers,
  backupBrowserProfile,
  backupBrowserBookmarks,
  openPasswordManager,
  backupAll,
  openBackupFolder,
  getNetworkStatus,
  listPrinters,
  setDefaultPrinter,
  clearPrintQueue,
  removeStuckJobs,
  restartSpooler,
  getSystemInfo,
  openQuickFolder,
  runSfcScan,
  runDismRestoreHealth,
  runChkdskScan,
  flushDns,
  resetWinsock,
  runAllRepairs,
  isElevated,
  openRemoteApp,
} from './commands.js'

const WORKER_PORT = process.env.PORT || 5177
const CONTROL_PORT = process.env.CONTROL_PORT || 5178

// Cuando corre empaquetado como .exe (Node SEA), el botón "Instalar App" de la web solo
// descarga este binario — la "instalación" real (copiarse a una ubicación fija y arrancar
// junto con Windows) la hace el propio .exe la primera vez que se ejecuta. Así el usuario
// no depende de tener Node.js instalado ni de correr comandos por consola.
function ensureInstalled() {
  if (!isSea()) return
  try {
    const installDir = path.join(os.homedir(), 'AppData', 'Local', 'BrowserToolsAgent')
    const installPath = path.join(installDir, 'BrowserToolsAgent.exe')
    const currentPath = path.resolve(process.execPath)
    if (currentPath.toLowerCase() === installPath.toLowerCase()) return

    fs.mkdirSync(installDir, { recursive: true })
    fs.copyFileSync(currentPath, installPath)
    execSync(
      `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v BrowserToolsAgent /t REG_SZ /d "\\"${installPath}\\"" /f`,
      { windowsHide: true }
    )
    console.log(`Instalado en ${installPath}. Se iniciará automáticamente al encender Windows.`)
  } catch (err) {
    console.error('No se pudo completar la instalación automática:', err.message)
  }
}

ensureInstalled()

const app = express()
app.use(cors())
app.use(express.json())

// Panel de control aparte (puerto propio): siempre queda escuchando, incluso cuando el
// botón "Stop" de la web apaga el servicio real. Así "Play" puede volver a levantarlo sin
// necesitar reabrir el .exe manualmente — el usuario solo pausa/reanuda, no cierra la app.
let workerServer = null

function startWorker() {
  if (workerServer) return
  workerServer = app.listen(WORKER_PORT, '127.0.0.1', () => {
    console.log(`IT Support Tools local agent escuchando en http://127.0.0.1:${WORKER_PORT}`)
  })
}

function stopWorker() {
  if (!workerServer) return
  workerServer.close()
  workerServer = null
  console.log('Servicio detenido (Stop).')
}

const controlApp = express()
controlApp.use(cors())
controlApp.get('/status', (_req, res) => res.json({ ok: true, running: workerServer !== null }))
controlApp.post('/start', (_req, res) => {
  startWorker()
  res.json({ ok: true, running: true })
})
controlApp.post('/stop', (_req, res) => {
  stopWorker()
  res.json({ ok: true, running: false })
})
controlApp.listen(CONTROL_PORT, '127.0.0.1', () => {
  console.log(`Panel de control escuchando en http://127.0.0.1:${CONTROL_PORT}`)
})

function handle(action, fn) {
  app.post(`/${action}`, async (req, res) => {
    try {
      const result = await fn(req.body)
      res.json({ ok: true, action, result })
    } catch (err) {
      console.error(`[${action}]`, err.message)
      res.status(500).json({ ok: false, action, error: err.message })
    }
  })
}

handle('clear-browser-data', ({ browserId, types }) => clearBrowserData(browserId, types))
handle('clear-domain-data', ({ domain }) => clearDomainData(domain))
handle('open-control-panel', () => openControlPanel())
handle('open-windows-settings', () => openWindowsSettings())
handle('open-task-manager', () => openTaskManager())
handle('open-cmd-admin', () => openCmdAsAdmin())
handle('open-powershell', () => openPowerShell())
handle('open-services', () => openServices())
handle('open-device-manager', () => openDeviceManager())
handle('open-printer-maintenance', ({ printerName }) => openPrinterMaintenance(printerName))
handle('print-test-page', ({ printerName }) => printTestPage(printerName))
handle('backup-browser-profile', ({ browserId }) => backupBrowserProfile(browserId))
handle('backup-browser-bookmarks', ({ browserId }) => backupBrowserBookmarks(browserId))
handle('open-password-manager', ({ browserId }) => openPasswordManager(browserId))
handle('open-backup-folder', ({ date }) => openBackupFolder(date))
handle('set-default-printer', ({ printerName }) => setDefaultPrinter(printerName))
handle('clear-print-queue', ({ printerName }) => clearPrintQueue(printerName))
handle('remove-stuck-jobs', ({ printerName }) => removeStuckJobs(printerName))
handle('restart-spooler', () => restartSpooler())
handle('open-quick-folder', ({ folderKey }) => openQuickFolder(folderKey))
handle('open-remote-app', ({ appId }) => openRemoteApp(appId))
handle('sfc-scan', () => runSfcScan())
handle('dism-restore-health', () => runDismRestoreHealth())
handle('chkdsk-scan', () => runChkdskScan())
handle('flush-dns', () => flushDns())
handle('reset-winsock', () => resetWinsock())

app.get('/installed-browsers', async (_req, res) => {
  try {
    const result = await detectInstalledBrowsers()
    res.json({ ok: true, result })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/printers', async (_req, res) => {
  try {
    const result = await listPrinters()
    res.json({ ok: true, result })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/system-info', async (_req, res) => {
  try {
    const result = await getSystemInfo()
    res.json({ ok: true, result })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/is-admin', async (_req, res) => {
  try {
    const result = await isElevated()
    res.json({ ok: true, result })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/network-status', async (_req, res) => {
  try {
    const result = await getNetworkStatus()
    res.json({ ok: true, result })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// "Respaldar Todo" tarda varios segundos por navegador (robocopy de perfiles completos),
// así que se ejecuta como job en segundo plano: la petición inicial devuelve un jobId de
// inmediato y el frontend consulta /backup-status/:jobId periódicamente para actualizar
// la barra de progreso, en vez de mantener una única petición HTTP abierta minutos.
const backupJobs = new Map()

app.post('/backup-all', (_req, res) => {
  const jobId = crypto.randomUUID()
  const job = { status: 'running', steps: [], destRoot: null, error: null }
  backupJobs.set(jobId, job)

  backupAll((steps) => {
    job.steps = steps
  })
    .then(({ destRoot, results }) => {
      job.status = 'done'
      job.destRoot = destRoot
      job.steps = results
    })
    .catch((err) => {
      job.status = 'error'
      job.error = err.message
    })

  res.json({ ok: true, jobId })
})

app.get('/backup-status/:jobId', (req, res) => {
  const job = backupJobs.get(req.params.jobId)
  if (!job) {
    res.status(404).json({ ok: false, error: 'Job no encontrado' })
    return
  }
  res.json({ ok: true, ...job })
})

// "Reparaciones automáticas" corre sfc/DISM/chkdsk, que pueden tardar varios minutos,
// así que sigue el mismo patrón de job en segundo plano que "Respaldar Todo".
const repairJobs = new Map()

app.post('/run-all-repairs', (_req, res) => {
  const jobId = crypto.randomUUID()
  const job = { status: 'running', steps: [], error: null }
  repairJobs.set(jobId, job)

  runAllRepairs((steps) => {
    job.steps = steps
  })
    .then(({ results }) => {
      job.status = 'done'
      job.steps = results
    })
    .catch((err) => {
      job.status = 'error'
      job.error = err.message
    })

  res.json({ ok: true, jobId })
})

app.get('/repair-status/:jobId', (req, res) => {
  const job = repairJobs.get(req.params.jobId)
  if (!job) {
    res.status(404).json({ ok: false, error: 'Job no encontrado' })
    return
  }
  res.json({ ok: true, ...job })
})

app.get('/health', (_req, res) => res.json({ ok: true }))

startWorker()
