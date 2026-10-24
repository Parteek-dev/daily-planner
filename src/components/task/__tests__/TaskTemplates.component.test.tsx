import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import TaskTemplates from '@/src/components/task/TaskTemplates'

const templates = [
  { id: 'tpl-1', title: 'Morning routine', topic: 'Health', duration: 30 },
  { id: 'tpl-2', title: 'Weekly review', topic: 'Work', duration: 60 },
]

function setup(props: Record<string, unknown> = {}) {
  const onDeleteTemplate = vi.fn()
  const onCreateFromTemplate = vi.fn()
  renderWithProviders(
    <TaskTemplates
      templates={templates}
      onDeleteTemplate={onDeleteTemplate}
      onCreateFromTemplate={onCreateFromTemplate}
      getTopicColor={() => '#f59e0b'}
      {...props}
    />,
  )
  return { onDeleteTemplate, onCreateFromTemplate }
}

describe('TaskTemplates', () => {
  it('renders the count and expands to list templates', () => {
    setup()
    expect(screen.getByText('Task Templates')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    // Collapsed by default -> expand.
    fireEvent.click(screen.getByRole('button', { name: 'Task Templates' }))
    expect(screen.getByText('Morning routine')).toBeInTheDocument()
    expect(screen.getByText('Weekly review')).toBeInTheDocument()
  })

  it('deletes a template via its delete action', () => {
    const { onDeleteTemplate } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Task Templates' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete template: Morning routine' }),
    )
    expect(onDeleteTemplate).toHaveBeenCalledWith('tpl-1')
  })

  it('creates a task from a template through the use flow', () => {
    const { onCreateFromTemplate } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Task Templates' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Use template: Weekly review' }),
    )
    // The create modal opens with a Create Task action.
    fireEvent.click(screen.getByRole('button', { name: 'Create Task' }))
    expect(onCreateFromTemplate).toHaveBeenCalledTimes(1)
    expect(onCreateFromTemplate.mock.calls[0][0]).toBe('tpl-2')
  })

  it('renders nothing when there are no templates', () => {
    const { container } = renderWithProviders(
      <TaskTemplates
        templates={[]}
        onDeleteTemplate={vi.fn()}
        onCreateFromTemplate={vi.fn()}
        getTopicColor={() => '#000'}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
