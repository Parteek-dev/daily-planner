import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import { setAuthUser } from '@/test/mocks/firebase-control'
import SettingsModal from '@/src/components/SettingsModal'

describe('SettingsModal', () => {
  beforeEach(() => {
    setAuthUser({ uid: 'u1', email: 'a@b.com', emailVerified: true })
  })

  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <SettingsModal isOpen={false} onClose={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the settings tabs and the default Appearance content', () => {
    renderWithProviders(<SettingsModal isOpen onClose={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Notifications' })).toBeInTheDocument()
    // Appearance tab content.
    expect(screen.getByText('Theme Mode')).toBeInTheDocument()
  })

  it('switches to another tab', () => {
    renderWithProviders(<SettingsModal isOpen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Accessibility' }))
    // Theme Mode (appearance-only) is gone after switching tabs.
    expect(screen.queryByText('Theme Mode')).not.toBeInTheDocument()
  })

  it('closes from the close control', () => {
    const onClose = vi.fn()
    renderWithProviders(<SettingsModal isOpen onClose={onClose} />)
    fireEvent.click(screen.getAllByLabelText('Close settings')[0])
    expect(onClose).toHaveBeenCalled()
  })
})
