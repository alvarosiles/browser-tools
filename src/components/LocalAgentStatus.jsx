import { useEffect, useState } from 'react'
import { AlertTriangle, Download, PauseCircle } from 'lucide-react'
import { getServiceStatus, isLocalAgentAvailable } from '../lib/localAgent'

export default function LocalAgentStatus() {
  const [available, setAvailable] = useState(true)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const [ok, status] = await Promise.all([isLocalAgentAvailable(), getServiceStatus()])
      if (!cancelled) {
        setAvailable(ok)
        setInstalled(status.installed)
      }
    }
    check()
    const interval = setInterval(check, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (available) return null

  // El .exe está instalado (panel de control en 5178 responde) pero el usuario lo pausó
  // con el botón "Stop" del header — no hace falta reinstalar, solo darle a "Play" ahí arriba.
  if (installed) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
        <PauseCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <p className="font-medium">Servicio detenido</p>
          <p className="text-slate-400">
            Lo pausaste con el botón del encabezado. Presiona "Servicio detenido" (arriba) para
            reactivarlo.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>
        <p className="font-medium">Servicio local no detectado</p>
        <p className="text-amber-300/80">
          Las acciones de esta página necesitan el servicio local corriendo en esta PC. Descarga e
          instala la app (una sola vez, se abre sola en cada inicio de Windows) o, si ya la tienes,
          revisa que esté corriendo.
        </p>
        <a
          href={`${import.meta.env.BASE_URL}downloads/BrowserToolsAgent.exe`}
          download
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-amber-950 transition hover:bg-amber-400"
        >
          <Download className="h-3.5 w-3.5" />
          Instalar App
        </a>
      </div>
    </div>
  )
}
