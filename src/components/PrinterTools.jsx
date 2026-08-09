import { useEffect, useState } from 'react'
import { ListRestart, Loader2, Printer, RefreshCw, Star, Trash2, Wrench, XCircle } from 'lucide-react'
import Card from './Card'
import {
  clearPrintQueue,
  getPrinters,
  openPrinterMaintenance,
  printTestPage,
  removeStuckJobs,
  restartSpooler,
  setDefaultPrinter,
} from '../lib/localAgent'
import { useLanguage } from '../lib/i18n'

export default function PrinterTools({ onNotify }) {
  const { t } = useLanguage()
  const [printers, setPrinters] = useState(null)
  const [loadingPrinters, setLoadingPrinters] = useState(true)
  const [busyKey, setBusyKey] = useState(null)

  const handleListPrinters = async () => {
    setLoadingPrinters(true)
    try {
      const { result } = await getPrinters()
      setPrinters(result)
    } catch (err) {
      onNotify(err.message)
    } finally {
      setLoadingPrinters(false)
    }
  }

  useEffect(() => {
    handleListPrinters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const withBusy = async (key, fn) => {
    setBusyKey(key)
    try {
      await fn()
    } catch (err) {
      onNotify(err.message)
    } finally {
      setBusyKey(null)
    }
  }

  const handleTestPage = (name) =>
    withBusy(`${name}-test`, async () => {
      const { result } = await printTestPage(name)
      onNotify(
        result?.outputFile
          ? t('printerTools.testPageGeneratedNotify', { file: result.outputFile })
          : t('printerTools.testPageSentNotify', { name })
      )
    })

  const handleMaintenance = (name) =>
    withBusy(`${name}-maintenance`, async () => {
      await openPrinterMaintenance(name)
      onNotify(t('printerTools.maintenanceOpenedNotify', { name }))
    })

  const handleSetDefault = (name) =>
    withBusy(`${name}-default`, async () => {
      await setDefaultPrinter(name)
      onNotify(t('printerTools.setDefaultNotify', { name }))
      await handleListPrinters()
    })

  const handleRemoveStuckJobs = (name) =>
    withBusy(`${name}-stuck`, async () => {
      const { result } = await removeStuckJobs(name)
      onNotify(t('printerTools.stuckRemovedNotify', { count: result.removed, name }))
      await handleListPrinters()
    })

  const handleClearQueue = () =>
    withBusy('clear-queue', async () => {
      await clearPrintQueue()
      onNotify(t('printerTools.queueRestartedNotify'))
      await handleListPrinters()
    })

  const handleRestartSpooler = () =>
    withBusy('restart-spooler', async () => {
      await restartSpooler()
      onNotify(t('printerTools.spoolerRestartedNotify'))
      await handleListPrinters()
    })

  return (
    <Card icon={Printer} title={t('printerTools.title')} description={t('printerTools.description')}>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleListPrinters}
          disabled={loadingPrinters}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
        >
          <RefreshCw className={`h-4 w-4 ${loadingPrinters ? 'animate-spin' : ''}`} />
          {t('printerTools.refresh')}
        </button>
        <button
          onClick={handleClearQueue}
          disabled={busyKey === 'clear-queue'}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
        >
          {busyKey === 'clear-queue' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListRestart className="h-4 w-4" />}
          {t('printerTools.restartQueue')}
        </button>
        <button
          onClick={handleRestartSpooler}
          disabled={busyKey === 'restart-spooler'}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
        >
          {busyKey === 'restart-spooler' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {t('printerTools.restartSpooler')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
              <th className="px-3 py-2 font-medium">{t('printerTools.colPrinter')}</th>
              <th className="px-3 py-2 font-medium">{t('printerTools.colStatus')}</th>
              <th className="px-3 py-2 font-medium">{t('printerTools.colJobs')}</th>
              <th className="px-3 py-2 font-medium">{t('printerTools.colTest')}</th>
              <th className="px-3 py-2 font-medium">{t('printerTools.colStuck')}</th>
              <th className="px-3 py-2 font-medium">{t('printerTools.colDefault')}</th>
              <th className="px-3 py-2 font-medium">{t('printerTools.colMaintenance')}</th>
            </tr>
          </thead>
          <tbody>
            {loadingPrinters && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                  {t('printerTools.loadingPrinters')}
                </td>
              </tr>
            )}
            {!loadingPrinters && printers?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                  {t('printerTools.noPrinters')}
                </td>
              </tr>
            )}
            {!loadingPrinters &&
              printers?.map((p) => (
                <tr
                  key={p.Name}
                  className="border-b border-slate-200/60 last:border-0 hover:bg-slate-100/60 dark:border-slate-800/60 dark:hover:bg-slate-900/40"
                >
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-200">
                    {p.Name}
                    {p.Default && <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">{t('printerTools.defaultBadge')}</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{p.Status}</td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{p.JobCount}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleTestPage(p.Name)}
                      disabled={busyKey === `${p.Name}-test`}
                      className="flex items-center gap-1 rounded-md border border-slate-300 bg-slate-200/60 px-2 py-1 text-xs text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
                      title={t('printerTools.testTitle')}
                    >
                      {busyKey === `${p.Name}-test` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Printer className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleRemoveStuckJobs(p.Name)}
                      disabled={busyKey === `${p.Name}-stuck`}
                      className="flex items-center gap-1 rounded-md border border-slate-300 bg-slate-200/60 px-2 py-1 text-xs text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
                      title={t('printerTools.stuckTitle')}
                    >
                      {busyKey === `${p.Name}-stuck` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleSetDefault(p.Name)}
                      disabled={p.Default || busyKey === `${p.Name}-default`}
                      className="flex items-center gap-1 rounded-md border border-slate-300 bg-slate-200/60 px-2 py-1 text-xs text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
                      title={t('printerTools.defaultTitle')}
                    >
                      {busyKey === `${p.Name}-default` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Star className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleMaintenance(p.Name)}
                      disabled={busyKey === `${p.Name}-maintenance`}
                      className="flex items-center gap-1 rounded-md border border-slate-300 bg-slate-200/60 px-2 py-1 text-xs text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
                      title={t('printerTools.maintenanceTitle')}
                    >
                      {busyKey === `${p.Name}-maintenance` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wrench className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
