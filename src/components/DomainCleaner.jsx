import { useState } from 'react'
import { Globe, Eraser } from 'lucide-react'
import Card from './Card'
import { clearDomainData } from '../lib/localAgent'

export default function DomainCleaner({ onNotify }) {
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
          ? `${cleanDomain}: datos borrados en ${browsersTouched.map((r) => r.browserId).join(', ')}.`
          : `${cleanDomain}: no se encontraron datos en ningún navegador.`
      )
      setDomain('')
    } catch (err) {
      onNotify(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Card
      icon={Globe}
      title="Borrar Datos de un Dominio"
      description="Escribe un dominio (o pega la URL) y se borran solo sus cookies, historial, permisos y datos guardados — en todos los navegadores, sin tocar el resto."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="https://metabet.tv/es/ o metabet.tv"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={processing || !domain.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Eraser className="h-4 w-4" />
          {processing ? 'Borrando...' : 'Borrar dominio'}
        </button>
      </form>
    </Card>
  )
}
