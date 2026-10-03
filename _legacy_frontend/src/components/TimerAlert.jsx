import { useEffect, useState } from 'react'
import { X, Play, Brain, Coffee, Armchair } from 'lucide-react'

/**
 * TimerAlert — persistent bottom-right toast widget shown when
 * a Focus Timer phase ends. Stays until explicitly dismissed.
 *
 * Props:
 *   alert  — { type, sessions, nextMode, nextMinutes } | null
 *   onDismiss  — close without starting next phase
 *   onStart    — dismiss + start next phase immediately
 */
export default function TimerAlert({ alert, onDismiss, onStart }) {
  const [visible, setVisible] = useState(false)

  // Animate in when alert appears
  useEffect(() => {
    if (alert) {
      // Small delay so the CSS transition fires
      const t = setTimeout(() => setVisible(true), 30)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
    }
  }, [alert])

  if (!alert) return null

  // ── Config per alert type ────────────────────────────────────────────────
  const config = {
    workDone: {
      icon:       <Coffee size={22} />,
      iconBg:     'rgba(34,197,94,0.15)',
      iconColor:  '#22c55e',
      accent:     '#22c55e',
      title:      'Focus session complete! ☕',
      subtitle:   `Session ${alert.sessions} of 4 done`,
      message:    `Time for a ${alert.nextMinutes}-min break — step away and recharge.`,
      nextLabel:  `Start ${alert.nextMinutes}-min Break`,
    },
    longBreakEarned: {
      icon:       <Armchair size={22} />,
      iconBg:     'rgba(168,85,247,0.15)',
      iconColor:  '#a855f7',
      accent:     '#a855f7',
      title:      'Long break earned! 🛋️',
      subtitle:   `${alert.sessions} sessions completed`,
      message:    `You finished a full cycle! Take a well-deserved ${alert.nextMinutes}-min break.`,
      nextLabel:  `Start ${alert.nextMinutes}-min Long Break`,
    },
    breakDone: {
      icon:       <Brain size={22} />,
      iconBg:     'rgba(59,130,246,0.15)',
      iconColor:  'var(--accent-blue)',
      accent:     'var(--accent-blue)',
      title:      'Break over — let\'s go! 🧠',
      subtitle:   `${alert.sessions} session${alert.sessions !== 1 ? 's' : ''} done today`,
      message:    `Ready for another ${alert.nextMinutes}-min focus sprint?`,
      nextLabel:  `Start ${alert.nextMinutes}-min Focus`,
    },
  }

  const c = config[alert.type] || config.workDone

  return (
    <>
      {/* Backdrop — subtle, non-blocking, just dims slightly */}
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.15)',
          zIndex: 998,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Toast widget */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 320,
          zIndex: 999,
          background: 'var(--bg-secondary)',
          border: `1px solid ${c.accent}40`,
          borderRadius: 16,
          boxShadow: `0 8px 40px rgba(0,0,0,0.25), 0 0 0 1px ${c.accent}20`,
          overflow: 'hidden',
          // Slide up + fade in
          transform: visible ? 'translateY(0)' : 'translateY(32px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Accent bar at top */}
        <div style={{ height: 3, background: c.accent }} />

        <div style={{ padding: '16px 16px 14px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            {/* Icon */}
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: c.iconBg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: c.iconColor,
            }}>
              {c.icon}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                {c.title}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {c.subtitle}
              </p>
            </div>

            {/* Close */}
            <button
              onClick={onDismiss}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0, borderRadius: 6, lineHeight: 0 }}
              title="Dismiss"
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <X size={16} />
            </button>
          </div>

          {/* Message */}
          <p style={{
            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55,
            padding: '10px 12px', background: 'var(--bg-input)',
            borderRadius: 8, marginBottom: 14,
          }}>
            {c.message}
          </p>

          {/* Session progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 2 }}>Cycle</span>
            {Array.from({ length: 4 }).map((_, i) => {
              const sessionInCycle = (alert.sessions % 4) || 4
              const filled = i < sessionInCycle
              return (
                <div key={i} style={{
                  width: filled ? 20 : 8, height: 8, borderRadius: 4,
                  background: filled ? c.accent : 'var(--bg-input)',
                  transition: 'width 0.3s ease, background 0.3s ease',
                }} />
              )
            })}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>
              {((alert.sessions % 4) || 4)}/4
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onStart}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '9px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: c.accent, color: 'white',
                fontSize: 13, fontWeight: 600,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Play size={14} /> {c.nextLabel}
            </button>
            <button
              onClick={onDismiss}
              style={{
                padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border-primary)',
                cursor: 'pointer', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: 13,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes timerAlertIn {
          from { transform: translateY(32px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}
