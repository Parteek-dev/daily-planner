import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import { makeTask } from '@/test/fixtures/tasks'
import { UnifiedTaskItem } from '@/src/components/task/UnifiedTaskItem'

function renderItem(overrides = {}, props: Record<string, unknown> = {}) {
  const task = makeTask(overrides)
  const handlers = {
    onToggle: vi.fn(),
    onPress: vi.fn(),
    onDelete: vi.fn(),
    onFocus: vi.fn(),
    getTopicColor: () => '#10B981',
    ...props,
  }
  renderWithProviders(<UnifiedTaskItem task={task} {...(handlers as any)} />)
  return { task, handlers }
}

describe('UnifiedTaskItem', () => {
  it('renders the title and a formatted time range', () => {
    renderItem({ title: 'Design review', dueTime: '10:15', duration: 45 })
    expect(screen.getByText('Design review')).toBeInTheDocument()
    expect(screen.getByText('10.15 AM - 11.00 AM')).toBeInTheDocument()
  })

  it('calls onPress when the row is pressed', () => {
    const { handlers, task } = renderItem()
    fireEvent.click(screen.getByRole('button', { name: `Edit task: ${task.title}` }))
    expect(handlers.onPress).toHaveBeenCalledTimes(1)
  })

  it('calls onToggle from the checkbox', () => {
    const { handlers } = renderItem()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(handlers.onToggle).toHaveBeenCalledTimes(1)
  })

  it('shows an overdue badge for an incomplete overdue task', () => {
    renderItem({ completed: false }, { isOverdue: true })
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })
})
