import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import WidgetView from '@/src/components/WidgetView'

const today = new Date().toISOString().split('T')[0]

function setup(props: Record<string, unknown> = {}) {
  const onClose = vi.fn()
  const onToggleComplete = vi.fn()
  renderWithProviders(
    <WidgetView
      isOpen
      onClose={onClose}
      tasks={[
        { id: 't1', title: 'Today task', topic: 'Work', completed: false, date: today },
      ]}
      onToggleComplete={onToggleComplete}
      getTopicColor={() => '#3B82F6'}
      {...props}
    />,
  )
  return { onClose, onToggleComplete }
}

describe('WidgetView (web panel)', () => {
  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <WidgetView
        isOpen={false}
        onClose={() => {}}
        tasks={[]}
        onToggleComplete={() => {}}
        getTopicColor={() => '#000'}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("renders today's tasks and the completion badge", () => {
    setup()
    expect(screen.getByText("Today's Tasks")).toBeInTheDocument()
    expect(screen.getByText('Today task')).toBeInTheDocument()
    expect(screen.getByText('0/1')).toBeInTheDocument()
  })

  it('toggles completion from a task row', () => {
    const { onToggleComplete } = setup()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Today task' }))
    expect(onToggleComplete).toHaveBeenCalledWith('t1')
  })

  it('closes from the close control', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByLabelText('Close widget'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when there are no tasks today', () => {
    setup({ tasks: [] })
    expect(screen.getByText('No tasks for today')).toBeInTheDocument()
  })
})
