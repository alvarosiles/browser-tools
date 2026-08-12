// Construye el binario autocontenido del local-agent (Node SEA) y lo copia a
// public/downloads/ para que quede incluido en el build de la web (npm run deploy).
// SEA no cross-compila: este script solo puede producir el binario de la plataforma
// donde corre (Windows -> BrowserToolsAgent.exe, Linux -> browser-tools-agent). Para
// tener AMBOS disponibles en public/downloads/ hay que correr esto una vez en cada SO
// antes de deployar — "npm run deploy" reemplaza todo el árbol publicado, así que
// deployar habiendo generado solo uno de los dos tira el binario del otro sistema.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const localAgentDir = path.join(rootDir, 'local-agent')
const downloadsDir = path.join(rootDir, 'public', 'downloads')

const isWindows = process.platform === 'win32'
const artifactName = isWindows ? 'BrowserToolsAgent.exe' : 'browser-tools-agent'
const builtExe = path.join(localAgentDir, 'dist', artifactName)

// La versión publicada en version.json (que el agente instalado consulta para saber si
// hay una actualización) tiene que coincidir con la que el propio binario reporta — si se
// desincronizan, el agente cree que ya está al día y nunca se actualiza.
const pkg = JSON.parse(fs.readFileSync(path.join(localAgentDir, 'package.json'), 'utf8'))
const updaterSrc = fs.readFileSync(path.join(localAgentDir, 'updater.js'), 'utf8')
const versionMatch = updaterSrc.match(/AGENT_VERSION = '([^']+)'/)
if (!versionMatch || versionMatch[1] !== pkg.version) {
  throw new Error(
    `local-agent/package.json ("${pkg.version}") y AGENT_VERSION en local-agent/updater.js ("${versionMatch?.[1]}") no coinciden. Actualizá ambos antes de publicar.`
  )
}

execFileSync('npm', ['run', 'build:exe'], { cwd: localAgentDir, stdio: 'inherit', shell: true })

fs.mkdirSync(downloadsDir, { recursive: true })
const destExe = path.join(downloadsDir, artifactName)
fs.copyFileSync(builtExe, destExe)
if (!isWindows) fs.chmodSync(destExe, 0o755)

for (const script of ['install.ps1', 'install.sh']) {
  fs.copyFileSync(path.join(localAgentDir, script), path.join(downloadsDir, script))
}

const versionJsonPath = path.join(downloadsDir, 'version.json')
let versionData = {}
if (fs.existsSync(versionJsonPath)) {
  try {
    versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'))
  } catch {
    versionData = {}
  }
}
versionData.version = pkg.version
versionData.windows = 'https://alvarosiles.github.io/browser-tools/downloads/BrowserToolsAgent.exe'
versionData.linux = 'https://alvarosiles.github.io/browser-tools/downloads/browser-tools-agent'
fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2))

console.log(`Binario copiado a public/downloads/${artifactName}`)
console.log(
  `AVISO: este script solo regeneró el binario de ${isWindows ? 'Windows' : 'Linux'}. ` +
    'Antes de "npm run deploy" asegurate de tener AMBOS binarios en public/downloads/ ' +
    '(gh-pages reemplaza todo el árbol publicado).'
)
