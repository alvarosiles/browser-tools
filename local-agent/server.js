import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { execSync, spawn } from 'node:child_process'
import { createRequire } from 'node:module'
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
  IS_WINDOWS,
  IS_LINUX,
} from './commands.js'
import { AGENT_VERSION, startUpdateChecker } from './updater.js'

let isSea = () => false
try {
  // build-exe.js empaqueta este archivo a CJS para el binario SEA — ahí "require" ya es
  // una función nativa del bundle, y "import.meta.url" queda vacío (esbuild no lo soporta
  // en salida CJS). Corriendo como ESM normal ("npm start") pasa lo contrario: no existe
  // "require" global y hace falta construirlo desde import.meta.url.
  const req = typeof require === 'function' ? require : createRequire(import.meta.url)
  isSea = req('node:sea').isSea
} catch {
  // node:sea solo está disponible en versiones recientes de Node.js.
}

const WORKER_PORT = process.env.PORT || 5177
const CONTROL_PORT = process.env.CONTROL_PORT || 5178
const CONTROL_BASE_URL = `http://127.0.0.1:${CONTROL_PORT}`

// Antes de instalar/copiar nada, se chequea si ya hay una instancia corriendo (el puerto
// de control queda vivo aunque el usuario haya pausado el servicio con "Stop") — evita
// recopiar un binario bloqueado y evita pelear por el puerto con la instancia real.
async function isAlreadyRunning() {
  try {
    const res = await fetch(`${CONTROL_BASE_URL}/status`, { signal: AbortSignal.timeout(600) })
    return res.ok
  } catch {
    return false
  }
}

// El script de arranque que descarga y ejecuta el binario (install.ps1) solo dispara este
// primer lanzamiento: a partir de acá, la instalación real (copiarse a una ubicación fija,
// registrarse para arrancar con el sistema, y quedar corriendo oculto en segundo plano) la
// hace el propio binario. El .vbs intermedio es necesario porque la clave de registro "Run"
// la ejecuta el propio Explorer al iniciar sesión — no nuestro proceso — así que no hay forma
// de pedirle "sin ventana" directamente ahí; wscript.exe sí sabe lanzar oculto.
function buildHiddenLauncherVbs(targetExePath) {
  return `Set shell = CreateObject("WScript.Shell")\r\nshell.Run Chr(34) & "${targetExePath}" & Chr(34), 0, False\r\n`
}

async function ensureInstalledWindows() {
  const installDir = path.join(os.homedir(), 'AppData', 'Local', 'BrowserToolsAgent')
  const installPath = path.join(installDir, 'BrowserToolsAgent.exe')
  const vbsPath = path.join(installDir, 'BrowserToolsAgentLauncher.vbs')
  const currentPath = path.resolve(process.execPath)

  if (currentPath.toLowerCase() === installPath.toLowerCase()) return false
  if (await isAlreadyRunning()) return true

  try {
    fs.mkdirSync(installDir, { recursive: true })
    fs.copyFileSync(currentPath, installPath)
    fs.writeFileSync(vbsPath, buildHiddenLauncherVbs(installPath), 'utf8')

    const wscriptPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'wscript.exe')
    execSync(
      `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v BrowserToolsAgent /t REG_SZ /d "\\"${wscriptPath}\\" \\"${vbsPath}\\"" /f`,
      { windowsHide: true }
    )

    const child = spawn(installPath, [], { detached: true, stdio: 'ignore', windowsHide: true })
    child.unref()
    return true
  } catch (err) {
    console.error('No se pudo completar la instalación automática (Windows):', err.message)
    return false
  }
}

function systemdAvailable() {
  try {
    execSync('systemctl --user --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

async function ensureInstalledLinux() {
  const installDir = path.join(os.homedir(), '.local', 'share', 'browser-tools-agent')
  const installPath = path.join(installDir, 'browser-tools-agent')
  const currentPath = path.resolve(process.execPath)

  if (currentPath === installPath) return false
  if (await isAlreadyRunning()) return true

  if (!systemdAvailable()) {
    console.error(
      'No se encontró systemd --user: no se puede registrar el arranque automático. El servicio sigue corriendo en esta terminal — no la cierres.'
    )
    return false
  }

  try {
    fs.mkdirSync(installDir, { recursive: true })
    fs.copyFileSync(currentPath, installPath)
    fs.chmodSync(installPath, 0o755)

    const unitDir = path.join(os.homedir(), '.config', 'systemd', 'user')
    fs.mkdirSync(unitDir, { recursive: true })
    fs.writeFileSync(
      path.join(unitDir, 'browser-tools-agent.service'),
      '[Unit]\n' +
        'Description=IT Support Tools - Browser Tools Local Agent\n' +
        'After=network.target\n\n' +
        '[Service]\n' +
        `ExecStart=${installPath}\n` +
        'Restart=on-failure\n' +
        'RestartSec=3\n\n' +
        '[Install]\n' +
        'WantedBy=default.target\n'
    )

    execSync('systemctl --user daemon-reload')
    execSync('systemctl --user enable --now browser-tools-agent')
    return true
  } catch (err) {
    console.error('No se pudo completar la instalación automática (Linux):', err.message)
    return false
  }
}

// Cuando corre empaquetado como binario (Node SEA), el comando de instalación de la web
// (install.ps1/install.sh) solo descarga y ejecuta este binario una vez — toda la
// instalación real (copiarse a una ubicación fija, registrarse para arrancar con el
// sistema, y relanzarse oculto en segundo plano) la hace el propio binario. Así el
// usuario no depende de tener Node.js instalado ni de dejar una terminal abierta.
async function ensureInstalled() {
  if (!isSea()) return false
  if (IS_WINDOWS) return ensureInstalledWindows()
  if (IS_LINUX) return ensureInstalledLinux()
  return false
}

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

function startControlPanel() {
  controlApp.listen(CONTROL_PORT, '127.0.0.1', () => {
    console.log(`Panel de control escuchando en http://127.0.0.1:${CONTROL_PORT}`)
  })
}

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
app.get('/version', (_req, res) => res.json({ ok: true, version: AGENT_VERSION }))

async function main() {
  const handedOff = await ensureInstalled()
  if (handedOff) {
    process.exit(0)
    return
  }
  startWorker()
  startControlPanel()
  if (isSea()) startUpdateChecker()
}

main()
