import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react'
import { fmtDuration } from '../lib/utils'

// Format a minutes delta with hours if needed: +135 → "+2h 15m", -30 → "-30m"
function fmtDelta(mins) {
  const sign = mins >= 0 ? '+' : '-'
  return sign + fmtDuration(Math.abs(mins))
}

// Build a one-line summary sentence for the week
function weekSummary(report, weeksAgo) {
  if (report.completedTasks === 0) {
    return weeksAgo === 0
      ? 'No tasks completed yet this week — get started!'
      : 'No tasks were completed this week.'
  }
  // Best day
  const best = report.dailyBreakdown.reduce((b, d) => d.completed > (b?.completed ?? 0) ? d : b, null)
  const dayLabel = weeksAgo === 0 && best?.isToday ? 'today' : best?.dayName
  const parts = []
  if (best && best.completed > 0) parts.push(`Best day was ${dayLabel} with ${best.completed} task${best.completed !== 1 ? 's' : ''}`)
  if (report.totalMinutes > 0) parts.push(`${fmtDuration(report.totalMinutes)} invested`)
  if (report.completionRate === 100) parts.push('all tasks done ✓')
  return parts.join(' · ')
}

export default function WeeklyReport({ thisWeek, lastWeek, getWeeklyReport, getTopicColor }) {
  const [weeksAgo, setWeeksAgo] = useState(0)
  const report   = weeksAgo === 0 ? thisWeek : weeksAgo === 1 ? lastWeek : getWeeklyReport(weeksAgo)
  const prevWeek = weeksAgo === 0 ? lastWeek : getWeeklyReport(weeksAgo + 1)

  const tasksTrend   = report.completedTasks - prevWeek.completedTasks
  const minutesTrend = report.totalMinutes - prevWeek.totalMinutes

  const hours = Math.floor(report.totalMinutes / 60)
  const mins  = report.totalMinutes % 60

  const formatDate = (dateStr) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const maxCompleted = Math.max(...report.dailyBreakdown.map(d => d.completed), 1)

  // Today's date string for highlighting
  const todayStr = new Date().toISOString().split('T')[0]

  // Annotate dailyBreakdown with isToday
  const days = report.dailyBreakdown.map(d => ({ ...d, isToday: d.date === todayStr }))

  return (
    <div className="card-static">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Weekly Report
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setWeeksAgo(p => p + 1)} className="btn btn-ghost" style={{ padding: 4 }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 120, textAlign: 'center' }}>
            {weeksAgo === 0 ? 'This Week' : weeksAgo === 1 ? 'Last Week' : `${weeksAgo} weeks ago`}
          </span>
          <button onClick={() => setWeeksAgo(p => Math.max(0, p - 1))} className="btn btn-ghost" style={{ padding: 4 }} disabled={weeksAgo === 0}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Date range */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        {formatDate(report.startDate)} — {formatDate(report.endDate)}
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>

        {/* Tasks done */}
        <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            <CheckCircle2 size={14} color="var(--accent-green)" />
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{report.completedTasks}</span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tasks Done</p>
          {tasksTrend !== 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 4 }}>
              {tasksTrend > 0
                ? <TrendingUp size={10} color="var(--accent-green)" />
                : <TrendingDown size={10} color="var(--accent-red)" />}
              <span style={{ fontSize: 10, color: tasksTrend > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {tasksTrend > 0 ? '+' : ''}{tasksTrend} vs last week
              </span>
            </div>
          )}
        </div>

        {/* Time spent */}
        <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            <Clock size={14} color="var(--accent-blue)" />
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`}
            </span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Time Spent</p>
          {minutesTrend !== 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 4 }}>
              {minutesTrend > 0
                ? <TrendingUp size={10} color="var(--accent-green)" />
                : <TrendingDown size={10} color="var(--accent-red)" />}
              <span style={{ fontSize: 10, color: minutesTrend > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {fmtDelta(minutesTrend)} vs last week
              </span>
            </div>
          )}
        </div>

        {/* Completion */}
        <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: report.completionRate === 100 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
            {report.completionRate}%
          </span>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Completion</p>
        </div>
      </div>

      {/* ── Week summary sentence ── */}
      {report.completedTasks >= 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, fontStyle: 'italic', lineHeight: 1.5 }}>
          {weekSummary(report, weeksAgo)}
        </p>
      )}

      {/* ── Daily bar chart — taller, labeled, with count above bar ── */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Daily Breakdown</p>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
          {days.map((day, i) => {
            const barH = day.completed > 0
              ? Math.max(16, Math.round((day.completed / maxCompleted) * 72))
              : 6
            const isActive = day.completed > 0
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
                {/* Count label above bar */}
                {isActive && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: day.isToday ? 'var(--accent-blue)' : 'var(--text-secondary)', lineHeight: 1 }}>
                    {day.completed}
                  </span>
                )}
                {/* Bar */}
                <div
                  style={{
                    width: '100%',
                    height: barH,
                    background: day.isToday
                      ? 'var(--accent-blue)'
                      : isActive
                        ? 'rgba(99,102,241,0.5)'
                        : 'var(--bg-input)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.35s ease',
                    border: day.isToday ? 'none' : isActive ? 'none' : '1px solid var(--border-primary)',
                  }}
                  title={`${day.dayName}: ${day.completed} task${day.completed !== 1 ? 's' : ''}, ${fmtDuration(day.minutes)}`}
                />
                {/* Day label */}
                <span style={{ fontSize: 9, color: day.isToday ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: day.isToday ? 700 : 400 }}>
                  {day.dayName}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Topic breakdown */}
      {Object.keys(report.topicBreakdown).length > 0 && (
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>By Topic</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(report.topicBreakdown)
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 5)
              .map(([topic, stats]) => (
                <div key={topic} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px',
                  background: `${getTopicColor(topic)}15`,
                  borderRadius: 8,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: getTopicColor(topic) }} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{topic}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{stats.count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
