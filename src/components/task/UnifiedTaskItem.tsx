/**
 * UnifiedTaskItem — Consistent task list item used across all screens.
 *
 * Design features:
 * - Time range shown at top (e.g., "10.15 AM - 11.00 AM")
 * - Colored accent bar on left edge (topic color)
 * - Title below time range
 * - No topic name badge (color conveys topic)
 * - Separator line between items
 * - Clean, minimal aesthetic
 *
 * Animations:
 * - Checkbox scale bounce on completion toggle
 * - Title opacity fade when completed
 * - Slide-out-left animation on delete
 *
 * Used in: Home (Today's Schedule), Tasks, Calendar
 */

import React, { useMemo, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import {
  CheckCircle2,
  Circle,
  Repeat,
  ListChecks,
  Trash2,
  Focus,
  CalendarClock,
  StickyNote,
} from 'lucide-react-native'

import { useTheme } from '@/src/hooks/useTheme'
import { useMotion } from '@/src/hooks/useMotion'
import type { Tokens } from '@/src/theme/tokens'
import type { Task } from '@/src/lib/firestoreMappers'

// Animated components
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)
const AnimatedView = Animated.View

// ── Time formatting helpers ────────────────────────────────────────────────────

/**
 * Convert 24h time string (HH:MM) to 12-hour format (e.g., "10.15 AM")
 */
function formatTime12h(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}.${String(m).padStart(2, '0')} ${ampm}`
}

/**
 * Calculate end time from start time and duration (minutes).
 * Returns formatted 12-hour time string.
 */
function calculateEndTime(startTime: string | null | undefined, durationMinutes: number): string | null {
  if (!startTime || durationMinutes <= 0) return null
  const [h, m] = startTime.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null

  const totalMinutes = h * 60 + m + durationMinutes
  const endH = Math.floor(totalMinutes / 60) % 24
  const endM = totalMinutes % 60

  const ampm = endH >= 12 ? 'PM' : 'AM'
  const h12 = endH === 0 ? 12 : endH > 12 ? endH - 12 : endH
  return `${h12}.${String(endM).padStart(2, '0')} ${ampm}`
}

/**
 * Get time range string (e.g., "10.15 AM - 11.00 AM") or just start time if no duration
 */
function getTimeRangeLabel(dueTime: string | null | undefined, durationMinutes: number): string | null {
  const startFormatted = formatTime12h(dueTime)
  if (!startFormatted) return null

  const endFormatted = calculateEndTime(dueTime, durationMinutes)
  if (endFormatted) {
    return `${startFormatted} - ${endFormatted}`
  }
  return startFormatted
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface UnifiedTaskItemProps {
  readonly task: Task
  readonly onToggle: () => void
  readonly onPress: () => void
  readonly onDelete?: () => void
  readonly onFocus?: () => void
  readonly onReschedule?: () => void
  readonly getTopicColor: (topic: string) => string
  /** Show action buttons (delete, focus, reschedule) */
  readonly showActions?: boolean
  /** Compact mode for dashboard/widget use */
  readonly compact?: boolean
  /** Show overdue badge if task is overdue */
  readonly isOverdue?: boolean
  /** Show separator line at bottom (default: true) */
  readonly showSeparator?: boolean
}

// ── Main component ─────────────────────────────────────────────────────────────

export function UnifiedTaskItem({
  task,
  onToggle,
  onPress,
  onDelete,
  onFocus,
  onReschedule,
  getTopicColor,
  showActions = true,
  compact = false,
  isOverdue = false,
  showSeparator = true,
}: UnifiedTaskItemProps) {
  const { tokens } = useTheme()
  const motion = useMotion()
  const styles = useMemo(() => makeStyles(tokens, compact), [tokens, compact])

  const topicColor = getTopicColor(task.topic)
  const hasSubtasks = (task.subtasks?.length ?? 0) > 0
  const completedSubs = task.subtasks?.filter((s: any) => s.completed).length ?? 0
  const totalSubs = task.subtasks?.length ?? 0
  const isRecurring = task.recurrence && task.recurrence !== 'none'
  const hasNote = !!(task as any).note?.trim()

  // Time display: range if we have both start time and duration
  const timeLabel = getTimeRangeLabel(task.dueTime, task.duration)

  // ─── Animation shared values ─────────────────────────────────────────────────

  // Checkbox scale animation
  const checkboxScale = useSharedValue(1)

  // Title opacity animation (fades when completed)
  const titleOpacity = useSharedValue(task.completed ? 0.6 : 1)

  // Delete slide-out animation
  const itemTranslateX = useSharedValue(0)
  const itemOpacity = useSharedValue(1)

  // ─── Animated styles ─────────────────────────────────────────────────────────

  const checkboxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkboxScale.value }],
  }))

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }))

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: itemTranslateX.value }],
    opacity: itemOpacity.value,
  }))

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleToggle = useCallback(() => {
    if (motion.reducedMotion) {
      // Reduced motion — skip animation, just toggle
      titleOpacity.value = task.completed ? 1 : 0.6
      onToggle()
      return
    }

    // Animate checkbox scale bounce
    checkboxScale.value = withSpring(1.2, motion.spring.bouncy, () => {
      checkboxScale.value = withSpring(1, motion.spring.snappy)
    })

    // Animate title opacity
    titleOpacity.value = withTiming(
      task.completed ? 1 : 0.6,
      { duration: 200 }
    )

    onToggle()
  }, [motion, task.completed, onToggle, checkboxScale, titleOpacity])

  const handleDelete = useCallback(() => {
    if (!onDelete) return

    if (motion.reducedMotion) {
      // Reduced motion — skip animation, just delete
      onDelete()
      return
    }

    // Slide out left and fade
    itemTranslateX.value = withTiming(-300, { duration: 200 })
    itemOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onDelete)()
      }
    })
  }, [motion, onDelete, itemTranslateX, itemOpacity])

  return (
    <AnimatedView style={containerAnimatedStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Edit task: ${task.title}`}
        style={({ pressed }) => [
          styles.container,
          task.completed && styles.containerCompleted,
          pressed && styles.containerPressed,
        ]}
      >
        {/* Accent bar (topic color) - full height */}
        <View style={[styles.accentBar, { backgroundColor: topicColor }]} />

        {/* Animated checkbox - with scale bounce on toggle */}
        <AnimatedPressable
          onPress={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed }}
          style={[styles.checkbox, checkboxAnimatedStyle]}
        >
          {task.completed ? (
            <CheckCircle2 size={22} color={tokens.accentGreen} />
          ) : (
            <Circle size={22} color={tokens.textMuted} />
          )}
        </AnimatedPressable>

        {/* Main content area */}
        <View style={styles.mainContent}>
          {/* Time range at top */}
          {timeLabel && (
            <Text style={[styles.timeText, { color: tokens.textSecondary }]}>
              {timeLabel}
            </Text>
          )}

          {/* Title with animated opacity */}
          <Animated.Text
            style={[
              styles.title,
              { color: task.completed ? tokens.textMuted : tokens.textPrimary },
              task.completed && styles.titleCompleted,
              titleAnimatedStyle,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Animated.Text>

          {/* Meta row: indicators only (no topic name) */}
          {(isRecurring || hasSubtasks || hasNote || (isOverdue && !task.completed)) && (
            <View style={styles.metaRow}>
              {/* Recurrence indicator */}
              {isRecurring && (
                <View style={styles.metaItem}>
                  <Repeat size={12} color={tokens.textMuted} />
                  <Text style={[styles.metaText, { color: tokens.textMuted }]}>
                    {task.recurrence}
                  </Text>
                </View>
              )}

              {/* Subtask count */}
              {hasSubtasks && (
                <View style={styles.metaItem}>
                  <ListChecks size={12} color={tokens.textMuted} />
                  <Text style={[styles.metaText, { color: tokens.textMuted }]}>
                    {completedSubs}/{totalSubs}
                  </Text>
                </View>
              )}

              {/* Note indicator */}
              {hasNote && (
                <StickyNote size={12} color={tokens.accentBlue} />
              )}

              {/* Overdue badge */}
              {isOverdue && !task.completed && (
                <View style={[styles.overdueBadge, { backgroundColor: `${tokens.accentRed}15` }]}>
                  <Text style={[styles.overdueText, { color: tokens.accentRed }]}>Overdue</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Action buttons on right */}
        {showActions && !compact && (
          <View style={styles.actions}>
            {onFocus && !task.completed && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation()
                  onFocus()
                }}
                hitSlop={6}
                style={styles.actionBtn}
                accessibilityRole="button"
                accessibilityLabel="Focus on this task"
              >
                <Focus size={14} color={tokens.textMuted} />
              </Pressable>
            )}
            {onReschedule && !task.completed && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation()
                  onReschedule()
                }}
                hitSlop={6}
                style={styles.actionBtn}
                accessibilityRole="button"
                accessibilityLabel="Reschedule to tomorrow"
              >
                <CalendarClock size={14} color={tokens.textMuted} />
              </Pressable>
            )}
            {onDelete && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
                hitSlop={6}
                style={styles.actionBtn}
                accessibilityRole="button"
                accessibilityLabel="Delete task"
              >
                <Trash2 size={14} color={tokens.textMuted} />
              </Pressable>
            )}
          </View>
        )}
      </Pressable>

      {/* Separator line */}
      {showSeparator && (
        <View style={[styles.separator, { backgroundColor: tokens.borderPrimary }]} />
      )}
    </AnimatedView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function makeStyles(tokens: Tokens, compact: boolean) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingVertical: 0,
      paddingRight: 12,
      minHeight: compact ? 56 : 64,
    },
    containerCompleted: {
      opacity: 0.6,
    },
    containerPressed: {
      opacity: 0.7,
    },
    accentBar: {
      width: 4,
      borderRadius: 2,
    },
    checkbox: {
      flexShrink: 0,
      paddingHorizontal: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mainContent: {
      flex: 1,
      paddingRight: 12,
      paddingVertical: compact ? 10 : 12,
      justifyContent: 'center',
      gap: compact ? 2 : 3,
    },
    timeText: {
      fontSize: compact ? 11 : 12,
      fontWeight: '500',
    },
    title: {
      fontSize: compact ? 14 : 15,
      fontWeight: '600',
      lineHeight: compact ? 19 : 21,
    },
    titleCompleted: {
      textDecorationLine: 'line-through',
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 11,
    },
    overdueBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    overdueText: {
      fontSize: 10,
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      flexShrink: 0,
    },
    actionBtn: {
      padding: 6,
      borderRadius: 6,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 16,
    },
  })
}

export default UnifiedTaskItem
