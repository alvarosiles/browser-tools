import { useEffect, useState } from 'react'
import { Play, Square, Loader2 } from 'lucide-react'
import { getServiceStatus, startService, stopService } from '../lib/localAgent'
import { useLanguage } from '../lib/i18n'

export default function ServiceToggle() {
  const { t } = useLanguage()
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
      title={status.running ? t('service.stop') : t('service.start')}
      className={`ml-auto flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
        status.running
          ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-red-950/50 dark:hover:text-red-300'
          : 'bg-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300'
      }`}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : status.running ? (
        <Square className="h-3.5 w-3.5" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
      {status.running ? t('service.running') : t('service.stopped')}
    </button>
  )
}
