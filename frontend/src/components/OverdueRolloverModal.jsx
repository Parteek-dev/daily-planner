import { useState } from 'react'
import { X, CalendarClock, CheckSquare, Square, MoveRight, Trash2 } from 'lucide-react'
import { fmtDuration } from '../lib/utils'

export default function OverdueRolloverModal({ tasks, onMoveSelected, onDismiss }) {
  const [selected, setSelected] = useState(new Set(tasks.map(t => t.id)))

  if (!tasks.length) return null

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const toggleAll = () => {
    if (selected.size === tasks.length) setSelected(new Set())
    else setSelected(new Set(tasks.map(t => t.id)))
  }

  const handleMove = () => {
    if (selected.size > 0) onMoveSelected(Array.from(selected))
  }

  // Group by date for display
  const byDate = {}
  tasks.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = []
    byDate[t.date].push(t)
  })
  const sortedDates = Object.keys(byDate).sort().reverse() // most recent first

  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarClock size={20} color="var(--accent-orange)" />
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              Unfinished tasks from the past
            </h2>
          </div>
          <button
            onClick={onDismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          You have <strong style={{ color: 'var(--accent-orange)' }}>{tasks.length} incomplete {tasks.length === 1 ? 'task' : 'tasks'}</strong> from previous days.
          Move selected ones to today or dismiss.
        </p>

        {/* Select all */}
        <button
          onClick={toggleAll}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
            marginBottom: 10, padding: '4px 0',
          }}
        >
          {selected.size === tasks.length
            ? <CheckSquare size={14} color="var(--accent-blue)" />
            : <Square size={14} />}
          {selected.size === tasks.length ? 'Deselect all' : 'Select all'}
        </button>

        {/* Task list grouped by date */}
        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {sortedDates.map(date => (
            <div key={date}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: 6,
              }}>
                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
              {byDate[date].map(task => (
                <div
                  key={task.id}
                  onClick={() => toggle(task.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                    background: selected.has(task.id) ? 'rgba(59,130,246,0.08)' : 'var(--bg-input)',
                    border: `1px solid ${selected.has(task.id) ? 'rgba(59,130,246,0.3)' : 'var(--border-primary)'}`,
                    marginBottom: 6,
                    transition: 'background 0.15s, border 0.15s',
                  }}
                >
                  {selected.has(task.id)
                    ? <CheckSquare size={16} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
                    : <Square size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {task.title}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                      {task.topic} · {fmtDuration(task.duration)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost"
            onClick={onDismiss}
            style={{ fontSize: 13, color: 'var(--text-muted)' }}
          >
            Dismiss for today
          </button>
          <button
            className="btn btn-primary"
            onClick={handleMove}
            disabled={selected.size === 0}
            style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <MoveRight size={14} />
            Move {selected.size > 0 ? selected.size : ''} to today
          </button>
        </div>
      </div>
    </div>
  )
}
