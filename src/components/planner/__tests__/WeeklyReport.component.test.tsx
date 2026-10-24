import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import WeeklyReport from '@/src/components/planner/WeeklyReport'

function makeWeek(overrides = {}) {
  return {
    startDate: '2025-01-13',
    endDate: '2025-01-19',
    completedTasks: 12,
    totalMinutes: 300,
    completionRate: 80,
    dailyBreakdown: [
      { date: '2025-01-13', dayName: 'Mon', completed: 2, minutes: 60 },
      { date: '2025-01-14', dayName: 'Tue', completed: 3, minutes: 90 },
      { date: '2025-01-15', dayName: 'Wed', completed: 1, minutes: 30 },
    ],
    topicBreakdown: { Work: { count: 8, minutes: 200 } },
    ...overrides,
  }
}

describe('WeeklyReport', () => {
  it('renders the summary stat cards for this week', () => {
    const thisWeek = makeWeek()
    const lastWeek = makeWeek({ completedTasks: 8, totalMinutes: 240, completionRate: 60 })
    renderWithProviders(
      <WeeklyReport
        thisWeek={thisWeek}
        lastWeek={lastWeek}
        getWeeklyReport={() => lastWeek}
      />,
    )
    expect(screen.getByText('Weekly report')).toBeInTheDocument()
    expect(screen.getByText('This Week')).toBeInTheDocument()
    expect(screen.getByText('Tasks Done')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('navigates to the previous week', () => {
    const thisWeek = makeWeek()
    const lastWeek = makeWeek({
      startDate: '2025-01-06',
      endDate: '2025-01-12',
      completedTasks: 8,
    })
    const getWeeklyReport = vi.fn(() => lastWeek)
    renderWithProviders(
      <WeeklyReport
        thisWeek={thisWeek}
        lastWeek={lastWeek}
        getWeeklyReport={getWeeklyReport}
      />,
    )
    fireEvent.click(screen.getByLabelText('Previous week'))
    expect(screen.getByText('Last Week')).toBeInTheDocument()
  })

  it('renders an empty week without crashing', () => {
    const empty = makeWeek({
      completedTasks: 0,
      totalMinutes: 0,
      completionRate: 0,
      dailyBreakdown: [],
    })
    renderWithProviders(
      <WeeklyReport thisWeek={empty} lastWeek={empty} getWeeklyReport={() => empty} />,
    )
    expect(screen.getByText('Productivity Overview')).toBeInTheDocument()
  })
})
