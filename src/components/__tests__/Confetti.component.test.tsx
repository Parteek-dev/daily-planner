import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { Confetti } from '@/src/components/Confetti'

describe('Confetti', () => {
  it('renders particles when visible', () => {
    const { container } = renderWithProviders(<Confetti visible />)
    // 24 particle Views render under the overlay.
    expect(container.querySelectorAll('div').length).toBeGreaterThan(1)
  })

  it('renders nothing when not visible', () => {
    const { container } = renderWithProviders(<Confetti visible={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})
