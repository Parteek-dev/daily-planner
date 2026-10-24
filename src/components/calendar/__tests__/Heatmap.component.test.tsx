import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders'
import { getRouter } from '@/test/mocks/expo-router-control'
import Heatmap from '@/src/components/calendar/Heatmap'

/**
 * RNW's useWindowDimensions reports width 0 in jsdom, so `isWide` is false and
 * the monthly-calendar branch renders. That branch is still the web render path
 * (Platform.OS === 'web') and exercises the same intensity-bucket / day-press /
 * empty-data behavior the Goal 4 table calls for.
 */
function isoToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('Heatmap (monthly calendar branch)', () => {
  it('summarises zero activity for empty data', () => {
    renderWithProviders(<Heatmap data={{}} />)
    expect(screen.getByText('0 tasks · 0 active days')).toBeInTheDocument()
  })

  it('buckets provided counts into the header stats and renders a count cell', () => {
    renderWithProviders(<Heatmap data={{ [isoToday()]: 4 }} />)
    expect(screen.getByText('4 tasks · 1 active day')).toBeInTheDocument()
    // Today's cell exposes its completion count as a pressable day.
    expect(
      screen.getByRole('button', { name: `${isoToday()}: 4 tasks` }),
    ).toBeInTheDocument()
  })

  it('navigates to the calendar when an active day cell is pressed', async () => {
    renderWithProviders(<Heatmap data={{ [isoToday()]: 4 }} />)
    fireEvent.click(screen.getByRole('button', { name: `${isoToday()}: 4 tasks` }))
    await waitFor(() =>
      expect(getRouter().push).toHaveBeenCalledWith('/(tabs)/calendar'),
    )
  })
})
