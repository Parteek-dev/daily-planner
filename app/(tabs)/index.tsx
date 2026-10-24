/**
 * Home tab screen — Overview of your tasks and goals.
 *
 * Shows task stats (Tasks, In Progress, Completed, Overdue, Streak),
 * Today's Schedule, and Daily Goals.
 *
 * Works on iOS, Android, and web (responsive at 768px breakpoint).
 */

import React, { useMemo, useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  Platform,
  Pressable,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import {
  Flame,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Clock,
  Check,
  Timer,
} from 'lucide-react-native'
import { useRouter } from 'expo-router'

import { useAuth } from '@/src/hooks/useAuth'
import { useProgress } from '@/src/hooks/useProgress'
import { useTheme } from '@/src/hooks/useTheme'
import { useMotion } from '@/src/hooks/useMotion'
import { useAddTaskModal } from '@/src/context/AddTaskModalContext'
import { UnifiedTaskItem } from '@/src/components/task/UnifiedTaskItem'

const SIDEBAR_BREAKPOINT = 768

type TimePeriod = 'today' | 'week' | 'month' | 'all'

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
}

// Helper to format time (HH:MM to 12-hour format)
function formatTime(time: string | undefined | null): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`
}

// Helper to get start of week (Monday)
function getStartOfWeek(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday (handle Sunday = 0)
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

// Helper to get start of month
function getStartOfMonth(): string {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  return firstDay.toISOString().split('T')[0]
}

// Helper to get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

// Helper to get user's display name
function getDisplayName(user: { displayName?: string | null; email?: string | null } | null): string {
  if (!user) return 'there'
  if (user.displayName) return user.displayName.split(' ')[0]
  if (user.email) return user.email.split('@')[0]
  return 'there'
}

// Helper to format duration in hours and minutes
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { tokens } = useTheme()
  const { user } = useAuth()
  const { width } = useWindowDimensions()
  const router = useRouter()
  const { openAddTask } = useAddTaskModal()
  const motion = useMotion()
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week')
  const [showPeriodPicker, setShowPeriodPicker] = useState(false)

  const isMobile = !(Platform.OS === 'web' && width > SIDEBAR_BREAKPOINT)

  const {
    tasks,
    streakData,
    todayTasks,
    getTopicColor,
    dailyGoalProgress,
  } = useProgress({ user })

  // Greeting info
  const greeting = useMemo(() => getGreeting(), [])
  const displayName = useMemo(() => getDisplayName(user), [user])

  // Today's focus task (first incomplete task with time, or first task)
  const focusTask = useMemo(() => {
    const incomplete = todayTasks.filter(t => !t.completed)
    // Prefer tasks with due time
    const withTime = incomplete.filter(t => t.dueTime).sort((a, b) =>
      (a.dueTime || '').localeCompare(b.dueTime || '')
    )
    return withTime[0] || incomplete[0] || null
  }, [todayTasks])

  // Calculate today's progress for focus card
  const todayProgress = useMemo(() => {
    const total = todayTasks.length
    const completed = todayTasks.filter(t => t.completed).length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, percent }
  }, [todayTasks])

  // Animated progress bar
  const progressWidth = useSharedValue(todayProgress.percent)

  useEffect(() => {
    const durationMs = motion.getDuration('normal')
    if (durationMs === 0) {
      progressWidth.value = todayProgress.percent
    } else {
      progressWidth.value = withTiming(todayProgress.percent, {
        duration: 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    }
  }, [todayProgress.percent, motion, progressWidth])

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as any,
  }))

  // Calculate stats based on selected time period
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  const filteredStats = useMemo(() => {
    const weekStart = getStartOfWeek()
    const monthStart = getStartOfMonth()

    let filtered = tasks

    if (timePeriod === 'today') {
      filtered = tasks.filter(t => t.date === today)
    } else if (timePeriod === 'week') {
      filtered = tasks.filter(t => t.date >= weekStart)
    } else if (timePeriod === 'month') {
      filtered = tasks.filter(t => t.date >= monthStart)
    }
    // 'all' uses all tasks

    const totalTasks = filtered.length
    const completedTasks = filtered.filter(t => t.completed)
    const completed = completedTasks.length
    const incompleteTasks = filtered.filter(t => !t.completed)
    const overdue = incompleteTasks.filter(t => t.date < today).length
    const inProgress = incompleteTasks.filter(t => t.date >= today).length

    // Calculate time invested (actual duration for completed tasks, or planned duration as fallback)
    const timeInvested = completedTasks.reduce((sum, t) => {
      return sum + (t.actualDuration ?? t.duration ?? 0)
    }, 0)

    return { totalTasks, completed, overdue, inProgress, timeInvested }
  }, [tasks, timePeriod, today])

  // Today's tasks sorted by time
  const todaySchedule = useMemo(() => {
    return [...todayTasks]
      .filter(t => !t.completed)
      .sort((a, b) => {
        if (!a.dueTime && !b.dueTime) return 0
        if (!a.dueTime) return 1
        if (!b.dueTime) return -1
        return a.dueTime.localeCompare(b.dueTime)
      })
      .slice(0, 5)
  }, [todayTasks])

  // Card configuration for the overview stats (4 key metrics)
  const statsCards = [
    {
      key: 'completed',
      label: 'Completed',
      value: filteredStats.completed,
      subLabel: 'Tasks',
      icon: CheckCircle2,
      iconColor: tokens.accentGreen,
      bgTint: `${tokens.accentGreen}12`,
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: filteredStats.overdue,
      subLabel: 'Tasks',
      icon: AlertCircle,
      iconColor: tokens.accentRed,
      bgTint: `${tokens.accentRed}12`,
    },
    {
      key: 'streak',
      label: 'Streak',
      value: streakData.current,
      subLabel: `Best: ${streakData.best} days`,
      icon: Flame,
      iconColor: streakData.current > 0 ? '#f97316' : tokens.textMuted,
      bgTint: streakData.current > 0 ? 'rgba(249, 115, 22, 0.12)' : `${tokens.textMuted}14`,
    },
    {
      key: 'timeInvested',
      label: 'Time Invested',
      value: formatDuration(filteredStats.timeInvested),
      subLabel: 'Completed Tasks',
      icon: Timer,
      iconColor: tokens.accentPurple,
      bgTint: `${tokens.accentPurple}12`,
    },
  ]

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tokens.bgTertiary }]}>
      <StatusBar barStyle={tokens.bgPrimary === '#0f172a' || tokens.bgPrimary === '#ffffff' ? 'dark-content' : 'light-content'} />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Centered wrapper for web */}
        <View style={!isMobile ? s.webContent : undefined}>
          {/* Greeting Section */}
          <View style={s.greetingSection}>
            <View style={s.greetingLeft}>
              <Text style={[s.greetingText, { color: tokens.textSecondary }]}>{greeting},</Text>
              <Text style={[s.userName, { color: tokens.textPrimary }]}>{displayName} 👋</Text>
            </View>
          </View>

          {/* Today's Focus Card */}
          <View style={[s.focusCard, { backgroundColor: tokens.accentPurple }]}>
            <View style={s.focusContent}>
              <Text style={s.focusLabel}>Today's Focus</Text>
              <Text style={s.focusTitle} numberOfLines={2}>
                {focusTask?.title || 'No tasks for today'}
              </Text>
              <View style={s.focusProgressSection}>
                <Text style={s.focusProgressLabel}>Progress</Text>
                <View style={s.focusProgressRow}>
                  <View style={s.focusProgressTrack}>
                    <Animated.View style={[s.focusProgressFill, animatedProgressStyle]} />
                  </View>
                  <Text style={s.focusProgressText}>{todayProgress.percent}%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Page header with Overview title and dropdown */}
          <View style={s.header}>
            <Text style={[s.pageTitle, { color: tokens.textPrimary }]}>Overview</Text>

            {/* Time period dropdown */}
            <View style={s.dropdownContainer}>
              <Pressable
                onPress={() => setShowPeriodPicker(!showPeriodPicker)}
                style={({ pressed }) => [
                  s.periodDropdown,
                  { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary },
                  showPeriodPicker && { borderColor: tokens.accentPrimary },
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${TIME_PERIOD_LABELS[timePeriod]}`}
              >
                <Text style={[s.periodDropdownText, { color: tokens.textPrimary }]}>
                  {TIME_PERIOD_LABELS[timePeriod]}
                </Text>
                <ChevronDown size={16} color={tokens.textMuted} />
              </Pressable>

              {/* Inline dropdown menu */}
              {showPeriodPicker && (
                <View style={[s.dropdownMenu, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
                  {(['today', 'week', 'month', 'all'] as TimePeriod[]).map((period) => {
                    const isSelected = timePeriod === period
                    return (
                      <Pressable
                        key={period}
                        onPress={() => {
                          setTimePeriod(period)
                          setShowPeriodPicker(false)
                        }}
                        style={({ pressed }) => [
                          s.dropdownOption,
                          isSelected && { backgroundColor: `${tokens.accentPrimary}10` },
                          pressed && { opacity: 0.7 },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text style={[
                          s.dropdownOptionText,
                          { color: isSelected ? tokens.accentPrimary : tokens.textPrimary },
                        ]}>
                          {TIME_PERIOD_LABELS[period]}
                        </Text>
                        {isSelected && <Check size={16} color={tokens.accentPrimary} />}
                      </Pressable>
                    )
                  })}
                </View>
              )}
            </View>
          </View>

          {/* Stats Section */}
          <View style={isMobile ? s.statsGrid : s.statsGridDesktop}>
            {statsCards.map((card) => {
              const IconComponent = card.icon
              return (
                <View
                  key={card.key}
                  style={[
                    s.overviewStatCard,
                    { backgroundColor: card.bgTint },
                  ]}
                >
                  {/* Header row with icon and label */}
                  <View style={s.overviewStatHeader}>
                    <IconComponent size={16} color={card.iconColor} strokeWidth={2} />
                    <Text style={[s.overviewStatLabel, { color: card.iconColor }]}>
                      {card.label}
                    </Text>
                  </View>
                  <Text style={[s.overviewStatValue, { color: tokens.textPrimary }]}>
                    {card.value}
                  </Text>
                  <Text style={[s.overviewStatSub, { color: tokens.textMuted }]}>
                    {card.subLabel}
                  </Text>
                </View>
              )
            })}
          </View>

          {/* Today's Schedule */}
          <View style={[s.card, {
            backgroundColor: tokens.bgPrimary,
            borderWidth: 1,
            borderColor: tokens.borderPrimary,
            ...(Platform.OS === 'ios'
              ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }
              : Platform.OS === 'android'
                ? { elevation: 2 }
                : { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
            ),
          } as any]}>
            <View style={s.cardHeader}>
              <Text style={[s.cardTitle, { color: tokens.textPrimary }]}>Today's Schedule</Text>
              <Pressable
                onPress={() => router.push('/(tabs)/today')}
                style={({ pressed }) => [s.seeAllBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="See all tasks"
              >
                <Text style={[s.seeAllText, { color: tokens.textMuted }]}>See all</Text>
                <ChevronRight size={14} color={tokens.textMuted} />
              </Pressable>
            </View>

            {todayTasks.length === 0 ? (
              <View style={[s.emptySchedule, { backgroundColor: tokens.bgInput }]}>
                <Clock size={24} color={tokens.textMuted} />
                <Text style={[s.emptyScheduleText, { color: tokens.textMuted }]}>
                  No tasks scheduled for today
                </Text>
                <Pressable
                  onPress={() => openAddTask()}
                  style={({ pressed }) => [
                    s.addTaskBtn,
                    { backgroundColor: tokens.accentPrimary, opacity: pressed ? 0.8 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add a task"
                >
                  <Text style={s.addTaskBtnText}>Add a task</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.scheduleList}>
                {todaySchedule.map((task, idx) => (
                  <UnifiedTaskItem
                    key={task.id}
                    task={task}
                    onToggle={() => {/* toggle handled in today screen */ }}
                    onPress={() => openAddTask({ editTaskId: task.id })}
                    getTopicColor={getTopicColor}
                    showActions={false}
                    compact
                    showSeparator={idx < todaySchedule.length - 1}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>{/* end webContent */}
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
  },
  webContent: {
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%' as any,
  },

  // Greeting section
  greetingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greetingLeft: {
    flex: 1,
  },
  greetingText: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
  },

  // Today's Focus card
  focusCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    minHeight: 160,
  },
  focusContent: {
    flex: 1,
    maxWidth: '65%',
  },
  focusLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  focusTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 28,
    marginBottom: 16,
  },
  focusProgressSection: {
    marginTop: 'auto',
  },
  focusProgressLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  focusProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  focusProgressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  focusProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 99,
  },
  focusProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    minWidth: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 100,
  },
  pageTitle: { fontSize: 22, fontWeight: '700' },

  // Period dropdown
  periodDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  periodDropdownText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Stats grid (mobile 2x2)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  // Desktop: 5-column flex grid
  statsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  // Overview stat cards
  overviewStatCard: {
    width: '47%' as any,
    flexGrow: 1,
    minWidth: 140,
    maxWidth: '50%' as any,
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
  },
  overviewStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  overviewStatLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  overviewStatValue: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  overviewStatSub: {
    fontSize: 13,
    marginTop: 2,
  },

  // Card styles
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Empty schedule
  emptySchedule: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyScheduleText: {
    fontSize: 14,
    textAlign: 'center',
  },
  addTaskBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addTaskBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Schedule list
  scheduleList: {
    gap: 0,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  scheduleAccent: {
    width: 3,
    height: 40,
    borderRadius: 2,
  },
  scheduleTime: {
    width: 70,
  },
  scheduleTimeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scheduleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleContent: {
    flex: 1,
    gap: 2,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleTopic: {
    fontSize: 12,
  },

  // Dropdown container
  dropdownContainer: {
    position: 'relative',
    zIndex: 100,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    width: 160,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
    }),
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
})
