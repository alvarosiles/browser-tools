# IT Support Tools

Panel web de soporte técnico para equipos Windows. Interfaz en React + Vite + Tailwind CSS (tema oscuro/claro, español/inglés) que se conecta a un **servicio local** instalable (`local-agent`) para ejecutar acciones reales sobre el sistema operativo — cosas que un navegador, por seguridad, nunca puede hacer por sí solo.

- **Sitio publicado:** https://alvarosiles.github.io/browser-tools/
- **Rama de desarrollo:** [`dev`](https://github.com/alvarosiles/browser-tools/tree/dev) (código fuente completo)
- **Rama `main`:** solo este README
- **Rama `gh-pages`:** build de producción publicado (generado automáticamente, no se edita a mano)

## Arquitectura

```
Navegador (React)  →  fetch HTTP  →  local-agent (Node/Express en la PC del usuario)  →  comandos de Windows
```

Ningún botón ejecuta nada directamente desde el navegador. Cada acción llama a una función centralizada en `src/lib/localAgent.js`, que hace una petición HTTP al **servicio local** corriendo en `http://localhost:5177` (acciones) y `http://localhost:5178` (control start/stop). Sin ese servicio corriendo, la web muestra un aviso y ofrece el instalador para descargar.

El servicio local se empaqueta como un único `.exe` autocontenido (Node SEA, sin necesitar Node.js instalado) que se instala con un doble clic, se copia a `%LOCALAPPDATA%\BrowserToolsAgent\` y se registra para arrancar solo con Windows.

## Qué incluye el panel

**Personalización**
- Tema oscuro/claro (persistente)
- Idioma español/inglés (persistente)

**Borrar Historial de Navegadores**
- Chrome, Edge, Firefox, Brave, Opera
- Selección por navegador × tipo de dato: cookies, caché, localStorage, sessionStorage, IndexedDB, Service Workers, historial, y avanzados (permisos, push, WebSQL, autocompletado, etc.)

**Borrar Datos de un Dominio**
- Borra cookies/historial/permisos de un solo dominio en todos los navegadores instalados, sin tocar el resto

**Respaldo de Navegadores**
- Respaldar perfil completo, favoritos o exportar contraseñas, por navegador
- "Respaldar Todo" con progreso en tiempo real (job en background)

**Control de Windows**
- Reloj en vivo
- Abrir: Panel de Control, Configuración, Administrador de Tareas, CMD como Administrador (UAC), PowerShell, Servicios (`services.msc`), Administrador de Dispositivos

**Control de Impresión**
- Tabla con impresoras instaladas (carga automática): estado, trabajos pendientes
- Por impresora: imprimir prueba, eliminar trabajos atascados, marcar predeterminada, abrir mantenimiento
- Generales: reiniciar cola, reiniciar servicio Spooler

**Estado de Red**
- IP local, interfaces de red, Wi-Fi conectada
- Redes Wi-Fi guardadas con sus contraseñas (ocultables/revelables)

**Información del PC**
- Carga automática: nombre de equipo, usuario, versión de Windows, RAM, CPU, disco libre, IP local/pública, dominio, número de serie
- Botón para copiar toda la información

**Accesos Rápidos**
- Carpetas: Descargas, Temp, `%appdata%`, Startup
- Apps de soporte remoto: TeamViewer, AnyDesk (detecta instalación y las abre)

**Reparaciones Automáticas**
- SFC `/scannow`, DISM, CHKDSK, Flush DNS, Reset Winsock — individuales o "Ejecutar Todo" en un clic
- Detecta si el servicio no corre como Administrador y avisa antes de fallar

## Desarrollo local

Necesitás dos procesos corriendo a la vez (o el script combinado):

```bash
npm install
cd local-agent && npm install && cd ..

npm run web   # levanta local-agent + Vite juntos
```

Abrí la URL que muestra Vite (por defecto `http://localhost:5173`).

## Build y despliegue

```bash
node scripts/build-agent-exe.js   # compila local-agent a .exe y lo copia a public/downloads/
npm run deploy                    # build de la web + publica dist/ en la rama gh-pages
```

## Estructura del código (rama `dev`)

```
src/
  components/       # un componente por panel, todos envueltos en Card.jsx
  lib/
    localAgent.js    # único punto de integración HTTP con el servicio local
    i18n.jsx          # contexto de idioma (es/en)
    theme.jsx         # contexto de tema (oscuro/claro)
    translations.js   # diccionario de strings
  App.jsx / main.jsx / index.css
local-agent/
  server.js          # rutas Express, expone las acciones por HTTP
  commands.js         # implementación real de cada acción sobre Windows
  build-exe.js        # empaqueta todo en un único .exe (esbuild + Node SEA)
```
