import { Clock, TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react'

export default function TimeTrackingStats({ stats, getTopicColor }) {
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

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const varianceLabel = averageVariance > 0 
    ? `+${averageVariance}m (tasks take longer)` 
    : averageVariance < 0 
      ? `${averageVariance}m (you finish early)` 
      : 'Spot on!'

  const accuracyColor = accuracy >= 80 ? 'var(--accent-green)' : accuracy >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)'

  if (totalTracked === 0) {
    return (
      <div className="card-static" style={{ padding: 20 }}>
        <h3 style={{ 
          fontSize: 14, 
          fontWeight: 600, 
          color: 'var(--text-secondary)',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Clock size={16} color="var(--accent-blue)" />
          Time Tracking
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
          No time tracking data yet. Complete tasks in Focus Mode to track actual time.
        </p>
      </div>
    )
  }

  return (
    <div className="card-static" style={{ padding: 20 }}>
      <h3 style={{ 
        fontSize: 14, 
        fontWeight: 600, 
        color: 'var(--text-secondary)',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Clock size={16} color="var(--accent-blue)" />
        Time Tracking
        <span style={{ 
          fontSize: 11, 
          color: 'var(--text-muted)', 
          fontWeight: 400,
          marginLeft: 'auto',
        }}>
          {totalTracked} tasks tracked
        </span>
      </h3>

      {/* Accuracy Ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="var(--bg-input)"
              strokeWidth="8"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke={accuracyColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - accuracy / 100)}`}
            />
          </svg>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: accuracyColor }}>{accuracy}%</span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Estimation Accuracy
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            {varianceLabel}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Estimated: <strong style={{ color: 'var(--text-primary)' }}>{formatDuration(totalEstimated)}</strong>
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Actual: <strong style={{ color: 'var(--text-primary)' }}>{formatDuration(totalActual)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ 
          background: 'rgba(34,197,94,0.1)', 
          borderRadius: 10, 
          padding: 12,
          textAlign: 'center',
        }}>
          <TrendingDown size={16} color="var(--accent-green)" style={{ marginBottom: 4 }} />
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-green)' }}>{overEstimateCount}</p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Finished Early</p>
        </div>
        <div style={{ 
          background: 'rgba(59,130,246,0.1)', 
          borderRadius: 10, 
          padding: 12,
          textAlign: 'center',
        }}>
          <Target size={16} color="var(--accent-blue)" style={{ marginBottom: 4 }} />
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-blue)' }}>{accurateCount}</p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>On Target</p>
        </div>
        <div style={{ 
          background: 'rgba(249,115,22,0.1)', 
          borderRadius: 10, 
          padding: 12,
          textAlign: 'center',
        }}>
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
              const variance = data.actual - data.estimated
              
              return (
                <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ 
                    width: 10, 
                    height: 10, 
                    borderRadius: 3, 
                    background: getTopicColor(topic),
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>{topic}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatDuration(data.estimated)} → {formatDuration(data.actual)}
                  </span>
                  <span style={{ 
                    fontSize: 11, 
                    fontWeight: 600,
                    color: topicAccuracy >= 80 ? 'var(--accent-green)' : topicAccuracy >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)',
                  }}>
                    {topicAccuracy}%
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
