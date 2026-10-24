import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/renderWithProviders'
import { setAuthUser } from '@/test/mocks/firebase-control'
import AnalyticsScreen from '@/app/(tabs)/analytics'

describe('app/(tabs)/analytics', () => {
  beforeEach(() => {
    setAuthUser({ uid: 'u1', email: 'a@b.com', emailVerified: true })
  })

  it('renders the analytics charts with empty data', async () => {
    renderWithProviders(<AnalyticsScreen />, { withContexts: true })
    await waitFor(() =>
      expect(screen.getByText('Topic Balance')).toBeInTheDocument(),
    )
    // Time-tracking empty state surfaces with no actual durations recorded.
    expect(screen.getByText('No tracking data yet')).toBeInTheDocument()
  })
})
