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

// Tipos de datos de sitios web borrables de forma independiente (todo salvo "history",
// que se maneja aparte porque usa un archivo distinto — History — no una carpeta).
// Chromium guarda cada tipo en subcarpetas fijas dentro de cada perfil.
const CHROMIUM_TYPE_SUBDIRS = {
  cache: ['Cache', 'Code Cache', 'GPUCache'],
  cookies: [
    'Cookies',
    'Cookies-journal',
    path.join('Network', 'Cookies'),
    path.join('Network', 'Cookies-journal'),
  ],
  localStorage: ['Local Storage'],
  sessionStorage: ['Session Storage'],
  indexedDB: ['IndexedDB'],
  serviceWorkers: ['Service Worker'],
}
// Además de por perfil, Chromium comparte estas carpetas de caché de shaders/GPU a
// nivel de "User Data", sin depender del perfil activo.
const CHROMIUM_SHARED_TYPE_SUBDIRS = {
  cache: ['GPUCache', 'GrShaderCache', 'ShaderCache'],
}

async function findChromiumTypeDirs(browserId, types) {
  const userDataDir = USER_DATA_DIRS[browserId]
  const profileDirs = await findChromiumProfileDirs(browserId)

  const perProfile = profileDirs.flatMap((dir) =>
    types.flatMap((type) => (CHROMIUM_TYPE_SUBDIRS[type] || []).map((sub) => path.join(dir, sub)))
  )
  const shared = types.flatMap((type) =>
    (CHROMIUM_SHARED_TYPE_SUBDIRS[type] || []).map((sub) => path.join(userDataDir, sub))
  )

  const candidates = [...new Set([...perProfile, ...shared])]
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

// Firefox separa datos de perfil (Roaming: cookies, storage con IndexedDB/localStorage/
// Service Workers unificados) de la caché de recursos en disco (Local, "cache2"). A
// diferencia de Chromium, Firefox NO separa localStorage/IndexedDB/Service Workers en
// carpetas distintas — todo vive junto en storage/default/<origen>/, así que estos tres
// tipos comparten la misma carpeta (borrar cualquiera de los tres borra los tres).
const FIREFOX_ROAMING_TYPE_SUBDIRS = {
  cookies: ['cookies.sqlite', 'cookies.sqlite-wal'],
  localStorage: ['webappsstore.sqlite', 'storage'],
  indexedDB: ['storage'],
  serviceWorkers: ['storage'],
}
const FIREFOX_LOCAL_TYPE_SUBDIRS = {
  cache: ['cache2'],
}

async function findFirefoxTypeDirs(types) {
  const roamingProfilesDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
  const localProfilesDir = path.join(os.homedir(), 'AppData', 'Local', 'Mozilla', 'Firefox', 'Profiles')
  const profileNames = await findFirefoxProfileNames()

  const roaming = profileNames.flatMap((name) =>
    types.flatMap((type) =>
      (FIREFOX_ROAMING_TYPE_SUBDIRS[type] || []).map((sub) => path.join(roamingProfilesDir, name, sub))
    )
  )
  const local = profileNames.flatMap((name) =>
    types.flatMap((type) =>
      (FIREFOX_LOCAL_TYPE_SUBDIRS[type] || []).map((sub) => path.join(localProfilesDir, name, sub))
    )
  )

  const candidates = [...new Set([...roaming, ...local])]
  const resolved = await Promise.all(candidates.map(existingPath))
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

export const BROWSER_DATA_TYPES = [
  'cookies',
  'cache',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'serviceWorkers',
  'history',
]

// Borra, en una sola pasada (un solo cierre del navegador), cualquier combinación de
// tipos de datos seleccionados. "history" se trata aparte porque usa un archivo con
// nombre propio (History / places.sqlite) en vez de una carpeta de datos de sitio.
export async function clearBrowserData(browserId, types) {
  const validTypes = (types || []).filter((t) => BROWSER_DATA_TYPES.includes(t))
  if (validTypes.length === 0) throw new Error('Debe seleccionar al menos un tipo de dato a borrar')

  await closeBrowser(browserId)

  const cleared = {}

  if (validTypes.includes('history')) {
    const historyFiles =
      browserId === 'firefox' ? await findFirefoxHistoryFiles() : await findChromiumHistoryFiles(browserId)
    for (const historyPath of historyFiles) {
      await rmWithRetry(historyPath)
      await rmWithRetry(`${historyPath}-journal`)
    }
    cleared.history = historyFiles
  }

  const dataTypes = validTypes.filter((t) => t !== 'history')
  if (dataTypes.length > 0) {
    const dataDirs =
      browserId === 'firefox'
        ? await findFirefoxTypeDirs(dataTypes)
        : await findChromiumTypeDirs(browserId, dataTypes)
    for (const dir of dataDirs) {
      await rmWithRetry(dir, { recursive: true })
    }
    cleared.dataDirs = dataDirs
  }

  const totalPaths = (cleared.history?.length || 0) + (cleared.dataDirs?.length || 0)
  if (totalPaths === 0) {
    throw new Error(`No se encontraron datos de los tipos seleccionados para ${browserId}`)
  }

  return { browserId, types: validTypes, ...cleared }
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

// ---------------------------------------------------------------------------
// Respaldo de navegadores
// ---------------------------------------------------------------------------

const BACKUP_ROOT = 'C:\\ITSupport\\Backups'

const BROWSER_LABELS = {
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  brave: 'Brave',
  opera: 'Opera',
}

const ALL_BROWSER_IDS = ['chrome', 'edge', 'firefox', 'brave', 'opera']

function todayFolderName() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export async function isBrowserInstalled(browserId) {
  if (browserId === 'firefox') {
    const names = await findFirefoxProfileNames()
    return names.length > 0
  }
  const dir = USER_DATA_DIRS[browserId]
  if (!dir) return false
  return Boolean(await existingPath(dir))
}

export async function detectInstalledBrowsers() {
  const entries = await Promise.all(
    ALL_BROWSER_IDS.map(async (id) => [id, await isBrowserInstalled(id)])
  )
  return Object.fromEntries(entries)
}

// robocopy usa códigos de salida en forma de bitmap: 0-7 son distintos grados de éxito
// (archivos copiados, algunos ya iguales, etc.), solo 8+ indica un fallo real.
function runRobocopy(src, dest, excludeDirs = []) {
  const excludeArgs = excludeDirs.length
    ? `/XD ${excludeDirs.map((d) => `"${d}"`).join(' ')}`
    : ''
  const cmd = `robocopy "${src}" "${dest}" /E /R:1 /W:1 /NFL /NDL /NJH /NJS ${excludeArgs}`
  return execAsync(cmd, { windowsHide: true }).catch((err) => {
    if (typeof err.code === 'number' && err.code < 8) return { stdout: err.stdout, stderr: err.stderr }
    throw new Error(`robocopy falló (código ${err.code}): ${err.stderr || err.message}`)
  })
}

async function getDirSize(dir) {
  let total = 0
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      total += await getDirSize(full)
    } else {
      total += await fs.stat(full).then((s) => s.size).catch(() => 0)
    }
  }
  return total
}

// Carpetas pesadas/regenerables que no aportan valor a un respaldo de soporte técnico
// (caché de recursos, shaders, métricas, binarios de extensiones ya instalados, etc.).
const BACKUP_EXCLUDE_DIRS = [
  'Cache',
  'Code Cache',
  'GPUCache',
  'GrShaderCache',
  'ShaderCache',
  'Service Worker',
  'Crashpad',
  'CrashpadMetrics-active.pma',
  'BrowserMetrics',
  'component_crx_cache',
  'extensions_crx_cache',
  'GraphiteDawnCache',
  'Media Cache',
  'DawnCache',
  'startupCache',
  'thumbnails',
]

export async function backupBrowserProfile(browserId) {
  if (!ALL_BROWSER_IDS.includes(browserId)) throw new Error(`Navegador no soportado: ${browserId}`)
  if (!(await isBrowserInstalled(browserId))) {
    throw new Error(`${BROWSER_LABELS[browserId]} no está instalado en este equipo.`)
  }

  await closeBrowser(browserId)

  const destDir = path.join(BACKUP_ROOT, todayFolderName(), BROWSER_LABELS[browserId])
  await fs.mkdir(destDir, { recursive: true })

  if (browserId === 'firefox') {
    const roamingProfilesDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
    const profileNames = await findFirefoxProfileNames()
    for (const name of profileNames) {
      await runRobocopy(path.join(roamingProfilesDir, name), path.join(destDir, name), [
        'cache2',
        'startupCache',
        'thumbnails',
      ])
    }
  } else {
    await runRobocopy(USER_DATA_DIRS[browserId], destDir, BACKUP_EXCLUDE_DIRS)
  }

  const sizeBytes = await getDirSize(destDir)
  return { browserId, destDir, sizeBytes }
}

// A diferencia de "Respaldar Perfil", esto solo copia el archivo de favoritos y no
// requiere cerrar el navegador: es una copia rápida de un único archivo pequeño.
const BOOKMARKS_FILE = { chrome: 'Bookmarks', edge: 'Bookmarks', brave: 'Bookmarks', opera: 'Bookmarks' }

export async function backupBrowserBookmarks(browserId) {
  if (!ALL_BROWSER_IDS.includes(browserId)) throw new Error(`Navegador no soportado: ${browserId}`)
  if (!(await isBrowserInstalled(browserId))) {
    throw new Error(`${BROWSER_LABELS[browserId]} no está instalado en este equipo.`)
  }

  const destDir = path.join(BACKUP_ROOT, todayFolderName(), BROWSER_LABELS[browserId])
  await fs.mkdir(destDir, { recursive: true })

  const savedFiles = []

  if (browserId === 'firefox') {
    const roamingProfilesDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
    const profileNames = await findFirefoxProfileNames()
    for (const name of profileNames) {
      const src = await existingPath(path.join(roamingProfilesDir, name, 'places.sqlite'))
      if (!src) continue
      const dest = path.join(destDir, `${name}-places.sqlite`)
      await fs.copyFile(src, dest)
      savedFiles.push(dest)
    }
  } else {
    const profileDirs = await findChromiumProfileDirs(browserId)
    for (const dir of profileDirs) {
      const src = await existingPath(path.join(dir, BOOKMARKS_FILE[browserId]))
      if (!src) continue
      const profileName = path.basename(dir)
      const dest = path.join(destDir, `${profileName}-Bookmarks.json`)
      await fs.copyFile(src, dest)
      savedFiles.push(dest)
    }
  }

  if (savedFiles.length === 0) {
    throw new Error(`No se encontraron favoritos para ${BROWSER_LABELS[browserId]}.`)
  }

  return { browserId, savedFiles }
}

// Nombres de ejecutable registrados en "App Paths" del registro de Windows — la forma
// estándar de localizar el binario real de una app instalada sin asumir una ruta fija
// (varía entre instalación por usuario, por máquina, x86/x64, versión, etc.).
const APP_PATH_EXE = {
  chrome: 'chrome.exe',
  edge: 'msedge.exe',
  firefox: 'firefox.exe',
  brave: 'brave.exe',
  opera: 'opera.exe',
}

const PASSWORD_MANAGER_URLS = {
  chrome: 'chrome://password-manager/passwords',
  edge: 'edge://settings/passwords',
  brave: 'brave://settings/passwords',
  opera: 'opera://settings/passwords',
  firefox: 'about:logins',
}

async function findBrowserExecutable(browserId) {
  const exeName = APP_PATH_EXE[browserId]
  const script = `
foreach ($hive in @('HKCU:', 'HKLM:', 'HKLM:\\SOFTWARE\\WOW6432Node')) {
  $regPath = Join-Path $hive "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${exeName}"
  $item = Get-ItemProperty -Path $regPath -ErrorAction SilentlyContinue
  if ($item -and $item.'(default)') {
    Write-Output $item.'(default)'
    exit
  }
}
Write-Output ""
`
  const { stdout } = await runPowerShell(script)
  const found = stdout.trim()
  return found || null
}

export async function openPasswordManager(browserId) {
  if (!ALL_BROWSER_IDS.includes(browserId)) throw new Error(`Navegador no soportado: ${browserId}`)
  if (!(await isBrowserInstalled(browserId))) {
    throw new Error(`${BROWSER_LABELS[browserId]} no está instalado en este equipo.`)
  }

  const exePath = await findBrowserExecutable(browserId)
  if (!exePath) {
    throw new Error(`No se encontró el ejecutable de ${BROWSER_LABELS[browserId]}.`)
  }

  await run(`start "" "${exePath}" "${PASSWORD_MANAGER_URLS[browserId]}"`)
  return {
    browserId,
    notice:
      'Por seguridad, el navegador solicitará la contraseña de Windows antes de exportar las contraseñas.',
  }
}

export async function backupAll(onProgress) {
  const installed = await detectInstalledBrowsers()
  const destRoot = path.join(BACKUP_ROOT, todayFolderName())
  const results = []

  for (const browserId of ALL_BROWSER_IDS) {
    if (!installed[browserId]) {
      results.push({ browserId, label: BROWSER_LABELS[browserId], status: 'skipped' })
      onProgress?.(results.slice())
      continue
    }
    try {
      const { destDir, sizeBytes } = await backupBrowserProfile(browserId)
      results.push({
        browserId,
        label: BROWSER_LABELS[browserId],
        status: 'success',
        destDir,
        sizeBytes,
      })
    } catch (err) {
      results.push({ browserId, label: BROWSER_LABELS[browserId], status: 'error', error: err.message })
    }
    onProgress?.(results.slice())
  }

  return { destRoot, results, finishedAt: new Date().toISOString() }
}

export async function openBackupFolder(date) {
  const dir = path.join(BACKUP_ROOT, date || todayFolderName())
  await fs.mkdir(dir, { recursive: true })
  await run(`start "" explorer "${dir}"`)
  return { dir }
}
