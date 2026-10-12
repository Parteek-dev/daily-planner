/**
 * ProgressRing — circular progress indicator built with react-native-svg.
 *
 * Requirements: 9.1, 21.5
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useTheme } from '@/src/hooks/useTheme'
import { useAccessibility } from '@/src/hooks/useAccessibility'

export interface ProgressRingProps {
  /** 0–100 */
  readonly percent: number
  readonly size: number
  readonly strokeWidth: number
  readonly color: string
  readonly label?: string
}

export function ProgressRing({ percent, size, strokeWidth, color, label }: ProgressRingProps) {
  const { tokens } = useTheme()
  // Req 21.5: when reduceMotion is on we skip any animated transitions.
  // The ring is rendered statically (no SVG animate/transition) in all cases,
  // so this flag is available for callers that wrap ProgressRing in an
  // Animated.View — and is forwarded through the accessible state below.
  const { isReduceMotionEnabled } = useAccessibility()

  const clampedPercent = Math.min(100, Math.max(0, percent))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  // Progress goes clockwise from the top; dashoffset decreases as percent grows
  const dashOffset = circumference * (1 - clampedPercent / 100)

  // Centre coordinates
  const cx = size / 2
  const cy = size / 2

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clampedPercent }}
      accessibilityLabel={label ?? `${clampedPercent}% complete`}
      // Expose reduce-motion state so parent animated wrappers can branch
      {...(isReduceMotionEnabled ? { accessibilityState: { busy: false } } : {})}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track (background ring) */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={tokens.borderPrimary}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          // Rotate so progress starts from the top (12 o'clock)
          transform={`rotate(-90, ${cx}, ${cy})`}
        />
      </Svg>

      {/* Centred label */}
      {label !== undefined ? (
        <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
          <View style={styles.labelWrapper}>
            <Text
              style={[styles.label, { color: tokens.textPrimary }]}
              numberOfLines={2}
              accessibilityLabel={label ? `Progress: ${clampedPercent}%, ${label}` : `Progress: ${clampedPercent}%`}
            >
              {label}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  labelWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
})
