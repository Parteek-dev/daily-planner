import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders'
import { setAuthUser } from '@/test/mocks/firebase-control'
import { authSpies } from '@/test/mocks/firebase'
import AuthScreen from '@/app/auth'

describe('app/auth', () => {
  beforeEach(() => {
    // createUserWithEmailAndPassword resolves { user } from the control user.
    setAuthUser({ uid: 'u1', email: 'new@user.com', emailVerified: false })
  })

  it('renders the sign-in form by default', () => {
    renderWithProviders(<AuthScreen />)
    expect(screen.getByText('Sign in to access your tasks')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('switches to the sign-up mode', () => {
    renderWithProviders(<AuthScreen />)
    fireEvent.click(screen.getByText('Sign up free'))
    expect(screen.getByText('Create your free account')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
  })

  it('switches to the reset mode', () => {
    renderWithProviders(<AuthScreen />)
    fireEvent.click(screen.getByText('Forgot password?'))
    expect(screen.getByText('Reset your password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument()
  })

  it('signs up and sends the verification email (ties to the original request)', async () => {
    renderWithProviders(<AuthScreen />)
    fireEvent.click(screen.getByText('Sign up free'))
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'New User' } })
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@user.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))
    await waitFor(() =>
      expect(authSpies.createUserWithEmailAndPassword).toHaveBeenCalled(),
    )
    expect(authSpies.sendEmailVerification).toHaveBeenCalled()
    expect(await screen.findByText('Account created! Signing you in…')).toBeInTheDocument()
  })

  it('shows a validation error when the sign-up passwords do not match', async () => {
    renderWithProviders(<AuthScreen />)
    fireEvent.click(screen.getByText('Sign up free'))
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'New User' } })
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@user.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(authSpies.createUserWithEmailAndPassword).not.toHaveBeenCalled()
  })

  it('sends a password reset email', async () => {
    renderWithProviders(<AuthScreen />)
    fireEvent.click(screen.getByText('Forgot password?'))
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'me@user.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }))
    await waitFor(() =>
      expect(authSpies.sendPasswordResetEmail).toHaveBeenCalled(),
    )
    expect(
      await screen.findByText('Password reset email sent! Check your inbox.'),
    ).toBeInTheDocument()
  })
})
