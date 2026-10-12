/**
 * CountCard — compact count display card.
 *
 * Matches the reference design's count cards with:
 * - Large count number
 * - Label text
 * - Optional border/divider style
 *
 * Props:
 *   count    — number to display
 *   label    — description label
 *   color    — count color (optional)
 *   style    — additional ViewStyle
 */

import React from 'react'
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { applyElevation, type Tokens } from '@/src/theme/tokens'
import AppText from '../AppText'

export interface CountCardProps {
  count: number | string
  label: string
  color?: string
  bordered?: boolean
  style?: StyleProp<ViewStyle>
}

export default function CountCard({
  count,
  label,
  color,
  bordered = true,
  style,
}: CountCardProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  
  const countColor = color ?? tokens.textPrimary
  
  return (
    <View
      style={[
        styles.container,
        bordered && styles.bordered,
        style,
      ]}
    >
      <AppText role="title" color={countColor} style={styles.count}>
        {count}
      </AppText>
      <AppText role="caption" color={tokens.textMuted}>
        {label}
      </AppText>
    </View>
  )
}

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    container: {
      backgroundColor: tokens.bgSecondary,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.xs,
      flex: 1,
    },
    bordered: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.borderPrimary,
    },
    count: {
      fontWeight: '700',
    },
  })
}
