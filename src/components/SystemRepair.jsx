import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Wand2, HardDrive, Wifi, XCircle, Loader2, Wrench } from 'lucide-react'
import Card from './Card'
import {
  runSfcScan,
  runDismRestoreHealth,
  runChkdskScan,
  flushDns,
  resetWinsock,
  startAllRepairs,
  getRepairStatus,
  isAdmin,
} from '../lib/localAgent'
import { useLanguage } from '../lib/i18n'

const ACTIONS = [
  { key: 'sfc', icon: Wrench, run: runSfcScan },
  { key: 'dism', icon: Wand2, run: runDismRestoreHealth },
  { key: 'chkdsk', icon: HardDrive, run: runChkdskScan },
  { key: 'flushDns', icon: Wifi, run: flushDns },
  { key: 'resetWinsock', icon: Wifi, run: resetWinsock },
]

const STEP_ICON = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />,
  error: <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />,
  pending: <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-400" />,
}

export default function SystemRepair({ onNotify }) {
  const { t } = useLanguage()
  const [busyKey, setBusyKey] = useState(null)
  const [job, setJob] = useState(null)
  const [elevated, setElevated] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    isAdmin()
      .then((data) => setElevated(data.result))
      .catch(() => setElevated(null))
  }, [])

  useEffect(() => () => clearInterval(pollRef.current), [])

  const handleRun = async (action) => {
    setBusyKey(action.key)
    try {
      await action.run()
      onNotify(t('systemRepair.completedNotify', { label: t(`systemRepair.actions.${action.key}`) }))
    } catch (err) {
      onNotify(err.message)
    } finally {
      setBusyKey(null)
    }
  }

  const handleRunAll = async () => {
    setJob({ status: 'running', steps: [] })
    try {
      const jobId = await startAllRepairs()
      pollRef.current = setInterval(async () => {
        try {
          const status = await getRepairStatus(jobId)
          setJob(status)
          if (status.status !== 'running') {
            clearInterval(pollRef.current)
            onNotify(status.status === 'done' ? t('systemRepair.allCompletedNotify') : status.error)
          }
        } catch (err) {
          clearInterval(pollRef.current)
          setJob(null)
          onNotify(err.message)
        }
      }, 2000)
    } catch (err) {
      setJob(null)
      onNotify(err.message)
    }
  }

  return (
    <Card icon={Wrench} title={t('systemRepair.title')} description={t('systemRepair.description')}>
      {elevated === false && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {t('systemRepair.notElevated')}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ACTIONS.map((action) => (
          <button
            key={action.key}
            onClick={() => handleRun(action)}
            disabled={busyKey === action.key || job?.status === 'running'}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-200/60 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
          >
            {busyKey === action.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <action.icon className="h-4 w-4" />}
            {t(`systemRepair.actions.${action.key}`)}
          </button>
        ))}
      </div>

      <button
        onClick={handleRunAll}
        disabled={job?.status === 'running' || busyKey !== null}
        className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
      >
        {job?.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        {job?.status === 'running' ? t('systemRepair.running') : t('systemRepair.runAll')}
      </button>

      {job && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
          {job.steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2 text-sm">
              {STEP_ICON[step.status] || STEP_ICON.pending}
              <span className="text-slate-700 dark:text-slate-300">{step.label}</span>
              {step.status === 'error' && <span className="text-xs text-red-500 dark:text-red-400">{step.error}</span>}
            </div>
          ))}
          {job.status === 'error' && <p className="text-sm text-red-500 dark:text-red-400">{job.error}</p>}
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-500">{t('systemRepair.note')}</p>
    </Card>
  )
}
