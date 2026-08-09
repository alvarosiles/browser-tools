import { useState } from 'react'
import { Eye, EyeOff, RefreshCw, Wifi } from 'lucide-react'
import Card from './Card'
import { getNetworkStatus } from '../lib/localAgent'
import { useLanguage } from '../lib/i18n'

export default function NetworkStatus({ onNotify }) {
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState({})

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const res = await getNetworkStatus()
      setData(res.result)
    } catch (err) {
      onNotify(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleReveal = (ssid) => {
    setRevealed((prev) => ({ ...prev, [ssid]: !prev[ssid] }))
  }

  return (
    <Card icon={Wifi} title={t('networkStatus.title')} description={t('networkStatus.description')}>
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? t('networkStatus.refreshing') : t('networkStatus.refreshButton')}
      </button>

      {data && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs uppercase tracking-wide text-slate-500">{t('networkStatus.computer')}</p>
            <p className="mt-1 font-mono text-sm text-slate-800 dark:text-slate-200">{data.hostname}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs uppercase tracking-wide text-slate-500">{t('networkStatus.interfaces')}</p>
            <div className="mt-2 flex flex-col gap-2">
              {data.interfaces.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('networkStatus.noInterfaces')}</p>
              )}
              {data.interfaces.map((iface) => (
                <div key={`${iface.name}-${iface.address}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{iface.name}</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{iface.address}</span>
                  <span className="text-xs text-slate-500">{iface.mac}</span>
                </div>
              ))}
            </div>
          </div>

          {data.activeWifi?.ssid && (
            <div className="rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('networkStatus.connectedWifi')}</p>
              <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                {data.activeWifi.ssid}
                {data.activeWifi.signal && (
                  <span className="ml-2 text-xs text-slate-500">
                    {t('networkStatus.signal')} {data.activeWifi.signal}
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs uppercase tracking-wide text-slate-500">{t('networkStatus.savedNetworks')}</p>
            <div className="mt-2 flex flex-col gap-2">
              {data.savedNetworks.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('networkStatus.noSavedNetworks')}</p>
              )}
              {data.savedNetworks.map((net) => (
                <div key={net.ssid} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{net.ssid}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {net.password ? (revealed[net.ssid] ? net.password : '••••••••') : t('networkStatus.noPassword')}
                    </span>
                    {net.password && (
                      <button
                        onClick={() => toggleReveal(net.ssid)}
                        className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                        aria-label="Toggle password visibility"
                      >
                        {revealed[net.ssid] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
