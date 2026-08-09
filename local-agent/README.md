# IT Support Tools — Local Agent

Servicio local en Node.js/Express que recibe peticiones desde el panel web [IT Support Tools](../README.md) y ejecuta las acciones reales en Windows: abrir el Panel de Control, la Configuración, gestionar impresoras y borrar el historial de navegadores.

Escucha únicamente en `127.0.0.1:5177` (no expuesto a la red).

## Requisitos

- Windows.
- Node.js.

## Instalación y ejecución

```bash
cd local-agent
npm install
npm start
```

Debe quedar corriendo en segundo plano mientras usas el panel web (`http://localhost:5180` u otro puerto de Vite). Si no está activo, la web mostrará un aviso de que no pudo conectar con el servicio local.

## Endpoints

| Método | Ruta | Body | Acción |
|---|---|---|---|
| POST | `/clear-browser-data` | `{ browserId: "chrome" \| "edge" \| "firefox" \| "brave" \| "opera", types: string[] }` | Cierra el navegador y borra solo los tipos seleccionados |
| POST | `/open-control-panel` | – | Abre el Panel de Control |
| POST | `/open-windows-settings` | – | Abre la Configuración de Windows |
| POST | `/open-printer-maintenance` | `{ printerName? }` | Abre propiedades de la impresora o la lista de dispositivos |
| POST | `/print-test-page` | `{ printerName }` | Envía una página de prueba a la impresora indicada |
| GET | `/health` | – | Comprobación de disponibilidad |

## Notas importantes

- **`types`** acepta cualquier combinación de: `cookies`, `cache`, `localStorage`, `sessionStorage`, `indexedDB`, `serviceWorkers`, `history`. Se cierra el navegador **una sola vez** y se borran todos los tipos seleccionados en la misma pasada (más eficiente que llamadas separadas).
- Cierra el proceso del navegador (`taskkill`, con reintentos hasta confirmar vía `tasklist` que no sigue relanzándose) antes de eliminar archivos/carpetas, para liberar el bloqueo. Esto cerrará todas las ventanas abiertas de ese navegador — no se borra nada "en caliente" con el navegador abierto, es intencional para evitar fallos parciales por archivos bloqueados.
- Mapeo por tipo en Chromium (Chrome/Edge/Brave/Opera), por perfil: `cache` → `Cache`, `Code Cache`, `GPUCache` (+ `GPUCache`/`GrShaderCache`/`ShaderCache` compartidos a nivel `User Data`); `cookies` → `Cookies`/`Network/Cookies` (+ `-journal`); `localStorage` → `Local Storage`; `sessionStorage` → `Session Storage`; `indexedDB` → `IndexedDB`; `serviceWorkers` → `Service Worker`; `history` → `History`.
- En **Firefox**, `cache` → `cache2` (perfil Local); `cookies` → `cookies.sqlite(-wal)`; `history` → `places.sqlite`. Firefox **no separa** `localStorage`/`indexedDB`/`serviceWorkers` en carpetas distintas — los tres viven juntos en `storage/` (perfil Roaming), así que marcar cualquiera de esos tres borra los tres.
- Borrar `cookies` **cierra las sesiones iniciadas** en los sitios web.
- Se procesan **todos los perfiles** encontrados (Chrome/Edge/Brave/Opera usan carpetas `Default`/`Profile N`; Firefox usa su carpeta de perfil con nombre aleatorio).
- **Imprimir página de prueba**: para impresoras físicas usa `Invoke-CimMethod PrintTestPage`. Para impresoras que "imprimen a archivo" (puerto `PORTPROMPT:`, p. ej. **Microsoft Print to PDF**, o cualquier impresora con "Imprimir a archivo" activado) se detecta automáticamente y se usa la API de impresión de .NET (`PrintDocument` con `PrintToFile`/`PrintFileName` fijados de antemano) para evitar el diálogo interactivo "Guardar como", que de otro modo se queda esperando indefinidamente sin poder completarse desde un servicio en segundo plano. El archivo generado se guarda en `%TEMP%\it-support-tools-test-page-<id>.pdf` y su ruta se devuelve en la respuesta. El nombre de la impresora debe coincidir exactamente con el que aparece en Windows.
- Pensado para uso local de un técnico en su propia máquina, no para exponerse en red ni en producción sin autenticación adicional.
