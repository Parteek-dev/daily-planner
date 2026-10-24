import React from 'react'
import { describe, it, expect } from 'vitest'
import { Bell } from 'lucide-react-native'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import IconBadge from '@/src/components/ui/IconBadge'

describe('IconBadge', () => {
  it('renders the icon inside the badge', () => {
    renderWithProviders(<IconBadge icon={Bell} />)
    expect(screen.getByTestId('icon-Bell')).toBeInTheDocument()
  })
})
