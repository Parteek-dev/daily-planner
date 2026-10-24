import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders'
import { getRouter } from '@/test/mocks/expo-router-control'
import { setAuthUser } from '@/test/mocks/firebase-control'
import { authSpies } from '@/test/mocks/firebase'
import ProfileScreen from '@/app/(modals)/profile'

describe('app/(modals)/profile', () => {
  beforeEach(() => {
    setAuthUser({
      uid: 'u1',
      email: 'ada@example.com',
      displayName: 'Ada Lovelace',
      emailVerified: true,
      isAnonymous: false,
    })
  })

  // NOTE: the screen derives the display name from the email local-part.
  it('renders the profile with the derived name and email', () => {
    renderWithProviders(<ProfileScreen />)
    expect(screen.getByText('ada')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  })

  it('navigates to settings from the profile menu', () => {
    renderWithProviders(<ProfileScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(getRouter().push).toHaveBeenCalled()
  })

  it('signs out via the sign-out action', async () => {
    renderWithProviders(<ProfileScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(authSpies.signOut).toHaveBeenCalled())
  })

  it('closes via the close control', () => {
    renderWithProviders(<ProfileScreen />)
    fireEvent.click(screen.getByLabelText('Close profile'))
    // Router mock has no dismiss/canGoBack -> handleClose falls back to replace.
    expect(getRouter().replace).toHaveBeenCalled()
  })
})
