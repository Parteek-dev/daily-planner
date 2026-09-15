import { useState } from 'react'
import { Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

/**
 * AuthPage — handles Sign In, Sign Up, and Forgot Password flows.
 * Receives the auth actions from useAuth via props.
 */
export default function AuthPage({ onSignIn, onSignUp, onResetPassword }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'forgot'

  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const resetForm = () => {
    setError('')
    setSuccess('')
    setPassword('')
    setConfirmPassword('')
  }

  const switchMode = (newMode) => {
    resetForm()
    setMode(newMode)
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSignIn = async (e) => {
    e.preventDefault()
    if (!email || !password) return setError('Please fill in all fields.')
    setLoading(true)
    setError('')
    const result = await onSignIn(email, password)
    setLoading(false)
    if (!result.success) setError(result.error)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    if (!email || !password || !displayName) return setError('Please fill in all fields.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    setLoading(true)
    setError('')
    const result = await onSignUp(email, password, displayName)
    setLoading(false)
    if (!result.success) {
      setError(result.error)
    } else if (result.needsConfirmation) {
      setSuccess('Account created! Check your email to confirm your account, then sign in.')
      switchMode('signin')
    }
    // If !needsConfirmation, onAuthStateChange in useAuth fires automatically
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!email) return setError('Enter your email address.')
    setLoading(true)
    setError('')
    const result = await onResetPassword(email)
    setLoading(false)
    if (!result.success) {
      setError(result.error)
    } else {
      setSuccess('Password reset email sent! Check your inbox.')
    }
  }

  // ── Shared input style ───────────────────────────────────────────────────

  const inputStyle = {
    width: '100%',
    padding: '10px 12px 10px 38px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-primary)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  const iconWrapStyle = {
    position: 'relative',
    marginBottom: 14,
  }

  const iconStyle = {
    position: 'absolute',
    left: 11,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 20,
          padding: 32,
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: 26,
            }}
          >
            📋
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Daily Planner
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {mode === 'signin' && 'Sign in to access your tasks'}
            {mode === 'signup' && 'Create your free account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        {/* Success banner */}
        {success && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            <CheckCircle2 size={16} color="var(--accent-green)" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: 'var(--accent-green)', lineHeight: 1.5 }}>{success}</p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={16} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#ef4444', lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        {/* ── SIGN IN ── */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn}>
            <div style={iconWrapStyle}>
              <Mail size={16} style={iconStyle} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                autoComplete="email"
                required
              />
            </div>

            <div style={{ ...iconWrapStyle, marginBottom: 20 }}>
              <Lock size={16} style={iconStyle} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: 40 }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  padding: 2,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 15, marginBottom: 12 }}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={() => switchMode('forgot')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent-blue)', fontSize: 13, display: 'block',
                margin: '0 auto 20px', padding: 0,
              }}
            >
              Forgot password?
            </button>

            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontWeight: 600, padding: 0 }}
              >
                Sign up free
              </button>
            </div>
          </form>
        )}

        {/* ── SIGN UP ── */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp}>
            <div style={iconWrapStyle}>
              <User size={16} style={iconStyle} />
              <input
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                style={inputStyle}
                autoComplete="name"
                required
              />
            </div>

            <div style={iconWrapStyle}>
              <Mail size={16} style={iconStyle} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                autoComplete="email"
                required
              />
            </div>

            <div style={iconWrapStyle}>
              <Lock size={16} style={iconStyle} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: 40 }}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div style={{ ...iconWrapStyle, marginBottom: 20 }}>
              <Lock size={16} style={iconStyle} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={inputStyle}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 15, marginBottom: 20 }}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> : 'Create Account'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontWeight: 600, padding: 0 }}
              >
                Sign in
              </button>
            </div>
          </form>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              Enter your email and we'll send you a link to reset your password.
            </p>

            <div style={{ ...iconWrapStyle, marginBottom: 20 }}>
              <Mail size={16} style={iconStyle} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                autoComplete="email"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 15, marginBottom: 20 }}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> : 'Send Reset Link'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontWeight: 600, padding: 0 }}
              >
                ← Back to sign in
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Subtle spin keyframe for loader — injected once */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
