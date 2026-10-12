/**
 * PressableScale — pressable wrapper with scale animation.
 *
 * Scales down slightly on press (0.97), springs back on release.
 * Uses Reanimated for smooth 60fps animation.
 * Respects reduced-motion accessibility setting.
 *
 * Props:
 *   scale        — scale value when pressed (default: 0.97)
 *   disabled     — disable press interactions (default: false)
 *   style        — additional ViewStyle
 *   onPress      — press handler
 *   onLongPress  — long press handler
 *   onPressIn    — press in handler
 *   onPressOut   — press out handler
 *   children     — content to animate
 *   ...rest      — additional Pressable props
 */

import React, { useCallback } from 'react'
import { Pressable, type PressableProps, type ViewStyle, type StyleProp } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useMotion } from '@/src/hooks/useMotion'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  scale?: number
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export default function PressableScale({
  scale = 0.97,
  disabled = false,
  style,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const motion = useMotion()
  const scaleValue = useSharedValue(1)
  
  const handlePressIn = useCallback((e: any) => {
    if (motion.reducedMotion) {
      // Reduced motion — no animation
      scaleValue.value = 1
    } else {
      scaleValue.value = withTiming(scale, { duration: 100 })
    }
    onPressIn?.(e)
  }, [motion.reducedMotion, onPressIn, scale, scaleValue])
  
  const handlePressOut = useCallback((e: any) => {
    if (motion.reducedMotion) {
      scaleValue.value = 1
    } else {
      scaleValue.value = withSpring(1, motion.spring.snappy)
    }
    onPressOut?.(e)
  }, [motion.reducedMotion, motion.spring.snappy, onPressOut, scaleValue])
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }))
  
  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  )
}
