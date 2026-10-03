import { useState } from 'react'
import { Play, Pause, RotateCcw, Coffee, Brain, X, Timer, Volume2, VolumeX, Settings, Info } from 'lucide-react'

export default function PomodoroTimer({ isOpen, onClose, pomodoro, currentTask = null }) {
  const [showSettings, setShowSettings] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const {
    mode,
    timeLeft,
    isRunning,
    completedSessions,
    soundEnabled,
    workMinutes,
    breakMinutes,
    longBreakMinutes,
    progress,
    toggleTimer,
    resetTimer,
    skipToNext,
    setSoundEnabled,
    setWorkMinutes,
    setBreakMinutes,
    setLongBreakMinutes,
    formatTime,
    SESSIONS_BEFORE_LONG_BREAK,
  } = pomodoro

  const modeColors = {
    work: 'var(--accent-blue)',
    break: 'var(--accent-green)',
    longBreak: 'var(--accent-purple)',
  }

  const modeLabels = {
    work: 'Focus Time',
    break: 'Short Break',
    longBreak: 'Long Break',
  }

  const modeIcons = {
    work: Brain,
    break: Coffee,
    longBreak: Coffee,
  }

  const ModeIcon = modeIcons[mode]

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
            <Timer size={20} />
            Focus Timer
          </h2>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => { setShowInfo(p => !p); setShowSettings(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: showInfo ? 'var(--accent-blue)' : 'var(--text-muted)', padding: 6 }}
              title="How it works"
            >
              <Info size={18} />
            </button>
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button 
              onClick={() => { setShowSettings(p => !p); setShowInfo(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: showSettings ? 'var(--accent-blue)' : 'var(--text-muted)', padding: 6 }}
              title="Timer settings"
            >
              <Settings size={18} />
            </button>
            <button 
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className="animate-fadeIn" style={{ background: 'var(--bg-input)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              🍅 The Pomodoro Technique
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 12 }}>
              Created by Francesco Cirillo in the late 1980s. <em>"Pomodoro"</em> is Italian for <strong>tomato</strong> — he used a tomato-shaped kitchen timer as a student.
            </p>

            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>How it works</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              {[
                ['🧠', `Work ${workMinutes} min`, 'deep focus, no distractions'],
                ['☕', `Break ${breakMinutes} min`, 'step away, rest your mind'],
                ['🔁', 'Repeat ×4', 'four rounds = one full cycle'],
                ['🛋️', `Long break ${longBreakMinutes} min`, 'recharge fully'],
              ].map(([icon, label, desc]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', minWidth: 90 }}>{label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Why it helps</p>
            <ul style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                'Forces focused work in short, manageable bursts',
                'The countdown creates urgency — harder to procrastinate',
                'Regular breaks prevent mental fatigue',
                'Big tasks feel less overwhelming one sprint at a time',
              ].map(tip => (
                <li key={tip} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Settings panel */}
        {showSettings && (
          <div className="animate-fadeIn" style={{ 
            background: 'var(--bg-input)', 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 20 
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
              TIMER SETTINGS (minutes)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Work</label>
                <input
                  type="number"
                  className="input"
                  value={workMinutes}
                  onChange={e => setWorkMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={60}
                  style={{ padding: 8, fontSize: 14, textAlign: 'center' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Break</label>
                <input
                  type="number"
                  className="input"
                  value={breakMinutes}
                  onChange={e => setBreakMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={30}
                  style={{ padding: 8, fontSize: 14, textAlign: 'center' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Long</label>
                <input
                  type="number"
                  className="input"
                  value={longBreakMinutes}
                  onChange={e => setLongBreakMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={60}
                  style={{ padding: 8, fontSize: 14, textAlign: 'center' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Current task */}
        {currentTask && (
          <div style={{ 
            background: 'var(--bg-input)', 
            borderRadius: 10, 
            padding: '10px 14px', 
            marginBottom: 20,
            fontSize: 13,
            color: 'var(--text-secondary)'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Working on: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{currentTask.title}</span>
          </div>
        )}

        {/* Mode indicator */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 8, 
          marginBottom: 16,
          padding: '8px 16px',
          background: `${modeColors[mode]}15`,
          borderRadius: 20,
          width: 'fit-content',
          margin: '0 auto 16px',
        }}>
          <ModeIcon size={16} style={{ color: modeColors[mode] }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: modeColors[mode] }}>
            {modeLabels[mode]}
          </span>
        </div>

        {/* Timer display */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {/* Circular progress */}
          <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto' }}>
            <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background circle */}
              <circle
                cx="90"
                cy="90"
                r="80"
                fill="none"
                stroke="var(--bg-input)"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="90"
                cy="90"
                r="80"
                fill="none"
                stroke={modeColors[mode]}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 80}`}
                strokeDashoffset={`${2 * Math.PI * 80 * (1 - progress / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            {/* Time display */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <p style={{ 
                fontSize: 42, 
                fontWeight: 700, 
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                letterSpacing: 2,
              }}>
                {formatTime(timeLeft)}
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={resetTimer}
            className="btn btn-secondary"
            style={{ padding: '12px 16px' }}
            title="Reset"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={toggleTimer}
            className="btn btn-primary"
            style={{ 
              padding: '12px 32px', 
              background: modeColors[mode],
              fontSize: 15,
            }}
          >
            {isRunning ? <Pause size={20} /> : <Play size={20} />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={skipToNext}
            className="btn btn-secondary"
            style={{ padding: '12px 16px' }}
            title="Skip to next"
          >
            <Coffee size={18} />
          </button>
        </div>

        {/* Session count */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Sessions completed: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{completedSessions}</span>
            {completedSessions > 0 && (
              <span style={{ color: 'var(--text-muted)' }}> ({completedSessions * workMinutes} min focused)</span>
            )}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Long break after every {SESSIONS_BEFORE_LONG_BREAK} sessions
          </p>
        </div>
      </div>
    </div>
  )
}
