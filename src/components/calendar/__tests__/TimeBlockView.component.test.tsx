import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import TimeBlockView from '@/src/components/calendar/TimeBlockView'

function setup(tasks: any[], props: Record<string, unknown> = {}) {
  const onEditTask = vi.fn()
  renderWithProviders(
    <TimeBlockView
      tasks={tasks}
      date="2025-01-15"
      onEditTask={onEditTask}
      getTopicColor={() => '#3B82F6'}
      {...props}
    />,
  )
  return { onEditTask }
}

describe('TimeBlockView', () => {
  it('renders hour labels across the working day', () => {
    setup([])
    expect(screen.getByText('6 AM')).toBeInTheDocument()
    expect(screen.getByText('11 PM')).toBeInTheDocument()
  })

  it('renders a scheduled task block and fires onEditTask on press', () => {
    const { onEditTask } = setup([
      { id: 's1', title: 'Standup', dueTime: '09:00', duration: 30, topic: 'Work' },
    ])
    const block = screen.getByRole('button', { name: 'Standup, 09:00' })
    fireEvent.click(block)
    expect(onEditTask).toHaveBeenCalledTimes(1)
    expect(onEditTask.mock.calls[0][0].id).toBe('s1')
  })

  it('lists tasks without a time in the unscheduled section', () => {
    const { onEditTask } = setup([
      { id: 'u1', title: 'Someday task', topic: 'Personal' },
    ])
    expect(screen.getByText('Unscheduled (1)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Someday task' }))
    expect(onEditTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u1' }),
    )
  })
})
