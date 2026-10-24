import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import ProgressBar from '@/src/components/ui/ProgressBar'

/** Reads the inline percentage width of the fill element (the only `%` width in the tree). */
function fillWidth(container: HTMLElement): string | undefined {
  const withWidth = Array.from(container.querySelectorAll<HTMLElement>('*')).find(
    (el) => /^\d+%$/.test(el.style.width),
  )
  return withWidth?.style.width
}

describe('ProgressBar', () => {
  it('represents the value as a percentage width', () => {
    const { container } = renderWithProviders(<ProgressBar progress={50} />)
    expect(fillWidth(container)).toBe('50%')
  })

  it('clamps values below 0 to 0%', () => {
    const { container } = renderWithProviders(<ProgressBar progress={-20} />)
    expect(fillWidth(container)).toBe('0%')
  })

  it('clamps values above 100 to 100%', () => {
    const { container } = renderWithProviders(<ProgressBar progress={150} />)
    expect(fillWidth(container)).toBe('100%')
  })

  it('shows a rounded percentage label when showLabel is set', () => {
    renderWithProviders(<ProgressBar progress={42.6} showLabel />)
    expect(screen.getByText('43%')).toBeInTheDocument()
  })
})
