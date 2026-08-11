import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import Database from 'better-sqlite3'

const execAsync = promisify(exec)
const IS_WINDOWS = process.platform === 'win32'
const IS_LINUX = process.platform === 'linux'

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
// así que hay que enumerarlas en vez de asumir un nombre. Opera (desde que adoptó
// perfiles múltiples estilo Chromium) también usa "Default"/"Profile N" dentro de
// "Opera Stable", igual que Chrome/Edge/Brave.
const USER_DATA_DIRS = {
  chrome: IS_LINUX ? path.join(os.homedir(), '.config', 'google-chrome') : path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
  edge: IS_LINUX ? path.join(os.homedir(), '.config', 'microsoft-edge') : path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data'),
  brave: IS_LINUX ? path.join(os.homedir(), '.config', 'BraveSoftware', 'Brave-Browser') : path.join(os.homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data'),
  opera: IS_LINUX ? path.join(os.homedir(), '.config', 'opera') : path.join(os.homedir(), 'AppData', 'Roaming', 'Opera Software', 'Opera Stable'),
}

const FLAT_PROFILE_BROWSERS = new Set()

const PROCESS_NAMES = {
  chrome: IS_WINDOWS ? 'chrome.exe' : 'chrome',
  edge: IS_WINDOWS ? 'msedge.exe' : 'msedge',
  firefox: IS_WINDOWS ? 'firefox.exe' : 'firefox',
  brave: IS_WINDOWS ? 'brave.exe' : 'brave',
  opera: IS_WINDOWS ? 'opera.exe' : 'opera',
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
  webSQL: ['databases'],
  cacheStorage: ['CacheStorage', path.join('Service Worker', 'CacheStorage')],
  webAppManifest: ['Web Applications'],
  autofillForms: ['Web Data', 'Web Data-journal'],
  // Las suscripciones push viven dentro de la base de datos de Service Worker (no en un
  // archivo propio), así que se limpian junto con esa carpeta.
  push: ['Service Worker'],
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

// Chromium no guarda los permisos de sitio (cámara, micrófono, ubicación, notificaciones,
// etc.) en una carpeta propia: viven como una clave más dentro del JSON "Preferences",
// compartido con el resto de la configuración del navegador. Por eso, a diferencia de los
// demás tipos, esto no se puede resolver borrando una ruta — hay que parsear el JSON y
// vaciar solo esa clave, dejando el resto del archivo intacto.
async function clearChromiumSitePermissions(profileDirs) {
  let patchedCount = 0
  for (const dir of profileDirs) {
    const prefsPath = path.join(dir, 'Preferences')
    if (!(await existingPath(prefsPath))) continue
    try {
      const raw = await fs.readFile(prefsPath, 'utf8')
      const prefs = JSON.parse(raw)
      if (prefs.profile?.content_settings?.exceptions) {
        prefs.profile.content_settings.exceptions = {}
        await fs.writeFile(prefsPath, JSON.stringify(prefs))
        patchedCount += 1
      }
    } catch {
      // Preferences bloqueado o con formato inesperado: se omite en vez de arriesgar corromperlo.
    }
  }
  return patchedCount
}

// Si el navegador tiene una cuenta sincronizada (Google/Opera/Microsoft), el historial
// borrado localmente se vuelve a descargar de la nube en cuanto se reabre — el borrado
// de archivos por sí solo no alcanza. Por eso, al borrar "history", también se desactiva
// el motor de sync en "Preferences" (sync.requested = false), que es lo que evita que
// el navegador vuelva a traer los datos desde la cuenta en el próximo arranque.
async function disableChromiumSync(profileDirs) {
  let patchedCount = 0
  for (const dir of profileDirs) {
    const prefsPath = path.join(dir, 'Preferences')
    if (!(await existingPath(prefsPath))) continue
    try {
      const raw = await fs.readFile(prefsPath, 'utf8')
      const prefs = JSON.parse(raw)
      const wasRequested = prefs.sync?.requested !== false
      prefs.sync = { ...prefs.sync, requested: false }
      if (wasRequested) {
        await fs.writeFile(prefsPath, JSON.stringify(prefs))
        patchedCount += 1
      }
    } catch {
      // Preferences bloqueado o con formato inesperado: se omite en vez de arriesgar corromperlo.
    }
  }
  return patchedCount
}

async function findFirefoxProfileNames() {
  const profilesDir = IS_LINUX ? path.join(os.homedir(), '.mozilla', 'firefox') : path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
  const entries = await fs.readdir(profilesDir, { withFileTypes: true }).catch(() => [])
  return entries.filter((e) => e.isDirectory()).map((e) => e.name)
}

async function findFirefoxHistoryFiles() {
  const profilesDir = IS_LINUX ? path.join(os.homedir(), '.mozilla', 'firefox') : path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
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
  cacheStorage: ['storage'],
  autofillForms: ['formhistory.sqlite'],
  permissions: ['permissions.sqlite', 'content-prefs.sqlite'],
  push: ['storage'],
}
const FIREFOX_LOCAL_TYPE_SUBDIRS = {
  cache: ['cache2'],
}

async function findFirefoxTypeDirs(types) {
  const roamingProfilesDir = IS_LINUX ? path.join(os.homedir(), '.mozilla', 'firefox') : path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
  const localProfilesDir = IS_LINUX ? path.join(os.homedir(), '.cache', 'mozilla', 'firefox') : path.join(os.homedir(), 'AppData', 'Local', 'Mozilla', 'Firefox', 'Profiles')
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
  if (!IS_WINDOWS) {
    const { stdout } = await execAsync(`pgrep -x ${processName}`).catch(() => ({ stdout: '' }))
    return Boolean(stdout.trim())
  }
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
    await run(IS_WINDOWS ? `taskkill /IM ${processName} /F` : `pkill -TERM -x ${processName}`).catch(() => {})
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
  'webSQL',
  'cacheStorage',
  'webAppManifest',
  'autofillForms',
  'permissions',
  'push',
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

    // "Cerradas hace poco" (pestañas restaurables) no vive en History, sino en la
    // carpeta "Sessions" del perfil — Chromium la usa para reabrir pestañas/ventanas
    // cerradas recientemente. Si no se borra, sigue mostrando páginas "viejas" aunque
    // el historial de navegación ya esté limpio.
    if (browserId !== 'firefox') {
      const profileDirs = await findChromiumProfileDirs(browserId)
      cleared.syncDisabled = await disableChromiumSync(profileDirs)
      for (const dir of profileDirs) {
        await rmWithRetry(path.join(dir, 'Sessions'), { recursive: true })
      }
    } else {
      const profileNames = await findFirefoxProfileNames()
      const roamingProfilesDir = IS_LINUX ? path.join(os.homedir(), '.mozilla', 'firefox') : path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
      for (const name of profileNames) {
        await rmWithRetry(path.join(roamingProfilesDir, name, 'sessionstore-backups'), { recursive: true })
        await rmWithRetry(path.join(roamingProfilesDir, name, 'sessionstore.jsonlz4'))
      }
    }
  }

  // "permissions" en Chromium no es una carpeta a borrar, sino una clave dentro de
  // "Preferences" que hay que editar (ver clearChromiumSitePermissions). En Firefox sí
  // es un archivo propio (permissions.sqlite), así que ahí sigue el camino genérico.
  if (validTypes.includes('permissions') && browserId !== 'firefox') {
    const profileDirs = await findChromiumProfileDirs(browserId)
    cleared.permissionsPatched = await clearChromiumSitePermissions(profileDirs)
  }

  const dataTypes = validTypes.filter(
    (t) => t !== 'history' && !(t === 'permissions' && browserId !== 'firefox')
  )
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

  const totalPaths =
    (cleared.history?.length || 0) + (cleared.dataDirs?.length || 0) + (cleared.permissionsPatched || 0)
  if (totalPaths === 0) {
    throw new Error(`No se encontraron datos de los tipos seleccionados para ${browserId}`)
  }

  return { browserId, types: validTypes, ...cleared }
}

// Acepta tanto una URL completa ("https://metabet.tv/es/") como un dominio suelto
// ("metabet.tv") y devuelve solo el host, que es lo que realmente vive en las bases de
// datos de cookies/historial de los navegadores.
function normalizeDomain(input) {
  const raw = (input || '').trim()
  if (!raw) throw new Error('Debe indicar un dominio')
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).hostname.toLowerCase()
  } catch {
    throw new Error(`Dominio inválido: ${raw}`)
  }
}

// A diferencia de clearBrowserData (que borra archivos/carpetas completos), esto edita
// las bases SQLite in-place para quitar solo las filas del dominio pedido, sin tocar el
// resto del historial/cookies de otros sitios.
function deleteRowsLikeDomain(dbPath, statements) {
  let db
  try {
    db = new Database(dbPath)
  } catch {
    return 0
  }
  try {
    let total = 0
    for (const sql of statements) {
      const result = db.prepare(sql).run()
      total += result.changes || 0
    }
    return total
  } catch {
    return 0
  } finally {
    db.close()
  }
}

async function clearChromiumDomainData(browserId, domain) {
  const profileDirs = await findChromiumProfileDirs(browserId)
  const like = `%${domain}%`
  let cookiesDeleted = 0
  let historyDeleted = 0
  let foldersDeleted = 0
  let permissionsPatched = 0

  for (const dir of profileDirs) {
    const cookiesPath =
      (await existingPath(path.join(dir, 'Network', 'Cookies'))) || (await existingPath(path.join(dir, 'Cookies')))
    if (cookiesPath) {
      cookiesDeleted += deleteRowsLikeDomain(cookiesPath, [`DELETE FROM cookies WHERE host_key LIKE '${like}'`])
    }

    const historyPath = await existingPath(path.join(dir, 'History'))
    if (historyPath) {
      historyDeleted += deleteRowsLikeDomain(historyPath, [
        `DELETE FROM visits WHERE url IN (SELECT id FROM urls WHERE url LIKE '${like}')`,
        `DELETE FROM urls WHERE url LIKE '${like}'`,
      ])
    }

    // IndexedDB/Local Storage guardan una carpeta por origen con el dominio en el
    // nombre (p. ej. "https_metabet.tv_0.indexeddb.leveldb"), así que basta con
    // borrar las que coincidan en vez de vaciar todo el navegador.
    for (const sub of ['IndexedDB', 'Local Storage', 'Service Worker']) {
      const subDir = path.join(dir, sub)
      const entries = await fs.readdir(subDir, { withFileTypes: true }).catch(() => [])
      for (const entry of entries) {
        if (entry.name.toLowerCase().includes(domain)) {
          await rmWithRetry(path.join(subDir, entry.name), { recursive: true })
          foldersDeleted += 1
        }
      }
    }

    const prefsPath = path.join(dir, 'Preferences')
    if (await existingPath(prefsPath)) {
      try {
        const raw = await fs.readFile(prefsPath, 'utf8')
        const prefs = JSON.parse(raw)
        const exceptions = prefs.profile?.content_settings?.exceptions
        if (exceptions) {
          for (const key of Object.keys(exceptions)) {
            const map = exceptions[key]
            for (const pattern of Object.keys(map || {})) {
              if (pattern.toLowerCase().includes(domain)) {
                delete map[pattern]
                permissionsPatched += 1
              }
            }
          }
          if (permissionsPatched > 0) await fs.writeFile(prefsPath, JSON.stringify(prefs))
        }
      } catch {
        // Preferences bloqueado o con formato inesperado: se omite.
      }
    }
  }

  return { cookiesDeleted, historyDeleted, foldersDeleted, permissionsPatched }
}

async function clearFirefoxDomainData(domain) {
  const roamingProfilesDir = IS_LINUX ? path.join(os.homedir(), '.mozilla', 'firefox') : path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
  const profileNames = await findFirefoxProfileNames()
  const like = `%${domain}%`
  let cookiesDeleted = 0
  let historyDeleted = 0
  let foldersDeleted = 0

  for (const name of profileNames) {
    const profileDir = path.join(roamingProfilesDir, name)

    const placesPath = await existingPath(path.join(profileDir, 'places.sqlite'))
    if (placesPath) {
      historyDeleted += deleteRowsLikeDomain(placesPath, [
        `DELETE FROM moz_historyvisits WHERE place_id IN (SELECT id FROM moz_places WHERE url LIKE '${like}')`,
        `DELETE FROM moz_places WHERE url LIKE '${like}'`,
      ])
    }

    const cookiesPath = await existingPath(path.join(profileDir, 'cookies.sqlite'))
    if (cookiesPath) {
      cookiesDeleted += deleteRowsLikeDomain(cookiesPath, [`DELETE FROM moz_cookies WHERE host LIKE '${like}'`])
    }

    // Firefox guarda IndexedDB/localStorage en storage/default/<esquema+++dominio>/.
    const storageDir = path.join(profileDir, 'storage', 'default')
    const entries = await fs.readdir(storageDir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (entry.name.toLowerCase().includes(domain)) {
        await rmWithRetry(path.join(storageDir, entry.name), { recursive: true })
        foldersDeleted += 1
      }
    }
  }

  return { cookiesDeleted, historyDeleted, foldersDeleted }
}

// Borra, en todos los navegadores instalados, solo los datos (cookies, historial,
// IndexedDB/localStorage, permisos de sitio) que pertenecen a un dominio puntual —
// a diferencia de clearBrowserData, que borra todo el navegador.
export async function clearDomainData(domainInput) {
  const domain = normalizeDomain(domainInput)
  const results = []

  for (const browserId of ALL_BROWSER_IDS) {
    if (!(await isBrowserInstalled(browserId))) continue
    await closeBrowser(browserId)
    const stats =
      browserId === 'firefox' ? await clearFirefoxDomainData(domain) : await clearChromiumDomainData(browserId, domain)
    results.push({ browserId, ...stats })
  }

  const totalChanges = results.reduce(
    (sum, r) => sum + r.cookiesDeleted + r.historyDeleted + r.foldersDeleted + (r.permissionsPatched || 0),
    0
  )
  if (totalChanges === 0) {
    throw new Error(`No se encontraron datos de "${domain}" en los navegadores instalados`)
  }

  return { domain, results }
}

export async function openControlPanel() {
  await run(IS_WINDOWS ? 'start "" control.exe' : 'xdg-open .')
}

export async function openWindowsSettings() {
  await run(IS_WINDOWS ? 'start ms-settings:' : 'gnome-control-center')
}

export async function openTaskManager() {
  await run(IS_WINDOWS ? 'start "" taskmgr.exe' : 'gnome-system-monitor')
}

// El propio agente puede no estar corriendo elevado, pero Start-Process -Verb RunAs
// dispara el UAC solo para esta ventana de CMD puntual, sin necesitar que el servicio
// local entero esté elevado.
export async function openCmdAsAdmin() {
  await run(IS_WINDOWS ? 'powershell -NoProfile -Command "Start-Process cmd.exe -Verb RunAs"' : 'x-terminal-emulator')
}

export async function openPowerShell() {
  await run(IS_WINDOWS ? 'start "" powershell.exe' : 'x-terminal-emulator')
}

export async function openServices() {
  await run(IS_WINDOWS ? 'start "" services.msc' : 'systemctl --no-pager list-units --type=service')
}

export async function openDeviceManager() {
  await run(IS_WINDOWS ? 'start "" devmgmt.msc' : 'gnome-disks')
}

export async function openPrinterMaintenance(printerName) {
  if (!IS_WINDOWS) {
    await run('system-config-printer').catch(() => run('xdg-open printers:///'))
  } else if (printerName) {
    await run(`start "" rundll32 printui.dll,PrintUIEntry /p /n "${printerName}"`)
  } else {
    await run('start "" control.exe /name Microsoft.DevicesAndPrinters')
  }
}

export async function printTestPage(printerName) {
  if (!printerName) throw new Error('Debe indicar el nombre de la impresora')
  if (!IS_WINDOWS) {
    await run(`lp -d "${printerName.replace(/"/g, '\\"')}" /usr/share/cups/data/testprint`)
    return {}
  }
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

const BACKUP_ROOT = IS_WINDOWS
  ? 'C:\\ITSupport\\Backups'
  : path.join(os.homedir(), 'ITSupport', 'Backups')

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
  if (!IS_WINDOWS) return fs.cp(src, dest, { recursive: true, force: true })
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
    const roamingProfilesDir = IS_LINUX ? path.join(os.homedir(), '.mozilla', 'firefox') : path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
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
    const roamingProfilesDir = IS_LINUX ? path.join(os.homedir(), '.mozilla', 'firefox') : path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
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
  chrome: IS_LINUX ? 'google-chrome' : 'chrome.exe',
  edge: IS_LINUX ? 'microsoft-edge' : 'msedge.exe',
  firefox: 'firefox',
  brave: IS_LINUX ? 'brave-browser' : 'brave.exe',
  opera: IS_LINUX ? 'opera' : 'opera.exe',
}

const PASSWORD_MANAGER_URLS = {
  chrome: 'chrome://password-manager/passwords',
  edge: 'edge://settings/passwords',
  brave: 'brave://settings/passwords',
  opera: 'opera://settings/passwords',
  firefox: 'about:logins',
}

async function findBrowserExecutable(browserId) {
  if (!IS_WINDOWS) return APP_PATH_EXE[browserId]
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

  await run(IS_WINDOWS
    ? `start "" "${exePath}" "${PASSWORD_MANAGER_URLS[browserId]}"`
    : `${exePath} "${PASSWORD_MANAGER_URLS[browserId]}"`)
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
  await run(IS_WINDOWS ? `start "" explorer "${dir}"` : `xdg-open "${dir}"`)
  return { dir }
}

// ---------------------------------------------------------------------------
// Estado de red
// ---------------------------------------------------------------------------

// Adaptadores virtuales (VirtualBox, VMware, Hyper-V, VPNs, etc.) suelen listarse antes
// que el adaptador físico real en os.networkInterfaces() y no sirven para identificar la
// IP de la red local del equipo, así que se las excluye al elegir la IP principal.
const VIRTUAL_INTERFACE_PATTERN = /virtualbox|vmware|hyper-v|virtual|loopback|tailscale|npcap|tap-|docker|vpn/i

// Ignora interfaces internas (loopback) y las que no tienen dirección IPv4 asignada
// (adaptadores deshabilitados, tunnels sin uso, etc.), que no aportan al diagnóstico.
function getLocalInterfaces() {
  const interfaces = os.networkInterfaces()
  const result = []
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs || []) {
      if (addr.internal) continue
      result.push({
        name,
        address: addr.address,
        family: addr.family,
        mac: addr.mac,
        virtual: VIRTUAL_INTERFACE_PATTERN.test(name),
      })
    }
  }
  return result
}

// "netsh wlan show interfaces" trae el estado de la conexión Wi-Fi activa (SSID actual,
// señal, banda, etc.). Si el equipo no tiene adaptador Wi-Fi o está apagado, el comando
// devuelve un mensaje de error en vez de datos, así que se tolera el fallo.
// netsh imprime en la página de códigos activa de la consola (cp850/cp1252 en Windows en
// español), que Node decodifica como UTF-8 por defecto y corrompe tildes/ñ. "chcp 65001"
// cambia esa consola a UTF-8 antes de invocar netsh, evitando el problema en origen.
async function runNetsh(args) {
  return run(`chcp 65001 >nul && netsh ${args}`)
}

async function getActiveWifiInfo() {
  if (!IS_WINDOWS) {
    const { stdout } = await run('nmcli -t -f active,ssid,signal,band dev wifi').catch(() => ({ stdout: '' }))
    const row = stdout.split(/\r?\n/).find((line) => line.startsWith('yes:'))
    if (!row) return {}
    const [, ssid, signal, radioType] = row.split(':')
    return { ssid, signal: signal ? `${signal}%` : null, radioType, state: 'connected' }
  }
  const { stdout } = await runNetsh('wlan show interfaces').catch(() => ({ stdout: '' }))
  const info = {}
  for (const line of stdout.split(/\r?\n/)) {
    const [rawKey, ...rest] = line.split(':')
    if (!rawKey || rest.length === 0) continue
    const key = rawKey.trim()
    const value = rest.join(':').trim()
    if (key === 'SSID' && !info.ssid) info.ssid = value
    if (key === 'Señal' || key === 'Signal') info.signal = value
    if (key === 'Banda de radio' || key === 'Radio type') info.radioType = value
    if (key === 'Estado' || key === 'State') info.state = value
  }
  return info
}

// Lista los perfiles Wi-Fi guardados en Windows. Cada perfil requiere una segunda
// consulta ("show profile <ssid> key=clear") para revelar la contraseña en texto plano,
// ya que "show profiles" solo lista los nombres.
async function getSavedWifiNetworks() {
  if (!IS_WINDOWS) {
    const { stdout } = await run('nmcli -t -f NAME,TYPE connection show').catch(() => ({ stdout: '' }))
    return stdout.split(/\r?\n/).filter(Boolean).filter((line) => line.endsWith(':802-11-wireless')).map((line) => ({
      ssid: line.slice(0, line.lastIndexOf(':')),
      password: null,
      authentication: null,
    }))
  }
  const { stdout } = await runNetsh('wlan show profiles').catch(() => ({ stdout: '' }))
  const names = []
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:Perfil de todos los usuarios|All User Profile)\s*:\s*(.+)$/)
    if (match) names.push(match[1].trim())
  }

  const networks = []
  for (const name of names) {
    const escaped = name.replace(/"/g, '\\"')
    const { stdout: profileOut } = await runNetsh(`wlan show profile name="${escaped}" key=clear`).catch(() => ({
      stdout: '',
    }))
    let password = null
    let authentication = null
    for (const line of profileOut.split(/\r?\n/)) {
      const keyMatch = line.match(/^\s*(?:Contenido de la clave|Key Content)\s*:\s*(.+)$/)
      if (keyMatch) password = keyMatch[1].trim()
      const authMatch = line.match(/^\s*(?:Autenticación|Authentication)\s*:\s*(.+)$/)
      if (authMatch) authentication = authMatch[1].trim()
    }
    networks.push({ ssid: name, password, authentication })
  }
  return networks
}

// ---------------------------------------------------------------------------
// Estado de impresoras
// ---------------------------------------------------------------------------

export async function listPrinters() {
  if (!IS_WINDOWS) {
    const { stdout } = await run('lpstat -p -d').catch(() => ({ stdout: '' }))
    const defaultMatch = stdout.match(/system default destination: (.+)/)
    return stdout.split(/\r?\n/).filter((line) => line.startsWith('printer ')).map((line) => {
      const match = line.match(/^printer (\S+) (.+)$/)
      const name = match?.[1] || line.slice(8)
      return { Name: name, Status: match?.[2] || 'unknown', Default: name === defaultMatch?.[1], PortName: null, JobCount: 0 }
    })
  }
  const script = `
Get-Printer | ForEach-Object {
  $jobCount = (Get-PrintJob -PrinterName $_.Name -ErrorAction SilentlyContinue | Measure-Object).Count
  [PSCustomObject]@{
    Name = $_.Name
    Status = $_.PrinterStatus.ToString()
    Default = $_.Default
    PortName = $_.PortName
    JobCount = $jobCount
  }
} | ConvertTo-Json -Compress
`
  const { stdout } = await runPowerShell(script, { timeout: 15000 })
  const trimmed = stdout.trim()
  if (!trimmed) return []
  const parsed = JSON.parse(trimmed)
  return Array.isArray(parsed) ? parsed : [parsed]
}

export async function setDefaultPrinter(printerName) {
  if (!printerName) throw new Error('Debe indicar el nombre de la impresora')
  if (!IS_WINDOWS) {
    await run(`lpadmin -d "${printerName.replace(/"/g, '\\"')}"`)
    return { printerName }
  }
  const escaped = printerName.replace(/'/g, "''")
  const script = `
$printer = Get-CimInstance -ClassName Win32_Printer -Filter "Name='${escaped}'" -ErrorAction SilentlyContinue
if (-not $printer) { Write-Output "NOTFOUND"; exit }
Invoke-CimMethod -InputObject $printer -MethodName SetDefaultPrinter | Out-Null
Write-Output "OK"
`
  const { stdout } = await runPowerShell(script, { timeout: 15000 })
  const trimmed = stdout.trim()
  if (trimmed === 'NOTFOUND') {
    throw new Error(`No se encontró ninguna impresora llamada "${printerName}".`)
  }
  return { printerName }
}

// Vaciar la cola sin reiniciar el Spooler primero puede dejar trabajos "zombis" que
// Windows sigue reportando aunque el archivo ya no exista. Se detiene el servicio,
// se borran los archivos de spool pendientes y se reinicia, igual que hace el truco
// manual habitual de soporte técnico.
export async function clearPrintQueue(printerName) {
  if (!IS_WINDOWS) {
    await run(printerName ? `cancel -a "${printerName.replace(/"/g, '\\"')}"` : 'cancel -a')
    return { printerName: printerName || null }
  }
  await run('net stop spooler').catch(() => {})
  const spoolDir = 'C:\\Windows\\System32\\spool\\PRINTERS'
  await run(`del /f /q "${spoolDir}\\*.*"`).catch(() => {})
  await run('net start spooler')
  return { printerName: printerName || null }
}

export async function removeStuckJobs(printerName) {
  if (!printerName) throw new Error('Debe indicar el nombre de la impresora')
  if (!IS_WINDOWS) {
    const { stdout } = await run(`lpstat -o "${printerName.replace(/"/g, '\\"')}"`).catch(() => ({ stdout: '' }))
    await run(`cancel -a "${printerName.replace(/"/g, '\\"')}"`).catch(() => {})
    return { printerName, removed: stdout.split(/\r?\n/).filter(Boolean).length }
  }
  const escaped = printerName.replace(/'/g, "''")
  const script = `
$jobs = Get-PrintJob -PrinterName '${escaped}' -ErrorAction SilentlyContinue
$count = ($jobs | Measure-Object).Count
$jobs | Remove-PrintJob -ErrorAction SilentlyContinue
Write-Output $count
`
  const { stdout } = await runPowerShell(script, { timeout: 15000 })
  const removed = Number(stdout.trim()) || 0
  return { printerName, removed }
}

export async function restartSpooler() {
  if (!IS_WINDOWS) {
    await run('systemctl restart cups')
    return {}
  }
  await run('net stop spooler')
  await run('net start spooler')
  return {}
}

// ---------------------------------------------------------------------------
// Información del equipo
// ---------------------------------------------------------------------------

function formatBytes(bytes) {
  const gb = bytes / 1024 ** 3
  return `${gb.toFixed(1)} GB`
}

// CPU, disco libre, dominio/grupo de trabajo y número de serie no están disponibles vía
// os.*, así que se consultan con CIM/WMI en una sola llamada a PowerShell para evitar
// levantar el intérprete varias veces.
async function getWmiSystemInfo() {
  if (!IS_WINDOWS) return {}
  const script = `
$cpu = Get-CimInstance -ClassName Win32_Processor | Select-Object -First 1
$disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='$($env:SystemDrive)'"
$cs = Get-CimInstance -ClassName Win32_ComputerSystem
$bios = Get-CimInstance -ClassName Win32_BIOS
# La interfaz con ruta por defecto es la que realmente sale a la red/internet — a
# diferencia de recorrer todos los adaptadores, esto evita elegir por error un adaptador
# virtual (VirtualBox, VMware, VPN) que no tiene gateway configurado.
$route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object -Property RouteMetric | Select-Object -First 1
$localIp = $null
if ($route) {
  $localIp = (Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
}
[PSCustomObject]@{
  CpuName = $cpu.Name
  DiskFreeBytes = $disk.FreeSpace
  DiskTotalBytes = $disk.Size
  Domain = $cs.Domain
  PartOfDomain = $cs.PartOfDomain
  Workgroup = $cs.Workgroup
  SerialNumber = $bios.SerialNumber
  LocalIp = $localIp
} | ConvertTo-Json -Compress
`
  const { stdout } = await runPowerShell(script, { timeout: 15000 })
  return JSON.parse(stdout.trim())
}

// El agente no tiene forma de conocer la IP pública sin consultarla a un servicio
// externo; si no hay internet o el servicio falla, se informa como no disponible en
// vez de romper el resto de la información del equipo.
async function getPublicIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    return data.ip || null
  } catch {
    return null
  }
}

export async function getSystemInfo() {
  const [wmi, publicIp] = await Promise.all([
    getWmiSystemInfo().catch(() => ({})),
    getPublicIp(),
  ])

  const interfaces = getLocalInterfaces()
  const localIp =
    wmi.LocalIp ||
    interfaces.find((i) => i.family === 'IPv4' && !i.virtual)?.address ||
    interfaces.find((i) => i.family === 'IPv4')?.address ||
    interfaces[0]?.address ||
    null
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const diskStats = await fs.statfs(os.homedir()).catch(() => null)

  return {
    computerName: os.hostname(),
    userName: os.userInfo().username,
    windowsVersion: `${os.type()} ${os.release()}`,
    ramTotal: formatBytes(totalMem),
    ramUsed: formatBytes(totalMem - freeMem),
    cpu: wmi.CpuName || os.cpus()[0]?.model || null,
    diskFree: wmi.DiskFreeBytes != null ? formatBytes(wmi.DiskFreeBytes) : diskStats ? formatBytes(diskStats.bavail * diskStats.bsize) : null,
    diskTotal: wmi.DiskTotalBytes != null ? formatBytes(wmi.DiskTotalBytes) : diskStats ? formatBytes(diskStats.blocks * diskStats.bsize) : null,
    localIp,
    publicIp,
    domain: wmi.PartOfDomain ? wmi.Domain : wmi.Workgroup || null,
    serialNumber: wmi.SerialNumber || null,
  }
}

export async function getNetworkStatus() {
  const [interfaces, activeWifi, savedNetworks] = await Promise.all([
    Promise.resolve(getLocalInterfaces()),
    getActiveWifiInfo(),
    getSavedWifiNetworks().catch(() => []),
  ])

  return {
    hostname: os.hostname(),
    interfaces,
    activeWifi,
    savedNetworks,
  }
}

// TeamViewer y AnyDesk no se registran de forma confiable en "App Paths" (a diferencia de
// los navegadores), así que se buscan directamente en sus ubicaciones de instalación
// habituales. AnyDesk además soporta instalación "solo para este usuario" (sin admin),
// que queda en AppData en vez de Program Files.
const REMOTE_APP_PATHS = {
  teamviewer: [
    ...(IS_LINUX ? ['/usr/bin/teamviewer', '/opt/teamviewer/tv_bin/TeamViewer'] : ['C:\\Program Files\\TeamViewer\\TeamViewer.exe', 'C:\\Program Files (x86)\\TeamViewer\\TeamViewer.exe']),
  ],
  anydesk: [
    ...(IS_LINUX ? ['/usr/bin/anydesk'] : ['C:\\Program Files (x86)\\AnyDesk\\AnyDesk.exe', 'C:\\Program Files\\AnyDesk\\AnyDesk.exe', path.join(os.homedir(), 'AppData', 'Local', 'AnyDesk', 'AnyDesk.exe')]),
  ],
}

const REMOTE_APP_LABELS = {
  teamviewer: 'TeamViewer',
  anydesk: 'AnyDesk',
}

export async function openRemoteApp(appId) {
  const candidates = REMOTE_APP_PATHS[appId]
  if (!candidates) throw new Error(`Aplicación no soportada: ${appId}`)

  for (const candidate of candidates) {
    const found = await existingPath(candidate)
    if (found) {
      await run(IS_WINDOWS ? `start "" "${found}"` : `"${found}"`)
      return { appId, path: found }
    }
  }

  throw new Error(`No se encontró ${REMOTE_APP_LABELS[appId]} instalado en este equipo.`)
}

// "net session" sin argumentos solo puede ejecutarse con privilegios de administrador
// (falla con "Acceso denegado" en cualquier otro caso) — es el truco estándar para
// detectar elevación sin depender de módulos nativos adicionales.
export async function isElevated() {
  if (!IS_WINDOWS) {
    try {
      return os.userInfo().uid === 0
    } catch {
      return false
    }
  }
  try {
    await run('net session')
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Accesos rápidos a carpetas
// ---------------------------------------------------------------------------

// %TEMP% del usuario (os.tmpdir()) y %APPDATA% (Roaming) no son rutas fijas: dependen del
// usuario activo y de variables de entorno, así que se resuelven en vez de asumirse.
const QUICK_FOLDERS = {
  downloads: () => path.join(os.homedir(), 'Downloads'),
  temp: () => os.tmpdir(),
  appdata: () => process.env.APPDATA || process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
  startup: () => IS_WINDOWS
    ? path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
    : path.join(os.homedir(), '.config', 'autostart'),
}

export async function openQuickFolder(folderKey) {
  const resolver = QUICK_FOLDERS[folderKey]
  if (!resolver) throw new Error(`Carpeta no soportada: ${folderKey}`)
  const dir = resolver()
  await fs.mkdir(dir, { recursive: true })
  await run(IS_WINDOWS ? `start "" explorer "${dir}"` : `xdg-open "${dir}"`)
  return { folderKey, dir }
}

// ---------------------------------------------------------------------------
// Reparaciones automáticas
// ---------------------------------------------------------------------------

// sfc, DISM y chkdsk pueden tardar varios minutos en equipos con discos lentos, así que no
// se les pone timeout (a diferencia del resto de comandos): se prefiere esperar a que
// terminen en vez de cortarlos a mitad de un escaneo del sistema de archivos.
export async function runSfcScan() {
  if (!IS_WINDOWS) return { output: (await run('sudo -n journalctl -p err -b --no-pager').catch((err) => ({ stdout: err.stdout || err.message }))).stdout }
  const { stdout } = await run('sfc /scannow')
  return { output: stdout }
}

export async function runDismRestoreHealth() {
  if (!IS_WINDOWS) return { output: (await run('sudo -n apt-get check').catch((err) => ({ stdout: err.stdout || err.message }))).stdout }
  const { stdout } = await run('DISM /Online /Cleanup-Image /RestoreHealth')
  return { output: stdout }
}

// "/scan" hace una verificación de solo lectura sin desmontar el volumen ni pedir
// reinicio, a diferencia de "/f" (que sí requiere bloquear la unidad del sistema y
// reiniciar). Es lo que corresponde a un botón de un clic sin interrumpir al usuario.
export async function runChkdskScan() {
  if (!IS_WINDOWS) {
    const { stdout } = await run('df -h /')
    return { output: stdout }
  }
  const drive = process.env.SystemDrive || 'C:'
  const { stdout } = await run(`chkdsk ${drive} /scan`)
  return { output: stdout }
}

export async function flushDns() {
  if (!IS_WINDOWS) {
    const { stdout } = await run('resolvectl flush-caches').catch(() => ({ stdout: 'El sistema no expone resolvectl.' }))
    return { output: stdout }
  }
  const { stdout } = await run('ipconfig /flushdns')
  return { output: stdout }
}

// Reinicia el stack Winsock a su estado por defecto (corrige "sin acceso a Internet"
// causado por LSPs corruptos). El cambio requiere reiniciar el equipo para completarse.
export async function resetWinsock() {
  if (!IS_WINDOWS) {
    const { stdout } = await run('systemctl restart NetworkManager').catch((err) => ({ stdout: err.stdout || err.message }))
    return { output: stdout, requiresRestart: false }
  }
  const { stdout } = await run('netsh winsock reset')
  return { output: stdout, requiresRestart: true }
}

const REPAIR_STEPS = [
  { id: 'flushDns', label: 'Flush DNS', run: flushDns },
  { id: 'resetWinsock', label: 'Reset Winsock', run: resetWinsock },
  { id: 'chkdsk', label: 'CHKDSK', run: runChkdskScan },
  { id: 'sfc', label: 'SFC /scannow', run: runSfcScan },
  { id: 'dism', label: 'DISM', run: runDismRestoreHealth },
]

// Ejecuta las cinco reparaciones en secuencia ("todo en un clic"). Igual que backupAll,
// corre como job en segundo plano (sfc/DISM pueden tardar varios minutos) y reporta el
// resultado de cada paso vía onProgress, sin que un paso fallido detenga a los demás.
export async function runAllRepairs(onProgress) {
  const results = []
  for (const step of REPAIR_STEPS) {
    try {
      const result = await step.run()
      results.push({ id: step.id, label: step.label, status: 'success', ...result })
    } catch (err) {
      results.push({ id: step.id, label: step.label, status: 'error', error: err.message })
    }
    onProgress?.(results.slice())
  }
  return { results, finishedAt: new Date().toISOString() }
}
