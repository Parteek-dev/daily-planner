import { useEffect, useCallback } from 'react'
import { Platform } from 'react-native'

export interface KeyboardShortcutsOptions {
  onNewTask?: () => void
  onNavigate?: (path: string) => void
  onCloseModal?: () => void
  onToggleHelp?: () => void
  onStartPomodoro?: () => void
  disabled?: boolean
}

/**
 * Keyboard shortcuts hook
 * - N: Open new task modal
 * - T: Navigate to Today page
 * - C: Navigate to Calendar page
 * - D: Navigate to Dashboard page
 * - W: Navigate to Week page
 * - P: Start Pomodoro on current focused task (Today page only)
 * - Esc: Close any open modal
 * - ?: Show shortcuts help
 *
 * On native platforms this is a no-op — keyboard shortcuts are web-only.
 */
export function useKeyboardShortcuts({
  onNewTask,
  onNavigate,
  onCloseModal,
  onToggleHelp,
  onStartPomodoro,
  disabled = false,
}: KeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger if user is typing in an input/textarea
    const activeEl = (document as Document).activeElement
    const isTyping = activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes((activeEl as HTMLElement).tagName)
    if (isTyping || disabled) return

    // Escape always works for closing modals
    if (e.key === 'Escape') {
      onCloseModal?.()
      return
    }

    // Don't trigger shortcuts if modifier keys are pressed (except shift for ?)
    if (e.ctrlKey || e.altKey || e.metaKey) return

    switch (e.key.toLowerCase()) {
      case 'n':
        e.preventDefault()
        onNewTask?.()
        break
      case 'w':
        e.preventDefault()
        onNavigate?.('/week')
        break
      case 't':
        e.preventDefault()
        onNavigate?.('/today')
        break
      case 'c':
        e.preventDefault()
        onNavigate?.('/calendar')
        break
      case 'd':
        e.preventDefault()
        onNavigate?.('/')
        break
      case 'p':
        e.preventDefault()
        onStartPomodoro?.()
        break
      case '?':
        e.preventDefault()
        onToggleHelp?.()
        break
      default:
        break
    }
  }, [onNewTask, onNavigate, onCloseModal, onToggleHelp, onStartPomodoro, disabled])

  useEffect(() => {
    // Keyboard shortcuts are only meaningful on web
    if (Platform.OS !== 'web') return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export const SHORTCUTS = [
  { key: 'N', description: 'New task' },
  { key: '⌘/', description: 'Search all tasks' },
  { key: 'D', description: 'Go to Dashboard' },
  { key: 'T', description: 'Go to Today' },
  { key: 'W', description: 'Go to Week' },
  { key: 'C', description: 'Go to Calendar' },
  { key: 'P', description: 'Start Pomodoro (Today page)' },
  { key: 'Esc', description: 'Close modal' },
  { key: '?', description: 'Show shortcuts' },
]
