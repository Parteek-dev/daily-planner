/**
 * Today tab screen — matches legacy web app layout.
 *
 * Features:
 *  - QuickAdd bar
 *  - Stats bar: "X of Y tasks", progress bar, time row ("Xm done / Ym planned")
 *  - TIME PLAN stacked bar (per-topic color segments + legend)
 *  - TASKS section header: Focus + Mark all done + Add Task buttons
 *  - Inline search/filter bar
 *  - Flat task list (not grouped) with: topic-colored pill, duration, time,
 *    recurrence, dependency, subtask count, action icons (Edit/Delete)
 *  - DailyNotes at the bottom
 *  - OverdueRolloverModal, Confetti, VoiceInput, Undo toast
 *
 * Requirements: 8.1–8.8
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import {
  CheckCircle2,
  Circle,
  Flag,
  Clock,
  Plus,
  Timer,
  Search,
  ClipboardList,
  Repeat,
  Link,
  Trash2,
  Focus,
  CheckCheck,
  Sparkles,
  X,
  Filter,
  StickyNote,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ListTodo,
} from 'lucide-react-native'

import { useAuth } from '@/src/hooks/useAuth'
import { useProgress } from '@/src/hooks/useProgress'
import { useTheme } from '@/src/hooks/useTheme'
import { useMobileHeader } from '@/src/context/MobileHeaderContext'
import { useAddTaskModal } from '@/src/context/AddTaskModalContext'
import QuickAdd from '@/src/components/task/QuickAdd'
import DailyNotes from '@/src/components/DailyNotes'
import OverdueRolloverModal from '@/src/components/task/OverdueRolloverModal'
import { Confetti } from '@/src/components/Confetti'
import VoiceInput from '@/src/components/VoiceInput'
import { fmtDuration } from '@/src/lib/utils'
import type { Task } from '@/src/lib/firestoreMappers'

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLLOVER_DISMISSED_KEY = 'rollover_dismissed_date'

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function formatTime(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

// ── Flat TaskItem ──────────────────────────────────────────────────────────────

interface FlatTaskItemProps {
  task: Task
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onFocus: () => void
  onReschedule: () => void
  onToggleSubtask: (subtaskId: string) => void
  getTopicColor: (t: string) => string
  tokens: ReturnType<typeof useTheme>['tokens']
}

function FlatTaskItem({
  task, onToggle, onEdit, onDelete, onFocus, onReschedule,
  onToggleSubtask, getTopicColor, tokens,
}: FlatTaskItemProps) {
  const [subtasksExpanded, setSubtasksExpanded] = useState(false)
  const [noteExpanded, setNoteExpanded] = useState(false)

  const topicColor = getTopicColor(task.topic)
  const completedSubs = task.subtasks?.filter((s: any) => s.completed).length ?? 0
  const totalSubs = task.subtasks?.length ?? 0
  const timeLabel = formatTime(task.dueTime)
  const hasSubtasks = totalSubs > 0
  const hasNote = !!(task as any).note?.trim()

  return (
    <View>
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`Edit task: ${task.title}`}
        style={({ pressed }) => [
          fi.row,
          { opacity: task.completed ? 0.6 : 1 },
          pressed && { opacity: 0.7 },
        ]}
      >
        {/* Time column (left side) */}
        <View style={fi.timeColumn}>
          <Text style={[fi.timeText, { color: tokens.textSecondary }]}>
            {timeLabel || '—'}
          </Text>
        </View>

        {/* Accent bar */}
        <View style={[fi.accentBar, { backgroundColor: topicColor }]} />

        {/* Checkbox */}
        <Pressable onPress={(e) => { e.stopPropagation(); onToggle(); }} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: task.completed }}>
          {task.completed
            ? <CheckCircle2 size={20} color={tokens.accentGreen} />
            : <Circle size={20} color={tokens.textMuted} />}
        </Pressable>

        {/* Content */}
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Meta badges + action icons row */}
          <View style={fi.meta}>
            {/* Topic pill */}
            <View style={[fi.topicPill, { backgroundColor: `${topicColor}20`, borderColor: `${topicColor}40` }]}>
              <Text style={[fi.topicPillText, { color: topicColor }]}>{task.topic}</Text>
            </View>
            {/* Duration */}
            {task.duration > 0 && (
              <View style={fi.metaItem}>
                <Clock size={10} color={tokens.textMuted} />
                <Text style={[fi.metaText, { color: tokens.textMuted }]}>{fmtDuration(task.duration)}</Text>
              </View>
            )}
            {/* Recurrence */}
            {task.recurrence && task.recurrence !== 'none' && (
              <View style={fi.metaItem}>
                <Repeat size={10} color={tokens.accentPurple ?? '#8b5cf6'} />
                <Text style={[fi.metaText, { color: tokens.accentPurple ?? '#8b5cf6' }]}>{task.recurrence}</Text>
              </View>
            )}
            {/* Dependency blocked */}
            {(task as any).dependsOn?.length > 0 && (
              <View style={fi.metaItem}>
                <Link size={10} color={tokens.accentOrange} />
                <Text style={[fi.metaText, { color: tokens.accentOrange, fontWeight: '600' }]}>Blocked</Text>
              </View>
            )}
            {/* Subtask count */}
            {hasSubtasks && (
              <Text style={[fi.metaText, { color: tokens.textMuted }]}>{completedSubs}/{totalSubs} subtasks</Text>
            )}

            {/* ── 5 action icons (always visible, right-aligned) ── */}
            <View style={fi.actions}>
              {/* Expand/collapse subtasks */}
              {hasSubtasks && (
                <Pressable
                  onPress={() => setSubtasksExpanded(p => !p)}
                  hitSlop={6} style={fi.actionBtn}
                  accessibilityRole="button"
                  accessibilityLabel={subtasksExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                >
                  {subtasksExpanded
                    ? <ChevronDown size={14} color={tokens.textMuted} />
                    : <ChevronRight size={14} color={tokens.textMuted} />}
                </Pressable>
              )}
              {/* Focus */}
              {!task.completed && (
                <Pressable onPress={onFocus} hitSlop={6} style={fi.actionBtn} accessibilityRole="button" accessibilityLabel="Focus on this task">
                  <Focus size={14} color={tokens.accentBlue} />
                </Pressable>
              )}
              {/* Add/view note */}
              <Pressable
                onPress={() => setNoteExpanded(p => !p)}
                hitSlop={6} style={fi.actionBtn}
                accessibilityRole="button"
                accessibilityLabel="Add/view note"
              >
                <StickyNote size={14} color={hasNote ? tokens.accentBlue : tokens.textMuted} />
              </Pressable>
              {/* Reschedule to tomorrow */}
              {!task.completed && (
                <Pressable onPress={onReschedule} hitSlop={6} style={fi.actionBtn} accessibilityRole="button" accessibilityLabel="Reschedule to tomorrow">
                  <CalendarClock size={14} color={tokens.textMuted} />
                </Pressable>
              )}
              {/* Delete */}
              <Pressable onPress={onDelete} hitSlop={6} style={fi.actionBtn} accessibilityRole="button" accessibilityLabel="Delete task">
                <Trash2 size={14} color={tokens.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Title */}
          <Text style={[fi.title, {
            color: task.completed ? tokens.textMuted : tokens.textPrimary,
            textDecorationLine: task.completed ? 'line-through' : 'none',
          }]} numberOfLines={2}>
            {task.title}
          </Text>

          {/* Description */}
          {(task as any).description?.trim() && (
            <Text style={[fi.desc, { color: tokens.textMuted }]} numberOfLines={2}>
              {(task as any).description.trim()}
            </Text>
          )}
        </View>
      </Pressable>

      {/* Inline note panel */}
      {
        noteExpanded && (
          <View style={[fi.notePanel, { backgroundColor: tokens.bgInput, borderColor: tokens.borderPrimary }]}>
            <StickyNote size={12} color={tokens.accentBlue} style={{ flexShrink: 0, marginTop: 2 } as any} />
            <Text style={[fi.noteText, { color: tokens.textSecondary }]}>
              {hasNote ? (task as any).note : 'No note yet — edit the task to add one.'}
            </Text>
          </View>
        )
      }

      {/* Subtasks panel */}
      {
        hasSubtasks && subtasksExpanded && (
          <View style={[fi.subtaskPanel, { backgroundColor: tokens.bgInput, borderColor: tokens.borderPrimary }]}>
            {(task.subtasks as any[]).map((sub: any) => (
              <Pressable
                key={sub.id}
                onPress={() => onToggleSubtask(sub.id)}
                style={fi.subtaskRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: sub.completed }}
              >
                {sub.completed
                  ? <CheckCircle2 size={16} color={tokens.accentGreen} />
                  : <Circle size={16} color={tokens.textMuted} />}
                <Text style={[fi.subtaskText, {
                  color: sub.completed ? tokens.textMuted : tokens.textSecondary,
                  textDecorationLine: sub.completed ? 'line-through' : 'none',
                }]}>
                  {sub.title}
                </Text>
              </Pressable>
            ))}
          </View>
        )
      }
    </View >
  )
}

const fi = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  timeColumn: {
    width: 65,
    flexShrink: 0,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  accentBar: {
    width: 3,
    height: 40,
    borderRadius: 2,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  topicPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  topicPillText: { fontSize: 10, fontWeight: '600' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto' as any,
    flexShrink: 0,
  },
  actionBtn: {
    padding: 4,
    borderRadius: 5,
  },
  title: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  desc: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  notePanel: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    paddingLeft: 14,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 8,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  subtaskPanel: {
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  subtaskText: { fontSize: 13, flex: 1 },
})

// ── Main screen ────────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  const router = useRouter()
  const { openAddTask } = useAddTaskModal()
  const { openSearch } = useMobileHeader()
  const { width } = useWindowDimensions()
  const isMobile = !(Platform.OS === 'web' && width > 768)
  const { user } = useAuth()

  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    reorderTasks,
    getNote,
    setNote,
    topics,
    getTopicColor,
    rolloverOverdueTasks,
    dataLoading,
    undo,
    todayCompleted,
    todayTotal,
    todayPercent,
  } = useProgress({ user })

  const today = getToday()

  // ── Derived data ─────────────────────────────────────────────────────────────

  const todayTasks = useMemo(() => tasks.filter(t => t.date === today), [tasks, today])
  const overdueTasks = useMemo(() => tasks.filter(t => !t.completed && t.date < today), [tasks, today])
  const overdueCount = Math.min(overdueTasks.length, 99)
  const highPriorityCount = useMemo(() => todayTasks.filter(t => t.priority === 'high' && !t.completed).length, [todayTasks])

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [showFilter, setShowFilter] = useState(false)

  const filteredTasks = useMemo(() => {
    return todayTasks.filter(t => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!t.title.toLowerCase().includes(q) && !t.topic?.toLowerCase().includes(q)) return false
      }
      if (topicFilter && t.topic !== topicFilter) return false
      if (statusFilter === 'pending' && t.completed) return false
      if (statusFilter === 'completed' && !t.completed) return false
      return true
    })
  }, [todayTasks, searchQuery, topicFilter, statusFilter])

  // TIME PLAN data
  const tasksByTopic = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of todayTasks) {
      if (!map[t.topic]) map[t.topic] = []
      map[t.topic].push(t)
    }
    return map
  }, [todayTasks])

  const totalMinutes = useMemo(
    () => todayTasks.reduce((s, t) => s + (t.duration || 0), 0),
    [todayTasks],
  )

  const completedMinutes = useMemo(
    () => todayTasks.filter(t => t.completed).reduce((s, t) => s + (t.duration || 0), 0),
    [todayTasks],
  )

  const allDone = todayTotal > 0 && todayCompleted === todayTotal

  // ── Confetti ─────────────────────────────────────────────────────────────────

  const [showConfetti, setShowConfetti] = useState(false)
  const prevCompletedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const nowCompleted = new Set(todayTasks.filter(t => t.completed).map(t => t.id))
    const justCompleted = [...nowCompleted].some(id => !prevCompletedRef.current.has(id))
    if (justCompleted && nowCompleted.size > prevCompletedRef.current.size) setShowConfetti(true)
    prevCompletedRef.current = nowCompleted
  }, [todayTasks])

  // ── Undo toast ────────────────────────────────────────────────────────────────

  const [showUndoToast, setShowUndoToast] = useState(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showCompletionToast = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setShowUndoToast(true)
    undoTimerRef.current = setTimeout(() => setShowUndoToast(false), 3000)
  }, [])

  // ── Voice input ───────────────────────────────────────────────────────────────

  const [showVoiceInput, setShowVoiceInput] = useState(false)

  // ── Overdue rollover ──────────────────────────────────────────────────────────

  const [showRolloverModal, setShowRolloverModal] = useState(false)

  useEffect(() => {
    if (dataLoading || overdueTasks.length === 0) return
    AsyncStorage.getItem(ROLLOVER_DISMISSED_KEY).then(dismissed => {
      if (dismissed !== today) setShowRolloverModal(true)
    })
  }, [dataLoading, overdueTasks.length, today])

  const handleRolloverDismiss = useCallback(async () => {
    await AsyncStorage.setItem(ROLLOVER_DISMISSED_KEY, today)
    setShowRolloverModal(false)
  }, [today])

  const handleRolloverMove = useCallback(async () => {
    await rolloverOverdueTasks()
    await AsyncStorage.setItem(ROLLOVER_DISMISSED_KEY, today)
    setShowRolloverModal(false)
  }, [rolloverOverdueTasks, today])

  // ── Note save ─────────────────────────────────────────────────────────────────

  const todayNote = getNote(today)
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNoteSave = useCallback((date: string, text: string) => {
    if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current)
    noteDebounceRef.current = setTimeout(() => setNote(date, text), 800)
    setNote(date, text)
  }, [setNote])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleAddTask = useCallback((taskData: any) => addTask(taskData), [addTask])

  const handleToggle = useCallback((id: string) => {
    toggleTaskComplete(id)
    showCompletionToast()
  }, [toggleTaskComplete, showCompletionToast])

  const handleEdit = useCallback((id: string) => {
    openAddTask({ editTaskId: id })
  }, [openAddTask])

  const handleDelete = useCallback((id: string) => {
    deleteTask(id)
  }, [deleteTask])

  const handleAddTaskForDate = useCallback(() => {
    openAddTask({ initialDate: today })
  }, [openAddTask, today])

  const handleOpenPomodoro = useCallback(() => {
    router.push('/(modals)/pomodoro')
  }, [router])

  const handleMarkAllDone = useCallback(() => {
    todayTasks.forEach(t => { if (!t.completed) toggleTaskComplete(t.id) })
  }, [todayTasks, toggleTaskComplete])

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bgPrimary }]}>
      <StatusBar barStyle={tokens.bgPrimary === '#0f172a' || tokens.bgPrimary === '#1e293b' ? 'light-content' : 'dark-content'} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Page header */}
        <View style={[styles.header, !isMobile && { maxWidth: 700, alignSelf: 'center', width: '100%' }]}>
          <View>
            <Text style={[styles.headingDate, { color: tokens.textMuted }]}>Today</Text>
            <Text style={[styles.headingTitle, { color: tokens.textPrimary }]}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {isMobile && (
              <Pressable
                onPress={openSearch}
                style={styles.iconBtnPlain}
                accessibilityRole="button"
                accessibilityLabel="Search"
              >
                <Search size={18} color={tokens.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Centered wrapper for web */}
        <View style={!isMobile ? styles.webContent : undefined}>

          {/* QuickAdd */}
          <QuickAdd
            onAdd={handleAddTask}
            topics={topics}
            getTopicColor={getTopicColor}
            tasks={todayTasks}
            onVoiceInput={() => setShowVoiceInput(true)}
          />

          {/* Stat Cards */}
          <View style={styles.statCardsRow}>
            {/* Today Tasks Card */}
            <View style={[styles.statCard, { backgroundColor: `${tokens.accentPurple}10` }]}>
              <Text style={[styles.statCardLabel, { color: tokens.textSecondary }]}>Today</Text>
              <Text style={[styles.statCardValue, { color: tokens.textPrimary }]}>{todayTotal}</Text>
              <Text style={[styles.statCardSub, { color: tokens.textMuted }]}>Tasks</Text>
              <View style={[styles.statCardIcon, { right: 12, bottom: 12 }]}>
                <ListTodo size={40} color={tokens.accentPurple} strokeWidth={1.5} />
              </View>
            </View>

            {/* High Priority Card */}
            <View style={[styles.statCard, { backgroundColor: `${tokens.accentRed}10` }]}>
              <Text style={[styles.statCardLabel, { color: tokens.textSecondary }]}>High Priority</Text>
              <Text style={[styles.statCardValue, { color: tokens.textPrimary }]}>{highPriorityCount}</Text>
              <Text style={[styles.statCardSub, { color: tokens.textMuted }]}>Tasks</Text>
              <View style={[styles.statCardIcon, { right: 12, bottom: 12 }]}>
                <Flag size={36} color={tokens.accentRed} strokeWidth={1.5} />
              </View>
            </View>
          </View>

          {/* TIME PLAN — stacked bar (only when tasks exist with durations) */}
          {Object.keys(tasksByTopic).length > 0 && totalMinutes > 0 && (
            <View style={[styles.timePlanCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
              <Text style={[styles.timePlanTitle, { color: tokens.textSecondary }]}>TIME PLAN</Text>
              {/* Stacked bar */}
              <View style={styles.timePlanBar}>
                {Object.entries(tasksByTopic).map(([topic, tTasks]) => {
                  const mins = (tTasks as Task[]).reduce((s, t) => s + (t.duration || 0), 0)
                  const pct = totalMinutes > 0 ? (mins / totalMinutes) * 100 : 0
                  return (
                    <View
                      key={topic}
                      style={{ flex: pct, backgroundColor: getTopicColor(topic), minWidth: pct > 5 ? 1 : 0 }}
                    />
                  )
                })}
                {/* Centered total label */}
                <View style={styles.timePlanLabel}>
                  <Text style={styles.timePlanLabelText}>{fmtDuration(totalMinutes)}</Text>
                </View>
              </View>
              {/* Legend - horizontally scrollable */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timePlanLegend}
              >
                {Object.entries(tasksByTopic).map(([topic, tTasks]) => {
                  const mins = (tTasks as Task[]).reduce((s, t) => s + (t.duration || 0), 0)
                  return (
                    <View key={topic} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: getTopicColor(topic) }]} />
                      <Text style={[styles.legendText, { color: tokens.textSecondary }]} numberOfLines={1}>
                        {topic}: <Text style={{ color: tokens.textPrimary, fontWeight: '500' }}>{fmtDuration(mins)}</Text>
                      </Text>
                    </View>
                  )
                })}
              </ScrollView>
            </View>
          )}

          {/* TASKS section header */}
          <View style={styles.tasksHeader}>
            <View style={styles.tasksLabelRow}>
              <Text style={[styles.tasksSectionLabel, { color: tokens.textSecondary }]}>
                TASKS
              </Text>
              {filteredTasks.length > 0 && (
                <View style={[styles.countChip, { backgroundColor: tokens.accentPrimaryMuted }]}>
                  <Text style={[styles.countChipText, { color: tokens.accentPrimary }]}>
                    {filteredTasks.length}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.tasksActions}>
              {/* Focus button — when incomplete tasks exist */}
              {todayTasks.some(t => !t.completed) && (
                <Pressable
                  onPress={() => {
                    const first = todayTasks.find(t => !t.completed)
                    if (first) router.push({ pathname: '/(modals)/pomodoro', params: { taskId: first.id } })
                  }}
                  style={[styles.ghostBtn, { borderColor: tokens.borderPrimary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Focus mode"
                >
                  <Focus size={13} color={tokens.accentBlue} />
                  <Text style={[styles.ghostBtnText, { color: tokens.accentBlue }]}>Focus</Text>
                </Pressable>
              )}
              {/* Mark all done */}
              {todayTotal > 0 && !allDone && (
                <Pressable
                  onPress={handleMarkAllDone}
                  style={[styles.iconBtn, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Mark all done"
                >
                  <CheckCheck size={16} color={tokens.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Search / filter bar — shown when tasks exist */}
          {todayTasks.length > 0 && (
            <View style={styles.searchSection}>
              <View style={[styles.searchRow, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
                <Search size={14} color={tokens.textMuted} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search today's tasks..."
                  placeholderTextColor={tokens.textMuted}
                  style={[styles.searchInput, {
                    color: tokens.textPrimary,
                    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})
                  }]}
                  accessibilityLabel="Search tasks"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <X size={14} color={tokens.textMuted} />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setShowFilter(p => !p)}
                  style={[styles.filterBtn,
                  (topicFilter || statusFilter !== 'all') && { backgroundColor: tokens.accentBlue }
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Filter"
                >
                  <Filter size={13} color={(topicFilter || statusFilter !== 'all') ? '#fff' : tokens.textMuted} />
                </Pressable>
              </View>

              {/* Filter dropdown */}
              {showFilter && (
                <View style={[styles.filterDropdown, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
                  {/* Status */}
                  <Text style={[styles.filterLabel, { color: tokens.textMuted }]}>Status</Text>
                  <View style={styles.filterChips}>
                    {(['all', 'pending', 'completed'] as const).map(s => {
                      const isSelected = statusFilter === s
                      // Color based on status type (matching topic tag style - light bg, colored text/border)
                      const statusColor = s === 'pending' ? tokens.accentOrange
                        : s === 'completed' ? tokens.accentGreen
                          : tokens.accentBlue

                      return (
                        <Pressable
                          key={s}
                          onPress={() => setStatusFilter(s)}
                          style={[
                            styles.filterChip,
                            isSelected && { backgroundColor: `${statusColor}20`, borderColor: statusColor },
                          ]}
                        >
                          <Text style={[styles.filterChipText, { color: isSelected ? statusColor : tokens.textSecondary }]}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                  {/* Topics */}
                  {topics.length > 0 && (
                    <>
                      <Text style={[styles.filterLabel, { color: tokens.textMuted, marginTop: 10 }]}>Topic</Text>
                      <View style={styles.filterChips}>
                        <Pressable
                          onPress={() => setTopicFilter('')}
                          style={[styles.filterChip, !topicFilter && { backgroundColor: `${tokens.accentBlue}20`, borderColor: tokens.accentBlue }]}
                        >
                          <Text style={[styles.filterChipText, { color: !topicFilter ? tokens.accentBlue : tokens.textSecondary }]}>All</Text>
                        </Pressable>
                        {topics.map((t: any) => (
                          <Pressable
                            key={t.name}
                            onPress={() => setTopicFilter(t.name)}
                            style={[styles.filterChip, topicFilter === t.name && { backgroundColor: `${getTopicColor(t.name)}20`, borderColor: getTopicColor(t.name) }]}
                          >
                            <Text style={[styles.filterChipText, { color: topicFilter === t.name ? getTopicColor(t.name) : tokens.textSecondary }]}>
                              {t.name}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Task list — flat */}
          {dataLoading ? (
            <View style={styles.loadingRow}>
              <Text style={[styles.loadingText, { color: tokens.textMuted }]}>Loading tasks…</Text>
            </View>
          ) : filteredTasks.length === 0 && todayTasks.length === 0 ? (
            /* Empty state — no tasks */
            <View style={[styles.emptyState, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
              <ClipboardList size={40} color={tokens.textMuted} />
              <Text style={[styles.emptyTitle, { color: tokens.textPrimary }]}>No tasks for today</Text>
              <Text style={[styles.emptySubtitle, { color: tokens.textMuted }]}>Add some tasks to get started</Text>
              <Pressable
                onPress={handleAddTaskForDate}
                style={({ pressed }) => [styles.emptyAddBtn, { backgroundColor: tokens.accentBlue, opacity: pressed ? 0.8 : 1 }]}
                accessibilityRole="button"
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.emptyAddBtnText}>Add Your First Task</Text>
              </Pressable>
            </View>
          ) : filteredTasks.length === 0 ? (
            /* No filter matches */
            <View style={[styles.emptyState, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
              <Text style={[styles.emptySubtitle, { color: tokens.textMuted }]}>No tasks match your filters</Text>
            </View>
          ) : (
            <View style={[styles.taskListCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
              {filteredTasks.map((task, idx) => {
                const isLast = idx === filteredTasks.length - 1
                return (
                  <View
                    key={task.id}
                    style={[
                      styles.taskItemWrapper,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: tokens.borderPrimary },
                    ]}
                  >
                    <FlatTaskItem
                      task={task}
                      onToggle={() => handleToggle(task.id)}
                      onEdit={() => handleEdit(task.id)}
                      onDelete={() => handleDelete(task.id)}
                      onFocus={() => router.push({ pathname: '/(modals)/pomodoro', params: { taskId: task.id } })}
                      onReschedule={() => {
                        const tomorrow = new Date()
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        const tomorrowStr = tomorrow.toISOString().split('T')[0]
                        updateTask(task.id, { date: tomorrowStr } as any)
                      }}
                      onToggleSubtask={(subId: string) => {
                        const sub = task.subtasks?.find((s: any) => s.id === subId) as any
                        if (sub) updateTask(task.id, {
                          subtasks: task.subtasks?.map((s: any) =>
                            s.id === subId ? { ...s, completed: !s.completed } : s
                          ),
                        } as any)
                      }}
                      getTopicColor={getTopicColor}
                      tokens={tokens}
                    />
                  </View>
                )
              })}
            </View>
          )}

          {/* Daily Notes */}
          <DailyNotes date={today} note={todayNote} onSave={handleNoteSave} />

        </View>{/* end webContent */}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Overlays */}
      {showRolloverModal && overdueTasks.length > 0 && (
        <OverdueRolloverModal
          tasks={overdueTasks}
          onMoveSelected={handleRolloverMove}
          onDismiss={handleRolloverDismiss}
        />
      )}

      <Confetti visible={showConfetti} onDone={() => setShowConfetti(false)} />

      <VoiceInput
        isOpen={showVoiceInput}
        onClose={() => setShowVoiceInput(false)}
        onResult={(parsed) => { handleAddTask(parsed as any); setShowVoiceInput(false) }}
        topics={topics as any}
      />

      {/* Undo toast */}
      {showUndoToast && (
        <View style={[styles.undoToast, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
          <Text style={[styles.undoToastText, { color: tokens.textPrimary }]}>✓ Task completed</Text>
          <Pressable
            onPress={() => { undo(); setShowUndoToast(false) }}
            style={[styles.undoBtn, { borderColor: tokens.accentBlue }]}
            accessibilityRole="button"
          >
            <Text style={[styles.undoBtnText, { color: tokens.accentBlue }]}>Undo</Text>
          </Pressable>
        </View>
      )}

      {/* Floating Action Button */}
      <Pressable
        onPress={handleAddTaskForDate}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: tokens.accentPrimary },
          pressed && styles.fabPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add new task"
      >
        <Plus size={28} color="#fff" strokeWidth={2.5} />
      </Pressable>
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    safe: { flex: 1 },
    scroll: { flex: 1 },
    content: { padding: 16, paddingTop: Platform.OS === 'android' ? 16 : 8 },
    webContent: { maxWidth: 700, alignSelf: 'center', width: '100%' },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    headingDate: { fontSize: 13, marginBottom: 2 },
    headingTitle: { fontSize: 26, fontWeight: '700' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    overdueBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    overdueBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
    iconBtnPlain: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

    // Stat cards
    statCardsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      borderRadius: 16,
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
      minHeight: 100,
    },
    statCardLabel: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 8,
    },
    statCardValue: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 38,
    },
    statCardSub: {
      fontSize: 13,
      marginTop: 2,
    },
    statCardIcon: {
      position: 'absolute',
      opacity: 0.8,
    },

    // TIME PLAN
    timePlanCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 16 },
    timePlanTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, marginBottom: 10 },
    timePlanBar: {
      height: 24,
      borderRadius: 8,
      overflow: 'hidden',
      flexDirection: 'row',
      marginBottom: 10,
      position: 'relative',
    },
    timePlanLabel: {
      position: 'absolute',
      left: 0, right: 0, top: 0, bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timePlanLabelText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    timePlanLegend: { flexDirection: 'row', gap: 14 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
    legendDot: { width: 10, height: 10, borderRadius: 3 },
    legendText: { fontSize: 12 },

    // TASKS header
    tasksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    tasksLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tasksSectionLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
    countChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, minWidth: 22, alignItems: 'center' },
    countChipText: { fontSize: 12, fontWeight: '600' },
    tasksActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ghostBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
    },
    ghostBtnText: { fontSize: 12, fontWeight: '500' },

    // Search
    searchSection: { marginBottom: 12 },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 12, paddingVertical: 9,
      borderRadius: 10, borderWidth: 1,
    },
    searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
    filterBtn: { padding: 5, borderRadius: 6 },
    filterDropdown: {
      marginTop: 8, borderRadius: 12, borderWidth: 1,
      padding: 14,
    },
    filterLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
    filterChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    filterChip: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
      borderWidth: 1, borderColor: 'transparent',
    },
    filterChipText: { fontSize: 12, fontWeight: '500' },

    // Task list
    taskList: { marginBottom: 8 },
    taskListCard: {
      borderRadius: 16,
      padding: 12,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: 16,
    },
    taskItemWrapper: {
      paddingVertical: 4,
    },
    loadingRow: { paddingVertical: 32, alignItems: 'center' },
    loadingText: { fontSize: 14 },

    // Empty state
    emptyState: { paddingVertical: 60, paddingHorizontal: 20, alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
    emptyTitle: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
    emptySubtitle: { fontSize: 14, textAlign: 'center' },
    emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
    emptyAddBtnText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },

    // Undo toast
    undoToast: {
      position: 'absolute', bottom: 20, left: 20, right: 20,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
        android: { elevation: 6 },
        web: { boxShadow: '0 2px 6px rgba(0,0,0,0.15)' } as any,
      }),
    },
    undoToastText: { fontSize: 14, fontWeight: '500' },
    undoBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    undoBtnText: { fontSize: 13, fontWeight: '600' },

    // Floating Action Button
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 100,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
        web: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        } as any,
      }),
    },
    fabPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.95 }],
    },
  })
}
