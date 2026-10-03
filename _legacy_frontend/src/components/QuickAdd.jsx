import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Zap, Plus, Clock, Calendar, Tag, Flag, AlertTriangle, ChevronDown, X } from 'lucide-react'
import { fmtDuration } from '../lib/utils'
import DatePickerField from './DatePickerField'
import TimePickerField from './TimePickerField'
import DurationField from './DurationField'

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

// Quick-select duration options
const QUICK_DURATIONS = [
  { label: '5m',   value: 5 },
  { label: '15m',  value: 15 },
  { label: '30m',  value: 30 },
  { label: '45m',  value: 45 },
  { label: '1h',   value: 60 },
  { label: '1.5h', value: 90 },
  { label: '2h',   value: 120 },
  { label: '3h',   value: 180 },
]

// Quick-select time options
const QUICK_TIMES = [
  { label: '9 AM',  value: '09:00' },
  { label: '10 AM', value: '10:00' },
  { label: '12 PM', value: '12:00' },
  { label: '2 PM',  value: '14:00' },
  { label: '3 PM',  value: '15:00' },
  { label: '5 PM',  value: '17:00' },
  { label: '6 PM',  value: '18:00' },
  { label: '8 PM',  value: '20:00' },
]

export default function QuickAdd({ onAdd, topics, getTopicColor, tasks = [] }) {
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState(null)
  const [isFocused, setIsFocused] = useState(false)
  const [showDupWarning, setShowDupWarning] = useState(false)
  const [pendingTask, setPendingTask] = useState(null)

  // Quick-select overrides (take precedence over parsed values)
  const [dateOverride, setDateOverride] = useState(null)
  const [timeOverride, setTimeOverride] = useState(undefined)
  const [durationOverride, setDurationOverride] = useState(null) // minutes | null
  const [showTimeDropdown, setShowTimeDropdown] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showDurationDropdown, setShowDurationDropdown] = useState(false)
  const [customTimeInput, setCustomTimeInput] = useState('')

  const inputRef = useRef(null)
  const dateBtnRef = useRef(null)
  const timeBtnRef = useRef(null)
  const durationBtnRef = useRef(null)

  // Portal dropdown positions
  const [datePickerPos, setDatePickerPos] = useState(null)
  const [timeDropdownPos, setTimeDropdownPos] = useState(null)
  const [durationDropdownPos, setDurationDropdownPos] = useState(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (showDatePicker) {
        const datePortal = document.getElementById('qa-date-portal')
        if (dateBtnRef.current && !dateBtnRef.current.contains(e.target) &&
            datePortal && !datePortal.contains(e.target)) {
          setShowDatePicker(false)
        }
      }
      if (showTimeDropdown) {
        const timePortal = document.getElementById('qa-time-portal')
        if (timeBtnRef.current && !timeBtnRef.current.contains(e.target) &&
            timePortal && !timePortal.contains(e.target)) {
          setShowTimeDropdown(false)
        }
      }
      if (showDurationDropdown) {
        const durPortal = document.getElementById('qa-duration-portal')
        if (durationBtnRef.current && !durationBtnRef.current.contains(e.target) &&
            durPortal && !durPortal.contains(e.target)) {
          setShowDurationDropdown(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDatePicker, showTimeDropdown, showDurationDropdown])

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

    const today = new Date().toISOString().split('T')[0]
    const resolvedDate = dateOverride ?? preview.date
    const resolvedTime = timeOverride !== undefined ? timeOverride : preview.dueTime
    const resolvedDuration = durationOverride ?? preview.duration

    const taskData = {
      title: preview.title,
      description: '',
      topic: preview.topic || topics[0]?.name || 'Personal',
      duration: resolvedDuration,
      date: resolvedDate,
      dueTime: resolvedTime,
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
    setDateOverride(null)
    setTimeOverride(undefined)
    setDurationOverride(null)
    setCustomTimeInput('')
  }

  const confirmAddAnyway = () => {
    if (pendingTask) onAdd(pendingTask)
    setInput('')
    setPreview(null)
    setShowDupWarning(false)
    setPendingTask(null)
    setDateOverride(null)
    setTimeOverride(undefined)
    setDurationOverride(null)
    setCustomTimeInput('')
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

  // ── Date quick-select helpers ──────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowStr = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()

  // Cycle through Today → Tomorrow → open date picker
  const handleDateChipClick = () => {
    const current = dateOverride ?? preview?.date ?? todayStr
    if (current === todayStr) {
      setDateOverride(tomorrowStr)
    } else if (current === tomorrowStr) {
      if (dateBtnRef.current) {
        const r = dateBtnRef.current.getBoundingClientRect()
        setDatePickerPos({ top: r.bottom + 6, left: r.left })
      }
      setShowDatePicker(true)
      setShowTimeDropdown(false)
    } else {
      if (dateBtnRef.current) {
        const r = dateBtnRef.current.getBoundingClientRect()
        setDatePickerPos({ top: r.bottom + 6, left: r.left })
      }
      setShowDatePicker(true)
      setShowTimeDropdown(false)
    }
  }

  const handleDatePickerChange = (e) => {
    setDateOverride(e.target.value)
    setShowDatePicker(false)
  }

  // ── Time quick-select helpers ──────────────────────────────────────────
  const handleTimeChipClick = (e) => {
    e.stopPropagation()
    if (!showTimeDropdown && timeBtnRef.current) {
      const r = timeBtnRef.current.getBoundingClientRect()
      setTimeDropdownPos({ top: r.bottom + 6, left: r.right - 170 })
    }
    setShowTimeDropdown(prev => !prev)
    setShowDatePicker(false)
  }

  const selectQuickTime = (value) => {
    setTimeOverride(value)
    setShowTimeDropdown(false)
    setCustomTimeInput('')
  }

  const clearTime = (e) => {
    e.stopPropagation()
    setTimeOverride(null)
    setShowTimeDropdown(false)
  }

  const handleCustomTimeInput = (e) => {
    const val = e.target.value
    setCustomTimeInput(val)
    if (/^\d{1,2}:\d{2}$/.test(val)) {
      const [h, m] = val.split(':').map(Number)
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        setTimeOverride(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
      }
    }
  }

  // ── Duration quick-select helpers ─────────────────────────────────────
  const handleDurationChipClick = (e) => {
    e.stopPropagation()
    if (!showDurationDropdown && durationBtnRef.current) {
      const r = durationBtnRef.current.getBoundingClientRect()
      setDurationDropdownPos({ top: r.bottom + 6, left: r.right - 170 })
    }
    setShowDurationDropdown(prev => !prev)
    setShowDatePicker(false)
    setShowTimeDropdown(false)
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
            padding: '10px 16px', 
            borderTop: '1px solid var(--border-primary)',
            background: 'var(--bg-input)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            borderRadius: showDupWarning ? '0' : '0 0 16px 16px',
          }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {preview.title}
            </span>
            
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
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

              {/* ── Date picker (shared component) ── */}
              <div style={{ minWidth: 110 }}>
                <DatePickerField
                  value={dateOverride ?? preview.date}
                  onChange={(v) => setDateOverride(v)}
                  compact
                />
              </div>

              {/* ── Time picker (shared component) ── */}
              <div style={{ minWidth: 110 }}>
                <TimePickerField
                  value={timeOverride !== undefined ? (timeOverride ?? '') : (preview.dueTime ?? '')}
                  onChange={(v) => setTimeOverride(v || null)}
                  compact
                />
              </div>
              
              {/* ── Duration picker (shared component) ── */}
              <div style={{ minWidth: 80 }}>
                <DurationField
                  value={durationOverride ?? preview.duration}
                  onChange={(mins) => setDurationOverride(mins)}
                  compact
                />
              </div>
              
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
            borderRadius: '0 0 16px 16px',
          }}>
            <span style={{ fontSize: 12, color: '#f97316', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertTriangle size={12} color="#f97316" style={{ flexShrink: 0 }} />
              "{pendingTask?.title}" already exists on this date.
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
