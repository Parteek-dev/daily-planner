/**
 * MobileHeaderContext
 *
 * Provides a lightweight shared channel so any tab screen can open the
 * CommandPalette overlay that lives in NativeTabLayout (one level up).
 * This avoids prop-drilling through four screens.
 *
 * Usage:
 *   const { openSearch } = useMobileHeader()
 */

import React, { createContext, useContext, useRef, useCallback } from 'react'

interface MobileHeaderContextValue {
  /** Call this from any tab screen to open the command palette. */
  openSearch: () => void
  /** Internal — NativeTabLayout subscribes here to get notified. */
  _subscribe: (cb: () => void) => () => void
}

const MobileHeaderContext = createContext<MobileHeaderContextValue | null>(null)

export function MobileHeaderProvider({ children }: { children: React.ReactNode }) {
  const listenerRef = useRef<(() => void) | null>(null)

  const openSearch = useCallback(() => {
    listenerRef.current?.()
  }, [])

  const _subscribe = useCallback((cb: () => void) => {
    listenerRef.current = cb
    return () => {
      if (listenerRef.current === cb) {
        listenerRef.current = null
      }
    }
  }, [])

  return (
    <MobileHeaderContext.Provider value={{ openSearch, _subscribe }}>
      {children}
    </MobileHeaderContext.Provider>
  )
}

export function useMobileHeader(): MobileHeaderContextValue {
  const ctx = useContext(MobileHeaderContext)
  if (!ctx) {
    // On web (sidebar layout) there is no MobileHeaderProvider in the tree.
    // Return a no-op so screens can call openSearch() without crashing —
    // the web sidebar handles search via its own CommandPalette.
    return {
      openSearch: () => { },
      _subscribe: () => () => { },
    }
  }
  return ctx
}
