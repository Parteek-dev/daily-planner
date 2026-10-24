import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/renderWithProviders'
import StatusBadge from '@/src/components/ui/StatusBadge'

describe('StatusBadge', () => {
  it('renders the default label for each status', () => {
    const cases: Array<[Parameters<typeof StatusBadge>[0]['status'], string]> = [
      ['todo', 'To Do'],
      ['inProgress', 'In Progress'],
      ['completed', 'Completed'],
      ['overdue', 'Overdue'],
    ]
    for (const [status, label] of cases) {
      const { unmount } = renderWithProviders(<StatusBadge status={status} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })

  it('renders a custom label when provided', () => {
    renderWithProviders(<StatusBadge status="todo" label="Pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.queryByText('To Do')).not.toBeInTheDocument()
  })
})
