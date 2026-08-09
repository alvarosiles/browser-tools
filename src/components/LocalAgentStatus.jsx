import { useEffect, useState } from 'react'
import { AlertTriangle, Download, PauseCircle } from 'lucide-react'
import { getServiceStatus, isLocalAgentAvailable } from '../lib/localAgent'
import { useLanguage } from '../lib/i18n'

export default function LocalAgentStatus() {
  const { t } = useLanguage()
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
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-100/70 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
        <PauseCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <p className="font-medium">{t('agent.stoppedTitle')}</p>
          <p className="text-slate-500 dark:text-slate-400">{t('agent.stoppedBody')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>
        <p className="font-medium">{t('agent.missingTitle')}</p>
        <p className="text-amber-700/80 dark:text-amber-300/80">{t('agent.missingBody')}</p>
        <a
          href={`${import.meta.env.BASE_URL}downloads/BrowserToolsAgent.exe`}
          download
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-amber-950 transition hover:bg-amber-400"
        >
          <Download className="h-3.5 w-3.5" />
          {t('agent.installButton')}
        </a>
      </div>
    </div>
  )
}
