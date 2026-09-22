import { createContext, useContext, useState, useEffect } from 'react'

const AccessibilityContext = createContext()

// Font size options — multipliers applied via CSS variable --a11y-font-scale
const FONT_SIZES = [
  { id: 'small',  label: 'Small',  scale: '0.9'  },
  { id: 'medium', label: 'Medium', scale: '1'    },
  { id: 'large',  label: 'Large',  scale: '1.15' },
]

export { FONT_SIZES }

export function AccessibilityProvider({ children }) {
  const [reduceMotion, setReduceMotion] = useState(() => {
    const stored = localStorage.getItem('ip_a11y_reduce_motion')
    if (stored !== null) return stored === 'true'
    // Default: respect OS-level preference
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('ip_a11y_font_size') || 'medium'
  })

  // Apply reduce-motion as a data attribute on <html>
  useEffect(() => {
    localStorage.setItem('ip_a11y_reduce_motion', String(reduceMotion))
    document.documentElement.setAttribute('data-reduce-motion', reduceMotion ? 'true' : 'false')
  }, [reduceMotion])

  // Apply font size as a CSS variable + data attribute on <html>
  useEffect(() => {
    localStorage.setItem('ip_a11y_font_size', fontSize)
    const scale = FONT_SIZES.find(f => f.id === fontSize)?.scale ?? '1'
    document.documentElement.style.setProperty('--a11y-font-scale', scale)
    document.documentElement.setAttribute('data-font-size', fontSize)
  }, [fontSize])

  return (
    <AccessibilityContext.Provider value={{ reduceMotion, setReduceMotion, fontSize, setFontSize }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider')
  return ctx
}
