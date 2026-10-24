import React from 'react'
import { Text } from 'react-native'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import SegmentedToggle from '@/src/components/SegmentedToggle'

const options = [
  { value: 'month', label: 'Month', icon: () => <Text>M</Text> },
  { value: 'week', label: 'Week', icon: () => <Text>W</Text> },
]

describe('SegmentedToggle', () => {
  it('shows the label only for the active segment', () => {
    renderWithProviders(
      <SegmentedToggle options={options} value="month" onChange={() => {}} />,
    )
    expect(screen.getByText('Month')).toBeInTheDocument()
    // Inactive segment hides its label.
    expect(screen.queryByText('Week')).not.toBeInTheDocument()
  })

  it('calls onChange with the pressed segment value', () => {
    const onChange = vi.fn()
    renderWithProviders(
      <SegmentedToggle options={options} value="month" onChange={onChange} />,
    )
    // The week segment is addressable by its accessibilityLabel.
    fireEvent.click(screen.getByLabelText('Week'))
    expect(onChange).toHaveBeenCalledWith('week')
  })
})
