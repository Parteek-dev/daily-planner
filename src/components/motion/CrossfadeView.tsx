/**
 * CrossfadeView — crossfade transition wrapper.
 *
 * Animates between children with a smooth opacity crossfade
 * when the `viewKey` prop changes.
 * Uses Reanimated for smooth 60fps animation.
 * Respects reduced-motion accessibility setting.
 *
 * Props:
 *   viewKey   — unique key to trigger crossfade when changed
 *   duration  — 'fast' | 'normal' | 'slow' (default: 'normal')
 *   style     — additional ViewStyle
 *   children  — content to animate
 */

import React, { useEffect, useState } from 'react'
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import { useMotion } from '@/src/hooks/useMotion'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DurationPreset = 'fast' | 'normal' | 'slow'

export interface CrossfadeViewProps {
  viewKey: string
  duration?: DurationPreset
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CrossfadeView({
  viewKey,
  duration = 'normal',
  style,
  children,
}: CrossfadeViewProps) {
  const motion = useMotion()
  const opacity = useSharedValue(1)
  
  // Track current and previous children for crossfade
  const [displayedKey, setDisplayedKey] = useState(viewKey)
  const [displayedChildren, setDisplayedChildren] = useState(children)
  
  useEffect(() => {
    if (viewKey !== displayedKey) {
      const durationMs = motion.getDuration(duration)
      
      if (durationMs === 0) {
        // Reduced motion — instant switch
        setDisplayedKey(viewKey)
        setDisplayedChildren(children)
      } else {
        // Animate out
        opacity.value = withTiming(0, {
          duration: durationMs / 2,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }, (finished) => {
          if (finished) {
            // Update content when fade-out completes
            runOnJS(setDisplayedKey)(viewKey)
            runOnJS(setDisplayedChildren)(children)
            // Animate in
            opacity.value = withTiming(1, {
              duration: durationMs / 2,
              easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            })
          }
        })
      }
    } else {
      // viewKey matches but children may have updated
      setDisplayedChildren(children)
    }
  }, [viewKey, children, displayedKey, duration, motion, opacity])
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))
  
  return (
    <Animated.View style={[styles.container, style, animatedStyle]}>
      {displayedChildren}
    </Animated.View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
