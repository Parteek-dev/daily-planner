import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import { makeTask } from '@/test/fixtures/tasks'
import { TaskItem } from '@/src/components/task/TaskItem'

function renderItem(overrides = {}, props: Record<string, unknown> = {}) {
  const task = makeTask(overrides)
  const handlers = {
    onComplete: vi.fn(),
    onDelete: vi.fn(),
    onEdit: vi.fn(),
    onStartFocus: vi.fn(),
    onStartPomodoro: vi.fn(),
    getTopicColor: () => '#3B82F6',
    ...props,
  }
  renderWithProviders(<TaskItem task={task} {...(handlers as any)} />)
  return { task, handlers }
}

describe('TaskItem (web branch)', () => {
  it('renders the title and due/duration badges', () => {
    renderItem({ title: 'Ship release', dueTime: '09:00', duration: 90 })
    expect(screen.getByText('Ship release')).toBeInTheDocument()
    expect(screen.getByText('09:00')).toBeInTheDocument()
    // fmtDuration(90) -> "1h 30m"
    expect(screen.getByText('1h 30m')).toBeInTheDocument()
  })

  it('calls onComplete when the checkbox is pressed', () => {
    const { handlers, task } = renderItem()
    fireEvent.click(screen.getByRole('button', { name: `Mark complete: ${task.title}` }))
    expect(handlers.onComplete).toHaveBeenCalledWith(task.id)
  })

  it('calls onEdit when the row is pressed', () => {
    const { handlers, task } = renderItem()
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`^Task: ${task.title}`),
      }),
    )
    expect(handlers.onEdit).toHaveBeenCalledWith(task)
  })

  it('reflects completion: checkbox label flips and the check icon is shown', () => {
    const { task } = renderItem({ completed: true })
    // Completed tasks offer "Mark incomplete" and render the Check glyph.
    const checkbox = screen.getByRole('button', {
      name: `Mark incomplete: ${task.title}`,
    })
    expect(checkbox).toBeInTheDocument()
    expect(screen.getByTestId('icon-Check')).toBeInTheDocument()
  })

  it('reveals hover actions that fire focus/pomodoro/delete callbacks', () => {
    const { handlers, task } = renderItem()
    const row = screen.getByRole('button', {
      name: new RegExp(`^Task: ${task.title}`),
    })
    // Hover reveals the action buttons (web branch).
    fireEvent.mouseEnter(row)
    fireEvent.click(screen.getByRole('button', { name: `Start focus on: ${task.title}` }))
    fireEvent.click(screen.getByRole('button', { name: `Start Pomodoro for: ${task.title}` }))
    fireEvent.click(screen.getByRole('button', { name: `Delete task: ${task.title}` }))
    expect(handlers.onStartFocus).toHaveBeenCalledWith(task)
    expect(handlers.onStartPomodoro).toHaveBeenCalledWith(task)
    expect(handlers.onDelete).toHaveBeenCalledWith(task.id)
  })
})
