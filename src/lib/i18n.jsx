import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translations } from './translations'

const STORAGE_KEY = 'browser-tools-language'
const LanguageContext = createContext(null)

function detectDefaultLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'es' || stored === 'en') return stored
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es'
}

// Interpola "{var}" dentro del string traducido con los valores pasados en `vars`
// (p. ej. t('windowsTools.openedNotify', { label: 'PowerShell' })).
function interpolate(template, vars) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key) => (vars[key] !== undefined ? vars[key] : match))
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(detectDefaultLanguage)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(() => {
    const dict = translations[language] || translations.es

    const t = (key, vars) => {
      const raw = key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), dict)
      return typeof raw === 'string' ? interpolate(raw, vars) : key
    }

    return { language, setLanguage, t }
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage debe usarse dentro de LanguageProvider')
  return ctx
}
