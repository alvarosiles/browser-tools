import { useEffect, useRef, useState } from 'react'
import {
  Save,
  Star,
  Upload,
  FolderOpen,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
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
} from 'lucide-react'
import Card from './Card'
import {
  getInstalledBrowsers,
  backupBrowserProfile,
  backupBrowserBookmarks,
  openPasswordManager,
  startBackupAll,
  getBackupStatus,
  openBackupFolder,
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

const STEP_ICON = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />,
  error: <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />,
  skipped: <MinusCircle className="h-4 w-4 text-slate-400 dark:text-slate-600" />,
  pending: <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-400" />,
}

export default function BrowserBackup({ onNotify }) {
  const { t } = useLanguage()
  const [installed, setInstalled] = useState({})
  const [job, setJob] = useState(null)
  const [busyAction, setBusyAction] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    getInstalledBrowsers()
      .then((data) => setInstalled(data.result))
      .catch(() => {})
  }, [])

  useEffect(() => () => clearInterval(pollRef.current), [])

  const withBusy = async (key, fn) => {
    setBusyAction(key)
    try {
      await fn()
    } catch (err) {
      onNotify(err.message)
    } finally {
      setBusyAction(null)
    }
  }

  const handleBackupProfile = (browser) =>
    withBusy(`${browser.id}-profile`, async () => {
      const { result } = await backupBrowserProfile(browser.id)
      onNotify(
        t('browserBackup.profileBackedUpNotify', {
          name: browser.name,
          size: formatBytes(result.sizeBytes),
          dest: result.destDir,
        })
      )
    })

  const handleBackupBookmarks = (browser) =>
    withBusy(`${browser.id}-bookmarks`, async () => {
      await backupBrowserBookmarks(browser.id)
      onNotify(t('browserBackup.bookmarksBackedUpNotify', { name: browser.name }))
    })

  const handleExportPasswords = (browser) =>
    withBusy(`${browser.id}-passwords`, async () => {
      const { result } = await openPasswordManager(browser.id)
      onNotify(result.notice)
    })

  const handleBackupAll = async () => {
    setJob({ status: 'running', steps: [], destRoot: null })
    try {
      const jobId = await startBackupAll()
      pollRef.current = setInterval(async () => {
        try {
          const status = await getBackupStatus(jobId)
          setJob(status)
          if (status.status !== 'running') {
            clearInterval(pollRef.current)
            if (status.status === 'done') {
              onNotify(t('browserBackup.backupCompletedNotify', { dest: status.destRoot }))
            } else if (status.status === 'error') {
              onNotify(status.error || t('browserBackup.backupFailedNotify'))
            }
          }
        } catch (err) {
          clearInterval(pollRef.current)
          setJob(null)
          onNotify(err.message)
        }
      }, 1000)
    } catch (err) {
      setJob(null)
      onNotify(err.message)
    }
  }

  const handleOpenFolder = () =>
    withBusy('open-folder', async () => {
      await openBackupFolder()
      onNotify(t('browserBackup.folderOpenedNotify'))
    })

  const installedCount = BROWSERS.filter((b) => installed[b.id]).length
  const totalSize = job?.steps?.reduce((sum, s) => sum + (s.sizeBytes || 0), 0) || 0
  const progressPercent = job?.steps?.length
    ? Math.round((job.steps.length / Math.max(installedCount, 1)) * 100)
    : 0

  return (
    <Card icon={Save} title={t('browserBackup.title')} description={t('browserBackup.description')}>
      <div className="flex flex-col gap-2">
        {BROWSERS.map((browser) => {
          const isInstalled = installed[browser.id]
          return (
            <div
              key={browser.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2 w-2 flex-shrink-0 rounded-full ${
                    isInstalled ? 'bg-emerald-400' : 'bg-slate-400 dark:bg-slate-600'
                  }`}
                  title={isInstalled ? undefined : t('browserBackup.notInstalled')}
                />
                <browser.icon className={`h-5 w-5 ${browser.color}`} />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{browser.name}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBackupProfile(browser)}
                  disabled={busyAction === `${browser.id}-profile`}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {busyAction === `${browser.id}-profile` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {t('browserBackup.backupProfile')}
                </button>
                <button
                  onClick={() => handleBackupBookmarks(browser)}
                  disabled={busyAction === `${browser.id}-bookmarks`}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {busyAction === `${browser.id}-bookmarks` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Star className="h-3.5 w-3.5" />
                  )}
                  {t('browserBackup.backupBookmarks')}
                </button>
                <button
                  onClick={() => handleExportPasswords(browser)}
                  disabled={busyAction === `${browser.id}-passwords`}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {busyAction === `${browser.id}-passwords` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {t('browserBackup.exportPasswords')}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={handleBackupAll}
        disabled={job?.status === 'running'}
        className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
      >
        {job?.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {job?.status === 'running' ? t('browserBackup.creating') : t('browserBackup.backupAll')}
      </button>

      {job && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex flex-col gap-1.5">
            {job.steps.map((step) => (
              <div key={step.browserId} className="flex items-center gap-2 text-sm">
                {STEP_ICON[step.status] || STEP_ICON.pending}
                <span className="text-slate-700 dark:text-slate-300">{step.label || step.browserId}</span>
                {step.status === 'success' && step.sizeBytes != null && (
                  <span className="text-xs text-slate-500">({formatBytes(step.sizeBytes)})</span>
                )}
                {step.status === 'error' && (
                  <span className="text-xs text-red-500 dark:text-red-400">{step.error}</span>
                )}
                {step.status === 'skipped' && (
                  <span className="text-xs text-slate-400 dark:text-slate-600">{t('browserBackup.notInstalled')}</span>
                )}
              </div>
            ))}
          </div>

          {job.status === 'running' && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {job.status === 'done' && (
            <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t('browserBackup.completed')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('browserBackup.location')} <span className="text-slate-700 dark:text-slate-300">{job.destRoot}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('browserBackup.totalSize')} <span className="text-slate-700 dark:text-slate-300">{formatBytes(totalSize)}</span> ·{' '}
                {t('browserBackup.date')}{' '}
                <span className="text-slate-700 dark:text-slate-300">{new Date().toLocaleString()}</span>
              </p>
              <button
                onClick={handleOpenFolder}
                className="mt-1 flex w-fit items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                {t('browserBackup.openFolder')}
              </button>
            </div>
          )}

          {job.status === 'error' && <p className="text-sm text-red-500 dark:text-red-400">{job.error}</p>}
        </div>
      )}
    </Card>
  )
}
