import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders'
import GoalSetting from '@/src/components/planner/GoalSetting'

const progress = { target: 5, completed: 2, percent: 40, achieved: false }

function setup(props: Record<string, unknown> = {}) {
  const onSetGoal = vi.fn()
  const onAddExtraGoal = vi.fn()
  const onRemoveExtraGoal = vi.fn()
  renderWithProviders(
    <GoalSetting
      dailyGoal={5}
      onSetGoal={onSetGoal}
      progress={progress}
      onAddExtraGoal={onAddExtraGoal}
      onRemoveExtraGoal={onRemoveExtraGoal}
      {...props}
    />,
  )
  return { onSetGoal, onAddExtraGoal, onRemoveExtraGoal }
}

describe('GoalSetting', () => {
  it('renders the daily goal progress', () => {
    setup()
    expect(screen.getByText('Daily tasks')).toBeInTheDocument()
    expect(screen.getByText('2 of 5')).toBeInTheDocument()
  })

  it('edits and saves a new daily goal', () => {
    const { onSetGoal } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Edit goals' }))
    // Edit mode shows the stepper seeded with the current target (5).
    expect(screen.getByText('Tasks to complete daily:')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Save'))
    expect(onSetGoal).toHaveBeenCalledWith(5)
  })

  it('opens the add-goal form and validates a duplicate', () => {
    const existing = [
      {
        id: 'g1',
        type: 'min_tasks' as const,
        value: 3,
        current: 1,
        target: 3,
        percent: 33,
        achieved: false,
      },
    ]
    const { onAddExtraGoal } = setup({ extraGoalsProgress: existing })
    fireEvent.click(screen.getByRole('button', { name: 'Add goal' }))
    // Default new goal type is min_tasks with no topic -> duplicates the existing one.
    fireEvent.click(screen.getByText('Add goal'))
    expect(
      screen.getByText(/A goal of this type.*already exists/),
    ).toBeInTheDocument()
    expect(onAddExtraGoal).not.toHaveBeenCalled()
  })
})
