import React from 'react'
import { Text } from 'react-native'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import AnimatedGlow from '@/src/components/motion/AnimatedGlow'

describe('AnimatedGlow', () => {
  it('renders wrapped children when active', () => {
    renderWithProviders(
      <AnimatedGlow active>
        <Text>Glowing</Text>
      </AnimatedGlow>,
    )
    expect(screen.getByText('Glowing')).toBeInTheDocument()
  })

  it('renders children when inactive', () => {
    renderWithProviders(
      <AnimatedGlow active={false}>
        <Text>No glow</Text>
      </AnimatedGlow>,
    )
    expect(screen.getByText('No glow')).toBeInTheDocument()
  })
})
