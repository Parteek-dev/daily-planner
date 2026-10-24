/**
 * Sample fixtures for seeding the firebase mock.
 *
 * Objects use RAW Firestore field names (snake_case) so they can be seeded via
 * `setFirestoreDoc` / `setFirestoreDocs` and converted by the REAL
 * `firestoreMappers`, exercising the genuine mapping path.
 */
import type { SeededDoc } from '../mocks/firebase-control'

/** Raw Firestore task document data (snake_case). */
export interface RawTaskDoc {
  title: string
  description?: string
  topic?: string
  duration?: number
  actual_duration?: number | null
  date?: string
  original_date?: string | null
  due_time?: string | null
  end_time?: string | null
  completed?: boolean
  priority?: 'high' | 'medium' | 'low' | null
  recurrence?: 'none' | 'daily' | 'weekly' | 'weekdays' | 'custom'
  [key: string]: unknown
}

export const sampleTaskDoc: RawTaskDoc = {
  title: 'Write design doc',
  description: 'Draft the component-test design',
  topic: 'Work',
  duration: 60,
  actual_duration: null,
  date: '2025-01-15',
  original_date: null,
  due_time: '09:00',
  end_time: '10:00',
  completed: false,
  priority: 'high',
  recurrence: 'none',
}

export const sampleCompletedTaskDoc: RawTaskDoc = {
  title: 'Morning standup',
  description: '',
  topic: 'Work',
  duration: 15,
  actual_duration: 12,
  date: '2025-01-15',
  due_time: '08:30',
  completed: true,
  priority: 'medium',
  recurrence: 'daily',
}

/** A tasks collection ready to seed via setFirestoreDocs('tasks', sampleTasks). */
export const sampleTasks: SeededDoc[] = [
  { id: 'task-1', data: sampleTaskDoc },
  { id: 'task-2', data: sampleCompletedTaskDoc },
]

/** A topics collection ready to seed via setFirestoreDocs('topics', sampleTopics). */
export const sampleTopics: SeededDoc[] = [
  { id: 'topic-work', data: { name: 'Work', color: '#3B82F6' } },
  { id: 'topic-personal', data: { name: 'Personal', color: '#10B981' } },
]

/** Raw goals/daily document data (snake_case). */
export const sampleGoalsDoc: Record<string, unknown> = {
  daily_task_target: 5,
  extra_goals: [{ id: 'g1', type: 'min_tasks', value: 3 }],
}

// ── Mapped Task objects (camelCase) for prop-driven component tests ─────────

import type { Task } from '@/src/lib/firestoreMappers'

/** Builds a fully-populated mapped `Task`, overridable per test. */
export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write design doc',
    description: '',
    topic: 'Work',
    duration: 60,
    actualDuration: null,
    date: '2025-01-15',
    originalDate: null,
    dueTime: '09:00',
    completed: false,
    completedAt: null,
    createdAt: '2025-01-15T08:00:00.000Z',
    note: '',
    priority: 'high',
    dependsOn: [],
    subtasks: [],
    recurrence: 'none',
    recurrenceEndDate: null,
    recurrenceParentId: null,
    customRecurrenceDays: null,
    ...overrides,
  }
}
