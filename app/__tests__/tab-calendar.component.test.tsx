import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/renderWithProviders'
import { setAuthUser } from '@/test/mocks/firebase-control'
import CalendarScreen from '@/app/(tabs)/calendar'

describe('app/(tabs)/calendar', () => {
  beforeEach(() => {
    setAuthUser({ uid: 'u1', email: 'a@b.com', emailVerified: true })
  })

  it('renders the calendar screen', async () => {
    renderWithProviders(<CalendarScreen />, { withContexts: true })
    await waitFor(() =>
      expect(screen.getAllByText('Calendar').length).toBeGreaterThan(0),
    )
  })
})
