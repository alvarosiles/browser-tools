import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'browser-tools-theme'
const ThemeContext = createContext(null)

function detectDefaultTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  // La app nació con un único look oscuro (ver commit history); ante una preferencia de
  // sistema explícita en claro se respeta, pero por defecto se mantiene el oscuro para no
  // sorprender a quienes ya la usaban antes de que existiera este toggle.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(detectDefaultTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}
