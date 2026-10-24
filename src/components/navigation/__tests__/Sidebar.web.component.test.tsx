import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import Sidebar from '@/src/components/navigation/Sidebar.web'

describe('Sidebar.web', () => {
  it('renders the nav items and brand', () => {
    renderWithProviders(<Sidebar activeTab="index" onNavigate={() => { }} />)
    expect(screen.getByText('Daily Planner')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tasks' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analytics' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Calendar' })).toBeInTheDocument()
  })

  it('highlights the active tab (filled background) while inactive tabs stay transparent', () => {
    renderWithProviders(<Sidebar activeTab="analytics" onNavigate={() => { }} />)
    const active = screen.getByRole('button', { name: 'Analytics' })
    const inactive = screen.getByRole('button', { name: 'Home' })
    // The active row gets a solid bgInput fill; inactive rows are transparent
    // (jsdom reports transparent as rgba(0, 0, 0, 0)).
    const transparent = ['', 'transparent', 'rgba(0, 0, 0, 0)']
    expect(transparent).not.toContain(active.style.backgroundColor)
    expect(transparent).toContain(inactive.style.backgroundColor)
  })

  it('calls onNavigate with the pressed route', () => {
    const onNavigate = vi.fn()
    renderWithProviders(<Sidebar activeTab="index" onNavigate={onNavigate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }))
    expect(onNavigate).toHaveBeenCalledWith('calendar')
  })

  it('routes the Search item to the command palette callback, not onNavigate', () => {
    const onNavigate = vi.fn()
    const onOpenCommandPalette = vi.fn()
    renderWithProviders(
      <Sidebar
        activeTab="index"
        onNavigate={onNavigate}
        onOpenCommandPalette={onOpenCommandPalette}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(onOpenCommandPalette).toHaveBeenCalledTimes(1)
    expect(onNavigate).not.toHaveBeenCalledWith('search')
  })

  it('collapses when the collapse control is pressed', () => {
    renderWithProviders(<Sidebar activeTab="index" onNavigate={() => { }} />)
    // Starts expanded -> the control offers to collapse.
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    // After collapsing, the control flips to offer expansion.
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
  })
})
