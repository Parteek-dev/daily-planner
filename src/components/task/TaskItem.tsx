/**
 * TaskItem — Swipeable task row component.
 *
 * Platform behaviour:
 *  - iOS / Android: wraps in react-native-gesture-handler Swipeable; left swipe
 *    reveals a complete action, right swipe reveals a delete action; a minimum
 *    80 dp drag is required before the action fires (Req 7.13, 21.1).
 *  - Web: renders hover-reveal action buttons instead of swipe gestures (Req 21.2).
 *
 * Visual elements (Req 21.3):
 *  - Priority color indicator stripe on the left edge.
 *  - Topic color dot.
 *  - Due time badge (when dueTime is set).
 *  - Duration badge (when duration > 0).
 *  - Subtask progress chip ("n/m subtasks done").
 *  - Completion checkbox with strikethrough when done.
 *
 * Accessibility: every interactive element has accessibilityLabel,
 * accessibilityRole="button", and accessible={true} (Req 7.13).
 * The checkbox element also carries accessibilityState={{ checked }}.
 *
 * Requirements: 7.13, 21.1, 21.2, 21.3
 */

import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native'
import Swipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable'
import {
  Check,
  Trash2,
  Clock,
  Timer,
  Play,
  Focus,
  Pencil,
  ChevronRight,
} from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import type { Tokens } from '@/src/theme/tokens'
import type { Task } from '@/src/lib/firestoreMappers'
import { fmtDuration } from '@/src/lib/utils'

// ── Minimum swipe distance required to trigger an action (Req 7.13) ───────────
const SWIPE_THRESHOLD = 80

// ── Priority colour helpers ────────────────────────────────────────────────────

function priorityColor(
  priority: Task['priority'],
  tokens: Tokens,
): string {
  switch (priority) {
    case 'high': return tokens.accentRed
    case 'medium': return tokens.accentOrange
    case 'low': return tokens.accentBlue
    default: return 'transparent'
  }
}

function priorityLabel(priority: Task['priority']): string {
  if (!priority) return 'no priority'
  return priority.charAt(0).toUpperCase() + priority.slice(1) + ' priority'
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface TaskItemProps {
  readonly task: Task
  readonly onComplete: (id: string) => void
  readonly onDelete: (id: string) => void
  readonly onEdit: (task: Task) => void
  readonly onStartFocus?: (task: Task) => void
  readonly onStartPomodoro?: (task: Task) => void
  readonly showDate?: boolean
  readonly isDragging?: boolean
  readonly getTopicColor: (topic: string) => string
}

// ── Badge sub-component ────────────────────────────────────────────────────────

interface BadgeProps {
  readonly icon: ReactNode
  readonly label: string
  readonly color: string
}

function Badge({ icon, label, color }: BadgeProps) {
  return (
    <View style={[badgeStyles.root, { borderColor: color + '40' }]}>
      {icon}
      <Text style={[badgeStyles.text, { color }]}>{label}</Text>
    </View>
  )
}

const badgeStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
  },
})

// ── Main component ─────────────────────────────────────────────────────────────

export function TaskItem({
  task,
  onComplete,
  onDelete,
  onEdit,
  onStartFocus,
  onStartPomodoro,
  showDate = false,
  isDragging = false,
  getTopicColor,
}: TaskItemProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  const swipeableRef = useRef<SwipeableMethods>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Derived state
  const completedSubtasks = task.subtasks.filter(s => s.completed).length
  const totalSubtasks = task.subtasks.length
  const topicColor = getTopicColor(task.topic)
  const prioColor = priorityColor(task.priority, tokens)
  const dueLabel = task.dueTime ?? null
  const durationLabel = task.duration > 0 ? fmtDuration(task.duration) : null

  // ── Swipe handlers (iOS / Android) ─────────────────────────────────────────

  const handleSwipeComplete = useCallback(() => {
    swipeableRef.current?.close()
    onComplete(task.id)
  }, [onComplete, task.id])

  const handleSwipeDelete = useCallback(() => {
    swipeableRef.current?.close()
    onDelete(task.id)
  }, [onDelete, task.id])

  // Render the action that is revealed on a left swipe (complete)
  const renderLeftActions = useCallback(
    () => (
      <View style={[styles.swipeAction, styles.completeAction]}>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Complete task: ${task.title}`}
          onPress={handleSwipeComplete}
          style={styles.swipeActionInner}
        >
          <Check color="#ffffff" size={22} />
          <Text style={styles.swipeActionText}>Complete</Text>
        </Pressable>
      </View>
    ),
    [styles, task.title, handleSwipeComplete],
  )

  // Render the action that is revealed on a right swipe (delete)
  const renderRightActions = useCallback(
    () => (
      <View style={[styles.swipeAction, styles.deleteAction]}>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Delete task: ${task.title}`}
          onPress={handleSwipeDelete}
          style={styles.swipeActionInner}
        >
          <Trash2 color="#ffffff" size={22} />
          <Text style={styles.swipeActionText}>Delete</Text>
        </Pressable>
      </View>
    ),
    [styles, task.title, handleSwipeDelete],
  )

  // ── Row content ─────────────────────────────────────────────────────────────

  const rowContent = (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Task: ${task.title}. ${priorityLabel(task.priority)}. ${task.completed ? 'Completed' : 'Incomplete'}.`}
      onPress={() => onEdit(task)}
      // Web hover state for revealing action buttons
      onHoverIn={Platform.OS === 'web' ? () => setIsHovered(true) : undefined}
      onHoverOut={Platform.OS === 'web' ? () => setIsHovered(false) : undefined}
      style={[
        styles.row,
        isDragging && styles.rowDragging,
        task.completed && styles.rowCompleted,
      ]}
    >
      {/* Priority indicator stripe ──────────────────────────────────────── */}
      <View
        style={[styles.priorityStripe, { backgroundColor: prioColor }]}
        accessible={false}
      />

      {/* Checkbox ──────────────────────────────────────────────────────── */}
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={task.completed ? `Mark incomplete: ${task.title}` : `Mark complete: ${task.title}`}
        accessibilityState={{ checked: task.completed }}
        onPress={() => onComplete(task.id)}
        style={[styles.checkbox, task.completed && styles.checkboxChecked]}
        hitSlop={8}
      >
        {task.completed && <Check color="#ffffff" size={14} strokeWidth={3} />}
      </Pressable>

      {/* Main content ─────────────────────────────────────────────────── */}
      <View style={styles.content}>
        {/* Title row */}
        <View style={styles.titleRow}>
          {/* Topic color dot */}
          {task.topic ? (
            <View
              style={[styles.topicDot, { backgroundColor: topicColor }]}
              accessible={false}
            />
          ) : null}

          <Text
            style={[styles.title, task.completed && styles.titleStruck]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
        </View>

        {/* Date (optional) */}
        {showDate && task.date ? (
          <Text style={styles.dateText}>{task.date}</Text>
        ) : null}

        {/* Badges row ─────────────────────────────────────────────── */}
        {(dueLabel || durationLabel || totalSubtasks > 0) ? (
          <View style={styles.badgeRow}>
            {dueLabel ? (
              <Badge
                icon={<Clock color={tokens.textMuted} size={11} />}
                label={dueLabel}
                color={tokens.textMuted}
              />
            ) : null}
            {durationLabel ? (
              <Badge
                icon={<Timer color={tokens.textMuted} size={11} />}
                label={durationLabel}
                color={tokens.textMuted}
              />
            ) : null}
            {totalSubtasks > 0 ? (
              <Badge
                icon={<ChevronRight color={completedSubtasks === totalSubtasks ? tokens.accentGreen : tokens.textMuted} size={11} />}
                label={`${completedSubtasks}/${totalSubtasks}`}
                color={completedSubtasks === totalSubtasks ? tokens.accentGreen : tokens.textMuted}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Web hover-reveal action buttons (Req 21.2) ─────────────────────── */}
      {Platform.OS === 'web' && isHovered && (
        <View style={styles.hoverActions}>
          {onStartFocus && !task.completed && (
            <Pressable
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Start focus on: ${task.title}`}
              onPress={() => onStartFocus(task)}
              style={styles.hoverBtn}
            >
              <Focus color={tokens.textSecondary} size={16} />
            </Pressable>
          )}
          {onStartPomodoro && !task.completed && (
            <Pressable
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Start Pomodoro for: ${task.title}`}
              onPress={() => onStartPomodoro(task)}
              style={styles.hoverBtn}
            >
              <Play color={tokens.textSecondary} size={16} />
            </Pressable>
          )}
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Edit task: ${task.title}`}
            onPress={() => onEdit(task)}
            style={styles.hoverBtn}
          >
            <Pencil color={tokens.textSecondary} size={16} />
          </Pressable>
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Delete task: ${task.title}`}
            onPress={() => onDelete(task.id)}
            style={[styles.hoverBtn, styles.hoverBtnDestructive]}
          >
            <Trash2 color={tokens.accentRed} size={16} />
          </Pressable>
        </View>
      )}
    </Pressable>
  )

  // ── Platform branch: wrap in Swipeable on native, plain row on web ─────────

  if (Platform.OS === 'web') {
    return rowContent
  }

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      leftThreshold={SWIPE_THRESHOLD}
      rightThreshold={SWIPE_THRESHOLD}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
    >
      {rowContent}
    </Swipeable>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.bgSecondary,
      borderBottomWidth: 1,
      borderBottomColor: tokens.borderPrimary,
      minHeight: 56,
      overflow: 'hidden',
    },
    rowCompleted: {
      opacity: 0.6,
    },
    rowDragging: {
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
        },
        android: { elevation: 8 },
        web: { boxShadow: '0 4px 16px rgba(0,0,0,0.18)' },
      }),
      opacity: 0.95,
      zIndex: 99,
    },
    priorityStripe: {
      width: 4,
      alignSelf: 'stretch',
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: tokens.borderSecondary,
      marginHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    checkboxChecked: {
      backgroundColor: tokens.accentGreen,
      borderColor: tokens.accentGreen,
    },
    content: {
      flex: 1,
      paddingVertical: 10,
      paddingRight: 12,
      gap: 4,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    topicDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      flexShrink: 0,
    },
    title: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textPrimary,
      flex: 1,
    },
    titleStruck: {
      textDecorationLine: 'line-through',
      color: tokens.textMuted,
    },
    dateText: {
      fontSize: 11,
      color: tokens.textMuted,
      marginLeft: 14, // align with title (topic dot + gap)
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginLeft: 14,
    },
    // Swipe action containers
    swipeAction: {
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: SWIPE_THRESHOLD,
    },
    swipeActionInner: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingHorizontal: 16,
    },
    completeAction: {
      backgroundColor: tokens.accentGreen,
    },
    deleteAction: {
      backgroundColor: tokens.accentRed,
    },
    swipeActionText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
    },
    // Web hover actions
    hoverActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingRight: 8,
    },
    hoverBtn: {
      padding: 8,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.bgInput,
    },
    hoverBtnDestructive: {
      backgroundColor: tokens.accentRed + '15',
    },
  })
}
