import { describe, it, expect } from 'vitest'
import type { Task } from '@/src/lib/firestoreMappers'
import {
  computeStreak,
  computeTimeTrackingStats,
  computeBestHours,
  computeTopicBalance,
  computeProductivityScore,
  computeDailyGoalProgress,
  computeExtraGoalsProgress,
  computeWeeklyReport,
  computeChartData,
  shouldCreateRecurringTask,
  getPrioritySortValue,
  sortTasksByPriority,
  areDependenciesMet,
} from '@/src/lib/progressStats'

// ─── Task fixture factory ─────────────────────────────────────────────────────

let idCounter = 0
function makeTask(overrides: Partial<Task> = {}): Task {
  idCounter += 1
  return {
    id: overrides.id ?? `t${idCounter}`,
    title: 'Task',
    description: '',
    topic: 'Work',
    duration: 30,
    actualDuration: null,
    date: '2024-01-01',
    originalDate: null,
    dueTime: null,
    endTime: null,
    completed: false,
    completedAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    note: '',
    priority: null,
    dependsOn: [],
    subtasks: [],
    recurrence: 'none',
    recurrenceEndDate: null,
    recurrenceParentId: null,
    customRecurrenceDays: null,
    ...overrides,
  }
}

/** Builds an ISO completedAt for a given local hour on a fixed date. */
function completedAtHour(hour: number): string {
  const d = new Date(2024, 0, 1, hour, 0, 0)
  return d.toISOString()
}

// ─── Streak ────────────────────────────────────────────────────────────────────

describe('computeStreak', () => {
  it('returns zeros for an empty task list', () => {
    expect(computeStreak([], '2024-01-10')).toEqual({ current: 0, best: 0, studiedToday: false })
  })

  it('reports current and best of 1 for a single completed day that is today', () => {
    const tasks = [makeTask({ completed: true, date: '2024-01-10' })]
    expect(computeStreak(tasks, '2024-01-10')).toEqual({ current: 1, best: 1, studiedToday: true })
  })

  it('counts a consecutive run', () => {
    const tasks = [
      makeTask({ completed: true, date: '2024-01-08' }),
      makeTask({ completed: true, date: '2024-01-09' }),
      makeTask({ completed: true, date: '2024-01-10' }),
    ]
    expect(computeStreak(tasks, '2024-01-10')).toEqual({ current: 3, best: 3, studiedToday: true })
  })

  it('resets current on a broken run while preserving best', () => {
    const tasks = [
      makeTask({ completed: true, date: '2024-01-01' }),
      makeTask({ completed: true, date: '2024-01-02' }),
      makeTask({ completed: true, date: '2024-01-03' }),
      makeTask({ completed: true, date: '2024-01-10' }),
    ]
    const result = computeStreak(tasks, '2024-01-10')
    expect(result.best).toBe(3)
    expect(result.current).toBe(1)
    expect(result.studiedToday).toBe(true)
  })

  it('reports studiedToday false when today has no completion but keeps current from yesterday', () => {
    const tasks = [
      makeTask({ completed: true, date: '2024-01-08' }),
      makeTask({ completed: true, date: '2024-01-09' }),
    ]
    const result = computeStreak(tasks, '2024-01-10')
    expect(result.studiedToday).toBe(false)
    expect(result.current).toBe(2)
  })
})

// ─── Productivity Score ──────────────────────────────────────────────────────────

describe('computeProductivityScore', () => {
  const noGoalMet = { dailyTaskTarget: 999 }

  it('caps the streak contribution at 40', () => {
    const result = computeProductivityScore([], noGoalMet, '2024-01-10', 100, 0)
    expect(result.breakdown.streakScore).toBe(40)
  })

  it('maps score thresholds to levels', () => {
    // score 0 -> Beginner
    expect(computeProductivityScore([], noGoalMet, '2024-01-10', 0, 0).level).toBe('Beginner')
    // streak 5 -> streakScore 20 -> Apprentice
    expect(computeProductivityScore([], noGoalMet, '2024-01-10', 5, 0).level).toBe('Apprentice')
    // streak 10 -> streakScore 40 -> Intermediate
    expect(computeProductivityScore([], noGoalMet, '2024-01-10', 10, 0).level).toBe('Intermediate')
    // streakScore 40 + completionScore 30 (100%) = 70 -> Expert
    expect(computeProductivityScore([], noGoalMet, '2024-01-10', 10, 100).level).toBe('Expert')
  })

  it('reaches Master when the score is at least 80', () => {
    // 7 days all meeting a target of 1 completed task/day -> goalScore 30
    const today = '2024-01-10'
    const tasks: Task[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date('2024-01-10')
      d.setDate(d.getDate() - i)
      tasks.push(makeTask({ completed: true, date: d.toISOString().split('T')[0] }))
    }
    const result = computeProductivityScore(tasks, { dailyTaskTarget: 1 }, today, 10, 100)
    expect(result.breakdown.goalScore).toBe(30)
    expect(result.score).toBe(100)
    expect(result.level).toBe('Master')
  })
})

// ─── Time Tracking ───────────────────────────────────────────────────────────────

describe('computeTimeTrackingStats', () => {
  it('returns zeros with no divide-by-zero when nothing is tracked', () => {
    const stats = computeTimeTrackingStats([makeTask({ completed: true })])
    expect(stats.totalTracked).toBe(0)
    expect(stats.accuracy).toBe(0)
    expect(stats.averageVariance).toBe(0)
    expect(stats.byTopic).toEqual({})
  })

  it('classifies accurate (within +-10%), over, and under estimates', () => {
    const tasks = [
      makeTask({ completed: true, duration: 100, actualDuration: 105 }), // accurate (5%)
      makeTask({ completed: true, duration: 100, actualDuration: 50 }),  // over-estimate (act < est)
      makeTask({ completed: true, duration: 100, actualDuration: 200 }), // under-estimate (act > est)
    ]
    const stats = computeTimeTrackingStats(tasks)
    expect(stats.accurateCount).toBe(1)
    expect(stats.overEstimateCount).toBe(1)
    expect(stats.underEstimateCount).toBe(1)
    expect(stats.totalTracked).toBe(3)
  })
})

// ─── Best Hours ──────────────────────────────────────────────────────────────────

describe('computeBestHours', () => {
  it('buckets completions into morning/afternoon/evening/night periods', () => {
    const tasks = [
      makeTask({ completed: true, completedAt: completedAtHour(8) }),  // morning
      makeTask({ completed: true, completedAt: completedAtHour(14) }), // afternoon
      makeTask({ completed: true, completedAt: completedAtHour(20) }), // evening
      makeTask({ completed: true, completedAt: completedAtHour(3) }),  // night
    ]
    const result = computeBestHours(tasks)
    expect(result.byPeriod.morning.count).toBe(1)
    expect(result.byPeriod.afternoon.count).toBe(1)
    expect(result.byPeriod.evening.count).toBe(1)
    expect(result.byPeriod.night.count).toBe(1)
  })

  it('orders peak hours by completion count and names the most productive period', () => {
    const tasks = [
      makeTask({ completed: true, completedAt: completedAtHour(9) }),
      makeTask({ completed: true, completedAt: completedAtHour(9) }),
      makeTask({ completed: true, completedAt: completedAtHour(10) }),
    ]
    const result = computeBestHours(tasks)
    expect(result.peakHours[0]).toBe(9)
    expect(result.mostProductivePeriod).toBe('Morning (6AM-12PM)')
  })
})

// ─── Topic Balance ──────────────────────────────────────────────────────────────

describe('computeTopicBalance', () => {
  it('computes percent shares that reflect time per topic', () => {
    const tasks = [
      makeTask({ topic: 'Work', duration: 75 }),
      makeTask({ topic: 'Health', duration: 25 }),
    ]
    const result = computeTopicBalance(tasks)
    const work = result.topics.find(t => t.name === 'Work')
    const health = result.topics.find(t => t.name === 'Health')
    expect(work?.percent).toBe(75)
    expect(health?.percent).toBe(25)
  })

  it('suggests balancing when a topic dominates with over 50%', () => {
    const tasks = [
      makeTask({ topic: 'Work', duration: 90 }),
      makeTask({ topic: 'Health', duration: 10 }),
    ]
    const result = computeTopicBalance(tasks)
    expect(result.isBalanced).toBe(false)
    expect(result.suggestions.some(s => s.includes('Work'))).toBe(true)
  })

  it('flags a neglected topic under 10% with at least two tasks', () => {
    const tasks = [
      makeTask({ topic: 'Work', duration: 500 }),
      makeTask({ topic: 'Health', duration: 20 }),
      makeTask({ topic: 'Health', duration: 20 }),
    ]
    const result = computeTopicBalance(tasks)
    expect(result.suggestions.some(s => s.includes('less attention'))).toBe(true)
  })
})

// ─── Goal progress ──────────────────────────────────────────────────────────────

describe('computeDailyGoalProgress', () => {
  it('computes percent and achieved against the target', () => {
    expect(computeDailyGoalProgress({ dailyTaskTarget: 4 }, 2)).toEqual({
      target: 4,
      completed: 2,
      percent: 50,
      achieved: false,
    })
    expect(computeDailyGoalProgress({ dailyTaskTarget: 2 }, 3).achieved).toBe(true)
  })
})

describe('computeExtraGoalsProgress', () => {
  it('evaluates a min_tasks goal', () => {
    const todayTasks = [
      makeTask({ completed: true, topic: 'Work' }),
      makeTask({ completed: false, topic: 'Work' }),
    ]
    const [goal] = computeExtraGoalsProgress(todayTasks, {
      extraGoals: [{ id: 'g1', type: 'min_tasks', value: 1, topic: 'Work' }],
    })
    expect(goal.current).toBe(1)
    expect(goal.achieved).toBe(true)
  })

  it('evaluates a min_time goal using actual then estimated duration', () => {
    const todayTasks = [makeTask({ completed: true, duration: 30, actualDuration: 45 })]
    const [goal] = computeExtraGoalsProgress(todayTasks, {
      extraGoals: [{ id: 'g2', type: 'min_time', value: 40 }],
    })
    expect(goal.current).toBe(45)
    expect(goal.achieved).toBe(true)
  })
})

// ─── Recurrence predicate ─────────────────────────────────────────────────────────

describe('shouldCreateRecurringTask', () => {
  // 2024-01-08 is a Monday; 2024-01-13 is a Saturday.
  it('returns true every day for daily recurrence', () => {
    const task = makeTask({ recurrence: 'daily' })
    expect(shouldCreateRecurringTask(task, '2024-01-13')).toBe(true)
  })

  it('returns true only on the same weekday for weekly recurrence', () => {
    const task = makeTask({ recurrence: 'weekly', date: '2024-01-08' }) // Monday
    expect(shouldCreateRecurringTask(task, '2024-01-15')).toBe(true) // Monday
    expect(shouldCreateRecurringTask(task, '2024-01-16')).toBe(false) // Tuesday
  })

  it('returns true Monday-Friday for weekdays recurrence', () => {
    const task = makeTask({ recurrence: 'weekdays' })
    expect(shouldCreateRecurringTask(task, '2024-01-08')).toBe(true) // Monday
    expect(shouldCreateRecurringTask(task, '2024-01-13')).toBe(false) // Saturday
  })

  it('returns true only on listed days for custom recurrence', () => {
    const task = makeTask({ recurrence: 'custom', customRecurrenceDays: [6] }) // Saturday
    expect(shouldCreateRecurringTask(task, '2024-01-13')).toBe(true)
    expect(shouldCreateRecurringTask(task, '2024-01-14')).toBe(false)
  })

  it('returns false for none recurrence', () => {
    const task = makeTask({ recurrence: 'none' })
    expect(shouldCreateRecurringTask(task, '2024-01-13')).toBe(false)
  })
})

// ─── Priority sort & dependencies ──────────────────────────────────────────────────

describe('getPrioritySortValue', () => {
  it('orders high < medium < low < none', () => {
    expect(getPrioritySortValue('high')).toBe(0)
    expect(getPrioritySortValue('medium')).toBe(1)
    expect(getPrioritySortValue('low')).toBe(2)
    expect(getPrioritySortValue(null)).toBe(3)
  })
})

describe('sortTasksByPriority', () => {
  it('sorts by priority then by dueTime as a tiebreak', () => {
    const high = makeTask({ priority: 'high' })
    const lowEarly = makeTask({ priority: 'low', dueTime: '08:00' })
    const lowLate = makeTask({ priority: 'low', dueTime: '18:00' })
    const sorted = sortTasksByPriority([lowLate, high, lowEarly])
    expect(sorted.map(t => t.id)).toEqual([high.id, lowEarly.id, lowLate.id])
  })
})

describe('areDependenciesMet', () => {
  it('returns true when a task has no dependencies', () => {
    expect(areDependenciesMet(makeTask(), [])).toBe(true)
  })

  it('returns true only when all dependencies are complete', () => {
    const depDone = makeTask({ id: 'd1', completed: true })
    const depOpen = makeTask({ id: 'd2', completed: false })
    const task = makeTask({ dependsOn: ['d1', 'd2'] })
    expect(areDependenciesMet(task, [depDone, depOpen])).toBe(false)
    expect(areDependenciesMet(makeTask({ dependsOn: ['d1'] }), [depDone, depOpen])).toBe(true)
  })
})

// ─── Weekly report & chart data ────────────────────────────────────────────────────

describe('computeWeeklyReport', () => {
  it('uses a Monday-start window and counts tasks within it', () => {
    // 2024-01-10 is a Wednesday -> week is Mon 2024-01-08 .. Sun 2024-01-14
    const now = new Date('2024-01-10T12:00:00')
    const tasks = [
      makeTask({ date: '2024-01-08', completed: true }),
      makeTask({ date: '2024-01-14', completed: false }),
      makeTask({ date: '2024-01-07' }), // outside the window
    ]
    const report = computeWeeklyReport(tasks, now, 0)
    expect(report.startDate).toBe('2024-01-08')
    expect(report.endDate).toBe('2024-01-14')
    expect(report.totalTasks).toBe(2)
    expect(report.completedTasks).toBe(1)
    expect(report.dailyBreakdown).toHaveLength(7)
  })
})

describe('computeChartData', () => {
  it('returns an array whose length equals the requested number of days', () => {
    expect(computeChartData([], '2024-01-10', 30)).toHaveLength(30)
    expect(computeChartData([], '2024-01-10', 7)).toHaveLength(7)
  })

  it('counts completed tasks on the final (today) bucket', () => {
    const tasks = [makeTask({ date: '2024-01-10', completed: true })]
    const data = computeChartData(tasks, '2024-01-10', 7)
    expect(data[data.length - 1].date).toBe('2024-01-10')
    expect(data[data.length - 1].completed).toBe(1)
  })
})
