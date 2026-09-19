import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, CheckCircle2, RotateCcw, Clock, Calendar, Flag, Tag, AlertCircle } from 'lucide-react'

// ── Smart parser ──────────────────────────────────────────────────────────────
function parseVoiceCommand(text, knownTopics = []) {
  const raw      = text.trim()
  let   title    = raw
  let   duration = null
  let   dueTime  = null
  let   priority = null
  let   topic    = null
  let   date     = null

  // ── Duration: "for 30 minutes", "for 1.5 hours", "for 2h", "1hr" ──
  const durMatch = title.match(/\bfor\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i)
    || title.match(/\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i)
  if (durMatch) {
    const val  = parseFloat(durMatch[1])
    const unit = durMatch[2].toLowerCase()
    duration   = unit.startsWith('h') ? Math.round(val * 60) : Math.round(val)
    title      = title.replace(durMatch[0], '').trim()
  }

  // ── Due time: "at 3pm", "at 14:30", "at 9 am" ──
  const timeMatch = title.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (timeMatch) {
    let h   = parseInt(timeMatch[1])
    const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const ampm = timeMatch[3]?.toLowerCase()
    if (ampm === 'pm' && h < 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    dueTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    title   = title.replace(timeMatch[0], '').trim()
  }

  // ── Priority: "high priority", "urgent", "low priority" ──
  if (/\b(high\s+priority|urgent|important)\b/i.test(title)) {
    priority = 'high'
    title    = title.replace(/\b(high\s+priority|urgent|important)\b/i, '').trim()
  } else if (/\b(medium\s+priority|normal)\b/i.test(title)) {
    priority = 'medium'
    title    = title.replace(/\b(medium\s+priority|normal)\b/i, '').trim()
  } else if (/\b(low\s+priority|whenever|someday)\b/i.test(title)) {
    priority = 'low'
    title    = title.replace(/\b(low\s+priority|whenever|someday)\b/i, '').trim()
  }

  // ── Date: "today", "tomorrow", "next monday" etc ──
  const today = new Date()
  const todayStr    = today.toLocaleDateString('en-CA')
  const tomorrowStr = new Date(today.getTime() + 86400000).toLocaleDateString('en-CA')

  if (/\btoday\b/i.test(title)) {
    date  = todayStr
    title = title.replace(/\btoday\b/i, '').trim()
  } else if (/\btomorrow\b/i.test(title)) {
    date  = tomorrowStr
    title = title.replace(/\btomorrow\b/i, '').trim()
  } else {
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    const dayMatch = title.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i)
    if (dayMatch) {
      const targetDay = days.indexOf(dayMatch[2].toLowerCase())
      const diff = ((targetDay - today.getDay() + 7) % 7) || 7
      const d = new Date(today.getTime() + diff * 86400000)
      date  = d.toLocaleDateString('en-CA')
      title = title.replace(dayMatch[0], '').trim()
    }
  }

  // ── Topic: match against known topics ──
  for (const t of knownTopics) {
    const re = new RegExp(`\\b${t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (re.test(title)) {
      topic = t.name
      title = title.replace(re, '').trim()
      break
    }
  }

  // ── Strip common filler words at start ──
  title = title
    .replace(/^(add|create|new|make|schedule|remind me to|remind me|set|a|an|the)\s+/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[,.\s]+$/, '')
    .trim()

  // ── Capitalise first letter ──
  if (title) title = title[0].toUpperCase() + title.slice(1)

  return { title, duration, dueTime, priority, topic, date: date || todayStr }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VoiceInput({ onResult, onClose, isOpen, topics = [] }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript,  setTranscript]  = useState('')
  const [parsed,      setParsed]      = useState(null)
  const [stage,       setStage]       = useState('idle')  // idle | listening | preview
  const [error,       setError]       = useState(null)
  const [supported,   setSupported]   = useState(true)
  const recognitionRef  = useRef(null)
  const isListeningRef  = useRef(false)
  const ignoringErrors  = useRef(false)  // suppress errors during programmatic abort

  // ── Init speech recognition ───────────────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }

    const rec = new SR()
    rec.continuous      = true   // keep listening until user stops manually
    rec.interimResults  = true
    rec.lang            = 'en-US'
    recognitionRef.current = rec

    rec.onresult = (e) => {
      // Accumulate all results into one transcript
      let interim = ''
      let final   = ''
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t + ' '
        else interim += t
      }
      setTranscript((final + interim).trim())
    }

    rec.onerror = (e) => {
      if (ignoringErrors.current) return   // abort was intentional, ignore
      if (e.error === 'no-speech') return
      setError(e.error === 'not-allowed'
        ? 'Microphone access denied. Please allow access in your browser settings.'
        : 'Could not understand. Please try again.')
      setIsListening(false)
      setStage('idle')
    }

    rec.onend = () => {
      // If still supposed to be listening (e.g. browser auto-stopped), restart
      if (isListeningRef.current) {
        try { rec.start() } catch {}
      } else {
        setIsListening(false)
      }
    }

    return () => rec.abort()
  }, [topics])

  // ── Auto-start when opened ────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && supported) startListening()
    return () => recognitionRef.current?.abort()
  }, [isOpen, supported])

  const startListening = () => {
    if (!recognitionRef.current) return
    setError(null)
    setTranscript('')
    setParsed(null)
    setStage('listening')
    setIsListening(true)
    isListeningRef.current = true
    try { recognitionRef.current.start() } catch {}
  }

  const stopAndParse = () => {
    isListeningRef.current = false
    ignoringErrors.current = true
    recognitionRef.current?.stop()
    setTimeout(() => { ignoringErrors.current = false }, 200)
    setIsListening(false)
    if (transcript.trim()) {
      const p = parseVoiceCommand(transcript.trim(), topics)
      setParsed(p)
      setStage('preview')
    } else {
      setStage('idle')
    }
  }

  const handleConfirm = () => {
    if (parsed?.title) { onResult(parsed); onClose() }
  }

  const handleRetry = () => {
    isListeningRef.current = false
    ignoringErrors.current = true
    recognitionRef.current?.stop()
    setTimeout(() => { ignoringErrors.current = false }, 200)
    setStage('idle')
    setTranscript('')
    setParsed(null)
    setTimeout(startListening, 150)
  }

  const handleCancel = () => {
    isListeningRef.current = false
    ignoringErrors.current = true
    recognitionRef.current?.abort()
    onClose()
  }

  if (!isOpen) return null

  // ── Parsed field chips ────────────────────────────────────────────────────
  const chips = parsed ? [
    parsed.duration && { icon: <Clock size={12} />, label: `${parsed.duration}m`,       color: '#3b82f6' },
    parsed.dueTime  && { icon: <Clock size={12} />, label: `at ${parsed.dueTime}`,       color: '#8b5cf6' },
    parsed.priority && { icon: <Flag size={12} />,  label: parsed.priority,              color: parsed.priority === 'high' ? '#ef4444' : parsed.priority === 'medium' ? '#f97316' : '#22c55e' },
    parsed.topic    && { icon: <Tag size={12} />,   label: parsed.topic,                 color: '#14b8a6' },
    parsed.date     && { icon: <Calendar size={12} />, label: parsed.date === new Date().toLocaleDateString('en-CA') ? 'Today' : parsed.date === new Date(Date.now()+86400000).toLocaleDateString('en-CA') ? 'Tomorrow' : parsed.date, color: '#6366f1' },
  ].filter(Boolean) : []

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 440, textAlign: 'center', padding: '32px 28px' }}>

        {/* ── Unsupported ── */}
        {!supported && (
          <>
            <MicOff size={40} color="var(--accent-red)" style={{ marginBottom: 14 }} />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Voice Input Not Supported
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Your browser doesn't support speech recognition. Try Chrome or Edge.
            </p>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </>
        )}

        {/* ── Listening / Idle ── */}
        {supported && stage !== 'preview' && (
          <>
            {/* Mic with pulse */}
            <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 22px' }}>
              {isListening && <>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent-blue)', opacity: 0.15, animation: 'vi-pulse 1.4s ease-out infinite' }} />
                <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'var(--accent-blue)', opacity: 0.2, animation: 'vi-pulse 1.4s ease-out infinite 0.35s' }} />
              </>}
              <button onClick={isListening ? stopAndParse : startListening}
                style={{ position: 'absolute', inset: 18, borderRadius: '50%', background: isListening ? 'var(--accent-red)' : 'var(--accent-blue)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, transform 0.15s', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                {isListening ? <MicOff size={22} color="white" /> : <Mic size={22} color="white" />}
              </button>
            </div>

            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              {isListening ? 'Listening…' : 'Voice Input'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              {isListening
                ? 'Speak your task — tap the mic or click Done when finished.'
                : 'Click the mic to start speaking.'}
            </p>

            {/* Live transcript */}
            {transcript && (
              <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, textAlign: 'left' }}>
                <p style={{ fontSize: 15, color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  "{transcript}"
                </p>
              </div>
            )}

            {/* Tips — clickable examples that simulate voice input */}
            <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '10px 14px', textAlign: 'left', marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Try an example — tap to use
              </p>
              {[
                '"Study React for 45 minutes tomorrow"',
                '"High priority team meeting at 3pm"',
                '"Learning task for 1 hour"',
                '"Review notes for 30 minutes next Monday"',
              ].map(ex => {
                const clean = ex.replace(/^"|"$/g, '')
                return (
                  <button key={ex} type="button"
                    onClick={() => {
                      isListeningRef.current = false
                      ignoringErrors.current = true
                      recognitionRef.current?.abort()
                      setTimeout(() => { ignoringErrors.current = false }, 200)
                      setIsListening(false)
                      setError(null)
                      const clean = ex.replace(/^"|"$/g, '')
                      setTranscript(clean)
                      const p = parseVoiceCommand(clean, topics)
                      setParsed(p)
                      setStage('preview')
                    }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 0', fontSize: 12, color: 'var(--accent-blue)', borderBottom: '1px solid var(--border-primary)', marginBottom: 4, transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    {ex} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>↵ try</span>
                  </button>
                )
              })}
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <AlertCircle size={14} color="var(--accent-red)" />
                <p style={{ fontSize: 13, color: 'var(--accent-red)' }}>{error}</p>
              </div>
            )}

            <button className="btn btn-secondary" onClick={handleCancel} style={{ width: '100%' }}>Cancel</button>
            {isListening && transcript && (
              <button className="btn btn-primary" onClick={stopAndParse} style={{ width: '100%', marginTop: 8 }}>
                Done
              </button>
            )}
          </>
        )}

        {/* ── Preview ── */}
        {supported && stage === 'preview' && parsed && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <CheckCircle2 size={24} color="#22c55e" />
            </div>

            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 18 }}>
              Here's what I heard
            </h2>

            {/* Task title */}
            <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, textAlign: 'left' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task title</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{parsed.title || '—'}</p>
            </div>

            {/* Parsed chips */}
            {chips.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {chips.map((c, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: `${c.color}18`, border: `1px solid ${c.color}40`, color: c.color, fontSize: 12, fontWeight: 500 }}>
                    {c.icon} {c.label}
                  </span>
                ))}
              </div>
            )}

            {/* Original transcript */}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 22, fontStyle: 'italic' }}>
              "{transcript}"
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={handleRetry} style={{ flex: 1, gap: 6 }}>
                <RotateCcw size={14} /> Try again
              </button>
              <button className="btn btn-primary" onClick={handleConfirm} style={{ flex: 1 }}
                disabled={!parsed.title}>
                Add Task
              </button>
            </div>
          </>
        )}

        <style>{`
          @keyframes vi-pulse {
            0%   { transform: scale(0.85); opacity: 0.5; }
            100% { transform: scale(1.3);  opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  )
}
