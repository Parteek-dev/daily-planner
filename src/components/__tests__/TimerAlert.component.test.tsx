import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import TimerAlert from '@/src/components/TimerAlert'

const alert = { type: 'workDone' as const, sessions: 1, nextMode: 'break', nextMinutes: 5 }

describe('TimerAlert', () => {
  it('renders nothing when there is no alert', () => {
    const { container } = renderWithProviders(
      <TimerAlert alert={null} onDismiss={vi.fn()} onStart={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the alert title and message when triggered', () => {
    renderWithProviders(
      <TimerAlert alert={alert} onDismiss={vi.fn()} onStart={vi.fn()} />,
    )
    expect(screen.getByText('Focus session complete! ☕')).toBeInTheDocument()
    expect(screen.getByText(/Time for a 5-min break/)).toBeInTheDocument()
  })

  it('fires start and dismiss callbacks', () => {
    const onStart = vi.fn()
    const onDismiss = vi.fn()
    renderWithProviders(
      <TimerAlert alert={alert} onDismiss={onDismiss} onStart={onStart} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Start 5-min Break' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }))
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
