import BrowserCleaner from './BrowserCleaner'
import BrowserBackup from './BrowserBackup'
import WindowsTools from './WindowsTools'
import PrinterTools from './PrinterTools'
import LocalAgentStatus from './LocalAgentStatus'

export default function Dashboard({ onNotify }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-100">Panel de Herramientas</h2>
        <p className="text-sm text-slate-400">Acciones rápidas de soporte técnico para equipos Windows</p>
      </div>

      <LocalAgentStatus />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <div className="lg:col-span-2 xl:col-span-3">
          <BrowserCleaner onNotify={onNotify} />
        </div>
        <div className="lg:col-span-2 xl:col-span-3">
          <BrowserBackup onNotify={onNotify} />
        </div>
        <WindowsTools onNotify={onNotify} />
        <PrinterTools onNotify={onNotify} />
      </div>
    </main>
  )
}
