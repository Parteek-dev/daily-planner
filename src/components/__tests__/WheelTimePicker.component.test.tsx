import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import { WheelTimePicker } from '@/src/components/WheelTimePicker'

describe('WheelTimePicker', () => {
  it('seeds from the provided 24h value as 12h parts', () => {
    renderWithProviders(<WheelTimePicker value="14:30" onChange={() => { }} />)
    // 14:30 -> 2:30 PM
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByLabelText('PM')).toBeInTheDocument()
  })

  it('emits an updated 24h string when the hour is increased', () => {
    const onChange = vi.fn()
    renderWithProviders(<WheelTimePicker value="14:30" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Increase Hour' }))
    // 2:30 PM + 1h -> 3:30 PM -> 15:30
    expect(onChange).toHaveBeenCalledWith('15:30')
  })

  it('steps minutes by 5', () => {
    const onChange = vi.fn()
    renderWithProviders(<WheelTimePicker value="14:30" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Increase Minute' }))
    expect(onChange).toHaveBeenCalledWith('14:35')
  })

  it('clears the value', () => {
    const onChange = vi.fn()
    renderWithProviders(<WheelTimePicker value="14:30" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear time' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
