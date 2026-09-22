/**
 * Shared styled date picker — matches QuickAdd chip style.
 * Renders a trigger button + portal calendar dropdown.
 * Props: value (ISO date string), onChange(isoString), label?
 */
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_NAMES   = ['Su','Mo','Tu','We','Th','Fr','Sa']

function formatDisplay(dateStr) {
  if (!dateStr) return 'Pick a date'
  const today = new Date().toISOString().split('T')[0]
  const d = new Date(dateStr + 'T12:00:00')
  const tmr = new Date(); tmr.setDate(tmr.getDate() + 1)
  const tmrStr = tmr.toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === tmrStr) return 'Tomorrow'
  const thisYear = new Date().getFullYear()
  if (d.getFullYear() === thisYear) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DatePickerField({ value, onChange, compact = false }) {
  const [open, setOpen]     = useState(false)
  const [pos, setPos]       = useState(null)
  const [viewYear,  setViewYear]  = useState(() => value ? new Date(value + 'T12:00:00').getFullYear()  : new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => value ? new Date(value + 'T12:00:00').getMonth()     : new Date().getMonth())
  const btnRef = useRef(null)
  const today  = new Date().toISOString().split('T')[0]
  const tmr    = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      const portal = document.getElementById('modal-date-portal')
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
    // Position below button, shift up if near bottom of viewport
    const top = r.bottom + 6
    const left = r.left
    setPos({ top: Math.min(top, window.innerHeight - 340), left: Math.min(left, window.innerWidth - 240) })
    // Sync view to current value
    if (value) {
      const d = new Date(value + 'T12:00:00')
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
    setOpen(p => !p)
  }

  const selectDate = (isoStr) => {
    onChange(isoStr)
    setOpen(false)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isoFor = (d) => {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${viewYear}-${mm}-${dd}`
  }

  return (
    <>
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
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDisplay(value)}</span>
        <Calendar size={15} color="var(--text-muted)" />
      </button>

      {open && pos && createPortal(
        <div id="modal-date-portal" style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 10000,
          background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
          borderRadius: 12, padding: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          width: 228,
        }}>
          {/* Quick options */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[{ label: 'Today', v: today }, { label: 'Tomorrow', v: tmr }].map(o => (
              <button key={o.v} type="button" onClick={() => selectDate(o.v)} style={{
                flex: 1, padding: '5px 0', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: `1px solid ${value === o.v ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                background: value === o.v ? 'var(--accent-blue)' : 'transparent',
                color: value === o.v ? '#fff' : 'var(--text-secondary)', cursor: 'pointer',
              }}>{o.label}</button>
            ))}
          </div>

          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />
              const iso = isoFor(d)
              const isSelected = iso === value
              const isToday    = iso === today
              return (
                <button key={iso} type="button" onClick={() => selectDate(iso)} style={{
                  padding: '5px 0', borderRadius: 6, fontSize: 12, border: 'none',
                  fontWeight: isSelected || isToday ? 700 : 400,
                  background: isSelected ? 'var(--accent-blue)' : 'transparent',
                  color: isSelected ? '#fff' : isToday ? 'var(--accent-blue)' : 'var(--text-primary)',
                  cursor: 'pointer', textAlign: 'center',
                  outline: isToday && !isSelected ? `2px solid var(--accent-blue)` : 'none',
                  outlineOffset: -2,
                }}>
                  {d}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
