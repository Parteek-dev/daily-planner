/**
 * useMotion — centralized motion configuration hook.
 *
 * Provides:
 * - Reduced motion detection (accessibility)
 * - Shared spring/timing configurations
 * - Duration presets
 *
 * Respects user's accessibility preferences:
 * - Native: AccessibilityInfo.isReduceMotionEnabled()
 * - Web: prefers-reduced-motion media query
 */

import { useState, useEffect, useMemo } from 'react'
import { AccessibilityInfo, Platform } from 'react-native'
import {
  withSpring,
  withTiming,
  Easing,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MotionConfig {
  /** Whether reduced motion is enabled */
  reducedMotion: boolean

  /** Spring configurations */
  spring: {
    /** Snappy spring for press interactions */
    snappy: WithSpringConfig
    /** Bouncy spring for playful animations */
    bouncy: WithSpringConfig
    /** Gentle spring for subtle movements */
    gentle: WithSpringConfig
    /** Stiff spring for quick responses */
    stiff: WithSpringConfig
  }

  /** Timing configurations */
  timing: {
    /** Fast timing (150ms) */
    fast: WithTimingConfig
    /** Normal timing (250ms) */
    normal: WithTimingConfig
    /** Slow timing (400ms) */
    slow: WithTimingConfig
    /** Extra slow (600ms) for emphasis */
    emphasis: WithTimingConfig
  }

  /** Duration presets in ms */
  duration: {
    instant: number
    fast: number
    normal: number
    slow: number
    emphasis: number
  }

  /** Helper to get actual duration (0 if reduced motion) */
  getDuration: (preset: keyof MotionConfig['duration']) => number
}

// ─── Spring Configs ───────────────────────────────────────────────────────────

const SPRING_SNAPPY: WithSpringConfig = {
  damping: 15,
  stiffness: 400,
  mass: 0.8,
}

const SPRING_BOUNCY: WithSpringConfig = {
  damping: 10,
  stiffness: 200,
  mass: 1,
}

const SPRING_GENTLE: WithSpringConfig = {
  damping: 20,
  stiffness: 100,
  mass: 1,
}

const SPRING_STIFF: WithSpringConfig = {
  damping: 20,
  stiffness: 500,
  mass: 0.5,
}

// ─── Timing Configs ───────────────────────────────────────────────────────────

const TIMING_FAST: WithTimingConfig = {
  duration: 150,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
}

const TIMING_NORMAL: WithTimingConfig = {
  duration: 250,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
}

const TIMING_SLOW: WithTimingConfig = {
  duration: 400,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
}

const TIMING_EMPHASIS: WithTimingConfig = {
  duration: 600,
  easing: Easing.bezier(0.16, 1, 0.3, 1),
}

// ─── Duration Presets ─────────────────────────────────────────────────────────

const DURATIONS = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  emphasis: 600,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMotion(): MotionConfig {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    if (Platform.OS === 'web') {
      // Web: use media query
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setReducedMotion(mediaQuery.matches)

      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      // Native: use AccessibilityInfo
      AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion)

      const subscription = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        setReducedMotion
      )
      return () => subscription.remove()
    }
  }, [])

  const config = useMemo<MotionConfig>(() => ({
    reducedMotion,

    spring: {
      snappy: (reducedMotion ? { ...SPRING_SNAPPY, damping: 100 } : SPRING_SNAPPY) as WithSpringConfig,
      bouncy: (reducedMotion ? { ...SPRING_BOUNCY, damping: 100 } : SPRING_BOUNCY) as WithSpringConfig,
      gentle: (reducedMotion ? { ...SPRING_GENTLE, damping: 100 } : SPRING_GENTLE) as WithSpringConfig,
      stiff: (reducedMotion ? { ...SPRING_STIFF, damping: 100 } : SPRING_STIFF) as WithSpringConfig,
    },

    timing: {
      fast: reducedMotion ? { ...TIMING_FAST, duration: 0 } : TIMING_FAST,
      normal: reducedMotion ? { ...TIMING_NORMAL, duration: 0 } : TIMING_NORMAL,
      slow: reducedMotion ? { ...TIMING_SLOW, duration: 0 } : TIMING_SLOW,
      emphasis: reducedMotion ? { ...TIMING_EMPHASIS, duration: 0 } : TIMING_EMPHASIS,
    },

    duration: DURATIONS,

    getDuration: (preset) => reducedMotion ? 0 : DURATIONS[preset],
  }), [reducedMotion])

  return config
}

export default useMotion
