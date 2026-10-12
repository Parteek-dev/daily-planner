/**
 * SettingsModalContext.tsx — Global context for controlling the Settings modal.
 *
 * On web (>768px), renders the Settings modal as a component overlay.
 * On mobile, the caller should use router.push('/(modals)/settings') instead.
 */

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface SettingsModalContextValue {
  isOpen: boolean
  openSettings: () => void
  closeSettings: () => void
}

const SettingsModalContext = createContext<SettingsModalContextValue | null>(null)

export function SettingsModalProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isOpen, setIsOpen] = useState(false)

  const openSettings = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeSettings = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <SettingsModalContext.Provider value={{ isOpen, openSettings, closeSettings }}>
      {children}
    </SettingsModalContext.Provider>
  )
}

export function useSettingsModal() {
  const ctx = useContext(SettingsModalContext)
  if (!ctx) throw new Error('useSettingsModal must be used within SettingsModalProvider')
  return ctx
}
