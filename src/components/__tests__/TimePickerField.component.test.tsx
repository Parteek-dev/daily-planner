import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import { TimePickerField } from '@/src/components/TimePickerField'

describe('TimePickerField', () => {
  it('shows the placeholder when no value is set', () => {
    renderWithProviders(
      <TimePickerField value={null} onChange={() => {}} placeholder="Add time" />,
    )
    expect(screen.getByText('Add time')).toBeInTheDocument()
  })

  it('displays the value as a 12-hour label', () => {
    renderWithProviders(<TimePickerField value="14:30" onChange={() => {}} />)
    expect(screen.getByText('2:30 PM')).toBeInTheDocument()
  })

  it('opens the wheel picker and emits a changed time', () => {
    const onChange = vi.fn()
    renderWithProviders(<TimePickerField value="14:30" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Time' }))
    fireEvent.click(screen.getByRole('button', { name: 'Increase Minute' }))
    expect(onChange).toHaveBeenCalledWith('14:35')
  })
})
