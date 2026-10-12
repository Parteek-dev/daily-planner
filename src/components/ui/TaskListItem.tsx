/**
 * TaskListItem — task row for lists.
 *
 * Matches the reference design's task items with:
 * - Checkbox circle
 * - Task title and time
 * - Status badge
 * - Avatar or due date indicator
 *
 * Props:
 *   title       — task title
 *   time        — time string (e.g., "2h left")
 *   status      — task status
 *   completed   — whether task is completed
 *   onToggle    — toggle completion callback
 *   onPress     — press handler
 *   style       — additional ViewStyle
 */

import React from 'react'
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import { Check, Circle } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { applyElevation, type Tokens } from '@/src/theme/tokens'
import AppText from '../AppText'
import StatusBadge, { type StatusType } from './StatusBadge'
import { PressableScale } from '../motion'

export interface TaskListItemProps {
  title: string
  time?: string
  status?: StatusType
  completed?: boolean
  onToggle?: () => void
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

export default function TaskListItem({
  title,
  time,
  status,
  completed = false,
  onToggle,
  onPress,
  style,
}: TaskListItemProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  
  return (
    <PressableScale onPress={onPress} scale={0.98}>
      <View style={[styles.container, style]}>
        {/* Checkbox */}
        <PressableScale onPress={onToggle} style={styles.checkbox}>
          <View
            style={[
              styles.checkboxCircle,
              completed && styles.checkboxCompleted,
            ]}
          >
            {completed ? (
              <Check size={14} color={tokens.textInverse} strokeWidth={3} />
            ) : (
              <Circle size={20} color={tokens.borderSecondary} />
            )}
          </View>
        </PressableScale>
        
        {/* Content */}
        <View style={styles.content}>
          <AppText
            role="body"
            color={completed ? tokens.textMuted : tokens.textPrimary}
            style={[completed && styles.titleCompleted]}
            numberOfLines={1}
          >
            {title}
          </AppText>
          {status && !completed && (
            <StatusBadge status={status} size="sm" />
          )}
        </View>
        
        {/* Time or meta */}
        {time && (
          <View style={styles.meta}>
            <AppText role="caption" color={tokens.textMuted}>
              {time}
            </AppText>
          </View>
        )}
      </View>
    </PressableScale>
  )
}

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.bgSecondary,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.md,
      gap: tokens.spacing.md,
      ...applyElevation(tokens.elevation.xs) as any,
    },
    checkbox: {
      padding: tokens.spacing.xs,
    },
    checkboxCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxCompleted: {
      backgroundColor: tokens.status.completed,
    },
    content: {
      flex: 1,
      gap: tokens.spacing.xs,
    },
    titleCompleted: {
      textDecorationLine: 'line-through',
    },
    meta: {
      alignItems: 'flex-end',
    },
  })
}
