// Empaqueta local-agent en un único .exe autocontenido (Node SEA), para que el usuario
// pueda "instalar" el servicio con un doble clic, sin tener Node.js instalado.
// Pipeline: esbuild (bundle ESM -> CJS) -> node --experimental-sea-config -> postject
// (inyecta el bundle dentro de una copia de node.exe).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const dir = path.dirname(fileURLToPath(import.meta.url))
const buildDir = path.join(dir, 'build')
// SEA no cross-compila: esto siempre empaqueta el Node del SO donde corre este script.
// Un .exe de Windows válido solo sale corriendo esto en una máquina Windows real.
const isWindows = process.platform === 'win32'
const outName = isWindows ? 'BrowserToolsAgent.exe' : 'browser-tools-agent'
const outExe = path.join(dir, 'dist', outName)

fs.rmSync(buildDir, { recursive: true, force: true })
fs.mkdirSync(buildDir, { recursive: true })
fs.mkdirSync(path.dirname(outExe), { recursive: true })

await esbuild.build({
  entryPoints: [path.join(dir, 'server.js')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: path.join(buildDir, 'bundle.cjs'),
})

const seaConfigPath = path.join(buildDir, 'sea-config.json')
fs.writeFileSync(
  seaConfigPath,
  JSON.stringify(
    {
      main: path.join(buildDir, 'bundle.cjs'),
      output: path.join(buildDir, 'sea-prep.blob'),
      disableExperimentalSEAWarning: true,
    },
    null,
    2
  )
)

execFileSync(process.execPath, ['--experimental-sea-config', seaConfigPath], { stdio: 'inherit' })

fs.copyFileSync(process.execPath, outExe)

execFileSync(
  process.execPath,
  [
    path.join(dir, 'node_modules', 'postject', 'dist', 'cli.js'),
    outExe,
    'NODE_SEA_BLOB',
    path.join(buildDir, 'sea-prep.blob'),
    '--sentinel-fuse',
    'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
    '--overwrite',
  ],
  { stdio: 'inherit' }
)

// postject reescribe el archivo con --overwrite, así que el bit ejecutable se confirma
// después de ese paso, no antes.
if (!isWindows) fs.chmodSync(outExe, 0o755)

console.log(`\nListo: ${outExe}`)
