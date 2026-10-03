/**
 * Custom duration picker — quick-select grid + freeform text input.
 * Accepts: "30", "30m", "1h", "1.5h", "90min", "1h 30m"
 * Props: value (minutes number), onChange(minutes), compact?
 */
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Clock, ChevronDown } from 'lucide-react'
import { fmtDuration } from '../lib/utils'

const QUICK_DURATIONS = [
  { label: '15m',  value: 15  },
  { label: '30m',  value: 30  },
  { label: '45m',  value: 45  },
  { label: '1h',   value: 60  },
  { label: '1.5h', value: 90  },
  { label: '2h',   value: 120 },
  { label: '3h',   value: 180 },
  { label: '4h',   value: 240 },
]

// Parse human-friendly string → minutes or null
function parseDuration(str) {
  if (!str) return null
  const s = String(str).trim().toLowerCase()
  if (/^\d+$/.test(s)) return parseInt(s, 10)
  const hm = s.match(/^(\d+(?:\.\d+)?)\s*h(?:r|ours?)?\s*(\d+)?\s*m?$/)
  if (hm) return Math.round(parseFloat(hm[1]) * 60 + (hm[2] ? parseInt(hm[2]) : 0))
  const hOnly = s.match(/^(\d+(?:\.\d+)?)\s*h(?:r|ours?)?$/)
  if (hOnly) return Math.round(parseFloat(hOnly[1]) * 60)
  const mOnly = s.match(/^(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?$/)
  if (mOnly) return Math.round(parseFloat(mOnly[1]))
  return null
}

export default function DurationField({ value, onChange, compact = false }) {
  const [open, setOpen]           = useState(false)
  const [pos, setPos]             = useState(null)
  const [draft, setDraft]         = useState('')
  const [draftError, setDraftError] = useState(false)
  const btnRef   = useRef(null)
  const inputRef = useRef(null)

  // Populate draft when opening
  useEffect(() => {
    if (open) {
      setDraft(value ? fmtDuration(value) : '')
      setDraftError(false)
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [open, value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      const portal = document.getElementById('modal-duration-portal')
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

  const select = (mins) => {
    onChange(mins)
    setDraft(fmtDuration(mins))
    setDraftError(false)
    setOpen(false)
  }

  const handleDraftChange = (e) => {
    const v = e.target.value
    setDraft(v)
    const mins = parseDuration(v)
    if (mins && mins > 0) { onChange(mins); setDraftError(false) }
    else if (!v) setDraftError(false)
    else setDraftError(true)
  }

  const handleDraftKeyDown = (e) => {
    if (e.key === 'Enter') {
      const mins = parseDuration(draft)
      if (mins && mins > 0) { onChange(mins); setOpen(false) }
    }
    if (e.key === 'Escape') setOpen(false)
  }

  const handleDraftBlur = () => {
    const mins = parseDuration(draft)
    if (mins && mins > 0) {
      onChange(mins)
      setDraft(fmtDuration(mins))
      setDraftError(false)
    } else if (!draft) {
      setDraftError(false)
    }
  }

  const displayLabel = value ? fmtDuration(value) : '30m'

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
            color: 'var(--text-primary)',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-primary)'}
        >
          <span>{displayLabel}</span>
          <ChevronDown size={14} color="var(--text-muted)" />
        </button>
      </div>

      {open && pos && createPortal(
        <div id="modal-duration-portal" style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 10000,
          background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
          borderRadius: 12, padding: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          width: 190,
        }}>
          {/* Quick presets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
            {QUICK_DURATIONS.map(d => (
              <button key={d.value} type="button" onClick={() => select(d.value)}
                onMouseEnter={e => { if (value !== d.value) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={e => { if (value !== d.value) e.currentTarget.style.background = 'var(--bg-input)' }}
                style={{
                  padding: '5px 0', borderRadius: 7, fontSize: 12, fontWeight: 500,
                  border: `1px solid ${value === d.value ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                  background: value === d.value ? 'rgba(59,130,246,0.12)' : 'var(--bg-input)',
                  color: value === d.value ? 'var(--accent-blue)' : 'var(--text-primary)',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}>
                {d.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border-primary)', marginBottom: 8 }} />

          {/* Freeform input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="e.g. 30m, 1h, 1.5h"
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
              Try "30m", "1h", or "1.5h"
            </p>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
