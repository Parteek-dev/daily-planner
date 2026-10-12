/**
 * TimeBlockView — hourly timeline from 06:00 to 23:00.
 *
 * - Scrollable hourly timeline with tasks rendered as colored blocks.
 * - Block height is proportional to task duration (1 min = 1 dp, min 24 dp).
 * - Current-time indicator shown when today's date is selected.
 * - Tasks without dueTime or outside 06:00–23:00 → "Unscheduled" section.
 * - Tap a task block → onEditTask(task).
 *
 * Requirements: 13.1–13.6
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Clock } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string
  title: string
  dueTime?: string   // 'HH:MM'
  duration?: number  // minutes
  topic?: string
  completed?: boolean
  date?: string
  priority?: string
  [key: string]: unknown
}

export interface TimeBlockViewProps {
  readonly tasks: Task[]
  readonly date: string                                         // 'YYYY-MM-DD'
  readonly onEditTask: (task: Task) => void
  readonly getTopicColor: (topic: string) => string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HOUR_START    = 6    // 06:00
const HOUR_END      = 23   // up to 23:59
const HOUR_HEIGHT   = 60   // dp per hour
const MIN_HEIGHT    = 24   // dp
const TIME_COL_W    = 52   // width of the HH:MM label column

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert 'HH:MM' to fractional hours (e.g. '06:30' → 6.5) */
function toFractionalHour(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h + m / 60
}

/** Is the time within [06:00, 23:00)? */
function inRange(time: string): boolean {
  const fh = toFractionalHour(time)
  return fh >= HOUR_START && fh < HOUR_END
}

/** Format 'HH:MM' to 12h label e.g. '3 PM' */
function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12  = hour % 12 || 12
  return `${h12} ${ampm}`
}

/** Return today's date as 'YYYY-MM-DD' */
function todayStr(): string {
  return new Date().toLocaleDateString('en-CA')
}

// ── Current-time indicator ────────────────────────────────────────────────────

function useCurrentTimeOffset() {
  const [offsetDp, setOffsetDp] = useState<number | null>(null)

  useEffect(() => {
    function calc() {
      const now  = new Date()
      const fh   = now.getHours() + now.getMinutes() / 60
      if (fh >= HOUR_START && fh < HOUR_END) {
        setOffsetDp((fh - HOUR_START) * HOUR_HEIGHT)
      } else {
        setOffsetDp(null)
      }
    }

    calc()
    const id = setInterval(calc, 60_000) // refresh every minute
    return () => clearInterval(id)
  }, [])

  return offsetDp
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TimeBlockView({
  tasks,
  date,
  onEditTask,
  getTopicColor,
}: TimeBlockViewProps) {
  const { tokens } = useTheme()
  const scrollRef  = useRef<ScrollView>(null)
  const timeOffset = useCurrentTimeOffset()
  const isToday    = date === todayStr()

  // Separate tasks into scheduled (in range) vs unscheduled
  const scheduledTasks   = tasks.filter(t => t.dueTime && inRange(t.dueTime))
  const unscheduledTasks = tasks.filter(t => !t.dueTime || !inRange(t.dueTime))

  // Sort unscheduled by title alphabetically (Req 13.3)
  const sortedUnscheduled = [...unscheduledTasks].sort((a, b) =>
    (a.title ?? '').localeCompare(b.title ?? '')
  )

  // Auto-scroll to current time or 08:00 on mount
  useEffect(() => {
    const targetHour = isToday && timeOffset !== null ? timeOffset : (8 - HOUR_START) * HOUR_HEIGHT
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, targetHour - 80), animated: true })
    }, 300)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const styles = makeStyles(tokens)

  // ── Hour rows ──────────────────────────────────────────────────────────────
  const hours: number[] = []
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h)

  const timelineHeight = (HOUR_END - HOUR_START + 1) * HOUR_HEIGHT

  return (
    <View style={styles.root}>

      {/* ── Scrollable timeline ── */}
      <ScrollView ref={scrollRef} style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={[styles.timeline, { height: timelineHeight }]}>

          {/* Hour labels + grid lines */}
          {hours.map(h => (
            <View
              key={h}
              style={[styles.hourRow, { top: (h - HOUR_START) * HOUR_HEIGHT }]}
            >
              <Text style={styles.hourLabel}>{formatHour(h)}</Text>
              <View style={styles.gridLine} />
            </View>
          ))}

          {/* Current-time indicator (Req 13.5) */}
          {isToday && timeOffset !== null && (
            <View style={[styles.currentTimeLine, { top: timeOffset }]}>
              <View style={styles.currentTimeDot} />
            </View>
          )}

          {/* Task blocks (Req 13.2) */}
          <View style={[styles.blocksColumn, { height: timelineHeight }]}>
            {scheduledTasks.map(task => {
              const fh      = toFractionalHour(task.dueTime!)
              const top     = (fh - HOUR_START) * HOUR_HEIGHT
              const rawH    = (task.duration ?? 0) // minutes → dp (1 min = 1 dp)
              const height  = Math.max(MIN_HEIGHT, rawH)
              const color   = getTopicColor(task.topic ?? '')

              return (
                <Pressable
                  key={task.id}
                  onPress={() => onEditTask(task)}
                  style={({ pressed }) => [
                    styles.taskBlock,
                    {
                      top,
                      height,
                      backgroundColor: `${color}22`,
                      borderLeftColor: color,
                      opacity: pressed ? 0.75 : task.completed ? 0.55 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${task.title}, ${task.dueTime}`}
                >
                  <Text style={[styles.blockTitle, { color }]} numberOfLines={height < 36 ? 1 : 2}>
                    {task.title}
                  </Text>
                  {height >= 40 && task.dueTime ? (
                    <Text style={[styles.blockTime, { color }]}>{task.dueTime}</Text>
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        </View>
      </ScrollView>

      {/* ── Unscheduled section (Req 13.3, 13.4) ── */}
      {sortedUnscheduled.length > 0 && (
        <View style={styles.unscheduledSection}>
          <View style={styles.unscheduledHeader}>
            <Clock size={14} color={tokens.textMuted} />
            <Text style={styles.unscheduledTitle}>
              Unscheduled ({sortedUnscheduled.length})
            </Text>
          </View>

          {sortedUnscheduled.map(task => {
            const color = getTopicColor(task.topic ?? '')
            return (
              <Pressable
                key={task.id}
                onPress={() => onEditTask(task)}
                style={({ pressed }) => [
                  styles.unscheduledItem,
                  {
                    borderLeftColor: color,
                    opacity: pressed ? 0.7 : task.completed ? 0.55 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={task.title}
              >
                <Text style={styles.unscheduledItemTitle} numberOfLines={1}>
                  {task.title}
                </Text>
                {task.duration ? (
                  <Text style={styles.unscheduledItemMeta}>
                    {task.duration < 60
                      ? `${task.duration}m`
                      : `${Math.floor(task.duration / 60)}h${task.duration % 60 ? ` ${task.duration % 60}m` : ''}`}
                  </Text>
                ) : null}
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: tokens.bgPrimary,
    },
    scrollArea: {
      flex: 1,
    },
    timeline: {
      position: 'relative',
      marginLeft: 8,
    },
    hourRow: {
      position:   'absolute',
      left:       0,
      right:      0,
      flexDirection: 'row',
      alignItems: 'center',
      height:     HOUR_HEIGHT,
    },
    hourLabel: {
      width:     TIME_COL_W,
      fontSize:  11,
      color:     tokens.textMuted,
      textAlign: 'right',
      paddingRight: 10,
    },
    gridLine: {
      flex:            1,
      height:          StyleSheet.hairlineWidth,
      backgroundColor: tokens.borderPrimary,
    },
    currentTimeLine: {
      position:  'absolute',
      left:      TIME_COL_W + 2,
      right:     8,
      height:    2,
      backgroundColor: tokens.accentRed,
      zIndex:    10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    currentTimeDot: {
      width:           8,
      height:          8,
      borderRadius:    4,
      backgroundColor: tokens.accentRed,
      marginLeft:      -4,
    },
    blocksColumn: {
      position:  'absolute',
      left:      TIME_COL_W + 8,
      right:     8,
    },
    taskBlock: {
      position:     'absolute',
      left:         0,
      right:        0,
      borderRadius: 6,
      borderLeftWidth: 3,
      paddingHorizontal: 8,
      paddingVertical:   4,
      overflow:     'hidden',
    },
    blockTitle: {
      fontSize:   12,
      fontWeight: '600',
    },
    blockTime: {
      fontSize: 10,
      marginTop: 2,
      opacity:   0.8,
    },
    // ── Unscheduled section ──
    unscheduledSection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: tokens.borderPrimary,
      paddingHorizontal: 12,
      paddingVertical:   12,
    },
    unscheduledHeader: {
      flexDirection:  'row',
      alignItems:     'center',
      gap:            6,
      marginBottom:   8,
    },
    unscheduledTitle: {
      fontSize:   12,
      fontWeight: '700',
      color:      tokens.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    unscheduledItem: {
      flexDirection:    'row',
      alignItems:       'center',
      justifyContent:   'space-between',
      paddingVertical:   8,
      paddingHorizontal: 10,
      borderLeftWidth:   3,
      borderRadius:      6,
      backgroundColor:   tokens.bgInput,
      marginBottom:      6,
    },
    unscheduledItemTitle: {
      flex:       1,
      fontSize:   13,
      fontWeight: '500',
      color:      tokens.textPrimary,
    },
    unscheduledItemMeta: {
      fontSize: 11,
      color:    tokens.textMuted,
      marginLeft: 8,
    },
  })
}
