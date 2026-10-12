/**
 * WidgetContext — shares widget open/close state and task data across layout
 * levels so WidgetView can be rendered at the root layout (same stacking
 * context as PomodoroMiniPip), while the sidebar/navigation trigger it from
 * a child layout.
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { WidgetTask } from '@/src/components/WidgetView'

interface WidgetContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  /** Called by the tab layout to supply task data once useProgress is available */
  setTaskData: (data: {
    tasks: WidgetTask[]
    onToggleComplete: (id: string) => void
    getTopicColor: (topic: string) => string
  }) => void
  tasks: WidgetTask[]
  onToggleComplete: (id: string) => void
  getTopicColor: (topic: string) => string
}

const WidgetContext = createContext<WidgetContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  setTaskData: () => {},
  tasks: [],
  onToggleComplete: () => {},
  getTopicColor: () => '#888',
})

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [tasks, setTasks] = useState<WidgetTask[]>([])
  const [onToggleComplete, setOnToggleComplete] = useState<(id: string) => void>(() => () => {})
  const [getTopicColor, setGetTopicColor] = useState<(topic: string) => string>(() => () => '#888')

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const setTaskData = useCallback((data: {
    tasks: WidgetTask[]
    onToggleComplete: (id: string) => void
    getTopicColor: (topic: string) => string
  }) => {
    setTasks(data.tasks)
    // Wrap in arrow so React doesn't call the function during setState
    setOnToggleComplete(() => data.onToggleComplete)
    setGetTopicColor(() => data.getTopicColor)
  }, [])

  return (
    <WidgetContext.Provider value={{ isOpen, open, close, setTaskData, tasks, onToggleComplete, getTopicColor }}>
      {children}
    </WidgetContext.Provider>
  )
}

export function useWidget() {
  return useContext(WidgetContext)
}
