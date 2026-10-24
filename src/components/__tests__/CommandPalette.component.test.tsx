import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from '@/test/renderWithProviders'
import { getRouter } from '@/test/mocks/expo-router-control'
import CommandPalette from '@/src/components/CommandPalette'

const today = new Date().toISOString().split('T')[0]
const tasks = [
  { id: 't1', title: 'Write report', topic: 'Work', completed: false, date: today, duration: 60 },
  { id: 't2', title: 'Buy groceries', topic: 'Home', completed: false, date: today, duration: 30 },
]

function setup() {
  const onClose = vi.fn()
  renderWithProviders(
    <CommandPalette
      isOpen
      onClose={onClose}
      tasks={tasks}
      getTopicColor={() => '#3B82F6'}
    />,
  )
  return { onClose }
}

describe('CommandPalette', () => {
  it('shows the empty-state prompt before any query', () => {
    setup()
    expect(
      screen.getByText('Search across all tasks, topics and notes'),
    ).toBeInTheDocument()
  })

  it('filters tasks as the user types', () => {
    setup()
    fireEvent.change(screen.getByLabelText('Search tasks'), {
      target: { value: 'report' },
    })
    expect(screen.getByText('Write report')).toBeInTheDocument()
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument()
  })

  it('shows a no-results message when nothing matches', () => {
    setup()
    fireEvent.change(screen.getByLabelText('Search tasks'), {
      target: { value: 'zzzz' },
    })
    expect(screen.getByText('No results for "zzzz"')).toBeInTheDocument()
  })

  it('navigates and closes when a result is selected', async () => {
    const { onClose } = setup()
    fireEvent.change(screen.getByLabelText('Search tasks'), {
      target: { value: 'report' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Write report/ }))
    await waitFor(() =>
      expect(getRouter().push).toHaveBeenCalledWith('/(tabs)/today'),
    )
    expect(onClose).toHaveBeenCalled()
  })
})
