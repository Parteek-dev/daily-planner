import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/renderWithProviders'
import { setAuthUser, setFirestoreDocs } from '@/test/mocks/firebase-control'
import TodayScreen from '@/app/(tabs)/today'

const today = new Date().toISOString().split('T')[0]

describe('app/(tabs)/today', () => {
  beforeEach(() => {
    setAuthUser({ uid: 'u1', email: 'a@b.com', emailVerified: true })
  })

  it('renders the empty state when there are no tasks today', async () => {
    renderWithProviders(<TodayScreen />, { withContexts: true })
    await waitFor(() =>
      expect(screen.getByText('No tasks for today')).toBeInTheDocument(),
    )
  })

  it("renders today's tasks from controlled data", async () => {
    setFirestoreDocs('users/u1/tasks', [
      { id: 't1', data: { title: 'Finish report', date: today, duration: 60 } },
    ])
    renderWithProviders(<TodayScreen />, { withContexts: true })
    await waitFor(() =>
      expect(screen.getByText('Finish report')).toBeInTheDocument(),
    )
  })
})
