import { Clock, Sun, Sunset, Moon, Star } from 'lucide-react'

export default function BestHoursChart({ analysis }) {
  const { hourlyData, peakHours, mostProductivePeriod, byPeriod } = analysis

  const maxCompleted = Math.max(...hourlyData.map(h => h.completed), 1)

  const formatHour = (hour) => {
    if (hour === 0) return '12a'
    if (hour === 12) return '12p'
    if (hour < 12) return `${hour}a`
    return `${hour - 12}p`
  }

  const periodIcons = {
    morning: Sun,
    afternoon: Sunset,
    evening: Moon,
    night: Star,
  }

  const periodLabels = {
    morning: 'Morn',
    afternoon: 'Aftn',
    evening: 'Eve',
    night: 'Night',
  }

  const periodColors = {
    morning: '#f97316',
    afternoon: '#3b82f6',
    evening: '#a855f7',
    night: '#64748b',
  }

  const hasData = hourlyData.some(h => h.completed > 0)

  if (!hasData) {
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
          <Clock size={16} color="var(--accent-purple)" />
          Best Hours
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
          Complete some tasks to see your productivity patterns.
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
        <Clock size={16} color="var(--accent-purple)" />
        Best Hours
      </h3>

      {/* Most Productive Period */}
      <div style={{ 
        background: 'var(--bg-input)', 
        borderRadius: 12, 
        padding: 16, 
        marginBottom: 20,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Most Productive</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-purple)' }}>
          {mostProductivePeriod}
        </p>
        {peakHours.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Peak hours: {peakHours.map(h => formatHour(h)).join(', ')}
          </p>
        )}
      </div>

      {/* Hourly Chart */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Tasks Completed by Hour
        </p>
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-end', 
          gap: 2, 
          height: 60,
          padding: '0 4px',
        }}>
          {hourlyData.map((data, hour) => {
            const height = data.completed > 0 ? Math.max(8, (data.completed / maxCompleted) * 60) : 4
            const isPeak = peakHours.includes(hour)
            
            return (
              <div
                key={hour}
                style={{
                  flex: 1,
                  height: height,
                  background: isPeak 
                    ? 'var(--accent-purple)' 
                    : data.completed > 0 
                      ? 'var(--accent-blue)' 
                      : 'var(--border-primary)',
                  borderRadius: '2px 2px 0 0',
                  transition: 'height 0.3s ease',
                  cursor: data.completed > 0 ? 'pointer' : 'default',
                }}
                title={data.completed > 0 ? `${formatHour(hour)}: ${data.completed} tasks` : formatHour(hour)}
              />
            )
          })}
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: 4,
          padding: '0 4px',
        }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>12a</span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>6a</span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>12p</span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>6p</span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>11p</span>
        </div>
      </div>

      {/* Period Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))', gap: 8 }}>
        {Object.entries(byPeriod).map(([period, data]) => {
          const Icon = periodIcons[period]
          const color = periodColors[period]
          
          return (
            <div
              key={period}
              style={{
                background: `${color}10`,
                borderRadius: 10,
                padding: 12,
                textAlign: 'center',
              }}
            >
              <Icon size={16} color={color} style={{ marginBottom: 4 }} />
              <p style={{ fontSize: 16, fontWeight: 700, color }}>{data.count}</p>
              <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>{periodLabels[period]}</p>
              <p style={{ fontSize: 10, color, fontWeight: 600 }}>{data.percent}%</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
