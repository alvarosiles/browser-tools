import { useEffect, useState } from 'react'
import { Check, Copy, MonitorSmartphone } from 'lucide-react'
import Card from './Card'
import { getSystemInfo } from '../lib/localAgent'
import { useLanguage } from '../lib/i18n'

const FIELD_KEYS = [
  'computerName',
  'userName',
  'windowsVersion',
  'ramTotal',
  'cpu',
  'diskFree',
  'localIp',
  'publicIp',
  'domain',
  'serialNumber',
]

export default function SystemInfo({ onNotify }) {
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    getSystemInfo()
      .then(({ result }) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) onNotify(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCopy = async () => {
    if (!data) return
    const text = FIELD_KEYS.map(
      (key) => `${t(`systemInfo.fields.${key}`)}: ${data[key] ?? t('systemInfo.notAvailable')}`
    ).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onNotify(t('systemInfo.copiedNotify'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      onNotify(t('systemInfo.copyFailedNotify'))
    }
  }

  return (
    <Card icon={MonitorSmartphone} title={t('systemInfo.title')} description={t('systemInfo.description')}>
      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">{t('systemInfo.loading')}</p>}

      {!loading && data && (
        <>
          <div className="rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              {FIELD_KEYS.map((key) => (
                <div key={key} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-slate-500">{t(`systemInfo.fields.${key}`)}</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{data[key] ?? t('systemInfo.notAvailable')}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 active:bg-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
          >
            {copied ? <Check className="h-4 w-4 text-green-500 dark:text-green-400" /> : <Copy className="h-4 w-4" />}
            {copied ? t('systemInfo.copied') : t('systemInfo.copy')}
          </button>
        </>
      )}
    </Card>
  )
}
