// Punto único de integración con la futura aplicación de escritorio (servicio local)
// que ejecutará las acciones reales sobre Windows (limpieza de historial, paneles del
// sistema, impresión, etc). Por ahora estas funciones simulan la solicitud y devuelven
// una promesa resuelta; cuando exista el agente local, reemplazar el cuerpo por una
// llamada real (ej. fetch a http://localhost:PORT/api/...).

const LOCAL_AGENT_BASE_URL = 'http://localhost:5177'

async function requestLocalAction(action, payload = {}) {
  // TODO: reemplazar por integración real, ej:
  // return fetch(`${LOCAL_AGENT_BASE_URL}/${action}`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload),
  // }).then((res) => res.json())

  console.info(`[localAgent] Acción solicitada: ${action}`, payload)
  return Promise.resolve({ ok: true, action, payload, simulated: true })
}

export function clearBrowserHistory(browserId) {
  return requestLocalAction('clear-browser-history', { browserId })
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
