import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/renderWithProviders'
import { setAuthUser, setFirestoreDocs } from '@/test/mocks/firebase-control'
import HomeScreen from '@/app/(tabs)/index'

describe('app/(tabs)/index (dashboard)', () => {
  beforeEach(() => {
    setAuthUser({ uid: 'u1', email: 'a@b.com', emailVerified: true })
  })

  it('renders the dashboard sections with controlled data', async () => {
    setFirestoreDocs('users/u1/tasks', [
      {
        id: 't1',
        data: { title: 'Dashboard task', date: new Date().toISOString().split('T')[0], duration: 30 },
      },
    ])
    renderWithProviders(<HomeScreen />, { withContexts: true })
    await waitFor(() =>
      expect(screen.getByText("Today's Focus")).toBeInTheDocument(),
    )
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('renders without tasks (empty data)', async () => {
    renderWithProviders(<HomeScreen />, { withContexts: true })
    await waitFor(() =>
      expect(screen.getByText("Today's Focus")).toBeInTheDocument(),
    )
  })
})
