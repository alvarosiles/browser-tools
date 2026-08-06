// Punto único de integración con la aplicación de escritorio (servicio local, ver
// carpeta local-agent/) que ejecuta las acciones reales sobre Windows: limpieza de
// historial, paneles del sistema, impresión, etc. Requiere que el servicio local esté
// corriendo (npm start dentro de local-agent/). Si no está disponible, la promesa se
// rechaza y quien llame debe mostrar el error al usuario.

const LOCAL_AGENT_BASE_URL = 'http://localhost:5177'

async function requestLocalAction(action, payload = {}) {
  const res = await fetch(`${LOCAL_AGENT_BASE_URL}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    throw new Error('No se pudo conectar con el servicio local. ¿Está corriendo local-agent?')
  })

  const data = await res.json()
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'La acción solicitada falló en el servicio local.')
  }
  return data
}

export function clearBrowserData(browserId, types) {
  return requestLocalAction('clear-browser-data', { browserId, types })
}

export function openControlPanel() {
  return requestLocalAction('open-control-panel')
}

export function openWindowsSettings() {
  return requestLocalAction('open-windows-settings')
}

export function openPrinterMaintenance(printerName) {
  return requestLocalAction('open-printer-maintenance', { printerName })
}

export function printTestPage(printerName) {
  return requestLocalAction('print-test-page', { printerName })
}
