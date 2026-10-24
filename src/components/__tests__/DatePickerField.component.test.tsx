import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import { DatePickerField } from '@/src/components/DatePickerField'

describe('DatePickerField', () => {
  it('shows the placeholder when no value is set', () => {
    renderWithProviders(
      <DatePickerField value="" onChange={() => {}} placeholder="Pick a date" />,
    )
    expect(screen.getByText('Pick a date')).toBeInTheDocument()
  })

  it('opens the calendar and emits the chosen day', () => {
    const onChange = vi.fn()
    renderWithProviders(<DatePickerField value="2025-01-15" onChange={onChange} />)
    // Open the picker modal.
    fireEvent.click(screen.getByRole('button', { name: 'Date' }))
    // Pick a day from the embedded CalendarPicker.
    fireEvent.click(screen.getByRole('button', { name: '2025-01-22' }))
    expect(onChange).toHaveBeenCalledWith('2025-01-22')
  })
})
