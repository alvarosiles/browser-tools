import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { isLocalAgentAvailable } from '../lib/localAgent'

export default function LocalAgentStatus() {
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const ok = await isLocalAgentAvailable()
      if (!cancelled) setAvailable(ok)
    }
    check()
    const interval = setInterval(check, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (available) return null

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>
        <p className="font-medium">Servicio local no detectado</p>
        <p className="text-amber-300/80">
          Las acciones de esta página necesitan el servicio local corriendo en esta PC. Ejecuta{' '}
          <code className="rounded bg-amber-900/50 px-1 py-0.5">Iniciar-Servicio.bat</code> dentro de la
          carpeta <code className="rounded bg-amber-900/50 px-1 py-0.5">local-agent</code> y deja esa
          ventana abierta.
        </p>
      </div>
    </div>
  )
}
