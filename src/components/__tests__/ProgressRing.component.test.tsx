import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import { ProgressRing } from '@/src/components/ProgressRing'

describe('ProgressRing', () => {
  it('exposes the percentage via the progressbar accessible label', () => {
    renderWithProviders(
      <ProgressRing percent={60} size={100} strokeWidth={8} color="#3B82F6" />,
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-label',
      '60% complete',
    )
  })

  it('clamps out-of-range values to 0..100', () => {
    renderWithProviders(
      <ProgressRing percent={140} size={100} strokeWidth={8} color="#3B82F6" />,
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-label',
      '100% complete',
    )
  })

  it('renders the provided label', () => {
    renderWithProviders(
      <ProgressRing percent={50} size={100} strokeWidth={8} color="#3B82F6" label="Halfway" />,
    )
    expect(screen.getByText('Halfway')).toBeInTheDocument()
  })
})
