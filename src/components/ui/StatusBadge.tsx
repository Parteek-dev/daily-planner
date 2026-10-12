/**
 * StatusBadge — colored status pill indicator.
 *
 * Matches the reference design's status pills with:
 * - Soft colored background
 * - Matching text color
 * - Compact pill shape
 *
 * Props:
 *   status   — 'todo' | 'inProgress' | 'completed' | 'overdue'
 *   label    — optional custom label (defaults to status name)
 *   size     — 'sm' | 'md' (default: 'sm')
 *   style    — additional ViewStyle
 */

import React from 'react'
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { type Tokens } from '@/src/theme/tokens'
import AppText from '../AppText'

export type StatusType = 'todo' | 'inProgress' | 'completed' | 'overdue'

export interface StatusBadgeProps {
  status: StatusType
  label?: string
  size?: 'sm' | 'md'
  style?: StyleProp<ViewStyle>
}

const STATUS_LABELS: Record<StatusType, string> = {
  todo: 'To Do',
  inProgress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
}

export default function StatusBadge({
  status,
  label,
  size = 'sm',
  style,
}: StatusBadgeProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens, size)
  
  const statusColor = tokens.status[status]
  const statusBg = tokens.status[`${status}Background` as keyof typeof tokens.status]
  const displayLabel = label ?? STATUS_LABELS[status]
  
  return (
    <View style={[styles.container, { backgroundColor: statusBg }, style]}>
      <AppText
        role="label"
        color={statusColor}
        style={styles.label}
      >
        {displayLabel}
      </AppText>
    </View>
  )
}

function makeStyles(tokens: Tokens, size: 'sm' | 'md') {
  const paddingV = size === 'sm' ? 4 : tokens.spacing.sm
  const paddingH = size === 'sm' ? tokens.spacing.sm : tokens.spacing.md
  
  return StyleSheet.create({
    container: {
      paddingVertical: paddingV,
      paddingHorizontal: paddingH,
      borderRadius: tokens.radius.full,
      alignSelf: 'flex-start',
    },
    label: {
      textTransform: 'capitalize',
    },
  })
}
