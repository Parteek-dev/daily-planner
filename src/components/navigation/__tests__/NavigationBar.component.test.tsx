import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import { getRouter } from '@/test/mocks/expo-router-control'
import NavigationBar from '@/src/components/navigation/NavigationBar'

const ROUTES = ['index', 'today', 'analytics', 'calendar']

/** Builds the minimal tab-bar props NavigationBar reads. */
function makeProps(activeIndex = 0, navigate = vi.fn(), emit = vi.fn(() => ({ defaultPrevented: false }))) {
  const state = {
    index: activeIndex,
    routes: ROUTES.map((name, i) => ({ key: `${name}-${i}`, name })),
  }
  const navigation = { navigate, emit }
  // NavigationBar only reads state/navigation/overdueCount; descriptors unused.
  return { state, navigation, descriptors: {}, overdueCount: 0 } as unknown as React.ComponentProps<
    typeof NavigationBar
  >
}

describe('NavigationBar', () => {
  it('renders the tab labels', () => {
    renderWithProviders(<NavigationBar {...makeProps()} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('highlights the active tab with a filled pill background', () => {
    renderWithProviders(<NavigationBar {...makeProps(1)} />)
    const todayTab = screen.getByRole('tab', { name: 'Tasks' })
    const homeTab = screen.getByRole('tab', { name: 'Home' })
    // Active tab gains the accent-tinted pill via an extra RNW style class
    // (r-backgroundColor-*) that inactive tabs do not carry.
    const hasBgClass = (el: HTMLElement) => /r-backgroundColor-/.test(el.className)
    expect(hasBgClass(todayTab)).toBe(true)
    expect(hasBgClass(homeTab)).toBe(false)
  })

  it('navigates to a tab route when an inactive tab is pressed', () => {
    const navigate = vi.fn()
    renderWithProviders(<NavigationBar {...makeProps(0, navigate)} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Calendar' }))
    expect(navigate).toHaveBeenCalledWith('calendar')
  })

  it('pushes the profile modal route when Profile is pressed', () => {
    renderWithProviders(<NavigationBar {...makeProps()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Profile' }))
    expect(getRouter().push).toHaveBeenCalledWith('/(modals)/profile')
  })

  it('renders the overdue badge on the Today tab when overdueCount > 0', () => {
    const props = makeProps()
    renderWithProviders(<NavigationBar {...props} overdueCount={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByLabelText('3 overdue tasks')).toBeInTheDocument()
  })
})
