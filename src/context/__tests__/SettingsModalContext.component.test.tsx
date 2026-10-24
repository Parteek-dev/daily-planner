import React, { type ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@/test/renderWithProviders'
import {
  SettingsModalProvider,
  useSettingsModal,
} from '@/src/context/SettingsModalContext'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SettingsModalProvider>{children}</SettingsModalProvider>
)

describe('SettingsModalContext', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useSettingsModal(), { wrapper })
    expect(result.current.isOpen).toBe(false)
  })

  it('openSettings and closeSettings toggle isOpen', () => {
    const { result } = renderHook(() => useSettingsModal(), { wrapper })
    act(() => result.current.openSettings())
    expect(result.current.isOpen).toBe(true)
    act(() => result.current.closeSettings())
    expect(result.current.isOpen).toBe(false)
  })

  it('useSettingsModal throws outside its provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useSettingsModal())).toThrow(
      /must be used within SettingsModalProvider/,
    )
    spy.mockRestore()
  })
})
