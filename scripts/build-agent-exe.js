// Construye el instalador .exe del local-agent y lo copia a public/downloads/ para
// que quede incluido en el build de la web (npm run deploy).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const localAgentDir = path.join(rootDir, 'local-agent')
const builtExe = path.join(localAgentDir, 'dist', 'BrowserToolsAgent.exe')
const downloadsDir = path.join(rootDir, 'public', 'downloads')

execFileSync('npm', ['run', 'build:exe'], { cwd: localAgentDir, stdio: 'inherit', shell: true })

fs.mkdirSync(downloadsDir, { recursive: true })
fs.copyFileSync(builtExe, path.join(downloadsDir, 'BrowserToolsAgent.exe'))

console.log('Instalador copiado a public/downloads/BrowserToolsAgent.exe')
