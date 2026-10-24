import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import LineChart from '@/src/components/planner/LineChart'

describe('LineChart (web SVG branch)', () => {
  it('shows the empty-data message', () => {
    renderWithProviders(<LineChart data={[]} />)
    expect(
      screen.getByText('Complete tasks to see your progress chart.'),
    ).toBeInTheDocument()
  })

  it('shows the sparse tip when fewer than 5 days are active', () => {
    renderWithProviders(
      <LineChart
        data={[
          { date: '2025-01-13', count: 1 },
          { date: '2025-01-14', count: 0 },
          { date: '2025-01-15', count: 2 },
        ]}
      />,
    )
    expect(
      screen.getByText('Complete a few more tasks to see your productivity trend.'),
    ).toBeInTheDocument()
  })

  it('renders the Y-axis ticks and a Today marker for the last point', () => {
    renderWithProviders(
      <LineChart
        data={[
          { date: '2025-01-13', count: 1 },
          { date: '2025-01-14', count: 2 },
          { date: '2025-01-15', count: 1 },
        ]}
      />,
    )
    // Y tick labels 0 and 2 (niceMax of max=2).
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    // Final point is labelled Today.
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('hides the sparse tip once 5 or more days are active', () => {
    renderWithProviders(
      <LineChart
        data={[
          { date: '2025-01-11', count: 1 },
          { date: '2025-01-12', count: 2 },
          { date: '2025-01-13', count: 1 },
          { date: '2025-01-14', count: 3 },
          { date: '2025-01-15', count: 2 },
        ]}
      />,
    )
    expect(
      screen.queryByText('Complete a few more tasks to see your productivity trend.'),
    ).not.toBeInTheDocument()
  })
})
