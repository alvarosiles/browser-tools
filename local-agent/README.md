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
| POST | `/clear-browser-history` | `{ browserId: "chrome" \| "edge" \| "firefox" }` | Cierra el navegador y borra su historial |
| POST | `/open-control-panel` | – | Abre el Panel de Control |
| POST | `/open-windows-settings` | – | Abre la Configuración de Windows |
| POST | `/open-printer-maintenance` | `{ printerName? }` | Abre propiedades de la impresora o la lista de dispositivos |
| POST | `/print-test-page` | `{ printerName }` | Envía una página de prueba a la impresora indicada |
| GET | `/health` | – | Comprobación de disponibilidad |

## Notas importantes

- **Borrar historial** cierra el proceso del navegador (`taskkill`) antes de eliminar el archivo, para liberar el bloqueo del archivo. Esto cerrará todas las ventanas abiertas de ese navegador.
- **Imprimir página de prueba** usa `Invoke-CimMethod PrintTestPage` sobre la impresora indicada; el nombre debe coincidir exactamente con el que aparece en Windows.
- Pensado para uso local de un técnico en su propia máquina, no para exponerse en red ni en producción sin autenticación adicional.
