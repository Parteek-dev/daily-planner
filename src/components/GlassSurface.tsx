/**
 * GlassSurface — glassmorphism effect component with graceful fallback.
 *
 * Uses expo-blur on iOS/Android for real blur effect.
 * Falls back to a translucent background on web or when blur is unavailable.
 *
 * Props:
 *   intensity — blur intensity (default from tokens.glass.blur)
 *   rounded   — radius variant (default: 'lg')
 *   bordered  — whether to show glass border (default: true)
 *   style     — additional ViewStyle
 *   children  — content to render inside
 */

import React from 'react'
import { StyleSheet, View, Platform, type ViewStyle, type StyleProp } from 'react-native'
import { BlurView } from 'expo-blur'
import { useTheme } from '@/src/hooks/useTheme'
import type { Tokens, RadiusScale } from '@/src/theme/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RadiusVariant = keyof RadiusScale | 'none'

export interface GlassSurfaceProps {
  intensity?: number
  rounded?: RadiusVariant
  bordered?: boolean
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
  /** Tint mode for BlurView (iOS/Android) */
  tint?: 'light' | 'dark' | 'default'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GlassSurface({
  intensity,
  rounded = 'lg',
  bordered = true,
  style,
  children,
  tint,
}: GlassSurfaceProps) {
  const { tokens, theme } = useTheme()
  const styles = makeStyles(tokens)
  
  const blurIntensity = intensity ?? tokens.glass.blur
  const borderRadius = rounded === 'none' ? 0 : tokens.radius[rounded]
  const resolvedTint = tint ?? (theme === 'dark' ? 'dark' : 'light')
  
  // On web, BlurView doesn't work well — use fallback
  // Also provide fallback for any platform issues
  const useNativeBlur = Platform.OS !== 'web'
  
  const containerStyle: ViewStyle = {
    borderRadius,
    borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
    borderColor: bordered ? tokens.glass.border : 'transparent',
    overflow: 'hidden',
  }
  
  if (useNativeBlur) {
    return (
      <BlurView
        intensity={blurIntensity}
        tint={resolvedTint}
        style={[styles.container, containerStyle, style]}
      >
        {children}
      </BlurView>
    )
  }
  
  // Web fallback — use translucent background with backdrop-filter
  return (
    <View
      style={[
        styles.container,
        styles.webFallback,
        containerStyle,
        { backgroundColor: tokens.glass.background },
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
    container: {
      overflow: 'hidden',
    },
    webFallback: {
      // Web-specific backdrop blur via style override
      // This will be applied as inline style on web
      ...Platform.select({
        web: {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any,
        default: {},
      }),
    },
  })
}
