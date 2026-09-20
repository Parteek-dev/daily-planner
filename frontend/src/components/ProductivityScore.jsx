import { Zap, Flame, Target, CheckCircle2 } from 'lucide-react'

export default function ProductivityScore({ score, breakdown, level, levelColor }) {
  const { streakScore, completionScore, goalScore } = breakdown
  
  // Calculate circle progress
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="card-static">
      <h3 style={{ 
        fontSize: 12, 
        fontWeight: 600, 
        color: 'var(--text-muted)', 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em', 
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Zap size={14} />
        Productivity Score
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        {/* Score ring */}
        <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0, margin: '0 auto' }}>
          <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--bg-input)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={levelColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{score}</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>/ 100</p>
          </div>
        </div>

        {/* Level and breakdown */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 6, 
            padding: '6px 12px', 
            background: `${levelColor}20`, 
            borderRadius: 20,
            marginBottom: 12,
          }}>
            <Zap size={14} style={{ color: levelColor }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: levelColor }}>{level}</span>
          </div>

          {/* Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Flame size={14} color="var(--accent-orange)" />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>Streaks</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{streakScore}/40</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} color="var(--accent-green)" />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>Completion</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{completionScore}/30</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={14} color="var(--accent-blue)" />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>Goals</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{goalScore}/30</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
