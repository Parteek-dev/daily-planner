import { useState } from 'react'
import { ArrowLeft, Star, Send, CheckCircle2, AlertCircle, Loader2, ClipboardList, Bug, Lightbulb, MessageCircle, PartyPopper } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../hooks/useTheme'

const TYPES = [
  { value: 'bug',     label: 'Bug report',       desc: 'Something is broken or not working', icon: <Bug size={15} />,        color: '#ef4444' },
  { value: 'feature', label: 'Feature request',   desc: 'I want something new or improved',   icon: <Lightbulb size={15} />,  color: '#f59e0b' },
  { value: 'general', label: 'General feedback',  desc: 'Thoughts, suggestions, or praise',   icon: <MessageCircle size={15} />, color: '#6366f1' },
]

export default function FeedbackPage({ onBack, user }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Pre-fill from logged-in user
  const prefillName  = user?.user_metadata?.display_name || user?.user_metadata?.full_name || ''
  const prefillEmail = (user?.email && user.email !== 'guest@local') ? user.email : ''

  const [name,    setName]    = useState(prefillName)
  const [email,   setEmail]   = useState(prefillEmail)
  const [type,    setType]    = useState('general')
  const [message, setMessage] = useState('')
  const [rating,  setRating]  = useState(0)
  const [hover,   setHover]   = useState(0)

  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error,     setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) { setError('Please enter a message.'); return }
    setLoading(true)
    setError('')

    const { error: dbError } = await supabase.from('feedback').insert({
      user_id: user?.id !== 'guest' ? user?.id ?? null : null,
      name:    name.trim()    || null,
      email:   email.trim()   || null,
      type,
      message: message.trim(),
      rating:  rating || null,
    })

    setLoading(false)
    if (dbError) { setError('Something went wrong. Please try again.'); return }
    setSubmitted(true)
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const bg      = isDark ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #0f172a 100%)' : 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 45%, #f0f4ff 100%)'
  const textPri  = isDark ? '#f0f4ff' : '#0f172a'
  const textSec  = isDark ? '#94a3b8' : '#475569'
  const textMut  = isDark ? '#4b6080' : '#94a3b8'
  const cardBg   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.75)'
  const cardBdr  = isDark ? 'rgba(255,255,255,0.1)'  : 'rgba(99,102,241,0.15)'
  const inputBg  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)'
  const inputBdr = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.2)'

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    background: inputBg, border: `1px solid ${inputBdr}`,
    borderRadius: 10, color: textPri, fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }
  const focusIn  = e => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }
  const focusOut = e => { e.target.style.borderColor = inputBdr; e.target.style.boxShadow = 'none' }

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', fontFamily: 'Inter, system-ui, sans-serif', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Back button */}
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: textSec, fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: '6px 0', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
          onMouseLeave={e => e.currentTarget.style.color = textSec}>
          <ArrowLeft size={16} /> Back
        </button>

        {/* Card */}
        <div style={{ background: cardBg, border: `1px solid ${cardBdr}`, borderRadius: 24, padding: '36px 32px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.4)' : '0 16px 48px rgba(99,102,241,0.12)' }}>

          {submitted ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle2 size={28} color="#22c55e" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: textPri, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Thank you! <PartyPopper size={22} color="#22c55e" />
              </h2>
              <p style={{ fontSize: 15, color: textSec, lineHeight: 1.6, marginBottom: 28 }}>
                Your feedback has been received. We really appreciate you taking the time to share your thoughts.
              </p>
              <button onClick={onBack}
                style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, padding: '11px 24px', borderRadius: 12, cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
                Back to Daily Planner
              </button>
            </div>

          ) : (
            <>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg, #6366f1, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(99,102,241,0.4)', flexShrink: 0 }}>
                  <ClipboardList size={22} color="#fff" />
                </div>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: textPri, marginBottom: 3 }}>Share your feedback</h1>
                  <p style={{ fontSize: 13, color: textSec }}>Help us make Daily Planner better</p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, marginBottom: 20 }}>
                  <AlertCircle size={15} color="#f87171" />
                  <span style={{ fontSize: 13, color: '#f87171' }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>

                {/* Feedback type */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: textMut, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {TYPES.map(t => (
                      <button key={t.value} type="button" onClick={() => setType(t.value)}
                        style={{ textAlign: 'left', padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${type === t.value ? '#6366f1' : inputBdr}`, background: type === t.value ? (isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)') : inputBg, cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: type === t.value ? t.color : textMut, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{t.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: type === t.value ? 600 : 400, color: type === t.value ? (isDark ? '#818cf8' : '#4f46e5') : textPri }}>{t.label}</span>
                        </span>
                        <span style={{ fontSize: 12, color: textMut, whiteSpace: 'nowrap' }}>{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Star rating */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: textMut, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rating <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button"
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(r => r === n ? 0 : n)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, transition: 'transform 0.1s' }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                        <Star size={28}
                          fill={(hover || rating) >= n ? '#eab308' : 'transparent'}
                          color={(hover || rating) >= n ? '#eab308' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')}
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                    {rating > 0 && <span style={{ fontSize: 12, color: textMut, alignSelf: 'center', marginLeft: 4 }}>{['','Poor','Fair','Good','Great','Excellent'][rating]}</span>}
                  </div>
                </div>

                {/* Message */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: textMut, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message <span style={{ color: '#6366f1' }}>*</span></label>
                  <textarea
                    placeholder="Tell us what's on your mind..."
                    value={message} onChange={e => setMessage(e.target.value)}
                    rows={5} required
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 110 }}
                    onFocus={focusIn} onBlur={focusOut}
                  />
                </div>

                {/* Name + Email row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: textMut, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                    <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
                      style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: textMut, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                    <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
                      style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(99,102,241,0.4)', opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s, filter 0.15s' }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)' }}
                  onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}>
                  {loading
                    ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                    : <><Send size={16} /> Send Feedback</>
                  }
                </button>

                <p style={{ textAlign: 'center', fontSize: 11, color: textMut, marginTop: 12 }}>
                  Your feedback is stored securely and helps improve the app.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
