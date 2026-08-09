import { useLanguage } from '../lib/i18n'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-slate-200 bg-slate-50/60 py-6 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-center text-xs text-slate-500">{t('footer.text')}</p>
    </footer>
  )
}
