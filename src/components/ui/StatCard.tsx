/**
 * StatCard — compact stat display card with icon badge.
 *
 * Matches the reference design's stat cards with:
 * - Rounded icon badge in colored background
 * - Large stat value
 * - Label text below
 *
 * Props:
 *   value      — main stat value (string or number)
 *   label      — description text below value
 *   icon       — Lucide icon component
 *   iconColor  — icon color (defaults to accentPrimary)
 *   iconBg     — icon background color (defaults to accentPrimaryMuted)
 *   style      — additional ViewStyle
 */

import React from 'react'
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { applyElevation, type Tokens } from '@/src/theme/tokens'
import AppText from '../AppText'
import type { LucideIcon } from 'lucide-react-native'

export interface StatCardProps {
  value: string | number
  label: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  style?: StyleProp<ViewStyle>
}

export default function StatCard({
  value,
  label,
  icon: Icon,
  iconColor,
  iconBg,
  style,
}: StatCardProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  
  const resolvedIconColor = iconColor ?? tokens.accentPrimary
  const resolvedIconBg = iconBg ?? tokens.accentPrimaryMuted
  
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconBadge, { backgroundColor: resolvedIconBg }]}>
        <Icon size={18} color={resolvedIconColor} />
      </View>
      <AppText role="heading" style={styles.value}>{value}</AppText>
      <AppText role="caption" color={tokens.textMuted}>{label}</AppText>
    </View>
  )
}

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    container: {
      backgroundColor: tokens.bgSecondary,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.lg,
      alignItems: 'flex-start',
      gap: tokens.spacing.sm,
      ...applyElevation(tokens.elevation.xs) as any,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: tokens.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    value: {
      marginTop: tokens.spacing.xs,
    },
  })
}
