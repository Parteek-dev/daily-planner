import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import OverdueRolloverScreen from '@/app/(modals)/overdue-rollover'

describe('app/(modals)/overdue-rollover', () => {
  it('renders the overdue rollover host', () => {
    renderWithProviders(<OverdueRolloverScreen />, { withContexts: true })
    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument()
  })
})
