import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders'
import { setAuthUser, setFirestoreDocs } from '@/test/mocks/firebase-control'
import { firestoreSpies } from '@/test/mocks/firebase'
import AddTaskModal from '@/src/components/task/AddTaskModal'

describe('AddTaskModal', () => {
  beforeEach(() => {
    setAuthUser({ uid: 'u1', email: 'a@b.com', emailVerified: true })
  })

  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <AddTaskModal isOpen={false} onClose={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  /** The submit control is a Pressable whose only label is its text; the same
   *  text appears in the header, so pick the footer (last) match. */
  function submitButton(label: string) {
    const matches = screen.getAllByText(label)
    return matches[matches.length - 1]
  }

  it('renders the add-task form with a required title field', async () => {
    renderWithProviders(<AddTaskModal isOpen onClose={vi.fn()} />)
    expect(await screen.findByPlaceholderText('What do you need to do?')).toBeInTheDocument()
    expect(screen.getByText(/Task title/)).toBeInTheDocument()
    // Header + footer button both read "Add task".
    expect(screen.getAllByText('Add task').length).toBeGreaterThanOrEqual(2)
  })

  it('blocks save and flags the title as required when empty', async () => {
    const onClose = vi.fn()
    renderWithProviders(<AddTaskModal isOpen onClose={onClose} />)
    await screen.findByPlaceholderText('What do you need to do?')
    fireEvent.click(submitButton('Add task'))
    expect(await screen.findByText(/Task title — required/)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('saves a valid task and closes', async () => {
    const onClose = vi.fn()
    renderWithProviders(<AddTaskModal isOpen onClose={onClose} />)
    const titleInput = await screen.findByPlaceholderText('What do you need to do?')
    fireEvent.change(titleInput, { target: { value: 'New task from test' } })
    fireEvent.click(submitButton('Add task'))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    // The save path writes through the firestore mock.
    expect(firestoreSpies.setDoc).toHaveBeenCalled()
  })

  it('prefills the title in edit mode', async () => {
    setFirestoreDocs('users/u1/tasks', [
      { id: 'edit-1', data: { title: 'Existing task', date: '2025-01-15' } },
    ])
    renderWithProviders(
      <AddTaskModal isOpen onClose={vi.fn()} editTaskId="edit-1" />,
    )
    expect(await screen.findByText('Edit task')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Existing task')).toBeInTheDocument()
  })
})
