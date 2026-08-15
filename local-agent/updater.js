// Auto-actualización del agente instalado. El binario ya instalado (ver server.js /
// ensureInstalled) chequea periódicamente un version.json publicado junto a los
// binarios y, si hay una versión más nueva, se descarga a sí mismo y se reemplaza.
//
// En Windows no se puede sobrescribir un .exe mientras está corriendo (el archivo queda
// bloqueado), así que el proceso actual descarga el binario nuevo con otro nombre, lanza
// un .vbs auxiliar que espera a que el proceso viejo suelte el archivo, hace el reemplazo,
// y relanza el launcher oculto existente — recién ahí el proceso actual termina.
// En Linux, unlink/rename sobre un binario en uso no rompe el proceso que ya lo tiene
// abierto, así que alcanza con reemplazar el archivo y pedirle a systemd que reinicie.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync, spawn } from 'node:child_process'
import { IS_WINDOWS, IS_LINUX } from './commands.js'

// Debe bumpearse junto con la versión en local-agent/package.json (scripts/build-agent-exe.js
// valida que coincidan antes de publicar).
export const AGENT_VERSION = '0.1.3'

const VERSION_URL = 'https://alvarosiles.github.io/browser-tools/downloads/version.json'
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

function isNewerVersion(remote, local) {
  const r = String(remote).split('.').map(Number)
  const l = String(local).split('.').map(Number)
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] || 0
    const lv = l[i] || 0
    if (rv > lv) return true
    if (rv < lv) return false
  }
  return false
}

async function fetchLatestInfo() {
  const res = await fetch(VERSION_URL, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error('No se pudo consultar version.json')
  return res.json()
}

async function downloadTo(url, destPath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo descargar ${url}`)
  fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()))
}

function buildWindowsUpdaterVbs(currentExe, newExe, launcherVbs) {
  return [
    'Set fso = CreateObject("Scripting.FileSystemObject")',
    'Set shell = CreateObject("WScript.Shell")',
    'For i = 1 To 20',
    '  On Error Resume Next',
    `  fso.CopyFile "${newExe}", "${currentExe}", True`,
    '  If Err.Number = 0 Then Exit For',
    '  Err.Clear',
    '  On Error Goto 0',
    '  WScript.Sleep 500',
    'Next',
    `On Error Resume Next`,
    `fso.DeleteFile "${newExe}", True`,
    `shell.Run Chr(34) & "${launcherVbs}" & Chr(34), 0, False`,
  ].join('\r\n')
}

async function applyUpdateWindows(downloadUrl) {
  const installDir = path.join(os.homedir(), 'AppData', 'Local', 'BrowserToolsAgent')
  const currentExe = path.join(installDir, 'BrowserToolsAgent.exe')
  const newExe = path.join(installDir, 'BrowserToolsAgent.new.exe')
  const launcherVbs = path.join(installDir, 'BrowserToolsAgentLauncher.vbs')
  const updaterVbs = path.join(installDir, 'BrowserToolsAgentUpdate.vbs')

  await downloadTo(downloadUrl, newExe)
  fs.writeFileSync(updaterVbs, buildWindowsUpdaterVbs(currentExe, newExe, launcherVbs), 'utf8')

  const wscriptPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'wscript.exe')
  spawn(wscriptPath, [updaterVbs], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
}

async function applyUpdateLinux(downloadUrl) {
  const installDir = path.join(os.homedir(), '.local', 'share', 'browser-tools-agent')
  const installPath = path.join(installDir, 'browser-tools-agent')
  const tmpPath = `${installPath}.new`

  await downloadTo(downloadUrl, tmpPath)
  fs.chmodSync(tmpPath, 0o755)
  fs.renameSync(tmpPath, installPath)
  execSync('systemctl --user restart browser-tools-agent')
}

export async function checkAndApplyUpdate() {
  try {
    const info = await fetchLatestInfo()
    if (!info.version || !isNewerVersion(info.version, AGENT_VERSION)) return

    console.log(`Nueva version disponible: ${info.version} (actual: ${AGENT_VERSION}). Actualizando...`)
    if (IS_WINDOWS && info.windows) {
      await applyUpdateWindows(info.windows)
      process.exit(0)
    } else if (IS_LINUX && info.linux) {
      await applyUpdateLinux(info.linux)
      process.exit(0)
    }
  } catch (err) {
    console.error('No se pudo chequear/aplicar actualizacion:', err.message)
  }
}

export function startUpdateChecker() {
  checkAndApplyUpdate()
  setInterval(checkAndApplyUpdate, CHECK_INTERVAL_MS)
}
