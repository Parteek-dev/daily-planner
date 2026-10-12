/**
 * PomodoroMiniContext — hosts usePomodoro at the root level so the timer
 * keeps running even when the Pomodoro modal is closed/minimized.
 *
 * The modal reads/writes timer state from this context.
 * The pip reads the live formattedTime/isRunning directly.
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import usePomodoro, { type UsePomodoroReturn } from '@/src/hooks/usePomodoro'

interface PomodoroMiniContextValue extends UsePomodoroReturn {
  /** Whether the pip is visible (timer is minimized) */
  isMinimized: boolean
  setIsMinimized: (v: boolean) => void
  /** Task title shown in the pip */
  pipTaskTitle: string | null
  setPipTaskTitle: (t: string | null) => void
}

const PomodoroMiniContext = createContext<PomodoroMiniContextValue | null>(null)

export function PomodoroMiniProvider({ children }: { children: React.ReactNode }) {
  const pomodoro = usePomodoro()
  const [isMinimized, setIsMinimized] = useState(false)
  const [pipTaskTitle, setPipTaskTitle] = useState<string | null>(null)

  return (
    <PomodoroMiniContext.Provider value={{
      ...pomodoro,
      isMinimized,
      setIsMinimized,
      pipTaskTitle,
      setPipTaskTitle,
    }}>
      {children}
    </PomodoroMiniContext.Provider>
  )
}

export function usePomodoroMini() {
  const ctx = useContext(PomodoroMiniContext)
  if (!ctx) throw new Error('usePomodoroMini must be used inside PomodoroMiniProvider')
  return ctx
}
