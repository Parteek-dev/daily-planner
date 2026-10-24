import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent, act } from '@/test/renderWithProviders'
import { getRouter } from '@/test/mocks/expo-router-control'
import ProfileMenu from '@/src/components/ProfileMenu'

const user = {
  uid: 'u1',
  email: 'ada@example.com',
  displayName: 'Ada Lovelace',
  isAnonymous: false,
} as any

describe('ProfileMenu', () => {
  it('renders the avatar with initials', () => {
    renderWithProviders(<ProfileMenu user={user} onSignOut={() => {}} />)
    // Ada Lovelace -> AL
    expect(screen.getByText('AL')).toBeInTheDocument()
  })

  it('opens the menu and shows user info', () => {
    renderWithProviders(<ProfileMenu user={user} onSignOut={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }))
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  })

  it('invokes onSignOut from the menu', () => {
    vi.useFakeTimers()
    const onSignOut = vi.fn()
    renderWithProviders(<ProfileMenu user={user} onSignOut={onSignOut} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(onSignOut).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('navigates to settings from the menu', () => {
    vi.useFakeTimers()
    renderWithProviders(<ProfileMenu user={user} onSignOut={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }))
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(getRouter().push).toHaveBeenCalledWith('/(modals)/settings')
    vi.useRealTimers()
  })
})
