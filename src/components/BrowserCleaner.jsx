import { useState } from 'react'
import { Globe, Globe2, Compass, Flame, Shield, Circle, History, Loader2, PlayCircle, ChevronDown, ChevronUp } from 'lucide-react'
import Card from './Card'
import { clearBrowserData } from '../lib/localAgent'
import { useLanguage } from '../lib/i18n'

const BROWSERS = [
  { id: 'chrome', name: 'Google Chrome', icon: Globe, color: 'text-red-400' },
  { id: 'edge', name: 'Microsoft Edge', icon: Compass, color: 'text-sky-400' },
  { id: 'firefox', name: 'Mozilla Firefox', icon: Flame, color: 'text-orange-400' },
  { id: 'brave', name: 'Brave', icon: Shield, color: 'text-orange-500' },
  { id: 'opera', name: 'Opera', icon: Circle, color: 'text-red-500' },
  { id: 'epiphany', name: 'GNOME Web', icon: Globe2, color: 'text-purple-400' },
]

const DATA_TYPE_KEYS = ['cookies', 'cache', 'localStorage', 'sessionStorage', 'indexedDB', 'serviceWorkers', 'history']

// Tipos adicionales, ocultos tras "Avanzado". Los soportados tienen una ruta real de
// perfil que el servicio local sabe borrar (ver local-agent/commands.js); los no
// soportados no tienen una carpeta propia y aislada en Chromium/Firefox (o borrarlos
// implicaría tocar un archivo de preferencias compartido), así que se muestran
// deshabilitados en vez de prometer algo que no se puede cumplir de forma segura.
const ADVANCED_DATA_TYPES = [
  { key: 'permissions', supported: true },
  { key: 'push', supported: true },
  { key: 'webSQL', supported: true },
  { key: 'webAppManifest', supported: true },
  { key: 'cacheStorage', supported: true },
  { key: 'autofillForms', supported: true },
  { key: 'webLocks', supported: false },
  { key: 'credentials', supported: false },
  { key: 'dnsCache', supported: false },
  { key: 'webrtc', supported: false },
]

const DATA_TYPES = DATA_TYPE_KEYS.map((key) => ({ key, supported: true }))
const ALL_DATA_TYPES = [...DATA_TYPES, ...ADVANCED_DATA_TYPES]

const emptyRow = () => Object.fromEntries(ALL_DATA_TYPES.map((t) => [t.key, false]))
const emptySelection = () => Object.fromEntries(BROWSERS.map((b) => [b.id, emptyRow()]))

export default function BrowserCleaner({ onNotify }) {
  const { t } = useLanguage()
  const [selection, setSelection] = useState(emptySelection)
  const [processing, setProcessing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const visibleTypes = showAdvanced ? ALL_DATA_TYPES : DATA_TYPES

  const toggle = (browserId, typeKey, supported = true) => {
    if (!supported) return
    setSelection((prev) => ({
      ...prev,
      [browserId]: { ...prev[browserId], [typeKey]: !prev[browserId][typeKey] },
    }))
  }

  const toggleAllForBrowser = (browserId) => {
    const supportedKeys = visibleTypes.filter((t) => t.supported !== false).map((t) => t.key)
    const allChecked = supportedKeys.every((key) => selection[browserId][key])
    setSelection((prev) => ({
      ...prev,
      [browserId]: {
        ...prev[browserId],
        ...Object.fromEntries(supportedKeys.map((key) => [key, !allChecked])),
      },
    }))
  }

  const selectedBrowserCount = Object.values(selection).filter((row) =>
    Object.values(row).some(Boolean)
  ).length

  const handleProcess = async () => {
    setProcessing(true)
    try {
      for (const browser of BROWSERS) {
        const types = ALL_DATA_TYPES.filter((t) => t.supported !== false)
          .map((t) => t.key)
          .filter((key) => selection[browser.id][key])
        if (types.length === 0) continue

        try {
          await clearBrowserData(browser.id, types)
          onNotify(t('browserCleaner.clearedNotify', { name: browser.name }))
        } catch (err) {
          onNotify(`${browser.name}: ${err.message}`)
        }
      }
    } finally {
      setProcessing(false)
      setSelection(emptySelection())
    }
  }

  return (
    <Card icon={History} title={t('browserCleaner.title')} description={t('browserCleaner.description')}>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/50">
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">{t('browserCleaner.browser')}</th>
              {visibleTypes.map((type) => (
                <th
                  key={type.key}
                  title={type.supported === false ? t('browserCleaner.unsupportedTitle') : undefined}
                  className={`whitespace-nowrap px-3 py-2.5 text-center font-medium ${
                    type.supported === false ? 'text-slate-400 dark:text-slate-600' : ''
                  }`}
                >
                  {t(`browserCleaner.dataTypes.${type.key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BROWSERS.map((browser) => (
              <tr key={browser.id} className="border-b border-slate-200/60 last:border-0 dark:border-slate-800/60">
                <td className="whitespace-nowrap px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => toggleAllForBrowser(browser.id)}
                    disabled={processing}
                    title={t('browserCleaner.toggleAllTitle', { name: browser.name })}
                    className="flex items-center gap-2.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <browser.icon className={`h-4 w-4 flex-shrink-0 ${browser.color}`} />
                    <span className="font-medium text-slate-800 hover:underline dark:text-slate-200">{browser.name}</span>
                  </button>
                </td>
                {visibleTypes.map((type) => (
                  <td key={type.key} className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={selection[browser.id][type.key]}
                      onChange={() => toggle(browser.id, type.key, type.supported !== false)}
                      disabled={processing || type.supported === false}
                      title={type.supported === false ? t('browserCleaner.unsupportedTitle') : undefined}
                      className="h-4 w-4 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleProcess}
          disabled={selectedBrowserCount === 0 || processing}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          {processing ? t('browserCleaner.processing') : `${t('browserCleaner.process')}${selectedBrowserCount ? ` (${selectedBrowserCount})` : ''}`}
        </button>

        <button
          onClick={() => setShowAdvanced((v) => !v)}
          disabled={processing}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {t('browserCleaner.advanced')}
        </button>
      </div>
    </Card>
  )
}
