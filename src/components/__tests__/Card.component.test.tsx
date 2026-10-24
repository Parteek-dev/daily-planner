import React from 'react'
import { Text } from 'react-native'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import Card from '@/src/components/Card'

describe('Card', () => {
  it('renders children (default variant)', () => {
    renderWithProviders(<Card><Text>Inside</Text></Card>)
    expect(screen.getByText('Inside')).toBeInTheDocument()
  })

  it('renders children for the gradient variant', () => {
    renderWithProviders(<Card variant="gradient"><Text>Grad</Text></Card>)
    expect(screen.getByText('Grad')).toBeInTheDocument()
  })

  it('renders children for the glass variant', () => {
    renderWithProviders(<Card variant="glass"><Text>Glass</Text></Card>)
    expect(screen.getByText('Glass')).toBeInTheDocument()
  })
})
