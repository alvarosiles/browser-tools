import { useEffect, useRef, useState } from 'react'
import {
  History,
  Star,
  Upload,
  FolderOpen,
  Loader2,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Globe2,
  Compass,
  Flame,
  Shield,
  Circle,
  Atom,
  Palette,
  PawPrint,
  Sparkles,
  Eraser,
  AlertTriangle,
} from 'lucide-react'
import Card from './Card'
import {
  getInstalledBrowsers,
  openBackupFolder,
  clearDomainData,
  startClearBrowsersData,
  getClearBrowsersDataStatus,
  startResetBrowserProfiles,
  getResetBrowserProfilesStatus,
  startBackupSelected,
  getBackupSelectedStatus,
} from '../lib/localAgent'
import { useLanguage } from '../lib/i18n'

const BROWSERS = [
  { id: 'chrome', name: 'Google Chrome', icon: Globe, color: 'text-red-400' },
  { id: 'edge', name: 'Microsoft Edge', icon: Compass, color: 'text-sky-400' },
  { id: 'firefox', name: 'Mozilla Firefox', icon: Flame, color: 'text-orange-400' },
  { id: 'brave', name: 'Brave', icon: Shield, color: 'text-orange-500' },
  { id: 'opera', name: 'Opera', icon: Circle, color: 'text-red-500' },
  { id: 'epiphany', name: 'GNOME Web', icon: Globe2, color: 'text-purple-400' },
  { id: 'chromium', name: 'Chromium', icon: Atom, color: 'text-blue-400' },
  { id: 'vivaldi', name: 'Vivaldi', icon: Palette, color: 'text-rose-400' },
  { id: 'librewolf', name: 'LibreWolf', icon: PawPrint, color: 'text-emerald-400' },
  { id: 'zen', name: 'Zen Browser', icon: Sparkles, color: 'text-violet-400' },
]

const DATA_TYPE_KEYS = ['cookies', 'cache', 'localStorage', 'sessionStorage', 'indexedDB', 'serviceWorkers', 'history']

// Tipos adicionales, ocultos tras "Detallado". Todos tienen una ruta real de
// perfil que el servicio local sabe borrar (ver local-agent/commands.js).
const ADVANCED_DATA_TYPES = ['permissions', 'push', 'webSQL', 'webAppManifest', 'cacheStorage', 'autofillForms']

const DELETE_TYPES = [...DATA_TYPE_KEYS, ...ADVANCED_DATA_TYPES]
const BACKUP_TYPES = ['profile', 'bookmarks', 'passwords']

function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

const emptyGroup = (keys) => Object.fromEntries(keys.map((k) => [k, false]))
const emptySelection = () =>
  Object.fromEntries(BROWSERS.map((b) => [b.id, { del: emptyGroup(DELETE_TYPES), backup: emptyGroup(BACKUP_TYPES) }]))

export default function BrowserManager({ onNotify }) {
  const { t } = useLanguage()
  const [installed, setInstalled] = useState({})
  const [selection, setSelection] = useState(emptySelection)
  const [processing, setProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState(null) // 'delete' | 'reset' | 'backup' | null
  const [showDeleteDetailed, setShowDeleteDetailed] = useState(false)
  const [showBackupDetailed, setShowBackupDetailed] = useState(false)
  const [backupResults, setBackupResults] = useState(null)
  const [domain, setDomain] = useState('https://metabet.tv/')
  const [processingDomain, setProcessingDomain] = useState(false)
  const [resetSelection, setResetSelection] = useState(() => Object.fromEntries(BROWSERS.map((b) => [b.id, false])))
  const deletePollRef = useRef(null)
  const resetPollRef = useRef(null)
  const backupPollRef = useRef(null)

  useEffect(() => {
    getInstalledBrowsers()
      .then((data) => setInstalled(data.result))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return
      setShowDeleteDetailed(false)
      setShowBackupDetailed(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => () => {
    clearInterval(deletePollRef.current)
    clearInterval(resetPollRef.current)
    clearInterval(backupPollRef.current)
  }, [])

  const isRowFullyChecked = (browserId, group, keys) => keys.every((k) => selection[browserId][group][k])

  const toggle = (browserId, group, key) => {
    setSelection((prev) => ({
      ...prev,
      [browserId]: { ...prev[browserId], [group]: { ...prev[browserId][group], [key]: !prev[browserId][group][key] } },
    }))
  }

  const toggleAllForBrowser = (browserId, group, keys) => {
    const allChecked = isRowFullyChecked(browserId, group, keys)
    setSelection((prev) => ({
      ...prev,
      [browserId]: { ...prev[browserId], [group]: Object.fromEntries(keys.map((k) => [k, !allChecked])) },
    }))
  }

  const toggleRowBothGroups = (browserId) => {
    const allChecked =
      isRowFullyChecked(browserId, 'del', DELETE_TYPES) &&
      isRowFullyChecked(browserId, 'backup', BACKUP_TYPES) &&
      resetSelection[browserId]
    setSelection((prev) => ({
      ...prev,
      [browserId]: {
        del: Object.fromEntries(DELETE_TYPES.map((k) => [k, !allChecked])),
        backup: Object.fromEntries(BACKUP_TYPES.map((k) => [k, !allChecked])),
      },
    }))
    setResetSelection((prev) => ({ ...prev, [browserId]: !allChecked }))
  }

  const selectedDeleteCount = Object.values(selection).filter((row) => Object.values(row.del).some(Boolean)).length
  const selectedBackupCount = Object.values(selection).filter((row) => Object.values(row.backup).some(Boolean)).length

  const isResetColumnFullyChecked = () => BROWSERS.every((b) => resetSelection[b.id])

  const toggleAllReset = () => {
    const allChecked = isResetColumnFullyChecked()
    setResetSelection(Object.fromEntries(BROWSERS.map((b) => [b.id, !allChecked])))
  }

  const isColumnFullyChecked = (group, keys) => BROWSERS.every((b) => isRowFullyChecked(b.id, group, keys))

  const toggleAllRows = (group, keys) => {
    const allChecked = isColumnFullyChecked(group, keys)
    setSelection((prev) => {
      const next = { ...prev }
      for (const b of BROWSERS) {
        next[b.id] = { ...next[b.id], [group]: Object.fromEntries(keys.map((k) => [k, !allChecked])) }
      }
      return next
    })
  }

  // Cada job corre en el servidor (ver local-agent/server.js): si el navegador que
  // cerramos es el mismo que aloja este panel, la pestaña muere a mitad de la cola si
  // esto se hiciera con un for/await puramente en el cliente — el servidor sigue
  // procesando el resto independientemente de que el cliente que lo pidió siga vivo o no.
  // pollUntilDone solo espera a que ESE job puntual termine antes de resolver.
  const pollUntilDone = (getStatus, pollRef) =>
    new Promise((resolve, reject) => {
      pollRef.current = setInterval(async () => {
        try {
          const status = await getStatus()
          if (status.status !== 'running') {
            clearInterval(pollRef.current)
            resolve(status)
          }
        } catch (err) {
          clearInterval(pollRef.current)
          reject(err)
        }
      }, 1500)
    })

  const runDelete = async () => {
    const items = BROWSERS.map((browser) => ({
      browserId: browser.id,
      types: DELETE_TYPES.filter((key) => selection[browser.id].del[key]),
    })).filter((item) => item.types.length > 0)
    if (items.length === 0) return

    setSelection((prev) => {
      const next = { ...prev }
      for (const b of BROWSERS) next[b.id] = { ...next[b.id], del: emptyGroup(DELETE_TYPES) }
      return next
    })

    const jobId = await startClearBrowsersData(items)
    const status = await pollUntilDone(() => getClearBrowsersDataStatus(jobId), deletePollRef)
    for (const step of status.steps) {
      if (step.status === 'success') onNotify(t('browserCleaner.clearedNotify', { name: step.label }))
      else if (step.status === 'error') onNotify(`${step.label}: ${step.error}`)
    }
    if (status.status === 'error') onNotify(status.error)
  }

  const stepLabel = (browserName, kind) =>
    `${browserName}: ${t(kind === 'profile' ? 'browserBackup.backupProfile' : kind === 'bookmarks' ? 'browserBackup.backupBookmarks' : 'browserBackup.exportPasswords')}`

  const runBackup = async () => {
    const items = BROWSERS.map((browser) => ({ browserId: browser.id, ...selection[browser.id].backup })).filter(
      (item) => item.profile || item.bookmarks || item.passwords
    )
    if (items.length === 0) return

    setBackupResults(null)
    setSelection((prev) => {
      const next = { ...prev }
      for (const b of BROWSERS) next[b.id] = { ...next[b.id], backup: emptyGroup(BACKUP_TYPES) }
      return next
    })

    const jobId = await startBackupSelected(items)
    const status = await pollUntilDone(() => getBackupSelectedStatus(jobId), backupPollRef)
    const browserNames = Object.fromEntries(BROWSERS.map((b) => [b.id, b.name]))
    setBackupResults(
      status.steps.map((step) => ({
        id: step.id,
        label: stepLabel(browserNames[step.browserId] || step.browserId, step.kind),
        status: step.status,
        sizeBytes: step.sizeBytes,
        error: step.error,
      }))
    )
    if (status.status === 'done') onNotify(t('browserBackup.completed'))
    else if (status.status === 'error') onNotify(status.error)
  }

  const handleSubmitDomain = async (e) => {
    e.preventDefault()
    if (!domain.trim()) return

    setProcessingDomain(true)
    try {
      const { domain: cleanDomain, results } = await clearDomainData(domain)
      const browsersTouched = results.filter(
        (r) => r.cookiesDeleted + r.historyDeleted + r.foldersDeleted + (r.permissionsPatched || 0) > 0
      )
      onNotify(
        browsersTouched.length > 0
          ? t('domainCleaner.touchedNotify', {
              domain: cleanDomain,
              browsers: browsersTouched.map((r) => r.browserId).join(', '),
            })
          : t('domainCleaner.notFoundNotify', { domain: cleanDomain })
      )
      setDomain('https://metabet.tv/')
    } catch (err) {
      onNotify(err.message)
    } finally {
      setProcessingDomain(false)
    }
  }

  const selectedResetCount = Object.values(resetSelection).filter(Boolean).length

  const toggleReset = (browserId) => {
    setResetSelection((prev) => ({ ...prev, [browserId]: !prev[browserId] }))
  }

  const runReset = async () => {
    const targets = BROWSERS.filter((b) => resetSelection[b.id])
    if (targets.length === 0) return
    if (
      !window.confirm(
        `Esto borra POR COMPLETO el perfil de ${targets.map((b) => b.name).join(', ')}: extensiones, marcadores, contraseñas guardadas, tema, todo. No hay forma de deshacerlo. ¿Confirmás?`
      )
    ) {
      return
    }

    setResetSelection(Object.fromEntries(BROWSERS.map((b) => [b.id, false])))

    const jobId = await startResetBrowserProfiles(targets.map((b) => b.id))
    const status = await pollUntilDone(() => getResetBrowserProfilesStatus(jobId), resetPollRef)
    for (const step of status.steps) {
      if (step.status === 'success') onNotify(t('browserReset.doneNotify', { name: step.label }))
      else if (step.status === 'error') onNotify(`${step.label}: ${step.error}`)
    }
    if (status.status === 'error') onNotify(status.error)
  }

  const handleOpenFolder = async () => {
    try {
      await openBackupFolder()
      onNotify(t('browserBackup.folderOpenedNotify'))
    } catch (err) {
      onNotify(err.message)
    }
  }

  // Orden fijo: primero se borra data, después el reset completo de perfil, y
  // por último el respaldo — cada paso solo corre si esa columna tenía algo tildado.
  const handleProcessAll = async () => {
    if (selectedDeleteCount === 0 && selectedResetCount === 0 && selectedBackupCount === 0) return

    setProcessing(true)
    try {
      if (selectedDeleteCount > 0) {
        setProcessingStage('delete')
        await runDelete()
      }
      if (selectedResetCount > 0) {
        setProcessingStage('reset')
        await runReset()
      }
      if (selectedBackupCount > 0) {
        setProcessingStage('backup')
        await runBackup()
      }
    } catch (err) {
      onNotify(err.message)
    } finally {
      setProcessing(false)
      setProcessingStage(null)
    }
  }

  return (
    <Card icon={History} title={t('browserManager.title')} description={t('browserManager.description')}>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/50">
              <th rowSpan={2} className="whitespace-nowrap px-4 py-2.5 align-bottom font-medium">
                {t('browserCleaner.browser')}
              </th>
              <th
                className="whitespace-nowrap border-l border-red-200 px-3 py-1.5 text-center font-semibold text-red-700 dark:border-red-900/40 dark:text-red-400"
                title={t('browserReset.description')}
              >
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('browserReset.title')}
                </span>
              </th>
              <th colSpan={showDeleteDetailed ? DELETE_TYPES.length : 1} className="whitespace-nowrap border-l border-slate-200 px-3 py-1.5 text-center font-semibold dark:border-slate-800">
                {t('browserCleaner.title')}
              </th>
              <th colSpan={showBackupDetailed ? BACKUP_TYPES.length : 1} className="whitespace-nowrap border-l border-slate-200 px-3 py-1.5 text-center font-semibold dark:border-slate-800">
                {t('browserBackup.title')}
              </th>
            </tr>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/50">
              <th className="whitespace-nowrap border-l border-red-200 px-3 py-2 text-center font-medium dark:border-red-900/40">
                <input
                  type="checkbox"
                  checked={isResetColumnFullyChecked()}
                  onChange={toggleAllReset}
                  disabled={processing}
                  title={t('browserCleaner.toggleAllTitle', { name: t('browserReset.title') })}
                  className="h-4 w-4 cursor-pointer accent-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                />
              </th>
              {showDeleteDetailed ? (
                DELETE_TYPES.map((key, i) => (
                  <th key={key} className={`whitespace-nowrap px-3 py-2 text-center font-medium ${i === 0 ? 'border-l border-slate-200 dark:border-slate-800' : ''}`}>
                    {i === 0 && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteDetailed(false)}
                        disabled={processing}
                        title={t('browserCleaner.detailed')}
                        className="mr-1 inline-flex align-middle text-slate-400 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-red-400"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                    )}
                    {t(`browserCleaner.dataTypes.${key}`)}
                  </th>
                ))
              ) : (
                <th className="whitespace-nowrap border-l border-slate-200 px-3 py-2 text-center font-medium dark:border-slate-800">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleAllRows('del', DELETE_TYPES)}
                      disabled={processing}
                      title={t('browserCleaner.toggleAllTitle', { name: t('browserCleaner.title') })}
                      className="uppercase tracking-wide text-slate-500 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:text-red-400"
                    >
                      {t('browserCleaner.deleteDataColumn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteDetailed(true)}
                      disabled={processing}
                      title={t('browserCleaner.detailed')}
                      className="flex items-center gap-0.5 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-normal normal-case text-slate-500 transition-colors hover:border-red-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-500 dark:hover:text-red-400"
                    >
                      <ChevronDown className="h-3 w-3" />
                      {t('browserCleaner.detailed')}
                    </button>
                  </div>
                </th>
              )}
              {showBackupDetailed ? (
                BACKUP_TYPES.map((key, i) => (
                  <th key={key} className={`whitespace-nowrap px-3 py-2 text-center font-medium ${i === 0 ? 'border-l border-slate-200 dark:border-slate-800' : ''}`}>
                    {i === 0 && (
                      <button
                        type="button"
                        onClick={() => setShowBackupDetailed(false)}
                        disabled={processing}
                        title={t('browserCleaner.detailed')}
                        className="mr-1 inline-flex align-middle text-slate-400 transition-colors hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-blue-400"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                    )}
                    {t(`browserBackup.${key === 'profile' ? 'backupProfile' : key === 'bookmarks' ? 'backupBookmarks' : 'exportPasswords'}`)}
                  </th>
                ))
              ) : (
                <th className="whitespace-nowrap border-l border-slate-200 px-3 py-2 text-center font-medium dark:border-slate-800">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleAllRows('backup', BACKUP_TYPES)}
                      disabled={processing}
                      title={t('browserCleaner.toggleAllTitle', { name: t('browserBackup.title') })}
                      className="uppercase tracking-wide text-slate-500 transition-colors hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:text-blue-400"
                    >
                      {t('browserBackup.backupData')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBackupDetailed(true)}
                      disabled={processing}
                      title={t('browserCleaner.detailed')}
                      className="flex items-center gap-0.5 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-normal normal-case text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                    >
                      <ChevronDown className="h-3 w-3" />
                      {t('browserCleaner.detailed')}
                    </button>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {BROWSERS.map((browser) => {
              const isInstalled = installed[browser.id]
              return (
                <tr key={browser.id} className="border-b border-slate-200/60 last:border-0 dark:border-slate-800/60">
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleRowBothGroups(browser.id)}
                      disabled={processing}
                      title={t('browserCleaner.toggleAllTitle', { name: browser.name })}
                      className="flex items-center gap-2.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span
                        className={`h-2 w-2 flex-shrink-0 rounded-full ${
                          isInstalled ? 'bg-emerald-400' : 'bg-slate-400 dark:bg-slate-600'
                        }`}
                        title={isInstalled ? undefined : t('browserBackup.notInstalled')}
                      />
                      <browser.icon className={`h-4 w-4 flex-shrink-0 ${browser.color}`} />
                      <span className="font-medium text-slate-800 hover:underline dark:text-slate-200">{browser.name}</span>
                    </button>
                  </td>

                  {/* Reset completo */}
                  <td className="border-l border-red-200 px-3 py-2.5 text-center dark:border-red-900/40">
                    <input
                      type="checkbox"
                      checked={resetSelection[browser.id]}
                      onChange={() => toggleReset(browser.id)}
                      disabled={processing}
                      className="h-4 w-4 cursor-pointer accent-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                    />
                  </td>

                  {/* Borrar */}
                  {showDeleteDetailed ? (
                    DELETE_TYPES.map((key, i) => (
                      <td key={key} className={`px-3 py-2.5 text-center ${i === 0 ? 'border-l border-slate-200 dark:border-slate-800' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selection[browser.id].del[key]}
                          onChange={() => toggle(browser.id, 'del', key)}
                          disabled={processing}
                          className="h-4 w-4 cursor-pointer accent-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                        />
                      </td>
                    ))
                  ) : (
                    <td className="border-l border-slate-200 px-3 py-2.5 text-center dark:border-slate-800">
                      <input
                        type="checkbox"
                        checked={isRowFullyChecked(browser.id, 'del', DELETE_TYPES)}
                        onChange={() => toggleAllForBrowser(browser.id, 'del', DELETE_TYPES)}
                        disabled={processing}
                        title={t('browserCleaner.toggleAllTitle', { name: browser.name })}
                        className="h-4 w-4 cursor-pointer accent-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                      />
                    </td>
                  )}

                  {/* Respaldar */}
                  {showBackupDetailed ? (
                    BACKUP_TYPES.map((key, i) => (
                      <td key={key} className={`px-3 py-2.5 text-center ${i === 0 ? 'border-l border-slate-200 dark:border-slate-800' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selection[browser.id].backup[key]}
                          onChange={() => toggle(browser.id, 'backup', key)}
                          disabled={processing}
                          className="h-4 w-4 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                        />
                      </td>
                    ))
                  ) : (
                    <td className="border-l border-slate-200 px-3 py-2.5 text-center dark:border-slate-800">
                      <input
                        type="checkbox"
                        checked={isRowFullyChecked(browser.id, 'backup', BACKUP_TYPES)}
                        onChange={() => toggleAllForBrowser(browser.id, 'backup', BACKUP_TYPES)}
                        disabled={processing}
                        title={t('browserCleaner.toggleAllTitle', { name: browser.name })}
                        className="h-4 w-4 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                      />
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleProcessAll}
          disabled={(selectedDeleteCount === 0 && selectedResetCount === 0 && selectedBackupCount === 0) || processing}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          {processing
            ? {
                delete: t('browserCleaner.processing'),
                reset: t('browserReset.processing'),
                backup: t('browserBackup.creating'),
              }[processingStage]
            : `${t('browserCleaner.process')}${
                selectedDeleteCount + selectedResetCount + selectedBackupCount
                  ? ` (${selectedDeleteCount + selectedResetCount + selectedBackupCount})`
                  : ''
              }`}
        </button>
      </div>

      {backupResults && (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex flex-col gap-1.5">
            {backupResults.map((step) => (
              <div key={step.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`h-2 w-2 flex-shrink-0 rounded-full ${
                    step.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                />
                <span className="text-slate-700 dark:text-slate-300">{step.label}</span>
                {step.status === 'success' && step.sizeBytes != null && (
                  <span className="text-xs text-slate-500">({formatBytes(step.sizeBytes)})</span>
                )}
                {step.status === 'error' && (
                  <span className="text-xs text-red-500 dark:text-red-400">{step.error}</span>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleOpenFolder}
            className="mt-1 flex w-fit items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {t('browserBackup.openFolder')}
          </button>
        </div>
      )}

      <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{t('domainCleaner.title')}</h3>
        <p className="mb-2.5 text-xs text-slate-500 dark:text-slate-400">{t('domainCleaner.description')}</p>
        <form onSubmit={handleSubmitDomain} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={t('domainCleaner.placeholder')}
            className="flex-1 rounded-lg border border-slate-300 bg-slate-100/70 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={processingDomain || !domain.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Eraser className="h-4 w-4" />
            {processingDomain ? t('domainCleaner.submitting') : t('domainCleaner.submit')}
          </button>
        </form>
      </div>
    </Card>
  )
}
