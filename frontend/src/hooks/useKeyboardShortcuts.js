import { useEffect, useCallback } from 'react'

/**
 * Keyboard shortcuts hook
 * - N: Open new task modal
 * - T: Navigate to Today page
 * - C: Navigate to Calendar page
 * - D: Navigate to Dashboard page
 * - P: Start Pomodoro on current focused task (Today page only)
 * - Esc: Close any open modal
 * - ?: Show shortcuts help
 */
export function useKeyboardShortcuts({
  onNewTask,
  onNavigate,
  onCloseModal,
  onToggleHelp,
  onStartPomodoro,
  disabled = false,
}) {
  const handleKeyDown = useCallback((e) => {
    // Don't trigger if user is typing in an input/textarea
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
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
