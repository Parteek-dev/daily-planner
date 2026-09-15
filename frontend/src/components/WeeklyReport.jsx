import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function WeeklyReport({ thisWeek, lastWeek, getWeeklyReport, getTopicColor }) {
  const [weeksAgo, setWeeksAgo] = useState(0)
  const report = weeksAgo === 0 ? thisWeek : weeksAgo === 1 ? lastWeek : getWeeklyReport(weeksAgo)
  
  const prevWeek = weeksAgo === 0 ? lastWeek : getWeeklyReport(weeksAgo + 1)
  
  // Calculate trends
  const tasksTrend = report.completedTasks - prevWeek.completedTasks
  const minutesTrend = report.totalMinutes - prevWeek.totalMinutes
  
  const hours = Math.floor(report.totalMinutes / 60)
  const mins = report.totalMinutes % 60

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="card-static">
      {/* Header with navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ 
          fontSize: 12, 
          fontWeight: 600, 
          color: 'var(--text-muted)', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em' 
        }}>
          Weekly Report
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setWeeksAgo(prev => prev + 1)}
            className="btn btn-ghost"
            style={{ padding: 4 }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 120, textAlign: 'center' }}>
            {weeksAgo === 0 ? 'This Week' : weeksAgo === 1 ? 'Last Week' : `${weeksAgo} weeks ago`}
          </span>
          <button
            onClick={() => setWeeksAgo(prev => Math.max(0, prev - 1))}
            className="btn btn-ghost"
            style={{ padding: 4 }}
            disabled={weeksAgo === 0}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Date range */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        {formatDate(report.startDate)} — {formatDate(report.endDate)}
      </p>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            <CheckCircle2 size={14} color="var(--accent-green)" />
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {report.completedTasks}
            </span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tasks Done</p>
          {tasksTrend !== 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 4 }}>
              {tasksTrend > 0 ? <TrendingUp size={10} color="var(--accent-green)" /> : <TrendingDown size={10} color="var(--accent-red)" />}
              <span style={{ fontSize: 10, color: tasksTrend > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {tasksTrend > 0 ? '+' : ''}{tasksTrend}
              </span>
            </div>
          )}
        </div>
        
        <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            <Clock size={14} color="var(--accent-blue)" />
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {hours}h {mins}m
            </span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Time Spent</p>
          {minutesTrend !== 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 4 }}>
              {minutesTrend > 0 ? <TrendingUp size={10} color="var(--accent-green)" /> : <TrendingDown size={10} color="var(--accent-red)" />}
              <span style={{ fontSize: 10, color: minutesTrend > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {minutesTrend > 0 ? '+' : ''}{minutesTrend}m
              </span>
            </div>
          )}
        </div>
        
        <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {report.completionRate}%
          </span>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Completion</p>
        </div>
      </div>

      {/* Daily bar chart */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Daily Breakdown</p>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 60 }}>
          {report.dailyBreakdown.map((day, i) => {
            const maxCompleted = Math.max(...report.dailyBreakdown.map(d => d.completed), 1)
            const height = day.completed > 0 ? (day.completed / maxCompleted) * 100 : 5
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div 
                  style={{ 
                    width: '100%', 
                    height: `${height}%`, 
                    minHeight: 4,
                    background: day.completed > 0 ? 'var(--accent-blue)' : 'var(--bg-input)',
                    borderRadius: 4,
                    transition: 'height 0.3s ease',
                  }}
                  title={`${day.dayName}: ${day.completed} tasks, ${day.minutes}m`}
                />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{day.dayName}</span>
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
                <div 
                  key={topic}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    background: `${getTopicColor(topic)}15`,
                    borderRadius: 8,
                  }}
                >
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
