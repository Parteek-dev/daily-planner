/**
 * Property-based tests for Firestore mapping round-trip.
 *
 * Property 4: Firestore mapping round-trip — for any valid Task object,
 * docToTask(taskToDoc(task, uid)) produces a task where every field equals
 * the original.
 *
 * Validates: Requirements 23.2, 23.3
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { DocumentData, DocumentSnapshot } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { docToTask, taskToDoc, type Task, type Subtask } from '../firestoreMappers'

// ─── Mock DocumentSnapshot ────────────────────────────────────────────────────

/**
 * Creates a minimal DocumentSnapshot-shaped object from a plain data record.
 * `docToTask` only calls `.data()` and reads `snap.id`, so we need nothing else.
 */
function makeSnap(id: string, data: DocumentData): DocumentSnapshot {
  return {
    id,
    data: () => data,
    // The rest of the DocumentSnapshot API is unused by docToTask
  } as unknown as DocumentSnapshot
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const subtaskArb: fc.Arbitrary<Subtask> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  completed: fc.boolean(),
})

// Use integer-based date generation to stay shrink-safe in fast-check v4.
const DATE_BASE_MS = new Date('2020-01-01').getTime()
const DATE_TOP_DAYS = Math.floor(
  (new Date('2030-12-31').getTime() - DATE_BASE_MS) / 86_400_000,
)

/** Generates a date string in YYYY-MM-DD format. */
const dateStrArb = fc
  .integer({ min: 0, max: DATE_TOP_DAYS })
  .map((n) => new Date(DATE_BASE_MS + n * 86_400_000).toISOString().slice(0, 10))

/** Generates an HH:MM time string. */
const timeStrArb = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)

/** Generates an ISO 8601 timestamp string. */
const isoStrArb = fc
  .integer({ min: 0, max: DATE_TOP_DAYS })
  .map((n) => new Date(DATE_BASE_MS + n * 86_400_000).toISOString())

const priorityArb = fc.option(
  fc.constantFrom('high' as const, 'medium' as const, 'low' as const),
  { nil: null },
)

const recurrenceArb = fc.constantFrom(
  'none' as const,
  'daily' as const,
  'weekly' as const,
  'weekdays' as const,
  'custom' as const,
)

const taskArb: fc.Arbitrary<Task> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 30 }),
  title: fc.string({ minLength: 1, maxLength: 120 }),
  description: fc.string({ maxLength: 500 }),
  topic: fc.string({ minLength: 1, maxLength: 50 }),
  duration: fc.integer({ min: 1, max: 480 }),
  actualDuration: fc.option(fc.integer({ min: 1, max: 1440 }), { nil: null }),
  date: dateStrArb,
  originalDate: fc.option(dateStrArb, { nil: null }),
  dueTime: fc.option(timeStrArb, { nil: null }),
  endTime: fc.option(timeStrArb, { nil: null }),
  completed: fc.boolean(),
  completedAt: fc.option(isoStrArb, { nil: null }),
  createdAt: isoStrArb,
  note: fc.string({ maxLength: 2000 }),
  priority: priorityArb,
  dependsOn: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
  subtasks: fc.array(subtaskArb, { maxLength: 20 }),
  recurrence: recurrenceArb,
  recurrenceEndDate: fc.option(dateStrArb, { nil: null }),
  recurrenceParentId: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
  customRecurrenceDays: fc.option(
    fc.uniqueArray(fc.integer({ min: 0, max: 6 }), { maxLength: 7 }),
    { nil: null },
  ),
})

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Simulates the Firestore round-trip in memory:
 *   task → taskToDoc → plain object (with Timestamps) → snap → docToTask → task′
 *
 * We convert Timestamps back to their ISO string form here so docToTask sees
 * the same structure it would get from a real Firestore SDK snapshot.
 */
function roundTrip(task: Task): Task {
  const uid = 'test-user'
  const doc = taskToDoc(task, uid) as Record<string, unknown>

  // Build the snake_case data object that docToTask expects.
  // Timestamps are left as-is — docToTask handles them via tsToIso internally.
  const snap = makeSnap(task.id, doc as DocumentData)
  return docToTask(snap)
}

// ─── Property 4: Firestore mapping round-trip ─────────────────────────────────
// Validates: Requirements 23.2, 23.3

describe('Property 4: Firestore mapping round-trip', () => {
  it('docToTask(taskToDoc(task, uid)) reproduces every Task field for any valid task', () => {
    fc.assert(
      fc.property(taskArb, (task) => {
        const restored = roundTrip(task)

        // Identity fields
        expect(restored.id).toBe(task.id)
        expect(restored.title).toBe(task.title)
        expect(restored.description).toBe(task.description)
        expect(restored.topic).toBe(task.topic)
        expect(restored.duration).toBe(task.duration)
        expect(restored.actualDuration).toBe(task.actualDuration)
        expect(restored.date).toBe(task.date)
        expect(restored.originalDate).toBe(task.originalDate)
        expect(restored.dueTime).toBe(task.dueTime)
        expect(restored.endTime).toBe(task.endTime)
        expect(restored.completed).toBe(task.completed)
        expect(restored.note).toBe(task.note)
        expect(restored.priority).toBe(task.priority)
        expect(restored.recurrence).toBe(task.recurrence)
        expect(restored.recurrenceEndDate).toBe(task.recurrenceEndDate)
        expect(restored.recurrenceParentId).toBe(task.recurrenceParentId)

        // Arrays / objects — deep equal
        expect(restored.dependsOn).toEqual(task.dependsOn)
        expect(restored.subtasks).toEqual(task.subtasks)
        expect(restored.customRecurrenceDays).toEqual(task.customRecurrenceDays)

        // Timestamp fields — ISO strings must match at second precision
        // (Firestore Timestamps have microsecond resolution; we trim to ms)
        if (task.completedAt) {
          expect(restored.completedAt).not.toBeNull()
          // Compare only the first 19 chars (up to seconds) to avoid sub-ms drift
          expect(restored.completedAt!.slice(0, 19)).toBe(task.completedAt.slice(0, 19))
        } else {
          expect(restored.completedAt).toBeNull()
        }

        if (task.createdAt) {
          expect(restored.createdAt.slice(0, 19)).toBe(task.createdAt.slice(0, 19))
        }
      }),
      { numRuns: 150 },
    )
  })
})
