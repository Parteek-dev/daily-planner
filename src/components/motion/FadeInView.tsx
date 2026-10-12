/**
 * FadeInView — entrance animation wrapper.
 *
 * Fades and optionally slides children in on mount.
 * Uses Reanimated for smooth 60fps animation.
 * Respects reduced-motion accessibility setting.
 *
 * Props:
 *   direction — 'up' | 'down' | 'left' | 'right' | 'none' (default: 'up')
 *   distance  — slide distance in pixels (default: 16)
 *   duration  — 'fast' | 'normal' | 'slow' (default: 'normal')
 *   delay     — delay before animation starts in ms (default: 0)
 *   style     — additional ViewStyle
 *   children  — content to animate
 */

import React, { useEffect } from 'react'
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated'
import { useMotion } from '@/src/hooks/useMotion'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FadeDirection = 'up' | 'down' | 'left' | 'right' | 'none'
export type DurationPreset = 'fast' | 'normal' | 'slow'

export interface FadeInViewProps {
  direction?: FadeDirection
  distance?: number
  duration?: DurationPreset
  delay?: number
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FadeInView({
  direction = 'up',
  distance = 16,
  duration = 'normal',
  delay = 0,
  style,
  children,
}: FadeInViewProps) {
  const motion = useMotion()
  const progress = useSharedValue(0)
  
  useEffect(() => {
    const durationMs = motion.getDuration(duration)
    
    if (durationMs === 0) {
      // Reduced motion — instant appearance
      progress.value = 1
    } else {
      progress.value = withDelay(
        delay,
        withTiming(1, {
          duration: durationMs,
          easing: Easing.bezier(0.16, 1, 0.3, 1), // Smooth deceleration
        })
      )
    }
  }, [delay, duration, motion, progress])
  
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0, 1])
    
    let translateX = 0
    let translateY = 0
    
    if (direction === 'up') {
      translateY = interpolate(progress.value, [0, 1], [distance, 0])
    } else if (direction === 'down') {
      translateY = interpolate(progress.value, [0, 1], [-distance, 0])
    } else if (direction === 'left') {
      translateX = interpolate(progress.value, [0, 1], [distance, 0])
    } else if (direction === 'right') {
      translateX = interpolate(progress.value, [0, 1], [-distance, 0])
    }
    
    return {
      opacity,
      transform: [{ translateX }, { translateY }],
    }
  })
  
  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  )
}
