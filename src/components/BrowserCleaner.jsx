import { Globe, Compass, Flame, History, Trash2 } from 'lucide-react'
import Card from './Card'
import { clearBrowserHistory } from '../lib/localAgent'

const BROWSERS = [
  { id: 'chrome', name: 'Google Chrome', icon: Globe, color: 'text-red-400' },
  { id: 'edge', name: 'Microsoft Edge', icon: Compass, color: 'text-sky-400' },
  { id: 'firefox', name: 'Mozilla Firefox', icon: Flame, color: 'text-orange-400' },
]

export default function BrowserCleaner({ onNotify }) {
  const handleClear = async (browser) => {
    try {
      await clearBrowserHistory(browser.id)
      onNotify(`Historial de ${browser.name} borrado correctamente.`)
    } catch (err) {
      onNotify(err.message)
    }
  }

  return (
    <Card
      icon={History}
      title="Borrar Historial de Navegadores"
      description="Seleccione un navegador y haga clic en Borrar Historial"
    >
      <div className="flex flex-col gap-2">
        {BROWSERS.map((browser) => (
          <div
            key={browser.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 transition-colors hover:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <browser.icon className={`h-5 w-5 ${browser.color}`} />
              <span className="text-sm font-medium text-slate-200">{browser.name}</span>
            </div>
            <button
              onClick={() => handleClear(browser)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 active:bg-blue-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Borrar Historial
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}
