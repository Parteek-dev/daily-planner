import { useState } from 'react'
import { X, CheckCircle2, Circle, GripVertical, Maximize2, Minimize2 } from 'lucide-react'

export default function WidgetView({ isOpen, onClose, tasks, onToggleComplete, getTopicColor }) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [position,    setPosition]    = useState({ x: window.innerWidth - 340, y: 100 })
  const [isDragging,  setIsDragging]  = useState(false)
  const [dragOffset,  setDragOffset]  = useState({ x: 0, y: 0 })

  if (!isOpen) return null

  const todayStr       = new Date().toISOString().split('T')[0]
  const todayTasks     = tasks.filter(t => t.date === todayStr)
  const completedCount = todayTasks.filter(t => t.completed).length
  const pendingTasks   = todayTasks.filter(t => !t.completed)

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return
    setIsDragging(true)
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y })
  }
  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPosition({
      x: Math.max(0, Math.min(window.innerWidth - 320,  e.clientX - dragOffset.x)),
      y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y)),
    })
  }
  const handleMouseUp = () => setIsDragging(false)

  const badge = (
    <span style={{
      fontSize: 12, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
      background: completedCount === todayTasks.length && todayTasks.length > 0
        ? 'var(--accent-green)' : 'var(--accent-blue)',
      color: 'white',
    }}>
      {completedCount}/{todayTasks.length}
    </span>
  )

  const taskBody = (
    <>
      {todayTasks.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 14 }}>No tasks for today</p>
        </div>
      ) : (
        <div style={{ padding: 8 }}>
          {pendingTasks.map(task => (
            <TaskItem key={task.id} task={task} onToggle={onToggleComplete} getTopicColor={getTopicColor} />
          ))}
          {todayTasks.filter(t => t.completed).map(task => (
            <TaskItem key={task.id} task={task} onToggle={onToggleComplete} getTopicColor={getTopicColor} />
          ))}
        </div>
      )}
      {todayTasks.length > 0 && (
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(completedCount / todayTasks.length) * 100}%`,
              background: completedCount === todayTasks.length ? 'var(--accent-green)' : 'var(--accent-blue)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* ── MOBILE: bottom sheet ── */}
      <div className="widget-mobile-sheet">
        {/* Backdrop */}
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9990 }} />
        {/* Sheet */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--bg-secondary)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border-primary)',
          borderBottom: 'none',
          zIndex: 9991,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
          maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          animation: 'slideUp 0.25s ease-out',
        }}>
          {/* Pull handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-secondary)' }} />
          </div>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px 12px',
            borderBottom: '1px solid var(--border-primary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Today's Tasks</span>
              {badge}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-muted)', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>
          {/* Task list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {taskBody}
          </div>
        </div>
      </div>

      {/* ── DESKTOP: draggable floating panel ── */}
      <div
        className="widget-desktop-panel"
        style={{
          position: 'fixed', left: position.x, top: position.y, width: 320,
          background: 'var(--bg-secondary)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: '1px solid var(--border-primary)',
          zIndex: 1000, overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'default',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Drag header */}
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-primary)', cursor: 'grab' }}
          onMouseDown={handleMouseDown}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GripVertical size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Today's Tasks</span>
            {badge}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setIsMinimized(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', display: 'flex' }}>
              {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', display: 'flex' }}>
              <X size={14} />
            </button>
          </div>
        </div>
        {/* Task list */}
        {!isMinimized && (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {taskBody}
          </div>
        )}
      </div>
    </>
  )
}

function TaskItem({ task, onToggle, getTopicColor }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s ease' }}
      onClick={() => onToggle(task.id)}
      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-input)'}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
    >
      {task.completed
        ? <CheckCircle2 size={18} color="var(--accent-green)" />
        : <Circle      size={18} color="var(--text-muted)" />
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13,
          color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: task.completed ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {task.title}
        </p>
      </div>
      <div style={{ width: 6, height: 6, borderRadius: 2, background: getTopicColor(task.topic), flexShrink: 0 }} />
    </div>
  )
}
