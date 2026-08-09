import { useEffect, useState } from 'react'
import {
  Cpu,
  HardDriveDownload,
  MonitorCog,
  Server,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Terminal,
} from 'lucide-react'
import Card from './Card'
import {
  openControlPanel,
  openWindowsSettings,
  openTaskManager,
  openCmdAsAdmin,
  openPowerShell,
  openServices,
  openDeviceManager,
} from '../lib/localAgent'
import { useLanguage } from '../lib/i18n'

const ACTIONS = [
  { key: 'controlPanel', icon: SlidersHorizontal, run: openControlPanel },
  { key: 'settings', icon: Settings, run: openWindowsSettings },
  { key: 'taskManager', icon: Cpu, run: openTaskManager },
  { key: 'cmdAdmin', icon: ShieldAlert, run: openCmdAsAdmin },
  { key: 'powershell', icon: Terminal, run: openPowerShell },
  { key: 'services', icon: Server, run: openServices },
  { key: 'deviceManager', icon: HardDriveDownload, run: openDeviceManager },
]

export default function WindowsTools({ onNotify }) {
  const { t, language } = useLanguage()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const formatNow = (date) =>
    new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: language === 'en',
    }).format(date)

  const handleAction = async (action) => {
    const label = t(`windowsTools.actions.${action.key}`)
    try {
      await action.run()
      onNotify(t('windowsTools.openedNotify', { label }))
    } catch (err) {
      onNotify(err.message)
    }
  }

  return (
    <Card icon={MonitorCog} title={t('windowsTools.title')} description={t('windowsTools.description')}>
      <div className="rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
        <p className="text-xs uppercase tracking-wide text-slate-500">{t('windowsTools.currentDateTime')}</p>
        <p className="mt-1 font-mono text-sm text-slate-800 dark:text-slate-200">{formatNow(now)}</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ACTIONS.map((action) => (
          <button
            key={action.key}
            onClick={() => handleAction(action)}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 active:bg-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
          >
            <action.icon className="h-4 w-4" />
            {t(`windowsTools.actions.${action.key}`)}
          </button>
        ))}
      </div>
    </Card>
  )
}
