import React, { type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@/test/renderWithProviders'
import {
  PomodoroMiniProvider,
  usePomodoroMini,
} from '@/src/context/PomodoroMiniContext'

const wrapper = ({ children }: { children: ReactNode }) => (
  <PomodoroMiniProvider>{children}</PomodoroMiniProvider>
)

describe('PomodoroMiniContext', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('exposes the usePomodoro return plus mini state defaults', () => {
    const { result } = renderHook(() => usePomodoroMini(), { wrapper })
    // usePomodoro surface is spread in.
    expect(result.current.isRunning).toBe(false)
    expect(result.current.mode).toBe('work')
    expect(typeof result.current.toggleTimer).toBe('function')
    // mini-specific state.
    expect(result.current.isMinimized).toBe(false)
    expect(result.current.pipTaskTitle).toBeNull()
  })

  it('setIsMinimized and setPipTaskTitle update state', () => {
    const { result } = renderHook(() => usePomodoroMini(), { wrapper })
    act(() => {
      result.current.setIsMinimized(true)
      result.current.setPipTaskTitle('Deep work')
    })
    expect(result.current.isMinimized).toBe(true)
    expect(result.current.pipTaskTitle).toBe('Deep work')
  })

  it('usePomodoroMini throws outside its provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => usePomodoroMini())).toThrow(
      /must be used inside PomodoroMiniProvider/,
    )
    spy.mockRestore()
  })
})
