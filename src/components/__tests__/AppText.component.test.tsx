import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import AppText, { TitleText, CaptionText } from '@/src/components/AppText'

describe('AppText', () => {
  it('renders body text with the default role font size', () => {
    renderWithProviders(<AppText>Hello body</AppText>)
    const el = screen.getByText('Hello body')
    // body role -> 15px (see tokens typography scale)
    expect(el.style.fontSize).toBe('15px')
  })

  it('applies a larger font size for the display role', () => {
    renderWithProviders(<AppText role="display">Big</AppText>)
    expect(screen.getByText('Big').style.fontSize).toBe('32px')
  })

  it('honours a color override', () => {
    renderWithProviders(<AppText color="rgb(255, 0, 0)">Red</AppText>)
    expect(screen.getByText('Red').style.color).toBe('rgb(255, 0, 0)')
  })

  it('exposes convenience role components', () => {
    renderWithProviders(
      <>
        <TitleText>A title</TitleText>
        <CaptionText>A caption</CaptionText>
      </>,
    )
    // title -> 24px, caption -> 13px
    expect(screen.getByText('A title').style.fontSize).toBe('24px')
    expect(screen.getByText('A caption').style.fontSize).toBe('13px')
  })
})
