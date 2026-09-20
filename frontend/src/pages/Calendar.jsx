import { useState, useMemo, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Plus, CheckCircle2, Circle, Clock, Trash2, Edit3, Repeat, ListChecks, BookOpen, StickyNote } from 'lucide-react'
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
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(viewYear)

  // Close month picker on outside click
  const pickerRef = useRef(null)
  useEffect(() => {
    if (!showMonthPicker) return
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowMonthPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMonthPicker])

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()

  const goToday = () => {
    setViewYear(todayYear)
    setViewMonth(todayMonth)
    setSelectedDate(today.toISOString().split('T')[0])
    setShowMonthPicker(false)
  }

  const jumpTo = (year, month) => {
    setViewYear(year)
    setViewMonth(month)
    setShowMonthPicker(false)
  }

  const isCurrentMonth = viewYear === todayYear && viewMonth === todayMonth
  
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

      <div className="calendar-layout" style={{ maxWidth: 1100 }}>
        {/* Calendar Grid */}
        <div className="card-static">
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="btn btn-ghost" onClick={prevMonth} style={{ padding: 6 }}>
                <ChevronLeft size={18} />
              </button>
            </div>

            {/* Clickable month/year — opens picker */}
            <button
              onClick={() => { setPickerYear(viewYear); setShowMonthPicker(p => !p) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 600, color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 8,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              title="Click to jump to any month"
            >
              {monthName}
              <ChevronDown size={15} color="var(--text-muted)" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {!isCurrentMonth && (
                <button
                  className="btn btn-ghost"
                  onClick={goToday}
                  style={{ padding: '4px 10px', fontSize: 12, color: 'var(--accent-blue)' }}
                >
                  Today
                </button>
              )}
              <button className="btn btn-ghost" onClick={nextMonth} style={{ padding: 6 }}>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Month/Year picker dropdown */}
            {showMonthPicker && (
              <div
                ref={pickerRef}
                style={{
                  position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)',
                  zIndex: 100, background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)', borderRadius: 14,
                  padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  minWidth: 260,
                }}
              >
                {/* Year navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <button className="btn btn-ghost" style={{ padding: 6 }}
                    onClick={() => setPickerYear(y => y - 1)}>
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{pickerYear}</span>
                  <button className="btn btn-ghost" style={{ padding: 6 }}
                    onClick={() => setPickerYear(y => y + 1)}>
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Month grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {MONTHS.map((m, i) => {
                    const isSelected = pickerYear === viewYear && i === viewMonth
                    const isTodayM   = pickerYear === todayYear && i === todayMonth
                    return (
                      <button
                        key={m}
                        onClick={() => jumpTo(pickerYear, i)}
                        style={{
                          padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          fontSize: 13, fontWeight: isSelected ? 700 : 500,
                          background: isSelected ? 'var(--accent-blue)' : isTodayM ? 'rgba(59,130,246,0.12)' : 'var(--bg-input)',
                          color: isSelected ? 'white' : isTodayM ? 'var(--accent-blue)' : 'var(--text-secondary)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(59,130,246,0.15)' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isTodayM ? 'rgba(59,130,246,0.12)' : 'var(--bg-input)' }}
                      >
                        {m}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '6px 2px' }}>
                {d.slice(0, 1)}
                <span className="cal-day-full">{d.slice(1)}</span>
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {calendarDays.map((cell, i) => {
              if (!cell.day) {
                return <div key={i} style={{ minHeight: 48, padding: 4 }} />
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
                    minHeight: 48,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
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
                  <span style={{ fontSize: 13 }}>{cell.day}</span>
                  {counts && (counts.total > 0 || counts.hasNote) && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {counts.total > 0 && (
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: hasCompletedAll ? 'var(--accent-green)' : counts.completed > 0 ? 'var(--accent-orange)' : 'var(--text-muted)',
                        }} />
                      )}
                      {counts.hasNote && (
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%',
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
                        overflow: 'hidden',
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
                      {task.description?.trim() && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {task.description.trim()}
                        </p>
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
