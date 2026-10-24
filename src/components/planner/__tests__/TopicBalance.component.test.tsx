import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import TopicBalance from '@/src/components/planner/TopicBalance'

describe('TopicBalance', () => {
  it('renders the empty state when there is no data', () => {
    renderWithProviders(<TopicBalance data={[]} />)
    expect(
      screen.getByText('Add tasks to different topics to see your time distribution.'),
    ).toBeInTheDocument()
  })

  it('renders legend entries with computed percentages and total time', () => {
    renderWithProviders(
      <TopicBalance
        data={[
          { name: 'Work', minutes: 90 },
          { name: 'Personal', minutes: 30 },
        ]}
      />,
    )
    // Legend names.
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
    // 90/120 = 75%, 30/120 = 25%.
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
    // Total time center label: 120m -> "2h".
    expect(screen.getByText('2h')).toBeInTheDocument()
  })
})
