import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import TimeTrackingStats from '@/src/components/planner/TimeTrackingStats'

const stats = {
  totalEstimated: 120,
  totalActual: 100,
  accuracy: 83,
  overEstimateCount: 2,
  underEstimateCount: 1,
  accurateCount: 3,
  averageVariance: -20,
  byTopic: { Work: { estimated: 90, actual: 80 } },
  totalTracked: 6,
}

describe('TimeTrackingStats', () => {
  it('renders aggregated totals and the tracked count', () => {
    renderWithProviders(
      <TimeTrackingStats stats={stats} getTopicColor={() => '#3B82F6'} />,
    )
    expect(screen.getByText('6 tasks tracked')).toBeInTheDocument()
    expect(screen.getByText('83%')).toBeInTheDocument()
    // fmtDuration(120) -> "2h", fmtDuration(100) -> "1h 40m"
    expect(screen.getByText('2h')).toBeInTheDocument()
    expect(screen.getByText('1h 40m')).toBeInTheDocument()
    // Per-topic row.
    expect(screen.getByText('Work')).toBeInTheDocument()
  })

  it('renders the empty state when nothing is tracked', () => {
    renderWithProviders(
      <TimeTrackingStats
        stats={{ ...stats, totalTracked: 0 }}
        getTopicColor={() => '#3B82F6'}
      />,
    )
    expect(screen.getByText('No tracking data yet')).toBeInTheDocument()
  })
})
