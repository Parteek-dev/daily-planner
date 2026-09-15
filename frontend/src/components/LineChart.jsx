import { useMemo } from 'react'

export default function LineChart({ data, height = 200, showGrid = true, color = 'var(--accent-blue)' }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null
    
    const values = data.map(d => d.completed)
    const maxY = Math.max(...values, 1)
    
    return { maxY, values }
  }, [data])

  if (!data || data.length === 0 || !chartData) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No data available
      </div>
    )
  }

  const { maxY, values } = chartData
  const paddingLeft = 35
  const paddingRight = 10
  const paddingTop = 20
  const paddingBottom = 30

  // Calculate points as percentages
  const getX = (index) => {
    const chartWidth = 100 - paddingLeft - paddingRight
    return paddingLeft + (index / (data.length - 1 || 1)) * chartWidth
  }

  const getY = (value) => {
    const chartHeight = height - paddingTop - paddingBottom
    return paddingTop + chartHeight - (value / maxY) * chartHeight
  }

  const linePoints = data.map((d, i) => `${getX(i)},${getY(d.completed)}`).join(' ')
  
  // Area path
  const areaPoints = [
    `${getX(0)},${height - paddingBottom}`,
    ...data.map((d, i) => `${getX(i)},${getY(d.completed)}`),
    `${getX(data.length - 1)},${height - paddingBottom}`
  ].join(' ')

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <svg 
        width="100%" 
        height={height}
        style={{ display: 'block' }}
      >
        {/* Grid lines */}
        {showGrid && [0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = paddingTop + (height - paddingTop - paddingBottom) * (1 - pct)
          return (
            <line
              key={i}
              x1={`${paddingLeft}%`}
              y1={y}
              x2={`${100 - paddingRight}%`}
              y2={y}
              stroke="var(--border-primary)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          )
        })}
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <polygon
          points={areaPoints}
          fill="url(#areaGradient)"
        />
        
        {/* Line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={`${getX(i)}%`}
            cy={getY(d.completed)}
            r="4"
            fill={color}
            stroke="var(--bg-secondary)"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
          >
            <title>{d.label}: {d.completed} tasks</title>
          </circle>
        ))}
        
        {/* Y-axis labels */}
        {[0, 0.5, 1].map((pct, i) => {
          const y = paddingTop + (height - paddingTop - paddingBottom) * (1 - pct)
          const value = Math.round(maxY * pct)
          return (
            <text
              key={i}
              x={paddingLeft - 2 + '%'}
              y={y + 4}
              textAnchor="end"
              style={{ fontSize: 11, fill: 'var(--text-muted)' }}
            >
              {value}
            </text>
          )
        })}
        
        {/* X-axis labels */}
        {data.filter((_, i) => i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1).map((d, i, arr) => (
          <text
            key={i}
            x={`${getX(i === 0 ? 0 : i === 1 ? Math.floor(data.length / 2) : data.length - 1)}%`}
            y={height - 8}
            textAnchor="middle"
            style={{ fontSize: 11, fill: 'var(--text-muted)' }}
          >
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
