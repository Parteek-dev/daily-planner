import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import Avatar from '@/src/components/ui/Avatar'

describe('Avatar', () => {
  it('derives the uppercase initial from the name', () => {
    renderWithProviders(<Avatar name="ada lovelace" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('falls back to "?" when no name is given', () => {
    renderWithProviders(<Avatar />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('renders an image (no initial) when a source is provided', () => {
    renderWithProviders(<Avatar name="Grace" source={{ uri: 'https://x/y.png' }} />)
    expect(screen.queryByText('G')).not.toBeInTheDocument()
    expect(document.querySelector('img')).toBeTruthy()
  })
})
