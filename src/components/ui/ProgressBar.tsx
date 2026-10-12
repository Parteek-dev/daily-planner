/**
 * ProgressBar — horizontal progress indicator.
 *
 * Matches the reference design's progress bars with:
 * - Rounded track and fill
 * - Gradient or solid fill option
 * - Multiple heights
 *
 * Props:
 *   progress   — progress value 0-100
 *   height     — 'sm' | 'md' | 'lg' (default: 'md')
 *   color      — fill color (defaults to accentPrimary)
 *   trackColor — track color (defaults to borderPrimary)
 *   showLabel  — show percentage label (default: false)
 *   style      — additional ViewStyle
 */

import React from 'react'
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { type Tokens } from '@/src/theme/tokens'
import AppText from '../AppText'

export interface ProgressBarProps {
  progress: number
  height?: 'sm' | 'md' | 'lg'
  color?: string
  trackColor?: string
  showLabel?: boolean
  style?: StyleProp<ViewStyle>
}

const HEIGHTS = {
  sm: 4,
  md: 8,
  lg: 12,
}

export default function ProgressBar({
  progress,
  height = 'md',
  color,
  trackColor,
  showLabel = false,
  style,
}: ProgressBarProps) {
  const { tokens } = useTheme()
  
  const heightValue = HEIGHTS[height]
  const fillColor = color ?? tokens.accentPrimary
  const bgColor = trackColor ?? tokens.borderPrimary
  const clampedProgress = Math.max(0, Math.min(100, progress))
  
  return (
    <View style={style}>
      {showLabel && (
        <View style={styles.labelRow}>
          <AppText role="caption" color={tokens.textSecondary}>Progress</AppText>
          <AppText role="caption" color={tokens.accentPrimary}>{Math.round(clampedProgress)}%</AppText>
        </View>
      )}
      <View
        style={[
          styles.track,
          {
            height: heightValue,
            backgroundColor: bgColor,
            borderRadius: heightValue / 2,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${clampedProgress}%`,
              height: heightValue,
              backgroundColor: fillColor,
              borderRadius: heightValue / 2,
            },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  track: {
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
})
