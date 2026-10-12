/**
 * Calendar screen — Month view + Week view with a toggle.
 *
 * Redesigned with a clean "Your schedule" card layout:
 * - Monday-first grid with grayed prev/next month dates shown
 * - Colored cell border + dot indicator by task status (no count badge text)
 * - Today highlighted with a filled blue cell
 * - Minimal card-based aesthetic matching the design system
 *
 * Web (>768 px):
 *   Month: Left panel (calendar card) + right panel (day detail + notes)
 *   Week:  Day-strip header + task list for selected day
 *
 * Mobile / narrow web:
 *   Month: Calendar card + inline day panel below
 *   Week:  Day-strip header + task list inline
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  Platform,
} from 'react-native'
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Edit3,
  Trash2,
  Repeat,
  ListChecks,
  Flag,
  CalendarDays,
  CalendarCheck,
  List,
} from 'lucide-react-native'

import { useAuth } from '@/src/hooks/useAuth'
import SegmentedToggle from '@/src/components/SegmentedToggle'
import { useProgress } from '@/src/hooks/useProgress'
import { useTheme } from '@/src/hooks/useTheme'
import { useMobileHeader } from '@/src/context/MobileHeaderContext'
import { useAddTaskModal } from '@/src/context/AddTaskModalContext'
import DailyNotes from '@/src/components/DailyNotes'
import { fmtDuration } from '@/src/lib/utils'
import type { Task } from '@/src/lib/firestoreMappers'
import { UnifiedTaskItem } from '@/src/components/task/UnifiedTaskItem'
import { DayTimeline } from '@/src/components/task/DayTimeline'
import { CrossfadeView } from '@/src/components/motion'

// ── Constants ──────────────────────────────────────────────────────────────────

const CALENDAR_JUMP_KEY = 'calendar_jump_date'
const SWIPE_THRESHOLD = 60
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
// Monday-first column order
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SIDEBAR_BREAKPOINT = 768

// ── Date helpers ───────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

/** Each cell carries its date and whether it belongs to the current month. */
interface GridCell {
  dateStr: string
  isCurrentMonth: boolean
}

interface MonthInfo {
  year: number
  month: number
  cells: GridCell[]
}

/**
 * Build a Monday-first calendar grid.
 * Leading and trailing cells are filled with real dates from the adjacent
 * months so the grid always shows complete weeks.
 */
function buildMonthGrid(year: number, month: number): MonthInfo {
  const firstDayOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Monday-first offset: Mon=0, Tue=1, … Sun=6
  const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7

  const cells: GridCell[] = []

  // Leading days from the previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    // new Date(year, month, 0) = last day of prev month; negative index walks back
    cells.push({ dateStr: toIso(new Date(year, month, -i)), isCurrentMonth: false })
  }

  // Days of the current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: true,
    })
  }

  // Trailing days from the next month to complete the last row
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7
  for (let d = 1; d <= totalCells - cells.length; d++) {
    cells.push({ dateStr: toIso(new Date(year, month + 1, d)), isCurrentMonth: false })
  }

  return { year, month, cells }
}

function addMonths(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

// ── Week-view helpers ──────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function formatMonthRange(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(weekStart + 'T12:00:00')
  end.setDate(end.getDate() + 6)
  if (start.getMonth() === end.getMonth()) {
    return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  return `${start.toLocaleDateString('en-US', { month: 'short' })} – ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
}

// ── Priority color helper — uses tokens, never hardcoded hex ──────────────────

function getPriorityColor(
  priority: string | null | undefined,
  tokens: ReturnType<typeof useTheme>['tokens'],
): string {
  if (priority === 'high') return tokens.accentRed
  if (priority === 'medium') return tokens.accentOrange
  if (priority === 'low') return tokens.accentGreen
  return tokens.textMuted
}

// ── Week-view sub-components ───────────────────────────────────────────────────

function WeekDayHeader({
  dayName, dateStr, isToday, isSelected, hasTasks, allDone, hasOverdue, isFuture, onPress, tokens, showDayName = true, flex = false,
}: Readonly<{
  dayName: string; dateStr: string; isToday: boolean; isSelected: boolean
  hasTasks: boolean; allDone: boolean; hasOverdue: boolean; isFuture: boolean
  onPress: () => void
  tokens: ReturnType<typeof useTheme>['tokens']
  showDayName?: boolean
  flex?: boolean
}>) {
  const date = Number.parseInt(dateStr.split('-')[2], 10)

  // Dot color logic: green = all done, red = overdue, blue = future tasks
  let dotColor: string | null = null
  if (hasTasks) {
    if (allDone) {
      dotColor = tokens.accentGreen
    } else if (hasOverdue) {
      dotColor = tokens.accentRed
    } else if (isFuture) {
      dotColor = tokens.accentBlue
    }
  }

  // Extract nested ternary to variable for text color
  const getDateTextColor = (): string => {
    if (isSelected) return tokens.accentPrimary
    if (isToday) return tokens.accentBlue
    return tokens.textPrimary
  }
  const dateTextColor = getDateTextColor()

  return (
    <Pressable
      onPress={onPress}
      style={[weekHeaderSt.header, flex && { flex: 1 }]}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      {showDayName && (
        <Text style={[weekHeaderSt.dayName, { color: tokens.textMuted }]}>
          {dayName}
        </Text>
      )}
      {/* Circular container for date — matches month view styling */}
      <View style={[
        weekHeaderSt.dateCircle,
        isToday && { backgroundColor: `${tokens.accentBlue}18` },
        isSelected && !isToday && { backgroundColor: tokens.accentPrimaryLight },
      ]}>
        <Text style={[weekHeaderSt.dayDate, {
          color: dateTextColor,
          fontWeight: isSelected || isToday ? '700' : '500',
        }]}>
          {date}
        </Text>
      </View>
      {/* Simple dot indicator */}
      {dotColor && (
        <View style={[weekHeaderSt.dot, { backgroundColor: dotColor }]} />
      )}
    </Pressable>
  )
}

function WeekTaskRow({
  task, onToggle, onPress, tokens,
}: Readonly<{
  task: Task; onToggle: () => void; onPress: () => void
  tokens: ReturnType<typeof useTheme>['tokens']
}>) {
  return (
    <Pressable
      onPress={onPress}
      style={[weekRowSt.row, {
        backgroundColor: tokens.bgSecondary,
        borderColor: tokens.borderPrimary,
        opacity: task.completed ? 0.6 : 1,
      }]}
      accessibilityRole="button"
    >
      <Pressable onPress={onToggle} hitSlop={8} accessibilityRole="checkbox">
        {task.completed
          ? <CheckCircle2 size={16} color={tokens.accentGreen} />
          : <Circle size={16} color={tokens.textMuted} />}
      </Pressable>
      <Text
        style={[weekRowSt.title, {
          color: tokens.textPrimary,
          textDecorationLine: task.completed ? 'line-through' : 'none',
        }]}
        numberOfLines={1}
      >
        {task.title}
      </Text>
      {Boolean(task.priority) && (
        <Flag size={11} color={getPriorityColor(task.priority, tokens)} style={{ flexShrink: 0 }} />
      )}
      {task.duration > 0 && (
        <Text style={[weekRowSt.duration, { color: tokens.textMuted }]}>
          {fmtDuration(task.duration)}
        </Text>
      )}
    </Pressable>
  )
}

// ── Helper to compute dot color ────────────────────────────────────────────────

function getDotColor(
  hasTasks: boolean,
  allDone: boolean,
  hasOverdue: boolean,
  isFuture: boolean,
  tokens: ReturnType<typeof useTheme>['tokens'],
): string | null {
  if (!hasTasks) return null
  if (allDone) return tokens.accentGreen
  if (hasOverdue) return tokens.accentRed
  if (isFuture) return tokens.accentBlue
  return null
}

// ── Day detail panel ───────────────────────────────────────────────────────────

interface DayPanelProps {
  readonly selectedDate: string | null
  readonly tasks: Task[]
  readonly tokens: ReturnType<typeof useTheme>['tokens']
  readonly onToggle: (id: string) => void
  readonly onEdit: (id: string) => void
  readonly onDelete: (id: string) => void
  readonly onAdd: () => void
  readonly getTopicColor: (topic: string) => string
  readonly getNote: (date: string) => string
  readonly setNote: (date: string, text: string) => void
  readonly onReschedule?: (id: string, newTime: string) => void
}

function DayPanel({
  selectedDate, tasks, tokens, onToggle, onEdit, onDelete, onAdd,
  getTopicColor, getNote, setNote, onReschedule,
}: DayPanelProps) {
  const ps = makePanelStyles(tokens)
  const [panelViewMode, setPanelViewMode] = useState<'list' | 'timeline'>('list')

  if (!selectedDate) {
    return (
      <View style={[ps.empty, { backgroundColor: tokens.bgPrimary }]}>
        <Text style={[ps.emptyText, { color: tokens.textMuted }]}>
          Select a date to see tasks
        </Text>
      </View>
    )
  }

  const d = new Date(selectedDate + 'T12:00:00')
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })
  const dateName = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const today = getToday()
  const isOverdue = (t: Task) => !t.completed && t.date < today && t.date === selectedDate

  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return 0
  })

  const note = getNote(selectedDate)

  return (
    <ScrollView
      style={[ps.panel, { backgroundColor: tokens.bgPrimary }]}
      contentContainerStyle={ps.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={ps.panelHeader}>
        <View>
          <Text style={[ps.dayLabel, { color: tokens.textMuted }]}>{dayName}</Text>
          <Text style={[ps.dateLabel, { color: tokens.textPrimary }]}>{dateName}</Text>
        </View>
        <View style={ps.panelActions}>
          {/* View toggle */}
          <View style={[ps.viewToggle, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
            <Pressable
              onPress={() => setPanelViewMode('list')}
              style={[
                ps.viewToggleBtn,
                panelViewMode === 'list' && { backgroundColor: tokens.bgPrimary },
              ]}
              accessibilityRole="button"
              accessibilityLabel="List view"
            >
              <List size={12} color={panelViewMode === 'list' ? tokens.accentPrimary : tokens.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => setPanelViewMode('timeline')}
              style={[
                ps.viewToggleBtn,
                panelViewMode === 'timeline' && { backgroundColor: tokens.bgPrimary },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Timeline view"
            >
              <CalendarDays size={12} color={panelViewMode === 'timeline' ? tokens.accentPrimary : tokens.textMuted} />
            </Pressable>
          </View>
          <Pressable
            onPress={onAdd}
            style={[ps.addBtn, { backgroundColor: tokens.accentPrimaryMuted }]}
            accessibilityRole="button"
            accessibilityLabel="Add task for this date"
          >
            <Plus size={16} color={tokens.accentPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Task list or empty state */}
      {sorted.length === 0 ? (
        <View style={ps.emptySchedule}>
          <Text style={[ps.emptyScheduleText, { color: tokens.textMuted }]}>
            Nothing's on the schedule
          </Text>
        </View>
      ) : (
        <CrossfadeView viewKey={panelViewMode} duration="fast">
          {panelViewMode === 'timeline' ? (
            <View style={ps.timelineWrapper}>
              <DayTimeline
                tasks={sorted}
                onToggle={onToggle}
                onPress={onEdit}
                onReschedule={onReschedule}
                getTopicColor={getTopicColor}
                hourHeight={72}
                compact
                hideUnscheduled={false}
              />
            </View>
          ) : (
            <View style={ps.taskList}>
              {sorted.map((task, idx) => (
                <UnifiedTaskItem
                  key={task.id}
                  task={task}
                  onToggle={() => onToggle(task.id)}
                  onPress={() => onEdit(task.id)}
                  onDelete={() => onDelete(task.id)}
                  getTopicColor={getTopicColor}
                  showActions={true}
                  isOverdue={isOverdue(task)}
                  showSeparator={idx < sorted.length - 1}
                />
              ))}
            </View>
          )}
        </CrossfadeView>
      )}

    </ScrollView>
  )
}

// ── Month calendar cell ────────────────────────────────────────────────────────

interface MonthCellProps {
  readonly cell: GridCell
  readonly index: number
  readonly stats: { completed: number; total: number } | undefined
  readonly today: string
  readonly selectedDate: string
  readonly isWide: boolean
  readonly tokens: ReturnType<typeof useTheme>['tokens']
  readonly styles: ReturnType<typeof makeStyles>
  readonly onPress: (dateStr: string, isCurrentMonth: boolean) => void
}

function MonthCell({
  cell, index, stats, today, selectedDate, isWide, tokens, styles, onPress,
}: MonthCellProps) {
  const { dateStr, isCurrentMonth: isCurMo } = cell
  const isToday = dateStr === today
  const isSel = dateStr === selectedDate
  const hasTasks = Boolean(stats && stats.total > 0)
  const allDone = hasTasks && stats!.completed === stats!.total
  const hasOverdue = hasTasks && !allDone && dateStr < today
  const isFuture = dateStr > today
  const day = Number.parseInt(dateStr.split('-')[2], 10)
  const dotColor = getDotColor(hasTasks, allDone, hasOverdue, isFuture, tokens)

  return (
    <Pressable
      key={`${dateStr}-${index}`}
      onPress={() => onPress(dateStr, isCurMo)}
      style={({ pressed }: { pressed: boolean }) => [
        styles.cell,
        isWide && styles.cellWide,
        !isCurMo && styles.cellOtherMonth,
        pressed && { opacity: 0.6 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${dateStr}: ${stats?.total ?? 0} tasks`}
      accessibilityState={{ selected: isSel }}
    >
      {({ hovered }: { hovered?: boolean }) => (
        <>
          <View style={[
            styles.cellInner,
            isWide && styles.cellInnerWide,
            isToday && styles.cellToday,
            isSel && !isToday && styles.cellSelected,
            Platform.OS === 'web' && hovered && !isSel && !isToday && {
              backgroundColor: `${tokens.accentBlue}12`,
            },
          ]}>
            <Text style={[
              styles.cellDay,
              !isCurMo && { color: tokens.textMuted },
              isSel && { color: tokens.accentPrimary, fontWeight: '700' },
              isToday && !isSel && { color: tokens.accentBlue, fontWeight: '700' },
            ]}>
              {day}
            </Text>
          </View>
          {dotColor && (
            <View style={[styles.cellDot, { backgroundColor: dotColor }]} />
          )}
        </>
      )}
    </Pressable>
  )
}

// ── Mobile month cell ──────────────────────────────────────────────────────────

interface MobileMonthCellProps {
  readonly cell: GridCell
  readonly index: number
  readonly stats: { completed: number; total: number } | undefined
  readonly today: string
  readonly selectedDate: string
  readonly tokens: ReturnType<typeof useTheme>['tokens']
  readonly styles: ReturnType<typeof makeStyles>
  readonly onPress: (dateStr: string, isCurrentMonth: boolean) => void
}

function MobileMonthCell({
  cell, index, stats, today, selectedDate, tokens, styles, onPress,
}: MobileMonthCellProps) {
  const { dateStr, isCurrentMonth: isCurMo } = cell
  const isToday = dateStr === today
  const isSel = dateStr === selectedDate
  const hasTasks = Boolean(stats && stats.total > 0)
  const allDone = hasTasks && stats!.completed === stats!.total
  const hasOverdue = hasTasks && !allDone && dateStr < today
  const isFuture = dateStr > today
  const day = Number.parseInt(dateStr.split('-')[2], 10)
  const dotColor = getDotColor(hasTasks, allDone, hasOverdue, isFuture, tokens)

  return (
    <Pressable
      key={`${dateStr}-${index}`}
      onPress={() => onPress(dateStr, isCurMo)}
      style={[
        styles.cellMobile,
        !isCurMo && { opacity: 0.35 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${dateStr}: ${stats?.total ?? 0} tasks`}
      accessibilityState={{ selected: isSel }}
    >
      <View style={[
        styles.cellInnerMobile,
        isToday && styles.cellTodayMobile,
        isSel && !isToday && styles.cellSelectedMobile,
      ]}>
        <Text style={[
          styles.cellDayMobile,
          { color: tokens.textPrimary },
          isSel && { color: tokens.accentPrimary, fontWeight: '700' },
          isToday && !isSel && { color: tokens.accentBlue, fontWeight: '700' },
        ]}>
          {day}
        </Text>
      </View>
      {dotColor && (
        <View style={[styles.cellDot, { backgroundColor: dotColor }]} />
      )}
    </Pressable>
  )
}

// ── Week day cell (for wide view) ──────────────────────────────────────────────

interface WeekDayCellProps {
  readonly dateStr: string
  readonly dayTasks: Task[]
  readonly today: string
  readonly effectiveWeekDay: string
  readonly tokens: ReturnType<typeof useTheme>['tokens']
  readonly styles: ReturnType<typeof makeStyles>
  readonly onSelect: (dateStr: string) => void
}

function WeekDayCell({
  dateStr, dayTasks, today, effectiveWeekDay, tokens, styles, onSelect,
}: WeekDayCellProps) {
  const hasTasks = dayTasks.length > 0
  const allDone = hasTasks && dayTasks.every(t => t.completed)
  const hasOverdue = hasTasks && !allDone && dateStr < today
  const isFuture = dateStr > today
  const isToday = dateStr === today
  const isSel = dateStr === effectiveWeekDay
  const day = Number.parseInt(dateStr.split('-')[2], 10)
  const dotColor = getDotColor(hasTasks, allDone, hasOverdue, isFuture, tokens)

  return (
    <Pressable
      key={dateStr}
      onPress={() => onSelect(dateStr)}
      style={({ pressed }: { pressed: boolean }) => [
        styles.cell,
        styles.cellWide,
        pressed && { opacity: 0.6 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${dateStr}: ${dayTasks.length} tasks`}
      accessibilityState={{ selected: isSel }}
    >
      {({ hovered }: { hovered?: boolean }) => (
        <>
          <View style={[
            styles.cellInner,
            styles.cellInnerWide,
            isToday && styles.cellToday,
            isSel && !isToday && styles.cellSelected,
            Platform.OS === 'web' && hovered && !isSel && !isToday && {
              backgroundColor: `${tokens.accentBlue}12`,
            },
          ]}>
            <Text style={[
              styles.cellDay,
              isSel && { color: tokens.accentPrimary, fontWeight: '700' },
              isToday && !isSel && { color: tokens.accentBlue, fontWeight: '700' },
            ]}>
              {day}
            </Text>
          </View>
          {dotColor && (
            <View style={[styles.cellDot, { backgroundColor: dotColor }]} />
          )}
        </>
      )}
    </Pressable>
  )
}

// ── Shared props interface for layout components ───────────────────────────────

interface CalendarLayoutProps {
  readonly tokens: ReturnType<typeof useTheme>['tokens']
  readonly styles: ReturnType<typeof makeStyles>
  readonly viewMode: 'month' | 'week'
  readonly setViewMode: (mode: 'month' | 'week') => void
  readonly swipeGesture: ReturnType<typeof Gesture.Pan>
  readonly today: string
  readonly todayDate: Date
  readonly year: number
  readonly month: number
  readonly selectedDate: string
  readonly grid: MonthInfo
  readonly dateStats: Record<string, { completed: number; total: number }>
  readonly selectedTasks: Task[]
  readonly weekStart: string
  readonly weekDays: string[]
  readonly effectiveWeekDay: string
  readonly weekDayTasks: Task[]
  readonly handlePrevMonth: () => void
  readonly handleNextMonth: () => void
  readonly handlePrevWeek: () => void
  readonly handleNextWeek: () => void
  readonly handleCellPress: (dateStr: string, isCurMo: boolean) => void
  readonly handleAdd: () => void
  readonly handleEdit: (id: string) => void
  readonly setYear: (year: number) => void
  readonly setMonth: (month: number) => void
  readonly setSelectedDate: (date: string) => void
  readonly setWeekOffset: (fn: (o: number) => number) => void
  readonly setSelectedWeekDay: (date: string) => void
  readonly toggleTaskComplete: (id: string) => void
  readonly deleteTask: (id: string) => void
  readonly getTasksByDate: (date: string) => Task[]
  readonly getTopicColor: (topic: string) => string
  readonly getNote: (date: string) => string
  readonly setNote: (date: string, text: string) => void
  readonly isWide: boolean
}

// ── View mode toggle (desktop) ─────────────────────────────────────────────────

function ViewModeToggle({
  viewMode, setViewMode,
}: Readonly<{
  viewMode: 'month' | 'week'
  setViewMode: (mode: 'month' | 'week') => void
}>) {
  return (
    <SegmentedToggle
      options={[
        { value: 'month', label: 'Month', icon: (color) => <CalendarDays size={14} color={color} /> },
        { value: 'week', label: 'Week', icon: (color) => <CalendarCheck size={14} color={color} /> },
      ]}
      value={viewMode}
      onChange={(v) => setViewMode(v as 'month' | 'week')}
    />
  )
}

// ── Mobile view mode toggle ────────────────────────────────────────────────────

function MobileViewModeToggle({
  viewMode, setViewMode,
}: Readonly<{
  viewMode: 'month' | 'week'
  setViewMode: (mode: 'month' | 'week') => void
}>) {
  return (
    <SegmentedToggle
      options={[
        { value: 'month', label: 'Month', icon: (color) => <CalendarDays size={14} color={color} /> },
        { value: 'week', label: 'Week', icon: (color) => <CalendarCheck size={14} color={color} /> },
      ]}
      value={viewMode}
      onChange={(v) => setViewMode(v as 'month' | 'week')}
    />
  )
}

// ── Month calendar grid card ───────────────────────────────────────────────────

function MonthCalendarGrid({
  tokens, styles, today, todayDate, year, month, selectedDate, grid, dateStats, isWide,
  handlePrevMonth, handleNextMonth, handleCellPress, setYear, setMonth, setSelectedDate,
}: Readonly<{
  tokens: ReturnType<typeof useTheme>['tokens']
  styles: ReturnType<typeof makeStyles>
  today: string
  todayDate: Date
  year: number
  month: number
  selectedDate: string
  grid: MonthInfo
  dateStats: Record<string, { completed: number; total: number }>
  isWide: boolean
  handlePrevMonth: () => void
  handleNextMonth: () => void
  handleCellPress: (dateStr: string, isCurMo: boolean) => void
  setYear: (year: number) => void
  setMonth: (month: number) => void
  setSelectedDate: (date: string) => void
}>) {
  return (
    <View style={styles.calendarCard}>
      {/* Month navigation */}
      <View style={styles.monthNavWrapper}>
        <View style={styles.monthNav}>
          <Pressable
            onPress={handlePrevMonth}
            style={styles.navTextBtn}
            accessibilityLabel="Previous month"
          >
            <Text style={[styles.navText, { color: tokens.textMuted }]}>‹</Text>
          </Pressable>

          {/* Month/year label — tap to return to today */}
          <Pressable
            onPress={() => {
              setYear(todayDate.getFullYear())
              setMonth(todayDate.getMonth())
              setSelectedDate(today)
            }}
            style={styles.monthLabelBtn}
            accessibilityLabel={`${MONTH_NAMES[month]} ${year}, tap to go to today`}
          >
            <Text style={[styles.monthLabelText, { color: tokens.textSecondary }]}>
              {MONTH_NAMES[month].toUpperCase()} {year}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleNextMonth}
            style={styles.navTextBtn}
            accessibilityLabel="Next month"
          >
            <Text style={[styles.navText, { color: tokens.textMuted }]}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* Day-of-week header row */}
      <View style={styles.dowRow}>
        {DOW_LABELS.map(d => (
          <Text key={d} style={[styles.dowLabel, { color: tokens.textMuted }]}>{d}</Text>
        ))}
      </View>

      {/* Calendar cells */}
      <View style={styles.cellGrid}>
        {grid.cells.map((cell, i) => (
          <MonthCell
            key={`${cell.dateStr}-${i}`}
            cell={cell}
            index={i}
            stats={dateStats[cell.dateStr]}
            today={today}
            selectedDate={selectedDate}
            isWide={isWide}
            tokens={tokens}
            styles={styles}
            onPress={handleCellPress}
          />
        ))}
      </View>
    </View>
  )
}

// ── Mobile week view ───────────────────────────────────────────────────────────

function MobileWeekView({
  tokens, styles, today, weekDays, effectiveWeekDay, weekDayTasks, weekStart,
  handlePrevWeek, handleNextWeek,
  setSelectedWeekDay, toggleTaskComplete, handleEdit, deleteTask, handleAdd,
  getTasksByDate, getTopicColor, getNote, setNote,
}: Readonly<{
  tokens: ReturnType<typeof useTheme>['tokens']
  styles: ReturnType<typeof makeStyles>
  today: string
  weekDays: string[]
  effectiveWeekDay: string
  weekDayTasks: Task[]
  weekStart: string
  handlePrevWeek: () => void
  handleNextWeek: () => void
  setSelectedWeekDay: (date: string) => void
  toggleTaskComplete: (id: string) => void
  handleEdit: (id: string) => void
  deleteTask: (id: string) => void
  handleAdd: () => void
  getTasksByDate: (date: string) => Task[]
  getTopicColor: (topic: string) => string
  getNote: (date: string) => string
  setNote: (date: string, text: string) => void
}>) {
  return (
    <View style={{ flex: 1 }}>
      {/* Week day strip wrapped in card like month view */}
      <View style={[styles.weekDayStripCard, styles.cardElevated]}>
        {/* Week navigation inside card */}
        <View style={styles.monthNav}>
          <Pressable
            onPress={handlePrevWeek}
            style={styles.navTextBtn}
            accessibilityLabel="Previous week"
          >
            <Text style={[styles.navText, { color: tokens.accentPrimary }]}>‹</Text>
          </Pressable>

          <Text style={[styles.mobileMonthLabel, { color: tokens.textSecondary }]}>
            {formatMonthRange(weekStart)}
          </Text>

          <Pressable
            onPress={handleNextWeek}
            style={styles.navTextBtn}
            accessibilityLabel="Next week"
          >
            <Text style={[styles.navText, { color: tokens.accentPrimary }]}>›</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekDayStrip}
          style={styles.weekDayStripScroll}
        >
          {weekDays.map((dateStr, i) => {
            const dayTasks = getTasksByDate(dateStr)
            const hasTasks = dayTasks.length > 0
            const allDone = hasTasks && dayTasks.every(t => t.completed)
            const hasOverdue = hasTasks && !allDone && dateStr < today
            const isFuture = dateStr > today
            return (
              <WeekDayHeader
                key={dateStr}
                dayName={DAY_NAMES_SHORT[i]}
                dateStr={dateStr}
                isToday={dateStr === today}
                isSelected={dateStr === effectiveWeekDay}
                hasTasks={hasTasks}
                allDone={allDone}
                hasOverdue={hasOverdue}
                isFuture={isFuture}
                onPress={() => setSelectedWeekDay(dateStr)}
                tokens={tokens}
              />
            )
          })}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.weekContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.inlineDayPanel, styles.cardElevated]}>
          <DayPanel
            selectedDate={effectiveWeekDay}
            tasks={weekDayTasks}
            tokens={tokens}
            onToggle={toggleTaskComplete}
            onEdit={handleEdit}
            onDelete={deleteTask}
            onAdd={handleAdd}
            getTopicColor={getTopicColor}
            getNote={getNote}
            setNote={setNote}
          />
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

// ── Wide (desktop) layout ──────────────────────────────────────────────────────

function WideCalendarLayout(props: Readonly<CalendarLayoutProps>) {
  const {
    tokens, styles, viewMode, setViewMode, swipeGesture, today, todayDate, year, month,
    selectedDate, grid, dateStats, selectedTasks, weekStart, weekDays, effectiveWeekDay,
    weekDayTasks, handlePrevMonth, handleNextMonth, handlePrevWeek, handleNextWeek,
    handleCellPress, handleAdd, handleEdit, setYear, setMonth, setSelectedDate,
    setWeekOffset, setSelectedWeekDay, toggleTaskComplete, deleteTask, getTasksByDate,
    getTopicColor, getNote, setNote, isWide,
  } = props

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bgPrimary }]}>
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.wideRoot}>
          {/* Page-level header */}
          <View style={[styles.pageHeader, {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }]}>
            <View>
              <Text style={[styles.pageTitle, { color: tokens.textPrimary }]}>Calendar</Text>
              <Text style={[styles.pageSubtitle, { color: tokens.textSecondary }]}>
                Plan and track your tasks by date
              </Text>
            </View>
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          </View>

          {viewMode === 'month' ? (
            <ScrollView
              contentContainerStyle={styles.twoColScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.twoCol}>
                <View style={styles.leftCol}>
                  <View style={[styles.wideCard, {
                    backgroundColor: tokens.bgElevated,
                    borderColor: tokens.borderPrimary,
                  }]}>
                    <MonthCalendarGrid
                      tokens={tokens} styles={styles} today={today} todayDate={todayDate}
                      year={year} month={month} selectedDate={selectedDate} grid={grid}
                      dateStats={dateStats} isWide={isWide} handlePrevMonth={handlePrevMonth}
                      handleNextMonth={handleNextMonth} handleCellPress={handleCellPress}
                      setYear={setYear} setMonth={setMonth} setSelectedDate={setSelectedDate}
                    />
                  </View>
                </View>
                <View style={styles.rightCol}>
                  <View style={[styles.wideCard, {
                    backgroundColor: tokens.bgSecondary,
                    borderColor: tokens.borderPrimary,
                  }]}>
                    <DayPanel
                      selectedDate={selectedDate}
                      tasks={selectedTasks}
                      tokens={tokens}
                      onToggle={toggleTaskComplete}
                      onEdit={handleEdit}
                      onDelete={deleteTask}
                      onAdd={handleAdd}
                      getTopicColor={getTopicColor}
                      getNote={getNote}
                      setNote={setNote}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={styles.twoColScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.twoCol}>
                {/* Left column: Week calendar card */}
                <View style={styles.leftCol}>
                  <View style={[styles.wideCard, {
                    backgroundColor: tokens.bgElevated,
                    borderColor: tokens.borderPrimary,
                  }]}>
                    <View style={styles.calendarCard}>
                      {/* Week navigation */}
                      <View style={styles.monthNavWrapper}>
                        <View style={styles.monthNav}>
                          <Pressable onPress={handlePrevWeek} style={styles.navTextBtn} accessibilityLabel="Previous week">
                            <Text style={[styles.navText, { color: tokens.textMuted }]}>‹</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => { setWeekOffset(() => 0); setSelectedWeekDay(today) }}
                            style={styles.monthLabelBtn}
                            accessibilityLabel="Go to current week"
                          >
                            <Text style={[styles.monthLabelText, { color: tokens.textSecondary }]}>
                              {formatMonthRange(weekStart).toUpperCase()}
                            </Text>
                          </Pressable>
                          <Pressable onPress={handleNextWeek} style={styles.navTextBtn} accessibilityLabel="Next week">
                            <Text style={[styles.navText, { color: tokens.textMuted }]}>›</Text>
                          </Pressable>
                        </View>
                      </View>

                      {/* Day-of-week header row */}
                      <View style={styles.dowRow}>
                        {DOW_LABELS.map(d => (
                          <Text key={d} style={[styles.dowLabel, { color: tokens.textMuted }]}>{d}</Text>
                        ))}
                      </View>

                      {/* Week cells — using same cellGrid structure as month view */}
                      <View style={styles.cellGrid}>
                        {weekDays.map((dateStr) => (
                          <WeekDayCell
                            key={dateStr}
                            dateStr={dateStr}
                            dayTasks={getTasksByDate(dateStr)}
                            today={today}
                            effectiveWeekDay={effectiveWeekDay}
                            tokens={tokens}
                            styles={styles}
                            onSelect={setSelectedWeekDay}
                          />
                        ))}
                      </View>
                    </View>{/* end calendarCard */}
                  </View>{/* end wideCard */}
                </View>{/* end leftCol */}

                {/* Right column: Day panel */}
                <View style={styles.rightCol}>
                  <View style={[styles.wideCard, {
                    backgroundColor: tokens.bgSecondary,
                    borderColor: tokens.borderPrimary,
                  }]}>
                    <DayPanel
                      selectedDate={effectiveWeekDay}
                      tasks={weekDayTasks}
                      tokens={tokens}
                      onToggle={toggleTaskComplete}
                      onEdit={handleEdit}
                      onDelete={deleteTask}
                      onAdd={handleAdd}
                      getTopicColor={getTopicColor}
                      getNote={getNote}
                      setNote={setNote}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </GestureDetector>
    </SafeAreaView>
  )
}

// ── Mobile layout ──────────────────────────────────────────────────────────────

function MobileCalendarLayout(props: Readonly<CalendarLayoutProps>) {
  const {
    tokens, styles, viewMode, setViewMode, swipeGesture, today, todayDate, year, month,
    selectedDate, grid, dateStats, selectedTasks, weekStart, weekDays, effectiveWeekDay,
    weekDayTasks, handlePrevMonth, handleNextMonth, handlePrevWeek, handleNextWeek,
    handleCellPress, handleAdd, handleEdit, setYear, setMonth, setSelectedDate,
    setWeekOffset, setSelectedWeekDay, toggleTaskComplete, deleteTask, getTasksByDate,
    getTopicColor, getNote, setNote,
  } = props

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bgTertiary }]}>
      <StatusBar barStyle="dark-content" />

      <GestureDetector gesture={swipeGesture}>
        <View style={{ flex: 1 }}>
          {/* Mobile header */}
          <View style={[styles.mobileHeaderWrap, { backgroundColor: tokens.bgTertiary }]}>
            {/* Row 1: Calendar title */}
            <Text style={[styles.mobileHeaderTitle, { color: tokens.textPrimary }]}>Calendar</Text>
            {/* Row 2: Label on left, Toggle on right */}
            <View style={styles.mobileHeaderRow}>
              <Text style={[styles.mobileHeaderSubtitle, { color: tokens.textMuted }]}>
                Your schedule at a glance
              </Text>
              <MobileViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
            </View>
          </View>

          {viewMode === 'month' ? (
            <ScrollView
              contentContainerStyle={styles.mobileContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Compact calendar grid for mobile */}
              <View style={[styles.mobileCalCard, styles.cardElevated]}>
                {/* Month navigation inside card */}
                <View style={styles.monthNav}>
                  <Pressable
                    onPress={handlePrevMonth}
                    style={styles.navTextBtn}
                    accessibilityLabel="Previous month"
                  >
                    <Text style={[styles.navText, { color: tokens.accentPrimary }]}>‹</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setYear(todayDate.getFullYear())
                      setMonth(todayDate.getMonth())
                      setSelectedDate(today)
                    }}
                    style={styles.monthLabelBtn}
                    accessibilityLabel={`${MONTH_NAMES[month]} ${year}, tap to go to today`}
                  >
                    <Text style={[styles.mobileMonthLabel, { color: tokens.textSecondary }]}>
                      {MONTH_NAMES[month]} {year}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleNextMonth}
                    style={styles.navTextBtn}
                    accessibilityLabel="Next month"
                  >
                    <Text style={[styles.navText, { color: tokens.accentPrimary }]}>›</Text>
                  </Pressable>
                </View>

                {/* Day-of-week header row */}
                <View style={styles.dowRow}>
                  {DOW_LABELS.map(d => (
                    <Text key={d} style={[styles.dowLabel, { color: tokens.textMuted }]}>{d}</Text>
                  ))}
                </View>

                {/* Calendar cells */}
                <View style={styles.cellGrid}>
                  {grid.cells.map((cell, i) => (
                    <MobileMonthCell
                      key={`${cell.dateStr}-${i}`}
                      cell={cell}
                      index={i}
                      stats={dateStats[cell.dateStr]}
                      today={today}
                      selectedDate={selectedDate}
                      tokens={tokens}
                      styles={styles}
                      onPress={handleCellPress}
                    />
                  ))}
                </View>
              </View>

              {/* Inline day panel */}
              {Boolean(selectedDate) && (
                <View style={[styles.inlineDayPanel, styles.cardElevated]}>
                  <DayPanel
                    selectedDate={selectedDate}
                    tasks={selectedTasks}
                    tokens={tokens}
                    onToggle={toggleTaskComplete}
                    onEdit={handleEdit}
                    onDelete={deleteTask}
                    onAdd={handleAdd}
                    getTopicColor={getTopicColor}
                    getNote={getNote}
                    setNote={setNote}
                  />
                </View>
              )}

              {/* Daily Notes - separate from the day panel card */}
              {Boolean(selectedDate) && (
                <View style={styles.dailyNotesWrapper}>
                  <DailyNotes date={selectedDate!} note={getNote(selectedDate!)} onSave={setNote} />
                </View>
              )}
            </ScrollView>
          ) : (
            <MobileWeekView
              tokens={tokens} styles={styles} today={today} weekDays={weekDays}
              effectiveWeekDay={effectiveWeekDay} weekDayTasks={weekDayTasks}
              weekStart={weekStart}
              handlePrevWeek={handlePrevWeek} handleNextWeek={handleNextWeek}
              setSelectedWeekDay={setSelectedWeekDay} toggleTaskComplete={toggleTaskComplete}
              handleEdit={handleEdit} deleteTask={deleteTask} handleAdd={handleAdd}
              getTasksByDate={getTasksByDate} getTopicColor={getTopicColor}
              getNote={getNote} setNote={setNote}
            />
          )}
        </View>
      </GestureDetector>
    </SafeAreaView>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  const _mobileHeader = useMobileHeader() // Keep hook call for side effects
  const { openAddTask } = useAddTaskModal()
  const { user } = useAuth()
  const {
    tasks, toggleTaskComplete, deleteTask,
    getTasksByDate, getNote, setNote, getTopicColor,
  } = useProgress({ user })
  const { width } = useWindowDimensions()

  const today = getToday()
  const todayDate = new Date()

  const [year, setYear] = useState(todayDate.getFullYear())
  const [month, setMonth] = useState(todayDate.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(today)

  const isWide = Platform.OS === 'web' && width > SIDEBAR_BREAKPOINT

  // ── View mode ─────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')

  // ── Week state ────────────────────────────────────────────────────────────
  const todayMonday = useMemo(() => getMondayOfWeek(today), [today])
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedWeekDay, setSelectedWeekDay] = useState(today)

  const weekStart = useMemo(() =>
    weekOffset === 0 ? todayMonday : addDays(todayMonday, weekOffset * 7),
    [todayMonday, weekOffset],
  )

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const effectiveWeekDay = weekDays.includes(selectedWeekDay) ? selectedWeekDay : weekDays[0]

  const weekDayTasks = useMemo(() =>
    getTasksByDate(effectiveWeekDay).sort((a, b) => {
      const pri: Record<string, number> = { high: 0, medium: 1, low: 2 }
      const pa = a.priority ? (pri[a.priority] ?? 3) : 3
      const pb = b.priority ? (pri[b.priority] ?? 3) : 3
      return pa - pb
    }),
    [getTasksByDate, effectiveWeekDay],
  )

  // Jump to a specific date written by the Heatmap
  useEffect(() => {
    const handleJumpDate = async () => {
      try {
        const jumpDate = await AsyncStorage.getItem(CALENDAR_JUMP_KEY)
        if (jumpDate) {
          const d = new Date(jumpDate + 'T12:00:00')
          setYear(d.getFullYear())
          setMonth(d.getMonth())
          setSelectedDate(jumpDate)
          await AsyncStorage.removeItem(CALENDAR_JUMP_KEY)
        }
      } catch {
        // Ignore storage errors
      }
    }
    void handleJumpDate()
  }, [])

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])

  // Per-date task statistics
  const dateStats = useMemo(() => {
    const map: Record<string, { completed: number; total: number }> = {}
    for (const task of tasks) {
      if (!map[task.date]) map[task.date] = { completed: 0, total: 0 }
      map[task.date].total++
      if (task.completed) map[task.date].completed++
    }
    return map
  }, [tasks])

  const selectedTasks = useMemo(() =>
    getTasksByDate(selectedDate).sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return 0
    }),
    [selectedDate, getTasksByDate],
  )

  // ── Swipe gesture — horizontal for both mobile and web ───────────────────
  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd(event => {
      const isHorizontalSwipe =
        Math.abs(event.translationX) > SWIPE_THRESHOLD &&
        Math.abs(event.translationX) > Math.abs(event.translationY)

      if (!isHorizontalSwipe) return

      const isSwipeLeft = event.translationX < 0

      if (viewMode === 'month') {
        const delta = isSwipeLeft ? 1 : -1
        const result = addMonths(year, month, delta)
        setYear(result.year)
        setMonth(result.month)
      } else {
        const delta = isSwipeLeft ? 1 : -1
        setWeekOffset(o => o + delta)
        setSelectedWeekDay(addDays(weekStart, delta * 7))
      }
    })

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePrevMonth = useCallback(() => {
    const prev = addMonths(year, month, -1)
    setYear(prev.year); setMonth(prev.month)
  }, [year, month])

  const handleNextMonth = useCallback(() => {
    const next = addMonths(year, month, 1)
    setYear(next.year); setMonth(next.month)
  }, [year, month])

  const handleAdd = useCallback(() => {
    const date = viewMode === 'week' ? effectiveWeekDay : selectedDate
    openAddTask({ initialDate: date })
  }, [openAddTask, selectedDate, effectiveWeekDay, viewMode])

  const handleEdit = useCallback((id: string) => {
    openAddTask({ editTaskId: id })
  }, [openAddTask])

  const handlePrevWeek = useCallback(() => {
    setWeekOffset(o => o - 1)
    setSelectedWeekDay(prev => addDays(prev, -7))
  }, [])

  const handleNextWeek = useCallback(() => {
    setWeekOffset(o => o + 1)
    setSelectedWeekDay(prev => addDays(prev, 7))
  }, [])

  // ── Handler for cell press ────────────────────────────────────────────────
  const handleCellPress = useCallback((dateStr: string, isCurMo: boolean) => {
    if (!isCurMo) {
      const d = new Date(dateStr + 'T12:00:00')
      setYear(d.getFullYear())
      setMonth(d.getMonth())
    }
    setSelectedDate(dateStr)
  }, [])

  // ── Shared props for layout components ────────────────────────────────────
  const layoutProps: CalendarLayoutProps = {
    tokens, styles, viewMode, setViewMode, swipeGesture, today, todayDate, year, month,
    selectedDate, grid, dateStats, selectedTasks, weekStart, weekDays, effectiveWeekDay,
    weekDayTasks, handlePrevMonth, handleNextMonth, handlePrevWeek, handleNextWeek,
    handleCellPress, handleAdd, handleEdit, setYear, setMonth, setSelectedDate,
    setWeekOffset, setSelectedWeekDay, toggleTaskComplete, deleteTask, getTasksByDate,
    getTopicColor, getNote, setNote, isWide,
  }

  return isWide
    ? <WideCalendarLayout {...layoutProps} />
    : <MobileCalendarLayout {...layoutProps} />
}

// ── Static sub-component styles ───────────────────────────────────────────────
// These don't need token values injected at render time.

const weekHeaderSt = StyleSheet.create({
  header: {
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 4,
  },
  dayName: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDate: { fontSize: 15, lineHeight: 20 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
})

const weekRowSt = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  title: { flex: 1, fontSize: 14, fontWeight: '500' },
  duration: { fontSize: 11, flexShrink: 0 },
})

// ── DayPanel styles factory ────────────────────────────────────────────────────

function makePanelStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    panel: { flex: 1 },
    content: { padding: tokens.spacing.xl, paddingBottom: tokens.spacing.xxxl },
    panelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: tokens.spacing.lg,
    },
    panelActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    viewToggle: {
      flexDirection: 'row',
      borderRadius: 8,
      borderWidth: 1,
      padding: 2,
    },
    viewToggleBtn: {
      padding: 5,
      borderRadius: 6,
    },
    dayLabel: { fontSize: 12, marginBottom: 2 },
    dateLabel: { fontSize: 18, fontWeight: '700' },
    addBtn: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Empty schedule state
    emptySchedule: {
      paddingVertical: tokens.spacing.xxl,
      alignItems: 'center',
    },
    emptyScheduleText: { fontSize: 14, fontWeight: '500' },
    // Task list (using UnifiedTaskItem)
    taskList: {
      gap: 0,
      marginBottom: tokens.spacing.md,
    },
    // Timeline wrapper
    timelineWrapper: {
      flex: 1,
      minHeight: 400,
      maxHeight: 500,
      marginBottom: tokens.spacing.md,
      marginHorizontal: -tokens.spacing.md,
      overflow: 'hidden',
    },
    // "Select a date" fallback
    empty: {
      flex: 1,
      borderRadius: tokens.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: tokens.spacing.xxl,
    },
    emptyText: { fontSize: 14 },
    // Task list card (matches Tasks screen)
    taskListCard: {
      borderRadius: 16,
      padding: 12,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: tokens.spacing.md,
    },
    taskItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    // Time column (left side)
    timeColumn: {
      width: 65,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeText: {
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
    },
    // Accent bar
    accentBar: {
      width: 3,
      height: 40,
      borderRadius: 2,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
      marginBottom: 5,
    },
    topicBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 20,
      borderWidth: 1,
    },
    topicBadgeText: { fontSize: 10, fontWeight: '600' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: 11 },
    overdueBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: tokens.radius.xs,
    },
    overdueBadgeText: { fontSize: 10, fontWeight: '700' },
    taskTitle: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
    taskActions: { flexDirection: 'row', gap: 2, flexShrink: 0 },
    actionBtn: { padding: 6 },
  })
}

// ── Main styles factory ────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    safe: { flex: 1 },
    wideRoot: { flex: 1 },

    // ── Wide page header ──
    pageHeader: {
      paddingHorizontal: tokens.spacing.xl,
      paddingTop: tokens.spacing.xl,
      paddingBottom: tokens.spacing.sm,
    },
    pageTitle: { fontSize: 22, fontWeight: '700' },
    pageSubtitle: { fontSize: 14, marginTop: 3 },

    // ── Mobile header (two rows) ──
    mobileHeaderWrap: {
      paddingHorizontal: tokens.spacing.lg,
      paddingTop: tokens.spacing.sm,
      paddingBottom: tokens.spacing.sm,
    },
    mobileHeaderTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 6,
    },
    mobileHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    mobileNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    mobileSubtitle: {
      fontSize: 14,
      fontWeight: '500',
    },
    mobileHeaderSubtitle: {
      fontSize: 13,
      fontWeight: '400',
    },
    mobileHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    mobileTitle: {
      fontSize: 17,
      fontWeight: '600',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    headingSubtitle: { fontSize: 12, marginTop: 2 },

    // ── Wide two-column layout ──
    twoColScroll: {
      padding: tokens.spacing.lg,
      paddingTop: tokens.spacing.sm,
      maxWidth: 1100,
      alignSelf: 'stretch' as 'auto',
    },
    twoCol: {
      flexDirection: 'row',
      gap: tokens.spacing.lg,
      alignItems: 'flex-start',
    },
    leftCol: { flex: 1 },
    rightCol: { width: 340 },
    wideCard: {
      borderRadius: tokens.radius.xl,
      borderWidth: 1,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 10,
        },
        android: { elevation: 2 },
        web: { boxShadow: '0 2px 10px rgba(0,0,0,0.07)' } as object,
      }),
    },

    // ── Mobile content ──
    mobileContent: { paddingBottom: 120 },
    mobileCardWrap: {
      paddingHorizontal: tokens.spacing.lg,
      paddingTop: tokens.spacing.lg,
    },
    mobileCalCard: {
      marginHorizontal: tokens.spacing.sm,
      marginTop: tokens.spacing.sm,
      paddingVertical: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.xs,
      borderRadius: tokens.radius.lg,
    },
    inlineDayPanel: {
      marginHorizontal: tokens.spacing.sm,
      marginTop: tokens.spacing.md,
      marginBottom: 0,
      borderRadius: tokens.radius.xl,
      overflow: 'hidden',
    },
    dailyNotesWrapper: {
      marginHorizontal: tokens.spacing.sm,
      marginBottom: tokens.spacing.lg,
    },

    // ── Elevated card style (white background + shadow) ──
    cardElevated: {
      backgroundColor: tokens.bgPrimary,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        android: { elevation: 2 },
        web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } as object,
      }),
    },

    // ── Calendar card container ──
    calendarCard: {
      paddingTop: tokens.spacing.xl,
      paddingBottom: tokens.spacing.lg,
    },
    cardHeader: {
      paddingHorizontal: tokens.spacing.lg,
      marginBottom: tokens.spacing.lg,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 3,
    },
    cardSubtitle: {
      fontSize: 14,
    },

    // ── Month navigation row ──
    monthNavWrapper: {
      position: 'relative',
      zIndex: 10,
      paddingHorizontal: tokens.spacing.lg,
      marginBottom: tokens.spacing.md,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    navBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: tokens.radius.full,
    },
    navTextBtn: {
      minHeight: 32,
      minWidth: 28,
      paddingVertical: tokens.spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navText: {
      fontSize: 24,
      fontWeight: '300',
      lineHeight: 28,
    },
    monthLabelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
    },
    monthLabelText: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1.2,
    },
    mobileMonthLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
    // Today chip — used in week view and mobile header
    todayChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      marginRight: 4,
    },
    todayChipText: { fontSize: 12, fontWeight: '600' },

    // ── Day-of-week row ──
    dowRow: {
      flexDirection: 'row',
      paddingHorizontal: tokens.spacing.lg,
      marginBottom: tokens.spacing.xs,
    },
    dowLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    // ── Calendar cells ──
    cellGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: tokens.spacing.lg,
      paddingBottom: tokens.spacing.sm,
    },
    cell: {
      width: '14.2857%' as unknown as number,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: tokens.spacing.xs,
    },
    cellWide: {
      minHeight: 60,
      paddingVertical: tokens.spacing.sm,
    },
    // Inner circular container for day number (web/wide)
    cellInner: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      // Web hover effect via transitionProperty
      ...Platform.select({
        web: {
          transitionProperty: 'background-color',
          transitionDuration: '150ms',
        } as object,
        default: {},
      }),
    },
    cellInnerWide: {
      width: 36,
      height: 36,
    },
    // Today — light accent tint background (circular)
    cellToday: {
      backgroundColor: `${tokens.accentBlue}18`,
    },
    // Selected (not today) — circular with accent tint
    cellSelected: {
      backgroundColor: tokens.accentPrimaryLight,
    },
    // Prev / next month dates — faded
    cellOtherMonth: {
      opacity: 0.35,
    },
    // Small status dot — centered below the day number
    cellDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      marginTop: 2,
    },
    cellDay: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    // Mobile-specific compact cells
    cellMobile: {
      width: '14.2857%' as unknown as number,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
    },
    // Inner circular container for mobile
    cellInnerMobile: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: tokens.radius.full,
    },
    cellTodayMobile: {
      backgroundColor: `${tokens.accentBlue}18`,
    },
    cellSelectedMobile: {
      backgroundColor: tokens.accentPrimaryLight,
    },
    cellDayMobile: {
      fontSize: 13,
      fontWeight: '500',
    },

    // ── View-mode toggle pill ──
    viewToggle: {
      flexDirection: 'row',
      borderRadius: tokens.radius.md,
      padding: 3,
      gap: 2,
    },
    viewToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: tokens.radius.sm,
    },
    viewToggleText: { fontSize: 12, fontWeight: '600' },

    // ── Mobile view toggle (shared border container, active has fill + label) ──
    mobileToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: tokens.radius.full,
      padding: 3,
    },
    mobileToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: tokens.radius.full,
    },
    mobileToggleBtnActive: {
      paddingHorizontal: 10,
    },
    mobileToggleText: {
      fontSize: 12,
      fontWeight: '600',
    },

    // ── Week view ──
    weekNavBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    weekRangeLabel: { fontSize: 13, fontWeight: '500' },
    weekDayStripScroll: { maxHeight: 88 },
    weekDayStripCard: {
      marginHorizontal: tokens.spacing.sm,
      marginTop: tokens.spacing.sm,
      paddingVertical: tokens.spacing.sm,
      borderRadius: tokens.radius.lg,
    },
    weekDayStrip: {
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: tokens.spacing.sm,
      gap: 6,
      flexDirection: 'row',
    },
    // Week day strip inside card (web wide view)
    weekCardDayStrip: {
      flexDirection: 'row',
      paddingHorizontal: tokens.spacing.sm,
      paddingBottom: tokens.spacing.xl,
    },
    weekTaskList: { padding: tokens.spacing.lg },
    weekContent: { paddingBottom: 120 },
    weekDayHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: tokens.spacing.lg,
    },
    weekDayHeading: { fontSize: 16, fontWeight: '600', flex: 1 },
    weekAddBtn: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekAddBtnText: { fontSize: 13, fontWeight: '600' },
    weekTaskRows: { gap: tokens.spacing.sm },
    weekEmpty: {
      paddingVertical: tokens.spacing.xxl,
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: tokens.radius.md,
      borderStyle: 'dashed',
    },
    weekEmptyText: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
    weekEmptyHint: { fontSize: 12 },
  })
}
