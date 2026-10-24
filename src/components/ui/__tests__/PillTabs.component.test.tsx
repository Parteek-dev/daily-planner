import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import PillTabs from '@/src/components/ui/PillTabs'

const tabs = [
  { id: 'all', label: 'All', count: 5 },
  { id: 'open', label: 'Open', count: 3 },
  { id: 'done', label: 'Done' },
]

describe('PillTabs', () => {
  it('renders tab labels and counts', () => {
    renderWithProviders(<PillTabs tabs={tabs} activeId="all" onChange={() => {}} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calls onChange with the pressed tab id', () => {
    const onChange = vi.fn()
    renderWithProviders(<PillTabs tabs={tabs} activeId="all" onChange={onChange} />)
    fireEvent.click(screen.getByText('Open'))
    expect(onChange).toHaveBeenCalledWith('open')
  })
})
