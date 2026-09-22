import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  LayoutDashboard, CalendarDays, Sun, Flame, Menu, X,
  Moon, Sparkles, Timer, Undo2, Redo2, PanelTop, Mic,
  LogOut, Loader2, PanelLeftClose, PanelLeftOpen, Settings,
  ChevronsLeft, ChevronsRight, SunMoon, Columns2, Search, ClipboardList, MessageSquare, UserCircle, Compass,
} from 'lucide-react'

import Dashboard        from './pages/Dashboard'
import CalendarPage     from './pages/Calendar'
import TodayPage        from './pages/Today'
import WeekPage         from './pages/Week'
import AuthPage         from './pages/AuthPage'
import LandingPage      from './pages/LandingPage'
import FeedbackPage     from './pages/FeedbackPage'
import SettingsModal    from './components/SettingsModal'
import AppTour          from './components/AppTour'
import AddTaskModal     from './components/AddTaskModal'
import ShortcutsModal   from './components/ShortcutsModal'
import PomodoroTimer    from './components/PomodoroTimer'
import WidgetView       from './components/WidgetView'
import IcsImportPreview from './components/IcsImportPreview'
import VoiceInput       from './components/VoiceInput'
import TimerAlert       from './components/TimerAlert'
import FocusMode        from './components/FocusMode'
import OverdueRolloverModal from './components/OverdueRolloverModal'
import Confetti         from './components/Confetti'
import CommandPalette   from './components/CommandPalette'

import { useProgress }             from './hooks/useProgress'
import { useAuth }                 from './hooks/useAuth'
import { supabaseMisconfigured }   from './lib/supabase'
import { ThemeProvider, useTheme } from './hooks/useTheme.jsx'
import { useKeyboardShortcuts }    from './hooks/useKeyboardShortcuts'
import useNotifications            from './hooks/useNotifications'
import usePomodoro                 from './hooks/usePomodoro'

// ── Setup screen ─────────────────────────────────────────────────────────────

function SetupScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24 }}>
      <div style={{ maxWidth: 520, width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 20, padding: 36, boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 40, marginBottom: 16, textAlign: 'center' }}>⚙️</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>Supabase Not Configured</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24, textAlign: 'center' }}>The app needs your Supabase credentials to start.</p>
        <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <li style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>supabase.com</a>
          </li>
          <li style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Run <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>supabase-schema.sql</code> in Supabase → SQL Editor
          </li>
          <li style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Create <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>frontend/.env</code>:
            <pre style={{ marginTop: 8, padding: 12, background: 'var(--bg-input)', borderRadius: 8, fontSize: 12, lineHeight: 1.7, color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
            </pre>
          </li>
          <li style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Restart: <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>npm run dev</code>
          </li>
        </ol>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 24, textAlign: 'center' }}>See README.md for full instructions.</p>
      </div>
    </div>
  )
}

// ── Reset modal ──────────────────────────────────────────────────────────────

function ResetModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Reset All Data?</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>Permanently deletes all tasks, topics, and progress. Cannot be undone.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} style={{ flex: 1 }}>Reset Everything</button>
        </div>
      </div>
    </div>
  )
}

// ── Loading spinner ──────────────────────────────────────────────────────────

function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', gap: 16 }}>
      <Loader2 size={36} color="var(--accent-blue)" style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ progress, pomodoro, onPomodoro, onWidget, onVoice, onSettings, onSearch, onFeedback, onTour, mobileOpen, onClose, onSignOut, onHide, isHidden, userEmail, displayName, compact, onToggleCompact, isGuest = false }) {
  const { overallPercent, streakData, todayCompleted, todayTotal, canUndo, canRedo, undo, redo } = progress
  const { theme, themeMode } = useTheme()

  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const getInitials = () => {
    if (displayName) return displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    return (userEmail?.[0] || 'U').toUpperCase()
  }

  const navItems = [
    { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/today',    icon: Sparkles,        label: 'Today'     },
    { to: '/week',     icon: Columns2,        label: 'Week'      },
    { to: '/calendar', icon: CalendarDays,    label: 'Calendar'  },
  ]

  // Overdue = incomplete tasks with date < today
  const todayStr = new Date().toISOString().split('T')[0]
  const overdueCount = progress.tasks.filter(t => !t.completed && t.date < todayStr).length

  // Compact icon-button base style
  const iconBtn = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: 'transparent', color: 'var(--text-secondary)',
    transition: 'background 0.15s, color 0.15s', marginBottom: 2,
  }

  // Shared user dropdown content
  const UserDropdown = ({ left }) => (
    <div style={{ position: 'fixed', bottom: 70, left, width: 224, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 14, padding: 6, zIndex: 200, boxShadow: '0 -8px 32px rgba(0,0,0,0.25)' }}>
      <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border-primary)', marginBottom: 4 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{displayName || 'My Account'}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{isGuest ? 'Saved locally · not synced' : userEmail}</p>
      </div>
      <button onClick={() => { setShowUserMenu(false); onFeedback() }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <MessageSquare size={15} /> Feedback
      </button>
      <button onClick={() => { setShowUserMenu(false); onTour() }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <Compass size={15} /> Take the Tour
      </button>
      <button onClick={() => { setShowUserMenu(false); onHide() }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <PanelLeftClose size={15} /> Hide Sidebar
      </button>
      <button onClick={() => { setShowUserMenu(false); onSignOut() }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#ef4444', fontSize: 13, fontWeight: 500, transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <LogOut size={15} /> {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
      </button>
    </div>
  )

  return (
    <>
      {mobileOpen && <div className="mobile-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 35 }} />}

      <aside className={`sidebar${mobileOpen ? ' open' : ''}${isHidden ? ' sidebar-hidden' : ''}${compact ? ' sidebar-compact' : ''}`}
        style={{ overflow: 'visible' }}>

        {/* ─── HEADER ─── */}
        {/* Compact logo — always present, fades in when compact */}
        <div style={{
          padding: '14px 0 16px',
          borderBottom: compact ? '1px solid var(--border-primary)' : 'none',
          display: 'flex', justifyContent: 'center',
          opacity: compact ? 1 : 0,
          maxHeight: compact ? 70 : 0,
          overflow: 'hidden',
          transition: 'opacity 0.25s ease, max-height 0.3s ease',
          pointerEvents: compact ? 'auto' : 'none',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }} title="Daily Planner">
            <ClipboardList size={19} color="#fff" />
          </div>
        </div>

        {/* Full header — collapses to 0 height when compact */}
        <div style={{
          borderBottom: compact ? 'none' : '1px solid var(--border-primary)',
          overflow: 'hidden',
          maxHeight: compact ? 0 : 200,
          opacity: compact ? 0 : 1,
          transition: 'max-height 0.3s ease, opacity 0.2s ease, border 0.3s ease',
          pointerEvents: compact ? 'none' : 'auto',
        }}>
          <div style={{ padding: '20px 20px 16px' }}>
            <div style={{ marginBottom: 14 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Daily Planner</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Track your progress</p>
            </div>

            {/* ── Progress bar with stat labels ── */}
            <div className="sidebar-header-stats">
              {/* Labels row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue)' }}>
                  {todayTotal > 0 ? `${Math.round((todayCompleted / todayTotal) * 100)}%` : '—'} today
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Flame size={11} color="var(--accent-orange)" />
                    <span style={{ fontWeight: 600, color: 'var(--accent-orange)' }}>{streakData.current}</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: todayCompleted === todayTotal && todayTotal > 0 ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                    {todayTotal === 0 ? 'no tasks' : todayCompleted === todayTotal ? 'all done' : `${todayTotal - todayCompleted} left`}
                  </span>
                </div>
              </div>
              {/* Bar */}
              <div style={{
                height: 6, borderRadius: 99,
                background: 'var(--border-primary)',
                overflow: 'hidden',
              }}>
                {(() => {
                  const pct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0
                  return (
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      borderRadius: 99,
                      background: pct === 100
                        ? 'var(--accent-green)'
                        : 'linear-gradient(90deg, var(--accent-blue), #818cf8)',
                      transition: 'width 0.4s ease',
                    }} />
                  )
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* ─── NAV ─── */}
        <nav style={{ flex: 1, padding: compact ? '12px 6px' : '12px', transition: 'padding 0.25s ease' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} tour-nav-${label.toLowerCase()}`}
              title={compact ? label : undefined}
              style={{
                marginBottom: 4, display: 'flex',
                justifyContent: compact ? 'center' : 'flex-start',
                padding: compact ? '10px 0' : undefined,
                transition: 'justify-content 0.25s ease, padding 0.25s ease',
              }}
            >
              <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Icon size={18} />
                {to === '/today' && overdueCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -5,
                    right: -7,
                    background: '#ef4444',
                    color: 'white',
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 10,
                    minWidth: 14,
                    height: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    lineHeight: 1,
                  }}>
                    {overdueCount > 99 ? '99+' : overdueCount}
                  </span>
                )}
              </span>
              <span style={{
                marginLeft: compact ? 0 : 8,
                maxWidth: compact ? 0 : 200,
                overflow: 'hidden', whiteSpace: 'nowrap',
                opacity: compact ? 0 : 1,
                transition: 'opacity 0.2s ease, max-width 0.25s ease, margin-left 0.25s ease',
              }}>
                {label}
              </span>
            </NavLink>
          ))}

          {/* Search — below Calendar in nav */}
          <button
            onClick={onSearch}
            className="nav-item"
            title={compact ? 'Search' : undefined}
            style={{
              marginBottom: 4, display: 'flex', width: '100%', border: 'none', cursor: 'pointer',
              justifyContent: compact ? 'center' : 'flex-start',
              padding: compact ? '10px 0' : undefined,
              background: 'transparent',
              transition: 'justify-content 0.25s ease, padding 0.25s ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <Search size={18} />
            </span>
            <span style={{
              marginLeft: compact ? 0 : 8,
              maxWidth: compact ? 0 : 200,
              overflow: 'hidden', whiteSpace: 'nowrap',
              opacity: compact ? 0 : 1,
              transition: 'opacity 0.2s ease, max-width 0.25s ease, margin-left 0.25s ease',
            }}>
              Search
            </span>
          </button>
        </nav>

        {/* ─── FOOTER ─── */}
        <div style={{ padding: compact ? '8px 6px 4px' : 12, borderTop: '1px solid var(--border-primary)' }}>

          {compact ? (
            /* ── COMPACT: icons only ── */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button onClick={undo}       disabled={!canUndo} title="Undo (Ctrl+Z)" className="btn btn-ghost" style={{ ...iconBtn, opacity: canUndo ? 1 : 0.35 }}><Undo2 size={16} /></button>
              <button onClick={redo}       disabled={!canRedo} title="Redo (Ctrl+Y)" className="btn btn-ghost" style={{ ...iconBtn, opacity: canRedo ? 1 : 0.35 }}><Redo2 size={16} /></button>
              <button onClick={onPomodoro} title="Pomodoro Timer" className="btn btn-ghost tour-pomodoro-btn" style={iconBtn}><Timer size={16} color={pomodoro.isRunning ? 'var(--accent-blue)' : undefined} /></button>
              <button onClick={onVoice}    title="Voice Input"    className="btn btn-ghost tour-voice-btn"    style={iconBtn}><Mic size={16} /></button>
              <button onClick={onWidget}   title="Widget View"    className="btn btn-ghost tour-widget-btn"   style={iconBtn}><PanelTop size={16} /></button>
              <button onClick={onSettings} title="Settings"       className="btn btn-ghost tour-settings-btn" style={iconBtn}><Settings size={16} /></button>

              {/* Collapse toggle */}
              <button onClick={onToggleCompact} title="Expand sidebar"
                style={{ ...iconBtn, marginTop: 4, borderTop: '1px solid var(--border-primary)', paddingTop: 10, color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-blue)'; e.currentTarget.style.background = 'var(--bg-input)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)';  e.currentTarget.style.background = 'transparent' }}
              >
                <ChevronsRight size={16} />
              </button>

              {/* Avatar */}
              <div ref={userMenuRef} style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid var(--border-primary)', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => setShowUserMenu(p => !p)} title={displayName || userEmail}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: '50%' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                    {getInitials()}
                  </div>
                </button>
                {showUserMenu && <UserDropdown left={70} />}
              </div>
            </div>

          ) : (
            /* ── FULL: icon + label ── */
            <>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                <button onClick={undo} disabled={!canUndo} className="btn btn-ghost" style={{ flex: 1, opacity: canUndo ? 1 : 0.4 }} title="Undo (Ctrl+Z)">
                  <Undo2 size={14} />
                  <span style={{ marginLeft: 6, opacity: compact ? 0 : 1, maxWidth: compact ? 0 : 60, overflow: 'hidden', whiteSpace: 'nowrap', transition: 'opacity 0.2s ease, max-width 0.25s ease' }}>Undo</span>
                </button>
                <button onClick={redo} disabled={!canRedo} className="btn btn-ghost" style={{ flex: 1, opacity: canRedo ? 1 : 0.4 }} title="Redo (Ctrl+Y)">
                  <Redo2 size={14} />
                  <span style={{ marginLeft: 6, opacity: compact ? 0 : 1, maxWidth: compact ? 0 : 60, overflow: 'hidden', whiteSpace: 'nowrap', transition: 'opacity 0.2s ease, max-width 0.25s ease' }}>Redo</span>
                </button>
              </div>
              <button onClick={onPomodoro} className="btn btn-ghost tour-pomodoro-btn" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 4 }}>
                <Timer size={16} color={pomodoro.isRunning ? 'var(--accent-blue)' : undefined} />
                <span style={{ marginLeft: 8, opacity: compact ? 0 : 1, maxWidth: compact ? 0 : 200, overflow: 'hidden', whiteSpace: 'nowrap', transition: 'opacity 0.2s ease, max-width 0.25s ease' }}>
                  Pomodoro Timer {pomodoro.isRunning && `(${pomodoro.formattedTime})`}
                </span>
              </button>
              <button onClick={onVoice} className="btn btn-ghost tour-voice-btn" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 4 }}>
                <Mic size={16} />
                <span style={{ marginLeft: 8, opacity: compact ? 0 : 1, maxWidth: compact ? 0 : 200, overflow: 'hidden', whiteSpace: 'nowrap', transition: 'opacity 0.2s ease, max-width 0.25s ease' }}>Voice Input</span>
              </button>
              <button onClick={onWidget} className="btn btn-ghost tour-widget-btn" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 4 }}>
                <PanelTop size={16} />
                <span style={{ marginLeft: 8, opacity: compact ? 0 : 1, maxWidth: compact ? 0 : 200, overflow: 'hidden', whiteSpace: 'nowrap', transition: 'opacity 0.2s ease, max-width 0.25s ease' }}>Widget View</span>
              </button>
              <button onClick={onSettings} className="btn btn-ghost tour-settings-btn" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 4 }}>
                <Settings size={16} />
                <span style={{ marginLeft: 8, opacity: compact ? 0 : 1, maxWidth: compact ? 0 : 200, overflow: 'hidden', whiteSpace: 'nowrap', transition: 'opacity 0.2s ease, max-width 0.25s ease' }}>Settings</span>
              </button>

              {/* Collapse toggle */}
              <button onClick={onToggleCompact} title="Collapse sidebar"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, padding: '6px 4px', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, borderRadius: 6, transition: 'color 0.15s, background 0.15s', marginBottom: 8 }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-blue)'; e.currentTarget.style.background = 'var(--bg-input)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)';  e.currentTarget.style.background = 'transparent' }}
              >
                Collapse <ChevronsLeft size={15} />
              </button>

              {/* Avatar + dropdown */}
              <div ref={userMenuRef} style={{ position: 'relative', paddingTop: 8, borderTop: '1px solid var(--border-primary)' }}>
                <button onClick={() => setShowUserMenu(p => !p)} className="btn btn-ghost"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: showUserMenu ? 'var(--bg-input)' : 'transparent', transition: 'background 0.15s' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                    {getInitials()}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden', opacity: compact ? 0 : 1, maxWidth: compact ? 0 : 200, transition: 'opacity 0.2s ease, max-width 0.25s ease' }}>
                    {displayName && <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>}
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isGuest ? 'Saved locally · not synced' : userEmail}</p>
                  </div>
                </button>
                {showUserMenu && <UserDropdown left={12} />}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

// ── AppContent ───────────────────────────────────────────────────────────────

function AppContent({ user, onSignOut, isGuest = false, onExitGuest, onFeedback }) {
  const progress = useProgress(user.id)
  const navigate = useNavigate()
  const { theme, themeMode, toggleTheme } = useTheme()

  const [showReset,     setShowReset]     = useState(false)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [sidebarCompact, setSidebarCompact] = useState(() => localStorage.getItem('sidebar_compact') === 'true')
  const [toast,         setToast]         = useState(null)
  const [showAddTask,   setShowAddTask]   = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showPomodoro,  setShowPomodoro]  = useState(false)
  const [showWidget,    setShowWidget]    = useState(false)
  const [showVoice,     setShowVoice]     = useState(false)
  const [showSettings,  setShowSettings]  = useState(false)
  const [showRollover,  setShowRollover]  = useState(false)
  const [showSearch,    setShowSearch]    = useState(false)
  const [showTour,      setShowTour]      = useState(false)
  const [icsPreview,    setIcsPreview]    = useState(null) // { tasks, calendarCategories, ... }

  const getFocusedTaskRef = useRef(null)
  const [pomodoroTask,   setPomodoroTask]   = useState(null)
  const [globalFocusTask, setGlobalFocusTask] = useState(null)   // persists across routes
  const [focusMinimized,  setFocusMinimized]  = useState(false)
  const toastTimerRef = useRef(null)
  const undoRef = useRef(null)
  undoRef.current = progress.undo  // always up-to-date, no stale closure

  // ── App-wide confetti on task completion ──────────────────────────────
  const [confettiTrigger, setConfettiTrigger] = useState(0)

  // Wrap toggleTaskComplete to fire confetti when a task is marked done
  const handleToggleTaskComplete = useCallback((taskId) => {
    const task = progress.tasks.find(t => t.id === taskId)
    const wasCompleted = task?.completed
    progress.toggleTaskComplete(taskId)
    if (!wasCompleted) setConfettiTrigger(c => c + 1)
  }, [progress.tasks, progress.toggleTaskComplete])

  // Wrap deleteTask to show an undo toast
  const handleDeleteTask = useCallback((taskId) => {
    progress.deleteTask(taskId)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({
      message: 'Task deleted',
      type: 'undo',
      onUndo: () => {
        undoRef.current?.()   // always calls the latest undo
        setToast(null)
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      },
    })
    toastTimerRef.current = setTimeout(() => setToast(null), 5000)
  }, [progress.deleteTask])

  const handleStartPomodoro = useCallback(() => {
    const task = getFocusedTaskRef.current?.() || null
    setPomodoroTask(task)
    setShowPomodoro(true)
  }, [])

  const handleToggleCompact = () => {
    setSidebarCompact(prev => {
      const next = !prev
      localStorage.setItem('sidebar_compact', String(next))
      return next
    })
  }

  const notifications = useNotifications(progress.todayTasks)
  const pomodoro = usePomodoro()

  const showToast = useCallback((message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ message, type })
    toastTimerRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Overdue rollover: show once per day when there are past incomplete tasks ──
  useEffect(() => {
    if (progress.dataLoading) return
    const todayStr = new Date().toISOString().split('T')[0]
    const dismissedKey = `rollover_dismissed_${todayStr}`
    if (localStorage.getItem(dismissedKey) === 'true') return
    const overdue = progress.tasks.filter(t => !t.completed && t.date < todayStr)
    if (overdue.length > 0) setShowRollover(true)
  }, [progress.dataLoading]) // run once after data loads

  // ── First-visit tour ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (progress.dataLoading) return
    if (!localStorage.getItem('app_tour_completed')) {
      // Small delay so the UI has rendered before the tour overlay appears
      const t = setTimeout(() => setShowTour(true), 600)
      return () => clearTimeout(t)
    }
  }, [progress.dataLoading]) // run once after data loads

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const action = progress.undo()
        if (action) showToast(`Undo: ${action.type.replace(/_/g, ' ').toLowerCase()}`, 'info')
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        const action = progress.redo()
        if (action) showToast(`Redo: ${action.type.replace(/_/g, ' ').toLowerCase()}`, 'info')
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShowSearch(p => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [progress.undo, progress.redo, showToast])

  useKeyboardShortcuts({
    onNewTask:    () => setShowAddTask(true),
    onNavigate:   navigate,
    onCloseModal: () => {
      if (showAddTask)        setShowAddTask(false)
      else if (showShortcuts) setShowShortcuts(false)
      else if (showPomodoro)  setShowPomodoro(false)
      else if (showWidget)    setShowWidget(false)
      else if (showVoice)     setShowVoice(false)
      else if (showSettings)  setShowSettings(false)
      else if (showSearch)    setShowSearch(false)
      else if (showTour)      setShowTour(false)
      else if (showReset)     setShowReset(false)
    },
    onToggleHelp:     () => setShowShortcuts(p => !p),
    onStartPomodoro:  handleStartPomodoro,
    disabled: false,
  })

  const handleReset = async () => {
    await progress.resetAllData()
    setShowReset(false)
    showToast('All data reset', 'success')
  }

  const handleExport = () => {
    progress.exportData()
    showToast(`Exported ${progress.totalTasks} tasks`, 'success')
  }

  const handleExportIcs = (fromDate, toDate) => {
    const count = progress.exportAsIcs(fromDate, toDate)
    if (count > 0) showToast(`Exported ${count} tasks as .ics`, 'success')
    return count
  }

  const handleImportIcs = (icsString) => {
    const result = progress.importFromIcs(icsString)
    if (!result.success) {
      showToast(result.error, 'error')
      return
    }
    if (result.tasks.length === 0) {
      showToast('No events found in ICS file', 'error')
      return
    }
    // Close settings modal and open preview
    setShowSettings(false)
    setIcsPreview(result)
  }

  const handleIcsConfirm = async (selectedTasks) => {
    const count = await progress.confirmImportFromIcs(selectedTasks)
    setIcsPreview(null)
    showToast(`Imported ${count} task${count !== 1 ? 's' : ''} from ICS`, 'success')
  }

  const handleImport = async (jsonString) => {
    const result = await progress.importData(jsonString)
    if (result.success) showToast(`Imported ${result.tasksCount} tasks`, 'success')
    else showToast(result.error, 'error')
  }

  if (progress.dataLoading) return <LoadingScreen message="Loading your data…" />

  const todayStr = new Date().toISOString().split('T')[0]
  const overdueTasks = progress.tasks.filter(t => !t.completed && t.date < todayStr)

  const handleRolloverMove = (ids) => {
    ids.forEach(id => progress.updateTask(id, { date: todayStr }))
    setShowRollover(false)
    localStorage.setItem(`rollover_dismissed_${todayStr}`, 'true')
    showToast(`Moved ${ids.length} task${ids.length > 1 ? 's' : ''} to today`, 'success')
  }

  const handleRolloverDismiss = () => {
    setShowRollover(false)
    localStorage.setItem(`rollover_dismissed_${todayStr}`, 'true')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* Re-open button when fully hidden */}
      <button
        onClick={() => setSidebarHidden(false)}
        title="Show sidebar"
        style={{
          position: 'fixed', top: '50%', left: 0, transform: 'translateY(-50%)',
          zIndex: 50, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
          borderLeft: 'none', borderRadius: '0 10px 10px 0', padding: '10px 8px',
          cursor: 'pointer', color: 'var(--text-secondary)',
          display: sidebarHidden ? 'flex' : 'none',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)', transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
      >
        <PanelLeftOpen size={18} />
      </button>

      <Sidebar
        progress={progress}
        pomodoro={pomodoro}
        onPomodoro={() => { setPomodoroTask(null); setShowPomodoro(true) }}
        onSearch={() => setShowSearch(true)}
        onWidget={() => setShowWidget(true)}
        onVoice={() => setShowVoice(true)}
        onSettings={() => setShowSettings(true)}
        onFeedback={onFeedback}
        onTour={() => setShowTour(true)}
        mobileOpen={mobileSidebar}
        onClose={() => setMobileSidebar(false)}
        onSignOut={onSignOut}
        onHide={() => setSidebarHidden(true)}
        isHidden={sidebarHidden}
        compact={sidebarCompact}
        onToggleCompact={handleToggleCompact}
        userEmail={user.email}
        displayName={user.user_metadata?.display_name || user.user_metadata?.full_name || ''}
        isGuest={isGuest}
      />

      <main
        className={`main-content${sidebarHidden ? ' sidebar-hidden' : sidebarCompact ? ' sidebar-compact' : ''}`}
        style={{ flex: 1, minHeight: '100vh' }}
      >
        <div className="mobile-topbar" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', position: 'sticky', top: 0, zIndex: 20 }}>
          <button onClick={() => setMobileSidebar(true)} className="btn btn-ghost" style={{ padding: 8 }}><Menu size={20} /></button>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>Daily Planner</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}>{progress.overallPercent}%</span>
            <span style={{ fontSize: 13, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 2 }}><Flame size={14} />{progress.streakData.current}</span>
            <button onClick={() => setShowSearch(true)} className="btn btn-ghost" style={{ padding: 6 }} title="Search (⌘/)">
              <Search size={18} />
            </button>
            <button onClick={toggleTheme} className="btn btn-ghost" style={{ padding: 6 }} title={themeMode === 'auto' ? 'Auto (system)' : themeMode === 'dark' ? 'Dark mode' : 'Light mode'}>
              {themeMode === 'auto' ? <SunMoon size={18} /> : theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>

        <div className="page-content">
          {/* Guest mode banner */}
          {isGuest && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', marginBottom: 16,
              background: 'rgba(234,179,8,0.08)',
              border: '1px solid rgba(234,179,8,0.3)',
              borderRadius: 10, flexWrap: 'nowrap',
            }}>
              <UserCircle size={14} color="#ca8a04" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#ca8a04', fontWeight: 600, flexShrink: 0 }}>Guest Mode</span>
              <span className="guest-banner-detail" style={{ fontSize: 12, color: '#a16207', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                — data is saved locally and will be lost if you clear your browser.
              </span>
              <button
                onClick={onExitGuest}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', flexShrink: 0,
                  borderRadius: 7, border: '1px solid rgba(234,179,8,0.4)',
                  background: 'rgba(234,179,8,0.12)', color: '#ca8a04', cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                Sign in
              </button>
            </div>
          )}
          <Routes>
            <Route path="/"         element={<Dashboard   progress={progress} />} />
            <Route path="/today"    element={<TodayPage    progress={{ ...progress, toggleTaskComplete: handleToggleTaskComplete, deleteTask: handleDeleteTask }} getFocusedTaskRef={getFocusedTaskRef} onStartFocus={(task) => { setGlobalFocusTask(task); setFocusMinimized(false) }} globalFocusTask={globalFocusTask} />} />
            <Route path="/week"     element={<WeekPage     progress={{ ...progress, toggleTaskComplete: handleToggleTaskComplete, deleteTask: handleDeleteTask }} />} />
            <Route path="/calendar" element={<CalendarPage progress={{ ...progress, toggleTaskComplete: handleToggleTaskComplete, deleteTask: handleDeleteTask }} />} />
          </Routes>
        </div>
      </main>

      {showReset && <ResetModal onConfirm={handleReset} onCancel={() => setShowReset(false)} />}

      {/* Global persistent Focus Mode — survives route changes */}
      {globalFocusTask && (
        <FocusMode
          isOpen={true}
          minimized={focusMinimized}
          onMinimize={() => setFocusMinimized(true)}
          onExpand={() => setFocusMinimized(false)}
          onClose={() => { setGlobalFocusTask(null); setFocusMinimized(false) }}
          task={globalFocusTask}
          onToggleComplete={(taskId) => {
            progress.toggleTaskComplete(taskId)
            setGlobalFocusTask(prev => prev ? { ...prev, completed: !prev.completed } : null)
          }}
          onSetActualDuration={progress.setActualDuration}
          onNextTask={() => {
            const todayIncomplete = progress.todayTasks?.filter(t => !t.completed && t.id !== globalFocusTask?.id)
            if (todayIncomplete?.length > 0) setGlobalFocusTask(todayIncomplete[0])
            else setGlobalFocusTask(null)
          }}
          hasNextTask={!!(progress.todayTasks?.filter(t => !t.completed && t.id !== globalFocusTask?.id).length)}
        />
      )}

      {showRollover && overdueTasks.length > 0 && (
        <OverdueRolloverModal
          tasks={overdueTasks}
          onMoveSelected={handleRolloverMove}
          onDismiss={handleRolloverDismiss}
        />
      )}

      <AddTaskModal
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        onSave={(taskData) => { progress.addTask(taskData); showToast('Task added', 'success') }}
        topics={progress.topics}
        onAddTopic={progress.addTopic}
      />
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <PomodoroTimer  isOpen={showPomodoro}  onClose={() => { setShowPomodoro(false); setPomodoroTask(null) }}  pomodoro={pomodoro} currentTask={pomodoroTask} />
      <WidgetView
        isOpen={showWidget} onClose={() => setShowWidget(false)}
        tasks={progress.tasks} onToggleComplete={handleToggleTaskComplete} getTopicColor={progress.getTopicColor}
      />
      <VoiceInput
        isOpen={showVoice} onClose={() => setShowVoice(false)}
        topics={progress.topics}
        onResult={(parsed) => {
          progress.addTask({
            title:    parsed.title,
            date:     parsed.date,
            duration: parsed.duration ?? 30,
            dueTime:  parsed.dueTime  ?? null,
            priority: parsed.priority ?? null,
            topic:    parsed.topic    ?? 'Personal',
          })
          showToast(`Task added: "${parsed.title}"`, 'success')
        }}
      />
      <SettingsModal
        isOpen={showSettings} onClose={() => setShowSettings(false)}
        notifications={notifications}
        onExport={handleExport} onImport={handleImport} onExportIcs={handleExportIcs} onImportIcs={handleImportIcs} onReset={() => setShowReset(true)}
        totalTasks={progress.totalTasks}
        tasks={progress.tasks}
        archivedTasks={progress.archivedTasks} onRestore={progress.restoreTask}
        onDeleteArchived={progress.deleteArchivedTask} onArchiveOld={progress.archiveCompletedTasks}
        getTopicColor={progress.getTopicColor}
        onStartTour={() => { setShowSettings(false); setShowTour(true) }}
      />

      {/* Timer completion widget */}
      <TimerAlert
        alert={pomodoro.timerAlert}
        onDismiss={pomodoro.dismissTimerAlert}
        onStart={pomodoro.startNextPhase}
      />

      {/* ICS Import Preview */}
      <IcsImportPreview
        isOpen={!!icsPreview}
        onClose={() => setIcsPreview(null)}
        parseResult={icsPreview}
        topics={progress.topics}
        onConfirm={handleIcsConfirm}
      />

      {toast && (
        <div className="toast animate-slideIn" style={{ background: toast.type === 'error' ? 'var(--accent-red)' : 'var(--bg-secondary)', color: toast.type === 'error' ? 'white' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {toast.type === 'success' && <span style={{ fontSize: 16 }}>✓</span>}
          {toast.type === 'error'   && <span style={{ fontSize: 16 }}>✗</span>}
          <span style={{ fontSize: 14, flex: 1 }}>{toast.message}</span>
          {toast.type === 'undo' && toast.onUndo && (
            <button
              onClick={toast.onUndo}
              style={{
                background: 'var(--accent-blue)', color: 'white',
                border: 'none', borderRadius: 6, padding: '4px 10px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* App-wide confetti on task completion */}
      <Confetti trigger={confettiTrigger} count={70} />

      {/* Command palette */}
      <CommandPalette
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        tasks={progress.tasks}
        topics={progress.topics}
        getTopicColor={progress.getTopicColor}
        onNavigate={navigate}
      />

      {/* App Tour */}
      <AppTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        navigate={navigate}
      />
    </div>
  )
}

// ── Root ─────────────────────────────────────────────────────────────────────

function Root() {
  const { user, loading, signIn, signUp, signOut, resetPassword } = useAuth()
  const [guestMode,     setGuestMode]     = useState(() => localStorage.getItem('guest_mode') === 'true')
  const [showAuth,      setShowAuth]      = useState(false)
  const [showFeedback,  setShowFeedback]  = useState(false)

  const handleEnterGuest = () => { localStorage.setItem('guest_mode', 'true'); setGuestMode(true) }
  const handleExitGuest  = () => { localStorage.removeItem('guest_mode'); setGuestMode(false); setShowAuth(false) }

  if (supabaseMisconfigured) return <SetupScreen />
  if (loading && !guestMode) return <LoadingScreen message="Starting up…" />

  // ── Feedback page — accessible from everywhere ───────────────────────────
  if (showFeedback) {
    const effectiveUser = user ?? (guestMode ? { id: 'guest', email: 'guest@local', user_metadata: { display_name: 'Guest' } } : null)
    return <FeedbackPage onBack={() => setShowFeedback(false)} user={effectiveUser} />
  }

  // ── Authenticated or guest → main app ────────────────────────────────────
  if (user || guestMode) {
    const effectiveUser = user ?? { id: 'guest', email: 'guest@local', user_metadata: { display_name: 'Guest' } }
    const handleSignOut = user ? signOut : handleExitGuest
    return (
      <BrowserRouter>
        <AppContent
          user={effectiveUser}
          onSignOut={handleSignOut}
          isGuest={!user}
          onExitGuest={handleExitGuest}
          onFeedback={() => setShowFeedback(true)}
        />
      </BrowserRouter>
    )
  }

  // ── Auth page ─────────────────────────────────────────────────────────────
  if (showAuth) {
    return <AuthPage onSignIn={signIn} onSignUp={signUp} onResetPassword={resetPassword} onGuestMode={handleEnterGuest} onBack={() => setShowAuth(false)} />
  }

  // ── Landing page (default for unauthenticated) ────────────────────────────
  return <LandingPage onGetStarted={() => setShowAuth(true)} onGuestMode={handleEnterGuest} onFeedback={() => setShowFeedback(true)} />
}

export default function App() {
  return <ThemeProvider><Root /></ThemeProvider>
}
