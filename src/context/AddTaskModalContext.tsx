/**
 * AddTaskModalContext.tsx — Global context for controlling the Add Task modal.
 *
 * Renders the Add Task modal as a component at the layout level (like CommandPalette)
 * instead of a route, ensuring the transparent background works correctly.
 */

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface AddTaskModalParams {
  editTaskId?: string | null
  initialDate?: string | null
}

interface AddTaskModalContextValue {
  isOpen: boolean
  editTaskId: string | null
  initialDate: string | null
  openAddTask: (params?: AddTaskModalParams) => void
  closeAddTask: () => void
}

const AddTaskModalContext = createContext<AddTaskModalContextValue | null>(null)

export function AddTaskModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [editTaskId, setEditTaskId] = useState<string | null>(null)
  const [initialDate, setInitialDate] = useState<string | null>(null)

  const openAddTask = useCallback((params: AddTaskModalParams = {}) => {
    setEditTaskId(params.editTaskId ?? null)
    setInitialDate(params.initialDate ?? null)
    setIsOpen(true)
  }, [])

  const closeAddTask = useCallback(() => {
    setIsOpen(false)
    // Delay clearing params to allow close animation
    setTimeout(() => {
      setEditTaskId(null)
      setInitialDate(null)
    }, 300)
  }, [])

  return (
    <AddTaskModalContext.Provider value={{ isOpen, editTaskId, initialDate, openAddTask, closeAddTask }}>
      {children}
    </AddTaskModalContext.Provider>
  )
}

export function useAddTaskModal() {
  const ctx = useContext(AddTaskModalContext)
  if (!ctx) throw new Error('useAddTaskModal must be used within AddTaskModalProvider')
  return ctx
}
