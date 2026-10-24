import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import SearchFilter from '@/src/components/SearchFilter'

const topics = [
  { name: 'Work', color: '#3B82F6' },
  { name: 'Personal', color: '#10B981' },
]

describe('SearchFilter', () => {
  it('emits query text as the user types', () => {
    const onChange = vi.fn()
    renderWithProviders(<SearchFilter value="" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Search tasks'), {
      target: { value: 'report' },
    })
    expect(onChange).toHaveBeenCalledWith('report')
  })

  it('reveals the filter panel and toggles status filters', () => {
    const onStatusChange = vi.fn()
    renderWithProviders(
      <SearchFilter
        value=""
        onChange={() => {}}
        statusFilter="all"
        onStatusChange={onStatusChange}
      />,
    )
    fireEvent.click(screen.getByLabelText('Toggle filters'))
    // Status radios appear inside the panel.
    fireEvent.click(screen.getByText('completed'))
    expect(onStatusChange).toHaveBeenCalledWith('completed')
  })

  it('emits the selected topic from a topic chip', () => {
    const onTopicChange = vi.fn()
    renderWithProviders(
      <SearchFilter
        value=""
        onChange={() => {}}
        topics={topics}
        onTopicChange={onTopicChange}
      />,
    )
    fireEvent.click(screen.getByLabelText('Toggle filters'))
    fireEvent.click(screen.getByText('Work'))
    expect(onTopicChange).toHaveBeenCalledWith('Work')
  })
})
