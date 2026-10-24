import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import NotificationSettings from '@/src/components/NotificationSettings'

function setup(props: Record<string, unknown> = {}) {
  const onToggle = vi.fn()
  const onUpdateMinutes = vi.fn()
  renderWithProviders(
    <NotificationSettings
      isSupported
      permission="granted"
      enabled
      reminderMinutes={10}
      onToggle={onToggle}
      onUpdateMinutes={onUpdateMinutes}
      {...props}
    />,
  )
  return { onToggle, onUpdateMinutes }
}

describe('NotificationSettings', () => {
  it('renders the reminder label and active state when enabled', () => {
    setup()
    expect(screen.getByText('Task Reminders')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('invokes onToggle from the toggle button', () => {
    const { onToggle } = setup({ enabled: false, permission: 'granted' })
    fireEvent.click(screen.getByRole('button', { name: 'Turn on notifications' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('reflects a blocked permission state', () => {
    setup({ permission: 'denied', enabled: false })
    expect(screen.getByText('Blocked')).toBeInTheDocument()
  })

  it('updates the reminder lead time via the web select', () => {
    const { onUpdateMinutes } = setup()
    const select = document.querySelector('select') as HTMLSelectElement
    expect(select).toBeTruthy()
    fireEvent.change(select, { target: { value: '30' } })
    expect(onUpdateMinutes).toHaveBeenCalledWith(30)
  })
})
