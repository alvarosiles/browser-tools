# IT Support Tools

Panel de herramientas de soporte técnico para Windows. Interfaz web (React + Vite + Tailwind CSS) con tema oscuro, pensada para conectarse en el futuro con una aplicación de escritorio (agente local) que ejecute las acciones reales sobre el sistema.

## Módulos

- **Borrar Historial de Navegadores** — Chrome, Edge y Firefox.
- **Control de Windows** — reloj en tiempo real, accesos a Panel de Control y Configuración.
- **Control de Impresión** — mantenimiento e impresión de página de prueba por nombre de impresora.

Ninguna acción se ejecuta directamente desde el navegador (restricción de seguridad del propio navegador): cada botón llama a funciones centralizadas en [src/lib/localAgent.js](src/lib/localAgent.js), que envían la petición al **servicio local** en [local-agent/](local-agent/) — un pequeño servidor Node.js que corre en la máquina del técnico y sí puede ejecutar comandos de Windows. Debes tener ese servicio corriendo (`local-agent`) para que los botones funcionen; ver [local-agent/README.md](local-agent/README.md).

## Instalación

```bash
npm install
cd local-agent && npm install && cd ..
```

## Desarrollo

Necesitas **dos procesos corriendo a la vez**:

```bash
# Terminal 1 — servicio local (ejecuta las acciones reales en Windows)
cd local-agent
npm start

# Terminal 2 — panel web
npm run dev
```

Abre la URL que muestra Vite (por defecto `http://localhost:5173`). Sin el servicio local activo, los botones mostrarán un aviso de conexión fallida.

## Build de producción

```bash
npm run build
npm run preview
```

## Estructura

```
src/
  components/
    Header.jsx
    Footer.jsx
    Dashboard.jsx
    Card.jsx
    BrowserCleaner.jsx
    WindowsTools.jsx
    PrinterTools.jsx
    Toast.jsx
  hooks/
    useToast.js
  lib/
    localAgent.js   # punto único de integración con el servicio local
  App.jsx
  main.jsx
  index.css
local-agent/         # servicio Node.js que ejecuta las acciones reales en Windows
  server.js
  commands.js
```

## Integración con Windows

`src/lib/localAgent.js` centraliza todas las acciones que requieren acceso al sistema operativo (limpiar historial, abrir paneles del sistema, gestionar impresoras) y las envía por HTTP a `local-agent/`, que corre en la máquina del técnico y ejecuta los comandos reales de Windows.
