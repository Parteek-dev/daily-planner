import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import CountCard from '@/src/components/ui/CountCard'

describe('CountCard', () => {
  it('renders the count and label', () => {
    renderWithProviders(<CountCard count={7} label="Tasks" />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
  })
})
