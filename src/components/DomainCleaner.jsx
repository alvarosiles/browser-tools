import { useState } from 'react'
import { Globe, Eraser } from 'lucide-react'
import Card from './Card'
import { clearDomainData } from '../lib/localAgent'
import { useLanguage } from '../lib/i18n'

export default function DomainCleaner({ onNotify }) {
  const { t } = useLanguage()
  const [domain, setDomain] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!domain.trim()) return

    setProcessing(true)
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
      setDomain('')
    } catch (err) {
      onNotify(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Card icon={Globe} title={t('domainCleaner.title')} description={t('domainCleaner.description')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder={t('domainCleaner.placeholder')}
          className="flex-1 rounded-lg border border-slate-300 bg-slate-100/70 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={processing || !domain.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Eraser className="h-4 w-4" />
          {processing ? t('domainCleaner.submitting') : t('domainCleaner.submit')}
        </button>
      </form>
    </Card>
  )
}
