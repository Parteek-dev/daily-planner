/**
 * Custom time picker — quick-select grid + freeform text input (12h or 24h).
 * No native <input type="time">. Fully themed with app CSS variables.
 * Props: value (HH:MM 24h string or ''), onChange(HH:MM or ''), compact?
 */
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Clock, X } from 'lucide-react'

const QUICK_TIMES = [
  { label: '8 AM',  value: '08:00' },
  { label: '9 AM',  value: '09:00' },
  { label: '10 AM', value: '10:00' },
  { label: '12 PM', value: '12:00' },
  { label: '2 PM',  value: '14:00' },
  { label: '3 PM',  value: '15:00' },
  { label: '5 PM',  value: '17:00' },
  { label: '6 PM',  value: '18:00' },
]

// Format HH:MM 24h → "9:30 AM"
function fmt(timeStr) {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// Parse many formats → HH:MM 24h, or null if unrecognisable
// Accepts: "9am", "2:30 PM", "14:30", "930", "2130", "9pm", "9:30am"
function parseTyped(s) {
  s = s.trim().toLowerCase().replace(/\s+/g, '')
  if (!s) return null

  // "9:30am", "21:30", "9:30"
  const colon = s.match(/^(\d{1,2}):(\d{2})(am|pm)?$/)
  if (colon) {
    let h = parseInt(colon[1]), m = parseInt(colon[2])
    const p = colon[3]
    if (p === 'pm' && h < 12) h += 12
    if (p === 'am' && h === 12) h = 0
    if (h < 0 || h > 23 || m < 0 || m > 59) return null
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  }

  // "930" → 9:30, "2130" → 21:30, with optional am/pm
  const compact = s.match(/^(\d{3,4})(am|pm)?$/)
  if (compact) {
    const raw = compact[1], p = compact[2]
    let h, m
    if (raw.length === 3) { h = parseInt(raw[0]); m = parseInt(raw.slice(1)) }
    else { h = parseInt(raw.slice(0, 2)); m = parseInt(raw.slice(2)) }
    if (p === 'pm' && h < 12) h += 12
    if (p === 'am' && h === 12) h = 0
    if (h < 0 || h > 23 || m < 0 || m > 59) return null
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  }

  // "9am", "9pm", "21"
  const hourOnly = s.match(/^(\d{1,2})(am|pm)?$/)
  if (hourOnly) {
    let h = parseInt(hourOnly[1])
    const p = hourOnly[2]
    if (p === 'pm' && h < 12) h += 12
    if (p === 'am' && h === 12) h = 0
    if (h < 0 || h > 23) return null
    return `${String(h).padStart(2,'0')}:00`
  }

  return null
}

export default function TimePickerField({ value, onChange, compact = false }) {
  const [open, setOpen]           = useState(false)
  const [pos, setPos]             = useState(null)
  const [draft, setDraft]         = useState('')
  const [draftError, setDraftError] = useState(false)
  const btnRef   = useRef(null)
  const inputRef = useRef(null)

  // Populate draft when opening
  useEffect(() => {
    if (open) {
      setDraft(value ? fmt(value) : '')
      setDraftError(false)
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [open, value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      const portal = document.getElementById('modal-time-portal')
      if (btnRef.current && !btnRef.current.contains(e.target) &&
          portal && !portal.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const openPicker = () => {
    const r = btnRef.current.getBoundingClientRect()
    setPos({
      top:  r.bottom + 6,
      left: Math.max(8, Math.min(r.left, window.innerWidth - 200)),
    })
    setOpen(p => !p)
  }

  const select = (v) => {
    onChange(v)
    setDraft(fmt(v))
    setDraftError(false)
    setOpen(false)
  }

  const clear = (e) => {
    e.stopPropagation()
    onChange('')
    setDraft('')
    setDraftError(false)
  }

  const handleDraftChange = (e) => {
    const v = e.target.value
    setDraft(v)
    const parsed = parseTyped(v)
    if (parsed) { onChange(parsed); setDraftError(false) }
    else if (!v) { onChange(''); setDraftError(false) }
    else setDraftError(true)
  }

  const handleDraftKeyDown = (e) => {
    if (e.key === 'Enter') {
      const parsed = parseTyped(draft)
      if (parsed) { onChange(parsed); setOpen(false) }
      else if (!draft) { onChange(''); setOpen(false) }
    }
    if (e.key === 'Escape') setOpen(false)
  }

  const handleDraftBlur = () => {
    const parsed = parseTyped(draft)
    if (parsed) { onChange(parsed); setDraft(fmt(parsed)); setDraftError(false) }
    else if (!draft) { onChange(''); setDraftError(false) }
  }

  const displayLabel = value ? fmt(value) : 'Optional'

  return (
    <>
      <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
        <button
          ref={btnRef}
          type="button"
          onClick={openPicker}
          style={{
            width: '100%',
            padding: compact ? '4px 10px' : '11px 14px',
            background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
            borderRadius: compact ? 12 : 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            fontSize: compact ? 11 : 14,
            color: value ? 'var(--text-primary)' : 'var(--text-muted)',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-primary)'}
        >
          <span>{displayLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {value && (
              <span onClick={clear} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }} title="Clear time">
                <X size={12} />
              </span>
            )}
            <Clock size={15} color="var(--text-muted)" />
          </div>
        </button>
      </div>

      {open && pos && createPortal(
        <div id="modal-time-portal" style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 10000,
          background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
          borderRadius: 12, padding: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          width: 190,
        }}>
          {/* Quick presets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
            {QUICK_TIMES.map(t => (
              <button key={t.value} type="button" onClick={() => select(t.value)}
                onMouseEnter={e => { if (value !== t.value) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={e => { if (value !== t.value) e.currentTarget.style.background = 'var(--bg-input)' }}
                style={{
                  padding: '5px 0', borderRadius: 7, fontSize: 12, fontWeight: 500,
                  border: `1px solid ${value === t.value ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                  background: value === t.value ? 'rgba(59,130,246,0.12)' : 'var(--bg-input)',
                  color: value === t.value ? 'var(--accent-blue)' : 'var(--text-primary)',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border-primary)', marginBottom: 8 }} />

          {/* Freeform text input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="e.g. 9am, 2:30 PM, 14:30"
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleDraftKeyDown}
            onBlur={handleDraftBlur}
            style={{
              width: '100%', fontSize: 12, padding: '7px 10px', borderRadius: 7,
              background: 'var(--bg-input)',
              border: `1px solid ${draftError ? '#ef4444' : 'var(--border-primary)'}`,
              color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {draftError && (
            <p style={{ fontSize: 10, color: '#ef4444', marginTop: 3 }}>
              Try "9am", "2:30 PM" or "14:30"
            </p>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
