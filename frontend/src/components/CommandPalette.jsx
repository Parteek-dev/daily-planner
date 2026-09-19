import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, Calendar, X, Clock, CheckCircle2, Circle, ArrowRight, StickyNote } from 'lucide-react'

function getDateLabel(dateStr) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  if (dateStr === todayStr)     return { label: 'Today',    color: 'var(--accent-blue)' }
  if (dateStr === tomorrowStr)  return { label: 'Tomorrow', color: 'var(--accent-green)' }

  const d = new Date(dateStr + 'T12:00:00')
  const diff = Math.round((d - today) / 86400000)
  if (diff > 0 && diff <= 7)   return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), color: 'var(--text-secondary)' }
  if (diff < 0)                return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: '#ef4444' }
  return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'var(--text-muted)' }
}

export default function CommandPalette({ isOpen, onClose, tasks, topics, getTopicColor, onNavigate }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return tasks
      .filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.topic.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.note && t.note.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        // Completed tasks last
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        // Most recent date first
        return b.date.localeCompare(a.date)
      })
      .slice(0, 12)
  }, [query, tasks])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selectedIndex]) handleSelect(results[selectedIndex])
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, results, selectedIndex])

  // Keep selected item in view
  useEffect(() => {
    if (!listRef.current) return
    const item = listRef.current.children[selectedIndex]
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleSelect = (task) => {
    const todayStr = new Date().toISOString().split('T')[0]
    if (task.date === todayStr) {
      onNavigate('/today')
    } else {
      // Navigate to calendar and pass the date via sessionStorage
      sessionStorage.setItem('calendar_jump_date', task.date)
      onNavigate('/calendar')
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          margin: '0 16px',
        }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          borderBottom: query && results.length > 0 ? '1px solid var(--border-primary)' : 'none',
        }}>
          <Search size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
            placeholder="Search tasks, topics, notes…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 16, color: 'var(--text-primary)',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
              <X size={16} />
            </button>
          )}
          <kbd style={{
            padding: '3px 8px', fontSize: 11, background: 'var(--bg-input)',
            border: '1px solid var(--border-secondary)', borderRadius: 6,
            color: 'var(--text-muted)', flexShrink: 0,
          }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        {query && (
          <div ref={listRef} style={{ maxHeight: 380, overflowY: 'auto' }}>
            {results.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                No tasks found for "{query}"
              </div>
            ) : (
              results.map((task, i) => {
                const dateInfo = getDateLabel(task.date)
                const isSelected = i === selectedIndex
                return (
                  <div
                    key={task.id}
                    onClick={() => handleSelect(task)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 18px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--bg-input)' : 'transparent',
                      borderBottom: '1px solid var(--border-primary)',
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Complete status icon */}
                    <span style={{ flexShrink: 0 }}>
                      {task.completed
                        ? <CheckCircle2 size={16} color="var(--accent-green)" />
                        : <Circle size={16} color="var(--text-muted)" />
                      }
                    </span>

                    {/* Task info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 14, fontWeight: 500,
                        color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: task.completed ? 'line-through' : 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginBottom: 3,
                      }}>
                        {task.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                          background: `${getTopicColor(task.topic)}20`,
                          color: getTopicColor(task.topic),
                        }}>
                          {task.topic}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} /> {task.duration}m
                        </span>
                        {task.note?.trim() && (
                          <span style={{ fontSize: 11, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <StickyNote size={10} /> has note
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date label + arrow */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: dateInfo.color }}>
                        {dateInfo.label}
                      </span>
                      {isSelected && <ArrowRight size={14} color="var(--text-muted)" />}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Footer hint */}
        {!query && (
          <div style={{ padding: '20px 18px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
              Search across all tasks, topics and notes
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              {[
                { key: '↑↓', desc: 'navigate' },
                { key: 'Enter', desc: 'open' },
                { key: 'Esc', desc: 'close' },
              ].map(({ key, desc }) => (
                <span key={key} style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <kbd style={{ padding: '2px 6px', background: 'var(--bg-input)', border: '1px solid var(--border-secondary)', borderRadius: 4, fontSize: 11, fontFamily: 'monospace' }}>
                    {key}
                  </kbd>
                  {desc}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
