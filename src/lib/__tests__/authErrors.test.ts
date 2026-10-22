import { describe, it, expect } from 'vitest'
import { mapFirebaseError, extractErrorMessage } from '../authErrors'

describe('mapFirebaseError', () => {
  it('maps every known auth/* code to its human-readable message', () => {
    expect(mapFirebaseError('auth/user-not-found')).toBe('No account found with this email address.')
    expect(mapFirebaseError('auth/wrong-password')).toBe('Incorrect password. Please try again.')
    expect(mapFirebaseError('auth/invalid-credential')).toBe('Invalid email or password. Please try again.')
    expect(mapFirebaseError('auth/email-already-in-use')).toBe('An account with this email already exists.')
    expect(mapFirebaseError('auth/network-request-failed')).toBe('Network error. Please check your connection and try again.')
    expect(mapFirebaseError('auth/too-many-requests')).toBe('Too many attempts. Please wait a moment and try again.')
    expect(mapFirebaseError('auth/weak-password')).toBe('Password must be at least 6 characters.')
    expect(mapFirebaseError('auth/invalid-email')).toBe('Please enter a valid email address.')
    expect(mapFirebaseError('auth/credential-already-in-use')).toBe('This email is already linked to another account.')
    expect(mapFirebaseError('auth/operation-not-allowed')).toBe('Email/password sign-up is not enabled. Please contact support.')
    expect(mapFirebaseError('auth/admin-restricted-operation')).toBe('Sign-up is currently restricted. Please contact support.')
  })

  it('falls back to the default message for an unknown code', () => {
    expect(mapFirebaseError('auth/some-unmapped-code')).toBe('An unexpected error occurred. Please try again.')
  })
})

describe('extractErrorMessage', () => {
  it('maps a Firebase-style { code } object through mapFirebaseError', () => {
    expect(extractErrorMessage({ code: 'auth/wrong-password' })).toBe('Incorrect password. Please try again.')
    expect(extractErrorMessage({ code: 'auth/unknown' })).toBe('An unexpected error occurred. Please try again.')
  })

  it('returns the message of an Error instance', () => {
    expect(extractErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('returns the default message for an arbitrary non-error value', () => {
    expect(extractErrorMessage('just a string')).toBe('An unexpected error occurred. Please try again.')
    expect(extractErrorMessage(null)).toBe('An unexpected error occurred. Please try again.')
    expect(extractErrorMessage(42)).toBe('An unexpected error occurred. Please try again.')
  })
})
