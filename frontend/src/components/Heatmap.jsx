import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, TrendingUp } from 'lucide-react'

// 5-level color scale
const COLORS = [
  'var(--bg-input)',   // 0 tasks
  '#bfdbfe',          // 1
  '#60a5fa',          // 2-3
  '#2563eb',          // 4-6
  '#1e3a8a',          // 7+
]

const DOW_LABELS  = ['Mon', 'Wed', 'Fri']  // labels for rows 1, 3, 5 (0-indexed)
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getColor(count) {
  if (count === 0) return COLORS[0]
  if (count === 1) return COLORS[1]
  if (count <= 3)  return COLORS[2]
  if (count <= 6)  return COLORS[3]
  return COLORS[4]
}

function dateStr(date) {
  return date.toLocaleDateString('en-CA') // YYYY-MM-DD in local time
}

export default function Heatmap({ heatmapData, onDayClick }) {
  const navigate = useNavigate()
  const [tooltip, setTooltip] = useState(null) // { date, count, x, y }

  const today = useMemo(() => new Date(), [])

  // ── Build 52-week grid ──────────────────────────────────────────────────
  const { weeks, monthLabels, stats } = useMemo(() => {
    const dataMap = {}
    heatmapData.forEach(d => { dataMap[d.date] = d.count })

    // Start from the Monday 52 weeks ago
    const start = new Date(today)
    start.setDate(start.getDate() - (52 * 7) + 1)
    // Align to Monday
    const dow = start.getDay() // 0=Sun
    const offset = dow === 0 ? -6 : 1 - dow
    start.setDate(start.getDate() + offset)

    const weeks = []
    const monthLabels = [] // { weekIndex, month }
    let lastMonth = -1
    let weekIndex = 0

    const cursor = new Date(start)
    while (cursor <= today) {
      const week = []
      for (let d = 0; d < 7; d++) {
        if (cursor > today) {
          week.push(null)
        } else {
          const ds = dateStr(cursor)
          const count = dataMap[ds] || 0
          week.push({ date: ds, count, isToday: ds === dateStr(today) })
        }
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(week)

      // Track month label — use the date of the first non-null day in the week
      const firstDay = week.find(d => d !== null)
      if (firstDay) {
        const m = new Date(firstDay.date + 'T12:00:00').getMonth()
        if (m !== lastMonth) {
          monthLabels.push({ weekIndex, month: MONTH_NAMES[m] })
          lastMonth = m
        }
      }
      weekIndex++
    }

    // Stats
    const allDays = weeks.flat().filter(Boolean)
    const totalCompleted = allDays.reduce((s, d) => s + d.count, 0)
    const activeDays = allDays.filter(d => d.count > 0).length
    const bestDay = allDays.reduce((best, d) => d.count > (best?.count || 0) ? d : best, null)
    const avg = activeDays > 0 ? (totalCompleted / activeDays).toFixed(1) : 0

    return { weeks, monthLabels, stats: { totalCompleted, activeDays, bestDay, avg } }
  }, [heatmapData, today])

  const CELL = 13  // cell size px
  const GAP  = 3   // gap px
  const DOW_WIDTH = 28 // left label column

  const handleCellClick = useCallback((day) => {
    if (!day || day.count === 0) return
    sessionStorage.setItem('calendar_jump_date', day.date)
    navigate('/calendar')
  }, [navigate])

  const handleMouseEnter = useCallback((e, day) => {
    if (!day) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({ date: day.date, count: day.count, x: rect.left + rect.width / 2, y: rect.top - 8 })
  }, [])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  const totalWidth = weeks.length * (CELL + GAP)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Activity (Last 12 Months)
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {stats.totalCompleted} tasks on {stats.activeDays} active days
        </p>
      </div>

      {/* Month labels row */}
      <div style={{ display: 'flex', marginLeft: DOW_WIDTH, marginBottom: 4, position: 'relative', height: 14 }}>
        {monthLabels.map(({ weekIndex, month }) => (
          <span
            key={`${month}-${weekIndex}`}
            style={{
              position: 'absolute',
              left: weekIndex * (CELL + GAP),
              fontSize: 10, color: 'var(--text-muted)', fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {month}
          </span>
        ))}
      </div>

      {/* Grid with day-of-week labels */}
      <div style={{ display: 'flex', gap: 6 }}>

        {/* DOW labels: Mon, Wed, Fri */}
        <div style={{
          display: 'grid',
          gridTemplateRows: `repeat(7, ${CELL}px)`,
          gap: GAP, width: DOW_WIDTH - 6, flexShrink: 0,
        }}>
          {['Mon','','Wed','','Fri','',''].map((label, i) => (
            <div key={i} style={{ height: CELL, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Week columns */}
        <div style={{ overflow: 'visible', paddingBottom: 2, paddingTop: 2 }}>
          <div style={{ display: 'flex', gap: GAP, position: 'relative' }}>
            {weeks.map((week, wi) => {
              return (
                <div key={wi}>
                  <div style={{
                    display: 'grid',
                    gridTemplateRows: `repeat(7, ${CELL}px)`,
                    gap: GAP,
                    overflow: 'visible',
                  }}>
                    {week.map((day, di) => (
                      <div
                        key={di}
                        onMouseEnter={day ? (e) => handleMouseEnter(e, day) : undefined}
                        onMouseLeave={day ? handleMouseLeave : undefined}
                        onClick={day ? () => handleCellClick(day) : undefined}
                        style={{
                          width: CELL, height: CELL,
                          borderRadius: 3,
                          background: day ? getColor(day.count) : 'transparent',
                          border: day?.isToday
                            ? '2px solid var(--accent-blue)'
                            : day ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
                          cursor: day?.count > 0 ? 'pointer' : 'default',
                          transition: 'transform 0.1s',
                          flexShrink: 0,
                        }}
                        onMouseOver={e => { if (day?.count > 0) e.currentTarget.style.transform = 'scale(1.3)' }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)' }}
                      />
                    ))}
                </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend + stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Less</span>
          {COLORS.map((c, i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: c, border: '1px solid rgba(0,0,0,0.08)' }} />
          ))}
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>More</span>
        </div>

        {/* Stats summary */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {stats.bestDay && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trophy size={11} color="#eab308" />
              Best day: <strong style={{ color: 'var(--text-secondary)' }}>
                {new Date(stats.bestDay.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                &nbsp;({stats.bestDay.count} tasks)
              </strong>
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={11} color="var(--accent-green)" />
            Avg: <strong style={{ color: 'var(--text-secondary)' }}>{stats.avg} tasks/active day</strong>
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Click a day to view tasks
          </span>
        </div>
      </div>

      {/* Tooltip — rendered via fixed position */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, -100%)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 12,
          color: 'var(--text-primary)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}>
          {new Date(tooltip.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          &nbsp;·&nbsp;
          <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{tooltip.count}</span>
          &nbsp;task{tooltip.count !== 1 ? 's' : ''} completed
        </div>
      )}
    </div>
  )
}
