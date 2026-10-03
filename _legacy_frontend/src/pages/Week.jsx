import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, Clock, Trash2, Edit3, Flag, Repeat, RotateCcw, InboxIcon, Sparkles, CalendarDays, ChevronDown } from 'lucide-react'
import AddTaskModal from '../components/AddTaskModal'
import { fmtDuration } from '../lib/utils'
import { PRIORITY_CONFIG } from '../hooks/useProgress'

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function dateStr(date) {
  // Use local date parts to avoid UTC timezone shift
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_NAMES_FULL  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function WeekPage({ progress }) {
  const {
    tasks, topics, addTask, addTopic, updateTask, deleteTask,
    toggleTaskComplete, getTopicColor,
  } = progress

  const todayStr = new Date().toISOString().split('T')[0]

  // ── Week navigation ────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))

  const weekDays = useMemo(() => (
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i)
      return { date: d, str: dateStr(d), label: DAY_NAMES_SHORT[i], full: DAY_NAMES_FULL[i] }
    })
  ), [weekStart])

  const prevWeek = () => setWeekStart(d => addDays(d, -7))
  const nextWeek = () => setWeekStart(d => addDays(d, 7))
  const goToday  = () => setWeekStart(getMonday(new Date()))

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6)
    const startLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endLabel   = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${startLabel} – ${endLabel}`
  }, [weekStart])

  const isCurrentWeek = useMemo(() => {
    const thisMonday = getMonday(new Date())
    return dateStr(weekStart) === dateStr(thisMonday)
  }, [weekStart])

  // ── Task modal state ───────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTask,  setEditingTask]  = useState(null)
  const [defaultDate,  setDefaultDate]  = useState(todayStr)

  const openAdd = (dateStr) => {
    setEditingTask(null)
    setDefaultDate(dateStr)
    setShowAddModal(true)
  }

  const openEdit = (task) => {
    setEditingTask(task)
    setShowAddModal(true)
  }

  const handleSave = (taskData) => {
    if (editingTask) updateTask(editingTask.id, taskData)
    else addTask(taskData)
  }

  // ── Drag & drop between columns ────────────────────────────────────────
  const [dragTaskId,   setDragTaskId]   = useState(null)
  const [dragOverDate, setDragOverDate] = useState(null)
  const dragSourceDate = useRef(null)

  const handleDragStart = (e, task) => {
    setDragTaskId(task.id)
    dragSourceDate.current = task.date
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id)
    setTimeout(() => { if (e.target) e.target.style.opacity = '0.4' }, 0)
  }

  const handleDragEnd = (e) => {
    if (e.target) e.target.style.opacity = '1'
    setDragTaskId(null)
    setDragOverDate(null)
    dragSourceDate.current = null
  }

  const handleDragOver = (e, dateStr) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(dateStr)
  }

  const handleDragLeave = (e) => {
    // Only clear if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverDate(null)
    }
  }

  const handleDrop = (e, targetDate) => {
    e.preventDefault()
    setDragOverDate(null)
    if (!dragTaskId || targetDate === dragSourceDate.current) return
    updateTask(dragTaskId, { date: targetDate })
    setDragTaskId(null)
  }

  // Tasks per day
  const tasksByDay = useMemo(() => {
    const map = {}
    weekDays.forEach(d => { map[d.str] = [] })
    tasks.forEach(t => {
      if (map[t.date] !== undefined) map[t.date].push(t)
    })
    return map
  }, [tasks, weekDays])

  const colMinWidth  = 148
  const colMinHeight = 400

  // Auto-scroll today's column into view on desktop
  const gridRef  = useRef(null)
  const todayRef = useRef(null)
  useEffect(() => {
    if (todayRef.current && gridRef.current) {
      const grid = gridRef.current
      if (grid.scrollWidth > grid.clientWidth) {
        todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [weekDays])

  // Mobile selected day — default to today if in current week, else first day
  const [mobileDay, setMobileDay] = useState(() => {
    const t = new Date().toISOString().split('T')[0]
    return t
  })
  useEffect(() => {
    const weekStrs = Array.from({ length: 7 }, (_, i) => dateStr(addDays(weekStart, i)))
    if (!weekStrs.includes(mobileDay)) {
      const today = new Date().toISOString().split('T')[0]
      setMobileDay(weekStrs.includes(today) ? today : weekStrs[0])
    }
  }, [weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Week</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{weekLabel}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isCurrentWeek && (
            <button className="btn btn-ghost" onClick={goToday} style={{ fontSize: 13, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <RotateCcw size={13} /> Today
            </button>
          )}
          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 8, padding: 2 }}>
            <button className="btn btn-ghost" onClick={prevWeek} style={{ padding: '6px 10px' }}>
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-ghost" onClick={nextWeek} style={{ padding: '6px 10px' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE layout: day strip + single day panel ── */}
      <div className="week-mobile-view">
          {/* Day selector strip */}
          {/* Day selector strip — like calendar's day headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
            marginBottom: 12,
          }}>
            {weekDays.map(({ date, str, label }) => {
              const isToday    = str === todayStr
              const isSelected = str === mobileDay
              const dayTasks   = tasksByDay[str] || []
              const completed  = dayTasks.filter(t => t.completed).length
              return (
                <button
                  key={str}
                  onClick={() => setMobileDay(str)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 2, padding: '8px 4px', borderRadius: 10, border: 'none',
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: isSelected ? 'var(--accent-blue)' : isToday ? 'var(--bg-input)' : 'transparent',
                    color: isSelected ? 'white' : isToday ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label.slice(0, 1)}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>
                    {date.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: completed === dayTasks.length
                        ? (isSelected ? 'rgba(255,255,255,0.8)' : 'var(--accent-green)')
                        : (isSelected ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)'),
                    }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Single selected day panel — matches Today/Calendar style */}
          {(() => {
            const { str: selStr, label: selLabel, full: selFull, date: selDate } = weekDays.find(d => d.str === mobileDay) || weekDays[0]
            const isToday  = selStr === todayStr
            const isPast   = selStr < todayStr
            const dayTasks = tasksByDay[selStr] || []
            const completed = dayTasks.filter(t => t.completed).length
            return (
              <div className="card-static" style={{ padding: '14px 16px' }}>
                {/* Day panel header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                      {isToday ? 'Today' : isPast ? 'Past' : selLabel}
                    </p>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: isToday ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                      {selDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </h3>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => openAdd(selStr)}
                    style={{ padding: '8px 12px', fontSize: 13 }}
                  >
                    <Plus size={15} /> Add
                  </button>
                </div>

                {/* Progress bar */}
                {dayTasks.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {completed} of {dayTasks.length} tasks
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: completed === dayTasks.length ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
                        {Math.round((completed / dayTasks.length) * 100)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{
                        width: `${Math.round((completed / dayTasks.length) * 100)}%`,
                        background: completed === dayTasks.length ? 'var(--accent-green)' : 'var(--accent-blue)',
                      }} />
                    </div>
                  </div>
                )}

                {/* Task list */}
                {dayTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}
                    onClick={() => openAdd(selStr)}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                      {isPast
                        ? <InboxIcon size={28} color="var(--text-muted)" />
                        : isToday
                          ? <Sparkles size={28} color="var(--accent-blue)" />
                          : <CalendarDays size={28} color="var(--text-muted)" />
                      }
                    </div>
                    <p style={{ fontSize: 14, marginBottom: 4 }}>
                      {isPast ? 'Nothing was planned' : isToday ? 'Free today!' : 'Nothing planned'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 600 }}>+ Add task</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dayTasks.map(task => (
                      <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}
                        style={{ padding: '10px 12px' }}>
                        <button
                          onClick={() => toggleTaskComplete(task.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}
                        >
                          {task.completed
                            ? <CheckCircle2 size={17} color="var(--accent-green)" />
                            : <Circle size={17} color="var(--text-muted)" />
                          }
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 14, fontWeight: 500,
                            color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                            textDecoration: task.completed ? 'line-through' : 'none',
                            marginBottom: 4,
                          }}>
                            {task.title}
                          </p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                              background: `${getTopicColor(task.topic)}20`,
                              color: getTopicColor(task.topic),
                            }}>{task.topic}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Clock size={10} /> {fmtDuration(task.duration)}
                            </span>
                            {task.priority && <Flag size={10} color={PRIORITY_CONFIG[task.priority]?.color} />}
                            {task.recurrence && task.recurrence !== 'none' && <Repeat size={10} color="var(--accent-purple)" />}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button onClick={() => openEdit(task)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, color: 'var(--text-muted)' }}>
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => deleteTask(task.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, color: 'var(--text-muted)' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
      </div>{/* end week-mobile-view */}

      {/* ── DESKTOP layout: horizontal scrolling 7-column grid ── */}
      <div className="week-desktop-view">
          <div ref={gridRef} className="week-grid">
            {weekDays.map(({ date, str, label, full }) => {
              const isToday    = str === todayStr
              const isPast     = str < todayStr
              const dayTasks   = tasksByDay[str] || []
              const completed  = dayTasks.filter(t => t.completed).length
              const carryOvers = dayTasks.filter(t => t.originalDate && t.originalDate !== str).length
              const isDragOver = dragOverDate === str

              return (
                <div
                  key={str}
                  ref={isToday ? todayRef : null}
                  onDragOver={(e) => handleDragOver(e, str)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, str)}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    scrollSnapAlign: 'start', borderRadius: 14,
                    border: `1.5px solid ${isDragOver ? 'var(--accent-blue)' : isToday ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                    background: isDragOver ? 'rgba(59,130,246,0.06)' : isToday ? 'rgba(59,130,246,0.04)' : 'var(--bg-secondary)',
                    minHeight: colMinHeight,
                    transition: 'border-color 0.15s, background 0.15s',
                    overflow: 'hidden',
                  }}
                >
                  {/* Day header */}
                  <div style={{
                    padding: '12px 12px 10px',
                    borderBottom: '1px solid var(--border-primary)',
                    background: isToday ? 'rgba(59,130,246,0.08)' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: isToday ? 'var(--accent-blue)' : isPast ? 'var(--text-muted)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {label}
                        </p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: isToday ? 'var(--accent-blue)' : isPast ? 'var(--text-muted)' : 'var(--text-primary)', lineHeight: 1.1 }}>
                          {date.getDate()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                        {dayTasks.length > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: completed === dayTasks.length ? 'var(--accent-green)' : isToday ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
                            {completed}/{dayTasks.length}
                          </span>
                        )}
                        {carryOvers > 0 && (
                          <span style={{ fontSize: 10, color: 'var(--accent-orange)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }} title={`${carryOvers} carried over`}>
                            ↩{carryOvers}
                          </span>
                        )}
                        <button onClick={() => openAdd(str)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isToday ? 'var(--accent-blue)' : 'var(--text-muted)', padding: 2, borderRadius: 4, transition: 'color 0.15s' }} title={`Add task for ${full}`}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
                          onMouseLeave={e => e.currentTarget.style.color = isToday ? 'var(--accent-blue)' : 'var(--text-muted)'}>
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                    {dayTasks.length > 0 && (
                      <div style={{ height: 3, background: 'var(--bg-input)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round((completed / dayTasks.length) * 100)}%`, background: completed === dayTasks.length ? 'var(--accent-green)' : 'var(--accent-blue)', borderRadius: 2, transition: 'width 0.3s ease' }} />
                      </div>
                    )}
                  </div>

                  {/* Tasks */}
                  <div style={{ flex: 1, padding: '8px 8px 4px', display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto' }}>
                    {dayTasks.length === 0 ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 10, padding: '20px 8px', gap: 6 }} onClick={() => openAdd(str)}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isPast ? <InboxIcon size={22} color="var(--text-muted)" /> : isToday ? <Sparkles size={22} color="var(--accent-blue)" /> : <CalendarDays size={22} color="var(--text-muted)" />}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
                          {isPast ? 'Nothing was\nplanned' : isToday ? 'Free today!\nAdd a task' : 'Nothing\nplanned'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600, marginTop: 2, opacity: 0.8 }}>+ Add task</span>
                      </div>
                    ) : (
                      dayTasks.map(task => (
                        <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task)} onDragEnd={handleDragEnd}
                          style={{ padding: '8px 9px', borderRadius: 9, background: task.completed ? 'var(--bg-input)' : 'var(--bg-card, var(--bg-input))', border: `1px solid ${task.priority ? PRIORITY_CONFIG[task.priority]?.bgColor || 'var(--border-primary)' : 'var(--border-primary)'}`, cursor: 'grab', opacity: task.completed ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                            <button onClick={() => toggleTaskComplete(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 1 }}>
                              {task.completed ? <CheckCircle2 size={14} color="var(--accent-green)" /> : <Circle size={14} color="var(--text-muted)" />}
                            </button>
                            <p style={{ flex: 1, fontSize: 12, fontWeight: 500, color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none', lineHeight: 1.4, wordBreak: 'break-word' }}>
                              {task.title}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: `${getTopicColor(task.topic)}20`, color: getTopicColor(task.topic) }}>{task.topic}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}><Clock size={9} /> {fmtDuration(task.duration)}</span>
                              {task.priority && <Flag size={9} color={PRIORITY_CONFIG[task.priority]?.color} />}
                              {task.recurrence && task.recurrence !== 'none' && <Repeat size={9} color="var(--accent-purple)" />}
                              {task.originalDate && task.originalDate !== task.date && <span title={`Moved from ${new Date(task.originalDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`} style={{ fontSize: 10, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 600, cursor: 'default' }}>↩</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                              <button onClick={() => openEdit(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--text-muted)', borderRadius: 4 }} title="Edit"><Edit3 size={11} /></button>
                              <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--text-muted)', borderRadius: 4 }} title="Delete"><Trash2 size={11} /></button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {dayTasks.length > 0 && (
                    <button onClick={() => openAdd(str)} style={{ width: '100%', padding: '8px 0', background: 'none', border: 'none', borderTop: '1px solid var(--border-primary)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'background 0.15s, color 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                      <Plus size={12} /> Add
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <p className="week-scroll-hint">← swipe to see all days →</p>
      </div>

      {/* Week summary */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 12, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {(() => {
          const allWeek    = weekDays.flatMap(d => tasksByDay[d.str] || [])
          const totalTasks = allWeek.length
          const doneTasks  = allWeek.filter(t => t.completed).length
          const totalMins  = allWeek.filter(t => t.completed).reduce((s, t) => s + (t.duration || 0), 0)
          const pct        = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
          return (
            <>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-primary)' }}>{doneTasks}</strong>/{totalTasks} tasks done</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--accent-blue)' }}>{pct}%</strong> completion</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--accent-green)' }}>{Math.floor(totalMins / 60)}h {totalMins % 60}m</strong> focused</span>
            </>
          )
        })()}
      </div>

      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingTask(null) }}
        onSave={handleSave}
        topics={topics}
        onAddTopic={addTopic}
        editTask={editingTask}
        defaultDate={defaultDate}
        availableTasks={tasks}
      />
    </div>
  )
}
