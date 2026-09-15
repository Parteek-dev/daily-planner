import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, Clock, Trash2, Edit3, Repeat, ListChecks, BookOpen, StickyNote } from 'lucide-react'
import AddTaskModal from '../components/AddTaskModal'
import SearchFilter, { filterTasks } from '../components/SearchFilter'
import DailyNotes from '../components/DailyNotes'

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPage({ progress }) {
  const { tasks, topics, addTask, addTopic, toggleTaskComplete, deleteTask, updateTask, getTopicColor, toggleSubtaskComplete, getNote, setNote, notes, updateTaskNote } = progress

  const [expandedNotes, setExpandedNotes] = useState(new Set())

  const toggleNoteExpanded = (taskId) => {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(() => {
    const jumpDate = sessionStorage.getItem('calendar_jump_date')
    if (jumpDate) {
      sessionStorage.removeItem('calendar_jump_date')
      return jumpDate
    }
    return today.toISOString().split('T')[0]
  })
  const initialDate = selectedDate ? new Date(selectedDate + 'T12:00:00') : today
  const [viewYear, setViewYear] = useState(initialDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth())
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  
  // Search/Filter for sidebar panel
  const [searchQuery, setSearchQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const days = []
    // Empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, date: null })
    }
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ day: d, date: dateStr })
    }
    return days
  }, [viewYear, viewMonth, daysInMonth, firstDay])

  // Tasks for selected date (filtered)
  const selectedDateTasks = useMemo(() => {
    const dateTasks = tasks.filter(t => t.date === selectedDate)
    return filterTasks(dateTasks, { searchQuery, topicFilter, statusFilter })
  }, [tasks, selectedDate, searchQuery, topicFilter, statusFilter])
  
  // Unfiltered count for showing "X of Y"
  const totalSelectedDateTasks = useMemo(() => {
    return tasks.filter(t => t.date === selectedDate).length
  }, [tasks, selectedDate])

  // Task counts per date for the calendar
  const taskCountsByDate = useMemo(() => {
    const counts = {}
    tasks.forEach(t => {
      if (!counts[t.date]) counts[t.date] = { total: 0, completed: 0, hasNote: false }
      counts[t.date].total++
      if (t.completed) counts[t.date].completed++
    })
    // Add note indicators
    Object.keys(notes).forEach(date => {
      if (!counts[date]) counts[date] = { total: 0, completed: 0, hasNote: true }
      else counts[date].hasNote = true
    })
    return counts
  }, [tasks, notes])

  const todayStr = today.toISOString().split('T')[0]

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleSaveTask = (taskData) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData)
      setEditingTask(null)
    } else {
      addTask(taskData)
    }
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setShowAddModal(true)
  }

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Calendar</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Plan and track your tasks by date</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, maxWidth: 1100 }}>
        {/* Calendar Grid */}
        <div className="card-static">
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button className="btn btn-ghost" onClick={prevMonth} style={{ padding: 8 }}>
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{monthName}</h2>
            <button className="btn btn-ghost" onClick={nextMonth} style={{ padding: 8 }}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', padding: 8 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {calendarDays.map((cell, i) => {
              if (!cell.day) {
                return <div key={i} style={{ minHeight: 60, padding: 4 }} />
              }
              const isToday = cell.date === todayStr
              const isSelected = cell.date === selectedDate
              const counts = taskCountsByDate[cell.date]
              const hasCompletedAll = counts && counts.completed === counts.total && counts.total > 0

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(cell.date)}
                  style={{
                    minHeight: 60,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    borderRadius: 10,
                    border: isSelected ? '2px solid var(--accent-blue)' : '1px solid var(--border-primary)',
                    background: isSelected ? 'var(--accent-blue)' : isToday ? 'var(--bg-input)' : 'transparent',
                    color: isSelected ? 'white' : isToday ? 'var(--accent-blue)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: isToday || isSelected ? 600 : 400,
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: 14 }}>{cell.day}</span>
                  {counts && (counts.total > 0 || counts.hasNote) && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {counts.total > 0 && (
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: hasCompletedAll ? 'var(--accent-green)' : counts.completed > 0 ? 'var(--accent-orange)' : 'var(--text-muted)',
                        }} />
                      )}
                      {counts.hasNote && (
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'var(--accent-purple)',
                        }} />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Date Panel */}
        <div className="card-static" style={{ alignSelf: 'start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
              </p>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                {selectedDateTasks.length !== totalSelectedDateTasks && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                    ({selectedDateTasks.length}/{totalSelectedDateTasks})
                  </span>
                )}
              </h3>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => { setEditingTask(null); setShowAddModal(true) }}
              style={{ padding: '8px 12px' }}
            >
              <Plus size={16} /> Add
            </button>
          </div>

          {/* Search filter for tasks */}
          {totalSelectedDateTasks > 2 && (
            <SearchFilter
              value={searchQuery}
              onChange={setSearchQuery}
              topics={topics}
              selectedTopic={topicFilter}
              onTopicChange={setTopicFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              placeholder="Filter tasks..."
            />
          )}

          {selectedDateTasks.length === 0 ? (
            totalSelectedDateTasks === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 14 }}>No tasks for this day</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Click "Add" to create one</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 13 }}>No tasks match filters</p>
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedDateTasks.map((task, i) => {
                const hasSubtasks = task.subtasks && task.subtasks.length > 0
                const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0
                const isOverdue = !task.completed && selectedDate < todayStr
                
                return (
                  <div key={task.id}>
                    <div
                      className={`task-item ${task.completed ? 'completed' : ''} animate-fadeIn stagger-${Math.min(i + 1, 5)}`}
                      style={{
                        padding: '12px 14px',
                        borderLeft: isOverdue ? '3px solid #ef4444' : undefined,
                        background: isOverdue ? 'rgba(239,68,68,0.04)' : undefined,
                        borderRadius: expandedNotes.has(task.id) ? '12px 12px 0 0' : undefined,
                      }}
                    >
                    <button
                      onClick={() => toggleTaskComplete(task.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}
                    >
                      {task.completed 
                        ? <CheckCircle2 size={18} color="var(--accent-green)" className="animate-check" />
                        : <Circle size={18} color="var(--text-muted)" />
                      }
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
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
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} /> {task.duration}m
                        </span>
                        {task.recurrence && task.recurrence !== 'none' && (
                          <span style={{ fontSize: 10, color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Repeat size={10} />
                          </span>
                        )}
                        {hasSubtasks && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <ListChecks size={10} /> {completedSubtasks}/{task.subtasks.length}
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: task.completed ? 'line-through' : 'none',
                        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                      }}>
                        {task.title}
                        {isOverdue && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 6px',
                            borderRadius: 4, background: 'rgba(239,68,68,0.12)',
                            color: '#ef4444', flexShrink: 0,
                          }}>
                            Overdue
                          </span>
                        )}
                      </p>
                      {task.description && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{task.description}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => toggleNoteExpanded(task.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                          color: task.note?.trim() ? 'var(--accent-blue)' : 'var(--text-muted)',
                          outline: 'none', borderRadius: 4 }}
                        title={expandedNotes.has(task.id) ? 'Hide note' : 'Add/view note'}
                      >
                        <StickyNote size={14} />
                      </button>
                      <button
                        onClick={() => handleEditTask(task)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Inline task note */}
                  {expandedNotes.has(task.id) && (
                    <div style={{
                      padding: '8px 12px',
                      background: 'var(--bg-input)',
                      borderTop: '1px solid var(--border-primary)',
                      borderRadius: '0 0 12px 12px',
                      border: '1px solid var(--border-primary)',
                      borderTop: 'none',
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}>
                      <StickyNote size={12} style={{ color: 'var(--accent-blue)', marginTop: 3, flexShrink: 0 }} />
                      <textarea
                        value={task.note || ''}
                        onChange={e => updateTaskNote(task.id, e.target.value)}
                        placeholder="Add a note for this task…"
                        rows={2}
                        style={{
                          flex: 1, background: 'transparent', border: 'none',
                          outline: 'none', resize: 'vertical', fontSize: 12,
                          color: 'var(--text-secondary)', fontFamily: 'inherit',
                          lineHeight: 1.5, padding: 0,
                        }}
                      />
                    </div>
                  )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Daily Notes for selected date */}
          <DailyNotes 
            date={selectedDate} 
            note={getNote(selectedDate)} 
            onSave={setNote} 
          />
        </div>
      </div>

      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingTask(null) }}
        onSave={handleSaveTask}
        topics={topics}
        onAddTopic={addTopic}
        editTask={editingTask}
        defaultDate={selectedDate}
        availableTasks={tasks}
      />
    </div>
  )
}
