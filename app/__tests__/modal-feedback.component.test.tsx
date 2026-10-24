import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders'
import { setAuthUser } from '@/test/mocks/firebase-control'
import { firestoreSpies } from '@/test/mocks/firebase'
import FeedbackScreen from '@/app/(modals)/feedback'

describe('app/(modals)/feedback', () => {
  beforeEach(() => {
    setAuthUser({ uid: 'u1', email: 'a@b.com', emailVerified: true })
  })

  it('renders the feedback form', () => {
    renderWithProviders(<FeedbackScreen />)
    expect(screen.getByText('Share your feedback')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toBeInTheDocument()
  })

  it('validates an empty message', () => {
    renderWithProviders(<FeedbackScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    expect(screen.getByText('Please enter a message.')).toBeInTheDocument()
    expect(firestoreSpies.addDoc).not.toHaveBeenCalled()
  })

  it('submits feedback through addDoc and shows success', async () => {
    renderWithProviders(<FeedbackScreen />)
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Great app, thanks!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    await waitFor(() => expect(firestoreSpies.addDoc).toHaveBeenCalled())
    expect(firestoreSpies.serverTimestamp).toHaveBeenCalled()
    expect(await screen.findByText('Thank you! 🎉')).toBeInTheDocument()
  })
})
