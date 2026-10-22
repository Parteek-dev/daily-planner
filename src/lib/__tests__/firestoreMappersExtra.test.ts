/**
 * Coverage for the Firestore mappers not exercised by firestoreMappers.test.ts
 * (which covers only the Task round-trip).
 *
 * Covers Topic / Note / Goals / Template round-trips, empty-snapshot defaults,
 * docToNote date fallback, docToTask defaults, and tsToIso handling (exercised
 * indirectly through timestamp fields) for Timestamp / Date / ISO-string / null.
 */

import { describe, it, expect } from 'vitest'
import type { DocumentData, DocumentSnapshot } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import {
  docToTask,
  docToTopic,
  topicToDoc,
  docToNote,
  noteToDoc,
  docToGoals,
  goalsToDoc,
  docToTemplate,
  templateToDoc,
  type Topic,
  type Note,
  type Goals,
  type Template,
} from '../firestoreMappers'

/**
 * Minimal DocumentSnapshot-shaped object — the docTo* functions only read
 * `.data()` and `.id`. Mirrors the helper in firestoreMappers.test.ts.
 */
function makeSnap(id: string, data: DocumentData): DocumentSnapshot {
  return {
    id,
    data: () => data,
  } as unknown as DocumentSnapshot
}

/** A snapshot whose `.data()` returns undefined — the empty-document case. */
function emptySnap(id: string): DocumentSnapshot {
  return {
    id,
    data: () => undefined,
  } as unknown as DocumentSnapshot
}

// ─── Topic round-trip ──────────────────────────────────────────────────────────

describe('docToTopic / topicToDoc', () => {
  it('round-trips every Topic field', () => {
    const topic: Topic = { id: 'work', name: 'Work', color: '#112233' }
    const restored = docToTopic(makeSnap(topic.id, topicToDoc(topic, 'uid') as DocumentData))
    expect(restored).toEqual(topic)
  })

  it('defaults color to #64748b on an empty snapshot', () => {
    const restored = docToTopic(emptySnap('misc'))
    expect(restored.color).toBe('#64748b')
    expect(restored.name).toBe('')
    expect(restored.id).toBe('misc')
  })
})

// ─── Note round-trip ───────────────────────────────────────────────────────────

describe('docToNote / noteToDoc', () => {
  it('round-trips every Note field at second precision', () => {
    const note: Note = {
      id: '2025-01-15',
      date: '2025-01-15',
      content: 'Standup notes',
      createdAt: '2025-01-15T09:00:00.000Z',
      updatedAt: '2025-01-15T17:30:00.000Z',
    }
    const restored = docToNote(makeSnap(note.id, noteToDoc(note, 'uid') as DocumentData))
    expect(restored.id).toBe(note.id)
    expect(restored.date).toBe(note.date)
    expect(restored.content).toBe(note.content)
    expect(restored.createdAt.slice(0, 19)).toBe(note.createdAt.slice(0, 19))
    expect(restored.updatedAt.slice(0, 19)).toBe(note.updatedAt.slice(0, 19))
  })

  it('falls back date to the snapshot id when the date field is absent', () => {
    const restored = docToNote(makeSnap('2025-02-01', { content: 'x' }))
    expect(restored.date).toBe('2025-02-01')
  })
})

// ─── Goals round-trip ──────────────────────────────────────────────────────────

describe('docToGoals / goalsToDoc', () => {
  it('round-trips every Goals field', () => {
    const goals: Goals = {
      primaryGoal: 5,
      extraGoals: [{ id: 'g1', type: 'min_tasks', value: 2 }],
      updatedAt: '2025-03-10T12:00:00.000Z',
    }
    const restored = docToGoals(makeSnap('daily', goalsToDoc(goals, 'uid') as DocumentData))
    expect(restored.primaryGoal).toBe(goals.primaryGoal)
    expect(restored.extraGoals).toEqual(goals.extraGoals)
    expect(restored.updatedAt.slice(0, 19)).toBe(goals.updatedAt.slice(0, 19))
  })

  it('defaults primaryGoal to 3 and extraGoals to [] on an empty snapshot', () => {
    const restored = docToGoals(emptySnap('daily'))
    expect(restored.primaryGoal).toBe(3)
    expect(restored.extraGoals).toEqual([])
  })
})

// ─── Template round-trip ───────────────────────────────────────────────────────

describe('docToTemplate / templateToDoc', () => {
  it('round-trips every Template field', () => {
    const template: Template = {
      id: 't1',
      name: 'Morning routine',
      title: 'Exercise',
      description: '30 min run',
      duration: 45,
      topic: 'Health',
      priority: 'high',
      subtasks: [{ id: 's1', title: 'Warm up', completed: false }],
      recurrence: 'weekdays',
      customRecurrenceDays: [1, 2, 3, 4, 5],
    }
    const restored = docToTemplate(
      makeSnap(template.id, templateToDoc(template, 'uid') as DocumentData),
    )
    expect(restored).toEqual(template)
  })

  it('applies defaults on an empty snapshot', () => {
    const restored = docToTemplate(emptySnap('t0'))
    expect(restored.duration).toBe(30)
    expect(restored.topic).toBe('Personal')
    expect(restored.priority).toBeNull()
    expect(restored.recurrence).toBe('none')
  })
})

// ─── docToTask defaults ──────────────────────────────────────────────────────────

describe('docToTask on an empty snapshot', () => {
  it('yields documented defaults with a valid ISO createdAt', () => {
    const restored = docToTask(emptySnap('task-0'))
    expect(restored.id).toBe('task-0')
    expect(restored.title).toBe('')
    expect(restored.topic).toBe('Personal')
    expect(restored.duration).toBe(30)
    expect(restored.completedAt).toBeNull()
    // createdAt falls back to new Date().toISOString() — must be a valid ISO string.
    expect(Number.isNaN(Date.parse(restored.createdAt))).toBe(false)
  })
})

// ─── tsToIso handling (exercised indirectly) ─────────────────────────────────────

describe('tsToIso handling through timestamp fields', () => {
  const iso = '2025-04-01T08:15:00.000Z'

  it('converts a firebase Timestamp to an ISO string', () => {
    const snap = makeSnap('task-ts', {
      completed_at: Timestamp.fromDate(new Date(iso)),
    })
    expect(docToTask(snap).completedAt!.slice(0, 19)).toBe(iso.slice(0, 19))
  })

  it('converts a plain Date to an ISO string', () => {
    const snap = makeSnap('task-date', { completed_at: new Date(iso) })
    expect(docToTask(snap).completedAt!.slice(0, 19)).toBe(iso.slice(0, 19))
  })

  it('passes an ISO string through unchanged', () => {
    const snap = makeSnap('task-iso', { completed_at: iso })
    expect(docToTask(snap).completedAt).toBe(iso)
  })

  it('maps a null completed_at to null', () => {
    const snap = makeSnap('task-null', { completed_at: null })
    expect(docToTask(snap).completedAt).toBeNull()
  })
})
