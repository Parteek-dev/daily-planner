import React from 'react'
import { Text } from 'react-native'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import GlassSurface from '@/src/components/GlassSurface'

describe('GlassSurface', () => {
  it('renders its children (web fallback branch)', () => {
    renderWithProviders(<GlassSurface><Text>Frosted</Text></GlassSurface>)
    expect(screen.getByText('Frosted')).toBeInTheDocument()
  })
})
