import React, { type ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@/test/renderWithProviders'
import { WidgetProvider, useWidget } from '@/src/context/WidgetContext'
import type { WidgetTask } from '@/src/components/WidgetView'

const wrapper = ({ children }: { children: ReactNode }) => (
  <WidgetProvider>{children}</WidgetProvider>
)

describe('WidgetContext', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useWidget(), { wrapper })
    expect(result.current.isOpen).toBe(false)
  })

  it('open and close toggle isOpen', () => {
    const { result } = renderHook(() => useWidget(), { wrapper })
    act(() => result.current.open())
    expect(result.current.isOpen).toBe(true)
    act(() => result.current.close())
    expect(result.current.isOpen).toBe(false)
  })

  it('setTaskData stores tasks and wraps callbacks correctly', () => {
    const { result } = renderHook(() => useWidget(), { wrapper })
    const tasks: WidgetTask[] = [
      { id: 't1', title: 'Task 1', topic: 'Work', completed: false, date: '2025-01-15' },
    ]
    const onToggleComplete = vi.fn()
    const getTopicColor = vi.fn(() => '#123456')
    act(() => {
      result.current.setTaskData({ tasks, onToggleComplete, getTopicColor })
    })
    expect(result.current.tasks).toEqual(tasks)
    // The stored callbacks are the originals, not invoked during setState.
    act(() => {
      result.current.onToggleComplete('t1')
    })
    expect(onToggleComplete).toHaveBeenCalledWith('t1')
    expect(result.current.getTopicColor('Work')).toBe('#123456')
  })

  it('default context values are no-ops when used without a provider (does not throw)', () => {
    const { result } = renderHook(() => useWidget())
    expect(result.current.isOpen).toBe(false)
    expect(() => {
      result.current.open()
      result.current.close()
      result.current.setTaskData({
        tasks: [],
        onToggleComplete: () => { },
        getTopicColor: () => '#000',
      })
    }).not.toThrow()
    expect(result.current.getTopicColor('x')).toBe('#888')
  })
})
