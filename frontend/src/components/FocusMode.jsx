import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle2, Circle, Clock, Flag, Play, Pause, RotateCcw, ChevronRight, Sparkles, PartyPopper, Timer, Minimize2, Maximize2, GripVertical } from 'lucide-react'
import { PRIORITY_CONFIG } from '../hooks/useProgress'
import { fmtDuration } from '../lib/utils'

// Encouraging messages shown when timer starts
const START_MESSAGES = [
  'Deep work time 🧠',
  "You've got this!",
  'Stay in the zone ⚡',
  'Make it count 🎯',
  'Full focus mode 🔒',
]

export default function FocusMode({
  isOpen,
  onClose,
  task,
  onToggleComplete,
  onSetActualDuration,
  onNextTask,
  hasNextTask,
  minimized = false,
  onMinimize,
  onExpand,
}) {
  const [elapsed, setElapsed]               = useState(0)
  const [isTimerRunning, setIsTimerRunning]  = useState(false)
  const [countDown, setCountDown]            = useState(true)
  const [startMessage, setStartMessage]      = useState('')
  const [showStartMsg, setShowStartMsg]      = useState(false)
  const hasStarted = elapsed > 0 || isTimerRunning

  // Reset when task changes
  useEffect(() => {
    setElapsed(0)
    setIsTimerRunning(false)
    setShowStartMsg(false)
    setStartMessage('')
  }, [task?.id])

  // Timer tick
  useEffect(() => {
    let interval
    if (isTimerRunning && !task?.completed) {
      interval = setInterval(() => setElapsed(p => p + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, task?.completed])

  // Space bar → play/pause
  useEffect(() => {
    if (!isOpen || task?.completed) return
    const handler = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        handleToggleTimer()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isTimerRunning, task?.completed])

  const handleToggleTimer = useCallback(() => {
    setIsTimerRunning(prev => {
      const next = !prev
      // Show encouraging message when starting for the first time
      if (next && elapsed === 0) {
        const msg = START_MESSAGES[Math.floor(Math.random() * START_MESSAGES.length)]
        setStartMessage(msg)
        setShowStartMsg(true)
        setTimeout(() => setShowStartMsg(false), 2500)
      }
      return next
    })
  }, [elapsed])

  const handleComplete = (taskId) => {
    const actualMinutes = Math.ceil(elapsed / 60)
    if (onSetActualDuration && elapsed > 0) {
      onSetActualDuration(taskId, actualMinutes)
    }
    onToggleComplete(taskId)
  }

  const formatTime = (seconds) => {
    const s = Math.abs(seconds)
    const hrs  = Math.floor(s / 3600)
    const mins = Math.floor((s % 3600) / 60)
    const secs = s % 60
    const sign = seconds < 0 ? '-' : ''
    if (hrs > 0) return `${sign}${hrs}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`
    return `${sign}${mins}:${secs.toString().padStart(2,'0')}`
  }

  const formatDueTime = (timeStr) => {
    if (!timeStr) return null
    const [hours, minutes] = timeStr.split(':')
    const h = parseInt(hours)
    return `${h % 12 || 12}:${minutes} ${h < 12 ? 'AM' : 'PM'}`
  }

  const estimatedSecs = (task?.duration || 0) * 60
  const isOverTime    = elapsed > estimatedSecs && estimatedSecs > 0
  const progress      = estimatedSecs > 0 ? Math.min(100, (elapsed / estimatedSecs) * 100) : 0

  // Countdown: how many seconds left (can go negative = over)
  const countdownSecs = estimatedSecs - elapsed
  // Display: if countdown mode show remaining (or overrun), else show elapsed
  const displaySeconds = countDown ? countdownSecs : elapsed

  const timerColor = isOverTime
    ? 'var(--accent-orange)'
    : 'var(--text-primary)'

  const progressColor = isOverTime ? 'var(--accent-orange)' : 'var(--accent-blue)'

  if (!isOpen || !task) return null

  const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null

  // Completion summary
  const actualMins    = Math.ceil(elapsed / 60)
  const diffMins      = actualMins - (task.duration || 0)
  const completionNote = elapsed === 0
    ? null
    : diffMins === 0
      ? 'Right on time!'
      : diffMins > 0
        ? `${fmtDuration(diffMins)} over estimate`
        : `${fmtDuration(Math.abs(diffMins))} under estimate`

  // ── Mini widget (shown when minimized) ──────────────────────────────────
  if (minimized) {
    return createPortal(
      <MiniWidget
        task={task}
        elapsed={elapsed}
        isTimerRunning={isTimerRunning}
        isOverTime={isOverTime}
        countdownSecs={countdownSecs}
        countDown={countDown}
        formatTime={formatTime}
        onToggle={handleToggleTimer}
        onExpand={onExpand}
        onClose={onClose}
      />,
      document.body
    )
  }

  return (
    <div
      className="focus-mode-overlay"
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--bg-primary)',
        zIndex: 100,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      {/* Exit + Minimize buttons */}
      <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 8 }}>
        <button
          onClick={onMinimize}
          style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
            borderRadius: 12, padding: '10px 14px', cursor: 'pointer',
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14,
          }}
          title="Minimize to widget"
        >
          <Minimize2 size={16} />
        </button>
        <button
          onClick={onClose}
          style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
            borderRadius: 12, padding: '10px 16px', cursor: 'pointer',
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14,
          }}
        >
          <X size={18} /> Exit Focus
        </button>
      </div>

      {/* Keyboard hint */}
      {!task.completed && (
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <kbd style={{
            padding: '2px 6px', borderRadius: 4, fontSize: 10, fontFamily: 'monospace',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
          }}>Space</kbd>
          to {isTimerRunning ? 'pause' : 'start'}
        </div>
      )}

      {/* Focus label */}
      <div style={{
        fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Sparkles size={16} />
        {showStartMsg ? startMessage : 'Focus Mode'}
      </div>

      {/* ── Completed state ── */}
      {task.completed ? (
        <div className="animate-fadeIn" style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <PartyPopper size={64} color="var(--accent-green)" />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent-green)', marginBottom: 8 }}>
            Task Completed!
          </h1>
          {completionNote && (
            <p style={{ fontSize: 15, color: diffMins > 0 ? 'var(--accent-orange)' : 'var(--accent-green)', fontWeight: 500, marginBottom: 4 }}>
              {completionNote}
            </p>
          )}
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            You spent {fmtDuration(actualMins)} on this task
            {task.duration ? ` · estimated ${fmtDuration(task.duration)}` : ''}
          </p>
          {hasNextTask && (
            <button onClick={onNextTask} className="btn btn-primary" style={{ marginTop: 24, padding: '12px 24px', fontSize: 16 }}>
              Next Task <ChevronRight size={20} />
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Priority badge */}
          {priorityConfig && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20,
              background: priorityConfig.bgColor, color: priorityConfig.color,
              fontSize: 13, fontWeight: 600, marginBottom: 16,
            }}>
              <Flag size={14} /> {priorityConfig.label} Priority
            </div>
          )}

          {/* Task title */}
          <h1 style={{
            fontSize: 36, fontWeight: 700, color: 'var(--text-primary)',
            textAlign: 'center', maxWidth: 600, marginBottom: 8,
          }}>
            {task.title}
          </h1>

          {/* Description */}
          {task.description && (
            <p style={{
              fontSize: 15, color: 'var(--text-muted)', textAlign: 'center',
              maxWidth: 500, marginBottom: 20, lineHeight: 1.6,
            }}>
              {task.description}
            </p>
          )}

          {/* Meta — only due time if present; duration shown in timer area */}
          {task.dueTime && (
            <div style={{ marginBottom: 32 }}>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 14,
                color: 'var(--accent-orange)', padding: '8px 14px',
                background: 'rgba(249,115,22,0.15)', borderRadius: 20,
              }}>
                @ {formatDueTime(task.dueTime)}
              </span>
            </div>
          )}
          {!task.dueTime && <div style={{ marginBottom: 32 }} />}

          {/* ── Timer ── */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            {/* Countdown / elapsed toggle */}
            <button
              onClick={() => setCountDown(p => !p)}
              title={countDown ? 'Switch to elapsed time' : 'Switch to countdown'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--text-muted)', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto 8px',
              }}
            >
              <Timer size={11} />
              {countDown ? 'countdown' : 'elapsed'}
            </button>

            <div style={{
              fontSize: 72, fontWeight: 700, fontFamily: 'monospace',
              color: timerColor,
              letterSpacing: 4,
              transition: 'color 0.4s ease',
            }}>
              {countDown && isOverTime ? '+' : ''}{formatTime(countDown ? Math.abs(countdownSecs) : elapsed)}
            </div>

            {/* Progress bar */}
            <div style={{
              width: 320, height: 6, background: 'var(--bg-secondary)',
              borderRadius: 3, margin: '16px auto', overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: progressColor, borderRadius: 3,
                transition: 'width 1s linear, background 0.4s ease',
              }} />
            </div>

            {/* Status line — single, no duplication */}
            <p style={{ fontSize: 13, color: isOverTime ? 'var(--accent-orange)' : 'var(--text-muted)', fontWeight: isOverTime ? 600 : 400 }}>
              {!hasStarted
                ? `${fmtDuration(task.duration)} estimated`
                : isOverTime
                  ? `${fmtDuration(Math.round((elapsed - estimatedSecs) / 60))} over estimate`
                  : countDown
                    ? `${fmtDuration(Math.max(0, Math.round(countdownSecs / 60)))} remaining`
                    : `${fmtDuration(Math.round(elapsed / 60))} elapsed`
              }
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 32, alignItems: 'center' }}>
            <button
              onClick={() => { setElapsed(0); setIsTimerRunning(false) }}
              className="btn btn-secondary"
              style={{ padding: '14px 20px' }}
              title="Reset timer"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={handleToggleTimer}
              className="btn btn-primary"
              style={{ padding: '14px 36px', fontSize: 16 }}
            >
              {isTimerRunning ? <Pause size={22} /> : <Play size={22} />}
              {isTimerRunning ? 'Pause' : 'Start'}
            </button>
          </div>

          {/* Complete button — dimmed until started */}
          <button
            onClick={() => handleComplete(task.id)}
            disabled={!hasStarted}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '16px 36px', fontSize: 17, fontWeight: 600,
              background: hasStarted ? 'var(--accent-green)' : 'var(--bg-secondary)',
              color: hasStarted ? 'white' : 'var(--text-muted)',
              border: hasStarted ? 'none' : '1px solid var(--border-primary)',
              borderRadius: 12, cursor: hasStarted ? 'pointer' : 'default',
              transition: 'background 0.3s ease, color 0.3s ease, transform 0.15s ease',
            }}
            onMouseOver={e => { if (hasStarted) e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)' }}
            title={!hasStarted ? 'Start the timer first' : undefined}
          >
            <CheckCircle2 size={22} />
            Mark as Complete
          </button>
          {!hasStarted && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              Start the timer to enable completion
            </p>
          )}
        </>
      )}

      {/* Subtasks */}
      {task.subtasks && task.subtasks.length > 0 && !task.completed && (
        <div style={{
          marginTop: 36, width: '100%', maxWidth: 400,
          background: 'var(--bg-secondary)', borderRadius: 12, padding: 20,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Subtasks ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
          </h3>
          {task.subtasks.map(subtask => (
            <div key={subtask.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 0', borderBottom: '1px solid var(--border-primary)',
            }}>
              {subtask.completed
                ? <CheckCircle2 size={18} color="var(--accent-green)" />
                : <Circle size={18} color="var(--text-muted)" />}
              <span style={{
                fontSize: 14,
                color: subtask.completed ? 'var(--text-muted)' : 'var(--text-primary)',
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
}

// ── Mini floating widget — draggable, persists across routes ─────────────
function MiniWidget({ task, elapsed, isTimerRunning, isOverTime, countdownSecs, countDown, formatTime, onToggle, onExpand, onClose }) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 140 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return
    setIsDragging(true)
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging) return
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth  - 320, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 80,  e.clientY - dragOffset.current.y)),
      })
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  const timerColor  = isOverTime ? 'var(--accent-orange)' : 'var(--accent-blue)'
  const displaySecs = countDown ? Math.abs(countdownSecs) : elapsed

  return (
    <div
      style={{
        position: 'fixed', left: position.x, top: position.y, width: 300,
        zIndex: 9999,
        background: 'var(--bg-secondary)',
        borderRadius: 16,
        border: '1px solid var(--border-primary)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'default',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: visible ? 'opacity 0.25s ease, transform 0.25s ease' : 'none',
        userSelect: 'none',
      }}
      onMouseMove={(e) => {
        if (!isDragging) return
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth  - 320, e.clientX - dragOffset.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - 80,  e.clientY - dragOffset.current.y)),
        })
      }}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      {/* Drag header — matches WidgetView style */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 14px',
          background: 'var(--bg-input)',
          borderBottom: '1px solid var(--border-primary)',
          cursor: 'grab',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GripVertical size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Focus Mode</span>
          {isOverTime && (
            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 8, fontWeight: 600, background: 'rgba(249,115,22,0.15)', color: 'var(--accent-orange)' }}>
              over
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onExpand} title="Expand to full screen" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', display: 'flex' }}>
            <Maximize2 size={14} />
          </button>
          <button onClick={onClose} title="Exit Focus Mode" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', display: 'flex' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }}>
        {/* Task name */}
        <p style={{
          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 12,
        }}>
          {task.title}
        </p>

        {/* Timer + controls row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 28, fontWeight: 700, fontFamily: 'monospace',
            color: timerColor, letterSpacing: 2,
          }}>
            {isOverTime && countDown ? '+' : ''}{formatTime(displaySecs)}
          </span>

          <button
            onClick={onToggle}
            title={isTimerRunning ? 'Pause' : 'Resume'}
            style={{
              background: isTimerRunning ? 'rgba(99,102,241,0.12)' : 'var(--accent-blue)',
              border: 'none', borderRadius: 10, padding: '8px 16px',
              cursor: 'pointer',
              color: isTimerRunning ? 'var(--accent-blue)' : '#fff',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 600,
            }}
          >
            {isTimerRunning ? <Pause size={15} /> : <Play size={15} />}
            {isTimerRunning ? 'Pause' : 'Resume'}
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden', marginTop: 12 }}>
          {task.duration > 0 && (
            <div style={{
              height: '100%',
              width: `${Math.min(100, (elapsed / 60 / task.duration) * 100)}%`,
              background: isOverTime ? 'var(--accent-orange)' : 'var(--accent-blue)',
              borderRadius: 2,
              transition: 'width 1s linear',
            }} />
          )}
        </div>
      </div>
    </div>
  )
}
