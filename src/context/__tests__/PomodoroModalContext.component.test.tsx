import React, { type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@/test/renderWithProviders'
import {
  PomodoroModalProvider,
  usePomodoroModal,
} from '@/src/context/PomodoroModalContext'

const wrapper = ({ children }: { children: ReactNode }) => (
  <PomodoroModalProvider>{children}</PomodoroModalProvider>
)

describe('PomodoroModalContext', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts closed with null taskId', () => {
    const { result } = renderHook(() => usePomodoroModal(), { wrapper })
    expect(result.current.isOpen).toBe(false)
    expect(result.current.taskId).toBeNull()
  })

  it('openPomodoro sets isOpen and taskId', () => {
    const { result } = renderHook(() => usePomodoroModal(), { wrapper })
    act(() => result.current.openPomodoro({ taskId: 'task-9' }))
    expect(result.current.isOpen).toBe(true)
    expect(result.current.taskId).toBe('task-9')
  })

  it('closePomodoro closes immediately but clears taskId after 300ms', () => {
    const { result } = renderHook(() => usePomodoroModal(), { wrapper })
    act(() => result.current.openPomodoro({ taskId: 'task-9' }))
    act(() => result.current.closePomodoro())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.taskId).toBe('task-9')
    act(() => vi.advanceTimersByTime(300))
    expect(result.current.taskId).toBeNull()
  })

  it('usePomodoroModal throws outside its provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => usePomodoroModal())).toThrow(
      /must be used within PomodoroModalProvider/,
    )
    spy.mockRestore()
  })
})
