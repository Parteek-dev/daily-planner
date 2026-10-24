import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import { getRouter } from '@/test/mocks/expo-router-control'
import LandingScreen from '@/app/index'

describe('app/index (landing)', () => {
  it('renders the web landing page', () => {
    renderWithProviders(<LandingScreen />)
    // Brand appears in the navbar.
    expect(screen.getAllByText('Daily Planner').length).toBeGreaterThan(0)
  })

  it('navigates to sign-up from the primary CTA', () => {
    renderWithProviders(<LandingScreen />)
    fireEvent.click(screen.getAllByText('Start planning for free')[0])
    expect(getRouter().push).toHaveBeenCalledWith({
      pathname: '/auth',
      params: { tab: 'signup' },
    })
  })

  it('navigates to sign-up from the navbar CTA', () => {
    renderWithProviders(<LandingScreen />)
    // jsdom reports width 0 -> compact navbar CTA reads "Get started".
    fireEvent.click(screen.getByText('Get started'))
    expect(getRouter().push).toHaveBeenCalledWith({
      pathname: '/auth',
      params: { tab: 'signup' },
    })
  })
})
