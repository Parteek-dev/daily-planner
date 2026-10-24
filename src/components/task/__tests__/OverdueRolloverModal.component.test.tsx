import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import OverdueRolloverModal from '@/src/components/task/OverdueRolloverModal'

const tasks = [
  { id: 'o1', title: 'Pay invoice', topic: 'Work', duration: 15, date: '2025-01-10' },
  { id: 'o2', title: 'Water plants', topic: 'Home', duration: 5, date: '2025-01-11' },
]

function setup() {
  const onMoveSelected = vi.fn()
  const onDismiss = vi.fn()
  renderWithProviders(
    <OverdueRolloverModal
      tasks={tasks}
      onMoveSelected={onMoveSelected}
      onDismiss={onDismiss}
    />,
  )
  return { onMoveSelected, onDismiss }
}

describe('OverdueRolloverModal', () => {
  it('lists the overdue tasks', () => {
    setup()
    expect(screen.getByText('Pay invoice')).toBeInTheDocument()
    expect(screen.getByText('Water plants')).toBeInTheDocument()
  })

  it('moves all selected tasks (all selected by default)', () => {
    const { onMoveSelected } = setup()
    fireEvent.click(screen.getByRole('button', { name: /Move 2 tasks to today/ }))
    expect(onMoveSelected).toHaveBeenCalledTimes(1)
    expect(onMoveSelected.mock.calls[0][0].sort()).toEqual(['o1', 'o2'])
  })

  it('deselecting a task narrows the move payload', () => {
    const { onMoveSelected } = setup()
    // Tasks start selected; tapping one deselects it.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pay invoice' }))
    fireEvent.click(screen.getByRole('button', { name: /to today/ }))
    expect(onMoveSelected).toHaveBeenCalledWith(['o2'])
  })

  it('dismisses via the dismiss action', () => {
    const { onDismiss } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss for today' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when there are no overdue tasks', () => {
    const { container } = renderWithProviders(
      <OverdueRolloverModal tasks={[]} onMoveSelected={vi.fn()} onDismiss={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
