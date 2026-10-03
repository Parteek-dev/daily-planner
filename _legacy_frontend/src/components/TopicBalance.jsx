import { useState } from 'react'
import { PieChart, CheckCircle2, Lightbulb } from 'lucide-react'
import { fmtDuration } from '../lib/utils'

export default function TopicBalance({ analysis, getTopicColor }) {
  const { topics, totalTime, totalTasks, suggestions, isBalanced } = analysis
  const [mode, setMode] = useState('time') // 'time' | 'tasks'

  if (totalTasks === 0) {
    return (
      <div className="card-static" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <PieChart size={16} color="var(--accent-green)" />
          Topic Balance
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
          Add tasks to different topics to see your time distribution.
        </p>
      </div>
    )
  }

  // ── Donut geometry ────────────────────────────────────────────────────────
  const polarToCartesian = (cx, cy, r, deg) => {
    const rad = (deg - 90) * Math.PI / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }
  const describeArc = (x, y, r, start, end) => {
    const s = polarToCartesian(x, y, r, end)
    const e = polarToCartesian(x, y, r, start)
    return [`M`,s.x,s.y,`A`,r,r,0,end-start<=180?0:1,0,e.x,e.y,`L`,x,y,`Z`].join(' ')
  }

  let angle = 0
  const segments = topics.map(topic => {
    const pct  = mode === 'time'
      ? (totalTime  > 0 ? topic.totalTime  / totalTime  * 100 : 0)
      : (totalTasks > 0 ? topic.taskCount  / totalTasks * 100 : 0)
    const seg = { ...topic, pct: Math.round(pct), startAngle: angle, endAngle: angle + (pct / 100) * 360 }
    angle += (pct / 100) * 360
    return seg
  })

  const centerLabel = mode === 'time' ? fmtDuration(totalTime) : `${totalTasks}`
  const centerSub   = mode === 'time' ? 'total time' : `task${totalTasks !== 1 ? 's' : ''}`

  // ── Suggestion rewrite ────────────────────────────────────────────────────
  const rewriteSuggestion = (s) => {
    // Replace "X takes Y% of your time. Consider balancing." with friendlier copy
    const m = s.match(/(\w+) takes (\d+)% of your time/i)
    if (m) return `${m[1]} takes up ${m[2]}% of your time — try exploring other areas too`
    return s
  }

  return (
    <div className="card-static" style={{ padding: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <PieChart size={16} color="var(--accent-green)" />
          Topic Balance
          {isBalanced && <CheckCircle2 size={14} color="var(--accent-green)" />}
        </h3>
        {/* Toggle */}
        <div style={{
          display: 'flex', borderRadius: 8, overflow: 'hidden',
          border: '1px solid var(--border-primary)', flexShrink: 0,
        }}>
          {['time','tasks'].map(m => (
            <button key={m} type="button" onClick={() => setMode(m)} style={{
              padding: '4px 10px', fontSize: 11, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: mode === m ? 'var(--accent-blue)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--text-muted)',
              transition: 'background 0.15s',
            }}>
              {m === 'time' ? '⏱ Time' : '✓ Tasks'}
            </button>
          ))}
        </div>
      </div>

      {/* Donut + legend with inline bars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>

        {/* Donut */}
        <div style={{ width: 96, height: 96, flexShrink: 0 }}>
          <svg width="96" height="96" viewBox="0 0 100 100">
            {segments.map(seg => (
              <path
                key={seg.name}
                d={describeArc(50, 50, 45, seg.startAngle, seg.endAngle - 0.5)}
                fill={getTopicColor(seg.name)}
                style={{ transition: 'all 0.3s ease' }}
              />
            ))}
            <circle cx="50" cy="50" r="26" fill="var(--bg-card)" />
            <text x="50" y="47" textAnchor="middle" dominantBaseline="middle"
              fill="var(--text-primary)" fontSize="11" fontWeight="700">
              {centerLabel}
            </text>
            <text x="50" y="59" textAnchor="middle" dominantBaseline="middle"
              fill="var(--text-muted)" fontSize="8">
              {centerSub}
            </text>
          </svg>
        </div>

        {/* Legend with proportion bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {topics.slice(0, 5).map(topic => {
            const pct = segments.find(s => s.name === topic.name)?.pct ?? 0
            return (
              <div key={topic.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: getTopicColor(topic.name), flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                    {topic.name}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: getTopicColor(topic.name), flexShrink: 0 }}>
                    {pct}%
                  </span>
                </div>
                {/* Inline proportion bar */}
                <div style={{ height: 3, borderRadius: 99, background: 'var(--border-primary)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: getTopicColor(topic.name), borderRadius: 99, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            )
          })}
          {topics.length > 5 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{topics.length - 5} more</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-primary)', marginBottom: 16 }} />

      {/* Topic rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {topics.map(topic => (
          <div key={topic.name} style={{ borderLeft: `3px solid ${getTopicColor(topic.name)}`, paddingLeft: 10 }}>
            {/* Row 1: name + meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, flexWrap: 'wrap', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{topic.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {topic.taskCount} task{topic.taskCount !== 1 ? 's' : ''} · {fmtDuration(topic.totalTime)} · avg task {fmtDuration(topic.avgDuration)}
              </span>
            </div>
            {/* Row 2: completion bar + % + count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'var(--border-primary)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${topic.completionRate}%`, borderRadius: 99,
                  background: topic.completionRate === 100
                    ? 'var(--accent-green)'
                    : getTopicColor(topic.name),
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, flexShrink: 0,
                color: topic.completionRate >= 70 ? 'var(--accent-green)' : topic.completionRate >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)'
              }}>
                {topic.completionRate}% done
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {topic.completedCount}/{topic.taskCount}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ background: 'rgba(59,130,246,0.07)', borderRadius: 10, padding: 14, borderLeft: '3px solid var(--accent-blue)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Lightbulb size={14} color="var(--accent-blue)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-blue)' }}>Suggestions</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {suggestions.map((s, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3, lineHeight: 1.6 }}>
                {rewriteSuggestion(s)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isBalanced && suggestions.length === 0 && (
        <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
          <CheckCircle2 size={18} color="var(--accent-green)" style={{ marginBottom: 6 }} />
          <p style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 500 }}>
            Well balanced — your time is spread nicely across topics.
          </p>
        </div>
      )}
    </div>
  )
}
