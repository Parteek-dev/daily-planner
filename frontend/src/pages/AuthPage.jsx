import { useState, useEffect } from 'react'
import { Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ClipboardList, Sun, Moon, SunMoon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small daily improvements lead to stunning results.", author: "Robin Sharma" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "The key is not to prioritize your schedule, but to schedule your priorities.", author: "Stephen Covey" },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', icon: '☀️' }
  if (h < 17) return { text: 'Good afternoon', icon: '🌤️' }
  return { text: 'Good evening', icon: '🌙' }
}

export default function AuthPage({ onSignIn, onSignUp, onResetPassword, onGuestMode, onBack }) {
  const { theme, themeMode, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [quoteFading, setQuoteFading] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)

  // Card entrance animation
  useEffect(() => {
    const id = setTimeout(() => setCardVisible(true), 60)
    return () => clearTimeout(id)
  }, [])

  // Rotate quotes every 5s with fade
  useEffect(() => {
    const id = setInterval(() => {
      setQuoteFading(true)
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length)
        setQuoteFading(false)
      }, 400)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const resetForm = () => { setError(''); setSuccess(''); setPassword(''); setConfirmPassword('') }
  const switchMode = (m) => { resetForm(); setMode(m) }

  const handleSignIn = async (e) => {
    e.preventDefault()
    if (!email || !password) return setError('Please fill in all fields.')
    setLoading(true); setError('')
    const result = await onSignIn(email, password)
    setLoading(false)
    if (!result.success) setError(result.error)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    if (!email || !password || !displayName) return setError('Please fill in all fields.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    setLoading(true); setError('')
    const result = await onSignUp(email, password, displayName)
    setLoading(false)
    if (!result.success) { setError(result.error) }
    else if (result.needsConfirmation) { setSuccess('Account created! Check your email to confirm, then sign in.'); switchMode('signin') }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!email) return setError('Enter your email address.')
    setLoading(true); setError('')
    const result = await onResetPassword(email)
    setLoading(false)
    if (!result.success) setError(result.error)
    else setSuccess('Password reset email sent! Check your inbox.')
  }

  const greeting = getGreeting()
  const quote    = QUOTES[quoteIdx]

  const inputStyle = {
    width: '100%', padding: '11px 12px 11px 38px',
    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
    border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)',
    borderRadius: 10,
    color: isDark ? '#fff' : '#0f172a',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }
  const iconWrap = { position: 'relative', marginBottom: 12 }
  const iconPos  = { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)', pointerEvents: 'none' }

  const focusHandlers = {
    onFocus: e => { e.target.style.borderColor = 'rgba(99,102,241,0.7)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' },
    onBlur:  e => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = 'none' },
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      background: isDark
        ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)'
        : 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 40%, #f0f4ff 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          top: '-15%', left: '-10%',
          animation: 'blobMove1 12s ease-in-out infinite alternate',
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
          bottom: '-10%', right: '-8%',
          animation: 'blobMove2 14s ease-in-out infinite alternate',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
          top: '40%', left: '60%',
          animation: 'blobMove3 10s ease-in-out infinite alternate',
        }} />
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(99,102,241,0.15)',
        borderRadius: 24,
        padding: '36px 32px 28px',
        boxShadow: isDark
          ? '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 16px 48px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.9)',
        position: 'relative', zIndex: 1,
        transform: cardVisible ? 'translateY(0)' : 'translateY(24px)',
        opacity: cardVisible ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.45s ease',
      }}>

        {/* Back to landing + Theme toggle */}
        {onBack && (
          <button onClick={onBack}
            style={{ position: 'absolute', top: 16, left: 16, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            ← Back
          </button>
        )}
        <button
          onClick={toggleTheme}
          title={themeMode === 'dark' ? 'Switch to light' : themeMode === 'light' ? 'Switch to auto' : 'Switch to dark'}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
            borderRadius: 8, padding: 7, cursor: 'pointer',
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = isDark ? '#fff' : '#6366f1' }}
          onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}
        >
          {themeMode === 'dark' ? <Moon size={15} /> : themeMode === 'light' ? <Sun size={15} /> : <SunMoon size={15} />}
        </button>

        {/* Greeting */}
        <p style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)', marginBottom: 20, textAlign: 'center' }}>
          {greeting.icon} {greeting.text}
        </p>

        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
          }}>
            <ClipboardList size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: isDark ? '#fff' : '#0f172a', marginBottom: 4 }}>
            Daily Planner
          </h1>
          <p style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
            {mode === 'signin' && 'Sign in to access your tasks'}
            {mode === 'signup' && 'Create your free account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        {/* Quote — only on signin */}
        {mode === 'signin' && (
          <div style={{
            background: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)',
            border: isDark ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(99,102,241,0.15)',
            borderRadius: 12, padding: '12px 14px', marginBottom: 24,
            opacity: quoteFading ? 0 : 1,
            transition: 'opacity 0.4s ease',
          }}>
            <p style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)', lineHeight: 1.55, fontStyle: 'italic', marginBottom: 4 }}>
              "{quote.text}"
            </p>
            <p style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)', textAlign: 'right' }}>
              — {quote.author}
            </p>
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, marginBottom: 16 }}>
            <CheckCircle2 size={15} color="#4ade80" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#4ade80', lineHeight: 1.5 }}>{success}</p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, marginBottom: 16 }}>
            <AlertCircle size={15} color="#f87171" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#f87171', lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        {/* ── SIGN IN ── */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn}>
            <div style={iconWrap}>
              <Mail size={15} style={iconPos} />
              <input type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} style={inputStyle}
                autoComplete="email" required
                onFocus={focusHandlers.onFocus}
                onBlur={focusHandlers.onBlur}
              />
            </div>
            <div style={{ ...iconWrap, marginBottom: 20 }}>
              <Lock size={15} style={iconPos} />
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 40 }}
                autoComplete="current-password" required
                onFocus={focusHandlers.onFocus}
                onBlur={focusHandlers.onBlur}
              />
              <button type="button" onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 2 }}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity 0.15s', opacity: loading ? 0.7 : 1 }}>
              {loading ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign In'}
            </button>

            <button type="button" onClick={() => switchMode('forgot')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', fontSize: 13, display: 'block', margin: '0 auto 18px', padding: 0 }}>
              Forgot password?
            </button>

            <div style={{ textAlign: 'center', fontSize: 13, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)', marginBottom: 16 }}>
              Don't have an account?{' '}
              <button type="button" onClick={() => switchMode('signup')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', fontWeight: 600, padding: 0 }}>
                Sign up free
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
              <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
              <span style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
            </div>

            <button type="button" onClick={onGuestMode}
              style={{ width: '100%', padding: '11px 0', borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)', color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s, border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.07)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }}>
              <User size={15} /> Continue as Guest
            </button>
            <p style={{ textAlign: 'center', fontSize: 11, color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)', marginTop: 8 }}>
              No account needed · Data saved locally in your browser
            </p>
          </form>
        )}

        {/* ── SIGN UP ── */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp}>
            {[
              { icon: <User size={15} style={iconPos} />, type: 'text', placeholder: 'Your name', value: displayName, onChange: e => setDisplayName(e.target.value), autoComplete: 'name' },
              { icon: <Mail size={15} style={iconPos} />, type: 'email', placeholder: 'Email address', value: email, onChange: e => setEmail(e.target.value), autoComplete: 'email' },
            ].map((f, i) => (
              <div key={i} style={iconWrap}>
                {f.icon}
                <input {...f} icon={undefined} style={inputStyle} required
                  onFocus={focusHandlers.onFocus}
                  onBlur={focusHandlers.onBlur}
                />
              </div>
            ))}
            <div style={iconWrap}>
              <Lock size={15} style={iconPos} />
              <input type={showPassword ? 'text' : 'password'} placeholder="Password (min 6 chars)" value={password}
                onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 40 }}
                autoComplete="new-password" required
                onFocus={focusHandlers.onFocus}
                onBlur={focusHandlers.onBlur}
              />
              <button type="button" onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 2 }}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div style={{ ...iconWrap, marginBottom: 20 }}>
              <Lock size={15} style={iconPos} />
              <input type={showPassword ? 'text' : 'password'} placeholder="Confirm password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} style={inputStyle}
                autoComplete="new-password" required
                onFocus={focusHandlers.onFocus}
                onBlur={focusHandlers.onBlur}
              />
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s' }}>
              {loading ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> : 'Create Account'}
            </button>
            <div style={{ textAlign: 'center', fontSize: 13, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)' }}>
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('signin')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', fontWeight: 600, padding: 0 }}>
                Sign in
              </button>
            </div>
          </form>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <p style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', marginBottom: 16, lineHeight: 1.6 }}>
              Enter your email and we'll send you a reset link.
            </p>
            <div style={{ ...iconWrap, marginBottom: 20 }}>
              <Mail size={15} style={iconPos} />
              <input type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} style={inputStyle}
                autoComplete="email" required
                onFocus={focusHandlers.onFocus}
                onBlur={focusHandlers.onBlur}
              />
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
              {loading ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> : 'Send Reset Link'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button type="button" onClick={() => switchMode('signin')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', fontWeight: 600, fontSize: 13, padding: 0 }}>
                ← Back to sign in
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blobMove1 { from { transform: translate(0,0) scale(1); } to { transform: translate(40px, 30px) scale(1.1); } }
        @keyframes blobMove2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-30px, -40px) scale(1.08); } }
        @keyframes blobMove3 { from { transform: translate(0,0) scale(1); } to { transform: translate(20px, 30px) scale(0.95); } }
      `}</style>
    </div>
  )
}
