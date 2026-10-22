/**
 * progressStats — pure, dependency-free analytics/selectors extracted from
 * `useProgress`.
 *
 * Every function here is a verbatim move of a memo/callback body from the hook,
 * with `today`/`now` made injectable for determinism. The hook imports these
 * and delegates to them so runtime behavior is unchanged. No React, Firestore,
 * or AsyncStorage is referenced here.
 */

import type { Task } from '@/src/lib/firestoreMappers'

// ── Goals shape used internally (mirrors useProgress GoalsState) ─────────────

export interface GoalsState {
  dailyTaskTarget: number
  extraGoals: Array<{
    id: string
    type: 'min_tasks' | 'min_time' | 'all_priority'
    value?: number
    topic?: string
    priority?: 'high' | 'medium' | 'low'
  }>
}

// ── Date helpers (verbatim from useProgress module scope) ─────────────────────

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay()
}

// ── Recurrence predicate ──────────────────────────────────────────────────────

export function shouldCreateRecurringTask(task: Task, dateStr: string): boolean {
  const dayOfWeek = getDayOfWeek(dateStr)
  switch (task.recurrence) {
    case 'daily': return true
    case 'weekly': return getDayOfWeek(task.date) === dayOfWeek
    case 'weekdays': return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'custom': return task.customRecurrenceDays?.includes(dayOfWeek) || false
    default: return false
  }
}

// ── Priority & dependency selectors ───────────────────────────────────────────

export function getPrioritySortValue(p: string | null): number {
  return ({ high: 0, medium: 1, low: 2 } as Record<string, number>)[p ?? ''] ?? 3
}

export function sortTasksByPriority(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    const diff = getPrioritySortValue(a.priority) - getPrioritySortValue(b.priority)
    if (diff !== 0) return diff
    if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime)
    if (a.dueTime) return -1
    if (b.dueTime) return 1
    return 0
  })
}

export function areDependenciesMet(task: Task, tasks: Task[]): boolean {
  if (!task.dependsOn?.length) return true
  return task.dependsOn.every(id => tasks.find(t => t.id === id)?.completed === true)
}

// ── Streak ────────────────────────────────────────────────────────────────────

export interface StreakData {
  current: number
  best: number
  studiedToday: boolean
}

export function computeStreak(tasks: Task[], today: string): StreakData {
  const completedDates = new Set(tasks.filter(t => t.completed).map(t => t.date))
  if (completedDates.size === 0) return { current: 0, best: 0, studiedToday: false }

  const studiedToday = completedDates.has(today)
  const sorted = Array.from(completedDates).sort()

  let best = 0, streak = 0
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) { streak = 1 } else {
      const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000
      streak = diff === 1 ? streak + 1 : 1
    }
    best = Math.max(best, streak)
  }

  let current = 0
  let check = new Date(today)
  if (!completedDates.has(today)) check.setDate(check.getDate() - 1)

  while (true) {
    const ds = check.toISOString().split('T')[0]
    if (completedDates.has(ds)) { current++; check.setDate(check.getDate() - 1) }
    else break
  }

  return { current, best, studiedToday }
}

// ── Time Tracking Analytics ────────────────────────────────────────────────────

export function computeTimeTrackingStats(tasks: Task[]) {
  const tracked = tasks.filter(t => t.completed && t.actualDuration != null)
  if (tracked.length === 0) return { totalEstimated: 0, totalActual: 0, accuracy: 0, overEstimateCount: 0, underEstimateCount: 0, accurateCount: 0, averageVariance: 0, byTopic: {}, totalTracked: 0 }
  let totalEst = 0, totalAct = 0, over = 0, under = 0, accurate = 0
  const byTopic: Record<string, { estimated: number; actual: number; count: number }> = {}
  tracked.forEach(t => {
    const est = t.duration || 0, act = t.actualDuration || 0
    totalEst += est; totalAct += act
    const pct = est > 0 ? Math.abs((act - est) / est) * 100 : 0
    if (pct <= 10) accurate++
    else if (act < est) over++
    else under++
    if (!byTopic[t.topic]) byTopic[t.topic] = { estimated: 0, actual: 0, count: 0 }
    byTopic[t.topic].estimated += est
    byTopic[t.topic].actual += act
    byTopic[t.topic].count++
  })
  return {
    totalEstimated: totalEst,
    totalActual: totalAct,
    accuracy: totalEst > 0 ? Math.max(0, Math.round((1 - Math.abs(totalAct - totalEst) / totalEst) * 100)) : 0,
    overEstimateCount: over,
    underEstimateCount: under,
    accurateCount: accurate,
    averageVariance: tracked.length > 0 ? Math.round((totalAct - totalEst) / tracked.length) : 0,
    byTopic,
    totalTracked: tracked.length,
  }
}

// ── Best Hours ──────────────────────────────────────────────────────────────────

export function computeBestHours(tasks: Task[]) {
  const hourly = Array(24).fill(null).map(() => ({ completed: 0, total: 0 }))
  tasks.forEach(t => {
    if (t.completed && t.completedAt) {
      const h = new Date(t.completedAt).getHours()
      hourly[h].completed++
      hourly[h].total += t.duration || 0
    }
  })
  const withData = hourly.map((d, h) => ({ hour: h, ...d })).filter(h => h.completed > 0).sort((a, b) => b.completed - a.completed)
  const peakHours = withData.slice(0, 3).map(h => h.hour)
  const morning = hourly.slice(6, 12).reduce((s, h) => s + h.completed, 0)
  const afternoon = hourly.slice(12, 18).reduce((s, h) => s + h.completed, 0)
  const evening = hourly.slice(18, 24).reduce((s, h) => s + h.completed, 0)
  const night = hourly.slice(0, 6).reduce((s, h) => s + h.completed, 0)
  const total = morning + afternoon + evening + night
  const most = morning >= afternoon && morning >= evening && morning >= night ? 'Morning (6AM-12PM)'
    : afternoon >= evening && afternoon >= night ? 'Afternoon (12PM-6PM)'
      : evening >= night ? 'Evening (6PM-12AM)' : 'Night (12AM-6AM)'
  return {
    hourlyData: hourly, peakHours, mostProductivePeriod: most,
    byPeriod: {
      morning: { count: morning, percent: total > 0 ? Math.round(morning / total * 100) : 0 },
      afternoon: { count: afternoon, percent: total > 0 ? Math.round(afternoon / total * 100) : 0 },
      evening: { count: evening, percent: total > 0 ? Math.round(evening / total * 100) : 0 },
      night: { count: night, percent: total > 0 ? Math.round(night / total * 100) : 0 },
    },
  }
}

// ── Topic Balance ────────────────────────────────────────────────────────────────

export function computeTopicBalance(tasks: Task[]) {
  const topicData: Record<string, { totalTime: number; completedTime: number; taskCount: number; completedCount: number }> = {}
  let totalTime = 0
  tasks.forEach(t => {
    if (!topicData[t.topic]) topicData[t.topic] = { totalTime: 0, completedTime: 0, taskCount: 0, completedCount: 0 }
    const time = t.actualDuration || t.duration || 0
    topicData[t.topic].totalTime += time
    topicData[t.topic].taskCount++
    totalTime += time
    if (t.completed) { topicData[t.topic].completedTime += time; topicData[t.topic].completedCount++ }
  })
  const topicList = Object.entries(topicData).map(([name, d]) => ({
    name,
    totalTime: d.totalTime, completedTime: d.completedTime,
    taskCount: d.taskCount, completedCount: d.completedCount,
    percent: totalTime > 0 ? Math.round(d.totalTime / totalTime * 100) : 0,
    avgDuration: d.taskCount > 0 ? Math.round(d.totalTime / d.taskCount) : 0,
    completionRate: d.taskCount > 0 ? Math.round(d.completedCount / d.taskCount * 100) : 0,
  })).sort((a, b) => b.totalTime - a.totalTime)

  const suggestions: string[] = []
  const dominant = topicList.find(t => t.percent > 50)
  if (dominant) suggestions.push(`${dominant.name} takes ${dominant.percent}% of your time. Consider balancing.`)
  const neglected = topicList.filter(t => t.percent < 10 && t.taskCount >= 2)
  if (neglected.length > 0) suggestions.push(`${neglected.map(t => t.name).join(', ')} ${neglected.length > 1 ? 'are' : 'is'} getting less attention.`)
  const low = topicList.filter(t => t.completionRate < 50 && t.taskCount >= 3)
  if (low.length > 0) suggestions.push(`${low.map(t => t.name).join(', ')}: Low completion rate. Try breaking tasks into smaller chunks.`)

  return { topics: topicList, totalTime, totalTasks: tasks.length, suggestions, isBalanced: !dominant && neglected.length === 0 }
}

// ── Productivity Score ───────────────────────────────────────────────────────────

export function computeProductivityScore(
  tasks: Task[],
  goals: Pick<GoalsState, 'dailyTaskTarget'>,
  today: string,
  streakCurrent: number,
  overallPercent: number,
) {
  const breakdown = {
    streakScore: Math.min(40, streakCurrent * 4),
    completionScore: Math.round((overallPercent / 100) * 30),
    goalScore: 0,
  }
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -i))
  const daysGoalMet = last7.filter(d =>
    tasks.filter(t => t.date === d && t.completed).length >= (goals.dailyTaskTarget || 3)
  ).length
  breakdown.goalScore = Math.round((daysGoalMet / 7) * 30)
  const score = breakdown.streakScore + breakdown.completionScore + breakdown.goalScore
  let level = 'Beginner', levelColor = '#94a3b8'
  if (score >= 80) { level = 'Master'; levelColor = '#eab308' }
  else if (score >= 60) { level = 'Expert'; levelColor = '#a855f7' }
  else if (score >= 40) { level = 'Intermediate'; levelColor = '#3b82f6' }
  else if (score >= 20) { level = 'Apprentice'; levelColor = '#22c55e' }
  return { score, breakdown, level, levelColor }
}

// ── Goal progress ───────────────────────────────────────────────────────────────

export function computeDailyGoalProgress(
  goals: Pick<GoalsState, 'dailyTaskTarget'>,
  todayCompleted: number,
) {
  const target = goals.dailyTaskTarget || 3
  const percent = Math.min(100, Math.round((todayCompleted / target) * 100))
  return { target, completed: todayCompleted, percent, achieved: todayCompleted >= target }
}

export function computeExtraGoalsProgress(
  todayTasks: Task[],
  goals: Pick<GoalsState, 'extraGoals'>,
) {
  return (goals.extraGoals ?? []).map(goal => {
    switch (goal.type) {
      case 'min_tasks': {
        const done = goal.topic
          ? todayTasks.filter(t => t.completed && t.topic === goal.topic).length
          : todayTasks.filter(t => t.completed).length
        const target = goal.value || 1
        return { ...goal, current: done, target, percent: Math.min(100, Math.round((done / target) * 100)), achieved: done >= target }
      }
      case 'min_time': {
        const mins = todayTasks
          .filter(t => t.completed && (!goal.topic || t.topic === goal.topic))
          .reduce((s, t) => s + (t.actualDuration ?? t.duration ?? 0), 0)
        const target = goal.value || 30
        return { ...goal, current: mins, target, percent: Math.min(100, Math.round((mins / target) * 100)), achieved: mins >= target }
      }
      case 'all_priority': {
        const relevant = todayTasks.filter(t => t.priority === goal.priority)
        const done = relevant.filter(t => t.completed).length
        const target = relevant.length
        return { ...goal, current: done, target, percent: target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0, achieved: target > 0 && done === target }
      }
      default:
        return { ...goal, current: 0, target: 1, percent: 0, achieved: false }
    }
  })
}

// ── Reports & Charts ──────────────────────────────────────────────────────────────

export function computeWeeklyReport(tasks: Task[], now: Date, weeksAgo = 0) {
  const today = now
  const start = new Date(today)
  const dow = today.getDay()
  const daysFromMonday = dow === 0 ? 6 : dow - 1
  start.setDate(today.getDate() - daysFromMonday - (weeksAgo * 7))
  const end = new Date(start); end.setDate(start.getDate() + 6)
  const startStr = start.toISOString().split('T')[0]
  const endStr = end.toISOString().split('T')[0]
  const week = tasks.filter(t => t.date >= startStr && t.date <= endStr)
  const done = week.filter(t => t.completed)
  const topicBreakdown: Record<string, { count: number; minutes: number }> = {}
  done.forEach(t => {
    if (!topicBreakdown[t.topic]) topicBreakdown[t.topic] = { count: 0, minutes: 0 }
    topicBreakdown[t.topic].count++
    topicBreakdown[t.topic].minutes += t.duration || 0
  })
  const dailyBreakdown = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const ds = d.toISOString().split('T')[0]
    const day = week.filter(t => t.date === ds)
    const dc = day.filter(t => t.completed)
    return { date: ds, dayName: d.toLocaleDateString('en-US', { weekday: 'short' }), total: day.length, completed: dc.length, minutes: dc.reduce((s, t) => s + (t.duration || 0), 0) }
  })
  return { startDate: startStr, endDate: endStr, totalTasks: week.length, completedTasks: done.length, completionRate: week.length > 0 ? Math.round(done.length / week.length * 100) : 0, totalMinutes: done.reduce((s, t) => s + (t.duration || 0), 0), topicBreakdown, dailyBreakdown }
}

export function computeChartData(tasks: Task[], today: string, days = 30) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, -(days - 1 - i))
    const day = tasks.filter(t => t.date === date)
    const completed = day.filter(t => t.completed).length
    return {
      date,
      label: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completed,
      count: completed, // alias — matches LineChartDataPoint.count
      total: day.length,
    }
  })
}
