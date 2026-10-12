/**
 * Theme tokens — comprehensive design system for the Daily Planner app.
 *
 * Design Language: Clean, minimal productivity-focused aesthetic
 * - Primary accent: Purple/Violet (#8B5CF6)
 * - Clean, card-based UI with generous whitespace
 * - Minimal shadows, focus on color differentiation
 * - Status indicators via soft pastel backgrounds
 *
 * Requirements: 3.5, 3.7, 3.8
 */

import { Platform } from 'react-native'

// ─── Spacing Scale ────────────────────────────────────────────────────────────

export interface SpacingScale {
  xs: number   // 4
  sm: number   // 8
  md: number   // 12
  lg: number   // 16
  xl: number   // 24
  xxl: number  // 32
  xxxl: number // 48
}

// ─── Radius Scale ─────────────────────────────────────────────────────────────

export interface RadiusScale {
  xs: number    // 4
  sm: number    // 8
  md: number    // 12
  lg: number    // 16
  xl: number    // 20
  xxl: number   // 24
  full: number  // 9999 (pill/circle)
}

// ─── Elevation / Shadow System ────────────────────────────────────────────────

export interface ElevationStyle {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowOpacity: number
  shadowRadius: number
  elevation: number // Android
  boxShadow?: string
}

export interface ElevationScale {
  none: ElevationStyle
  xs: ElevationStyle
  sm: ElevationStyle
  md: ElevationStyle
  lg: ElevationStyle
  glow: ElevationStyle
}

// ─── Gradient Definitions ─────────────────────────────────────────────────────

export interface GradientDef {
  colors: string[]
  start?: { x: number; y: number }
  end?: { x: number; y: number }
}

export interface GradientScale {
  hero: GradientDef
  accent: GradientDef
  surface: GradientDef
  glass: GradientDef
  warm: GradientDef
  cool: GradientDef
}

// ─── Typography Scale ─────────────────────────────────────────────────────────

export interface TypographyStyle {
  fontFamily: string
  fontSize: number
  fontWeight: '400' | '500' | '600' | '700'
  lineHeight: number
  letterSpacing?: number
}

export interface TypographyScale {
  display: TypographyStyle  // 32px - Hero numbers, big stats
  title: TypographyStyle    // 24px - Screen titles
  heading: TypographyStyle  // 20px - Section headers
  subheading: TypographyStyle // 17px - Card titles
  body: TypographyStyle     // 15px - Default text
  caption: TypographyStyle  // 13px - Secondary info
  label: TypographyStyle    // 11px - Small labels, badges
}

// ─── Glass Effect Tokens ──────────────────────────────────────────────────────

export interface GlassTokens {
  background: string
  border: string
  blur: number
}

// ─── Glow Effect Tokens ───────────────────────────────────────────────────────

export interface GlowTokens {
  accent: string
  success: string
  warning: string
  error: string
}

// ─── Status Colors ────────────────────────────────────────────────────────────

export interface StatusColors {
  todo: string
  todoBackground: string
  inProgress: string
  inProgressBackground: string
  completed: string
  completedBackground: string
  overdue: string
  overdueBackground: string
}

// ─── Main Tokens Interface ────────────────────────────────────────────────────

export interface Tokens {
  // ── Backgrounds ──
  bgPrimary: string
  bgSecondary: string
  bgTertiary: string
  bgInput: string
  bgElevated: string
  bgAccentSoft: string

  // ── Borders ──
  borderPrimary: string
  borderSecondary: string
  borderFocus: string

  // ── Text ──
  textPrimary: string
  textSecondary: string
  textMuted: string
  textInverse: string

  // ── Accent colours ──
  accentPurple: string
  accentBlue: string
  accentGreen: string
  accentOrange: string
  accentRed: string
  accentYellow: string
  accentPink: string
  accentCyan: string

  // ── Alias updated when user picks a custom accent ──
  accentPrimary: string
  accentPrimaryMuted: string
  accentPrimaryLight: string

  // ── Status colors ──
  status: StatusColors

  // ── Design System Scales ──
  spacing: SpacingScale
  radius: RadiusScale
  elevation: ElevationScale
  gradient: GradientScale
  typography: TypographyScale
  glass: GlassTokens
  glow: GlowTokens
}

// ─── Shared Constants ─────────────────────────────────────────────────────────

const SPACING: SpacingScale = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
}

const RADIUS: RadiusScale = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
}

const FONT_FAMILY = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  default: 'System',
})

const TYPOGRAPHY_BASE: TypographyScale = {
  display: {
    fontFamily: FONT_FAMILY,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  heading: {
    fontFamily: FONT_FAMILY,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  subheading: {
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  caption: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.3,
  },
}

// ─── Helper: Create elevation with web boxShadow ──────────────────────────────

function createElevation(
  color: string,
  offsetY: number,
  opacity: number,
  radius: number,
  androidElevation: number,
  webShadow: string
): ElevationStyle {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: androidElevation,
    boxShadow: webShadow,
  }
}

// ─── LIGHT TOKENS ─────────────────────────────────────────────────────────────

export const LIGHT_TOKENS: Tokens = {
  // Backgrounds
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F9FAFB',
  bgTertiary: '#F3F4F6',
  bgInput: '#F3F4F6',
  bgElevated: '#FFFFFF',
  bgAccentSoft: '#F5F3FF',

  // Borders
  borderPrimary: '#E5E7EB',
  borderSecondary: '#D1D5DB',
  borderFocus: '#8B5CF6',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Accents
  accentPurple: '#8B5CF6',
  accentBlue: '#3B82F6',
  accentGreen: '#10B981',
  accentOrange: '#F59E0B',
  accentRed: '#EF4444',
  accentYellow: '#EAB308',
  accentPink: '#EC4899',
  accentCyan: '#06B6D4',

  // Primary accent (purple by default)
  accentPrimary: '#8B5CF6',
  accentPrimaryMuted: 'rgba(139, 92, 246, 0.15)',
  accentPrimaryLight: '#F5F3FF',

  // Status colors
  status: {
    todo: '#6B7280',
    todoBackground: '#F3F4F6',
    inProgress: '#3B82F6',
    inProgressBackground: '#EFF6FF',
    completed: '#10B981',
    completedBackground: '#ECFDF5',
    overdue: '#EF4444',
    overdueBackground: '#FEF2F2',
  },

  // Spacing & Radius
  spacing: SPACING,
  radius: RADIUS,

  // Elevation
  elevation: {
    none: createElevation('#000', 0, 0, 0, 0, 'none'),
    xs: createElevation('#000', 1, 0.05, 2, 1, '0 1px 2px rgba(0, 0, 0, 0.05)'),
    sm: createElevation('#000', 2, 0.08, 4, 2, '0 2px 4px rgba(0, 0, 0, 0.08)'),
    md: createElevation('#000', 4, 0.1, 8, 4, '0 4px 8px rgba(0, 0, 0, 0.1)'),
    lg: createElevation('#000', 8, 0.15, 16, 8, '0 8px 16px rgba(0, 0, 0, 0.15)'),
    glow: createElevation('#8B5CF6', 0, 0.3, 16, 0, '0 0 20px rgba(139, 92, 246, 0.3)'),
  },

  // Gradients
  gradient: {
    hero: {
      colors: ['#8B5CF6', '#6366F1'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    accent: {
      colors: ['#8B5CF6', '#7C3AED'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    },
    surface: {
      colors: ['#FFFFFF', '#F9FAFB'],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },
    glass: {
      colors: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)'],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },
    warm: {
      colors: ['#FEF3C7', '#F59E0B'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    cool: {
      colors: ['#DBEAFE', '#3B82F6'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
  },

  // Typography
  typography: TYPOGRAPHY_BASE,

  // Glass effect
  glass: {
    background: 'rgba(255, 255, 255, 0.8)',
    border: 'rgba(139, 92, 246, 0.1)',
    blur: 12,
  },

  // Glow effects
  glow: {
    accent: 'rgba(139, 92, 246, 0.3)',
    success: 'rgba(16, 185, 129, 0.3)',
    warning: 'rgba(245, 158, 11, 0.3)',
    error: 'rgba(239, 68, 68, 0.3)',
  },
}

// ─── DARK TOKENS ──────────────────────────────────────────────────────────────

export const DARK_TOKENS: Tokens = {
  // Backgrounds
  bgPrimary: '#111827',
  bgSecondary: '#1F2937',
  bgTertiary: '#374151',
  bgInput: '#1F2937',
  bgElevated: '#1F2937',
  bgAccentSoft: '#1E1B4B',

  // Borders
  borderPrimary: '#374151',
  borderSecondary: '#4B5563',
  borderFocus: '#A78BFA',

  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  textInverse: '#111827',

  // Accents (slightly lighter for dark mode visibility)
  accentPurple: '#A78BFA',
  accentBlue: '#60A5FA',
  accentGreen: '#34D399',
  accentOrange: '#FBBF24',
  accentRed: '#F87171',
  accentYellow: '#FDE047',
  accentPink: '#F472B6',
  accentCyan: '#22D3EE',

  // Primary accent
  accentPrimary: '#A78BFA',
  accentPrimaryMuted: 'rgba(167, 139, 250, 0.2)',
  accentPrimaryLight: '#1E1B4B',

  // Status colors
  status: {
    todo: '#D1D5DB',
    todoBackground: '#374151',
    inProgress: '#60A5FA',
    inProgressBackground: '#1E3A5F',
    completed: '#34D399',
    completedBackground: '#064E3B',
    overdue: '#F87171',
    overdueBackground: '#7F1D1D',
  },

  // Spacing & Radius
  spacing: SPACING,
  radius: RADIUS,

  // Elevation
  elevation: {
    none: createElevation('#000', 0, 0, 0, 0, 'none'),
    xs: createElevation('#000', 1, 0.3, 2, 1, '0 1px 2px rgba(0, 0, 0, 0.3)'),
    sm: createElevation('#000', 2, 0.35, 4, 2, '0 2px 4px rgba(0, 0, 0, 0.35)'),
    md: createElevation('#000', 4, 0.4, 8, 4, '0 4px 8px rgba(0, 0, 0, 0.4)'),
    lg: createElevation('#000', 8, 0.5, 16, 8, '0 8px 16px rgba(0, 0, 0, 0.5)'),
    glow: createElevation('#A78BFA', 0, 0.4, 20, 0, '0 0 24px rgba(167, 139, 250, 0.35)'),
  },

  // Gradients
  gradient: {
    hero: {
      colors: ['#7C3AED', '#4F46E5'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    accent: {
      colors: ['#A78BFA', '#8B5CF6'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    },
    surface: {
      colors: ['#1F2937', '#111827'],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },
    glass: {
      colors: ['rgba(31, 41, 55, 0.9)', 'rgba(31, 41, 55, 0.8)'],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },
    warm: {
      colors: ['#78350F', '#FBBF24'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    cool: {
      colors: ['#1E3A5F', '#60A5FA'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
  },

  // Typography
  typography: TYPOGRAPHY_BASE,

  // Glass effect
  glass: {
    background: 'rgba(31, 41, 55, 0.85)',
    border: 'rgba(167, 139, 250, 0.15)',
    blur: 12,
  },

  // Glow effects
  glow: {
    accent: 'rgba(167, 139, 250, 0.35)',
    success: 'rgba(52, 211, 153, 0.35)',
    warning: 'rgba(251, 191, 36, 0.35)',
    error: 'rgba(248, 113, 113, 0.35)',
  },
}

// ─── Helper: Apply elevation styles cross-platform ────────────────────────────

export function applyElevation(elevationStyle: ElevationStyle): object {
  if (Platform.OS === 'web') {
    return { boxShadow: elevationStyle.boxShadow }
  }
  return {
    shadowColor: elevationStyle.shadowColor,
    shadowOffset: elevationStyle.shadowOffset,
    shadowOpacity: elevationStyle.shadowOpacity,
    shadowRadius: elevationStyle.shadowRadius,
    elevation: elevationStyle.elevation,
  }
}

// ─── Helper: Create accent-derived glow ───────────────────────────────────────

export function createAccentGlow(accentColor: string, opacity: number = 0.5): string {
  const hex = accentColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

// ─── Helper: Create accent-muted background ───────────────────────────────────

export function createAccentMuted(accentColor: string, opacity: number = 0.15): string {
  return createAccentGlow(accentColor, opacity)
}
