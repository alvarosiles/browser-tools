# IT Support Tools

Panel de herramientas de soporte técnico para Windows. Interfaz web (React + Vite + Tailwind CSS) con tema oscuro, pensada para conectarse en el futuro con una aplicación de escritorio (agente local) que ejecute las acciones reales sobre el sistema.

## Módulos

- **Borrar Historial de Navegadores** — Chrome, Edge y Firefox.
- **Control de Windows** — reloj en tiempo real, accesos a Panel de Control y Configuración.
- **Control de Impresión** — mantenimiento e impresión de página de prueba por nombre de impresora.

Ninguna acción se ejecuta directamente desde el navegador: cada botón llama a funciones centralizadas en [src/lib/localAgent.js](src/lib/localAgent.js), que hoy simulan la solicitud (log + notificación) y están preparadas para apuntar a un servicio local (ej. `http://localhost:5177`) cuando exista.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre la URL que muestra Vite (por defecto `http://localhost:5173`).

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
    localAgent.js   # punto único de integración con la app de escritorio
  App.jsx
  main.jsx
  index.css
```

## Integración futura con Windows

`src/lib/localAgent.js` centraliza todas las acciones que requieren acceso al sistema operativo (limpiar historial, abrir paneles del sistema, gestionar impresoras). Para conectar con el agente local real, sustituir el cuerpo de `requestLocalAction` por una llamada `fetch` al servicio que se instale en el equipo del usuario.
