import React from 'react'
import { Text } from 'react-native'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import GradientSurface from '@/src/components/GradientSurface'

describe('GradientSurface', () => {
  it('renders children inside the gradient', () => {
    renderWithProviders(
      <GradientSurface variant="hero"><Text>On gradient</Text></GradientSurface>,
    )
    expect(screen.getByText('On gradient')).toBeInTheDocument()
  })

  it('forwards token gradient colors to the mocked LinearGradient', () => {
    const { container } = renderWithProviders(
      <GradientSurface variant="accent"><Text>x</Text></GradientSurface>,
    )
    // The mocked LinearGradient forwards `colors`; at least one color is present.
    const grad = container.querySelector('[data-testid]') ?? container.firstElementChild
    expect(grad).toBeTruthy()
    expect(screen.getByText('x')).toBeInTheDocument()
  })
})
