import express from 'express'
import cors from 'cors'
import {
  clearBrowserHistory,
  clearBrowserCache,
  openControlPanel,
  openWindowsSettings,
  openPrinterMaintenance,
  printTestPage,
} from './commands.js'

const PORT = process.env.PORT || 5177

const app = express()
app.use(cors())
app.use(express.json())

function handle(action, fn) {
  app.post(`/${action}`, async (req, res) => {
    try {
      const result = await fn(req.body)
      res.json({ ok: true, action, result })
    } catch (err) {
      console.error(`[${action}]`, err.message)
      res.status(500).json({ ok: false, action, error: err.message })
    }
  })
}

handle('clear-browser-history', ({ browserId }) => clearBrowserHistory(browserId))
handle('clear-browser-cache', ({ browserId }) => clearBrowserCache(browserId))
handle('open-control-panel', () => openControlPanel())
handle('open-windows-settings', () => openWindowsSettings())
handle('open-printer-maintenance', ({ printerName }) => openPrinterMaintenance(printerName))
handle('print-test-page', ({ printerName }) => printTestPage(printerName))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, '127.0.0.1', () => {
  console.log(`IT Support Tools local agent escuchando en http://127.0.0.1:${PORT}`)
})
