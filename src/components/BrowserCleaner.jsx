import { useState } from 'react'
import { Globe, Compass, Flame, Shield, Circle, History, Loader2, PlayCircle } from 'lucide-react'
import Card from './Card'
import { clearBrowserData } from '../lib/localAgent'

const BROWSERS = [
  { id: 'chrome', name: 'Google Chrome', icon: Globe, color: 'text-red-400' },
  { id: 'edge', name: 'Microsoft Edge', icon: Compass, color: 'text-sky-400' },
  { id: 'firefox', name: 'Mozilla Firefox', icon: Flame, color: 'text-orange-400' },
  { id: 'brave', name: 'Brave', icon: Shield, color: 'text-orange-500' },
  { id: 'opera', name: 'Opera', icon: Circle, color: 'text-red-500' },
]

const DATA_TYPES = [
  { key: 'cookies', label: 'Cookies' },
  { key: 'cache', label: 'Caché' },
  { key: 'localStorage', label: 'Local Storage' },
  { key: 'sessionStorage', label: 'Session Storage' },
  { key: 'indexedDB', label: 'IndexedDB' },
  { key: 'serviceWorkers', label: 'Service Workers' },
  { key: 'history', label: 'Historial' },
]

const emptyRow = () => Object.fromEntries(DATA_TYPES.map((t) => [t.key, false]))
const emptySelection = () => Object.fromEntries(BROWSERS.map((b) => [b.id, emptyRow()]))

export default function BrowserCleaner({ onNotify }) {
  const [selection, setSelection] = useState(emptySelection)
  const [processing, setProcessing] = useState(false)

  const toggle = (browserId, typeKey) => {
    setSelection((prev) => ({
      ...prev,
      [browserId]: { ...prev[browserId], [typeKey]: !prev[browserId][typeKey] },
    }))
  }

  const selectedBrowserCount = Object.values(selection).filter((row) =>
    Object.values(row).some(Boolean)
  ).length

  const handleProcess = async () => {
    setProcessing(true)
    try {
      for (const browser of BROWSERS) {
        const types = DATA_TYPES.map((t) => t.key).filter((key) => selection[browser.id][key])
        if (types.length === 0) continue

        try {
          await clearBrowserData(browser.id, types)
          onNotify(`${browser.name}: datos seleccionados borrados correctamente.`)
        } catch (err) {
          onNotify(`${browser.name}: ${err.message}`)
        }
      }
    } finally {
      setProcessing(false)
      setSelection(emptySelection())
    }
  }

  return (
    <Card
      icon={History}
      title="Borrar Historial de Navegadores"
      description="Marque los tipos de dato por navegador y presione Procesar"
    >
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">Navegador</th>
              {DATA_TYPES.map((type) => (
                <th key={type.key} className="whitespace-nowrap px-3 py-2.5 text-center font-medium">
                  {type.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BROWSERS.map((browser) => (
              <tr key={browser.id} className="border-b border-slate-800/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <browser.icon className={`h-4 w-4 flex-shrink-0 ${browser.color}`} />
                    <span className="font-medium text-slate-200">{browser.name}</span>
                  </div>
                </td>
                {DATA_TYPES.map((type) => (
                  <td key={type.key} className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={selection[browser.id][type.key]}
                      onChange={() => toggle(browser.id, type.key)}
                      disabled={processing}
                      className="h-4 w-4 cursor-pointer accent-blue-600"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleProcess}
        disabled={selectedBrowserCount === 0 || processing}
        className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
        {processing ? 'Procesando...' : `Procesar${selectedBrowserCount ? ` (${selectedBrowserCount})` : ''}`}
      </button>
    </Card>
  )
}
