import { useState, useRef, useEffect } from 'react'
import { Zap, Plus, Clock, Calendar, Tag, Flag } from 'lucide-react'

// Natural language parser for quick task input
function parseQuickInput(input, topics = []) {
  const result = {
    title: '',
    duration: 30,
    date: new Date().toISOString().split('T')[0],
    dueTime: null,
    topic: null,
    priority: null,
  }

  let text = input.trim()

  // Extract topic with #hashtag
  const topicMatch = text.match(/#(\w+)/i)
  if (topicMatch) {
    const tagName = topicMatch[1].toLowerCase()
    const matchedTopic = topics.find(t => t.name.toLowerCase() === tagName)
    if (matchedTopic) {
      result.topic = matchedTopic.name
    } else {
      // Try partial match
      const partial = topics.find(t => t.name.toLowerCase().startsWith(tagName))
      if (partial) result.topic = partial.name
    }
    text = text.replace(/#\w+/g, '').trim()
  }

  // Extract priority with !high, !medium, !low or !1, !2, !3
  const priorityMatch = text.match(/!(high|medium|low|1|2|3)/i)
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase()
    if (p === 'high' || p === '1') result.priority = 'high'
    else if (p === 'medium' || p === '2') result.priority = 'medium'
    else if (p === 'low' || p === '3') result.priority = 'low'
    text = text.replace(/!(high|medium|low|1|2|3)/gi, '').trim()
  }

  // Extract duration: "30m", "1h", "1.5h", "90min", "for 30 minutes"
  const durationPatterns = [
    /for\s+(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minutes?)/i,
    /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minutes?)\b/i,
  ]
  for (const pattern of durationPatterns) {
    const match = text.match(pattern)
    if (match) {
      const value = parseFloat(match[1])
      const unit = match[2].toLowerCase()
      if (unit.startsWith('h')) {
        result.duration = Math.round(value * 60)
      } else {
        result.duration = Math.round(value)
      }
      text = text.replace(pattern, '').trim()
      break
    }
  }

  // Extract time: "at 2pm", "at 14:00", "@3:30pm", "at 2:30 pm"
  const timePatterns = [
    /(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
    /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
  ]
  for (const pattern of timePatterns) {
    const match = text.match(pattern)
    if (match) {
      let hours = parseInt(match[1])
      const minutes = parseInt(match[2]) || 0
      const period = match[3]?.toLowerCase()
      
      if (period === 'pm' && hours < 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0
      
      result.dueTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      text = text.replace(pattern, '').trim()
      break
    }
  }

  // Extract date: "today", "tomorrow", "monday", "next week", specific dates
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const datePatterns = [
    { pattern: /\btoday\b/i, getDate: () => todayStr },
    { pattern: /\btomorrow\b/i, getDate: () => {
      const d = new Date(today)
      d.setDate(d.getDate() + 1)
      return d.toISOString().split('T')[0]
    }},
    { pattern: /\bnext\s+week\b/i, getDate: () => {
      const d = new Date(today)
      d.setDate(d.getDate() + 7)
      return d.toISOString().split('T')[0]
    }},
    { pattern: /\b(monday|mon)\b/i, getDate: () => getNextDayOfWeek(1) },
    { pattern: /\b(tuesday|tue)\b/i, getDate: () => getNextDayOfWeek(2) },
    { pattern: /\b(wednesday|wed)\b/i, getDate: () => getNextDayOfWeek(3) },
    { pattern: /\b(thursday|thu)\b/i, getDate: () => getNextDayOfWeek(4) },
    { pattern: /\b(friday|fri)\b/i, getDate: () => getNextDayOfWeek(5) },
    { pattern: /\b(saturday|sat)\b/i, getDate: () => getNextDayOfWeek(6) },
    { pattern: /\b(sunday|sun)\b/i, getDate: () => getNextDayOfWeek(0) },
    { pattern: /\bin\s+(\d+)\s+days?\b/i, getDate: (m) => {
      const d = new Date(today)
      d.setDate(d.getDate() + parseInt(m[1]))
      return d.toISOString().split('T')[0]
    }},
  ]

  for (const { pattern, getDate } of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      result.date = getDate(match)
      text = text.replace(pattern, '').trim()
      break
    }
  }

  // Clean up extra spaces and set title
  result.title = text.replace(/\s+/g, ' ').trim()

  return result
}

function getNextDayOfWeek(dayOfWeek) {
  const today = new Date()
  const currentDay = today.getDay()
  let daysUntil = dayOfWeek - currentDay
  if (daysUntil <= 0) daysUntil += 7
  const target = new Date(today)
  target.setDate(target.getDate() + daysUntil)
  return target.toISOString().split('T')[0]
}

export default function QuickAdd({ onAdd, topics, getTopicColor, tasks = [] }) {
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState(null)
  const [isFocused, setIsFocused] = useState(false)
  const [showDupWarning, setShowDupWarning] = useState(false)
  const [pendingTask, setPendingTask] = useState(null)
  const inputRef = useRef(null)

  // Parse input on change
  useEffect(() => {
    if (input.trim()) {
      setPreview(parseQuickInput(input, topics))
      setShowDupWarning(false)
      setPendingTask(null)
    } else {
      setPreview(null)
      setShowDupWarning(false)
    }
  }, [input, topics])

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!preview?.title) return

    const taskData = {
      title: preview.title,
      description: '',
      topic: preview.topic || topics[0]?.name || 'Personal',
      duration: preview.duration,
      date: preview.date,
      dueTime: preview.dueTime,
      priority: preview.priority,
      subtasks: [],
      recurrence: 'none',
    }

    // Duplicate check
    const isDup = tasks.some(t =>
      t.title.trim().toLowerCase() === taskData.title.toLowerCase() &&
      t.date === taskData.date
    )
    if (isDup && !showDupWarning) {
      setPendingTask(taskData)
      setShowDupWarning(true)
      return
    }

    onAdd(taskData)
    setInput('')
    setPreview(null)
    setShowDupWarning(false)
    setPendingTask(null)
  }

  const confirmAddAnyway = () => {
    if (pendingTask) onAdd(pendingTask)
    setInput('')
    setPreview(null)
    setShowDupWarning(false)
    setPendingTask(null)
  }

  const cancelDup = () => {
    setShowDupWarning(false)
    setPendingTask(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    if (dateStr === today) return 'Today'
    if (dateStr === tomorrowStr) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return null
    const [hours, minutes] = timeStr.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  const priorityColors = {
    high: '#ef4444',
    medium: '#f97316',
    low: '#22c55e',
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div 
        className="card-static"
        style={{ 
          padding: 0,
          border: isFocused ? '2px solid var(--accent-blue)' : '1px solid var(--border-primary)',
          transition: 'border-color 0.15s ease',
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 10, 
          padding: '12px 16px',
        }}>
          <Zap size={18} color="var(--accent-blue)" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder='Quick add: "Review docs tomorrow at 2pm for 30m #work !high"'
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!preview?.title}
            className="btn btn-primary"
            style={{ padding: '8px 14px' }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Preview */}
        {preview?.title && (
          <div style={{ 
            padding: '12px 16px', 
            borderTop: '1px solid var(--border-primary)',
            background: 'var(--bg-input)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
              {preview.title}
            </span>
            
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {preview.topic && (
                <span style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  background: `${getTopicColor(preview.topic)}20`,
                  color: getTopicColor(preview.topic),
                }}>
                  <Tag size={10} />
                  {preview.topic}
                </span>
              )}
              
              <span style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 11,
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
              }}>
                <Calendar size={10} />
                {formatDate(preview.date)}
              </span>
              
              {preview.dueTime && (
                <span style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  background: 'rgba(249,115,22,0.15)',
                  color: 'var(--accent-orange)',
                }}>
                  @ {formatTime(preview.dueTime)}
                </span>
              )}
              
              <span style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 11,
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
              }}>
                <Clock size={10} />
                {preview.duration}m
              </span>
              
              {preview.priority && (
                <span style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  background: `${priorityColors[preview.priority]}20`,
                  color: priorityColors[preview.priority],
                }}>
                  <Flag size={10} />
                  {preview.priority}
                </span>
              )}
            </div>
          </div>
        )}
        {/* Duplicate warning */}
        {showDupWarning && (
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid rgba(249,115,22,0.3)',
            background: 'rgba(249,115,22,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 12, color: '#f97316', fontWeight: 500 }}>
              ⚠️ "{pendingTask?.title}" already exists on this date.
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={cancelDup} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmAddAnyway} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #f97316', background: 'rgba(249,115,22,0.15)', color: '#f97316', cursor: 'pointer', fontWeight: 600 }}>
                Add anyway
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Help text */}
      {isFocused && !input && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, paddingLeft: 4 }}>
          Tips: Use <code>#topic</code> for category, <code>!high</code> for priority, 
          <code>at 2pm</code> for time, <code>30m</code> for duration, <code>tomorrow</code> for date
        </p>
      )}
    </div>
  )
}
