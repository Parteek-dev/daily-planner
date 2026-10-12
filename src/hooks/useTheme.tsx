/**
 * useTheme / ThemeProvider — React Native adaptation of the web ThemeContext.
 *
 * Replaces:
 *   - localStorage.getItem/setItem  → AsyncStorage
 *   - window.matchMedia(...)        → Appearance.getColorScheme() + Appearance.addChangeListener
 *   - document.documentElement.*   → tokens object updated synchronously in setState
 *
 * Exposed API (identical shape to frontend/src/hooks/useTheme.jsx):
 *   { theme, themeMode, setThemeMode, toggleTheme, accentColor, setAccentColor, tokens }
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  createElement,
  type ReactNode,
} from 'react'
import { Appearance, Platform, type ColorSchemeName } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  DARK_TOKENS,
  LIGHT_TOKENS,
  createAccentGlow,
  createAccentMuted,
  type Tokens,
} from '@/src/theme/tokens'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ThemeMode = 'dark' | 'light' | 'auto'
export type Theme = 'dark' | 'light'

export interface ThemeContextValue {
  /** Resolved theme applied to the UI */
  theme: Theme
  /** User-selected mode (may be 'auto') */
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  /** Cycle: dark → light → auto → dark */
  toggleTheme: () => void
  /** Current accent colour hex string */
  accentColor: string
  setAccentColor: (color: string) => void
  /** Live token map — use with StyleSheet.create() */
  tokens: Tokens
}

// ── Accent presets (exported for settings screen) ────────────────────────────

export const ACCENT_COLORS = [
  { name: 'Purple', value: '#8B5CF6' },   // Default
  { name: 'Violet', value: '#7C3AED' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Green', value: '#10B981' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveTheme(mode: ThemeMode, systemScheme: ColorSchemeName): Theme {
  if (mode === 'auto') {
    return systemScheme === 'dark' ? 'dark' : 'light'
  }
  return mode
}

/**
 * Build the full token set with accent-derived values.
 */
function buildTokens(resolvedTheme: Theme, accent: string): Tokens {
  const base = resolvedTheme === 'dark' ? { ...DARK_TOKENS } : { ...LIGHT_TOKENS }

  // Deep clone nested objects to avoid mutating the base
  const tokens: Tokens = {
    ...base,
    spacing: { ...base.spacing },
    radius: { ...base.radius },
    elevation: {
      none: { ...base.elevation.none },
      xs: { ...base.elevation.xs },
      sm: { ...base.elevation.sm },
      md: { ...base.elevation.md },
      lg: { ...base.elevation.lg },
      glow: { ...base.elevation.glow },
    },
    gradient: {
      hero: { ...base.gradient.hero, colors: [...base.gradient.hero.colors] },
      accent: { ...base.gradient.accent, colors: [...base.gradient.accent.colors] },
      surface: { ...base.gradient.surface, colors: [...base.gradient.surface.colors] },
      glass: { ...base.gradient.glass, colors: [...base.gradient.glass.colors] },
      warm: { ...base.gradient.warm, colors: [...base.gradient.warm.colors] },
      cool: { ...base.gradient.cool, colors: [...base.gradient.cool.colors] },
    },
    typography: {
      display: { ...base.typography.display },
      title: { ...base.typography.title },
      heading: { ...base.typography.heading },
      subheading: { ...base.typography.subheading },
      body: { ...base.typography.body },
      caption: { ...base.typography.caption },
      label: { ...base.typography.label },
    },
    glass: { ...base.glass },
    glow: { ...base.glow },
    status: { ...base.status },
  }

  // Apply accent color overrides
  tokens.accentPurple = accent
  tokens.accentPrimary = accent
  tokens.accentPrimaryMuted = createAccentMuted(accent, 0.15)
  tokens.accentPrimaryLight = createAccentMuted(accent, 0.08)

  // Update glow.accent based on custom accent
  const glowOpacity = resolvedTheme === 'dark' ? 0.35 : 0.3
  tokens.glow.accent = createAccentGlow(accent, glowOpacity)

  // Update elevation.glow shadow color
  tokens.elevation.glow = {
    ...tokens.elevation.glow,
    shadowColor: accent,
    boxShadow: `0 0 ${resolvedTheme === 'dark' ? '24px' : '20px'} ${createAccentGlow(accent, resolvedTheme === 'dark' ? 0.35 : 0.3)}`,
  }

  // Update gradient.accent colors
  const darkerAccent = adjustColorBrightness(accent, -20)
  tokens.gradient.accent = {
    colors: [accent, darkerAccent],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  }

  // Update glass border to match accent
  tokens.glass.border = createAccentGlow(accent, 0.1)

  return tokens
}

/**
 * Adjust hex color brightness
 */
function adjustColorBrightness(hex: string, amount: number): string {
  const cleanHex = hex.replace('#', '')
  const r = Math.max(0, Math.min(255, parseInt(cleanHex.substring(0, 2), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(cleanHex.substring(2, 4), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(cleanHex.substring(4, 6), 16) + amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

// ── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  // Defaults — themeMode: 'light', accentColor: '#8B5CF6' (purple)
  const [themeModeRaw, setThemeModeRaw] = useState<ThemeMode>('light')
  const [accentColorRaw, setAccentColorRaw] = useState<string>('#8B5CF6')
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme(),
  )

  // Hydrate persisted preferences from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.multiGet(['ip_theme', 'ip_accent_color'])
      .then((pairs) => {
        const storedTheme = pairs[0][1]
        const storedAccent = pairs[1][1]
        if (storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'auto') {
          setThemeModeRaw(storedTheme)
        }
        if (storedAccent) {
          setAccentColorRaw(storedAccent)
        }
      })
      .catch(() => {
        // Storage error — keep defaults
      })
  }, [])

  // Subscribe to OS colour scheme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme)
    })
    return () => subscription.remove()
  }, [])

  // Derived values — computed synchronously each render
  const theme: Theme = resolveTheme(themeModeRaw, systemScheme)
  const tokens: Tokens = buildTokens(theme, accentColorRaw)

  // ── Public API ──────────────────────────────────────────────────────────────

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeRaw(mode)
    AsyncStorage.setItem('ip_theme', mode).catch((err) => {
      console.warn('useTheme: failed to persist theme mode', err)
    })
  }, [])

  const toggleTheme = useCallback(() => {
    let next: ThemeMode
    if (themeModeRaw === 'dark') next = 'light'
    else if (themeModeRaw === 'light') next = 'auto'
    else next = 'dark'
    setThemeMode(next)
  }, [themeModeRaw, setThemeMode])

  const setAccentColor = useCallback((color: string) => {
    setAccentColorRaw(color)
    AsyncStorage.setItem('ip_accent_color', color).catch((err) => {
      console.warn('useTheme: failed to persist accent color', err)
    })
  }, [])

  const value: ThemeContextValue = {
    theme,
    themeMode: themeModeRaw,
    setThemeMode,
    toggleTheme,
    accentColor: accentColorRaw,
    setAccentColor,
    tokens,
  }

  return createElement(ThemeContext.Provider, { value }, children)
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
