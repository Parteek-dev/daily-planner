import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import { setAuthUser } from '@/test/mocks/firebase-control'
import { getRouter } from '@/test/mocks/expo-router-control'
import SettingsScreen from '@/app/(modals)/settings'

// jsdom reports width 0 -> the settings host renders its mobile drill-down:
// a tab list that navigates into each tab's content.
describe('app/(modals)/settings', () => {
  beforeEach(() => {
    setAuthUser({ uid: 'u1', email: 'a@b.com', emailVerified: true })
  })

  it('lists the settings tabs', () => {
    renderWithProviders(<SettingsScreen />, { withContexts: true })
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Accessibility')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('drills into the Appearance tab content', () => {
    renderWithProviders(<SettingsScreen />, { withContexts: true })
    fireEvent.click(screen.getByText('Appearance'))
    expect(screen.getByText('Theme Mode')).toBeInTheDocument()
  })

  it('closes from the list via the back control (router falls back to replace)', () => {
    renderWithProviders(<SettingsScreen />, { withContexts: true })
    fireEvent.click(screen.getByLabelText('Close settings'))
    // Router mock lacks dismiss/canGoBack -> handleClose falls back to replace.
    expect(getRouter().replace).toHaveBeenCalled()
  })
})
