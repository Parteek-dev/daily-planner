/**
 * Firestore document ↔ app type converters.
 *
 * Convention
 * ----------
 * - Firestore documents are stored in snake_case.
 * - App objects use camelCase.
 * - `docTo*` functions read from a DocumentSnapshot and return a typed app object.
 * - `*ToDoc` functions serialize an app object to a plain Firestore-writable object.
 *   The document ID is NEVER included in the serialized form — Firestore uses the
 *   doc reference ID (i.e. the `id` field is managed externally).
 * - All date/time fields travelling TO Firestore use `Timestamp.fromDate`; fields
 *   coming FROM Firestore are converted back to ISO 8601 strings with `.toDate().toISOString()`.
 *
 * Requirements: 23.2, 23.3
 */

import { DocumentSnapshot, Timestamp } from 'firebase/firestore'

// ─── Subtask ─────────────────────────────────────────────────────────────────

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string
  title: string
  description: string
  topic: string
  duration: number
  actualDuration: number | null
  date: string                            // YYYY-MM-DD
  originalDate: string | null             // YYYY-MM-DD
  dueTime: string | null                  // HH:MM
  endTime?: string | null                 // HH:MM
  completed: boolean
  completedAt: string | null              // ISO 8601
  createdAt: string                       // ISO 8601
  note: string
  priority: 'high' | 'medium' | 'low' | null
  dependsOn: string[]                     // task IDs
  subtasks: Subtask[]
  recurrence: 'none' | 'daily' | 'weekly' | 'weekdays' | 'custom'
  recurrenceEndDate: string | null        // YYYY-MM-DD
  recurrenceParentId: string | null
  customRecurrenceDays: number[] | null   // 0=Sun … 6=Sat
}

/**
 * Converts a Firestore task document snapshot to a `Task` app object.
 * Missing fields fall back to sensible defaults matching the existing
 * `rowToTask` behaviour in `frontend/src/hooks/useProgress.js`.
 */
export function docToTask(snap: DocumentSnapshot): Task {
  const d = snap.data() ?? {}
  return {
    id: snap.id,
    title: d.title ?? '',
    description: d.description ?? '',
    topic: d.topic ?? 'Personal',
    duration: d.duration ?? 30,
    actualDuration: d.actual_duration ?? null,
    date: d.date ?? '',
    originalDate: d.original_date ?? null,
    dueTime: d.due_time ?? null,
    completed: d.completed ?? false,
    completedAt: d.completed_at
      ? tsToIso(d.completed_at)
      : null,
    createdAt: d.created_at
      ? tsToIso(d.created_at)
      : new Date().toISOString(),
    note: d.note ?? '',
    priority: d.priority ?? null,
    dependsOn: d.depends_on ?? [],
    subtasks: d.subtasks ?? [],
    recurrence: d.recurrence ?? 'none',
    recurrenceEndDate: d.recurrence_end_date ?? null,
    recurrenceParentId: d.recurrence_parent_id ?? null,
    customRecurrenceDays: d.custom_recurrence_days ?? null,
  }
}

/**
 * Serializes a `Task` app object to a Firestore-writable document.
 * The `id` field is intentionally excluded — Firestore uses the document reference ID.
 */
export function taskToDoc(task: Task, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    title: task.title,
    description: task.description ?? '',
    topic: task.topic ?? 'Personal',
    duration: task.duration ?? 30,
    actual_duration: task.actualDuration ?? null,
    date: task.date,
    original_date: task.originalDate ?? null,
    due_time: task.dueTime ?? null,
    completed: task.completed ?? false,
    completed_at: task.completedAt
      ? Timestamp.fromDate(new Date(task.completedAt))
      : null,
    created_at: task.createdAt
      ? Timestamp.fromDate(new Date(task.createdAt))
      : Timestamp.now(),
    note: task.note ?? '',
    priority: task.priority ?? null,
    depends_on: task.dependsOn ?? [],
    subtasks: task.subtasks ?? [],
    recurrence: task.recurrence ?? 'none',
    recurrence_end_date: task.recurrenceEndDate ?? null,
    recurrence_parent_id: task.recurrenceParentId ?? null,
    custom_recurrence_days: task.customRecurrenceDays ?? null,
  }
}

// ─── Topic ────────────────────────────────────────────────────────────────────

export interface Topic {
  id: string
  name: string
  color: string
}

/** Converts a Firestore topic document snapshot to a `Topic` app object. */
export function docToTopic(snap: DocumentSnapshot): Topic {
  const d = snap.data() ?? {}
  return {
    id: snap.id,
    name: d.name ?? '',
    color: d.color ?? '#64748b',
  }
}

/**
 * Serializes a `Topic` to a Firestore-writable document.
 * `id` is excluded — the document ID is the topic's slug or name.
 */
export function topicToDoc(topic: Topic, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    name: topic.name,
    color: topic.color,
  }
}

// ─── Note ─────────────────────────────────────────────────────────────────────

export interface Note {
  id: string        // ISO date YYYY-MM-DD (document ID)
  date: string      // YYYY-MM-DD
  content: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/** Converts a Firestore note document snapshot to a `Note` app object. */
export function docToNote(snap: DocumentSnapshot): Note {
  const d = snap.data() ?? {}
  const now = new Date().toISOString()
  return {
    id: snap.id,
    date: d.date ?? snap.id,
    content: d.content ?? '',
    createdAt: d.created_at
      ? tsToIso(d.created_at)
      : now,
    updatedAt: d.updated_at
      ? tsToIso(d.updated_at)
      : now,
  }
}

/**
 * Serializes a `Note` to a Firestore-writable document.
 * `id` is excluded — the document ID is the ISO date string.
 */
export function noteToDoc(note: Note, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    date: note.date,
    content: note.content ?? '',
    created_at: note.createdAt
      ? Timestamp.fromDate(new Date(note.createdAt))
      : Timestamp.now(),
    updated_at: note.updatedAt
      ? Timestamp.fromDate(new Date(note.updatedAt))
      : Timestamp.now(),
  }
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export interface ExtraGoal {
  id: string
  type: 'min_tasks' | 'min_time' | 'all_priority'
  value?: number
  topic?: string
  priority?: 'high' | 'medium' | 'low'
}

export interface Goals {
  primaryGoal: number       // daily task target (positive integer)
  extraGoals: ExtraGoal[]
  updatedAt: string         // ISO 8601
}

/** Converts the Firestore `goals/daily` document snapshot to a `Goals` app object. */
export function docToGoals(snap: DocumentSnapshot): Goals {
  const d = snap.data() ?? {}
  return {
    primaryGoal: d.daily_task_target ?? 3,
    extraGoals: d.extra_goals ?? [],
    updatedAt: d.updated_at
      ? tsToIso(d.updated_at)
      : new Date().toISOString(),
  }
}

/**
 * Serializes a `Goals` object to a Firestore-writable document.
 * `id` is excluded — this document always has the fixed ID `"daily"`.
 */
export function goalsToDoc(goals: Goals, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    daily_task_target: goals.primaryGoal,
    extra_goals: goals.extraGoals ?? [],
    updated_at: goals.updatedAt
      ? Timestamp.fromDate(new Date(goals.updatedAt))
      : Timestamp.now(),
  }
}

// ─── Template ────────────────────────────────────────────────────────────────

export interface Template {
  id: string
  name: string
  title: string
  description: string
  duration: number
  topic: string
  priority: 'high' | 'medium' | 'low' | null
  subtasks: Subtask[]
  recurrence: 'none' | 'daily' | 'weekly' | 'weekdays' | 'custom'
  customRecurrenceDays: number[] | null  // 0=Sun … 6=Sat
}

/** Converts a Firestore template document snapshot to a `Template` app object. */
export function docToTemplate(snap: DocumentSnapshot): Template {
  const d = snap.data() ?? {}
  return {
    id: snap.id,
    name: d.name ?? '',
    title: d.title ?? '',
    description: d.description ?? '',
    duration: d.duration ?? 30,
    topic: d.topic ?? 'Personal',
    priority: d.priority ?? null,
    subtasks: d.subtasks ?? [],
    recurrence: d.recurrence ?? 'none',
    customRecurrenceDays: d.custom_recurrence_days ?? null,
  }
}

/**
 * Serializes a `Template` to a Firestore-writable document.
 * `id` is excluded — Firestore uses the document reference ID.
 */
export function templateToDoc(template: Template, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    name: template.name,
    title: template.title,
    description: template.description ?? '',
    duration: template.duration ?? 30,
    topic: template.topic ?? 'Personal',
    priority: template.priority ?? null,
    subtasks: template.subtasks ?? [],
    recurrence: template.recurrence ?? 'none',
    custom_recurrence_days: template.customRecurrenceDays ?? null,
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Converts a value that may be a Firestore `Timestamp`, a plain `Date`, or an
 * ISO string to an ISO 8601 string. Returns an empty string for null / undefined.
 */
function tsToIso(value: Timestamp | Date | string | null | undefined): string {
  if (!value) return ''
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return String(value)
}
