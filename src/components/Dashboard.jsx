import BrowserCleaner from './BrowserCleaner'
import WindowsTools from './WindowsTools'
import PrinterTools from './PrinterTools'

export default function Dashboard({ onNotify }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-100">Panel de Herramientas</h2>
        <p className="text-sm text-slate-400">Acciones rápidas de soporte técnico para equipos Windows</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <BrowserCleaner onNotify={onNotify} />
        <WindowsTools onNotify={onNotify} />
        <PrinterTools onNotify={onNotify} />
      </div>
    </main>
  )
}
