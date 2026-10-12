/**
 * GradientSurface — reusable gradient background component.
 *
 * Wraps expo-linear-gradient with token-driven color definitions.
 * Supports multiple variants: hero, accent, surface, glass.
 *
 * Props:
 *   variant   — 'hero' | 'accent' | 'surface' | 'glass' (default: 'surface')
 *   rounded   — 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full' (default: 'md')
 *   style     — additional ViewStyle
 *   children  — content to render inside the gradient
 */

import React from 'react'
import { StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '@/src/hooks/useTheme'
import type { Tokens, RadiusScale, GradientScale } from '@/src/theme/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GradientVariant = keyof GradientScale
export type RadiusVariant = keyof RadiusScale | 'none'

export interface GradientSurfaceProps {
  variant?: GradientVariant
  rounded?: RadiusVariant
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GradientSurface({
  variant = 'surface',
  rounded = 'md',
  style,
  children,
}: GradientSurfaceProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  
  const gradientDef = tokens.gradient[variant]
  const borderRadius = rounded === 'none' ? 0 : tokens.radius[rounded]
  
  // Convert gradient start/end to expo-linear-gradient format
  const start = gradientDef.start ?? { x: 0, y: 0 }
  const end = gradientDef.end ?? { x: 0, y: 1 }
  
  return (
    <LinearGradient
      colors={gradientDef.colors as [string, string, ...string[]]}
      start={start}
      end={end}
      style={[
        styles.container,
        { borderRadius },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    container: {
      overflow: 'hidden',
    },
  })
}
