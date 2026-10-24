import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import ArchiveManager from '@/src/components/ArchiveManager'

const archivedTasks = [
  { id: 'a1', title: 'Old report', topic: 'Work', duration: 60, date: '2024-12-01' },
  { id: 'a2', title: 'Spring cleaning', topic: 'Home', duration: 120, date: '2024-12-02' },
]

function setup(props: Record<string, unknown> = {}) {
  const onRestore = vi.fn()
  const onDelete = vi.fn()
  const onArchiveOld = vi.fn()
  const onClose = vi.fn()
  renderWithProviders(
    <ArchiveManager
      isOpen
      onClose={onClose}
      archivedTasks={archivedTasks}
      onRestore={onRestore}
      onDelete={onDelete}
      onArchiveOld={onArchiveOld}
      getTopicColor={() => '#3B82F6'}
      {...props}
    />,
  )
  return { onRestore, onDelete, onArchiveOld, onClose }
}

describe('ArchiveManager', () => {
  it('lists archived tasks', () => {
    setup()
    expect(screen.getByText('Old report')).toBeInTheDocument()
    expect(screen.getByText('Spring cleaning')).toBeInTheDocument()
  })

  it('filters tasks via the search field', () => {
    setup()
    fireEvent.change(screen.getByLabelText('Search archived tasks'), {
      target: { value: 'cleaning' },
    })
    expect(screen.getByText('Spring cleaning')).toBeInTheDocument()
    expect(screen.queryByText('Old report')).not.toBeInTheDocument()
  })

  it('restores a task', () => {
    const { onRestore } = setup()
    fireEvent.click(screen.getAllByRole('button', { name: 'Restore task' })[0])
    expect(onRestore).toHaveBeenCalledWith('a1')
  })

  it('deletes a task after confirmation', () => {
    const { onDelete } = setup()
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete task permanently' })[0])
    // Inline confirm appears; confirm commits the delete.
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(onDelete).toHaveBeenCalledWith('a1')
  })

  it('triggers auto-archive of old tasks', () => {
    const { onArchiveOld } = setup()
    fireEvent.click(
      screen.getByRole('button', { name: 'Archive old completed tasks' }),
    )
    expect(onArchiveOld).toHaveBeenCalledWith(7)
  })
})
