import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import VoiceInput from '@/src/components/VoiceInput'

describe('VoiceInput', () => {
  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <VoiceInput isOpen={false} onClose={() => { }} onResult={() => { }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the unsupported fallback input when SpeechRecognition is absent (jsdom)', () => {
    renderWithProviders(<VoiceInput isOpen onClose={() => { }} onResult={() => { }} />)
    expect(screen.getByText('Voice Input')).toBeInTheDocument()
    expect(screen.getByLabelText('Task description input')).toBeInTheDocument()
  })

  it('parses a typed command and confirms it through onResult', () => {
    const onResult = vi.fn()
    renderWithProviders(<VoiceInput isOpen onClose={() => { }} onResult={onResult} />)
    const input = screen.getByLabelText('Task description input')
    fireEvent.change(input, { target: { value: 'Study React for 45 minutes tomorrow' } })
    // Done parses the transcript and advances to the preview stage.
    fireEvent.click(screen.getByRole('button', { name: 'Parse this task' }))
    expect(screen.getByText("Here's what I heard")).toBeInTheDocument()
    expect(screen.getByText('Study React')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult.mock.calls[0][0]).toMatchObject({
      title: 'Study React',
      duration: 45,
    })
  })

  it('fills the input from a tapped example', () => {
    const onResult = vi.fn()
    renderWithProviders(<VoiceInput isOpen onClose={() => { }} onResult={onResult} />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Study React for 45 minutes tomorrow' }),
    )
    // Example immediately parses -> preview stage.
    expect(screen.getByText("Here's what I heard")).toBeInTheDocument()
  })
})
