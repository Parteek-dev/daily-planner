import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderWithProviders, screen, fireEvent, act } from '@/test/renderWithProviders'
import DailyNotes from '@/src/components/DailyNotes'

const today = new Date().toISOString().split('T')[0]

describe('DailyNotes', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders the collapsed placeholder for today', () => {
    renderWithProviders(<DailyNotes date={today} note={null} onSave={() => {}} />)
    expect(screen.getByText('Add a note for today...')).toBeInTheDocument()
  })

  it('expands to reveal the notes input', () => {
    renderWithProviders(<DailyNotes date={today} note={null} onSave={() => {}} />)
    fireEvent.click(screen.getByLabelText('Expand daily notes'))
    expect(screen.getByLabelText('Daily notes input')).toBeInTheDocument()
  })

  it('debounces and saves the typed note', () => {
    const onSave = vi.fn()
    renderWithProviders(<DailyNotes date={today} note={null} onSave={onSave} />)
    fireEvent.click(screen.getByLabelText('Expand daily notes'))
    const input = screen.getByLabelText('Daily notes input')
    fireEvent.change(input, { target: { value: 'Shipped the feature' } })
    // Save is debounced by 800ms.
    expect(onSave).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(onSave).toHaveBeenCalledWith(today, 'Shipped the feature')
  })

  it('hides itself for a past date with no note', () => {
    const { container } = renderWithProviders(
      <DailyNotes date="2020-01-01" note={null} onSave={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
