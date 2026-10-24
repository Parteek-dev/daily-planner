import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import BestHoursChart from '@/src/components/planner/BestHoursChart'

/** Reads the serialized VictoryBar data from the inspectable stub. */
function readBarData(): Array<{ x: number; y: number; fill: string }> {
  const bar = screen.getByTestId('victory-bar')
  const raw = bar.getAttribute('data-victory-bar')
  expect(raw).toBeTruthy()
  return JSON.parse(raw as string).data
}

describe('BestHoursChart', () => {
  it('renders the empty state when all counts are zero', () => {
    renderWithProviders(
      <BestHoursChart data={[{ hour: 9, count: 0 }, { hour: 14, count: 0 }]} />,
    )
    expect(
      screen.getByText('Complete some tasks to see your best hours.'),
    ).toBeInTheDocument()
  })

  it('buckets counts into 24 hour slots', () => {
    renderWithProviders(
      <BestHoursChart
        accentColor="#8B5CF6"
        data={[{ hour: 9, count: 3 }, { hour: 14, count: 5 }]}
      />,
    )
    const data = readBarData()
    expect(data).toHaveLength(24)
    expect(data[9].y).toBe(3)
    expect(data[14].y).toBe(5)
    expect(data[0].y).toBe(0)
  })

  it('highlights the peak hour with the accent fill', () => {
    renderWithProviders(
      <BestHoursChart
        accentColor="#8B5CF6"
        data={[{ hour: 9, count: 3 }, { hour: 14, count: 5 }]}
      />,
    )
    const data = readBarData()
    // Peak is hour 14 (highest count) -> accent; others subdued.
    expect(data[14].fill).toBe('#8B5CF6')
    expect(data[9].fill).not.toBe('#8B5CF6')
  })
})
