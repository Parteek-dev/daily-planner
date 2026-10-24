import React from 'react'
import { Text } from 'react-native'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import FadeInView from '@/src/components/motion/FadeInView'

describe('FadeInView', () => {
  it('renders its children', () => {
    renderWithProviders(
      <FadeInView>
        <Text>Faded content</Text>
      </FadeInView>,
    )
    expect(screen.getByText('Faded content')).toBeInTheDocument()
  })
})
