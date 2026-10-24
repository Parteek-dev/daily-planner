import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderWithProviders, screen, fireEvent, act } from '@/test/renderWithProviders'
import { makeTask } from '@/test/fixtures/tasks'
import FocusMode from '@/src/components/FocusMode'

function setup(overrides = {}, props: Record<string, unknown> = {}) {
  const task = makeTask({ title: 'Deep work block', duration: 25, ...overrides })
  const onToggleComplete = vi.fn()
  const onClose = vi.fn()
  renderWithProviders(
    <FocusMode
      task={task}
      onToggleComplete={onToggleComplete}
      onClose={onClose}
      {...props}
    />,
  )
  return { task, onToggleComplete, onClose }
}

describe('FocusMode', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders nothing without a task', () => {
    const { container } = renderWithProviders(
      <FocusMode task={null} onToggleComplete={() => {}} onClose={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the focused task title and the estimate', () => {
    setup()
    expect(screen.getByText('Deep work block')).toBeInTheDocument()
    expect(screen.getByText('Focus Mode')).toBeInTheDocument()
  })

  it('disables completion until the timer is started', () => {
    setup()
    expect(
      screen.getByText('Start the timer to enable completion'),
    ).toBeInTheDocument()
  })

  it('starts the timer and ticks the elapsed display', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }))
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    // Countdown from 25:00 estimate by 2s -> 24:58.
    expect(screen.getByText('24:58')).toBeInTheDocument()
  })

  it('completes the task after the timer has started', () => {
    const { onToggleComplete, task } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Mark task as complete' }))
    expect(onToggleComplete).toHaveBeenCalledWith(task.id)
  })

  it('exits via the close control', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Exit Focus Mode' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
