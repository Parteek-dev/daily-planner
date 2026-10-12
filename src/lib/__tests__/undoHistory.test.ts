/**
 * Property-based tests for the undo history depth invariant.
 *
 * Property 6: Undo history depth invariant — for any sequence of at most 50
 * reversible operations (add, update, complete-toggle, delete), applying the
 * same number of undo operations restores the task list to its initial state.
 *
 * The test exercises the pure reducer logic extracted from
 * frontend/src/hooks/useProgress.js (the undo/redo switch statements) without
 * any React hooks, Firestore, or AsyncStorage. It verifies that the state
 * machine is truly reversible.
 *
 * Validates: Requirements 5.6
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ─── Minimal Task type ────────────────────────────────────────────────────────

interface Task {
  id: string
  title: string
  completed: boolean
  completedAt: string | null
}

// ─── Action types ─────────────────────────────────────────────────────────────

type AddAction = { type: 'ADD_TASK'; taskId: string; task: Task }
type UpdateAction = { type: 'UPDATE_TASK'; taskId: string; oldData: Partial<Task>; newData: Partial<Task> }
type CompleteAction = { type: 'COMPLETE_TASK'; taskId: string; wasCompleted: boolean; wasCompletedAt: string | null }
type DeleteAction = { type: 'DELETE_TASK'; task: Task }

type UndoAction = AddAction | UpdateAction | CompleteAction | DeleteAction

// ─── Pure state machine (mirrors useProgress undo/redo switch) ────────────────

const MAX_HISTORY = 50

interface State {
  tasks: Task[]
  undoHistory: UndoAction[]
  redoHistory: UndoAction[]
}

function applyAction(state: State, action: UndoAction): State {
  const { tasks, undoHistory } = state
  let newTasks = tasks

  switch (action.type) {
    case 'ADD_TASK':
      newTasks = [...tasks, action.task]
      break
    case 'UPDATE_TASK':
      newTasks = tasks.map((t) =>
        t.id === action.taskId ? { ...t, ...action.newData } : t,
      )
      break
    case 'COMPLETE_TASK': {
      const now = new Date().toISOString()
      newTasks = tasks.map((t) =>
        t.id === action.taskId
          ? { ...t, completed: !action.wasCompleted, completedAt: action.wasCompleted ? null : now }
          : t,
      )
      break
    }
    case 'DELETE_TASK':
      newTasks = tasks.filter((t) => t.id !== action.task.id)
      break
  }

  // Trim history at MAX_HISTORY (mirrors the useProgress slice(-49) + new action)
  const newHistory: UndoAction[] = [...undoHistory, action].slice(-MAX_HISTORY)

  return {
    tasks: newTasks,
    undoHistory: newHistory,
    redoHistory: [],          // any new action clears the redo stack
  }
}

function applyUndo(state: State): State {
  const { tasks, undoHistory, redoHistory } = state
  if (undoHistory.length === 0) return state

  const action = undoHistory[undoHistory.length - 1]
  let newTasks = tasks

  switch (action.type) {
    case 'ADD_TASK':
      newTasks = tasks.filter((t) => t.id !== action.taskId)
      break
    case 'UPDATE_TASK':
      newTasks = tasks.map((t) =>
        t.id === action.taskId ? { ...t, ...action.oldData } : t,
      )
      break
    case 'COMPLETE_TASK':
      newTasks = tasks.map((t) =>
        t.id === action.taskId
          ? { ...t, completed: action.wasCompleted, completedAt: action.wasCompletedAt }
          : t,
      )
      break
    case 'DELETE_TASK':
      newTasks = [...tasks, action.task]
      break
  }

  return {
    tasks: newTasks,
    undoHistory: undoHistory.slice(0, -1),
    redoHistory: [...redoHistory, action],
  }
}

// ─── Operation builders (for generating reversible operations) ────────────────

type Op =
  | { kind: 'add'; task: Task }
  | { kind: 'update'; taskId: string; newTitle: string }
  | { kind: 'toggle'; taskId: string }
  | { kind: 'delete'; taskId: string }

/**
 * Applies an Op against the current task list and returns an updated state.
 * Ops that reference non-existent task IDs are silently skipped (no action
 * is pushed) to keep the test deterministic.
 */
function applyOp(state: State, op: Op): State {
  const { tasks } = state

  switch (op.kind) {
    case 'add': {
      const action: AddAction = {
        type: 'ADD_TASK',
        taskId: op.task.id,
        task: op.task,
      }
      return applyAction(state, action)
    }
    case 'update': {
      const task = tasks.find((t) => t.id === op.taskId)
      if (!task) return state   // skip — task not in list
      const action: UpdateAction = {
        type: 'UPDATE_TASK',
        taskId: op.taskId,
        oldData: { title: task.title },
        newData: { title: op.newTitle },
      }
      return applyAction(state, action)
    }
    case 'toggle': {
      const task = tasks.find((t) => t.id === op.taskId)
      if (!task) return state   // skip
      const action: CompleteAction = {
        type: 'COMPLETE_TASK',
        taskId: op.taskId,
        wasCompleted: task.completed,
        wasCompletedAt: task.completedAt,
      }
      return applyAction(state, action)
    }
    case 'delete': {
      const task = tasks.find((t) => t.id === op.taskId)
      if (!task) return state   // skip
      const action: DeleteAction = { type: 'DELETE_TASK', task }
      return applyAction(state, action)
    }
  }
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/**
 * We use two separate, non-overlapping pools:
 * - SEED_IDS: used only for the pre-existing seed tasks (not in undo history)
 * - OP_IDS:   used only by generated operations
 *
 * This prevents an `add` op from colliding with a seed-task ID, which would
 * cause undo to delete the seed task (since the state machine matches on ID).
 */
const SEED_IDS = ['s1', 's2', 's3'] as const
const OP_IDS = ['t1', 't2', 't3', 't4', 't5'] as const

const taskArb = (id: string): fc.Arbitrary<Task> =>
  fc.record({
    id: fc.constant(id),
    title: fc.string({ minLength: 1, maxLength: 40 }),
    completed: fc.constant(false),
    completedAt: fc.constant(null),
  })

const opArb: fc.Arbitrary<Op> = fc.oneof(
  // add — pick from OP_IDS pool so later ops can reference it
  fc.constantFrom(...OP_IDS).chain((id) =>
    taskArb(id).map((task) => ({ kind: 'add' as const, task })),
  ),
  // update
  fc.record({
    kind: fc.constant('update' as const),
    taskId: fc.constantFrom(...OP_IDS),
    newTitle: fc.string({ minLength: 1, maxLength: 40 }),
  }),
  // toggle
  fc.record({
    kind: fc.constant('toggle' as const),
    taskId: fc.constantFrom(...OP_IDS),
  }),
  // delete
  fc.record({
    kind: fc.constant('delete' as const),
    taskId: fc.constantFrom(...OP_IDS),
  }),
)

// ─── Property 6: Undo history depth invariant ─────────────────────────────────
// Validates: Requirements 5.6

describe('Property 6: Undo history depth invariant', () => {
  it('applying N undo steps after N operations restores the initial task list', () => {
    fc.assert(
      fc.property(
        fc.array(opArb, { minLength: 1, maxLength: 50 }),
        (ops) => {
          // Start with an empty task list
          const initial: State = { tasks: [], undoHistory: [], redoHistory: [] }

          // Apply all operations, accumulating state
          const afterOps = ops.reduce(applyOp, initial)

          // The number of undo steps equals the history actually pushed
          // (some ops may be skipped if they target non-existent task IDs)
          const stepsToUndo = afterOps.undoHistory.length

          // Apply exactly that many undos
          let restored = afterOps
          for (let i = 0; i < stepsToUndo; i++) {
            restored = applyUndo(restored)
          }

          // History must now be empty (all actions reversed)
          expect(restored.undoHistory).toHaveLength(0)

          // Task list must match the initial empty state
          expect(restored.tasks).toEqual(initial.tasks)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('undo history is capped at 50 operations', () => {
    fc.assert(
      fc.property(
        fc.array(opArb, { minLength: 51, maxLength: 100 }),
        (ops) => {
          const initial: State = { tasks: [], undoHistory: [], redoHistory: [] }
          const afterOps = ops.reduce(applyOp, initial)

          // History must never exceed MAX_HISTORY
          expect(afterOps.undoHistory.length).toBeLessThanOrEqual(MAX_HISTORY)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('restores to a non-empty initial state after operations and full undo', () => {
    fc.assert(
      fc.property(
        // Start with 1–3 seed tasks already in the list (not in undo history)
        fc.array(fc.constantFrom(...SEED_IDS), { minLength: 1, maxLength: 3 }).chain(
          (ids) => {
            const uniqueIds = [...new Set(ids)]
            return fc.tuple(
              ...uniqueIds.map((id) => taskArb(id)),
            ).map((seedTasks) => ({ seedTasks: seedTasks as Task[] }))
          },
        ),
        fc.array(opArb, { minLength: 1, maxLength: 30 }),
        ({ seedTasks }, ops) => {
          // Seed state — tasks exist but have no undo history
          const initial: State = { tasks: seedTasks, undoHistory: [], redoHistory: [] }

          // Apply operations
          const afterOps = ops.reduce(applyOp, initial)
          const stepsToUndo = afterOps.undoHistory.length

          // Undo all recorded operations
          let restored = afterOps
          for (let i = 0; i < stepsToUndo; i++) {
            restored = applyUndo(restored)
          }

          expect(restored.undoHistory).toHaveLength(0)

          // After full undo, task set should match the seed (same IDs and titles).
          // We sort by id for stable comparison because insertion order may differ.
          const sortById = (ts: Task[]) => [...ts].sort((a, b) => a.id.localeCompare(b.id))
          expect(sortById(restored.tasks)).toEqual(sortById(seedTasks))
        },
      ),
      { numRuns: 150 },
    )
  })
})
