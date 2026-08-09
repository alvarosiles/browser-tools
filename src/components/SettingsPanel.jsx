import { Moon, Sun, Palette } from 'lucide-react'
import Card from './Card'
import { useTheme } from '../lib/theme'
import { useLanguage } from '../lib/i18n'

export default function SettingsPanel() {
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()

  return (
    <Card icon={Palette} title={t('settings.title')} description={t('settings.description')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">{t('settings.themeLabel')}</p>
          <button
            onClick={toggleTheme}
            className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500/50 hover:bg-slate-200 active:bg-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
          >
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {theme === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
          </button>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">{t('settings.languageLabel')}</p>
          <div className="mt-1.5 flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
            {['es', 'en'].map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  language === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {lang === 'es' ? 'Español' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
