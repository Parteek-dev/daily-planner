import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import { makeTask } from '@/test/fixtures/tasks'
import { DayTimeline } from '@/src/components/task/DayTimeline'
import type { Task } from '@/src/lib/firestoreMappers'

function setup(tasks: Task[] = [], props: Record<string, unknown> = {}) {
  const onToggle = vi.fn()
  const onPress = vi.fn()
  renderWithProviders(
    <DayTimeline
      tasks={tasks}
      onToggle={onToggle}
      onPress={onPress}
      getTopicColor={() => '#3B82F6'}
      {...props}
    />,
  )
  return { onToggle, onPress }
}

describe('DayTimeline', () => {
  it('renders hour labels across the day', () => {
    setup([])
    expect(screen.getAllByText('12 AM').length).toBeGreaterThan(0)
    expect(screen.getByText('12 PM')).toBeInTheDocument()
  })

  it('shows an unscheduled section for tasks without a time', () => {
    setup([makeTask({ id: 'u1', title: 'No-time task', dueTime: null })])
    expect(screen.getByText('Unscheduled (1)')).toBeInTheDocument()
    expect(screen.getByText('No-time task')).toBeInTheDocument()
  })

  it('fires onPress when an unscheduled task is pressed', () => {
    const { onPress } = setup([makeTask({ id: 'u1', title: 'No-time task', dueTime: null })])
    fireEvent.click(screen.getByText('No-time task'))
    expect(onPress).toHaveBeenCalledWith('u1')
  })

  it('fires onToggle from the unscheduled task checkbox', () => {
    const { onToggle } = setup([makeTask({ id: 'u1', title: 'No-time task', dueTime: null })])
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledWith('u1')
  })

  it('hides the unscheduled section when there are no untimed tasks', () => {
    setup([makeTask({ id: 's1', title: 'Timed task', dueTime: '09:00' })])
    expect(screen.queryByText(/Unscheduled/)).not.toBeInTheDocument()
  })
})
