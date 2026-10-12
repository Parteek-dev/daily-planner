/**
 * Card — elevated surface component with multiple variants.
 *
 * Composes GradientSurface and GlassSurface based on variant.
 * Applies token-driven elevation shadows cross-platform.
 *
 * Variants:
 *   - default: solid background with elevation shadow
 *   - gradient: gradient background (uses GradientSurface)
 *   - glass: glassmorphism effect (uses GlassSurface)
 *
 * Props:
 *   variant        — 'default' | 'gradient' | 'glass' (default: 'default')
 *   elevation      — 'none' | 'sm' | 'md' | 'lg' | 'glow' (default: 'sm')
 *   rounded        — radius variant (default: 'lg')
 *   gradientVariant — for variant='gradient', which gradient to use (default: 'surface')
 *   padded         — whether to apply default padding (default: true)
 *   style          — additional ViewStyle
 *   children       — content to render inside
 */

import React from 'react'
import { StyleSheet, View, Platform, type ViewStyle, type StyleProp } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { applyElevation, type Tokens, type RadiusScale, type ElevationScale, type GradientScale } from '@/src/theme/tokens'
import GradientSurface from './GradientSurface'
import GlassSurface from './GlassSurface'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardVariant = 'default' | 'gradient' | 'glass'
export type ElevationVariant = keyof ElevationScale
export type RadiusVariant = keyof RadiusScale | 'none'
export type GradientVariant = keyof GradientScale

export interface CardProps {
  variant?: CardVariant
  elevation?: ElevationVariant
  rounded?: RadiusVariant
  gradientVariant?: GradientVariant
  padded?: boolean
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Card({
  variant = 'default',
  elevation = 'sm',
  rounded = 'lg',
  gradientVariant = 'surface',
  padded = true,
  style,
  children,
}: CardProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)

  const borderRadius = rounded === 'none' ? 0 : tokens.radius[rounded]
  const elevationStyle = applyElevation(tokens.elevation[elevation])

  const paddingStyle: ViewStyle = padded ? {
    padding: tokens.spacing.lg,
  } : {}

  // Gradient variant
  if (variant === 'gradient') {
    return (
      <View style={[elevationStyle, { borderRadius }]}>
        <GradientSurface
          variant={gradientVariant}
          rounded={rounded}
          style={[paddingStyle, style]}
        >
          {children}
        </GradientSurface>
      </View>
    )
  }

  // Glass variant
  if (variant === 'glass') {
    return (
      <View style={[elevationStyle, { borderRadius }]}>
        <GlassSurface
          rounded={rounded}
          style={[paddingStyle, style]}
        >
          {children}
        </GlassSurface>
      </View>
    )
  }

  // Default variant — solid background with border
  return (
    <View
      style={[
        styles.defaultCard,
        elevationStyle,
        { borderRadius },
        paddingStyle,
        style,
      ]}
    >
      {children}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    defaultCard: {
      backgroundColor: tokens.bgSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.borderPrimary,
      overflow: 'hidden',
    },
  })
}
