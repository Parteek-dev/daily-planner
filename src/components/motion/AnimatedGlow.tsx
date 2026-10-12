/**
 * AnimatedGlow — wrapper that adds pulsing glow effect.
 *
 * Applies an accent-tinted glow shadow that pulses subtly.
 * Can be toggled on/off via the `active` prop.
 * Respects reduced-motion accessibility setting.
 *
 * Props:
 *   active       — whether glow is active (default: true)
 *   color        — glow color, defaults to tokens.glow.accent
 *   intensity    — glow intensity 0-1 (default: 1)
 *   pulseSpeed   — pulse animation speed in ms (default: 2000)
 *   rounded      — border radius variant (default: 'lg')
 *   style        — additional ViewStyle
 *   children     — content to wrap
 */

import React, { useEffect } from 'react'
import { StyleSheet, Platform, type ViewStyle, type StyleProp } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
  interpolate,
} from 'react-native-reanimated'
import { useTheme } from '@/src/hooks/useTheme'
import { useMotion } from '@/src/hooks/useMotion'
import type { RadiusScale } from '@/src/theme/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RadiusVariant = keyof RadiusScale | 'none'

export interface AnimatedGlowProps {
  active?: boolean
  color?: string
  intensity?: number
  pulseSpeed?: number
  rounded?: RadiusVariant
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnimatedGlow({
  active = true,
  color,
  intensity = 1,
  pulseSpeed = 2000,
  rounded = 'lg',
  style,
  children,
}: AnimatedGlowProps) {
  const { tokens } = useTheme()
  const motion = useMotion()
  const pulseProgress = useSharedValue(0)
  
  const glowColor = color ?? tokens.glow.accent
  const borderRadius = rounded === 'none' ? 0 : tokens.radius[rounded]
  
  useEffect(() => {
    if (!active || motion.reducedMotion) {
      cancelAnimation(pulseProgress)
      pulseProgress.value = 0
      return
    }
    
    // Gentle pulse animation
    pulseProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: pulseSpeed / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: pulseSpeed / 2,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1, // Infinite repeat
      false // Don't reverse
    )
    
    return () => {
      cancelAnimation(pulseProgress)
    }
  }, [active, motion.reducedMotion, pulseProgress, pulseSpeed])
  
  const animatedStyle = useAnimatedStyle(() => {
    if (!active) {
      return {}
    }
    
    // Interpolate shadow opacity/radius based on pulse
    const shadowOpacity = interpolate(
      pulseProgress.value,
      [0, 1],
      [0.3 * intensity, 0.6 * intensity]
    )
    
    const shadowRadius = interpolate(
      pulseProgress.value,
      [0, 1],
      [12, 20]
    )
    
    if (Platform.OS === 'web') {
      // Web: use boxShadow
      const blur = Math.round(shadowRadius)
      const spread = Math.round(shadowRadius / 2)
      return {
        boxShadow: `0 0 ${blur}px ${spread}px ${glowColor}`,
      } as any
    }
    
    // Native: use shadow props
    return {
      shadowColor: glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity,
      shadowRadius,
    }
  })
  
  return (
    <Animated.View
      style={[
        { borderRadius, overflow: 'visible' },
        style,
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  )
}
