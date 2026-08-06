import { Globe, Compass, Flame, Shield, Circle, History, Trash2, Database } from 'lucide-react'
import Card from './Card'
import { clearBrowserHistory, clearBrowserCache } from '../lib/localAgent'

const BROWSERS = [
  { id: 'chrome', name: 'Google Chrome', icon: Globe, color: 'text-red-400' },
  { id: 'edge', name: 'Microsoft Edge', icon: Compass, color: 'text-sky-400' },
  { id: 'firefox', name: 'Mozilla Firefox', icon: Flame, color: 'text-orange-400' },
  { id: 'brave', name: 'Brave', icon: Shield, color: 'text-orange-500' },
  { id: 'opera', name: 'Opera', icon: Circle, color: 'text-red-500' },
]

export default function BrowserCleaner({ onNotify }) {
  const handleClearHistory = async (browser) => {
    try {
      await clearBrowserHistory(browser.id)
      onNotify(`Historial de ${browser.name} borrado correctamente.`)
    } catch (err) {
      onNotify(err.message)
    }
  }

  const handleClearCache = async (browser) => {
    try {
      await clearBrowserCache(browser.id)
      onNotify(`Caché de ${browser.name} borrada correctamente.`)
    } catch (err) {
      onNotify(err.message)
    }
  }

  return (
    <Card
      icon={History}
      title="Borrar Historial de Navegadores"
      description="Seleccione un navegador y haga clic en Borrar Historial o Borrar Caché"
    >
      <div className="flex flex-col gap-2">
        {BROWSERS.map((browser) => (
          <div
            key={browser.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 transition-colors hover:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <browser.icon className={`h-5 w-5 ${browser.color}`} />
              <span className="text-sm font-medium text-slate-200">{browser.name}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleClearCache(browser)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-blue-500/50 hover:bg-slate-800"
              >
                <Database className="h-3.5 w-3.5" />
                Borrar Caché
              </button>
              <button
                onClick={() => handleClearHistory(browser)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 active:bg-blue-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Borrar Historial
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
