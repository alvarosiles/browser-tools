import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'

const execAsync = promisify(exec)

function run(command, { timeout } = {}) {
  return execAsync(command, { windowsHide: true, timeout }).catch((err) => {
    if (err.killed && err.signal === 'SIGTERM') {
      throw new Error(
        'La impresora requiere una ventana de confirmación (p. ej. "Guardar como" en PDF/OneNote) que no puede completarse desde este servicio. Prueba con una impresora física.'
      )
    }
    throw err
  })
}

// Pasar scripts de PowerShell como texto embebido en un comando cmd.exe es frágil: las
// comillas anidadas (necesarias para filtros como Name='...') se corrompen de forma
// intermitente al atravesar exec -> cmd.exe -> powershell. -EncodedCommand evita el
// problema por completo al no requerir escapado alguno.
function runPowerShell(script, options) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  return run(`powershell -NoProfile -EncodedCommand ${encoded}`, options)
}

// Carpeta "User Data" de cada navegador basado en Chromium. Los perfiles reales viven
// en subcarpetas variables ("Default", "Profile 1", "Profile 41", ...), nunca fijas,
// así que hay que enumerarlas en vez de asumir un nombre. Opera es la excepción: no usa
// subcarpetas de perfil, el archivo History vive directo en "Opera Stable".
const USER_DATA_DIRS = {
  chrome: path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
  edge: path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data'),
  brave: path.join(os.homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data'),
  opera: path.join(os.homedir(), 'AppData', 'Roaming', 'Opera Software', 'Opera Stable'),
}

const FLAT_PROFILE_BROWSERS = new Set(['opera'])

const PROCESS_NAMES = {
  chrome: 'chrome.exe',
  edge: 'msedge.exe',
  firefox: 'firefox.exe',
  brave: 'brave.exe',
  opera: 'opera.exe',
}

// Carpetas de perfil reales de un navegador Chromium (o la carpeta base si es "plano" como Opera).
async function findChromiumProfileDirs(browserId) {
  const userDataDir = USER_DATA_DIRS[browserId]

  if (FLAT_PROFILE_BROWSERS.has(browserId)) {
    return [userDataDir]
  }

  const entries = await fs.readdir(userDataDir, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((e) => e.isDirectory() && (e.name === 'Default' || e.name.startsWith('Profile ')))
    .map((e) => path.join(userDataDir, e.name))
}

async function existingPath(candidate) {
  const exists = await fs.stat(candidate).then(() => true).catch(() => false)
  return exists ? candidate : null
}

async function findChromiumHistoryFiles(browserId) {
  const profileDirs = await findChromiumProfileDirs(browserId)
  const historyPaths = await Promise.all(
    profileDirs.map((dir) => existingPath(path.join(dir, 'History')))
  )
  return historyPaths.filter(Boolean)
}

// "Borrar Caché" cubre todos los datos de sitios web (equivalente a "Cookies y otros
// datos de sitios" + "Imágenes y archivos almacenados en caché" de Chrome), pero NO
// el historial de navegación: caché de recursos, cookies, Local/Session Storage,
// IndexedDB y Service Workers (incluye su Cache Storage).
const PROFILE_CACHE_SUBDIRS = [
  'Cache',
  'Code Cache',
  'GPUCache',
  'Cookies',
  'Cookies-journal',
  path.join('Network', 'Cookies'),
  path.join('Network', 'Cookies-journal'),
  'Local Storage',
  'Session Storage',
  'IndexedDB',
  'Service Worker',
]
const SHARED_CACHE_SUBDIRS = ['GPUCache', 'GrShaderCache', 'ShaderCache']

async function findChromiumCacheDirs(browserId) {
  const userDataDir = USER_DATA_DIRS[browserId]
  const profileDirs = await findChromiumProfileDirs(browserId)

  const perProfile = profileDirs.flatMap((dir) =>
    PROFILE_CACHE_SUBDIRS.map((sub) => path.join(dir, sub))
  )
  const shared = SHARED_CACHE_SUBDIRS.map((sub) => path.join(userDataDir, sub))

  const candidates = [...perProfile, ...shared]
  const resolved = await Promise.all(candidates.map(existingPath))
  return resolved.filter(Boolean)
}

async function findFirefoxProfileNames() {
  const profilesDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
  const entries = await fs.readdir(profilesDir, { withFileTypes: true }).catch(() => [])
  return entries.filter((e) => e.isDirectory()).map((e) => e.name)
}

async function findFirefoxHistoryFiles() {
  const profilesDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
  const profileNames = await findFirefoxProfileNames()
  const paths = await Promise.all(
    profileNames.map((name) => existingPath(path.join(profilesDir, name, 'places.sqlite')))
  )
  return paths.filter(Boolean)
}

// Firefox separa datos de perfil (Roaming: cookies, storage/IndexedDB/localStorage) de
// la caché de recursos en disco (Local, misma carpeta de perfil, solo "cache2").
const FIREFOX_ROAMING_SITE_DATA = ['cookies.sqlite', 'cookies.sqlite-wal', 'webappsstore.sqlite', 'storage']
const FIREFOX_LOCAL_CACHE = ['cache2', 'storage'] // storage/default también cachea Service Workers/Cache API

async function findFirefoxCacheDirs() {
  const roamingProfilesDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
  const localProfilesDir = path.join(os.homedir(), 'AppData', 'Local', 'Mozilla', 'Firefox', 'Profiles')
  const profileNames = await findFirefoxProfileNames()

  const roaming = profileNames.flatMap((name) =>
    FIREFOX_ROAMING_SITE_DATA.map((sub) => path.join(roamingProfilesDir, name, sub))
  )
  const local = profileNames.flatMap((name) =>
    FIREFOX_LOCAL_CACHE.map((sub) => path.join(localProfilesDir, name, sub))
  )

  const resolved = await Promise.all([...roaming, ...local].map(existingPath))
  return resolved.filter(Boolean)
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Tras taskkill, Windows puede tardar un instante en liberar el handle del archivo
// (el proceso ya no aparece en la lista de tareas pero el lock sigue activo unos ms).
async function rmWithRetry(targetPath, { retries = 5, delayMs = 400, recursive = false } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await fs.rm(targetPath, { force: true, recursive })
      return
    } catch (err) {
      if ((err.code !== 'EBUSY' && err.code !== 'ENOTEMPTY') || attempt === retries) throw err
      await wait(delayMs)
    }
  }
}

async function isProcessRunning(processName) {
  const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${processName}"`).catch(() => ({
    stdout: '',
  }))
  return stdout.toLowerCase().includes(processName.toLowerCase())
}

// Algunos navegadores (p. ej. Brave con "seguir ejecutando apps en segundo plano") pueden
// relanzar procesos justo después de un taskkill puntual. Se insiste con varias rondas de
// taskkill hasta confirmar, vía tasklist, que el proceso realmente desapareció.
async function closeBrowser(browserId, { retries = 8, delayMs = 400 } = {}) {
  const processName = PROCESS_NAMES[browserId]
  if (!processName) throw new Error(`Navegador no soportado: ${browserId}`)

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    await run(`taskkill /IM ${processName} /F`).catch(() => {})
    await wait(delayMs)
    if (!(await isProcessRunning(processName))) return
  }

  throw new Error(
    `No se pudo cerrar completamente ${processName}: sigue relanzándose (¿ejecución en segundo plano activada?).`
  )
}

export async function clearBrowserHistory(browserId) {
  await closeBrowser(browserId)

  const historyFiles =
    browserId === 'firefox' ? await findFirefoxHistoryFiles() : await findChromiumHistoryFiles(browserId)

  if (historyFiles.length === 0) {
    throw new Error(`No se encontró ningún perfil con historial para ${browserId}`)
  }

  for (const historyPath of historyFiles) {
    await rmWithRetry(historyPath)
    await rmWithRetry(`${historyPath}-journal`)
  }

  return { browserId, historyFiles }
}

export async function clearBrowserCache(browserId) {
  await closeBrowser(browserId)

  const cacheDirs =
    browserId === 'firefox' ? await findFirefoxCacheDirs() : await findChromiumCacheDirs(browserId)

  if (cacheDirs.length === 0) {
    throw new Error(`No se encontró ninguna carpeta de caché para ${browserId}`)
  }

  for (const cacheDir of cacheDirs) {
    await rmWithRetry(cacheDir, { recursive: true })
  }

  return { browserId, cacheDirs }
}

export async function openControlPanel() {
  await run('start "" control.exe')
}

export async function openWindowsSettings() {
  await run('start ms-settings:')
}

export async function openPrinterMaintenance(printerName) {
  if (printerName) {
    await run(`start "" rundll32 printui.dll,PrintUIEntry /p /n "${printerName}"`)
  } else {
    await run('start "" control.exe /name Microsoft.DevicesAndPrinters')
  }
}

export async function printTestPage(printerName) {
  if (!printerName) throw new Error('Debe indicar el nombre de la impresora')
  const escaped = printerName.replace(/'/g, "''")

  // Las impresoras que "imprimen a archivo" (Microsoft Print to PDF, o cualquier
  // impresora con "Imprimir a archivo" activado) usan el puerto especial PORTPROMPT:,
  // que normalmente exige un diálogo interactivo "Guardar como". Se detecta ese caso
  // y se usa la API de impresión de .NET con el nombre de archivo fijado de antemano
  // (PrintToFile + PrintFileName), lo que evita el diálogo por completo. Las impresoras
  // físicas normales siguen usando el método WMI estándar.
  const script = `
$printer = Get-Printer -Name '${escaped}' -ErrorAction SilentlyContinue
if (-not $printer) {
  Write-Output "NOTFOUND"
} elseif ($printer.PortName -eq 'PORTPROMPT:') {
  Add-Type -AssemblyName System.Drawing
  $outFile = Join-Path $env:TEMP ("it-support-tools-test-page-" + [guid]::NewGuid().ToString("N").Substring(0,8) + ".pdf")
  $doc = New-Object System.Drawing.Printing.PrintDocument
  $doc.PrinterSettings.PrinterName = '${escaped}'
  $doc.PrinterSettings.PrintToFile = $true
  $doc.PrinterSettings.PrintFileName = $outFile
  $doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController
  $doc.add_PrintPage({
    param($sender, $e)
    $font = New-Object System.Drawing.Font("Arial", 24)
    $e.Graphics.DrawString("Pagina de prueba - IT Support Tools", $font, [System.Drawing.Brushes]::Black, 100, 100)
  })
  $doc.Print()
  Start-Sleep -Milliseconds 500
  if (Test-Path $outFile) { Write-Output "FILE:$outFile" } else { Write-Output "FAIL" }
} else {
  $r = $printer | Invoke-CimMethod -MethodName PrintTestPage
  Write-Output "WMI:$($r.ReturnValue)"
}
`
  const { stdout } = await runPowerShell(script, { timeout: 15000 })
  const trimmed = stdout.trim()

  if (trimmed === 'NOTFOUND') {
    throw new Error(`No se encontró ninguna impresora llamada "${printerName}".`)
  }
  if (trimmed === 'FAIL') {
    throw new Error('No se pudo generar el archivo de la página de prueba.')
  }
  if (trimmed.startsWith('FILE:')) {
    return { outputFile: trimmed.slice('FILE:'.length) }
  }
  if (trimmed.startsWith('WMI:')) {
    const returnValue = Number(trimmed.slice('WMI:'.length))
    if (returnValue !== 0) {
      throw new Error(`La impresora rechazó la página de prueba (código ${returnValue}).`)
    }
    return {}
  }
  throw new Error(`Respuesta inesperada del servicio: "${trimmed}"`)
}
