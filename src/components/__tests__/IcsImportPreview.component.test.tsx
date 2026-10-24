import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import IcsImportPreview from '@/src/components/IcsImportPreview'

const parseResult = {
  tasks: [
    { title: 'Dentist', date: '2025-01-15', dueTime: '09:00', _uid: 'e1' },
    { title: 'Team sync', date: '2025-01-16', _uid: 'e2' },
  ],
}
const topics = [{ name: 'Personal', color: '#10B981' }]

function setup(props: Record<string, unknown> = {}) {
  const onConfirm = vi.fn()
  const onClose = vi.fn()
  renderWithProviders(
    <IcsImportPreview
      isOpen
      onClose={onClose}
      parseResult={parseResult}
      topics={topics}
      onConfirm={onConfirm}
      {...props}
    />,
  )
  return { onConfirm, onClose }
}

describe('IcsImportPreview', () => {
  it('renders nothing when closed or without a parse result', () => {
    const { container } = renderWithProviders(
      <IcsImportPreview
        isOpen={false}
        onClose={() => {}}
        parseResult={parseResult}
        topics={topics}
        onConfirm={() => {}}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lists the parsed events and an accurate summary', () => {
    setup()
    expect(screen.getByText('Dentist')).toBeInTheDocument()
    expect(screen.getByText('Team sync')).toBeInTheDocument()
    expect(screen.getByText('2 of 2 selected')).toBeInTheDocument()
  })

  it('imports the selected events', () => {
    const { onConfirm } = setup()
    fireEvent.click(screen.getByRole('button', { name: /Import 2 events/ }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm.mock.calls[0][0]).toHaveLength(2)
  })

  it('deselecting an event narrows the import set', () => {
    const { onConfirm } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Dentist' }))
    expect(screen.getByText('1 of 2 selected')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Import 1 event/ }))
    expect(onConfirm.mock.calls[0][0]).toHaveLength(1)
  })
})
