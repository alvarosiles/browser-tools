import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Copy, Download, PauseCircle } from 'lucide-react'
import { getServiceStatus, isLocalAgentAvailable } from '../lib/localAgent'
import { useLanguage } from '../lib/i18n'

// Detección simple de SO para mostrar el comando de instalación correcto (PowerShell en
// Windows, curl|bash en Linux) sin obligar al usuario a elegir manualmente.
function detectPlatform() {
  const ua = navigator.userAgent || ''
  if (/linux/i.test(ua) && !/android/i.test(ua)) return 'linux'
  return 'windows'
}

export default function LocalAgentStatus({ onNotify }) {
  const { t } = useLanguage()
  const [available, setAvailable] = useState(true)
  const [installed, setInstalled] = useState(false)
  const [copied, setCopied] = useState(false)
  const [platform] = useState(detectPlatform)

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

  // El agente está instalado (panel de control en 5178 responde) pero el usuario lo pausó
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

  const base = `${window.location.origin}${import.meta.env.BASE_URL}`
  const command =
    platform === 'linux' ? `curl -fsSL ${base}downloads/install.sh | bash` : `irm ${base}downloads/install.ps1 | iex`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      onNotify?.(t('agent.commandCopiedNotify'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sin permiso de portapapeles: el comando ya queda visible en el bloque de código,
      // así que el usuario todavía lo puede copiar a mano.
    }
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{t('agent.missingTitle')}</p>
        <p className="text-amber-700/80 dark:text-amber-300/80">{t('agent.missingBody')}</p>

        <div className="mt-3 flex items-center gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-amber-950/90 px-3 py-1.5 font-mono text-xs text-amber-100">
            {command}
          </code>
          <button
            onClick={handleCopy}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-amber-950 transition hover:bg-amber-400"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t('agent.copiedButton') : t('agent.copyCommandButton')}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-amber-700/70 dark:text-amber-300/60">
          <span>{t('agent.manualDownloadLabel')}</span>
          <a href={`${import.meta.env.BASE_URL}downloads/BrowserToolsAgent.exe`} download className="inline-flex items-center gap-1 underline hover:text-amber-900 dark:hover:text-amber-100">
            <Download className="h-3 w-3" />
            Windows
          </a>
          <a href={`${import.meta.env.BASE_URL}downloads/install.sh`} download className="inline-flex items-center gap-1 underline hover:text-amber-900 dark:hover:text-amber-100">
            <Download className="h-3 w-3" />
            Linux
          </a>
        </div>
      </div>
    </div>
  )
}
