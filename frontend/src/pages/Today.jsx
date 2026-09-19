import { useState, useRef, useEffect } from 'react'
import { Plus, CheckCircle2, Circle, Clock, Trash2, Edit3, CheckCheck, Sparkles, ChevronDown, ChevronRight, Repeat, GripVertical, Square, CheckSquare, Calendar, X, Flag, Link, Focus, LayoutList, Clock3, CalendarClock, StickyNote, ChevronUp, ClipboardList, AlertTriangle } from 'lucide-react'
import AddTaskModal from '../components/AddTaskModal'
import SearchFilter, { filterTasks } from '../components/SearchFilter'
import DailyNotes from '../components/DailyNotes'
import TaskTemplates from '../components/TaskTemplates'
import QuickAdd from '../components/QuickAdd'
import TimeBlockView from '../components/TimeBlockView'
import FocusMode from '../components/FocusMode'
import { PRIORITY_CONFIG } from '../hooks/useProgress'

export default function TodayPage({ progress, getFocusedTaskRef }) {
  const { todayTasks, tasks, topics, addTask, addTopic, toggleTaskComplete, deleteTask, updateTask, getTopicColor, todayCompleted, todayTotal, todayPercent, toggleSubtaskComplete, reorderTasks, getNote, setNote, bulkCompleteTasks, bulkDeleteTasks, bulkMoveTasks, templates, createTaskFromTemplate, sortTasksByPriority, areDependenciesMet, getBlockingTasks, setActualDuration, updateTaskNote } = progress

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [expandedTasks, setExpandedTasks] = useState(new Set())
  
  // Search/Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState(new Set())
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [moveDate, setMoveDate] = useState('')
  
  // Drag & Drop state
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [dragOverTaskId, setDragOverTaskId] = useState(null)
  const dragStartY = useRef(0)
  
  // View mode: 'list' | 'timeline'
  const [viewMode, setViewMode] = useState('list')
  
  // Focus mode
  const [focusTask, setFocusTask] = useState(null)
  
  // Sort by priority
  const [sortByPriority, setSortByPriority] = useState(false)

  // Per-task inline notes — stored in task.note via Supabase
  const [expandedNotes, setExpandedNotes] = useState(new Set())

  // Register "get focused task" so App-level P shortcut can pick it up
  useEffect(() => {
    if (!getFocusedTaskRef) return
    getFocusedTaskRef.current = () => focusTask || filteredTasks.find(t => !t.completed) || null
  })

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const totalMinutes = todayTasks.reduce((sum, t) => sum + (t.duration || 0), 0)
  const completedMinutes = todayTasks.filter(t => t.completed).reduce((sum, t) => sum + (t.duration || 0), 0)

  const allDone = todayTotal > 0 && todayCompleted === todayTotal

  // ── Over-scheduling warning ────────────────────────────────────────────
  const OVERLOAD_THRESHOLD_MINS = 600  // 10 hours
  const incompleteMins = todayTasks
    .filter(t => !t.completed)
    .reduce((s, t) => s + (t.duration || 0), 0)
  const isOverloaded = incompleteMins > OVERLOAD_THRESHOLD_MINS

  const overloadDismissKey = `overload_dismissed_${todayStr}`
  const [overloadDismissed, setOverloadDismissed] = useState(
    () => localStorage.getItem(overloadDismissKey) === 'true'
  )
  // Re-check if user adds more tasks after dismissing
  const showOverloadWarning = isOverloaded && !overloadDismissed && !allDone

  const dismissOverload = () => {
    localStorage.setItem(overloadDismissKey, 'true')
    setOverloadDismissed(true)
  }

  // Filter tasks
  let filteredTasks = filterTasks(todayTasks, { searchQuery, topicFilter, statusFilter })
  
  // Sort by priority if enabled
  if (sortByPriority) {
    filteredTasks = sortTasksByPriority(filteredTasks)
  }

  // Group by topic
  const tasksByTopic = {}
  filteredTasks.forEach(t => {
    if (!tasksByTopic[t.topic]) tasksByTopic[t.topic] = []
    tasksByTopic[t.topic].push(t)
  })

  const toggleExpanded = (taskId) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  // ── Drag & Drop handlers ────────────────────────────────────────────────

  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId)
    dragStartY.current = e.clientY
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
    // Add a slight delay to show drag effect
    setTimeout(() => {
      e.target.style.opacity = '0.5'
    }, 0)
  }

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
    setDraggedTaskId(null)
    setDragOverTaskId(null)
  }

  const handleDragOver = (e, taskId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (taskId !== draggedTaskId) {
      setDragOverTaskId(taskId)
    }
  }

  const handleDragLeave = () => {
    setDragOverTaskId(null)
  }

  const handleDrop = (e, targetTaskId) => {
    e.preventDefault()
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDragOverTaskId(null)
      return
    }

    // Get current order
    const currentOrder = filteredTasks.map(t => t.id)
    const draggedIndex = currentOrder.indexOf(draggedTaskId)
    const targetIndex = currentOrder.indexOf(targetTaskId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Create new order
    const newOrder = [...currentOrder]
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedTaskId)

    // Reorder tasks
    reorderTasks(todayStr, newOrder)
    setDragOverTaskId(null)
  }

  // ── Bulk Selection handlers ─────────────────────────────────────────────

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const selectAllTasks = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)))
    }
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedTasks(new Set())
  }

  const handleBulkComplete = () => {
    bulkCompleteTasks(Array.from(selectedTasks))
    exitSelectionMode()
  }

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedTasks.size} tasks?`)) {
      bulkDeleteTasks(Array.from(selectedTasks))
      exitSelectionMode()
    }
  }

  const handleBulkMove = () => {
    if (moveDate) {
      bulkMoveTasks(Array.from(selectedTasks), moveDate)
      setShowMoveModal(false)
      setMoveDate('')
      exitSelectionMode()
    }
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return null
    const [hours, minutes] = timeStr.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  // ── Task notes helpers ─────────────────────────────────────────────────

  const saveTaskNote = (taskId, text) => {
    updateTaskNote(taskId, text)
  }

  const toggleNoteExpanded = (taskId) => {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  // ── Reschedule to tomorrow ─────────────────────────────────────────────

  const rescheduleToTomorrow = (taskId) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    updateTask(taskId, { date: tomorrowStr })
  }

  const handleSaveTask = (taskData) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData)
      setEditingTask(null)
    } else {
      addTask({ ...taskData, date: todayStr })
    }
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setShowAddModal(true)
  }

  const markAllComplete = () => {
    todayTasks.forEach(t => {
      if (!t.completed) toggleTaskComplete(t.id)
    })
  }

  // Get next incomplete task for focus mode
  const getNextTask = () => {
    const incompleteTasks = filteredTasks.filter(t => !t.completed && areDependenciesMet(t))
    const currentIndex = incompleteTasks.findIndex(t => t.id === focusTask?.id)
    if (currentIndex < incompleteTasks.length - 1) {
      return incompleteTasks[currentIndex + 1]
    }
    return null
  }

  const startFocusMode = (task) => {
    setFocusTask(task)
  }

  const handleFocusNext = () => {
    const next = getNextTask()
    if (next) setFocusTask(next)
    else setFocusTask(null)
  }

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Today</p>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>{dayName}</h1>
      </div>

      {/* Quick Add */}
      <QuickAdd 
        onAdd={addTask}
        topics={topics}
        getTopicColor={getTopicColor}
        tasks={todayTasks}
      />

      {/* Stats bar */}
      <div className="card-static" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {todayCompleted} of {todayTotal} tasks
            </span>
            {allDone && todayTotal > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--accent-green)' }}>
                <Sparkles size={14} /> All done!
              </span>
            )}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: allDone ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
            {todayPercent}%
          </span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-bar-fill" 
            style={{ 
              width: `${todayPercent}%`, 
              background: allDone ? 'var(--accent-green)' : 'var(--accent-blue)' 
            }} 
          />
        </div>
        {todayTotal > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            <Clock size={12} />
            <span>{completedMinutes}m done / {totalMinutes}m planned</span>
          </div>
        )}
      </div>

      {/* Over-scheduling warning */}
      {showOverloadWarning && (
        <div style={{
          marginBottom: 16,
          padding: '12px 16px',
          borderRadius: 12,
          background: 'rgba(249,115,22,0.08)',
          border: '1px solid rgba(249,115,22,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <AlertTriangle size={18} color="#f97316" />
          </span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#f97316', marginBottom: 2 }}>
              Heavy day ahead — {Math.floor(incompleteMins / 60)}h {incompleteMins % 60}m planned
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
              That's over 10 hours of tasks. Consider moving some to tomorrow.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setSelectionMode(true)}
              style={{
                fontSize: 12, fontWeight: 600, padding: '5px 12px',
                borderRadius: 8, border: '1px solid #f97316',
                background: 'rgba(249,115,22,0.12)',
                color: '#f97316', cursor: 'pointer',
              }}
            >
              Select tasks →
            </button>
            <button
              onClick={dismissOverload}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, fontSize: 16, lineHeight: 1 }}
              title="Dismiss for today"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Time breakdown by topic */}
      {Object.keys(tasksByTopic).length > 0 && (
        <div className="card-static" style={{ marginBottom: 20, padding: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Time Plan
          </h3>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 24, marginBottom: 12 }}>
            {Object.entries(tasksByTopic).map(([topic, tasks]) => {
              const mins = tasks.reduce((s, t) => s + (t.duration || 0), 0)
              const pct = totalMinutes > 0 ? (mins / totalMinutes) * 100 : 0
              return (
                <div
                  key={topic}
                  style={{
                    width: `${pct}%`,
                    background: getTopicColor(topic),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'white',
                    minWidth: pct > 10 ? 40 : 0,
                  }}
                  title={`${topic}: ${mins}m`}
                >
                  {pct > 15 && `${mins}m`}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {Object.entries(tasksByTopic).map(([topic, tasks]) => {
              const mins = tasks.reduce((s, t) => s + (t.duration || 0), 0)
              return (
                <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: getTopicColor(topic) }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {topic}: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{mins}m</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tasks {filteredTasks.length !== todayTasks.length && `(${filteredTasks.length}/${todayTasks.length})`}
          </h3>
          
          {/* View mode toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 8, padding: 2 }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'list' ? 'var(--bg-secondary)' : 'transparent',
                color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
              }}
            >
              <LayoutList size={14} />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'timeline' ? 'var(--bg-secondary)' : 'transparent',
                color: viewMode === 'timeline' ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
              }}
            >
              <Clock3 size={14} />
            </button>
          </div>
          
          {/* Priority sort toggle */}
          <button
            onClick={() => setSortByPriority(!sortByPriority)}
            className="btn btn-ghost"
            style={{ 
              padding: '4px 10px', 
              fontSize: 12,
              color: sortByPriority ? 'var(--accent-blue)' : 'var(--text-muted)',
            }}
            title="Sort by priority"
          >
            <Flag size={14} /> {sortByPriority ? 'Priority' : 'Sort'}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          {selectionMode ? (
            <>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center' }}>
                {selectedTasks.size} selected
              </span>
              <button className="btn btn-ghost" onClick={selectAllTasks} style={{ padding: '6px 12px', fontSize: 13 }}>
                {selectedTasks.size === filteredTasks.length ? 'Deselect all' : 'Select all'}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleBulkComplete} 
                style={{ padding: '6px 12px', fontSize: 13 }}
                disabled={selectedTasks.size === 0}
              >
                <CheckCheck size={14} /> Complete
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowMoveModal(true)} 
                style={{ padding: '6px 12px', fontSize: 13 }}
                disabled={selectedTasks.size === 0}
              >
                <Calendar size={14} /> Move
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={handleBulkDelete} 
                style={{ padding: '6px 12px', fontSize: 13, color: 'var(--accent-red)' }}
                disabled={selectedTasks.size === 0}
              >
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-ghost" onClick={exitSelectionMode} style={{ padding: '6px 10px' }}>
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              {/* Focus Mode button */}
              {filteredTasks.filter(t => !t.completed).length > 0 && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    const firstIncomplete = filteredTasks.find(t => !t.completed && areDependenciesMet(t))
                    if (firstIncomplete) startFocusMode(firstIncomplete)
                  }}
                  style={{ padding: '6px 12px', fontSize: 13 }}
                >
                  <Focus size={14} /> Focus
                </button>
              )}
              {todayTotal > 2 && (
                <button 
                  className="btn btn-ghost" 
                  onClick={() => setSelectionMode(true)} 
                  style={{ padding: '6px 12px', fontSize: 13 }}
                >
                  <Square size={14} /> Select
                </button>
              )}
              {todayTotal > 0 && !allDone && (
                <button className="btn btn-ghost" onClick={markAllComplete} style={{ padding: '6px 12px', fontSize: 13 }}>
                  <CheckCheck size={14} /> Mark all done
                </button>
              )}
              <button 
                className="btn btn-primary" 
                onClick={() => { setEditingTask(null); setShowAddModal(true) }}
                style={{ padding: '8px 14px' }}
              >
                <Plus size={16} /> Add Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search/Filter */}
      {todayTasks.length > 0 && (
        <SearchFilter
          value={searchQuery}
          onChange={setSearchQuery}
          topics={topics}
          selectedTopic={topicFilter}
          onTopicChange={setTopicFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          placeholder="Search today's tasks..."
        />
      )}

      {/* Task Templates */}
      <TaskTemplates
        templates={templates}
        onDeleteTemplate={progress.deleteTemplate}
        onCreateFromTemplate={createTaskFromTemplate}
        topics={topics}
        getTopicColor={getTopicColor}
      />

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <TimeBlockView
          tasks={filteredTasks}
          getTopicColor={getTopicColor}
          onTaskClick={startFocusMode}
          areDependenciesMet={areDependenciesMet}
        />
      )}

      {/* Task list */}
      {viewMode === 'list' && (
        filteredTasks.length === 0 ? (
          todayTasks.length === 0 ? (
            <div className="card-static" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <ClipboardList size={40} color="var(--text-muted)" style={{ opacity: 0.5 }} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>No tasks for today</p>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>Add some tasks to get started</p>
              <button 
                className="btn btn-primary" 
                onClick={() => { setEditingTask(null); setShowAddModal(true) }}
              >
                <Plus size={16} /> Add Your First Task
              </button>
            </div>
          ) : (
            <div className="card-static" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No tasks match your filters</p>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredTasks.map((task, i) => {
              const hasSubtasks = task.subtasks && task.subtasks.length > 0
              const isExpanded = expandedTasks.has(task.id)
              const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0
              const isDragging = draggedTaskId === task.id
              const isDragOver = dragOverTaskId === task.id
              const isSelected = selectedTasks.has(task.id)
            
            return (
              <div 
                key={task.id} 
                className={`animate-fadeIn stagger-${Math.min(i + 1, 5)}`}
                draggable={!selectionMode}
                onDragStart={(e) => !selectionMode && handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, task.id)}
                style={{
                  opacity: isDragging ? 0.5 : 1,
                  transform: isDragOver ? 'translateY(4px)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              >
                {/* Drop indicator */}
                {isDragOver && (
                  <div style={{
                    height: 3,
                    background: 'var(--accent-blue)',
                    borderRadius: 2,
                    marginBottom: 8,
                    animation: 'fadeIn 0.15s ease',
                  }} />
                )}
                
                <div
                  className={`task-item ${task.completed ? 'completed' : ''}`}
                  style={{ 
                    borderRadius: (hasSubtasks && isExpanded) || expandedNotes.has(task.id) ? '12px 12px 0 0' : 12,
                    outline: isSelected ? '2px solid var(--accent-blue)' : 'none',
                    outlineOffset: -2,
                  }}
                >
                  {/* Selection checkbox OR Drag handle */}
                  {selectionMode ? (
                    <button
                      onClick={() => toggleTaskSelection(task.id)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: '4px 0',
                        marginRight: 4,
                      }}
                    >
                      {isSelected 
                        ? <CheckSquare size={18} color="var(--accent-blue)" />
                        : <Square size={18} color="var(--text-muted)" />
                      }
                    </button>
                  ) : (
                    <div 
                      style={{ 
                        cursor: 'grab', 
                        color: 'var(--text-muted)', 
                        padding: '4px 0',
                        marginRight: 4,
                        opacity: 0.5,
                        transition: 'opacity 0.15s ease',
                      }}
                      className="drag-handle"
                      title="Drag to reorder"
                    >
                      <GripVertical size={16} />
                    </div>
                  )}
                  
                  <button
                    onClick={() => toggleTaskComplete(task.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}
                  >
                    {task.completed 
                      ? <CheckCircle2 size={20} color="var(--accent-green)" className="animate-check" />
                      : <Circle size={20} color="var(--text-muted)" />
                    }
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      {/* Priority badge */}
                      {task.priority && PRIORITY_CONFIG[task.priority] && (
                        <span style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 3,
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          background: PRIORITY_CONFIG[task.priority].bgColor,
                          color: PRIORITY_CONFIG[task.priority].color,
                        }}>
                          <Flag size={10} />
                          {PRIORITY_CONFIG[task.priority].label}
                        </span>
                      )}
                      <span
                        className="tag"
                        style={{
                          background: `${getTopicColor(task.topic)}20`,
                          color: getTopicColor(task.topic),
                          borderColor: `${getTopicColor(task.topic)}40`,
                        }}
                      >
                        {task.topic}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {task.duration}m
                      </span>
                      {task.dueTime && (
                        <span style={{ fontSize: 12, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                          @ {formatTime(task.dueTime)}
                        </span>
                      )}
                      {task.recurrence && task.recurrence !== 'none' && (
                        <span style={{ fontSize: 11, color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Repeat size={11} /> {task.recurrence}
                        </span>
                      )}
                      {/* Dependency indicator */}
                      {task.dependsOn && task.dependsOn.length > 0 && (
                        <span 
                          style={{ 
                            fontSize: 11, 
                            color: areDependenciesMet(task) ? 'var(--accent-green)' : 'var(--accent-orange)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 3 
                          }}
                          title={areDependenciesMet(task) ? 'All dependencies met' : 'Has unmet dependencies'}
                        >
                          <Link size={11} /> {areDependenciesMet(task) ? 'Ready' : 'Blocked'}
                        </span>
                      )}
                      {hasSubtasks && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {completedSubtasks}/{task.subtasks.length} subtasks
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                    }}>
                      {task.title}
                    </p>
                    {task.description?.trim() && (
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{task.description.trim()}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {hasSubtasks && (
                      <button
                        onClick={() => toggleExpanded(task.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-muted)', borderRadius: 6 }}
                        className="btn-ghost"
                      >
                        {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </button>
                    )}
                    {/* Focus button */}
                    {!task.completed && areDependenciesMet(task) && (
                      <button
                        onClick={() => startFocusMode(task)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--accent-blue)', borderRadius: 6 }}
                        className="btn-ghost"
                        title="Focus on this task"
                      >
                        <Focus size={15} />
                      </button>
                    )}
                    {/* Task note toggle */}
                    <button
                      onClick={() => toggleNoteExpanded(task.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6,
                      color: task.note?.trim() ? 'var(--accent-blue)' : 'var(--text-muted)' }}
                      className="btn-ghost"
                      title={expandedNotes.has(task.id) ? 'Hide note' : 'Add/view note'}
                    >
                      <StickyNote size={15} />
                    </button>
                    {/* Reschedule to tomorrow */}
                    {!task.completed && (
                      <button
                        onClick={() => rescheduleToTomorrow(task.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-muted)', borderRadius: 6 }}
                        className="btn-ghost"
                        title="Reschedule to tomorrow"
                      >
                        <CalendarClock size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditTask(task)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-muted)', borderRadius: 6 }}
                      className="btn-ghost"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-muted)', borderRadius: 6 }}
                      className="btn-ghost"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Task inline note */}
                {expandedNotes.has(task.id) && (
                  <div style={{
                    background: 'var(--bg-input)',
                    borderRadius: hasSubtasks && isExpanded ? '0' : '0 0 12px 12px',
                    border: '1px solid var(--border-primary)',
                    borderTop: 'none',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}>
                    <StickyNote size={13} style={{ color: 'var(--accent-blue)', marginTop: 3, flexShrink: 0 }} />
                    <textarea
                      value={task.note || ''}
                      onChange={e => saveTaskNote(task.id, e.target.value)}
                      placeholder="Add a note for this task…"
                      rows={2}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        resize: 'vertical',
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        fontFamily: 'inherit',
                        lineHeight: 1.5,
                        padding: 0,
                      }}
                    />
                  </div>
                )}

                {/* Subtasks */}
                {hasSubtasks && isExpanded && (
                  <div style={{ 
                    background: 'var(--bg-input)', 
                    borderRadius: '0 0 12px 12px',
                    border: '1px solid var(--border-primary)',
                    borderTop: 'none',
                    padding: '8px 12px 12px 44px',
                  }}>
                    {task.subtasks.map(subtask => (
                      <div 
                        key={subtask.id}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 10,
                          padding: '8px 0',
                          borderBottom: '1px solid var(--border-primary)',
                        }}
                      >
                        <button
                          onClick={() => toggleSubtaskComplete(task.id, subtask.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          {subtask.completed 
                            ? <CheckCircle2 size={16} color="var(--accent-green)" />
                            : <Circle size={16} color="var(--text-muted)" />
                          }
                        </button>
                        <span style={{ 
                          fontSize: 13, 
                          color: subtask.completed ? 'var(--text-muted)' : 'var(--text-secondary)',
                          textDecoration: subtask.completed ? 'line-through' : 'none',
                        }}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* Move Modal */}
      {showMoveModal && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                Move {selectedTasks.size} Task{selectedTasks.size > 1 ? 's' : ''}
              </h2>
              <button 
                onClick={() => setShowMoveModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <Calendar size={14} /> Move to Date
              </label>
              <input
                type="date"
                className="input"
                value={moveDate}
                onChange={e => setMoveDate(e.target.value)}
                min={todayStr}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowMoveModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleBulkMove}
                disabled={!moveDate}
              >
                Move Tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Notes */}
      <DailyNotes 
        date={todayStr} 
        note={getNote(todayStr)} 
        onSave={setNote} 
      />

      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingTask(null) }}
        onSave={handleSaveTask}
        topics={topics}
        onAddTopic={addTopic}
        editTask={editingTask}
        defaultDate={todayStr}
        onSaveAsTemplate={progress.addTemplate}
        availableTasks={tasks.filter(t => t.date <= todayStr)}
      />

      {/* Focus Mode */}
      <FocusMode
        isOpen={!!focusTask}
        onClose={() => setFocusTask(null)}
        task={focusTask}
        onToggleComplete={(taskId) => {
          toggleTaskComplete(taskId)
          setFocusTask(prev => prev ? { ...prev, completed: !prev.completed } : null)
        }}
        onSetActualDuration={setActualDuration}
        onNextTask={handleFocusNext}
        hasNextTask={!!getNextTask()}
      />
    </div>
  )
}
