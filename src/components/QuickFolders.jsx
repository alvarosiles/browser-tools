import { useState } from 'react'
import { Download, FolderOpen, FolderCog, Rocket, Loader2, MonitorSmartphone } from 'lucide-react'
import Card from './Card'
import { openQuickFolder, openRemoteApp } from '../lib/localAgent'
import { useLanguage } from '../lib/i18n'

const FOLDERS = [
  { key: 'downloads', icon: Download },
  { key: 'temp', icon: FolderCog },
  { key: 'appdata', icon: FolderOpen },
  { key: 'startup', icon: Rocket },
]

const REMOTE_APPS = [
  { key: 'teamviewer', icon: MonitorSmartphone },
  { key: 'anydesk', icon: MonitorSmartphone },
]

export default function QuickFolders({ onNotify }) {
  const { t } = useLanguage()
  const [busyKey, setBusyKey] = useState(null)

  const handleOpenFolder = async (folder) => {
    const label = t(`quickFolders.folders.${folder.key}`)
    setBusyKey(folder.key)
    try {
      await openQuickFolder(folder.key)
      onNotify(t('quickFolders.folderOpenedNotify', { label }))
    } catch (err) {
      onNotify(err.message)
    } finally {
      setBusyKey(null)
    }
  }

  const handleOpenApp = async (app) => {
    const label = t(`quickFolders.apps.${app.key}`)
    setBusyKey(app.key)
    try {
      await openRemoteApp(app.key)
      onNotify(t('quickFolders.appOpenedNotify', { label }))
    } catch (err) {
      onNotify(err.message)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <Card icon={FolderOpen} title={t('quickFolders.title')} description={t('quickFolders.description')}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FOLDERS.map((folder) => (
          <button
            key={folder.key}
            onClick={() => handleOpenFolder(folder)}
            disabled={busyKey === folder.key}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
          >
            {busyKey === folder.key ? <Loader2 className="h-5 w-5 animate-spin" /> : <folder.icon className="h-5 w-5" />}
            {t(`quickFolders.folders.${folder.key}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {REMOTE_APPS.map((app) => (
          <button
            key={app.key}
            onClick={() => handleOpenApp(app)}
            disabled={busyKey === app.key}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
          >
            {busyKey === app.key ? <Loader2 className="h-5 w-5 animate-spin" /> : <app.icon className="h-5 w-5" />}
            {t(`quickFolders.apps.${app.key}`)}
          </button>
        ))}
      </div>
    </Card>
  )
}
