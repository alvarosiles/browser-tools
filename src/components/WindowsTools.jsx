import { useEffect, useState } from 'react'
import { MonitorCog, Settings, SlidersHorizontal } from 'lucide-react'
import Card from './Card'
import { openControlPanel, openWindowsSettings } from '../lib/localAgent'

const formatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function formatNow(date) {
  const parts = formatter.formatToParts(date)
  const get = (type) => parts.find((p) => p.type === type)?.value
  return `${get('day')} de ${get('month')} de ${get('year')} a las ${get('hour')}:${get('minute')}:${get('second')}`
}

export default function WindowsTools({ onNotify }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const handleControlPanel = async () => {
    try {
      await openControlPanel()
      onNotify('Panel de Control abierto.')
    } catch (err) {
      onNotify(err.message)
    }
  }

  const handleSettings = async () => {
    try {
      await openWindowsSettings()
      onNotify('Configuración de Windows abierta.')
    } catch (err) {
      onNotify(err.message)
    }
  }

  return (
    <Card icon={MonitorCog} title="Control de Windows" description="Herramientas del sistema operativo">
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Fecha y Hora Actual</p>
        <p className="mt-1 font-mono text-sm text-slate-200">{formatNow(now)}</p>
      </div>

      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={handleControlPanel}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-blue-500/50 hover:bg-slate-800 active:bg-slate-700"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Abrir Panel de Control
        </button>
        <button
          onClick={handleSettings}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-blue-500/50 hover:bg-slate-800 active:bg-slate-700"
        >
          <Settings className="h-4 w-4" />
          Abrir Configuración de Windows
        </button>
      </div>
    </Card>
  )
}
