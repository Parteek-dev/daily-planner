import { useState, useMemo } from 'react'
import { X, Calendar, CheckSquare, Square, AlertTriangle, Clock, Flag, Repeat, ArrowRight } from 'lucide-react'

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f97316', low: '#22c55e' }

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  })
}

export default function IcsImportPreview({
  isOpen,
  onClose,
  parseResult,       // { tasks, calendarCategories, total, duplicates }
  topics,
  onConfirm,         // (selectedTasks) => void
}) {
  const [selected,     setSelected]     = useState(() => new Set(
    parseResult?.tasks?.filter(t => !t._isDuplicate).map((_, i) => i) ?? []
  ))
  // topic mapping: { [categoryName]: topicName }
  const [topicMap, setTopicMap] = useState(() => {
    const map = {}
    parseResult?.calendarCategories?.forEach(cat => {
      // Try to match existing topic
      const match = topics.find(t => t.name.toLowerCase() === cat.toLowerCase())
      map[cat] = match?.name || topics[0]?.name || 'Personal'
    })
    return map
  })

  const tasks = parseResult?.tasks ?? []

  // Apply topic mapping to tasks
  const mappedTasks = useMemo(() => tasks.map(t => ({
    ...t,
    topic: t._categories ? (topicMap[t._categories] || 'Personal') : 'Personal',
  })), [tasks, topicMap])

  const toggleAll = () => {
    if (selected.size === tasks.length) setSelected(new Set())
    else setSelected(new Set(tasks.map((_, i) => i)))
  }

  const toggle = (i) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    return next
  })

  const handleConfirm = () => {
    const toImport = Array.from(selected).map(i => {
      const { _uid, _isAllDay, _isDuplicate, _categories, ...clean } = mappedTasks[i]
      return clean
    })
    onConfirm(toImport)
  }

  if (!isOpen || !parseResult) return null

  const dupCount  = tasks.filter(t => t._isDuplicate).length
  const selCount  = selected.size
  const allDayCount = tasks.filter(t => t._isAllDay).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Calendar size={18} color="var(--accent-blue)" /> Import from ICS
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Found <strong>{tasks.length}</strong> event{tasks.length !== 1 ? 's' : ''}
              {dupCount > 0 && <span style={{ color: '#f97316' }}> · {dupCount} possible duplicate{dupCount !== 1 ? 's' : ''}</span>}
              {allDayCount > 0 && <span style={{ color: 'var(--text-muted)' }}> · {allDayCount} all-day</span>}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Topic mapping */}
        {parseResult.calendarCategories?.length > 0 && (
          <div style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 10, flexShrink: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Map calendar categories → topics
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parseResult.calendarCategories.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    "{cat}"
                  </span>
                  <ArrowRight size={14} color="var(--text-muted)" />
                  <select
                    value={topicMap[cat] || 'Personal'}
                    onChange={e => setTopicMap(prev => ({ ...prev, [cat]: e.target.value }))}
                    className="input"
                    style={{ width: 140, padding: '5px 8px', fontSize: 12 }}
                  >
                    {topics.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Select all */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
          <button
            onClick={toggleAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', padding: '2px 0' }}
          >
            {selected.size === tasks.length
              ? <CheckSquare size={14} color="var(--accent-blue)" />
              : <Square size={14} />
            }
            {selected.size === tasks.length ? 'Deselect all' : 'Select all'}
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {selCount} of {tasks.length} selected
          </span>
        </div>

        {/* Task list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {mappedTasks.map((task, i) => {
            const isSelected = selected.has(i)
            return (
              <div
                key={task._uid || i}
                onClick={() => toggle(i)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  background: isSelected ? 'rgba(59,130,246,0.06)' : 'var(--bg-input)',
                  border: `1px solid ${task._isDuplicate ? 'rgba(249,115,22,0.4)' : isSelected ? 'rgba(59,130,246,0.3)' : 'var(--border-primary)'}`,
                  transition: 'background 0.1s, border 0.1s',
                  opacity: isSelected ? 1 : 0.6,
                }}
              >
                {/* Checkbox */}
                <span style={{ flexShrink: 0, marginTop: 1 }}>
                  {isSelected
                    ? <CheckSquare size={15} color="var(--accent-blue)" />
                    : <Square size={15} color="var(--text-muted)" />
                  }
                </span>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                      {task.title}
                    </span>
                    {task._isDuplicate && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>
                        <AlertTriangle size={9} /> Duplicate
                      </span>
                    )}
                    {task._isAllDay && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>
                        All-day
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatDate(task.date)}
                    </span>
                    {task.dueTime && (
                      <span style={{ fontSize: 11, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Clock size={9} /> {task.dueTime}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {task.duration}m
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                      background: `${topics.find(t => t.name === task.topic)?.color || '#3b82f6'}20`,
                      color: topics.find(t => t.name === task.topic)?.color || '#3b82f6',
                    }}>
                      {task.topic}
                    </span>
                    {task.priority && (
                      <Flag size={10} color={PRIORITY_COLORS[task.priority]} />
                    )}
                    {task.recurrence !== 'none' && (
                      <span style={{ fontSize: 10, color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Repeat size={9} /> {task.recurrence}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, borderTop: '1px solid var(--border-primary)', paddingTop: 14 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: 13 }}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={selCount === 0}
            style={{ fontSize: 13, opacity: selCount === 0 ? 0.5 : 1 }}
          >
            Import {selCount} event{selCount !== 1 ? 's' : ''} →
          </button>
        </div>
      </div>
    </div>
  )
}
