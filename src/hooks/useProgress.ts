/**
 * useProgress — React Native / Expo port of the web useProgress hook.
 *
 * Changes from the original `frontend/src/hooks/useProgress.js`:
 *  - Data layer: Supabase → Firestore (tasks 6.1, 6.2)
 *    · One-shot `Promise.all` load → five `onSnapshot` live listeners
 *    · All writes use setDoc / updateDoc / deleteDoc / writeBatch
 *  - Storage: `localStorage` (guest mode) → `AsyncStorage` (task 6.3)
 *  - Cache: stale-while-revalidate via AsyncStorage `cache_*` keys (task 6.4)
 *  - Export: `document.createElement('a')` removed;
 *    `exportData` returns JSON string, `exportAsIcs` writes a temp file
 *    and shares via expo-sharing (task 6.5)
 *  - All business logic, helpers, stats, undo/redo preserved verbatim.
 *
 * Requirements: 5.1, 5.2, 5.4, 5.6, 5.7, 5.9, 23.4, 23.5, 15.2, 15.3, 19.4, 1.6
 */

import { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '@/src/lib/firebase'
import {
  docToTask,
  taskToDoc,
  docToTopic,
  topicToDoc,
  docToNote,
  noteToDoc,
  docToGoals,
  goalsToDoc,
  docToTemplate,
  templateToDoc,
  type Task,
  type Topic,
  type Note,
  type Goals,
  type Template,
  type Subtask,
} from '@/src/lib/firestoreMappers'
import { fmtDuration } from '@/src/lib/utils'
import {
  addDays as addDaysHelper,
  shouldCreateRecurringTask as shouldCreateRecurringTaskHelper,
  getPrioritySortValue as getPrioritySortValueHelper,
  sortTasksByPriority as sortTasksByPriorityHelper,
  areDependenciesMet as areDependenciesMetHelper,
  computeStreak,
  computeTimeTrackingStats,
  computeBestHours,
  computeTopicBalance,
  computeProductivityScore,
  computeDailyGoalProgress,
  computeExtraGoalsProgress,
  computeWeeklyReport,
  computeChartData,
} from '@/src/lib/progressStats'

// ── Cache keys ────────────────────────────────────────────────────────────────

const CACHE_TASKS = 'cache_tasks'
const CACHE_TOPICS = 'cache_topics'
const CACHE_NOTES = 'cache_notes'
const CACHE_GOALS = 'cache_goals'
const CACHE_TEMPLATES = 'cache_templates'

// ── Guest-mode AsyncStorage adapter ──────────────────────────────────────────
// All guest data lives under the 'guest_planner_data' key as a single JSON blob.
const GUEST_KEY = 'guest_planner_data'

// Task 6.3: localStorage → AsyncStorage
const guestDb = {
  async load(): Promise<Record<string, unknown>> {
    try {
      const raw = await AsyncStorage.getItem(GUEST_KEY)
      return JSON.parse(raw || '{}')
    } catch {
      return {}
    }
  },
  async save(patch: Record<string, unknown>): Promise<void> {
    const current = await guestDb.load()
    await AsyncStorage.setItem(GUEST_KEY, JSON.stringify({ ...current, ...patch }))
  },
  async get(key: string, fallback: unknown = null): Promise<unknown> {
    return (await guestDb.load())[key] ?? fallback
  },
  async set(key: string, value: unknown): Promise<void> {
    await guestDb.save({ [key]: value })
  },
}

// ── Priority config (exported so screens can use it) ─────────────────────────
export const PRIORITY_CONFIG = {
  high: { label: 'High', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' },
  medium: { label: 'Medium', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)' },
  low: { label: 'Low', color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)' },
} as const

export const DEFAULT_TOPICS: Topic[] = [
  { id: 'learning', name: 'Learning', color: '#3b82f6' },
  { id: 'work', name: 'Work', color: '#22c55e' },
  { id: 'health', name: 'Health', color: '#f97316' },
  { id: 'personal', name: 'Personal', color: '#a855f7' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number): string {
  return addDaysHelper(dateStr, days)
}

function shouldCreateRecurringTask(task: Task, dateStr: string): boolean {
  return shouldCreateRecurringTaskHelper(task, dateStr)
}

// ── Archived task type (extends Task) ─────────────────────────────────────────

interface ArchivedTask extends Task {
  archivedAt: string | null
}

// ── Goals shape used internally ───────────────────────────────────────────────

interface GoalsState {
  dailyTaskTarget: number
  extraGoals: Array<{
    id: string
    type: 'min_tasks' | 'min_time' | 'all_priority'
    value?: number
    topic?: string
    priority?: 'high' | 'medium' | 'low'
  }>
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useProgress({ user }: { user: User | null }) {
  const userId = user?.uid ?? null
  const isGuest = userId === 'guest'

  // ── Local state ─────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([])
  const [topics, setTopics] = useState<Topic[]>(DEFAULT_TOPICS)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [goals, setGoals] = useState<GoalsState>({ dailyTaskTarget: 3, extraGoals: [] })
  const [templates, setTemplates] = useState<Template[]>([])
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  // Track deleted recurring instances to prevent re-creation (parentId::date keys)
  const [deletedRecurringInstances, setDeletedRecurringInstances] = useState<Set<string>>(new Set())

  // ── Undo / Redo ──────────────────────────────────────────────────────────
  const MAX_HISTORY = 50
  const [undoHistory, setUndoHistory] = useState<unknown[]>([])
  const [redoHistory, setRedoHistory] = useState<unknown[]>([])
  const isUndoingRef = useRef(false)

  const pushUndo = useCallback((action: unknown) => {
    if (isUndoingRef.current) return
    setUndoHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), action])
    setRedoHistory([])
  }, [])

  // ── Task 6.4: hydrate from AsyncStorage cache before subscribing ──────────
  useEffect(() => {
    if (!userId || userId === 'guest') return

    async function hydrateCache() {
      try {
        const [
          rawTasks,
          rawTopics,
          rawNotes,
          rawGoals,
          rawTemplates,
        ] = await Promise.all([
          AsyncStorage.getItem(CACHE_TASKS),
          AsyncStorage.getItem(CACHE_TOPICS),
          AsyncStorage.getItem(CACHE_NOTES),
          AsyncStorage.getItem(CACHE_GOALS),
          AsyncStorage.getItem(CACHE_TEMPLATES),
        ])

        if (rawTasks) setTasks(JSON.parse(rawTasks))
        if (rawTopics) setTopics(JSON.parse(rawTopics))
        if (rawNotes) setNotes(JSON.parse(rawNotes))
        if (rawGoals) setGoals(JSON.parse(rawGoals))
        if (rawTemplates) setTemplates(JSON.parse(rawTemplates))
      } catch {
        // Cache miss or corrupt data — Firestore will populate state shortly
      }
    }

    hydrateCache()
  }, [userId])

  // ── Task 6.1: Firestore onSnapshot subscriptions ─────────────────────────
  useEffect(() => {
    if (!userId) {
      setDataLoading(false)
      return
    }

    // ── Guest mode: load from AsyncStorage ──────────────────────────────
    if (userId === 'guest') {
      let cancelled = false

      async function loadGuest() {
        const saved = await guestDb.load()
        if (cancelled) return
        const savedAny = saved as Record<string, unknown>
        if (savedAny.tasks && Array.isArray(savedAny.tasks)) setTasks(savedAny.tasks as Task[])
        if (savedAny.topics && Array.isArray(savedAny.topics) && (savedAny.topics as Topic[]).length > 0)
          setTopics(savedAny.topics as Topic[])
        if (savedAny.notes) setNotes(savedAny.notes as Record<string, string>)
        if (savedAny.goals) setGoals(savedAny.goals as GoalsState)
        if (savedAny.templates && Array.isArray(savedAny.templates))
          setTemplates(savedAny.templates as Template[])
        if (savedAny.archivedTasks && Array.isArray(savedAny.archivedTasks))
          setArchivedTasks(savedAny.archivedTasks as ArchivedTask[])
        setDataLoading(false)
      }

      loadGuest()
      return () => { cancelled = true }
    }

    // ── Firestore mode: subscribe to all five collections ────────────────
    // Track which listeners have fired at least once
    const firedOnce = { tasks: false, topics: false, notes: false, goals: false, templates: false }

    function checkAllFired() {
      if (Object.values(firedOnce).every(Boolean)) {
        setDataLoading(false)
      }
    }

    const uid = userId

    // Tasks
    const unsubTasks = onSnapshot(
      collection(db, `users/${uid}/tasks`),
      (snap) => {
        const mapped = snap.docs.map(docToTask)
        setTasks(mapped)
        // Task 6.4: write cache
        AsyncStorage.setItem(CACHE_TASKS, JSON.stringify(mapped)).catch(() => { })
        if (!firedOnce.tasks) { firedOnce.tasks = true; checkAllFired() }
      },
      (err) => console.error('[useProgress] tasks snapshot error:', err),
    )

    // Topics
    const unsubTopics = onSnapshot(
      collection(db, `users/${uid}/topics`),
      (snap) => {
        const mapped = snap.docs.length > 0
          ? snap.docs.map(docToTopic)
          : DEFAULT_TOPICS
        setTopics(mapped)
        AsyncStorage.setItem(CACHE_TOPICS, JSON.stringify(mapped)).catch(() => { })
        if (!firedOnce.topics) { firedOnce.topics = true; checkAllFired() }
      },
      (err) => console.error('[useProgress] topics snapshot error:', err),
    )

    // Notes — stored as individual docs keyed by date; merge into a Record<date, content>
    const unsubNotes = onSnapshot(
      collection(db, `users/${uid}/notes`),
      (snap) => {
        const noteMap: Record<string, string> = {}
        snap.docs.forEach(d => {
          const note = docToNote(d)
          if (note.content) noteMap[note.date] = note.content
        })
        setNotes(noteMap)
        AsyncStorage.setItem(CACHE_NOTES, JSON.stringify(noteMap)).catch(() => { })
        if (!firedOnce.notes) { firedOnce.notes = true; checkAllFired() }
      },
      (err) => console.error('[useProgress] notes snapshot error:', err),
    )

    // Goals — single document at `goals/daily`
    const unsubGoals = onSnapshot(
      doc(db, `users/${uid}/goals/daily`),
      (snap) => {
        if (snap.exists()) {
          const g = docToGoals(snap)
          const mapped: GoalsState = {
            dailyTaskTarget: g.primaryGoal,
            extraGoals: g.extraGoals as GoalsState['extraGoals'],
          }
          setGoals(mapped)
          AsyncStorage.setItem(CACHE_GOALS, JSON.stringify(mapped)).catch(() => { })
        }
        if (!firedOnce.goals) { firedOnce.goals = true; checkAllFired() }
      },
      (err) => console.error('[useProgress] goals snapshot error:', err),
    )

    // Templates
    const unsubTemplates = onSnapshot(
      collection(db, `users/${uid}/templates`),
      (snap) => {
        const mapped = snap.docs.map(docToTemplate)
        setTemplates(mapped)
        AsyncStorage.setItem(CACHE_TEMPLATES, JSON.stringify(mapped)).catch(() => { })
        if (!firedOnce.templates) { firedOnce.templates = true; checkAllFired() }
      },
      (err) => console.error('[useProgress] templates snapshot error:', err),
    )

    // Deleted recurring instances — to prevent re-creation of deleted child tasks
    const unsubDeletedInstances = onSnapshot(
      doc(db, `users/${uid}/settings/deletedRecurringInstances`),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          const instances = data?.instances ?? []
          setDeletedRecurringInstances(new Set(instances))
        }
      },
      (err) => console.error('[useProgress] deletedRecurringInstances snapshot error:', err),
    )

    return () => {
      unsubTasks()
      unsubTopics()
      unsubNotes()
      unsubGoals()
      unsubTemplates()
      unsubDeletedInstances()
    }
  }, [userId])

  // ── Guest: sync all state to AsyncStorage whenever it changes ─────────────
  useEffect(() => {
    if (userId !== 'guest' || dataLoading) return
    guestDb.save({ tasks, topics, notes, goals, templates, archivedTasks })
  }, [userId, dataLoading, tasks, topics, notes, goals, templates, archivedTasks])

  // ── Recurring task generation — rolling 30-day window ──────────────────────
  // Runs after initial load AND whenever tasks change (e.g. new recurring task added).
  // A ref-based lock prevents concurrent runs from racing each other.
  const recurringRunningRef = useRef(false)

  useEffect(() => {
    if (!userId || dataLoading || tasks.length === 0) return
    if (isGuest) return // guest mode: no Firestore, no batch writes
    if (recurringRunningRef.current) return
    recurringRunningRef.current = true

    const today = getToday()
    const horizon = addDays(today, 30) // 30-day rolling window
    const newTasks: Task[] = []

    // Build a set of already-existing "parentId::date" keys to skip
    const seen = new Set(
      tasks
        .filter(t => t.recurrenceParentId)
        .map(t => `${t.recurrenceParentId}::${t.date}`)
    )

    tasks.forEach(task => {
      if (!task.recurrence || task.recurrence === 'none') return
      if (task.recurrenceParentId) return // skip children

      // Respect explicit end date; otherwise use 30-day rolling horizon
      const endDate = task.recurrenceEndDate
        ? (task.recurrenceEndDate < horizon ? task.recurrenceEndDate : horizon)
        : horizon

      let checkDate = addDays(task.date, 1)

      while (checkDate <= endDate) {
        if (shouldCreateRecurringTask(task, checkDate)) {
          const key = `${task.id}::${checkDate}`
          // Skip if already exists OR if user explicitly deleted this instance
          if (!seen.has(key) && !deletedRecurringInstances.has(key)) {
            seen.add(key)
            const child: Task = {
              id: generateId(),
              title: task.title,
              description: task.description,
              topic: task.topic,
              duration: task.duration,
              actualDuration: null,
              date: checkDate,
              originalDate: null,
              dueTime: null,
              endTime: null,
              completed: false,
              completedAt: null,
              createdAt: new Date().toISOString(),
              note: '',
              priority: null,
              dependsOn: [],
              subtasks: task.subtasks?.map(s => ({ ...s, id: generateId(), completed: false })) || [],
              recurrence: 'none',
              recurrenceEndDate: null,
              recurrenceParentId: task.id,
              customRecurrenceDays: null,
            }
            newTasks.push(child)
          }
        }
        checkDate = addDays(checkDate, 1)
      }
    })

    if (newTasks.length === 0) {
      recurringRunningRef.current = false
      return
    }

    const uid = userId
    const batch = writeBatch(db)
    newTasks.forEach(t => {
      batch.set(doc(db, `users/${uid}/tasks/${t.id}`), taskToDoc(t, uid))
    })
    batch.commit()
      .then(() => {
        setTasks(prev => {
          const existingKeys = new Set(
            prev.filter(t => t.recurrenceParentId).map(t => `${t.recurrenceParentId}::${t.date}`)
          )
          const deduped = newTasks.filter(t => !existingKeys.has(`${t.recurrenceParentId}::${t.date}`))
          return deduped.length > 0 ? [...prev, ...deduped] : prev
        })
        recurringRunningRef.current = false
      })
      .catch(err => {
        console.error('[useProgress] recurring task batch error:', err)
        recurringRunningRef.current = false
      })
  }, [tasks, userId, dataLoading, isGuest, deletedRecurringInstances])

  // ── Task CRUD (Task 6.2) ───────────────────────────────────────────────────

  const addTask = useCallback(async (taskData: Partial<Task> & { title: string }): Promise<Task> => {
    const taskDate = taskData.date || getToday()
    const newTask: Task = {
      id: generateId(),
      title: taskData.title,
      description: taskData.description || '',
      topic: taskData.topic || 'Personal',
      duration: taskData.duration || 30,
      actualDuration: null,
      date: taskDate,
      originalDate: taskDate,
      dueTime: taskData.dueTime || null,
      endTime: taskData.endTime ?? null,
      priority: taskData.priority || null,
      dependsOn: taskData.dependsOn || [],
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      note: '',
      subtasks: taskData.subtasks || [],
      recurrence: taskData.recurrence || 'none',
      recurrenceEndDate: taskData.recurrenceEndDate || null,
      recurrenceParentId: null,
      customRecurrenceDays: taskData.customRecurrenceDays || null,
    }

    // Optimistic update
    setTasks(prev => [...prev, newTask])
    pushUndo({ type: 'ADD_TASK', taskId: newTask.id, task: newTask })

    if (!isGuest && userId) {
      try {
        await setDoc(doc(db, `users/${userId}/tasks/${newTask.id}`), taskToDoc(newTask, userId))
      } catch (err) {
        console.error('addTask error:', err)
        setTasks(prev => prev.filter(t => t.id !== newTask.id))
      }
    }
    return newTask
  }, [userId, isGuest, pushUndo])

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>): Promise<void> => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const newUpdates = { ...updates }
      if ('date' in updates && updates.date !== t.date && !t.originalDate) {
        newUpdates.originalDate = t.date
      }
      return { ...t, ...newUpdates }
    }))

    if (isGuest || !userId) return

    // Build camelCase → Firestore field patch
    const patch: Record<string, unknown> = {}
    if ('title' in updates) patch['title'] = updates.title
    if ('description' in updates) patch['description'] = updates.description
    if ('topic' in updates) patch['topic'] = updates.topic
    if ('duration' in updates) patch['duration'] = updates.duration
    if ('actualDuration' in updates) patch['actual_duration'] = updates.actualDuration
    if ('date' in updates) patch['date'] = updates.date
    if ('originalDate' in updates) patch['original_date'] = updates.originalDate
    if ('dueTime' in updates) patch['due_time'] = updates.dueTime
    if ('endTime' in updates) patch['end_time'] = updates.endTime
    if ('completed' in updates) patch['completed'] = updates.completed
    if ('completedAt' in updates) patch['completed_at'] = updates.completedAt
    if ('priority' in updates) patch['priority'] = updates.priority
    if ('dependsOn' in updates) patch['depends_on'] = updates.dependsOn
    if ('subtasks' in updates) patch['subtasks'] = updates.subtasks
    if ('recurrence' in updates) patch['recurrence'] = updates.recurrence
    if ('recurrenceEndDate' in updates) patch['recurrence_end_date'] = updates.recurrenceEndDate
    if ('recurrenceParentId' in updates) patch['recurrence_parent_id'] = updates.recurrenceParentId
    if ('customRecurrenceDays' in updates) patch['custom_recurrence_days'] = updates.customRecurrenceDays
    if ('note' in updates) patch['note'] = updates.note

    // Preserve originalDate if we just derived it
    const existingTask = tasks.find(t => t.id === taskId)
    if ('date' in updates && updates.date !== existingTask?.date && !existingTask?.originalDate) {
      patch['original_date'] = existingTask?.date ?? null
    }

    try {
      await updateDoc(doc(db, `users/${userId}/tasks/${taskId}`), patch as Record<string, never>)
    } catch (err) {
      console.error('updateTask error:', err)
    }
  }, [userId, isGuest, tasks])

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    const task = tasks.find(t => t.id === taskId)
    if (task) pushUndo({ type: 'DELETE_TASK', task })

    // If this is a recurring child task, track it so it won't be recreated
    if (task?.recurrenceParentId) {
      const key = `${task.recurrenceParentId}::${task.date}`
      setDeletedRecurringInstances(prev => new Set(prev).add(key))

      // Persist to Firestore so it survives page refresh
      if (!isGuest && userId) {
        const docRef = doc(db, `users/${userId}/settings/deletedRecurringInstances`)
        const newInstances = [...deletedRecurringInstances, key]
        setDoc(docRef, { instances: newInstances }, { merge: true }).catch(err => {
          console.error('[useProgress] failed to persist deleted recurring instance:', err)
        })
      }
    }

    setTasks(prev => prev.filter(t => t.id !== taskId))

    if (isGuest || !userId) return
    try {
      await deleteDoc(doc(db, `users/${userId}/tasks/${taskId}`))
    } catch (err) {
      console.error('deleteTask error:', err)
      if (task) setTasks(prev => [...prev, task])
    }
  }, [tasks, userId, isGuest, pushUndo, deletedRecurringInstances])

  const toggleTaskComplete = useCallback(async (taskId: string): Promise<void> => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    pushUndo({ type: 'COMPLETE_TASK', taskId, wasCompleted: task.completed, wasCompletedAt: task.completedAt })

    const completed = !task.completed
    const completedAt = completed ? new Date().toISOString() : null
    const subtasks = task.subtasks?.map(s => ({ ...s, completed })) || []

    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed, completedAt, subtasks } : t
    ))

    if (isGuest || !userId) return
    try {
      await updateDoc(doc(db, `users/${userId}/tasks/${taskId}`), {
        completed,
        completed_at: completedAt,
        subtasks,
      })
    } catch (err) {
      console.error('toggleTaskComplete error:', err)
    }
  }, [tasks, userId, isGuest, pushUndo])

  const setActualDuration = useCallback(async (taskId: string, minutes: number): Promise<void> => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, actualDuration: minutes } : t))
    if (isGuest || !userId) return
    try {
      await updateDoc(doc(db, `users/${userId}/tasks/${taskId}`), { actual_duration: minutes })
    } catch (err) {
      console.error('setActualDuration error:', err)
    }
  }, [userId, isGuest])

  // ── Subtasks ──────────────────────────────────────────────────────────────

  const addSubtask = useCallback(async (taskId: string, subtaskTitle: string): Promise<void> => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const newSubtask: Subtask = { id: generateId(), title: subtaskTitle, completed: false }
    const newSubtasks = [...(task.subtasks || []), newSubtask]
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks } : t))
    if (isGuest || !userId) return
    await updateDoc(doc(db, `users/${userId}/tasks/${taskId}`), { subtasks: newSubtasks })
  }, [tasks, userId, isGuest])

  const updateSubtask = useCallback(async (taskId: string, subtaskId: string, updates: Partial<Subtask>): Promise<void> => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const newSubtasks = task.subtasks?.map(s => s.id === subtaskId ? { ...s, ...updates } : s) || []
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks } : t))
    if (isGuest || !userId) return
    await updateDoc(doc(db, `users/${userId}/tasks/${taskId}`), { subtasks: newSubtasks })
  }, [tasks, userId, isGuest])

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string): Promise<void> => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const newSubtasks = task.subtasks?.filter(s => s.id !== subtaskId) || []
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks } : t))
    if (isGuest || !userId) return
    await updateDoc(doc(db, `users/${userId}/tasks/${taskId}`), { subtasks: newSubtasks })
  }, [tasks, userId, isGuest])

  const toggleSubtaskComplete = useCallback(async (taskId: string, subtaskId: string): Promise<void> => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const newSubtasks = task.subtasks?.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    ) || []
    const allDone = newSubtasks.length > 0 && newSubtasks.every(s => s.completed)
    const completed = allDone ? true : task.completed
    const completedAt = allDone && !task.completed ? new Date().toISOString() : task.completedAt

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks, completed, completedAt } : t))
    if (isGuest || !userId) return
    await updateDoc(doc(db, `users/${userId}/tasks/${taskId}`), {
      subtasks: newSubtasks,
      completed,
      completed_at: completedAt,
    })
  }, [tasks, userId, isGuest])

  // ── Reorder ───────────────────────────────────────────────────────────────

  const reorderTasks = useCallback((date: string, reorderedIds: string[]): void => {
    setTasks(prev => {
      const dateTasks = reorderedIds.map(id => prev.find(t => t.id === id)).filter((t): t is Task => Boolean(t))
      const otherTasks = prev.filter(t => t.date !== date)
      return [...otherTasks, ...dateTasks]
    })
    // No DB call needed — display order is client-side only
  }, [])

  // ── Archive ───────────────────────────────────────────────────────────────

  const archiveTask = useCallback(async (taskId: string): Promise<void> => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    pushUndo({ type: 'ARCHIVE_TASK', task })

    const archivedTask: ArchivedTask = { ...task, archivedAt: new Date().toISOString() }
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setArchivedTasks(prev => [archivedTask, ...prev])

    if (isGuest || !userId) return
    // Task 6.2: writeBatch for atomic archive + delete
    const uid = userId
    const batch = writeBatch(db)
    batch.set(doc(db, `users/${uid}/archived_tasks/${taskId}`), {
      ...taskToDoc(task, uid),
      archived_at: archivedTask.archivedAt,
    })
    batch.delete(doc(db, `users/${uid}/tasks/${taskId}`))
    await batch.commit().catch(err => console.error('archiveTask error:', err))
  }, [tasks, userId, isGuest, pushUndo])

  const restoreTask = useCallback(async (taskId: string): Promise<void> => {
    const archived = archivedTasks.find(t => t.id === taskId)
    if (!archived) return
    pushUndo({ type: 'RESTORE_TASK', task: archived })

    const { archivedAt: _, ...taskData } = archived
    setArchivedTasks(prev => prev.filter(t => t.id !== taskId))
    setTasks(prev => [...prev, taskData])

    if (isGuest || !userId) return
    const uid = userId
    const batch = writeBatch(db)
    batch.set(doc(db, `users/${uid}/tasks/${taskId}`), taskToDoc(taskData, uid))
    batch.delete(doc(db, `users/${uid}/archived_tasks/${taskId}`))
    await batch.commit().catch(err => console.error('restoreTask error:', err))
  }, [archivedTasks, userId, isGuest, pushUndo])

  const deleteArchivedTask = useCallback(async (taskId: string): Promise<void> => {
    setArchivedTasks(prev => prev.filter(t => t.id !== taskId))
    if (isGuest || !userId) return
    await deleteDoc(doc(db, `users/${userId}/archived_tasks/${taskId}`))
      .catch(err => console.error('deleteArchivedTask error:', err))
  }, [userId, isGuest])

  const archiveCompletedTasks = useCallback(async (olderThanDays = 7): Promise<number> => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - olderThanDays)
    const cutoffStr = cutoff.toLocaleDateString('en-CA')

    const toArchive = tasks.filter(t => t.completed && t.date <= cutoffStr)
    if (toArchive.length === 0) return 0

    const now = new Date().toISOString()
    setTasks(prev => prev.filter(t => !toArchive.some(a => a.id === t.id)))
    setArchivedTasks(prev => [
      ...toArchive.map(t => ({ ...t, archivedAt: now })),
      ...prev,
    ])

    if (isGuest || !userId) return toArchive.length

    // Task 6.2: writeBatch for bulk archive + delete
    const uid = userId
    const batch = writeBatch(db)
    toArchive.forEach(t => {
      batch.set(doc(db, `users/${uid}/archived_tasks/${t.id}`), {
        ...taskToDoc(t, uid),
        archived_at: now,
      })
      batch.delete(doc(db, `users/${uid}/tasks/${t.id}`))
    })
    await batch.commit().catch(err => console.error('archiveCompletedTasks error:', err))
    return toArchive.length
  }, [tasks, userId, isGuest])

  // ── Rollover overdue tasks ────────────────────────────────────────────────

  const rolloverOverdueTasks = useCallback(async (): Promise<number> => {
    const today = getToday()
    const overdue = tasks.filter(t => !t.completed && t.date < today)
    if (overdue.length === 0) return 0

    setTasks(prev => prev.map(t =>
      t.completed || t.date >= today ? t : { ...t, date: today }
    ))

    if (isGuest || !userId) return overdue.length

    // Task 6.2: writeBatch for bulk rollover
    const uid = userId
    const batch = writeBatch(db)
    overdue.forEach(t => {
      batch.update(doc(db, `users/${uid}/tasks/${t.id}`), { date: today })
    })
    await batch.commit().catch(err => console.error('rolloverOverdueTasks error:', err))
    return overdue.length
  }, [tasks, userId, isGuest])

  // ── Topics ────────────────────────────────────────────────────────────────

  const addTopic = useCallback(async (name: string, color: string): Promise<boolean> => {
    if (topics.find(t => t.name.toLowerCase() === name.toLowerCase())) return false
    const newTopic: Topic = { id: generateId(), name, color }
    setTopics(prev => [...prev, newTopic])
    if (isGuest || !userId) return true
    try {
      // Check if this is the first custom topic by querying Firestore
      // If Firestore has no topics yet, persist all existing (default) topics first
      // to prevent the snapshot listener from wiping them out
      const topicsRef = collection(db, `users/${userId}/topics`)
      const existingSnap = await getDocs(topicsRef)
      if (existingSnap.empty && topics.length > 0) {
        // Persist all current topics (defaults) to Firestore first
        const batch = writeBatch(db)
        topics.forEach(t => {
          batch.set(doc(db, `users/${userId}/topics/${t.id}`), topicToDoc(t, userId))
        })
        batch.set(doc(db, `users/${userId}/topics/${newTopic.id}`), topicToDoc(newTopic, userId))
        await batch.commit()
      } else {
        // Topics already exist in Firestore, just add the new one
        await setDoc(doc(db, `users/${userId}/topics/${newTopic.id}`), topicToDoc(newTopic, userId))
      }
      return true
    } catch (err) {
      console.error('addTopic error:', err)
      setTopics(prev => prev.filter(t => t.name !== name))
      return false
    }
  }, [topics, userId, isGuest])

  const updateTopic = useCallback(async (topicId: string, updates: Partial<Topic>): Promise<void> => {
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, ...updates } : t))
    if (isGuest || !userId) return
    await updateDoc(doc(db, `users/${userId}/topics/${topicId}`), updates)
      .catch(err => console.error('updateTopic error:', err))
  }, [userId, isGuest])

  const deleteTopic = useCallback(async (topicId: string): Promise<void> => {
    setTopics(prev => prev.filter(t => t.id !== topicId))
    if (isGuest || !userId) return
    await deleteDoc(doc(db, `users/${userId}/topics/${topicId}`))
      .catch(err => console.error('deleteTopic error:', err))
  }, [userId, isGuest])

  // Legacy name-based removeTopic (kept for internal backward compat)
  const removeTopic = useCallback(async (name: string): Promise<void> => {
    const topic = topics.find(t => t.name === name)
    if (!topic) return
    await deleteTopic(topic.id)
  }, [topics, deleteTopic])

  const getTopicColor = useCallback((topicName: string): string => {
    const topic = topics.find(t => t.name === topicName)
    return topic?.color || '#64748b'
  }, [topics])

  // ── Notes ─────────────────────────────────────────────────────────────────

  const getNote = useCallback((date: string): string => notes[date] || '', [notes])

  const setNote = useCallback(async (date: string, text: string): Promise<void> => {
    const trimmed = text?.trim() ?? ''
    setNotes(prev => {
      if (!trimmed) {
        const { [date]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [date]: trimmed }
    })

    if (isGuest || !userId) return

    if (trimmed) {
      // Upsert note doc (doc ID = date string)
      const noteObj: Note = {
        id: date,
        date,
        content: trimmed,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await setDoc(doc(db, `users/${userId}/notes/${date}`), noteToDoc(noteObj, userId))
        .catch(err => console.error('setNote (set) error:', err))
    } else {
      await deleteDoc(doc(db, `users/${userId}/notes/${date}`))
        .catch(err => console.error('setNote (delete) error:', err))
    }
  }, [userId, isGuest])

  const updateNote = setNote  // alias used by some call sites

  const todayNote = useMemo(() => getNote(getToday()), [getNote])

  // ── Goals ──────────────────────────────────────────────────────────────────

  const setGoals_inner = useCallback(async (target: number): Promise<void> => {
    const val = Math.max(1, target)
    setGoals(prev => ({ ...prev, dailyTaskTarget: val }))
    if (isGuest || !userId) return
    const goalsObj: Goals = {
      primaryGoal: val,
      extraGoals: goals.extraGoals as Goals['extraGoals'],
      updatedAt: new Date().toISOString(),
    }
    await setDoc(doc(db, `users/${userId}/goals/daily`), goalsToDoc(goalsObj, userId))
      .catch(err => console.error('setGoals error:', err))
  }, [userId, isGuest, goals.extraGoals])

  // Exported alias matching original API name
  const setGoals_export = setGoals_inner

  const addExtraGoal = useCallback(async (goalData: Omit<GoalsState['extraGoals'][number], 'id'>): Promise<void> => {
    const newGoal = { id: generateId(), ...goalData }
    const next = [...(goals.extraGoals ?? []), newGoal]
    setGoals(prev => ({ ...prev, extraGoals: next }))
    if (isGuest || !userId) return
    const goalsObj: Goals = {
      primaryGoal: goals.dailyTaskTarget ?? 3,
      extraGoals: next as Goals['extraGoals'],
      updatedAt: new Date().toISOString(),
    }
    await setDoc(doc(db, `users/${userId}/goals/daily`), goalsToDoc(goalsObj, userId))
      .catch(err => console.error('addExtraGoal error:', err))
  }, [userId, isGuest, goals])

  const removeExtraGoal = useCallback(async (goalId: string): Promise<void> => {
    const next = (goals.extraGoals ?? []).filter(g => g.id !== goalId)
    setGoals(prev => ({ ...prev, extraGoals: next }))
    if (isGuest || !userId) return
    const goalsObj: Goals = {
      primaryGoal: goals.dailyTaskTarget ?? 3,
      extraGoals: next as Goals['extraGoals'],
      updatedAt: new Date().toISOString(),
    }
    await setDoc(doc(db, `users/${userId}/goals/daily`), goalsToDoc(goalsObj, userId))
      .catch(err => console.error('removeExtraGoal error:', err))
  }, [userId, isGuest, goals])

  // ── Templates ─────────────────────────────────────────────────────────────

  const addTemplate = useCallback(async (templateData: Partial<Template> & { name: string; title: string }): Promise<Template> => {
    const tmpl: Template = {
      id: generateId(),
      name: templateData.name,
      title: templateData.title,
      description: templateData.description || '',
      topic: templateData.topic || 'Personal',
      duration: templateData.duration || 30,
      priority: templateData.priority || null,
      subtasks: templateData.subtasks || [],
      recurrence: templateData.recurrence || 'none',
      customRecurrenceDays: templateData.customRecurrenceDays || null,
    }
    setTemplates(prev => [...prev, tmpl])
    if (!isGuest && userId) {
      await setDoc(doc(db, `users/${userId}/templates/${tmpl.id}`), templateToDoc(tmpl, userId))
        .catch(err => console.error('addTemplate error:', err))
    }
    return tmpl
  }, [userId, isGuest])

  const deleteTemplate = useCallback(async (templateId: string): Promise<void> => {
    setTemplates(prev => prev.filter(t => t.id !== templateId))
    if (isGuest || !userId) return
    await deleteDoc(doc(db, `users/${userId}/templates/${templateId}`))
      .catch(err => console.error('deleteTemplate error:', err))
  }, [userId, isGuest])

  const createTaskFromTemplate = useCallback((templateId: string, date?: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return null
    return addTask({
      title: template.title,
      description: template.description,
      topic: template.topic,
      duration: template.duration,
      date: date || getToday(),
      subtasks: template.subtasks?.map(s => ({ ...s, id: generateId(), completed: false })) || [],
      recurrence: template.recurrence,
      customRecurrenceDays: template.customRecurrenceDays,
    })
  }, [templates, addTask])

  // ── Bulk actions (Task 6.2: writeBatch) ───────────────────────────────────

  const bulkCompleteTasks = useCallback(async (taskIds: string[]): Promise<void> => {
    const previousStates = tasks
      .filter(t => taskIds.includes(t.id))
      .map(t => ({ id: t.id, completed: t.completed, completedAt: t.completedAt }))

    if (previousStates.length > 0) pushUndo({ type: 'BULK_COMPLETE', taskIds, previousStates })

    const now = new Date().toISOString()
    setTasks(prev => prev.map(t => {
      if (!taskIds.includes(t.id) || t.completed) return t
      return { ...t, completed: true, completedAt: now, subtasks: t.subtasks?.map(s => ({ ...s, completed: true })) || [] }
    }))

    if (isGuest || !userId) return

    const uid = userId
    const batch = writeBatch(db)
    for (const taskId of taskIds) {
      const task = tasks.find(t => t.id === taskId)
      if (!task || task.completed) continue
      batch.update(doc(db, `users/${uid}/tasks/${taskId}`), {
        completed: true,
        completed_at: now,
        subtasks: task.subtasks?.map(s => ({ ...s, completed: true })) || [],
      })
    }
    await batch.commit().catch(err => console.error('bulkCompleteTasks error:', err))
  }, [tasks, userId, isGuest, pushUndo])

  const bulkDeleteTasks = useCallback(async (taskIds: string[]): Promise<void> => {
    const tasksToDelete = tasks.filter(t => taskIds.includes(t.id))
    if (tasksToDelete.length > 0) pushUndo({ type: 'BULK_DELETE', tasks: tasksToDelete })

    setTasks(prev => prev.filter(t => !taskIds.includes(t.id)))

    if (isGuest || !userId) return

    const uid = userId
    const batch = writeBatch(db)
    taskIds.forEach(id => batch.delete(doc(db, `users/${uid}/tasks/${id}`)))
    await batch.commit().catch(err => console.error('bulkDeleteTasks error:', err))
  }, [tasks, userId, isGuest, pushUndo])

  const bulkMoveTasks = useCallback(async (taskIds: string[], newDate: string): Promise<void> => {
    setTasks(prev => prev.map(t => taskIds.includes(t.id) ? { ...t, date: newDate } : t))

    if (isGuest || !userId) return

    const uid = userId
    const batch = writeBatch(db)
    taskIds.forEach(id => batch.update(doc(db, `users/${uid}/tasks/${id}`), { date: newDate }))
    await batch.commit().catch(err => console.error('bulkMoveTasks error:', err))
  }, [userId, isGuest])

  const bulkUncompleteTasks = useCallback(async (taskIds: string[]): Promise<void> => {
    setTasks(prev => prev.map(t => {
      if (!taskIds.includes(t.id) || !t.completed) return t
      return { ...t, completed: false, completedAt: null, subtasks: t.subtasks?.map(s => ({ ...s, completed: false })) || [] }
    }))

    if (isGuest || !userId) return

    const uid = userId
    const batch = writeBatch(db)
    taskIds.forEach(id => batch.update(doc(db, `users/${uid}/tasks/${id}`), {
      completed: false, completed_at: null,
    }))
    await batch.commit().catch(err => console.error('bulkUncompleteTasks error:', err))
  }, [userId, isGuest])

  // ── Undo / Redo ───────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    if (undoHistory.length === 0) return null
    isUndoingRef.current = true
    const action = undoHistory[undoHistory.length - 1] as Record<string, unknown>
    setUndoHistory(prev => prev.slice(0, -1))
    setRedoHistory(prev => [...prev, action])

    switch (action.type) {
      case 'DELETE_TASK': setTasks(prev => [...prev, action.task as Task]); break
      case 'ADD_TASK': setTasks(prev => prev.filter(t => t.id !== action.taskId)); break
      case 'UPDATE_TASK': setTasks(prev => prev.map(t => t.id === action.taskId ? { ...t, ...(action.oldData as Partial<Task>) } : t)); break
      case 'COMPLETE_TASK': setTasks(prev => prev.map(t => t.id === action.taskId ? { ...t, completed: action.wasCompleted as boolean, completedAt: action.wasCompletedAt as string | null } : t)); break
      case 'BULK_DELETE': setTasks(prev => [...prev, ...(action.tasks as Task[])]); break
      case 'BULK_COMPLETE': setTasks(prev => prev.map(t => { const s = (action.previousStates as Array<{ id: string; completed: boolean; completedAt: string | null }>).find(x => x.id === t.id); return s ? { ...t, completed: s.completed, completedAt: s.completedAt } : t })); break
      case 'ARCHIVE_TASK': setArchivedTasks(prev => prev.filter(t => t.id !== (action.task as Task).id)); setTasks(prev => [...prev, action.task as Task]); break
      case 'RESTORE_TASK': setTasks(prev => prev.filter(t => t.id !== (action.task as Task).id)); setArchivedTasks(prev => [...prev, action.task as ArchivedTask]); break
    }

    setTimeout(() => { isUndoingRef.current = false }, 0)
    return action
  }, [undoHistory])

  const redo = useCallback(() => {
    if (redoHistory.length === 0) return null
    isUndoingRef.current = true
    const action = redoHistory[redoHistory.length - 1] as Record<string, unknown>
    setRedoHistory(prev => prev.slice(0, -1))
    setUndoHistory(prev => [...prev, action])

    const now = new Date().toISOString()
    switch (action.type) {
      case 'DELETE_TASK': setTasks(prev => prev.filter(t => t.id !== (action.task as Task).id)); break
      case 'ADD_TASK': setTasks(prev => [...prev, action.task as Task]); break
      case 'UPDATE_TASK': setTasks(prev => prev.map(t => t.id === action.taskId ? { ...t, ...(action.newData as Partial<Task>) } : t)); break
      case 'COMPLETE_TASK': setTasks(prev => prev.map(t => t.id === action.taskId ? { ...t, completed: !(action.wasCompleted as boolean), completedAt: action.wasCompleted ? null : now } : t)); break
      case 'BULK_DELETE': setTasks(prev => prev.filter(t => !(action.tasks as Task[]).some(d => d.id === t.id))); break
      case 'BULK_COMPLETE': setTasks(prev => prev.map(t => (action.taskIds as string[]).includes(t.id) ? { ...t, completed: true, completedAt: now } : t)); break
      case 'ARCHIVE_TASK': setTasks(prev => prev.filter(t => t.id !== (action.task as Task).id)); setArchivedTasks(prev => [...prev, { ...(action.task as Task), archivedAt: now }]); break
      case 'RESTORE_TASK': setArchivedTasks(prev => prev.filter(t => t.id !== (action.task as Task).id)); setTasks(prev => [...prev, action.task as Task]); break
    }

    setTimeout(() => { isUndoingRef.current = false }, 0)
    return action
  }, [redoHistory])

  // ── Queries ───────────────────────────────────────────────────────────────

  const getTasksByDate = useCallback((date: string) => tasks.filter(t => t.date === date), [tasks])
  const getTasksInRange = useCallback((s: string, e: string) => tasks.filter(t => t.date >= s && t.date <= e), [tasks])
  const todayTasks = useMemo(() => getTasksByDate(getToday()), [getTasksByDate])

  const getPrioritySortValue = useCallback((p: string | null) => getPrioritySortValueHelper(p), [])
  const sortTasksByPriority = useCallback((list: Task[]) => sortTasksByPriorityHelper(list), [])

  const areDependenciesMet = useCallback((task: Task): boolean => {
    return areDependenciesMetHelper(task, tasks)
  }, [tasks])

  const getBlockingTasks = useCallback((task: Task): Task[] => {
    if (!task.dependsOn?.length) return []
    return task.dependsOn.map(id => tasks.find(t => t.id === id)).filter((t): t is Task => t !== undefined && !t.completed)
  }, [tasks])

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.completed).length
  const overallPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const todayCompleted = useMemo(() => todayTasks.filter(t => t.completed).length, [todayTasks])
  const todayTotal = todayTasks.length
  const todayPercent = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0
  const totalMinutesCompleted = tasks.filter(t => t.completed).reduce((s, t) => s + (t.duration || 0), 0)

  const topicStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number }> = {}
    tasks.forEach(t => {
      if (!stats[t.topic]) stats[t.topic] = { total: 0, completed: 0 }
      stats[t.topic].total++
      if (t.completed) stats[t.topic].completed++
    })
    return stats
  }, [tasks])

  // ── Streak ────────────────────────────────────────────────────────────────

  const streakData = useMemo(() => computeStreak(tasks, getToday()), [tasks])

  // ── Heatmap ───────────────────────────────────────────────────────────────

  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {}
    tasks.forEach(t => { if (t.completed) map[t.date] = (map[t.date] || 0) + 1 })
    return Object.entries(map).map(([date, count]) => ({ date, count }))
  }, [tasks])

  // ── Recent completions ────────────────────────────────────────────────────

  const recentCompletedTasks = useMemo(() =>
    tasks.filter(t => t.completed && t.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 10)
    , [tasks])

  // ── Time Tracking Analytics ───────────────────────────────────────────────

  const timeTrackingStats = useMemo(() => computeTimeTrackingStats(tasks), [tasks])

  // ── Best Hours ────────────────────────────────────────────────────────────

  const bestHoursAnalysis = useMemo(() => computeBestHours(tasks), [tasks])

  // ── Topic Balance ─────────────────────────────────────────────────────────

  const topicBalanceAnalysis = useMemo(() => computeTopicBalance(tasks), [tasks])

  // ── Productivity Score ────────────────────────────────────────────────────

  const productivityScore = useMemo(
    () => computeProductivityScore(tasks, goals, getToday(), streakData.current, overallPercent),
    [streakData.current, overallPercent, tasks, goals.dailyTaskTarget],
  )

  // ── Goal progress ──────────────────────────────────────────────────────────

  const dailyGoalProgress = useMemo(
    () => computeDailyGoalProgress(goals, todayCompleted),
    [goals.dailyTaskTarget, todayCompleted],
  )

  const extraGoalsProgress = useMemo(
    () => computeExtraGoalsProgress(todayTasks, goals),
    [goals.extraGoals, todayTasks],
  )

  // ── Reports & Charts ───────────────────────────────────────────────────────

  const getWeeklyReport = useCallback((weeksAgo = 0) => computeWeeklyReport(tasks, new Date(), weeksAgo), [tasks])

  const getMonthlyReport = useCallback((monthsAgo = 0) => {
    const d = new Date(); d.setMonth(d.getMonth() - monthsAgo)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]
    const month = tasks.filter(t => t.date >= startStr && t.date <= endStr)
    const done = month.filter(t => t.completed)
    return { monthName: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), startDate: startStr, endDate: endStr, totalTasks: month.length, completedTasks: done.length, completionRate: month.length > 0 ? Math.round(done.length / month.length * 100) : 0, totalMinutes: done.reduce((s, t) => s + (t.duration || 0), 0) }
  }, [tasks])

  const getChartData = useCallback((days = 30) => computeChartData(tasks, getToday(), days), [tasks])

  const thisWeekReport = useMemo(() => getWeeklyReport(0), [getWeeklyReport])
  const lastWeekReport = useMemo(() => getWeeklyReport(1), [getWeeklyReport])
  const thisMonthReport = useMemo(() => getMonthlyReport(0), [getMonthlyReport])
  const chartData30Days = useMemo(() => getChartData(30), [getChartData])

  // ── Reset ──────────────────────────────────────────────────────────────────

  const resetAllData = useCallback(async (): Promise<void> => {
    console.log('[useProgress] resetAllData called')
    console.log('[useProgress] userId:', userId, 'isGuest:', isGuest)
    console.log('[useProgress] tasks:', tasks.length, 'topics:', topics.length)

    // Capture current values before clearing state
    const currentTasks = [...tasks]
    const currentTopics = [...topics]
    const currentNotes = { ...notes }
    const currentTemplates = [...templates]
    const currentArchivedTasks = [...archivedTasks]

    // Clear local state immediately
    setTasks([])
    setTopics(DEFAULT_TOPICS)
    setNotes({})
    setGoals({ dailyTaskTarget: 3, extraGoals: [] })
    setTemplates([])
    setArchivedTasks([])
    setDeletedRecurringInstances(new Set())

    if (isGuest) {
      console.log('[useProgress] Guest mode - clearing AsyncStorage')
      await AsyncStorage.removeItem(GUEST_KEY)
      return
    }

    if (!userId) {
      console.log('[useProgress] No userId, skipping Firestore deletion')
      return
    }

    console.log('[useProgress] Deleting from Firestore...')

    // Firestore: delete all user docs in each collection
    // Use multiple batches to avoid 500 operation limit
    const uid = userId

    // Collect all delete operations using captured values
    const deleteOps: { collection: string; docId: string }[] = []
    currentTasks.forEach(t => deleteOps.push({ collection: 'tasks', docId: t.id }))
    currentTopics.forEach(t => deleteOps.push({ collection: 'topics', docId: t.id }))
    Object.keys(currentNotes).forEach(date => deleteOps.push({ collection: 'notes', docId: date }))
    currentTemplates.forEach(t => deleteOps.push({ collection: 'templates', docId: t.id }))
    currentArchivedTasks.forEach(t => deleteOps.push({ collection: 'archived_tasks', docId: t.id }))

    console.log('[useProgress] Total delete operations:', deleteOps.length)

    // Process in batches of 400 (leaving room for safety)
    const BATCH_SIZE = 400
    for (let i = 0; i < deleteOps.length; i += BATCH_SIZE) {
      const batch = writeBatch(db)
      const chunk = deleteOps.slice(i, i + BATCH_SIZE)
      chunk.forEach(op => batch.delete(doc(db, `users/${uid}/${op.collection}/${op.docId}`)))
      try {
        await batch.commit()
        console.log('[useProgress] Batch committed:', i, '-', i + chunk.length)
      } catch (err) {
        console.error('[useProgress] Batch error:', err)
        throw err
      }
    }

    // Delete goals and settings documents separately
    console.log('[useProgress] Deleting goals and settings...')
    await deleteDoc(doc(db, `users/${uid}/goals/daily`)).catch((err) => {
      console.log('[useProgress] goals/daily delete error (may not exist):', err)
    })
    await deleteDoc(doc(db, `users/${uid}/settings/deletedRecurringInstances`)).catch((err) => {
      console.log('[useProgress] deletedRecurringInstances delete error (may not exist):', err)
    })

    // Clear all caches
    console.log('[useProgress] Clearing caches...')
    await Promise.all([
      AsyncStorage.removeItem(CACHE_TASKS),
      AsyncStorage.removeItem(CACHE_TOPICS),
      AsyncStorage.removeItem(CACHE_NOTES),
      AsyncStorage.removeItem(CACHE_GOALS),
      AsyncStorage.removeItem(CACHE_TEMPLATES),
    ]).catch((err) => {
      console.error('[useProgress] Cache clear error:', err)
    })

    console.log('[useProgress] resetAllData complete')
  }, [userId, isGuest, tasks, topics, notes, templates, archivedTasks])

  // ── Task note (debounced) ─────────────────────────────────────────────────

  const noteDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const updateTaskNote = useCallback(async (taskId: string, note: string): Promise<void> => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, note } : t))
    if (isGuest || !userId) return
    if (noteDebounceRef.current[taskId]) clearTimeout(noteDebounceRef.current[taskId])
    noteDebounceRef.current[taskId] = setTimeout(async () => {
      try {
        await updateDoc(doc(db, `users/${userId}/tasks/${taskId}`), { note })
      } catch (err) {
        console.error('updateTaskNote error:', err)
      }
    }, 800)
  }, [userId, isGuest])

  // ── Export / Import (Task 6.5) ────────────────────────────────────────────

  /**
   * exportData — returns JSON string.
   * The calling screen is responsible for sharing via expo-sharing.
   * (Removed: document.createElement('a') blob download pattern)
   */
  const exportData = useCallback((): string => {
    const data = { version: 2, exportedAt: new Date().toISOString(), tasks, topics, notes, goals }
    return JSON.stringify(data, null, 2)
  }, [tasks, topics, notes, goals])

  /**
   * exportAsIcs — writes ICS to a temporary file and shares via expo-sharing.
   * (Removed: URL.createObjectURL + document.createElement('a') pattern)
   * Returns the number of exported tasks.
   */
  const exportAsIcs = useCallback(async (fromDate: string | null = null, toDate: string | null = null): Promise<number> => {
    const filtered = tasks.filter(t => {
      if (fromDate && t.date < fromDate) return false
      if (toDate && t.date > toDate) return false
      return true
    })

    const escIcs = (str = '') => str
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')

    const fmtDate = (dateStr: string, timeStr: string | null) => {
      const d = dateStr.replace(/-/g, '')
      if (!timeStr) return `${d}`
      const t = timeStr.replace(':', '') + '00'
      return `${d}T${t}`
    }

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Daily Planner//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ]

    filtered.forEach(task => {
      const uid = `${task.id}@daily-planner`
      const created = task.createdAt
        ? task.createdAt.replace(/[-:]/g, '').replace('.', '').slice(0, 15) + 'Z'
        : fmtDate(task.date, task.dueTime)

      const dtStart = task.dueTime
        ? `DTSTART:${fmtDate(task.date, task.dueTime)}`
        : `DTSTART;VALUE=DATE:${task.date.replace(/-/g, '')}`

      let dtEnd = ''
      if (task.dueTime) {
        const [h, m] = task.dueTime.split(':').map(Number)
        const totalMins = h * 60 + m + (task.duration || 30)
        const eh = String(Math.floor(totalMins / 60) % 24).padStart(2, '0')
        const em = String(totalMins % 60).padStart(2, '0')
        dtEnd = `DTEND:${task.date.replace(/-/g, '')}T${eh}${em}00`
      } else {
        dtEnd = `DTEND;VALUE=DATE:${task.date.replace(/-/g, '')}`
      }

      const statusLine = task.completed ? 'STATUS:COMPLETED' : 'STATUS:NEEDS-ACTION'
      const priority = task.priority === 'high' ? 'PRIORITY:1'
        : task.priority === 'medium' ? 'PRIORITY:5'
          : task.priority === 'low' ? 'PRIORITY:9'
            : 'PRIORITY:0'

      const descParts = [
        task.description && `Description: ${task.description}`,
        `Topic: ${task.topic}`,
        `Duration: ${fmtDuration(task.duration)}`,
        task.note && `Note: ${task.note}`,
      ].filter(Boolean).join('\\n')

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${created}`,
        dtStart,
        dtEnd,
        `SUMMARY:${escIcs(task.title)}`,
        `DESCRIPTION:${escIcs(descParts)}`,
        `CATEGORIES:${escIcs(task.topic)}`,
        priority,
        statusLine,
        'END:VEVENT',
      )
    })

    lines.push('END:VCALENDAR')

    const icsContent = lines.join('\r\n')
    const fileName = `planner-${fromDate || 'all'}-to-${toDate || 'all'}.ics`
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`

    // Write to temp file, then share
    await FileSystem.writeAsStringAsync(fileUri, icsContent, { encoding: FileSystem.EncodingType.UTF8 })
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'text/calendar', dialogTitle: 'Export Calendar' })
    }

    return filtered.length
  }, [tasks])

  /**
   * importFromIcs — parses an ICS string and returns candidate tasks.
   * Logic preserved verbatim from the original.
   */
  const importFromIcs = useCallback((icsString: string, existingTasks: Task[] = tasks) => {
    try {
      const unfolded = icsString.replace(/\r?\n[ \t]/g, '')
      const eventBlocks = unfolded.split('BEGIN:VEVENT')
        .slice(1)
        .map(b => b.split('END:VEVENT')[0])

      if (eventBlocks.length === 0) return { success: false, error: 'No events found in ICS file' }

      const getProp = (block: string, key: string): string => {
        const re = new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, 'im')
        const m = block.match(re)
        return m ? m[1].trim() : ''
      }

      const getParam = (block: string, key: string, param: string): string | null => {
        const re = new RegExp(`^${key};[^:]*${param}=([^;:]+)`, 'im')
        const m = block.match(re)
        return m ? m[1].trim() : null
      }

      const parseDt = (raw: string, tzid: string | null = null): { date: string; time: string | null; isAllDay: boolean } | null => {
        if (!raw) return null
        if (!raw.includes('T')) {
          const m = raw.match(/(\d{4})(\d{2})(\d{2})/)
          if (!m) return null
          return { date: `${m[1]}-${m[2]}-${m[3]}`, time: null, isAllDay: true }
        }
        if (raw.endsWith('Z')) {
          const m = raw.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/)
          if (!m) return null
          const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`)
          const localDate = d.toLocaleDateString('en-CA')
          const localH = String(d.getHours()).padStart(2, '0')
          const localM = String(d.getMinutes()).padStart(2, '0')
          return { date: localDate, time: `${localH}:${localM}`, isAllDay: false }
        }
        if (tzid) {
          try {
            const m = raw.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)
            if (!m) return null
            const isoLocal = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`
            const tzDate = new Date(new Date(isoLocal).toLocaleString('en-US', { timeZone: tzid }))
            const diff = new Date(isoLocal).getTime() - tzDate.getTime()
            const adjusted = new Date(new Date(isoLocal).getTime() - diff)
            const localDate = adjusted.toLocaleDateString('en-CA')
            const localH = String(adjusted.getHours()).padStart(2, '0')
            const localM = String(adjusted.getMinutes()).padStart(2, '0')
            return { date: localDate, time: `${localH}:${localM}`, isAllDay: false }
          } catch { /* fall through */ }
        }
        const m = raw.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/)
        if (!m) return null
        return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}`, isAllDay: false }
      }

      const parseRRule = (block: string): Task['recurrence'] => {
        const rrule = getProp(block, 'RRULE')
        if (!rrule) return 'none'
        const freq = rrule.match(/FREQ=(\w+)/i)?.[1]?.toUpperCase()
        const byDay = rrule.match(/BYDAY=([^;]+)/i)?.[1] || ''
        const wdSet = new Set(byDay.toUpperCase().split(',').map((s: string) => s.trim()))
        const weekdays = new Set(['MO', 'TU', 'WE', 'TH', 'FR'])
        if (freq === 'DAILY') return 'daily'
        if (freq === 'WEEKLY') {
          if (wdSet.size > 0 && [...wdSet].every((d: string) => weekdays.has(d)) && wdSet.size === 5) return 'weekdays'
          return 'weekly'
        }
        return 'none'
      }

      const unescape = (s = '') => s
        .replace(/\\n/g, '\n').replace(/\\N/g, '\n')
        .replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')

      const calendarCategories = new Set<string>()
      const parsedTasks: Array<Record<string, unknown>> = []

      eventBlocks.forEach((block, idx) => {
        const summary = unescape(getProp(block, 'SUMMARY'))
        if (!summary) return

        const dtStartRaw = getProp(block, 'DTSTART')
        const dtStartTzid = getParam(block, 'DTSTART', 'TZID')
        const dtEndRaw = getProp(block, 'DTEND')

        const start = parseDt(dtStartRaw, dtStartTzid)
        const end = parseDt(dtEndRaw, dtStartTzid)

        if (!start) return

        let duration = start.isAllDay ? 60 : 30
        if (start && end && !start.isAllDay && !end.isAllDay && start.time && end.time) {
          const [sh, sm] = start.time.split(':').map(Number)
          const [eh, em] = end.time.split(':').map(Number)
          const startMins = sh * 60 + sm
          let endMins = eh * 60 + em
          if (endMins < startMins) endMins += 24 * 60
          const diff = endMins - startMins
          if (diff > 0 && diff <= 480) duration = diff
          else if (diff > 0) duration = 120
        }

        const durationProp = getProp(block, 'DURATION')
        if (durationProp && duration === 30) {
          const h = parseInt(durationProp.match(/(\d+)H/)?.[1] || '0')
          const m = parseInt(durationProp.match(/(\d+)M/)?.[1] || '0')
          if (h || m) duration = h * 60 + m
        }

        const priority = (() => {
          const p = parseInt(getProp(block, 'PRIORITY'))
          if (p >= 1 && p <= 4) return 'high'
          if (p === 5) return 'medium'
          if (p >= 6 && p <= 9) return 'low'
          return null
        })()

        const categories = getProp(block, 'CATEGORIES')
        if (categories) calendarCategories.add(categories.split(',')[0].trim())

        const status = getProp(block, 'STATUS')
        const completed = status === 'COMPLETED'
        const recurrence = parseRRule(block)

        const rawDesc = unescape(getProp(block, 'DESCRIPTION'))
        const description = rawDesc
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
          .replace(/https?:\/\/[^\s<>]*/g, '')
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 2)
          .filter((l: string) => !/^(Meeting ID|Passcode|Join|For organizers|Microsoft Teams|Need help|[\-_=]{3,})/i.test(l))
          .slice(0, 3)
          .join(' ')
          .trim()
          .slice(0, 200)

        const icsUid = getProp(block, 'UID') || `ics-${idx}`

        const isDuplicate = existingTasks.some(t =>
          t.title.toLowerCase() === summary.toLowerCase() && t.date === start.date
        )

        parsedTasks.push({
          _uid: icsUid,
          _isAllDay: start.isAllDay,
          _isDuplicate: isDuplicate,
          _categories: categories ? categories.split(',')[0].trim() : '',
          title: summary,
          description,
          date: start.date,
          dueTime: start.isAllDay ? null : (start.time || null),
          duration,
          priority,
          topic: 'Personal',
          completed,
          recurrence,
          subtasks: [],
        })
      })

      return {
        success: true,
        tasks: parsedTasks,
        calendarCategories: Array.from(calendarCategories),
        total: parsedTasks.length,
        duplicates: parsedTasks.filter(t => t._isDuplicate).length,
      }
    } catch (err) {
      return { success: false, error: `Failed to parse ICS: ${(err as Error).message}` }
    }
  }, [tasks])

  const confirmImportFromIcs = useCallback(async (parsedTasks: Array<Partial<Task> & { title: string }>): Promise<number> => {
    const added = []
    for (const t of parsedTasks) {
      const task = await addTask(t)
      added.push(task)
    }
    return added.length
  }, [addTask])

  const importData = useCallback(async (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString)
      if (!data.tasks || !Array.isArray(data.tasks)) return { success: false, error: 'Invalid file: missing tasks array' }
      if (!data.topics || !Array.isArray(data.topics)) return { success: false, error: 'Invalid file: missing topics array' }
      for (const t of data.tasks) {
        if (!t.id || !t.title || !t.date) return { success: false, error: 'Invalid file: tasks missing required fields' }
      }

      if (!isGuest && userId) {
        const uid = userId
        const batch = writeBatch(db)
        // Delete existing
        tasks.forEach(t => batch.delete(doc(db, `users/${uid}/tasks/${t.id}`)))
        topics.forEach(t => batch.delete(doc(db, `users/${uid}/topics/${t.id}`)))
        Object.keys(notes).forEach(date => batch.delete(doc(db, `users/${uid}/notes/${date}`)))
        await batch.commit()

        // Insert imported
        const batch2 = writeBatch(db)
        data.tasks.forEach((t: Task) => batch2.set(doc(db, `users/${uid}/tasks/${t.id}`), taskToDoc(t, uid)))
        data.topics.forEach((t: Topic) => batch2.set(doc(db, `users/${uid}/topics/${t.id}`), topicToDoc(t, uid)))
        if (data.notes && typeof data.notes === 'object') {
          Object.entries(data.notes as Record<string, string>).filter(([, v]) => v?.trim()).forEach(([date, content]) => {
            const noteObj: Note = { id: date, date, content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            batch2.set(doc(db, `users/${uid}/notes/${date}`), noteToDoc(noteObj, uid))
          })
        }
        if (data.goals && typeof data.goals === 'object') {
          const g = data.goals as GoalsState
          const goalsObj: Goals = { primaryGoal: g.dailyTaskTarget || 3, extraGoals: g.extraGoals ?? [], updatedAt: new Date().toISOString() }
          batch2.set(doc(db, `users/${uid}/goals/daily`), goalsToDoc(goalsObj, uid))
        }
        await batch2.commit()
      }

      setTasks(data.tasks)
      setTopics(data.topics)
      if (data.notes) setNotes(data.notes)
      if (data.goals) setGoals(data.goals)

      return { success: true, tasksCount: data.tasks.length, topicsCount: data.topics.length }
    } catch {
      return { success: false, error: 'Invalid JSON file' }
    }
  }, [userId, isGuest, tasks, topics, notes])

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    dataLoading,
    // Tasks
    tasks, addTask, updateTask, deleteTask, toggleTaskComplete, reorderTasks, getTasksByDate, getTasksInRange, todayTasks,
    updateTaskNote,
    // Priority & Dependencies
    sortTasksByPriority, areDependenciesMet, getBlockingTasks,
    // Bulk actions
    bulkCompleteTasks, bulkUncompleteTasks, bulkDeleteTasks, bulkMoveTasks,
    // Templates
    templates, addTemplate, deleteTemplate, createTaskFromTemplate,
    // Subtasks
    addSubtask, updateSubtask, deleteSubtask, toggleSubtaskComplete,
    // Notes
    notes, getNote, setNote, updateNote, todayNote,
    // Goals
    goals, setDailyGoal: setGoals_inner, setGoals: setGoals_export, dailyGoalProgress, extraGoalsProgress, addExtraGoal, removeExtraGoal,
    // Topics
    topics, addTopic, updateTopic, deleteTopic, removeTopic, getTopicColor,
    // Stats
    totalTasks, completedTasks, overallPercent, todayCompleted, todayTotal, todayPercent, totalMinutesCompleted, topicStats,
    // Time tracking
    setActualDuration, timeTrackingStats,
    // Analytics
    bestHoursAnalysis, topicBalanceAnalysis,
    // Streak
    streakData,
    // Productivity
    productivityScore,
    // Heatmap
    heatmapData,
    // Reports & Charts
    getWeeklyReport, getMonthlyReport, thisWeekReport, lastWeekReport, thisMonthReport, chartData30Days, getChartData,
    // Recent
    recentCompletedTasks,
    // Undo/Redo
    undo, redo, canUndo: undoHistory.length > 0, canRedo: redoHistory.length > 0,
    // Archive
    archivedTasks, archiveTask, restoreTask, deleteArchivedTask, archiveCompletedTasks,
    // Rollover
    rolloverOverdueTasks,
    // Reset
    resetAllData,
    // Export/Import
    exportData, importData, exportAsIcs, importFromIcs, confirmImportFromIcs,
  }
}
