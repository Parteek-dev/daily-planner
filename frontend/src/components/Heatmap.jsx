import { useMemo } from 'react'

const LEGEND_COLORS = ['var(--bg-input)', '#1e3a5f', '#1d4ed8', '#3b82f6', '#60a5fa']

export default function Heatmap({ heatmapData }) {
  const today = new Date()
  
  // Show last 60 days - newest first (today at top-left)
  const days = useMemo(() => {
    const result = []
    const dataMap = {}
    heatmapData.forEach(d => { dataMap[d.date] = d.count })

    for (let i = 0; i < 60; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const count = dataMap[dateStr] || 0
      const isToday = i === 0
      result.push({ date: dateStr, count, isToday })
    }
    return result
  }, [heatmapData])

  const getColor = (count) => {
    if (count === 0) return 'var(--bg-input)'
    if (count <= 1) return '#1e3a5f'
    if (count <= 2) return '#1d4ed8'
    if (count <= 4) return '#3b82f6'
    return '#60a5fa'
  }

  const totalCompleted = heatmapData.reduce((sum, d) => sum + d.count, 0)
  const activeDays = heatmapData.filter(d => d.count > 0).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Activity (Last 60 Days)
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {totalCompleted} tasks on {activeDays} active days
        </p>
      </div>

      {/* Grid: 4 rows x 15 cols with fixed cell sizes */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(15, 20px)', 
        gridTemplateRows: 'repeat(4, 20px)',
        gap: 4, 
        marginBottom: 12,
        justifyContent: 'start',
      }}>
        {days.map((day, i) => (
          <div
            key={i}
            className="heatmap-cell"
            title={`${day.date}: ${day.count} task${day.count !== 1 ? 's' : ''}`}
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              background: getColor(day.count),
              border: day.isToday ? '2px solid var(--accent-blue)' : '1px solid var(--border-primary)',
              cursor: 'default',
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-start' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Less</span>
        {LEGEND_COLORS.map((color, i) => (
          <div 
            key={i} 
            style={{ 
              width: 12, 
              height: 12, 
              borderRadius: 3, 
              background: color,
              border: '1px solid var(--border-primary)',
            }} 
          />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>More</span>
      </div>
    </div>
  )
}
