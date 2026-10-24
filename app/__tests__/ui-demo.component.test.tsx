import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import UIDemoScreen from '@/app/ui-demo'

describe('app/ui-demo', () => {
  it('mounts the component gallery without throwing', () => {
    expect(() =>
      renderWithProviders(<UIDemoScreen />, { withContexts: true }),
    ).not.toThrow()
  })
})
