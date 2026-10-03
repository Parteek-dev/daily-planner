import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

// Accent color presets
export const ACCENT_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Indigo', value: '#6366f1' },
]

// themeMode: 'dark' | 'light' | 'auto'
// theme: the resolved value ('dark' | 'light') used to set data-theme

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    const stored = localStorage.getItem('ip_theme')
    if (stored) return stored
    // Default by time of day for first-time visitors: light 6am–6pm, dark otherwise
    const h = new Date().getHours()
    return (h >= 6 && h < 18) ? 'light' : 'dark'
  })

  const [accentColor, setAccentColor] = useState(() => {
    const stored = localStorage.getItem('ip_accent_color')
    return stored || '#3b82f6'
  })

  // Resolve actual theme from mode + system preference
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setSystemPrefersDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const resolvedTheme = themeMode === 'auto'
    ? (systemPrefersDark ? 'dark' : 'light')
    : themeMode

  useEffect(() => {
    localStorage.setItem('ip_theme', themeMode)
    document.documentElement.setAttribute('data-theme', resolvedTheme)
  }, [themeMode, resolvedTheme])

  useEffect(() => {
    localStorage.setItem('ip_accent_color', accentColor)
    document.documentElement.style.setProperty('--accent-blue', accentColor)
    document.documentElement.style.setProperty('--accent-primary', accentColor)
  }, [accentColor])

  // Cycle: dark → light → auto → dark
  const toggleTheme = () => setThemeMode(m => {
    if (m === 'dark') return 'light'
    if (m === 'light') return 'auto'
    return 'dark'
  })

  // Keep legacy `theme` field as the resolved value so existing consumers don't break
  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, themeMode, setThemeMode, toggleTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
