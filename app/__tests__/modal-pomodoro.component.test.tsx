import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import { setAuthUser } from '@/test/mocks/firebase-control'
import { getRouter } from '@/test/mocks/expo-router-control'
import PomodoroModalScreen from '@/app/(modals)/pomodoro'

describe('app/(modals)/pomodoro', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setAuthUser({ uid: 'u1', email: 'a@b.com', emailVerified: true })
  })
  afterEach(() => vi.useRealTimers())

  it('hosts the Pomodoro timer', () => {
    renderWithProviders(<PomodoroModalScreen />, { withContexts: true })
    expect(screen.getByText('Focus Timer')).toBeInTheDocument()
    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  it('closes via the close control (router.back)', () => {
    renderWithProviders(<PomodoroModalScreen />, { withContexts: true })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(getRouter().back).toHaveBeenCalled()
  })
})
