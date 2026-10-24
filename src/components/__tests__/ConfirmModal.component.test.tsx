import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import ConfirmModal from '@/src/components/ConfirmModal'

function setup(props: Record<string, unknown> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  renderWithProviders(
    <ConfirmModal
      visible
      title="Delete task?"
      message="This cannot be undone."
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  )
  return { onConfirm, onCancel }
}

describe('ConfirmModal', () => {
  it('renders the title and message when visible', () => {
    setup()
    expect(screen.getByText('Delete task?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('renders nothing when hidden', () => {
    const { container } = renderWithProviders(
      <ConfirmModal
        visible={false}
        title="Hidden"
        message="nope"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('fires confirm and cancel callbacks', () => {
    const { onConfirm, onCancel } = setup({
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
