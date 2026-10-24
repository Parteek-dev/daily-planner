import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import ModalsLayout from '@/app/(modals)/_layout'

describe('app/(modals)/_layout', () => {
  it('renders the modal stack without throwing', () => {
    expect(() => renderWithProviders(<ModalsLayout />)).not.toThrow()
  })
})
