import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import ProductivityScore from '@/src/components/planner/ProductivityScore'

const breakdown = { streakScore: 30, completionScore: 25, goalScore: 20 }

describe('ProductivityScore', () => {
  it('renders the score, level badge and breakdown values', () => {
    renderWithProviders(
      <ProductivityScore
        score={75}
        breakdown={breakdown}
        level="On Fire"
        levelColor="#10B981"
      />,
    )
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('On Fire')).toBeInTheDocument()
    expect(screen.getByText('30/40')).toBeInTheDocument()
    expect(screen.getByText('25/30')).toBeInTheDocument()
    expect(screen.getByText('20/30')).toBeInTheDocument()
  })

  it('renders a different level label/score for a low score', () => {
    renderWithProviders(
      <ProductivityScore
        score={20}
        breakdown={{ streakScore: 5, completionScore: 10, goalScore: 5 }}
        level="Getting Started"
        levelColor="#F59E0B"
      />,
    )
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('Getting Started')).toBeInTheDocument()
  })
})
