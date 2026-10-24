import React, { type ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@/test/renderWithProviders'
import {
  MobileHeaderProvider,
  useMobileHeader,
} from '@/src/context/MobileHeaderContext'

const wrapper = ({ children }: { children: ReactNode }) => (
  <MobileHeaderProvider>{children}</MobileHeaderProvider>
)

describe('MobileHeaderContext', () => {
  it('openSearch invokes the subscribed callback', () => {
    const { result } = renderHook(() => useMobileHeader(), { wrapper })
    const cb = vi.fn()
    act(() => {
      result.current._subscribe(cb)
    })
    act(() => {
      result.current.openSearch()
    })
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('_subscribe returns a working unsubscribe', () => {
    const { result } = renderHook(() => useMobileHeader(), { wrapper })
    const cb = vi.fn()
    let unsubscribe: () => void = () => {}
    act(() => {
      unsubscribe = result.current._subscribe(cb)
    })
    act(() => {
      unsubscribe()
    })
    act(() => {
      result.current.openSearch()
    })
    expect(cb).not.toHaveBeenCalled()
  })

  it('falls back to no-ops when used without a provider (does not throw)', () => {
    const { result } = renderHook(() => useMobileHeader())
    expect(() => {
      result.current.openSearch()
      const unsub = result.current._subscribe(() => {})
      unsub()
    }).not.toThrow()
  })
})
