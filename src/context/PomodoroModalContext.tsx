/**
 * PomodoroModalContext.tsx — Global context for controlling the Pomodoro modal.
 *
 * On web (>768px), renders the Pomodoro modal as a component overlay.
 * On mobile, the caller should use router.push('/(modals)/pomodoro') instead.
 */

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface PomodoroModalParams {
  taskId?: string | null
}

interface PomodoroModalContextValue {
  isOpen: boolean
  taskId: string | null
  openPomodoro: (params?: PomodoroModalParams) => void
  closePomodoro: () => void
}

const PomodoroModalContext = createContext<PomodoroModalContextValue | null>(null)

export function PomodoroModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)

  const openPomodoro = useCallback((params: PomodoroModalParams = {}) => {
    setTaskId(params.taskId ?? null)
    setIsOpen(true)
  }, [])

  const closePomodoro = useCallback(() => {
    setIsOpen(false)
    // Delay clearing params to allow close animation
    setTimeout(() => {
      setTaskId(null)
    }, 300)
  }, [])

  return (
    <PomodoroModalContext.Provider value={{ isOpen, taskId, openPomodoro, closePomodoro }}>
      {children}
    </PomodoroModalContext.Provider>
  )
}

export function usePomodoroModal() {
  const ctx = useContext(PomodoroModalContext)
  if (!ctx) throw new Error('usePomodoroModal must be used within PomodoroModalProvider')
  return ctx
}
