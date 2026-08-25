<!-- PUEDES crear INFO.md para ahi que pongas todas la versines y lenguaje que necesita el proyecto -->

Tu Me Estás Volviendo Loco, Juan Carlos Coronel - Audio
http://localhost:5173

https://alvarosiles.github.io/browser-tools/

# INFO — Requisitos del proyecto

## Lenguajes y runtime

| Herramienta | Versión requerida / usada | Notas |
|---|---|---|
| Node.js | **22** (instalada vía `nvm`, `.nvmrc` fija `22`) | Con Node **v18** el proyecto **no arranca**: Vite 8 (vía `rolldown`) usa `util.styleText`, agregado recién en Node 20.12/21.7, y `npm run dev`/`build` fallan con `SyntaxError`. Se instaló Node 22.23.2 con `nvm` y se confirmó de punta a punta: `npm run dev` y `npm run build` OK, y `npm run web` (agente local + Vite vía `concurrently`) también OK — el agente local levantó sin errores en `127.0.0.1:5177/5178`. `concurrently` (usado en `npm run web`) exige `engines: >=22`, y el build del `.exe` del agente (`build:exe`) usa `esbuild target: node22`, así que 22 es la versión recomendada para este proyecto (20 alcanzaba para `dev`/`build`, pero no cumplía el `engines` de `concurrently`). Usa `nvm use` parado en la raíz del repo para tomar automáticamente la versión de `.nvmrc`. |
| npm | 10.9.8 (bundlada con Node 22 vía nvm) | Gestor de paquetes usado en ambos `package.json` (raíz y `local-agent/`). |
| JavaScript | ESM (`"type": "module"`) | Todo el código usa `import`/`export`, tanto en el frontend como en `local-agent`. |
| JSX | React 19 | Componentes en `src/`. |

## Frontend (raíz del proyecto)

- **React** ^19.2.8 / **react-dom** ^19.2.8
- **Vite** ^8.2.0 (bundler y dev server)
- **@vitejs/plugin-react** ^6.0.4
- **Tailwind CSS** ^4.3.3 (vía `@tailwindcss/vite` ^4.3.3)
- **PostCSS** ^8.5.25 / **autoprefixer** ^10.5.4
- **oxlint** ^1.75.0 (linter)
- **TypeScript types**: `@types/react` ^19.2.17, `@types/react-dom` ^19.2.3 (solo tipos, el proyecto no usa `.ts`/`.tsx`)
- **lucide-react** ^1.28.0 (iconos)
- Utilidades de build/deploy: `concurrently` ^10.0.4, `cross-env` ^10.1.0, `gh-pages` ^6.3.0

## Backend local (`local-agent/`)

Servicio Node.js que corre en la máquina del técnico (pensado para Windows) y ejecuta las acciones reales del sistema.

- **express** ^4.19.2
- **cors** ^2.8.5
- **better-sqlite3** (declarado dos veces en `package.json`: `^12.4.1` y `^11.10.0` — revisar/limpiar duplicado)
- **esbuild** ^0.28.2 (dev, para empaquetar el `.exe`)
- **postject** ^1.0.0-alpha.6 (dev, inyecta el bundle en el binario de Node vía Node SEA)
- Empaquetado final: **Node SEA** (`--experimental-sea-config`) con target **node22**, genera `BrowserToolsAgent.exe`

## Otros

- **Python**: no es una dependencia del proyecto (no hay archivos `.py`, `requirements.txt` ni scripts Python). Disponible en el sistema: Python 3.12.3, no utilizado por este repo.
- **Git**: repositorio Git estándar, rama actual `dev`, rama principal `main`.

## Scripts principales

```bash
# Raíz
npm run dev       # Vite dev server
npm run build     # Build de producción (Vite)
npm run preview   # Preview del build
npm run web       # Corre local-agent + Vite juntos (concurrently)
npm run deploy    # Build del .exe + build web + publica a GitHub Pages

# local-agent/
npm start         # node server.js
npm run build:exe # Empaqueta el agente como .exe (BrowserToolsAgent.exe)
```
