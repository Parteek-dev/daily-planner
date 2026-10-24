import React from 'react'
import { Text } from 'react-native'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import PressableScale from '@/src/components/motion/PressableScale'

describe('PressableScale', () => {
  it('renders its children', () => {
    renderWithProviders(
      <PressableScale>
        <Text>Tap me</Text>
      </PressableScale>,
    )
    expect(screen.getByText('Tap me')).toBeInTheDocument()
  })

  it('fires onPress, onPressIn and onPressOut', () => {
    const onPress = vi.fn()
    const onPressIn = vi.fn()
    const onPressOut = vi.fn()
    renderWithProviders(
      <PressableScale
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Text>Press</Text>
      </PressableScale>,
    )
    // RNW's Pressable responder listens on the pressable element itself.
    const pressable = screen.getByText('Press').parentElement as HTMLElement
    fireEvent.mouseDown(pressable)
    fireEvent.mouseUp(pressable)
    fireEvent.click(pressable)
    expect(onPressIn).toHaveBeenCalled()
    expect(onPressOut).toHaveBeenCalled()
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not fire onPress when disabled', () => {
    const onPress = vi.fn()
    renderWithProviders(
      <PressableScale disabled onPress={onPress}>
        <Text>Nope</Text>
      </PressableScale>,
    )
    fireEvent.click(screen.getByText('Nope'))
    expect(onPress).not.toHaveBeenCalled()
  })
})
