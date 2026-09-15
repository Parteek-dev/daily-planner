import { useState, useEffect } from 'react'
import { X, CheckCircle2, Circle, Clock, Flag, Play, Pause, RotateCcw, ChevronRight, Sparkles } from 'lucide-react'
import { PRIORITY_CONFIG } from '../hooks/useProgress'

export default function FocusMode({ 
  isOpen, 
  onClose, 
  task, 
  onToggleComplete,
  onSetActualDuration,
  onNextTask,
  hasNextTask,
}) {
  const [elapsed, setElapsed] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  // Reset timer when task changes
  useEffect(() => {
    setElapsed(0)
    setIsTimerRunning(false)
  }, [task?.id])

  // Timer logic
  useEffect(() => {
    let interval
    if (isTimerRunning && !task?.completed) {
      interval = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, task?.completed])

  // Handle task completion with actual duration tracking
  const handleComplete = (taskId) => {
    // Save actual duration (convert seconds to minutes, round up)
    const actualMinutes = Math.ceil(elapsed / 60)
    if (onSetActualDuration && elapsed > 0) {
      onSetActualDuration(taskId, actualMinutes)
    }
    onToggleComplete(taskId)
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDueTime = (timeStr) => {
    if (!timeStr) return null
    const [hours, minutes] = timeStr.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  const progress = task?.duration ? Math.min(100, (elapsed / 60 / task.duration) * 100) : 0

  if (!isOpen || !task) return null

  const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null

  return (
    <div 
      className="focus-mode-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-primary)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 12,
          padding: '10px 16px',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
        }}
      >
        <X size={18} /> Exit Focus
      </button>

      {/* Focus label */}
      <div style={{ 
        fontSize: 13, 
        fontWeight: 600, 
        color: 'var(--accent-blue)', 
        textTransform: 'uppercase', 
        letterSpacing: '0.1em',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Sparkles size={16} />
        Focus Mode
      </div>

      {/* Task completed celebration */}
      {task.completed ? (
        <div className="animate-fadeIn" style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent-green)', marginBottom: 8 }}>
            Task Completed!
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
            Great job! You spent {formatTime(elapsed)} on this task.
          </p>
          {hasNextTask && (
            <button
              onClick={onNextTask}
              className="btn btn-primary"
              style={{ marginTop: 24, padding: '12px 24px', fontSize: 16 }}
            >
              Next Task <ChevronRight size={20} />
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Priority badge */}
          {priorityConfig && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              background: priorityConfig.bgColor,
              color: priorityConfig.color,
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
            }}>
              <Flag size={14} />
              {priorityConfig.label} Priority
            </div>
          )}

          {/* Task title */}
          <h1 style={{ 
            fontSize: 36, 
            fontWeight: 700, 
            color: 'var(--text-primary)', 
            textAlign: 'center',
            maxWidth: 600,
            marginBottom: 12,
          }}>
            {task.title}
          </h1>

          {/* Task description */}
          {task.description && (
            <p style={{ 
              fontSize: 16, 
              color: 'var(--text-muted)', 
              textAlign: 'center',
              maxWidth: 500,
              marginBottom: 24,
              lineHeight: 1.6,
            }}>
              {task.description}
            </p>
          )}

          {/* Task meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              fontSize: 14, 
              color: 'var(--text-secondary)',
              padding: '8px 14px',
              background: 'var(--bg-secondary)',
              borderRadius: 20,
            }}>
              <Clock size={16} />
              {task.duration} min planned
            </span>
            {task.dueTime && (
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                fontSize: 14, 
                color: 'var(--accent-orange)',
                padding: '8px 14px',
                background: 'rgba(249,115,22,0.15)',
                borderRadius: 20,
              }}>
                @ {formatDueTime(task.dueTime)}
              </span>
            )}
          </div>

          {/* Large timer display */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ 
              fontSize: 72, 
              fontWeight: 700, 
              fontFamily: 'monospace',
              color: 'var(--text-primary)',
              letterSpacing: 4,
            }}>
              {formatTime(elapsed)}
            </div>
            <div style={{ 
              width: 300, 
              height: 6, 
              background: 'var(--bg-secondary)', 
              borderRadius: 3,
              margin: '16px auto',
              overflow: 'hidden',
            }}>
              <div style={{ 
                width: `${progress}%`, 
                height: '100%', 
                background: progress >= 100 ? 'var(--accent-orange)' : 'var(--accent-blue)',
                borderRadius: 3,
                transition: 'width 1s linear',
              }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {progress >= 100 
                ? `${Math.round(elapsed / 60 - task.duration)} min over planned time`
                : `${Math.max(0, task.duration - Math.round(elapsed / 60))} min remaining`
              }
            </p>
          </div>

          {/* Timer controls */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
            <button
              onClick={() => setElapsed(0)}
              className="btn btn-secondary"
              style={{ padding: '14px 20px' }}
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="btn btn-primary"
              style={{ padding: '14px 32px', fontSize: 16 }}
            >
              {isTimerRunning ? <Pause size={22} /> : <Play size={22} />}
              {isTimerRunning ? 'Pause' : 'Start'}
            </button>
          </div>

          {/* Complete button */}
          <button
            onClick={() => handleComplete(task.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '16px 32px',
              fontSize: 18,
              fontWeight: 600,
              background: 'var(--accent-green)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <CheckCircle2 size={24} />
            Mark as Complete
          </button>
        </>
      )}

      {/* Subtasks */}
      {task.subtasks && task.subtasks.length > 0 && !task.completed && (
        <div style={{ 
          marginTop: 40, 
          width: '100%', 
          maxWidth: 400,
          background: 'var(--bg-secondary)',
          borderRadius: 12,
          padding: 20,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Subtasks ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
          </h3>
          {task.subtasks.map(subtask => (
            <div 
              key={subtask.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom: '1px solid var(--border-primary)',
              }}
            >
              {subtask.completed 
                ? <CheckCircle2 size={18} color="var(--accent-green)" />
                : <Circle size={18} color="var(--text-muted)" />
              }
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
