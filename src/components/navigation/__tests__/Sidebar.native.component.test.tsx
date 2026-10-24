import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import Sidebar from '@/src/components/navigation/Sidebar.native'

describe('Sidebar.native', () => {
  it('renders nothing without throwing (native no-op)', () => {
    const { container } = renderWithProviders(<Sidebar />)
    expect(container).toBeEmptyDOMElement()
  })
})
