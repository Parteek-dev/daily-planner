import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import DateStrip from '@/src/components/ui/DateStrip'

describe('DateStrip', () => {
  const selected = new Date('2025-01-15T12:00:00') // a Wednesday

  it('renders the month/year header and the weekday names', () => {
    renderWithProviders(
      <DateStrip selectedDate={selected} onSelectDate={() => {}} />,
    )
    expect(screen.getByText('January 2025')).toBeInTheDocument()
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
  })

  it('calls onSelectDate when a day is pressed', () => {
    const onSelectDate = vi.fn()
    renderWithProviders(
      <DateStrip selectedDate={selected} onSelectDate={onSelectDate} />,
    )
    // The Monday of this week is the 13th.
    fireEvent.click(screen.getByText('13'))
    expect(onSelectDate).toHaveBeenCalledTimes(1)
    expect(onSelectDate.mock.calls[0][0]).toBeInstanceOf(Date)
  })

  it('invokes week navigation callbacks', () => {
    const onPrevWeek = vi.fn()
    const onNextWeek = vi.fn()
    renderWithProviders(
      <DateStrip
        selectedDate={selected}
        onSelectDate={() => {}}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
      />,
    )
    fireEvent.click(screen.getByTestId('icon-ChevronLeft'))
    fireEvent.click(screen.getByTestId('icon-ChevronRight'))
    expect(onPrevWeek).toHaveBeenCalledTimes(1)
    expect(onNextWeek).toHaveBeenCalledTimes(1)
  })
})
