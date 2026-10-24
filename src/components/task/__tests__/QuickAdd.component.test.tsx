import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from '@/test/renderWithProviders'
import QuickAdd from '@/src/components/task/QuickAdd'

const topics = [
  { name: 'Work', color: '#3B82F6' },
  { name: 'Personal', color: '#10B981' },
]

function setup(props: Record<string, unknown> = {}) {
  const onAdd = vi.fn()
  renderWithProviders(
    <QuickAdd
      onAdd={onAdd}
      topics={topics}
      getTopicColor={() => '#3B82F6'}
      {...props}
    />,
  )
  return { onAdd, input: screen.getByLabelText('Quick add task') }
}

describe('QuickAdd', () => {
  it('disables the add button while the input is empty', () => {
    setup()
    const addBtn = screen.getByRole('button', { name: 'Add task' })
    expect(addBtn).toBeDisabled()
  })

  it('shows preview chips parsed from natural-language input', async () => {
    setup()
    const input = screen.getByLabelText('Quick add task')
    fireEvent.change(input, {
      target: { value: 'Review docs tomorrow at 2pm for 30m #work !high' },
    })
    // Title has the tokens stripped out.
    expect(await screen.findByText('Review docs')).toBeInTheDocument()
    // Topic / date / time / duration / priority chips.
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Tomorrow')).toBeInTheDocument()
    expect(screen.getByText('2:00 PM')).toBeInTheDocument()
    expect(screen.getByText('30m')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('submits the parsed task payload via onAdd', async () => {
    const { onAdd } = setup()
    const input = screen.getByLabelText('Quick add task')
    fireEvent.change(input, {
      target: { value: 'Call dentist tomorrow at 2pm for 30m #work !high' },
    })
    await screen.findByText('Call dentist')
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd.mock.calls[0][0]).toMatchObject({
      title: 'Call dentist',
      topic: 'Work',
      duration: 30,
      dueTime: '14:00',
      priority: 'high',
    })
  })

  it('warns on a duplicate and commits only after Add anyway', async () => {
    const onAdd = vi.fn()
    const existing = [{ id: 'x', title: 'Standup', date: new Date().toISOString().split('T')[0] }]
    renderWithProviders(
      <QuickAdd
        onAdd={onAdd}
        topics={topics}
        getTopicColor={() => '#3B82F6'}
        tasks={existing}
      />,
    )
    const input = screen.getByLabelText('Quick add task')
    fireEvent.change(input, { target: { value: 'Standup today' } })
    await screen.findByText('Standup')
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    // First submit shows the duplicate warning instead of committing.
    expect(onAdd).not.toHaveBeenCalled()
    const addAnyway = await screen.findByText('Add anyway')
    fireEvent.click(addAnyway)
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1))
  })
})
