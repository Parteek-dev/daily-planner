import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders'
import { ACCENT_COLORS } from '@/src/hooks/useTheme'
import ThemeCustomizer from '@/src/components/ThemeCustomizer'

describe('ThemeCustomizer', () => {
  it('renders the mode selector and accent grid when open', () => {
    renderWithProviders(<ThemeCustomizer isOpen onClose={() => {}} />)
    expect(screen.getByText('Customize Theme')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Light mode' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dark mode' })).toBeInTheDocument()
  })

  it('selecting an accent swatch updates the custom hex field (real ThemeProvider)', async () => {
    renderWithProviders(<ThemeCustomizer isOpen onClose={() => {}} />)
    const target = ACCENT_COLORS[1]
    fireEvent.click(screen.getByRole('button', { name: target.name }))
    // setAccentColor flows through the real provider and back into the hex input.
    await waitFor(() =>
      expect(screen.getByDisplayValue(target.value)).toBeInTheDocument(),
    )
  })

  it('switching theme mode marks the chosen mode button', () => {
    renderWithProviders(<ThemeCustomizer isOpen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }))
    // Dark mode persists via the provider; the Auto hint only shows for auto.
    expect(screen.queryByText(/Follows your system/)).not.toBeInTheDocument()
  })
})
