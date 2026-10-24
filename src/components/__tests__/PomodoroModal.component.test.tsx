import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderWithProviders, screen, fireEvent, act } from '@/test/renderWithProviders'
import { setAuthUser } from '@/test/mocks/firebase-control'
import PomodoroModal from '@/src/components/PomodoroModal'

describe('PomodoroModal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setAuthUser({ uid: 'u1', email: 'a@b.com', emailVerified: true })
  })
  afterEach(() => vi.useRealTimers())

  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <PomodoroModal isOpen={false} onClose={() => {}} />,
      { withContexts: true },
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the timer with the default 25:00 work phase', () => {
    renderWithProviders(<PomodoroModal isOpen onClose={() => {}} />, {
      withContexts: true,
    })
    expect(screen.getByText('Focus Timer')).toBeInTheDocument()
    expect(screen.getByText('Focus Time')).toBeInTheDocument()
    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  it('starts the countdown when Start is pressed', () => {
    renderWithProviders(<PomodoroModal isOpen onClose={() => {}} />, {
      withContexts: true,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('24:59')).toBeInTheDocument()
  })

  it('resets to the initial time when Reset is pressed', () => {
    renderWithProviders(<PomodoroModal isOpen onClose={() => {}} />, {
      withContexts: true,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }))
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }))
    expect(screen.getByText('25:00')).toBeInTheDocument()
  })
})
