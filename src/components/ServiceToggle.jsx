import { useEffect, useState } from 'react'
import { Play, Square, Loader2 } from 'lucide-react'
import { getServiceStatus, startService, stopService } from '../lib/localAgent'

export default function ServiceToggle() {
  const [status, setStatus] = useState({ installed: false, running: false })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const next = await getServiceStatus()
      if (!cancelled) setStatus(next)
    }
    check()
    const interval = setInterval(check, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (!status.installed) return null

  const toggle = async () => {
    setBusy(true)
    try {
      if (status.running) {
        await stopService()
        setStatus((s) => ({ ...s, running: false }))
      } else {
        await startService()
        setStatus((s) => ({ ...s, running: true }))
      }
    } catch {
      // El próximo poll de getServiceStatus corrige el estado si algo falló.
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={status.running ? 'Detener el servicio local' : 'Iniciar el servicio local'}
      className={`ml-auto flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
        status.running
          ? 'bg-emerald-950/50 text-emerald-300 hover:bg-red-950/50 hover:text-red-300'
          : 'bg-slate-800 text-slate-300 hover:bg-emerald-950/50 hover:text-emerald-300'
      }`}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : status.running ? (
        <Square className="h-3.5 w-3.5" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
      {status.running ? 'Servicio activo' : 'Servicio detenido'}
    </button>
  )
}
