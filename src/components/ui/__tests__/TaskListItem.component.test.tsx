import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import TaskListItem from '@/src/components/ui/TaskListItem'

describe('TaskListItem', () => {
  it('renders title, time and status badge', () => {
    renderWithProviders(
      <TaskListItem title="Write tests" time="2h left" status="inProgress" />,
    )
    expect(screen.getByText('Write tests')).toBeInTheDocument()
    expect(screen.getByText('2h left')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('fires onPress when the row is pressed', () => {
    const onPress = vi.fn()
    renderWithProviders(<TaskListItem title="Row" onPress={onPress} />)
    fireEvent.click(screen.getByText('Row'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('fires onToggle when the checkbox is pressed', () => {
    const onToggle = vi.fn()
    renderWithProviders(<TaskListItem title="Toggle me" onToggle={onToggle} />)
    // The unchecked checkbox renders the Circle icon.
    fireEvent.click(screen.getByTestId('icon-Circle'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('shows the completed check icon and hides the status badge when completed', () => {
    renderWithProviders(
      <TaskListItem title="Done task" status="inProgress" completed />,
    )
    expect(screen.getByTestId('icon-Check')).toBeInTheDocument()
    expect(screen.queryByText('In Progress')).not.toBeInTheDocument()
  })
})
