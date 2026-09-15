import { PieChart, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react'

export default function TopicBalance({ analysis, getTopicColor }) {
  const { topics, totalTime, totalTasks, suggestions, isBalanced } = analysis

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  if (totalTasks === 0) {
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
          <PieChart size={16} color="var(--accent-green)" />
          Topic Balance
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
          Add tasks to different topics to see your time distribution.
        </p>
      </div>
    )
  }

  // Create pie chart segments
  let currentAngle = 0
  const segments = topics.map(topic => {
    const angle = (topic.percent / 100) * 360
    const segment = {
      ...topic,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
    }
    currentAngle += angle
    return segment
  })

  // Convert angle to SVG arc path
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    }
  }

  const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle)
    const end = polarToCartesian(x, y, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "L", x, y,
      "Z"
    ].join(" ")
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
        <PieChart size={16} color="var(--accent-green)" />
        Topic Balance
        {isBalanced && (
          <CheckCircle2 size={14} color="var(--accent-green)" style={{ marginLeft: 'auto' }} />
        )}
      </h3>

      {/* Pie Chart and Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        {/* Pie Chart */}
        <div style={{ width: 100, height: 100, flexShrink: 0 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            {segments.map((segment, i) => (
              <path
                key={segment.name}
                d={describeArc(50, 50, 45, segment.startAngle, segment.endAngle - 0.5)}
                fill={getTopicColor(segment.name)}
                style={{ transition: 'opacity 0.2s' }}
              />
            ))}
            {/* Center circle for donut effect */}
            <circle cx="50" cy="50" r="25" fill="var(--bg-secondary)" />
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--text-primary)"
              fontSize="12"
              fontWeight="700"
            >
              {formatDuration(totalTime)}
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {topics.slice(0, 5).map(topic => (
            <div key={topic.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 10, 
                height: 10, 
                borderRadius: 3, 
                background: getTopicColor(topic.name),
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>
                {topic.name}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: getTopicColor(topic.name) }}>
                {topic.percent}%
              </span>
            </div>
          ))}
          {topics.length > 5 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              +{topics.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Topic Details */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Topic Stats
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topics.map(topic => (
            <div 
              key={topic.name}
              style={{
                background: 'var(--bg-input)',
                borderRadius: 8,
                padding: 10,
                borderLeft: `3px solid ${getTopicColor(topic.name)}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {topic.name}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {topic.taskCount} tasks · {formatDuration(topic.totalTime)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Avg: <strong style={{ color: 'var(--text-secondary)' }}>{topic.avgDuration}m</strong>
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Completed: <strong style={{ 
                    color: topic.completionRate >= 70 ? 'var(--accent-green)' : topic.completionRate >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)'
                  }}>{topic.completionRate}%</strong>
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ 
                height: 4, 
                background: 'var(--bg-secondary)', 
                borderRadius: 2, 
                marginTop: 8,
                overflow: 'hidden',
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${topic.completionRate}%`,
                  background: getTopicColor(topic.name),
                  borderRadius: 2,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ 
          background: 'rgba(249,115,22,0.1)', 
          borderRadius: 10, 
          padding: 14,
          borderLeft: '3px solid var(--accent-orange)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Lightbulb size={14} color="var(--accent-orange)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-orange)' }}>
              Suggestions
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {suggestions.map((suggestion, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.5 }}>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isBalanced && suggestions.length === 0 && (
        <div style={{ 
          background: 'rgba(34,197,94,0.1)', 
          borderRadius: 10, 
          padding: 14,
          textAlign: 'center',
        }}>
          <CheckCircle2 size={20} color="var(--accent-green)" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: 'var(--accent-green)', fontWeight: 500 }}>
            Great balance! Your time is well distributed across topics.
          </p>
        </div>
      )}
    </div>
  )
}
