import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import { CalendarPicker } from '@/src/components/CalendarPicker'

describe('CalendarPicker', () => {
  it('renders the seeded month header and weekday labels', () => {
    renderWithProviders(<CalendarPicker value="2025-01-15" onSelect={() => {}} />)
    expect(screen.getByText('January 2025')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
  })

  it('emits the picked day as YYYY-MM-DD', () => {
    const onSelect = vi.fn()
    renderWithProviders(<CalendarPicker value="2025-01-15" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: '2025-01-20' }))
    expect(onSelect).toHaveBeenCalledWith('2025-01-20')
  })

  it('navigates to the next month', () => {
    renderWithProviders(<CalendarPicker value="2025-01-15" onSelect={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByText('February 2025')).toBeInTheDocument()
  })
})
