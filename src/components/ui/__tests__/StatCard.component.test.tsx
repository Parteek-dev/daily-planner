import React from 'react'
import { describe, it, expect } from 'vitest'
import { CheckCircle } from 'lucide-react-native'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import StatCard from '@/src/components/ui/StatCard'

describe('StatCard', () => {
  it('renders the value, label and icon', () => {
    renderWithProviders(<StatCard value={12} label="Completed" icon={CheckCircle} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByTestId('icon-CheckCircle')).toBeInTheDocument()
  })
})
