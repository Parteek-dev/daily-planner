/**
 * DayTimeline — Calendar-style timeline view for tasks.
 *
 * Features:
 * - Time slots on left (6 AM - 10 PM by default)
 * - Tasks positioned by their scheduled time
 * - "Now" indicator line
 * - Overlapping tasks shown side-by-side
 * - Unscheduled tasks in separate section at top
 * - Scrollable view with current hour in view on mount
 * - Drag-to-reschedule functionality
 * - Configurable hour height
 *
 * Design: Clean, minimal aesthetic with subtle shadows and rounded cards
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  PanResponder,
} from 'react-native'
import {
  CheckCircle2,
  Circle,
  Repeat,
  ListChecks,
  StickyNote,
  Clock,
  GripVertical,
  Check,
} from 'lucide-react-native'

import { useTheme } from '@/src/hooks/useTheme'
import type { Tokens } from '@/src/theme/tokens'
import type { Task } from '@/src/lib/firestoreMappers'

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_HOUR_HEIGHT = 120 // Generous height for breathing room
const START_HOUR = 0   // 12 AM (midnight)
const END_HOUR = 24    // 12 AM next day (full 24 hours)

// ── Time helpers ───────────────────────────────────────────────────────────────

function parseTime(timeStr: string | null | undefined): { hours: number; minutes: number } | null {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return { hours: h, minutes: m }
}

function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM'
  if (hour === 12) return '12 PM'
  const h12 = hour > 12 ? hour - 12 : hour
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${h12} ${ampm}`
}

function formatTime12h(timeStr: string | null | undefined): string | null {
  const time = parseTime(timeStr)
  if (!time) return null
  const { hours, minutes } = time
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`
}

function calculateEndTime(startTime: string | null | undefined, durationMinutes: number): string | null {
  const time = parseTime(startTime)
  if (!time || durationMinutes <= 0) return null

  const totalMinutes = time.hours * 60 + time.minutes + durationMinutes
  const endH = Math.floor(totalMinutes / 60) % 24
  const endM = totalMinutes % 60

  const ampm = endH >= 12 ? 'PM' : 'AM'
  const h12 = endH === 0 ? 12 : endH > 12 ? endH - 12 : endH
  return `${h12}:${String(endM).padStart(2, '0')} ${ampm}`
}

function getTimeRangeLabel(dueTime: string | null | undefined, durationMinutes: number): string | null {
  const startFormatted = formatTime12h(dueTime)
  if (!startFormatted) return null

  const endFormatted = calculateEndTime(dueTime, durationMinutes)
  if (endFormatted) {
    return `${startFormatted} - ${endFormatted}`
  }
  return startFormatted
}

/**
 * Convert Y position to time string (HH:MM format)
 */
function yPositionToTime(y: number, hourHeight: number): string {
  const totalMinutes = (y / hourHeight) * 60 + START_HOUR * 60
  // Round to nearest 15 minutes for snap
  const snappedMinutes = Math.round(totalMinutes / 15) * 15
  const hours = Math.floor(snappedMinutes / 60)
  const minutes = snappedMinutes % 60
  const clampedHours = Math.max(START_HOUR, Math.min(END_HOUR - 1, hours))
  return `${String(clampedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Get Y position for a time within the timeline
 */
function getYPositionForTime(timeStr: string, hourHeight: number): number {
  const time = parseTime(timeStr)
  if (!time) return 0

  const hourOffset = time.hours - START_HOUR
  const minuteOffset = time.minutes / 60
  return (hourOffset + minuteOffset) * hourHeight
}

/**
 * Get height for a duration - NO minimum, let it be exactly proportional
 */
function getHeightForDuration(durationMinutes: number, hourHeight: number): number {
  // Exact proportional height - no minimum to avoid visual overlap
  return (durationMinutes / 60) * hourHeight
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface PositionedTask {
  task: Task
  top: number
  height: number
  left: number
  width: number
  column: number
  totalColumns: number
}

interface TaskGroup {
  tasks: Task[]
  startMinutes: number
  endMinutes: number
}

// ── Overlap detection ──────────────────────────────────────────────────────────

function detectOverlaps(tasks: Task[], hourHeight: number): PositionedTask[] {
  // Filter to tasks with time and sort by start time
  const scheduled = tasks
    .filter(t => t.dueTime)
    .map(t => {
      const time = parseTime(t.dueTime)!
      const startMinutes = time.hours * 60 + time.minutes
      const duration = t.duration || 30 // Default 30 min if no duration
      const endMinutes = startMinutes + duration
      return { task: t, startMinutes, endMinutes }
    })
    .sort((a, b) => a.startMinutes - b.startMinutes)

  if (scheduled.length === 0) return []

  // Check if two time ranges actually overlap (strict - not just touching)
  const overlaps = (a: typeof scheduled[0], b: typeof scheduled[0]) => {
    return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes
  }

  // Use a greedy column assignment algorithm
  // Each task gets placed in the first column where it doesn't overlap with existing tasks
  const columns: (typeof scheduled[0])[][] = []

  for (const task of scheduled) {
    let placed = false

    // Try to find a column where this task fits (doesn't overlap with any task in that column)
    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      const column = columns[colIdx]
      const hasOverlap = column.some(existingTask => overlaps(existingTask, task))

      if (!hasOverlap) {
        column.push(task)
        placed = true
        break
      }
    }

    // If no existing column works, create a new one
    if (!placed) {
      columns.push([task])
    }
  }

  // Now we know the total number of columns needed
  const totalColumns = columns.length

  // Build positioned tasks
  const positioned: PositionedTask[] = []

  for (let colIdx = 0; colIdx < columns.length; colIdx++) {
    for (const item of columns[colIdx]) {
      const duration = item.task.duration || 30

      positioned.push({
        task: item.task,
        top: getYPositionForTime(item.task.dueTime!, hourHeight),
        height: getHeightForDuration(duration, hourHeight),
        left: colIdx / totalColumns,
        width: 1 / totalColumns,
        column: colIdx,
        totalColumns,
      })
    }
  }

  return positioned
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface DayTimelineProps {
  readonly tasks: Task[]
  readonly onToggle: (id: string) => void
  readonly onPress: (id: string) => void
  readonly onReschedule?: (id: string, newTime: string) => void
  readonly getTopicColor: (topic: string) => string
  /** Height per hour in pixels (default: 72) */
  readonly hourHeight?: number
  /** Show compact view with smaller cards */
  readonly compact?: boolean
  /** Hide unscheduled section */
  readonly hideUnscheduled?: boolean
}

// ── Component ──────────────────────────────────────────────────────────────────

export function DayTimeline({
  tasks,
  onToggle,
  onPress,
  onReschedule,
  getTopicColor,
  hourHeight = DEFAULT_HOUR_HEIGHT,
  compact = false,
  hideUnscheduled = false,
}: DayTimelineProps) {
  const { tokens } = useTheme()
  const styles = useMemo(() => makeStyles(tokens, hourHeight), [tokens, hourHeight])
  const scrollRef = useRef<ScrollView>(null)
  const [gridWidth, setGridWidth] = useState(0)
  const [draggingTask, setDraggingTask] = useState<string | null>(null)

  const totalHours = END_HOUR - START_HOUR
  const timelineHeight = totalHours * hourHeight

  // Split tasks into scheduled and unscheduled
  const { scheduled, unscheduled } = useMemo(() => {
    const withTime: Task[] = []
    const withoutTime: Task[] = []

    for (const task of tasks) {
      if (task.dueTime) {
        withTime.push(task)
      } else {
        withoutTime.push(task)
      }
    }

    return { scheduled: withTime, unscheduled: withoutTime }
  }, [tasks])

  // Calculate positioned tasks with overlap handling
  const positionedTasks = useMemo(
    () => detectOverlaps(scheduled, hourHeight),
    [scheduled, hourHeight]
  )

  // Current time indicator
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const nowY = ((currentHour - START_HOUR) + currentMinute / 60) * hourHeight
  const showNowIndicator = currentHour >= START_HOUR && currentHour < END_HOUR

  // Scroll to current time on mount
  useEffect(() => {
    const scrollToY = Math.max(0, nowY - 100)
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: scrollToY, animated: false })
    }, 100)
  }, [nowY])

  // Hour labels
  const hours = useMemo(() => {
    const result = []
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      result.push(h)
    }
    return result
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback((taskId: string, newY: number) => {
    if (onReschedule) {
      const newTime = yPositionToTime(newY, hourHeight)
      onReschedule(taskId, newTime)
    }
    setDraggingTask(null)
  }, [onReschedule, hourHeight])

  return (
    <View style={styles.container}>
      {/* Unscheduled tasks section */}
      {!hideUnscheduled && unscheduled.length > 0 && (
        <View style={[styles.unscheduledSection, { borderColor: tokens.borderPrimary }]}>
          <View style={styles.unscheduledHeader}>
            <Clock size={14} color={tokens.textMuted} />
            <Text style={[styles.unscheduledTitle, { color: tokens.textMuted }]}>
              Unscheduled ({unscheduled.length})
            </Text>
          </View>
          {unscheduled.map((task) => (
            <UnscheduledTaskItem
              key={task.id}
              task={task}
              onToggle={() => onToggle(task.id)}
              onPress={() => onPress(task.id)}
              getTopicColor={getTopicColor}
              tokens={tokens}
              compact={compact}
            />
          ))}
        </View>
      )}

      {/* Timeline */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { minHeight: timelineHeight + 40 }]}
        scrollEnabled={!draggingTask}
        nestedScrollEnabled={true}
      >
        <View style={[styles.timelineContainer, { minHeight: timelineHeight }]}>
          {/* Hour labels column */}
          <View style={styles.hoursColumn}>
            {hours.map((hour) => (
              <View key={hour} style={[styles.hourRow, { height: hourHeight }]}>
                <Text style={[styles.hourLabel, { color: tokens.textMuted }]}>
                  {formatHour(hour)}
                </Text>
              </View>
            ))}
          </View>

          {/* Timeline grid + tasks */}
          <View
            style={styles.gridContainer}
            onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
          >
            {/* Hour lines with half-hour dotted lines */}
            {hours.map((hour, idx) => (
              <View key={hour} style={[styles.hourBlock, { height: hourHeight }]}>
                {/* Solid hour line at top */}
                <View style={[styles.hourLine, { borderBottomColor: tokens.borderPrimary }]} />
                {/* Dotted half-hour line in the middle */}
                {idx < hours.length - 1 && (
                  <View style={[styles.halfHourLine, { borderBottomColor: tokens.borderPrimary }]} />
                )}
              </View>
            ))}

            {/* Now indicator */}
            {showNowIndicator && (
              <View style={[styles.nowIndicator, { top: nowY }]}>
                <View style={[styles.nowDot, { backgroundColor: tokens.accentRed }]} />
                <View style={[styles.nowLine, { backgroundColor: tokens.accentRed }]} />
              </View>
            )}

            {/* Task cards */}
            {gridWidth > 0 && positionedTasks.map((positioned) => (
              <TimelineTaskCard
                key={positioned.task.id}
                positioned={positioned}
                onToggle={() => onToggle(positioned.task.id)}
                onPress={() => onPress(positioned.task.id)}
                onDragStart={() => setDraggingTask(positioned.task.id)}
                onDragEnd={(newY) => handleDragEnd(positioned.task.id, newY)}
                getTopicColor={getTopicColor}
                tokens={tokens}
                containerWidth={gridWidth}
                hourHeight={hourHeight}
                isDraggable={!!onReschedule}
                compact={compact}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// ── Timeline Task Card ─────────────────────────────────────────────────────────

interface TimelineTaskCardProps {
  positioned: PositionedTask
  onToggle: () => void
  onPress: () => void
  onDragStart: () => void
  onDragEnd: (newY: number) => void
  getTopicColor: (topic: string) => string
  tokens: Tokens
  containerWidth: number
  hourHeight: number
  isDraggable: boolean
  compact: boolean
}

function TimelineTaskCard({
  positioned,
  onToggle,
  onPress,
  onDragStart,
  onDragEnd,
  getTopicColor,
  tokens,
  containerWidth,
  hourHeight,
  isDraggable,
  compact,
}: TimelineTaskCardProps) {
  const { task, top, height, left, width } = positioned
  const topicColor = getTopicColor(task.topic)
  const timeLabel = getTimeRangeLabel(task.dueTime, task.duration)
  const isCompact = compact || height < 56
  const totalColumns = positioned.totalColumns

  // Calculate pixel values from percentages
  const gap = 0 // No gap between overlapping tasks
  const leftPx = left * containerWidth
  const widthPx = width * containerWidth
  const verticalPadding = 0 // No gap - align with hour lines

  // Adaptive display mode based on number of columns
  // 1 col: Full (title + time + checkbox)
  // 2 cols: Medium (title + checkbox)
  // 3 cols: Compact (title only, smaller)
  // 4+ cols: Mini (short text with ellipsis)
  const displayMode = totalColumns === 1 ? 'full'
    : totalColumns === 2 ? 'medium'
      : totalColumns === 3 ? 'compact'
        : 'mini'

  // Checkbox size based on display mode
  const checkboxSize = displayMode === 'mini' ? 16 : displayMode === 'compact' ? 18 : isCompact ? 20 : 22

  // Long-press tooltip state for mobile mini mode
  const [showTooltip, setShowTooltip] = useState(false)

  // Handle long press for mobile tooltip
  const handleLongPress = useCallback(() => {
    if (displayMode === 'mini' && Platform.OS !== 'web') {
      setShowTooltip(true)
      // Auto-hide after 2 seconds
      setTimeout(() => setShowTooltip(false), 2000)
    }
  }, [displayMode])

  // Drag animation
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const [isDragging, setIsDragging] = useState(false)

  const panResponder = useMemo(() => {
    if (!isDraggable) return null

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only start drag if moving vertically more than horizontally
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
      },
      onPanResponderGrant: () => {
        setIsDragging(true)
        onDragStart()
        pan.setOffset({ x: 0, y: 0 })
        pan.setValue({ x: 0, y: 0 })
      },
      onPanResponderMove: Animated.event(
        [null, { dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        setIsDragging(false)
        pan.flattenOffset()
        const newY = top + gestureState.dy
        // Snap to 15-minute intervals
        const snappedY = Math.round(newY / (hourHeight / 4)) * (hourHeight / 4)
        const clampedY = Math.max(0, Math.min((END_HOUR - START_HOUR) * hourHeight - height, snappedY))
        onDragEnd(clampedY)
        pan.setValue({ x: 0, y: 0 })
      },
      onPanResponderTerminate: () => {
        setIsDragging(false)
        pan.setValue({ x: 0, y: 0 })
      },
    })
  }, [isDraggable, onDragStart, onDragEnd, pan, top, height, hourHeight])

  const animatedStyle = isDraggable ? {
    transform: [{ translateY: pan.y }],
  } : {}

  const CardWrapper = isDraggable ? Animated.View : View

  // Get first letter of task title for mini mode
  const firstLetter = task.title.charAt(0).toUpperCase()

  return (
    <CardWrapper
      style={[
        {
          position: 'absolute',
          top: top + verticalPadding,
          left: leftPx,
          width: widthPx,
          height: Math.max(height - (verticalPadding * 2), 36), // Ensure minimum visible height
          paddingHorizontal: 2,
          zIndex: isDragging || showTooltip ? 1000 : 1,
        },
        animatedStyle,
      ]}
      {...(panResponder?.panHandlers || {})}
    >
      {/* Mobile tooltip for mini mode */}
      {showTooltip && Platform.OS !== 'web' && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -48,
            left: 0,
            right: 0,
            backgroundColor: tokens.bgPrimary,
            borderRadius: 8,
            padding: 8,
            borderWidth: 1,
            borderColor: tokens.borderPrimary,
            zIndex: 1001,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
              },
              android: {
                elevation: 8,
              },
            }),
          } as any}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.textPrimary }} numberOfLines={2}>
            {task.title}
          </Text>
          {timeLabel && (
            <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 2 }}>
              {timeLabel}
            </Text>
          )}
        </View>
      )}
      <Pressable
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={300}
        style={({ pressed }) => [
          {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 0,
            backgroundColor: `${topicColor}25`,
            borderLeftWidth: displayMode === 'mini' ? 4 : 5,
            borderLeftColor: topicColor,
            overflow: 'hidden',
            opacity: task.completed ? 0.6 : pressed ? 0.8 : 1,
            // Subtle shadow for depth
            ...Platform.select({
              ios: {
                shadowColor: topicColor,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDragging ? 0.25 : 0.12,
                shadowRadius: isDragging ? 8 : 4,
              },
              android: {
                elevation: isDragging ? 8 : 2,
              },
              web: {
                boxShadow: isDragging
                  ? `0 4px 12px ${topicColor}30`
                  : `0 1px 4px ${topicColor}18`,
              },
            }),
          } as any,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Edit task: ${task.title}`}
      >
        {/* MINI MODE: Short text with ellipsis + tooltip/long-press */}
        {displayMode === 'mini' && (
          <View
            style={{ flex: 1, justifyContent: 'center', paddingVertical: 4, paddingHorizontal: 6 }}
            {...(Platform.OS === 'web' ? { title: `${task.title}${timeLabel ? `\n${timeLabel}` : ''}` } : {})}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: task.completed ? tokens.textMuted : tokens.textPrimary,
                textDecorationLine: task.completed ? 'line-through' : 'none',
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {task.title}
            </Text>
          </View>
        )}

        {/* COMPACT MODE: Title only, smaller font */}
        {displayMode === 'compact' && (
          <View style={{ flex: 1, paddingVertical: 6, paddingLeft: 8, paddingRight: 4, justifyContent: 'center' }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: task.completed ? tokens.textMuted : tokens.textPrimary,
                textDecorationLine: task.completed ? 'line-through' : 'none',
                lineHeight: 16,
              }}
              numberOfLines={2}
            >
              {task.title}
            </Text>
          </View>
        )}

        {/* MEDIUM MODE: Title + checkbox */}
        {displayMode === 'medium' && (
          <>
            <View style={{ flex: 1, paddingVertical: 8, paddingLeft: 10, paddingRight: 4, justifyContent: 'center' }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: task.completed ? tokens.textMuted : tokens.textPrimary,
                  textDecorationLine: task.completed ? 'line-through' : 'none',
                  lineHeight: 18,
                }}
                numberOfLines={2}
              >
                {task.title}
              </Text>
            </View>
            <Pressable
              onPress={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              hitSlop={8}
              style={{
                paddingHorizontal: 8,
                justifyContent: 'center',
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: task.completed }}
            >
              <View
                style={{
                  width: checkboxSize,
                  height: checkboxSize,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: topicColor,
                  backgroundColor: task.completed ? topicColor : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {task.completed && (
                  <Check size={12} color="#fff" strokeWidth={3} />
                )}
              </View>
            </Pressable>
          </>
        )}

        {/* FULL MODE: Title + time + checkbox */}
        {displayMode === 'full' && (
          <>
            <View style={{ flex: 1, paddingVertical: isCompact ? 8 : 12, paddingLeft: 14, paddingRight: 8, justifyContent: 'center' }}>
              {/* Title */}
              <Text
                style={{
                  fontSize: isCompact ? 14 : 16,
                  fontWeight: '600',
                  color: task.completed ? tokens.textMuted : tokens.textPrimary,
                  textDecorationLine: task.completed ? 'line-through' : 'none',
                  lineHeight: isCompact ? 18 : 22,
                }}
                numberOfLines={isCompact ? 1 : 2}
              >
                {task.title}
              </Text>

              {/* Time label below title */}
              {timeLabel && (
                <Text
                  style={{
                    fontSize: isCompact ? 11 : 13,
                    fontWeight: '500',
                    color: tokens.textMuted,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {timeLabel}
                </Text>
              )}
            </View>

            {/* Square Checkbox on the right */}
            <Pressable
              onPress={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              hitSlop={8}
              style={{
                paddingHorizontal: 12,
                justifyContent: 'center',
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: task.completed }}
            >
              <View
                style={{
                  width: checkboxSize,
                  height: checkboxSize,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: topicColor,
                  backgroundColor: task.completed ? topicColor : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {task.completed && (
                  <Check size={isCompact ? 12 : 14} color="#fff" strokeWidth={3} />
                )}
              </View>
            </Pressable>
          </>
        )}
      </Pressable>
    </CardWrapper>
  )
}

// ── Unscheduled Task Item ──────────────────────────────────────────────────────

interface UnscheduledTaskItemProps {
  task: Task
  onToggle: () => void
  onPress: () => void
  getTopicColor: (topic: string) => string
  tokens: Tokens
  compact?: boolean
}

function UnscheduledTaskItem({
  task,
  onToggle,
  onPress,
  getTopicColor,
  tokens,
  compact = false,
}: UnscheduledTaskItemProps) {
  const topicColor = getTopicColor(task.topic)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: compact ? 8 : 10,
        paddingHorizontal: 12,
        marginHorizontal: 4,
        marginVertical: 2,
        borderRadius: 10,
        backgroundColor: pressed ? `${topicColor}10` : tokens.bgPrimary,
        opacity: task.completed ? 0.5 : 1,
        // Subtle shadow
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
          },
          android: { elevation: 1 },
          web: { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
        }),
      } as any)}
      accessibilityRole="button"
    >
      {/* Topic indicator */}
      <View
        style={{
          width: 4,
          height: compact ? 20 : 24,
          borderRadius: 2,
          backgroundColor: topicColor,
          marginRight: 10,
        }}
      />

      {/* Checkbox */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        hitSlop={8}
        style={{ marginRight: 10 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
      >
        {task.completed ? (
          <CheckCircle2 size={compact ? 16 : 18} color={tokens.accentGreen} />
        ) : (
          <Circle size={compact ? 16 : 18} color={tokens.textMuted} />
        )}
      </Pressable>

      {/* Title */}
      <Text
        style={{
          flex: 1,
          fontSize: compact ? 13 : 14,
          fontWeight: '500',
          color: task.completed ? tokens.textMuted : tokens.textPrimary,
          textDecorationLine: task.completed ? 'line-through' : 'none',
        }}
        numberOfLines={1}
      >
        {task.title}
      </Text>
    </Pressable>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function makeStyles(tokens: Tokens, hourHeight: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    unscheduledSection: {
      borderBottomWidth: 1,
      paddingBottom: 8,
      marginBottom: 8,
    },
    unscheduledHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    unscheduledTitle: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 10,
      paddingBottom: 40,
    },
    timelineContainer: {
      flexDirection: 'row',
    },
    hoursColumn: {
      width: 52,
      paddingRight: 4,
    },
    hourRow: {
      justifyContent: 'flex-start',
      paddingTop: 0,
    },
    hourLabel: {
      fontSize: 11,
      fontWeight: '500',
      textAlign: 'right',
      marginTop: -7,
    },
    gridContainer: {
      flex: 1,
      position: 'relative',
    },
    hourBlock: {
      position: 'relative',
    },
    hourLine: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    halfHourLine: {
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      height: 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderStyle: 'dashed',
      opacity: 0.5,
    },
    nowIndicator: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 100,
    },
    nowDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginLeft: -5,
    },
    nowLine: {
      flex: 1,
      height: 2,
    },
  })
}

export default DayTimeline
