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
  Focus,
  CheckCheck,
  Sparkles,
  X,
  Filter,
  ListTodo,
  List,
  CalendarDays,
} from 'lucide-react-native'

import { useAuth } from '@/src/hooks/useAuth'
import { useProgress } from '@/src/hooks/useProgress'
import { useTheme } from '@/src/hooks/useTheme'
import { useMobileHeader } from '@/src/context/MobileHeaderContext'
import { useAddTaskModal } from '@/src/context/AddTaskModalContext'
import { usePomodoroModal } from '@/src/context/PomodoroModalContext'
import QuickAdd from '@/src/components/task/QuickAdd'
import DailyNotes from '@/src/components/DailyNotes'
import OverdueRolloverModal from '@/src/components/task/OverdueRolloverModal'
import { Confetti } from '@/src/components/Confetti'
import VoiceInput from '@/src/components/VoiceInput'
import { fmtDuration } from '@/src/lib/utils'
import type { Task } from '@/src/lib/firestoreMappers'
import { UnifiedTaskItem } from '@/src/components/task/UnifiedTaskItem'
import { DayTimeline } from '@/src/components/task/DayTimeline'
import { CrossfadeView } from '@/src/components/motion'

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

// ── Main screen ────────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  const router = useRouter()
  const { openAddTask } = useAddTaskModal()
  const { openPomodoro } = usePomodoroModal()
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
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')

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

  // Sorted by priority for list view (high → medium → low → none, then by due time)
  const sortedTasksForList = useMemo(() => {
    const getPrioritySortValue = (p: string | null | undefined) =>
      ({ high: 0, medium: 1, low: 2 } as Record<string, number>)[p ?? ''] ?? 3

    return [...filteredTasks].sort((a, b) => {
      const diff = getPrioritySortValue(a.priority) - getPrioritySortValue(b.priority)
      if (diff !== 0) return diff
      // Secondary sort by due time
      if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime)
      if (a.dueTime) return -1
      if (b.dueTime) return 1
      return 0
    })
  }, [filteredTasks])

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
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bgTertiary }]}>
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
              <View style={styles.statCardHeader}>
                <ListTodo size={16} color={tokens.accentPurple} strokeWidth={2} />
                <Text style={[styles.statCardLabel, { color: tokens.accentPurple }]}>Today</Text>
              </View>
              <Text style={[styles.statCardValue, { color: tokens.textPrimary }]}>{todayTotal}</Text>
              <Text style={[styles.statCardSub, { color: tokens.textMuted }]}>Tasks</Text>
            </View>

            {/* High Priority Card */}
            <View style={[styles.statCard, { backgroundColor: `${tokens.accentRed}10` }]}>
              <View style={styles.statCardHeader}>
                <Flag size={16} color={tokens.accentRed} strokeWidth={2} />
                <Text style={[styles.statCardLabel, { color: tokens.accentRed }]}>High Priority</Text>
              </View>
              <Text style={[styles.statCardValue, { color: tokens.textPrimary }]}>{highPriorityCount}</Text>
              <Text style={[styles.statCardSub, { color: tokens.textMuted }]}>Tasks</Text>
            </View>
          </View>

          {/* TIME PLAN — stacked bar (only when tasks exist with durations) */}
          {Object.keys(tasksByTopic).length > 0 && totalMinutes > 0 && (
            <View style={[styles.timePlanCard, styles.cardElevated]}>
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
              {/* View toggle */}
              <View style={[styles.viewToggle, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
                <Pressable
                  onPress={() => setViewMode('list')}
                  style={[
                    styles.viewToggleBtn,
                    viewMode === 'list' && { backgroundColor: tokens.bgPrimary },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="List view"
                  accessibilityState={{ selected: viewMode === 'list' }}
                >
                  <List size={14} color={viewMode === 'list' ? tokens.accentPrimary : tokens.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => setViewMode('timeline')}
                  style={[
                    styles.viewToggleBtn,
                    viewMode === 'timeline' && { backgroundColor: tokens.bgPrimary },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Timeline view"
                  accessibilityState={{ selected: viewMode === 'timeline' }}
                >
                  <CalendarDays size={14} color={viewMode === 'timeline' ? tokens.accentPrimary : tokens.textMuted} />
                </Pressable>
              </View>
              {/* Focus button — when incomplete tasks exist */}
              {todayTasks.some(t => !t.completed) && (
                <Pressable
                  onPress={() => {
                    const first = todayTasks.find(t => !t.completed)
                    if (first) {
                      openPomodoro({ taskId: first.id })
                    }
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
              {/* Add task button — web only */}
              {!isMobile && (
                <Pressable
                  onPress={handleAddTaskForDate}
                  style={[styles.iconBtn, { backgroundColor: tokens.accentPrimaryMuted }]}
                  accessibilityRole="button"
                  accessibilityLabel="Add task"
                >
                  <Plus size={16} color={tokens.accentPrimary} />
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

          {/* Task list — flat or timeline */}
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
            /* Task list — crossfade between list and timeline */
            <CrossfadeView viewKey={viewMode} duration="fast">
              {viewMode === 'timeline' ? (
                <View style={[styles.timelineCard, styles.cardElevated]}>
                  <DayTimeline
                    tasks={filteredTasks}
                    onToggle={handleToggle}
                    onPress={handleEdit}
                    onReschedule={(id, newTime) => {
                      updateTask(id, { dueTime: newTime } as any)
                    }}
                    getTopicColor={getTopicColor}
                    hourHeight={72}
                  />
                </View>
              ) : (
                <View style={[styles.taskListCard, styles.cardElevated]}>
                  {sortedTasksForList.map((task, idx) => {
                    const isLast = idx === sortedTasksForList.length - 1
                    return (
                      <UnifiedTaskItem
                        key={task.id}
                        task={task}
                        onToggle={() => handleToggle(task.id)}
                        onPress={() => handleEdit(task.id)}
                        onDelete={() => handleDelete(task.id)}
                        onFocus={() => openPomodoro({ taskId: task.id })}
                        onReschedule={() => {
                          const tomorrow = new Date()
                          tomorrow.setDate(tomorrow.getDate() + 1)
                          const tomorrowStr = tomorrow.toISOString().split('T')[0]
                          updateTask(task.id, { date: tomorrowStr } as any)
                        }}
                        getTopicColor={getTopicColor}
                        showActions
                        showSeparator={!isLast}
                      />
                    )
                  })}
                </View>
              )}
            </CrossfadeView>
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

      {/* Floating Action Button — mobile only (web has QuickAdd bar) */}
      {isMobile && (
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
      )}
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
      minHeight: 100,
    },
    statCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    statCardLabel: {
      fontSize: 13,
      fontWeight: '600',
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

    // TIME PLAN
    timePlanCard: { borderRadius: 14, padding: 14, marginBottom: 16 },

    // Elevated card style (white background + shadow)
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
        web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } as any,
      }),
    },
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
    viewToggle: {
      flexDirection: 'row',
      borderRadius: 8,
      borderWidth: 1,
      padding: 2,
    },
    viewToggleBtn: {
      padding: 6,
      borderRadius: 6,
    },

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
    timelineCard: {
      borderRadius: 16,
      padding: 12,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: 16,
      height: 450,
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
