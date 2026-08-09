import { Wrench } from 'lucide-react'
import ServiceToggle from './ServiceToggle'
import { useLanguage } from '../lib/i18n'

export default function Header() {
  const { t } = useLanguage()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-900/20 dark:shadow-blue-900/40">
          <Wrench className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">
            {t('header.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('header.subtitle')}</p>
        </div>
        <ServiceToggle />
      </div>
    </header>
  )
}
