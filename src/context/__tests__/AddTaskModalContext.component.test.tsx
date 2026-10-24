import React, { type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@/test/renderWithProviders'
import {
  AddTaskModalProvider,
  useAddTaskModal,
} from '@/src/context/AddTaskModalContext'

const wrapper = ({ children }: { children: ReactNode }) => (
  <AddTaskModalProvider>{children}</AddTaskModalProvider>
)

describe('AddTaskModalContext', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts closed with null params', () => {
    const { result } = renderHook(() => useAddTaskModal(), { wrapper })
    expect(result.current.isOpen).toBe(false)
    expect(result.current.editTaskId).toBeNull()
    expect(result.current.initialDate).toBeNull()
  })

  it('openAddTask sets isOpen and params', () => {
    const { result } = renderHook(() => useAddTaskModal(), { wrapper })
    act(() => {
      result.current.openAddTask({ editTaskId: 't1', initialDate: '2025-01-15' })
    })
    expect(result.current.isOpen).toBe(true)
    expect(result.current.editTaskId).toBe('t1')
    expect(result.current.initialDate).toBe('2025-01-15')
  })

  it('openAddTask with no params defaults to null', () => {
    const { result } = renderHook(() => useAddTaskModal(), { wrapper })
    act(() => {
      result.current.openAddTask()
    })
    expect(result.current.isOpen).toBe(true)
    expect(result.current.editTaskId).toBeNull()
    expect(result.current.initialDate).toBeNull()
  })

  it('closeAddTask closes immediately but clears params after 300ms', () => {
    const { result } = renderHook(() => useAddTaskModal(), { wrapper })
    act(() => {
      result.current.openAddTask({ editTaskId: 't1', initialDate: '2025-01-15' })
    })
    act(() => {
      result.current.closeAddTask()
    })
    // Closed immediately, params still present
    expect(result.current.isOpen).toBe(false)
    expect(result.current.editTaskId).toBe('t1')
    expect(result.current.initialDate).toBe('2025-01-15')
    // Params cleared after the 300ms close animation delay
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.editTaskId).toBeNull()
    expect(result.current.initialDate).toBeNull()
  })

  it('useAddTaskModal throws outside its provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAddTaskModal())).toThrow(
      /must be used within AddTaskModalProvider/,
    )
    spy.mockRestore()
  })
})
