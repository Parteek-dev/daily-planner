import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import { DurationField } from '@/src/components/DurationField'

describe('DurationField', () => {
  it('displays the formatted value for the current minutes', () => {
    renderWithProviders(<DurationField value={90} onChange={() => {}} />)
    // fmtDuration(90) -> "1h 30m"
    expect(screen.getByDisplayValue('1h 30m')).toBeInTheDocument()
  })

  it('parses a typed duration to minutes on blur', () => {
    const onChange = vi.fn()
    renderWithProviders(<DurationField value={null} onChange={onChange} />)
    const input = screen.getByLabelText('Duration')
    fireEvent.change(input, { target: { value: '45m' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(45)
  })

  it('shows a validation hint for an unparseable value', () => {
    const onChange = vi.fn()
    renderWithProviders(<DurationField value={null} onChange={onChange} />)
    const input = screen.getByLabelText('Duration')
    fireEvent.change(input, { target: { value: 'not a duration' } })
    fireEvent.blur(input)
    expect(screen.getByText(/Enter like: 30m, 1h, 1h 30m/)).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clears the value when emptied', () => {
    const onChange = vi.fn()
    renderWithProviders(<DurationField value={30} onChange={onChange} />)
    const input = screen.getByLabelText('Duration')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
