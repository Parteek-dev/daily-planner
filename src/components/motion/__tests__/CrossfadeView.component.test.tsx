import React from 'react'
import { Text } from 'react-native'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import CrossfadeView from '@/src/components/motion/CrossfadeView'

describe('CrossfadeView', () => {
  beforeEach(() => {
    // Force reduced motion so the keyed content swap is synchronous (the
    // mocked reanimated withTiming never fires its completion callback).
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  it('renders the initial child', () => {
    renderWithProviders(
      <CrossfadeView viewKey="a">
        <Text>Panel A</Text>
      </CrossfadeView>,
    )
    expect(screen.getByText('Panel A')).toBeInTheDocument()
  })

  it('swaps content when the keyed child changes', () => {
    const { rerender } = renderWithProviders(
      <CrossfadeView viewKey="a">
        <Text>Panel A</Text>
      </CrossfadeView>,
    )
    expect(screen.getByText('Panel A')).toBeInTheDocument()
    rerender(
      <CrossfadeView viewKey="b">
        <Text>Panel B</Text>
      </CrossfadeView>,
    )
    expect(screen.getByText('Panel B')).toBeInTheDocument()
    expect(screen.queryByText('Panel A')).not.toBeInTheDocument()
  })
})
