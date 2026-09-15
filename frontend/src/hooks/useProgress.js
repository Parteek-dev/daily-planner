import { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

/*
  Generic Task Schema (mirrors Supabase columns, camelCase in JS):
  {
    id: string,
    title: string,
    description: string,
    topic: string,
    duration: number (minutes),
    actualDuration: number | null,
    date: string (YYYY-MM-DD),
    dueTime: string | null,
    completed: boolean,
    completedAt: string | null (ISO),
    createdAt: string (ISO),
    priority: 'high' | 'medium' | 'low' | null,
    dependsOn: string[],
    subtasks: [{id, title, completed}],
    recurrence: 'none'|'daily'|'weekly'|'weekdays'|'custom',
    recurrenceEndDate: string | null,
    recurrenceParentId: string | null,
    customRecurrenceDays: number[] | null,
  }
*/

// ── Priority config (exported so pages can use it) ──────────────────────────
export const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' },
  medium: { label: 'Medium', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)' },
  low:    { label: 'Low',    color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)' },
}

const DEFAULT_TOPICS = [
  { name: 'Learning', color: '#3b82f6' },
  { name: 'Work',     color: '#22c55e' },
  { name: 'Health',   color: '#f97316' },
  { name: 'Personal', color: '#a855f7' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function getDayOfWeek(dateStr) {
  return new Date(dateStr).getDay()
}

// Convert a Supabase row (snake_case) → JS object (camelCase)
function rowToTask(row) {
  return {
    id:                   row.id,
    title:                row.title,
    description:          row.description ?? '',
    topic:                row.topic ?? 'Personal',
    duration:             row.duration ?? 30,
    actualDuration:       row.actual_duration ?? null,
    date:                 row.date,
    originalDate:         row.original_date ?? null,
    dueTime:              row.due_time ?? null,
    completed:            row.completed ?? false,
    completedAt:          row.completed_at ?? null,
    createdAt:            row.created_at,
    note:                 row.note ?? '',
    priority:             row.priority ?? null,
    dependsOn:            row.depends_on ?? [],
    subtasks:             row.subtasks ?? [],
    recurrence:           row.recurrence ?? 'none',
    recurrenceEndDate:    row.recurrence_end_date ?? null,
    recurrenceParentId:   row.recurrence_parent_id ?? null,
    customRecurrenceDays: row.custom_recurrence_days ?? null,
  }
}

// Convert JS task object → Supabase row (snake_case), stripping userId (added at call site)
function taskToRow(task, userId) {
  return {
    id:                    task.id,
    user_id:               userId,
    title:                 task.title,
    description:           task.description ?? '',
    topic:                 task.topic ?? 'Personal',
    duration:              task.duration ?? 30,
    actual_duration:       task.actualDuration ?? null,
    date:                  task.date,
    original_date:         task.originalDate ?? null,
    due_time:              task.dueTime ?? null,
    completed:             task.completed ?? false,
    completed_at:          task.completedAt ?? null,
    note:                  task.note ?? '',
    priority:              task.priority ?? null,
    depends_on:            task.dependsOn ?? [],
    subtasks:              task.subtasks ?? [],
    recurrence:            task.recurrence ?? 'none',
    recurrence_end_date:   task.recurrenceEndDate ?? null,
    recurrence_parent_id:  task.recurrenceParentId ?? null,
    custom_recurrence_days: task.customRecurrenceDays ?? null,
  }
}

function rowToArchivedTask(row) {
  return { ...rowToTask(row), archivedAt: row.archived_at ?? null }
}

function rowToTemplate(row) {
  return {
    id:                   row.id,
    name:                 row.name,
    title:                row.title,
    description:          row.description ?? '',
    topic:                row.topic ?? 'Personal',
    duration:             row.duration ?? 30,
    dueTime:              row.due_time ?? null,
    subtasks:             row.subtasks ?? [],
    recurrence:           row.recurrence ?? 'none',
    customRecurrenceDays: row.custom_recurrence_days ?? null,
    createdAt:            row.created_at,
  }
}

function shouldCreateRecurringTask(task, dateStr) {
  const dayOfWeek = getDayOfWeek(dateStr)
  switch (task.recurrence) {
    case 'daily':    return true
    case 'weekly':   return getDayOfWeek(task.date) === dayOfWeek
    case 'weekdays': return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'custom':   return task.customRecurrenceDays?.includes(dayOfWeek) || false
    default:         return false
  }
}

// ── Main hook ────────────────────────────────────────────────────────────────

export function useProgress(userId) {
  // ── Local state (mirrors what's in Supabase) ─────────────────────────────
  const [tasks,         setTasks]         = useState([])
  const [topics,        setTopics]        = useState(DEFAULT_TOPICS)
  const [notes,         setNotes]         = useState({})  // { 'YYYY-MM-DD': 'text' }
  const [goals,         setGoals]         = useState({ dailyTaskTarget: 3 })
  const [templates,     setTemplates]     = useState([])
  const [archivedTasks, setArchivedTasks] = useState([])
  const [dataLoading,   setDataLoading]   = useState(true)

  // ── Undo / Redo ──────────────────────────────────────────────────────────
  const [undoHistory, setUndoHistory] = useState([])
  const [redoHistory, setRedoHistory] = useState([])
  const isUndoingRef = useRef(false)

  const pushUndo = useCallback((action) => {
    if (isUndoingRef.current) return
    setUndoHistory(prev => [...prev.slice(-49), action])
    setRedoHistory([])
  }, [])

  // ── Initial data load ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function loadAll() {
      setDataLoading(true)
      const [
        { data: tasksData },
        { data: topicsData },
        { data: notesData },
        { data: goalsData },
        { data: templatesData },
        { data: archivedData },
      ] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('topics').select('*').eq('user_id', userId),
        supabase.from('notes').select('*').eq('user_id', userId),
        supabase.from('goals').select('*').eq('user_id', userId).single(),
        supabase.from('templates').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('archived_tasks').select('*').eq('user_id', userId).order('archived_at', { ascending: false }),
      ])

      if (cancelled) return

      if (tasksData)    setTasks(tasksData.map(rowToTask))
      if (topicsData && topicsData.length > 0) setTopics(topicsData.map(r => ({ name: r.name, color: r.color })))
      if (notesData)    setNotes(Object.fromEntries(notesData.map(r => [r.date, r.content])))
      if (goalsData)    setGoals({ 
        dailyTaskTarget: goalsData.daily_task_target ?? 3,
        extraGoals: goalsData.extra_goals ?? [],
      })
      if (templatesData) setTemplates(templatesData.map(rowToTemplate))
      if (archivedData)  setArchivedTasks(archivedData.map(rowToArchivedTask))

      setDataLoading(false)
    }

    loadAll()
    return () => { cancelled = true }
  }, [userId])

  // ── Recurring task generation on load ───────────────────────────────────
  useEffect(() => {
    if (!userId || dataLoading || tasks.length === 0) return

    const today = getToday()
    const newTasks = []

    tasks.forEach(task => {
      if (!task.recurrence || task.recurrence === 'none') return
      if (task.recurrenceParentId) return

      const endDate = task.recurrenceEndDate || addDays(today, 30)
      let checkDate = addDays(task.date, 1)

      while (checkDate <= endDate && checkDate <= addDays(today, 7)) {
        if (shouldCreateRecurringTask(task, checkDate)) {
          const exists = tasks.some(t => t.recurrenceParentId === task.id && t.date === checkDate)
          if (!exists) {
            newTasks.push({
              id:                   generateId(),
              title:                task.title,
              description:          task.description,
              topic:                task.topic,
              duration:             task.duration,
              actualDuration:       null,
              date:                 checkDate,
              dueTime:              null,
              completed:            false,
              completedAt:          null,
              createdAt:            new Date().toISOString(),
              priority:             null,
              dependsOn:            [],
              subtasks:             task.subtasks?.map(s => ({ ...s, id: generateId(), completed: false })) || [],
              recurrence:           'none',
              recurrenceEndDate:    null,
              recurrenceParentId:   task.id,
              customRecurrenceDays: null,
            })
          }
        }
        checkDate = addDays(checkDate, 1)
      }
    })

    if (newTasks.length > 0) {
      const rows = newTasks.map(t => taskToRow(t, userId))
      supabase.from('tasks').insert(rows).then(({ error }) => {
        if (!error) setTasks(prev => [...prev, ...newTasks])
      })
    }
  }, [dataLoading]) // only run once after initial load

  // ── Task CRUD ────────────────────────────────────────────────────────────

  const addTask = useCallback(async (taskData) => {
    const taskDate = taskData.date || getToday()
    const newTask = {
      id:                   generateId(),
      title:                taskData.title,
      description:          taskData.description || '',
      topic:                taskData.topic || 'Personal',
      duration:             taskData.duration || 30,
      actualDuration:       null,
      date:                 taskDate,
      originalDate:         taskDate,          // set once, never changes
      dueTime:              taskData.dueTime || null,
      priority:             taskData.priority || null,
      dependsOn:            taskData.dependsOn || [],
      completed:            false,
      completedAt:          null,
      createdAt:            new Date().toISOString(),
      note:                 '',
      subtasks:             taskData.subtasks || [],
      recurrence:           taskData.recurrence || 'none',
      recurrenceEndDate:    taskData.recurrenceEndDate || null,
      recurrenceParentId:   null,
      customRecurrenceDays: taskData.customRecurrenceDays || null,
    }

    // Optimistic update
    setTasks(prev => [...prev, newTask])
    pushUndo({ type: 'ADD_TASK', taskId: newTask.id, task: newTask })

    const { error } = await supabase.from('tasks').insert(taskToRow(newTask, userId))
    if (error) {
      console.error('addTask error:', error)
      setTasks(prev => prev.filter(t => t.id !== newTask.id))
    }
    return newTask
  }, [userId, pushUndo])

  const updateTask = useCallback(async (taskId, updates) => {
    // If date is being changed and originalDate not yet set, preserve the current date as originalDate
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const newUpdates = { ...updates }
      if ('date' in updates && updates.date !== t.date && !t.originalDate) {
        newUpdates.originalDate = t.date
      }
      return { ...t, ...newUpdates }
    }))

    // Build snake_case patch for Supabase
    const patch = {}
    if ('title'                 in updates) patch.title                  = updates.title
    if ('description'           in updates) patch.description            = updates.description
    if ('topic'                 in updates) patch.topic                  = updates.topic
    if ('duration'              in updates) patch.duration               = updates.duration
    if ('actualDuration'        in updates) patch.actual_duration        = updates.actualDuration
    if ('date'                  in updates) patch.date                   = updates.date
    if ('dueTime'               in updates) patch.due_time               = updates.dueTime
    if ('completed'             in updates) patch.completed              = updates.completed
    if ('completedAt'           in updates) patch.completed_at           = updates.completedAt
    if ('priority'              in updates) patch.priority               = updates.priority
    if ('dependsOn'             in updates) patch.depends_on             = updates.dependsOn
    if ('subtasks'              in updates) patch.subtasks               = updates.subtasks
    if ('recurrence'            in updates) patch.recurrence             = updates.recurrence
    if ('recurrenceEndDate'     in updates) patch.recurrence_end_date    = updates.recurrenceEndDate
    if ('recurrenceParentId'    in updates) patch.recurrence_parent_id   = updates.recurrenceParentId
    if ('customRecurrenceDays'  in updates) patch.custom_recurrence_days = updates.customRecurrenceDays
    if ('note'                  in updates) patch.note                   = updates.note

    // Also persist originalDate if we just set it
    const existingTask = tasks.find(t => t.id === taskId)
    if ('date' in updates && updates.date !== existingTask?.date && !existingTask?.originalDate) {
      patch.original_date = existingTask?.date ?? null
    }

    const { error } = await supabase.from('tasks').update(patch).eq('id', taskId).eq('user_id', userId)
    if (error) console.error('updateTask error:', error)
  }, [userId, tasks])

  const deleteTask = useCallback(async (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) pushUndo({ type: 'DELETE_TASK', task })

    setTasks(prev => prev.filter(t => t.id !== taskId))

    const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId)
    if (error) {
      console.error('deleteTask error:', error)
      if (task) setTasks(prev => [...prev, task])
    }
  }, [tasks, userId, pushUndo])

  const toggleTaskComplete = useCallback(async (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    pushUndo({ type: 'COMPLETE_TASK', taskId, wasCompleted: task.completed, wasCompletedAt: task.completedAt })

    const completed = !task.completed
    const completedAt = completed ? new Date().toISOString() : null
    const subtasks = task.subtasks?.map(s => ({ ...s, completed })) || []

    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed, completedAt, subtasks } : t
    ))

    const { error } = await supabase.from('tasks').update({
      completed,
      completed_at: completedAt,
      subtasks,
    }).eq('id', taskId).eq('user_id', userId)

    if (error) console.error('toggleTaskComplete error:', error)
  }, [tasks, userId, pushUndo])

  const setActualDuration = useCallback(async (taskId, minutes) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, actualDuration: minutes } : t))
    const { error } = await supabase.from('tasks').update({ actual_duration: minutes }).eq('id', taskId).eq('user_id', userId)
    if (error) console.error('setActualDuration error:', error)
  }, [userId])

  // ── Subtasks ─────────────────────────────────────────────────────────────

  const addSubtask = useCallback(async (taskId, subtaskTitle) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const newSubtask = { id: generateId(), title: subtaskTitle, completed: false }
    const newSubtasks = [...(task.subtasks || []), newSubtask]
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks } : t))
    await supabase.from('tasks').update({ subtasks: newSubtasks }).eq('id', taskId).eq('user_id', userId)
  }, [tasks, userId])

  const updateSubtask = useCallback(async (taskId, subtaskId, updates) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const newSubtasks = task.subtasks?.map(s => s.id === subtaskId ? { ...s, ...updates } : s) || []
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks } : t))
    await supabase.from('tasks').update({ subtasks: newSubtasks }).eq('id', taskId).eq('user_id', userId)
  }, [tasks, userId])

  const deleteSubtask = useCallback(async (taskId, subtaskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const newSubtasks = task.subtasks?.filter(s => s.id !== subtaskId) || []
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks } : t))
    await supabase.from('tasks').update({ subtasks: newSubtasks }).eq('id', taskId).eq('user_id', userId)
  }, [tasks, userId])

  const toggleSubtaskComplete = useCallback(async (taskId, subtaskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const newSubtasks = task.subtasks?.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    ) || []
    const allDone = newSubtasks.length > 0 && newSubtasks.every(s => s.completed)
    const completed  = allDone ? true : task.completed
    const completedAt = allDone && !task.completed ? new Date().toISOString() : task.completedAt

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks, completed, completedAt } : t))
    await supabase.from('tasks').update({
      subtasks: newSubtasks,
      completed,
      completed_at: completedAt,
    }).eq('id', taskId).eq('user_id', userId)
  }, [tasks, userId])

  // ── Reorder ──────────────────────────────────────────────────────────────

  const reorderTasks = useCallback((date, reorderedIds) => {
    setTasks(prev => {
      const dateTasks = reorderedIds.map(id => prev.find(t => t.id === id)).filter(Boolean)
      const otherTasks = prev.filter(t => t.date !== date)
      return [...otherTasks, ...dateTasks]
    })
    // No DB call needed for display order — order is by created_at which stays stable
  }, [])

  // ── Archive ──────────────────────────────────────────────────────────────

  const archiveTask = useCallback(async (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    pushUndo({ type: 'ARCHIVE_TASK', task })

    const archivedTask = { ...task, archivedAt: new Date().toISOString() }
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setArchivedTasks(prev => [archivedTask, ...prev])

    // Insert into archived_tasks then delete from tasks
    await supabase.from('archived_tasks').insert({
      ...taskToRow(task, userId),
      archived_at: archivedTask.archivedAt,
    })
    await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId)
  }, [tasks, userId, pushUndo])

  const restoreTask = useCallback(async (taskId) => {
    const archived = archivedTasks.find(t => t.id === taskId)
    if (!archived) return
    pushUndo({ type: 'RESTORE_TASK', task: archived })

    const { archivedAt, ...taskData } = archived
    setArchivedTasks(prev => prev.filter(t => t.id !== taskId))
    setTasks(prev => [...prev, taskData])

    await supabase.from('tasks').insert(taskToRow(taskData, userId))
    await supabase.from('archived_tasks').delete().eq('id', taskId).eq('user_id', userId)
  }, [archivedTasks, userId, pushUndo])

  const deleteArchivedTask = useCallback(async (taskId) => {
    setArchivedTasks(prev => prev.filter(t => t.id !== taskId))
    await supabase.from('archived_tasks').delete().eq('id', taskId).eq('user_id', userId)
  }, [userId])

  const archiveCompletedTasks = useCallback(async (olderThanDays = 7) => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - olderThanDays)

    const toArchive = tasks.filter(t =>
      t.completed && t.completedAt && new Date(t.completedAt) < cutoff
    )
    if (toArchive.length === 0) return

    const now = new Date().toISOString()
    const archivedRows = toArchive.map(t => ({
      ...taskToRow(t, userId),
      archived_at: now,
    }))

    setTasks(prev => prev.filter(t => !toArchive.some(a => a.id === t.id)))
    setArchivedTasks(prev => [
      ...toArchive.map(t => ({ ...t, archivedAt: now })),
      ...prev,
    ])

    await supabase.from('archived_tasks').insert(archivedRows)
    await supabase.from('tasks').delete().in('id', toArchive.map(t => t.id))
  }, [tasks, userId])

  // ── Topics ───────────────────────────────────────────────────────────────

  const addTopic = useCallback(async (name, color) => {
    if (topics.find(t => t.name.toLowerCase() === name.toLowerCase())) return false
    const newTopic = { name, color }
    setTopics(prev => [...prev, newTopic])
    const { error } = await supabase.from('topics').insert({ user_id: userId, name, color })
    if (error) {
      console.error('addTopic error:', error)
      setTopics(prev => prev.filter(t => t.name !== name))
      return false
    }
    return true
  }, [topics, userId])

  const removeTopic = useCallback(async (name) => {
    setTopics(prev => prev.filter(t => t.name !== name))
    await supabase.from('topics').delete().eq('user_id', userId).eq('name', name)
  }, [userId])

  const getTopicColor = useCallback((topicName) => {
    const topic = topics.find(t => t.name === topicName)
    return topic?.color || '#64748b'
  }, [topics])

  // ── Notes ────────────────────────────────────────────────────────────────

  const getNote = useCallback((date) => notes[date] || '', [notes])

  const setNote = useCallback(async (date, text) => {
    const trimmed = text?.trim() ?? ''
    setNotes(prev => {
      if (!trimmed) {
        const { [date]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [date]: trimmed }
    })

    if (trimmed) {
      await supabase.from('notes').upsert(
        { user_id: userId, date, content: trimmed },
        { onConflict: 'user_id,date' }
      )
    } else {
      await supabase.from('notes').delete().eq('user_id', userId).eq('date', date)
    }
  }, [userId])

  const todayNote = useMemo(() => getNote(getToday()), [getNote])

  // ── Goals ─────────────────────────────────────────────────────────────────

  const setDailyGoal = useCallback(async (target) => {
    const val = Math.max(1, target)
    setGoals(prev => ({ ...prev, dailyTaskTarget: val }))
    await supabase.from('goals').upsert(
      { user_id: userId, daily_task_target: val, extra_goals: goals.extraGoals ?? [] },
      { onConflict: 'user_id' }
    )
  }, [userId, goals.extraGoals])

  const addExtraGoal = useCallback(async (goalData) => {
    const newGoal = { id: generateId(), ...goalData }
    const next = [...(goals.extraGoals ?? []), newGoal]
    setGoals(prev => ({ ...prev, extraGoals: next }))
    await supabase.from('goals').upsert(
      { user_id: userId, daily_task_target: goals.dailyTaskTarget ?? 3, extra_goals: next },
      { onConflict: 'user_id' }
    )
  }, [userId, goals])

  const removeExtraGoal = useCallback(async (goalId) => {
    const next = (goals.extraGoals ?? []).filter(g => g.id !== goalId)
    setGoals(prev => ({ ...prev, extraGoals: next }))
    await supabase.from('goals').upsert(
      { user_id: userId, daily_task_target: goals.dailyTaskTarget ?? 3, extra_goals: next },
      { onConflict: 'user_id' }
    )
  }, [userId, goals])

  // ── Templates ────────────────────────────────────────────────────────────

  const addTemplate = useCallback(async (templateData) => {
    const tmpl = {
      id:                   generateId(),
      name:                 templateData.name,
      title:                templateData.title,
      description:          templateData.description || '',
      topic:                templateData.topic || 'Personal',
      duration:             templateData.duration || 30,
      dueTime:              templateData.dueTime || null,
      subtasks:             templateData.subtasks || [],
      recurrence:           templateData.recurrence || 'none',
      customRecurrenceDays: templateData.customRecurrenceDays || null,
      createdAt:            new Date().toISOString(),
    }
    setTemplates(prev => [...prev, tmpl])
    await supabase.from('templates').insert({
      id:                     tmpl.id,
      user_id:                userId,
      name:                   tmpl.name,
      title:                  tmpl.title,
      description:            tmpl.description,
      topic:                  tmpl.topic,
      duration:               tmpl.duration,
      due_time:               tmpl.dueTime,
      subtasks:               tmpl.subtasks,
      recurrence:             tmpl.recurrence,
      custom_recurrence_days: tmpl.customRecurrenceDays,
    })
    return tmpl
  }, [userId])

  const deleteTemplate = useCallback(async (templateId) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId))
    await supabase.from('templates').delete().eq('id', templateId).eq('user_id', userId)
  }, [userId])

  const createTaskFromTemplate = useCallback((templateId, date) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return null
    return addTask({
      title:                template.title,
      description:          template.description,
      topic:                template.topic,
      duration:             template.duration,
      dueTime:              template.dueTime,
      date:                 date || getToday(),
      subtasks:             template.subtasks?.map(s => ({ ...s, id: generateId(), completed: false })) || [],
      recurrence:           template.recurrence,
      customRecurrenceDays: template.customRecurrenceDays,
    })
  }, [templates, addTask])

  // ── Bulk actions ──────────────────────────────────────────────────────────

  const bulkCompleteTasks = useCallback(async (taskIds) => {
    const previousStates = tasks
      .filter(t => taskIds.includes(t.id))
      .map(t => ({ id: t.id, completed: t.completed, completedAt: t.completedAt }))

    if (previousStates.length > 0) pushUndo({ type: 'BULK_COMPLETE', taskIds, previousStates })

    const now = new Date().toISOString()
    setTasks(prev => prev.map(t => {
      if (!taskIds.includes(t.id) || t.completed) return t
      return { ...t, completed: true, completedAt: now, subtasks: t.subtasks?.map(s => ({ ...s, completed: true })) || [] }
    }))

    // Update in batches
    for (const taskId of taskIds) {
      const task = tasks.find(t => t.id === taskId)
      if (!task || task.completed) continue
      await supabase.from('tasks').update({
        completed: true,
        completed_at: now,
        subtasks: task.subtasks?.map(s => ({ ...s, completed: true })) || [],
      }).eq('id', taskId).eq('user_id', userId)
    }
  }, [tasks, userId, pushUndo])

  const bulkDeleteTasks = useCallback(async (taskIds) => {
    const tasksToDelete = tasks.filter(t => taskIds.includes(t.id))
    if (tasksToDelete.length > 0) pushUndo({ type: 'BULK_DELETE', tasks: tasksToDelete })

    setTasks(prev => prev.filter(t => !taskIds.includes(t.id)))
    await supabase.from('tasks').delete().in('id', taskIds)
  }, [tasks, pushUndo])

  const bulkMoveTasks = useCallback(async (taskIds, newDate) => {
    setTasks(prev => prev.map(t => taskIds.includes(t.id) ? { ...t, date: newDate } : t))
    for (const taskId of taskIds) {
      await supabase.from('tasks').update({ date: newDate }).eq('id', taskId).eq('user_id', userId)
    }
  }, [userId])

  const bulkUncompleteTasks = useCallback(async (taskIds) => {
    setTasks(prev => prev.map(t => {
      if (!taskIds.includes(t.id) || !t.completed) return t
      return { ...t, completed: false, completedAt: null, subtasks: t.subtasks?.map(s => ({ ...s, completed: false })) || [] }
    }))
    for (const taskId of taskIds) {
      await supabase.from('tasks').update({ completed: false, completed_at: null }).eq('id', taskId).eq('user_id', userId)
    }
  }, [userId])

  // ── Undo / Redo ──────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    if (undoHistory.length === 0) return null
    isUndoingRef.current = true
    const action = undoHistory[undoHistory.length - 1]
    setUndoHistory(prev => prev.slice(0, -1))
    setRedoHistory(prev => [...prev, action])

    switch (action.type) {
      case 'DELETE_TASK':    setTasks(prev => [...prev, action.task]); break
      case 'ADD_TASK':       setTasks(prev => prev.filter(t => t.id !== action.taskId)); break
      case 'UPDATE_TASK':    setTasks(prev => prev.map(t => t.id === action.taskId ? { ...t, ...action.oldData } : t)); break
      case 'COMPLETE_TASK':  setTasks(prev => prev.map(t => t.id === action.taskId ? { ...t, completed: action.wasCompleted, completedAt: action.wasCompletedAt } : t)); break
      case 'BULK_DELETE':    setTasks(prev => [...prev, ...action.tasks]); break
      case 'BULK_COMPLETE':  setTasks(prev => prev.map(t => { const s = action.previousStates.find(x => x.id === t.id); return s ? { ...t, completed: s.completed, completedAt: s.completedAt } : t })); break
      case 'ARCHIVE_TASK':   setArchivedTasks(prev => prev.filter(t => t.id !== action.task.id)); setTasks(prev => [...prev, action.task]); break
      case 'RESTORE_TASK':   setTasks(prev => prev.filter(t => t.id !== action.task.id)); setArchivedTasks(prev => [...prev, action.task]); break
    }

    setTimeout(() => { isUndoingRef.current = false }, 0)
    return action
  }, [undoHistory])

  const redo = useCallback(() => {
    if (redoHistory.length === 0) return null
    isUndoingRef.current = true
    const action = redoHistory[redoHistory.length - 1]
    setRedoHistory(prev => prev.slice(0, -1))
    setUndoHistory(prev => [...prev, action])

    const now = new Date().toISOString()
    switch (action.type) {
      case 'DELETE_TASK':    setTasks(prev => prev.filter(t => t.id !== action.task.id)); break
      case 'ADD_TASK':       setTasks(prev => [...prev, action.task]); break
      case 'UPDATE_TASK':    setTasks(prev => prev.map(t => t.id === action.taskId ? { ...t, ...action.newData } : t)); break
      case 'COMPLETE_TASK':  setTasks(prev => prev.map(t => t.id === action.taskId ? { ...t, completed: !action.wasCompleted, completedAt: action.wasCompleted ? null : now } : t)); break
      case 'BULK_DELETE':    setTasks(prev => prev.filter(t => !action.tasks.some(d => d.id === t.id))); break
      case 'BULK_COMPLETE':  setTasks(prev => prev.map(t => action.taskIds.includes(t.id) ? { ...t, completed: true, completedAt: now } : t)); break
      case 'ARCHIVE_TASK':   setTasks(prev => prev.filter(t => t.id !== action.task.id)); setArchivedTasks(prev => [...prev, { ...action.task, archivedAt: now }]); break
      case 'RESTORE_TASK':   setArchivedTasks(prev => prev.filter(t => t.id !== action.task.id)); setTasks(prev => [...prev, action.task]); break
    }

    setTimeout(() => { isUndoingRef.current = false }, 0)
    return action
  }, [redoHistory])

  // ── Queries ──────────────────────────────────────────────────────────────

  const getTasksByDate    = useCallback((date) => tasks.filter(t => t.date === date), [tasks])
  const getTasksInRange   = useCallback((s, e) => tasks.filter(t => t.date >= s && t.date <= e), [tasks])
  const todayTasks        = useMemo(() => getTasksByDate(getToday()), [getTasksByDate])

  const getPrioritySortValue = useCallback((p) => ({ high: 0, medium: 1, low: 2 })[p] ?? 3, [])
  const sortTasksByPriority  = useCallback((list) => [...list].sort((a, b) => {
    const diff = getPrioritySortValue(a.priority) - getPrioritySortValue(b.priority)
    if (diff !== 0) return diff
    if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime)
    if (a.dueTime) return -1
    if (b.dueTime) return 1
    return 0
  }), [getPrioritySortValue])

  const areDependenciesMet = useCallback((task) => {
    if (!task.dependsOn?.length) return true
    return task.dependsOn.every(id => tasks.find(t => t.id === id)?.completed === true)
  }, [tasks])

  const getBlockingTasks = useCallback((task) => {
    if (!task.dependsOn?.length) return []
    return task.dependsOn.map(id => tasks.find(t => t.id === id)).filter(t => t && !t.completed)
  }, [tasks])

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalTasks              = tasks.length
  const completedTasks          = tasks.filter(t => t.completed).length
  const overallPercent          = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const todayCompleted          = useMemo(() => todayTasks.filter(t => t.completed).length, [todayTasks])
  const todayTotal              = todayTasks.length
  const todayPercent            = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0
  const totalMinutesCompleted   = tasks.filter(t => t.completed).reduce((s, t) => s + (t.duration || 0), 0)

  const topicStats = useMemo(() => {
    const stats = {}
    tasks.forEach(t => {
      if (!stats[t.topic]) stats[t.topic] = { total: 0, completed: 0 }
      stats[t.topic].total++
      if (t.completed) stats[t.topic].completed++
    })
    return stats
  }, [tasks])

  // ── Streak ────────────────────────────────────────────────────────────────

  const streakData = useMemo(() => {
    const completedDates = new Set(tasks.filter(t => t.completed).map(t => t.date))
    if (completedDates.size === 0) return { current: 0, best: 0, studiedToday: false }

    const today = getToday()
    const studiedToday = completedDates.has(today)
    const sorted = Array.from(completedDates).sort()

    let best = 0, streak = 0
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) { streak = 1 } else {
        const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000
        streak = diff === 1 ? streak + 1 : 1
      }
      best = Math.max(best, streak)
    }

    let current = 0
    let check = new Date(today)
    while (true) {
      const ds = check.toISOString().split('T')[0]
      if (completedDates.has(ds)) { current++; check.setDate(check.getDate() - 1) }
      else break
    }

    return { current, best, studiedToday }
  }, [tasks])

  // ── Heatmap ───────────────────────────────────────────────────────────────

  const heatmapData = useMemo(() => {
    const map = {}
    tasks.forEach(t => { if (t.completed) map[t.date] = (map[t.date] || 0) + 1 })
    return Object.entries(map).map(([date, count]) => ({ date, count }))
  }, [tasks])

  // ── Recent completions ────────────────────────────────────────────────────

  const recentCompletedTasks = useMemo(() =>
    tasks.filter(t => t.completed && t.completedAt)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 10)
  , [tasks])

  // ── Time Tracking Analytics ───────────────────────────────────────────────

  const timeTrackingStats = useMemo(() => {
    const tracked = tasks.filter(t => t.completed && t.actualDuration != null)
    if (tracked.length === 0) return { totalEstimated: 0, totalActual: 0, accuracy: 100, overEstimateCount: 0, underEstimateCount: 0, accurateCount: 0, averageVariance: 0, byTopic: {} }
    let totalEst = 0, totalAct = 0, over = 0, under = 0, accurate = 0
    const byTopic = {}
    tracked.forEach(t => {
      const est = t.duration || 0, act = t.actualDuration || 0
      totalEst += est; totalAct += act
      const pct = est > 0 ? Math.abs((act - est) / est) * 100 : 0
      if (pct <= 10) accurate++
      else if (act < est) over++
      else under++
      if (!byTopic[t.topic]) byTopic[t.topic] = { estimated: 0, actual: 0, count: 0 }
      byTopic[t.topic].estimated += est
      byTopic[t.topic].actual += act
      byTopic[t.topic].count++
    })
    return {
      totalEstimated: totalEst,
      totalActual: totalAct,
      accuracy: Math.max(0, totalEst > 0 ? Math.round((1 - Math.abs(totalAct - totalEst) / totalEst) * 100) : 100),
      overEstimateCount: over,
      underEstimateCount: under,
      accurateCount: accurate,
      averageVariance: tracked.length > 0 ? Math.round((totalAct - totalEst) / tracked.length) : 0,
      byTopic,
      totalTracked: tracked.length,
    }
  }, [tasks])

  // ── Best Hours ────────────────────────────────────────────────────────────

  const bestHoursAnalysis = useMemo(() => {
    const hourly = Array(24).fill(null).map(() => ({ completed: 0, total: 0 }))
    tasks.forEach(t => {
      if (t.completed && t.completedAt) {
        const h = new Date(t.completedAt).getHours()
        hourly[h].completed++
        hourly[h].total += t.duration || 0
      }
    })
    const withData = hourly.map((d, h) => ({ hour: h, ...d })).filter(h => h.completed > 0).sort((a, b) => b.completed - a.completed)
    const peakHours = withData.slice(0, 3).map(h => h.hour)
    const morning = hourly.slice(6, 12).reduce((s, h) => s + h.completed, 0)
    const afternoon = hourly.slice(12, 18).reduce((s, h) => s + h.completed, 0)
    const evening = hourly.slice(18, 24).reduce((s, h) => s + h.completed, 0)
    const night = hourly.slice(0, 6).reduce((s, h) => s + h.completed, 0)
    const total = morning + afternoon + evening + night
    const most = morning >= afternoon && morning >= evening && morning >= night ? 'Morning (6AM-12PM)'
      : afternoon >= evening && afternoon >= night ? 'Afternoon (12PM-6PM)'
      : evening >= night ? 'Evening (6PM-12AM)' : 'Night (12AM-6AM)'
    return {
      hourlyData: hourly, peakHours, mostProductivePeriod: most,
      byPeriod: {
        morning:   { count: morning,   percent: total > 0 ? Math.round(morning / total * 100) : 0 },
        afternoon: { count: afternoon, percent: total > 0 ? Math.round(afternoon / total * 100) : 0 },
        evening:   { count: evening,   percent: total > 0 ? Math.round(evening / total * 100) : 0 },
        night:     { count: night,     percent: total > 0 ? Math.round(night / total * 100) : 0 },
      },
    }
  }, [tasks])

  // ── Topic Balance ─────────────────────────────────────────────────────────

  const topicBalanceAnalysis = useMemo(() => {
    const topicData = {}
    let totalTime = 0
    tasks.forEach(t => {
      if (!topicData[t.topic]) topicData[t.topic] = { totalTime: 0, completedTime: 0, taskCount: 0, completedCount: 0 }
      const time = t.actualDuration || t.duration || 0
      topicData[t.topic].totalTime += time
      topicData[t.topic].taskCount++
      totalTime += time
      if (t.completed) { topicData[t.topic].completedTime += time; topicData[t.topic].completedCount++ }
    })
    const topicList = Object.entries(topicData).map(([name, d]) => ({
      name,
      totalTime: d.totalTime, completedTime: d.completedTime,
      taskCount: d.taskCount, completedCount: d.completedCount,
      percent: totalTime > 0 ? Math.round(d.totalTime / totalTime * 100) : 0,
      avgDuration: d.taskCount > 0 ? Math.round(d.totalTime / d.taskCount) : 0,
      completionRate: d.taskCount > 0 ? Math.round(d.completedCount / d.taskCount * 100) : 0,
    })).sort((a, b) => b.totalTime - a.totalTime)

    const suggestions = []
    const dominant = topicList.find(t => t.percent > 50)
    if (dominant) suggestions.push(`${dominant.name} takes ${dominant.percent}% of your time. Consider balancing.`)
    const neglected = topicList.filter(t => t.percent < 10 && t.taskCount >= 2)
    if (neglected.length > 0) suggestions.push(`${neglected.map(t => t.name).join(', ')} ${neglected.length > 1 ? 'are' : 'is'} getting less attention.`)
    const low = topicList.filter(t => t.completionRate < 50 && t.taskCount >= 3)
    if (low.length > 0) suggestions.push(`${low.map(t => t.name).join(', ')}: Low completion rate. Try breaking tasks into smaller chunks.`)

    return { topics: topicList, totalTime, totalTasks: tasks.length, suggestions, isBalanced: !dominant && neglected.length === 0 }
  }, [tasks])

  // ── Productivity Score ────────────────────────────────────────────────────

  const productivityScore = useMemo(() => {
    const breakdown = {
      streakScore:     Math.min(40, streakData.current * 4),
      completionScore: Math.round((overallPercent / 100) * 30),
      goalScore:       0,
    }
    const last7 = Array.from({ length: 7 }, (_, i) => addDays(getToday(), -i))
    const daysGoalMet = last7.filter(d => {
      return tasks.filter(t => t.date === d && t.completed).length >= (goals.dailyTaskTarget || 3)
    }).length
    breakdown.goalScore = Math.round((daysGoalMet / 7) * 30)
    const score = breakdown.streakScore + breakdown.completionScore + breakdown.goalScore
    let level = 'Beginner', levelColor = 'var(--text-muted)'
    if (score >= 80) { level = 'Master';       levelColor = '#eab308' }
    else if (score >= 60) { level = 'Expert';  levelColor = '#a855f7' }
    else if (score >= 40) { level = 'Intermediate'; levelColor = '#3b82f6' }
    else if (score >= 20) { level = 'Apprentice';   levelColor = '#22c55e' }
    return { score, breakdown, level, levelColor }
  }, [streakData.current, overallPercent, tasks, goals.dailyTaskTarget])

  // ── Goal progress ─────────────────────────────────────────────────────────

  const dailyGoalProgress = useMemo(() => {
    const target = goals.dailyTaskTarget || 3
    const percent = Math.min(100, Math.round((todayCompleted / target) * 100))
    return { target, completed: todayCompleted, percent, achieved: todayCompleted >= target }
  }, [goals.dailyTaskTarget, todayCompleted])

  const extraGoalsProgress = useMemo(() => {
    return (goals.extraGoals ?? []).map(goal => {
      switch (goal.type) {
        case 'min_tasks': {
          const done = goal.topic
            ? todayTasks.filter(t => t.completed && t.topic === goal.topic).length
            : todayTasks.filter(t => t.completed).length
          const target = goal.value || 1
          return { ...goal, current: done, target, percent: Math.min(100, Math.round((done / target) * 100)), achieved: done >= target }
        }
        case 'min_time': {
          const mins = todayTasks
            .filter(t => t.completed && (!goal.topic || t.topic === goal.topic))
            .reduce((s, t) => s + (t.actualDuration ?? t.duration ?? 0), 0)
          const target = goal.value || 30
          return { ...goal, current: mins, target, percent: Math.min(100, Math.round((mins / target) * 100)), achieved: mins >= target }
        }
        case 'all_priority': {
          const relevant = todayTasks.filter(t => t.priority === goal.priority)
          const done     = relevant.filter(t => t.completed).length
          const target   = relevant.length
          return { ...goal, current: done, target, percent: target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0, achieved: target > 0 && done === target }
        }
        default:
          return { ...goal, current: 0, target: 1, percent: 0, achieved: false }
      }
    })
  }, [goals.extraGoals, todayTasks])

  // ── Reports & Charts ──────────────────────────────────────────────────────

  const getWeeklyReport = useCallback((weeksAgo = 0) => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay() - (weeksAgo * 7))
    const end = new Date(start); end.setDate(start.getDate() + 6)
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]
    const week = tasks.filter(t => t.date >= startStr && t.date <= endStr)
    const done = week.filter(t => t.completed)
    const topicBreakdown = {}
    done.forEach(t => {
      if (!topicBreakdown[t.topic]) topicBreakdown[t.topic] = { count: 0, minutes: 0 }
      topicBreakdown[t.topic].count++
      topicBreakdown[t.topic].minutes += t.duration || 0
    })
    const dailyBreakdown = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i)
      const ds = d.toISOString().split('T')[0]
      const day = week.filter(t => t.date === ds)
      const dc = day.filter(t => t.completed)
      return { date: ds, dayName: d.toLocaleDateString('en-US', { weekday: 'short' }), total: day.length, completed: dc.length, minutes: dc.reduce((s, t) => s + (t.duration || 0), 0) }
    })
    return { startDate: startStr, endDate: endStr, totalTasks: week.length, completedTasks: done.length, completionRate: week.length > 0 ? Math.round(done.length / week.length * 100) : 0, totalMinutes: done.reduce((s, t) => s + (t.duration || 0), 0), topicBreakdown, dailyBreakdown }
  }, [tasks])

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

  const getChartData = useCallback((days = 30) => {
    return Array.from({ length: days }, (_, i) => {
      const date = addDays(getToday(), -(days - 1 - i))
      const day = tasks.filter(t => t.date === date)
      return { date, label: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), completed: day.filter(t => t.completed).length, total: day.length }
    })
  }, [tasks])

  const thisWeekReport  = useMemo(() => getWeeklyReport(0),  [getWeeklyReport])
  const lastWeekReport  = useMemo(() => getWeeklyReport(1),  [getWeeklyReport])
  const thisMonthReport = useMemo(() => getMonthlyReport(0), [getMonthlyReport])
  const chartData30Days = useMemo(() => getChartData(30),    [getChartData])

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetAllData = useCallback(async () => {
    setTasks([])
    await supabase.from('tasks').delete().eq('user_id', userId)
  }, [userId])

  // ── Export / Import ───────────────────────────────────────────────────────

  const exportData = useCallback(() => {
    const data = { version: 2, exportedAt: new Date().toISOString(), tasks, topics, notes, goals }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `planner-backup-${getToday()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [tasks, topics, notes, goals])

  const importData = useCallback(async (jsonString) => {
    try {
      const data = JSON.parse(jsonString)
      if (!data.tasks || !Array.isArray(data.tasks)) return { success: false, error: 'Invalid file: missing tasks array' }
      if (!data.topics || !Array.isArray(data.topics)) return { success: false, error: 'Invalid file: missing topics array' }
      for (const t of data.tasks) {
        if (!t.id || !t.title || !t.date) return { success: false, error: 'Invalid file: tasks missing required fields' }
      }

      // Clear existing and insert imported
      await supabase.from('tasks').delete().eq('user_id', userId)
      if (data.tasks.length > 0) {
        await supabase.from('tasks').insert(data.tasks.map(t => taskToRow(t, userId)))
      }
      await supabase.from('topics').delete().eq('user_id', userId)
      if (data.topics.length > 0) {
        await supabase.from('topics').insert(data.topics.map(t => ({ user_id: userId, name: t.name, color: t.color })))
      }
      if (data.notes && typeof data.notes === 'object') {
        await supabase.from('notes').delete().eq('user_id', userId)
        const noteRows = Object.entries(data.notes).filter(([, v]) => v?.trim()).map(([date, content]) => ({ user_id: userId, date, content }))
        if (noteRows.length > 0) await supabase.from('notes').insert(noteRows)
        setNotes(data.notes)
      }
      if (data.goals && typeof data.goals === 'object') {
        await supabase.from('goals').upsert({ user_id: userId, daily_task_target: data.goals.dailyTaskTarget || 3, extra_goals: data.goals.extraGoals ?? [] }, { onConflict: 'user_id' })
        setGoals(data.goals)
      }

      setTasks(data.tasks)
      setTopics(data.topics)
      return { success: true, tasksCount: data.tasks.length, topicsCount: data.topics.length }
    } catch {
      return { success: false, error: 'Invalid JSON file' }
    }
  }, [userId])

  // ── Task note ─────────────────────────────────────────────────────────────

  // Debounce ref so we don't write to Supabase on every keystroke
  const noteDebounceRef = useRef({})

  const updateTaskNote = useCallback(async (taskId, note) => {
    // Optimistic update immediately
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, note } : t))
    // Debounce the Supabase write by 800ms
    if (noteDebounceRef.current[taskId]) clearTimeout(noteDebounceRef.current[taskId])
    noteDebounceRef.current[taskId] = setTimeout(async () => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ note })
        .eq('id', taskId)
        .eq('user_id', userId)
        .select('id, note')
      if (error) console.error('updateTaskNote error:', error)
      else console.log('updateTaskNote saved:', data)
    }, 800)
  }, [userId])

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    dataLoading,
    // Tasks
    tasks, addTask, updateTask, deleteTask, toggleTaskComplete, reorderTasks, getTasksByDate, getTasksInRange, todayTasks,
    updateTaskNote,    // Priority & Dependencies
    sortTasksByPriority, areDependenciesMet, getBlockingTasks,
    // Bulk actions
    bulkCompleteTasks, bulkUncompleteTasks, bulkDeleteTasks, bulkMoveTasks,
    // Templates
    templates, addTemplate, deleteTemplate, createTaskFromTemplate,
    // Subtasks
    addSubtask, updateSubtask, deleteSubtask, toggleSubtaskComplete,
    // Notes
    notes, getNote, setNote, todayNote,
    // Goals
    goals, setDailyGoal, dailyGoalProgress, extraGoalsProgress, addExtraGoal, removeExtraGoal,
    // Topics
    topics, addTopic, removeTopic, getTopicColor,
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
    // Reset
    resetAllData,
    // Export/Import
    exportData, importData,
  }
}
