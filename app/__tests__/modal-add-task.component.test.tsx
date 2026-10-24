import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders'
import { setAuthUser, setFirestoreDocs } from '@/test/mocks/firebase-control'
import { setRouterMock, getRouter } from '@/test/mocks/expo-router-control'
import { firestoreSpies } from '@/test/mocks/firebase'
import AddTaskModalScreen from '@/app/(modals)/add-task'

describe('app/(modals)/add-task', () => {
  beforeEach(() => {
    setAuthUser({ uid: 'u1', email: 'a@b.com', emailVerified: true })
  })

  it('hosts the add-task form', async () => {
    renderWithProviders(<AddTaskModalScreen />, { withContexts: true })
    expect(await screen.findByPlaceholderText('What do you need to do?')).toBeInTheDocument()
    expect(screen.getAllByText('Add task').length).toBeGreaterThanOrEqual(1)
  })

  it('flags the title as required on empty submit', async () => {
    renderWithProviders(<AddTaskModalScreen />, { withContexts: true })
    await screen.findByPlaceholderText('What do you need to do?')
    const matches = screen.getAllByText('Add task')
    fireEvent.click(matches[matches.length - 1])
    expect(await screen.findByText(/Task title — required/)).toBeInTheDocument()
  })

  it('saves a valid task and navigates back', async () => {
    renderWithProviders(<AddTaskModalScreen />, { withContexts: true })
    const input = await screen.findByPlaceholderText('What do you need to do?')
    fireEvent.change(input, { target: { value: 'Host-created task' } })
    const matches = screen.getAllByText('Add task')
    fireEvent.click(matches[matches.length - 1])
    await waitFor(() => expect(getRouter().back).toHaveBeenCalled())
    expect(firestoreSpies.setDoc).toHaveBeenCalled()
  })

  it('prefills in edit mode from the taskId param', async () => {
    setRouterMock({ params: { taskId: 'edit-1' } })
    setFirestoreDocs('users/u1/tasks', [
      { id: 'edit-1', data: { title: 'Host edit task', date: '2025-01-15' } },
    ])
    renderWithProviders(<AddTaskModalScreen />, { withContexts: true })
    expect(await screen.findByText('Edit task')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Host edit task')).toBeInTheDocument()
  })
})
