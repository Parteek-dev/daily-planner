import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import ShortcutsModal from '@/src/components/ShortcutsModal'

describe('ShortcutsModal', () => {
  it('renders the shortcuts reference when open', () => {
    renderWithProviders(<ShortcutsModal isOpen onClose={() => {}} />)
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <ShortcutsModal isOpen={false} onClose={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
