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

// Carpeta "User Data" de cada navegador basado en Chromium. Los perfiles reales viven
// en subcarpetas variables ("Default", "Profile 1", "Profile 41", ...), nunca fijas,
// así que hay que enumerarlas en vez de asumir un nombre.
const USER_DATA_DIRS = {
  chrome: path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
  edge: path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data'),
}

const PROCESS_NAMES = {
  chrome: 'chrome.exe',
  edge: 'msedge.exe',
  firefox: 'firefox.exe',
}

async function findChromiumHistoryFiles(browserId) {
  const userDataDir = USER_DATA_DIRS[browserId]
  const entries = await fs.readdir(userDataDir, { withFileTypes: true }).catch(() => [])
  const profileDirs = entries.filter(
    (e) => e.isDirectory() && (e.name === 'Default' || e.name.startsWith('Profile '))
  )

  const historyFiles = []
  for (const dir of profileDirs) {
    const historyPath = path.join(userDataDir, dir.name, 'History')
    const exists = await fs.stat(historyPath).then(() => true).catch(() => false)
    if (exists) historyFiles.push(historyPath)
  }
  return historyFiles
}

async function findFirefoxHistoryFiles() {
  const profilesDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles')
  const entries = await fs.readdir(profilesDir, { withFileTypes: true }).catch(() => [])

  const historyFiles = []
  for (const dir of entries.filter((e) => e.isDirectory())) {
    const historyPath = path.join(profilesDir, dir.name, 'places.sqlite')
    const exists = await fs.stat(historyPath).then(() => true).catch(() => false)
    if (exists) historyFiles.push(historyPath)
  }
  return historyFiles
}

export async function clearBrowserHistory(browserId) {
  const processName = PROCESS_NAMES[browserId]
  if (!processName) throw new Error(`Navegador no soportado: ${browserId}`)

  // Cierra el navegador para liberar el bloqueo del archivo de historial.
  await run(`taskkill /IM ${processName} /F`).catch(() => {})

  const historyFiles =
    browserId === 'firefox' ? await findFirefoxHistoryFiles() : await findChromiumHistoryFiles(browserId)

  if (historyFiles.length === 0) {
    throw new Error(`No se encontró ningún perfil con historial para ${browserId}`)
  }

  for (const historyPath of historyFiles) {
    await fs.rm(historyPath, { force: true })
    await fs.rm(`${historyPath}-journal`, { force: true })
  }

  return { browserId, historyFiles }
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
  const script =
    `$r = (Get-CimInstance -ClassName Win32_Printer -Filter "Name='${escaped}'") | ` +
    `Invoke-CimMethod -MethodName PrintTestPage; $r.ReturnValue`
  const { stdout } = await run(`powershell -NoProfile -Command "${script}"`, { timeout: 15000 })
  const returnValue = Number(stdout.trim())
  if (returnValue !== 0) {
    throw new Error(
      `La impresora rechazó la página de prueba (código ${returnValue}). Si es una impresora virtual ` +
        '(PDF, OneNote, etc.) que requiere confirmación manual, no puede completarse desde este servicio: use una impresora física.'
    )
  }
}
