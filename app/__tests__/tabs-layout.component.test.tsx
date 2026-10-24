import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { setAuthUser } from '@/test/mocks/firebase-control'
import TabLayout from '@/app/(tabs)/_layout'

describe('app/(tabs)/_layout', () => {
  beforeEach(() => {
    setAuthUser({ uid: 'u1', email: 'a@b.com', emailVerified: true })
  })

  it('mounts the tab layout without throwing (narrow viewport -> tab branch)', () => {
    // jsdom reports width 0, so the NativeTabLayout branch renders. withContexts
    // supplies the root-level PomodoroMiniProvider + WidgetProvider the overlays
    // consume (the layout supplies its own modal providers).
    expect(() =>
      renderWithProviders(<TabLayout />, { withContexts: true }),
    ).not.toThrow()
  })
})
