import { useState, useCallback, useRef } from 'react'

const MAX_HISTORY = 50

export function useUndoRedo() {
  const [history, setHistory] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const isUndoingRef = useRef(false)

  // Push an action to history
  const pushAction = useCallback((action) => {
    if (isUndoingRef.current) return
    
    setHistory(prev => {
      const newHistory = [...prev, action]
      // Keep only last MAX_HISTORY items
      if (newHistory.length > MAX_HISTORY) {
        return newHistory.slice(-MAX_HISTORY)
      }
      return newHistory
    })
    // Clear redo stack when new action is performed
    setRedoStack([])
  }, [])

  // Undo last action
  const undo = useCallback(() => {
    if (history.length === 0) return null

    isUndoingRef.current = true
    
    const lastAction = history[history.length - 1]
    setHistory(prev => prev.slice(0, -1))
    setRedoStack(prev => [...prev, lastAction])
    
    // Reset flag after a tick
    setTimeout(() => {
      isUndoingRef.current = false
    }, 0)

    return lastAction
  }, [history])

  // Redo last undone action
  const redo = useCallback(() => {
    if (redoStack.length === 0) return null

    isUndoingRef.current = true

    const lastRedo = redoStack[redoStack.length - 1]
    setRedoStack(prev => prev.slice(0, -1))
    setHistory(prev => [...prev, lastRedo])

    setTimeout(() => {
      isUndoingRef.current = false
    }, 0)

    return lastRedo
  }, [redoStack])

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([])
    setRedoStack([])
  }, [])

  return {
    pushAction,
    undo,
    redo,
    clearHistory,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0,
    historyLength: history.length,
  }
}

/*
  Action types:
  - { type: 'DELETE_TASK', task: {...} }
  - { type: 'UPDATE_TASK', taskId: string, oldData: {...}, newData: {...} }
  - { type: 'COMPLETE_TASK', taskId: string, wasCompleted: boolean }
  - { type: 'ADD_TASK', taskId: string }
  - { type: 'BULK_DELETE', tasks: [...] }
  - { type: 'BULK_COMPLETE', taskIds: [...], previousStates: [...] }
  - { type: 'ARCHIVE_TASK', task: {...} }
*/
