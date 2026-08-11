import BrowserCleaner from './BrowserCleaner'
import DomainCleaner from './DomainCleaner'
import BrowserBackup from './BrowserBackup'
import WindowsTools from './WindowsTools'
import PrinterTools from './PrinterTools'
import LocalAgentStatus from './LocalAgentStatus'
import NetworkStatus from './NetworkStatus'
import SystemInfo from './SystemInfo'
import QuickFolders from './QuickFolders'
import SystemRepair from './SystemRepair'
import SettingsPanel from './SettingsPanel'
import { useLanguage } from '../lib/i18n'

export default function Dashboard({ onNotify }) {
  const { t } = useLanguage()

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.title')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.subtitle')}</p>
      </div>

      <LocalAgentStatus onNotify={onNotify} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <div className="lg:col-span-2 xl:col-span-3">
          <SettingsPanel />
        </div>
        <div className="lg:col-span-2 xl:col-span-3">
          <BrowserCleaner onNotify={onNotify} />
        </div>
        <div className="lg:col-span-2 xl:col-span-3">
          <DomainCleaner onNotify={onNotify} />
        </div>
        <div className="lg:col-span-2 xl:col-span-3">
          <BrowserBackup onNotify={onNotify} />
        </div>
        <WindowsTools onNotify={onNotify} />
        <PrinterTools onNotify={onNotify} />
        <NetworkStatus onNotify={onNotify} />
        <SystemInfo onNotify={onNotify} />
        <QuickFolders onNotify={onNotify} />
        <div className="lg:col-span-2 xl:col-span-3">
          <SystemRepair onNotify={onNotify} />
        </div>
      </div>
    </main>
  )
}
