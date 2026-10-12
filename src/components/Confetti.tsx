/**
 * Confetti — task completion celebration animation.
 *
 * 24 coloured particles fall from the top of the screen over ~1.75 s.
 * When reduceMotion is enabled the animation is skipped and onDone fires immediately.
 *
 * Requirements: 7.12, 21.5
 */

import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import { useAccessibility } from '@/src/hooks/useAccessibility'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// ── Particle config ───────────────────────────────────────────────────────────

const PARTICLE_COLORS = [
  '#f43f5e', // rose
  '#f97316', // orange
  '#f59e0b', // amber
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
]

const PARTICLE_COUNT = 24
const ANIMATION_DURATION = 1750 // ms

interface ParticleConfig {
  id: number
  color: string
  x: number
  size: number
  delay: number
  /** Horizontal drift during fall (positive = right, negative = left) */
  driftX: number
  /** Rotation amount in degrees */
  rotation: number
}

function seededRand(seed: number): number {
  // Simple deterministic pseudo-random to avoid re-generating on each render
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

const PARTICLES: ParticleConfig[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  x: seededRand(i * 3) * SCREEN_WIDTH,
  size: 8 + seededRand(i * 7) * 8, // 8–16 px
  delay: seededRand(i * 11) * 300, // stagger up to 300 ms
  driftX: (seededRand(i * 5) - 0.5) * 120, // ±60 px drift
  rotation: seededRand(i * 13) * 360,
}))

// ── Single particle ───────────────────────────────────────────────────────────

interface ParticleProps {
  readonly config: ParticleConfig
  readonly onLastDone?: () => void
  readonly isLast?: boolean
}

function Particle({ config, onLastDone, isLast }: ParticleProps) {
  const translateY = useSharedValue(-config.size)
  const translateX = useSharedValue(0)
  const opacity = useSharedValue(1)
  const rotate = useSharedValue(0)

  useEffect(() => {
    const easing = Easing.bezier(0.25, 0.46, 0.45, 0.94)
    const duration = ANIMATION_DURATION - config.delay

    translateY.value = withDelay(
      config.delay,
      withTiming(SCREEN_HEIGHT + config.size, { duration, easing }),
    )
    translateX.value = withDelay(
      config.delay,
      withTiming(config.driftX, { duration, easing }),
    )
    rotate.value = withDelay(
      config.delay,
      withTiming(config.rotation, { duration, easing }),
    )
    opacity.value = withDelay(
      config.delay + duration * 0.7,
      withTiming(0, { duration: duration * 0.3 }, (finished) => {
        if (finished && isLast && onLastDone) {
          runOnJS(onLastDone)()
        }
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: config.color,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 4,
          left: config.x,
        },
        animStyle,
      ]}
    />
  )
}

// ── Exported component ────────────────────────────────────────────────────────

export interface ConfettiProps {
  readonly visible: boolean
  readonly onDone?: () => void
}

export function Confetti({ visible, onDone }: ConfettiProps) {
  const { isReduceMotionEnabled } = useAccessibility()
  const calledDone = useRef(false)

  useEffect(() => {
    if (!visible) {
      calledDone.current = false
      return
    }

    if (isReduceMotionEnabled) {
      // Skip animation entirely; call onDone immediately (Req 21.5)
      onDone?.()
      return
    }

    // Safety net: call onDone after max duration + buffer even if last particle callback misfires
    const timer = setTimeout(() => {
      if (!calledDone.current) {
        calledDone.current = true
        onDone?.()
      }
    }, ANIMATION_DURATION + 500)

    return () => clearTimeout(timer)
  }, [visible, isReduceMotionEnabled, onDone])

  if (!visible || isReduceMotionEnabled) return null

  const handleLastDone = () => {
    if (!calledDone.current) {
      calledDone.current = true
      onDone?.()
    }
  }

  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {PARTICLES.map((config, index) => (
        <Particle
          key={config.id}
          config={config}
          isLast={index === PARTICLES.length - 1}
          onLastDone={handleLastDone}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
  },
})
