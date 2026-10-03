import { Clock, TrendingUp, TrendingDown, Target, BarChart3, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { fmtDuration } from '../lib/utils'

function accuracyVerdict(accuracy) {
  if (accuracy >= 90) return { label: 'Excellent estimator', color: 'var(--accent-green)' }
  if (accuracy >= 75) return { label: 'Good estimator',      color: 'var(--accent-green)' }
  if (accuracy >= 60) return { label: 'Getting there',       color: 'var(--accent-orange)' }
  return                     { label: 'Needs calibration',   color: 'var(--accent-red)' }
}

function varianceLabel(averageVariance) {
  if (averageVariance === 0)  return 'Your estimates are spot on!'
  const abs = Math.abs(averageVariance)
  if (averageVariance > 0)    return `You typically underestimate by ${abs}m`
  return                             `You typically finish ${abs}m early`
}

export default function TimeTrackingStats({ stats, getTopicColor }) {
  const navigate = useNavigate()
  const {
    totalEstimated,
    totalActual,
    accuracy,
    overEstimateCount,
    underEstimateCount,
    accurateCount,
    averageVariance,
    byTopic,
    totalTracked,
  } = stats

  const accuracyColor = accuracy >= 75 ? 'var(--accent-green)' : accuracy >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)'
  const verdict = accuracyVerdict(accuracy)

  if (totalTracked === 0) {
    return (
      <div className="card-static" style={{ padding: 20 }}>
        <h3 style={{
          fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)',
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Clock size={16} color="var(--accent-blue)" />
          Time Tracking
        </h3>

        <div style={{
          padding: '20px 16px', borderRadius: 12,
          background: 'var(--bg-input)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          textAlign: 'center',
        }}>
          <Clock size={28} color="var(--text-muted)" strokeWidth={1.5} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              No tracking data yet
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 220 }}>
              Use Focus Mode to time your tasks. You'll see if your estimates are realistic.
            </p>
          </div>
          <button
            onClick={() => {
              sessionStorage.setItem('focus_mode_hint', 'true')
              navigate('/today')
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--accent-blue)', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            Start Focus Mode <ArrowRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card-static" style={{ padding: 20 }}>
      <h3 style={{
        fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)',
        marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Clock size={16} color="var(--accent-blue)" />
        Time Tracking
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
          {totalTracked} tasks tracked
        </span>
      </h3>

      {/* Accuracy ring + verdict */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0, margin: '0 auto' }}>
          <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--bg-input)" strokeWidth="8" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={accuracyColor} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - accuracy / 100)}`}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: accuracyColor }}>{accuracy}%</span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {/* Human verdict */}
          <p style={{ fontSize: 14, fontWeight: 700, color: verdict.color, marginBottom: 2 }}>
            {verdict.label}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
            {varianceLabel(averageVariance)}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Estimated: <strong style={{ color: 'var(--text-primary)' }}>{fmtDuration(totalEstimated)}</strong>
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Actual: <strong style={{ color: 'var(--text-primary)' }}>{fmtDuration(totalActual)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
          <TrendingDown size={16} color="var(--accent-green)" style={{ marginBottom: 4 }} />
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-green)' }}>{overEstimateCount}</p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Finished Early</p>
        </div>
        <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
          <Target size={16} color="var(--accent-blue)" style={{ marginBottom: 4 }} />
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-blue)' }}>{accurateCount}</p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>On Target</p>
        </div>
        <div style={{ background: 'rgba(249,115,22,0.1)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
          <TrendingUp size={16} color="var(--accent-orange)" style={{ marginBottom: 4 }} />
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-orange)' }}>{underEstimateCount}</p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Took Longer</p>
        </div>
      </div>

      {/* By Topic */}
      {Object.keys(byTopic).length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            By Topic
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(byTopic).map(([topic, data]) => {
              const topicAccuracy = data.estimated > 0
                ? Math.max(0, Math.round((1 - Math.abs(data.actual - data.estimated) / data.estimated) * 100))
                : 0
              const delta = data.actual - data.estimated
              const deltaAbs = Math.abs(delta)
              const deltaLabel = delta === 0
                ? 'spot on'
                : delta > 0
                  ? `+${deltaAbs}m over`
                  : `-${deltaAbs}m under`
              const deltaColor = delta === 0
                ? 'var(--accent-green)'
                : delta > 0
                  ? 'var(--accent-orange)'
                  : 'var(--accent-green)'

              return (
                <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: getTopicColor(topic), flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1, minWidth: 60 }}>{topic}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {fmtDuration(data.estimated)} → {fmtDuration(data.actual)}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: deltaColor, minWidth: 60, textAlign: 'right' }}>
                    {deltaLabel}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
