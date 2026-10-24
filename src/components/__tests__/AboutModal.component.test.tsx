import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import AboutModal from '@/src/components/AboutModal'

describe('AboutModal', () => {
  it('renders app info when open', () => {
    renderWithProviders(<AboutModal isOpen onClose={() => {}} />)
    expect(screen.getByText('About Daily Planner')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <AboutModal isOpen={false} onClose={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
