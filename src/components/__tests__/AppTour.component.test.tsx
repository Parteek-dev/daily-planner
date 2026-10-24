import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders'
import AppTour from '@/src/components/AppTour'

describe('AppTour', () => {
  it('renders the first step when open', () => {
    renderWithProviders(<AppTour isOpen onClose={() => { }} />)
    expect(screen.getByText('Welcome to Daily Planner')).toBeInTheDocument()
    expect(screen.getByText('1 / 17')).toBeInTheDocument()
  })

  it('advances to the next step', () => {
    renderWithProviders(<AppTour isOpen onClose={() => { }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('2 / 17')).toBeInTheDocument()
  })

  it('goes back to the previous step', () => {
    renderWithProviders(<AppTour isOpen onClose={() => { }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }))
    expect(screen.getByText('Welcome to Daily Planner')).toBeInTheDocument()
  })

  it('skips the tour via Skip', async () => {
    const onClose = vi.fn()
    renderWithProviders(<AppTour isOpen onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }))
    // handleSkip awaits AsyncStorage before calling onClose.
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
