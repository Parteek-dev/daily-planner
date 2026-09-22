import { useMemo, useState } from 'react'
import { Flame, Trophy, Clock, CheckCircle2, TrendingUp, AlertCircle, X, PartyPopper, LayoutDashboard, BarChart2, Activity } from 'lucide-react'
import { fmtDuration } from '../lib/utils'
import Heatmap from '../components/Heatmap'
import ProductivityScore from '../components/ProductivityScore'
import GoalSetting from '../components/GoalSetting'
import WeeklyReport from '../components/WeeklyReport'
import LineChart from '../components/LineChart'
import TimeTrackingStats from '../components/TimeTrackingStats'
import BestHoursChart from '../components/BestHoursChart'
import TopicBalance from '../components/TopicBalance'

// ── Tab definitions ────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'Overview',   shortLabel: 'Overview',  icon: LayoutDashboard },
  { id: 'statistics', label: 'Statistics', shortLabel: 'Stats',     icon: BarChart2       },
  { id: 'activity',   label: 'Activity',   shortLabel: 'Activity',  icon: Activity        },
]

export default function Dashboard({ progress }) {
  const {
    todayCompleted, todayTotal, todayPercent,
    totalMinutesCompleted, topicStats, streakData,
    heatmapData, recentCompletedTasks, getTopicColor,
    productivityScore, goals, setDailyGoal, dailyGoalProgress,
    extraGoalsProgress, addExtraGoal, removeExtraGoal,
    thisWeekReport, lastWeekReport, getWeeklyReport,
    chartData30Days, timeTrackingStats, bestHoursAnalysis, topicBalanceAnalysis,
  } = progress

  const hours = Math.floor(totalMinutesCompleted / 60)
  const mins  = totalMinutesCompleted % 60

  const [activeTab,      setActiveTab]      = useState('overview')
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const showBanner = dailyGoalProgress.achieved && !bannerDismissed
  const dayName    = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  const todayFocusMins  = progress.todayTasks?.filter(t => t.completed).reduce((s, t) => s + (t.actualDuration ?? t.duration ?? 0), 0) ?? 0
  const todayFocusHours = Math.floor(todayFocusMins / 60)
  const todayFocusRem   = todayFocusMins % 60

  const topTopics = useMemo(() => (
    Object.entries(topicStats)
      .map(([name, stats]) => ({ name, ...stats, percent: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0 }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5)
  ), [topicStats])

  return (
    <div className="animate-fadeIn">

      {/* ── Celebration banner ── */}
      {showBanner && (
        <div style={{
          marginBottom: 20, padding: '16px 18px', borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(59,130,246,0.12) 100%)',
          border: '1px solid rgba(34,197,94,0.35)',
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)', pointerEvents: 'none' }} />
          <PartyPopper size={26} color="var(--accent-green)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{dayName} complete!</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              <span style={{ fontSize: 13, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                <CheckCircle2 size={13} /> {todayCompleted} of {todayTotal} tasks
              </span>
              {(todayFocusHours > 0 || todayFocusRem > 0) && (
                <span style={{ fontSize: 13, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                  <Clock size={13} /> {todayFocusHours > 0 && `${todayFocusHours}h `}{todayFocusRem}m focused
                </span>
              )}
              {streakData.current > 0 && (
                <span style={{ fontSize: 13, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                  <Flame size={13} /> {streakData.current}-day streak
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setBannerDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, flexShrink: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Page header ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Your productivity overview</p>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', gap: 4,
        background: 'var(--bg-input)',
        borderRadius: 12, padding: 4,
        marginBottom: 24,
        width: 'fit-content',
        maxWidth: '100%',
      }}>
        {TABS.map(({ id, label, shortLabel, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 600 : 500,
                background: active ? 'var(--bg-secondary)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: active ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} color={active ? 'var(--accent-blue)' : 'var(--text-muted)'} />
              {label}
            </button>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB: OVERVIEW
          Stats cards · Heatmap · Goals · Productivity Score
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="animate-fadeIn">

          {/* Top stats row */}
          {/* ── Unified stat bar ── */}
          <div className="card-static tour-dashboard-stats" style={{ marginBottom: 24, padding: '20px 24px' }}>

            {/* Top row: 4 stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginBottom: 20 }}>

              {/* Today's progress */}
              <div style={{ paddingRight: 20, borderRight: '1px solid var(--border-primary)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Today</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: dailyGoalProgress.percent === 100 ? 'var(--accent-green)' : 'var(--accent-blue)', lineHeight: 1 }}>
                  {dailyGoalProgress.percent}%
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {todayCompleted} of {dailyGoalProgress.target} tasks
                </p>
              </div>

              {/* Streak */}
              <div style={{ paddingLeft: 20, paddingRight: 20, borderRight: '1px solid var(--border-primary)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Streak</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <Flame size={18} color={streakData.current > 0 ? '#f97316' : 'var(--text-muted)'} />
                  <p style={{ fontSize: 28, fontWeight: 700, color: streakData.current > 0 ? '#f97316' : 'var(--text-primary)', lineHeight: 1 }}>
                    {streakData.current}
                  </p>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Best: {streakData.best} days</p>
              </div>

              {/* Time invested */}
              <div style={{ paddingLeft: 20, paddingRight: 20, borderRight: '1px solid var(--border-primary)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Time Invested</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{hours}</p>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>h</span>
                  {mins > 0 && <>
                    <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{mins}</p>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>m</span>
                  </>}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>All time</p>
              </div>

              {/* Tasks completed */}
              <div style={{ paddingLeft: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Completed</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {progress.completedTasks ?? progress.tasks?.filter(t => t.completed).length ?? 0}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Tasks total</p>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Today's goal progress</span>
                {!streakData.studiedToday && todayCompleted === 0 && (
                  <span style={{ fontSize: 11, color: '#f97316', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={11} /> Complete a task to keep your streak
                  </span>
                )}
                {streakData.studiedToday && streakData.current > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Flame size={11} /> Streak protected today
                  </span>
                )}
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'var(--border-primary)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${dailyGoalProgress.percent}%`,
                  borderRadius: 99,
                  background: dailyGoalProgress.percent === 100 ? 'var(--accent-green)' : 'linear-gradient(90deg, var(--accent-blue), #818cf8)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div className="card-static tour-dashboard-heatmap" style={{ marginBottom: 24, overflowX: 'auto', overflowY: 'hidden' }}>
            <Heatmap heatmapData={heatmapData} />
          </div>

          {/* Goals + Productivity Score */}
          <div className="tour-dashboard-goals dash-goals-grid" style={{ gap: 16 }}>
            <GoalSetting
              dailyGoal={goals.dailyTaskTarget}
              onSetGoal={setDailyGoal}
              progress={dailyGoalProgress}
              extraGoalsProgress={extraGoalsProgress}
              onAddExtraGoal={addExtraGoal}
              onRemoveExtraGoal={removeExtraGoal}
              topics={progress.topics}
            />
            <ProductivityScore
              score={productivityScore.score}
              breakdown={productivityScore.breakdown}
              level={productivityScore.level}
              levelColor={productivityScore.levelColor}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: STATISTICS
          Weekly Report · 30-day chart · Analytics (Time / Hours / Balance)
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'statistics' && (
        <div className="animate-fadeIn">

          {/* Weekly Report */}
          <div style={{ marginBottom: 24 }}>
            <WeeklyReport
              thisWeek={thisWeekReport}
              lastWeek={lastWeekReport}
              getWeeklyReport={getWeeklyReport}
              getTopicColor={getTopicColor}
            />
          </div>

          {/* Tasks Over Time Chart */}
          <div className="card-static tour-dashboard-chart" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
              Tasks Completed (Last 30 Days)
            </h3>
            <LineChart data={chartData30Days} height={220} />
          </div>

          {/* Analytics */}
          <div className="tour-dashboard-analytics">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
              Analytics & Insights
            </h2>
            <div className="dash-analytics-grid" style={{ gap: 16 }}>
              <TimeTrackingStats stats={timeTrackingStats} getTopicColor={getTopicColor} />
              <BestHoursChart analysis={bestHoursAnalysis} />
              <TopicBalance analysis={topicBalanceAnalysis} getTopicColor={getTopicColor} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: ACTIVITY
          Weekly strip · Topic cards · Timeline feed
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'activity' && (
        <div className="animate-fadeIn">

          {/* ── This week at a glance ── */}
          {(() => {
            const today = new Date()
            const todayStr = today.toISOString().split('T')[0]
            // Build Mon–Sun of current week
            const dow = today.getDay() // 0=Sun
            const monday = new Date(today)
            monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(monday)
              d.setDate(monday.getDate() + i)
              const ds = d.toISOString().split('T')[0]
              const count = (progress.tasks || []).filter(t => t.completed && t.date === ds).length
              const isToday = ds === todayStr
              const isFuture = ds > todayStr
              return { ds, label: d.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: d.getDate(), count, isToday, isFuture }
            })
            const weekTotal = days.reduce((s, d) => s + d.count, 0)
            const weekDone = days.filter(d => d.count > 0).length
            return (
              <div className="card-static" style={{ marginBottom: 16, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Week</h3>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>{weekTotal}</strong> tasks · <strong style={{ color: 'var(--text-secondary)' }}>{weekDone}</strong> active days
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                  {days.map(d => (
                    <div key={d.ds} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{d.label}</span>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 600,
                        background: d.isFuture
                          ? 'transparent'
                          : d.count === 0
                            ? 'var(--bg-input)'
                            : d.count >= 5
                              ? 'var(--accent-blue)'
                              : d.count >= 3
                                ? 'rgba(99,102,241,0.5)'
                                : 'rgba(99,102,241,0.25)',
                        color: d.count > 0 && !d.isFuture ? (d.count >= 5 ? '#fff' : 'var(--accent-blue)') : 'var(--text-muted)',
                        border: d.isToday ? '2px solid var(--accent-blue)' : '1px solid transparent',
                        opacity: d.isFuture ? 0.3 : 1,
                      }}>
                        {d.isFuture ? d.dayNum : d.count > 0 ? d.count : d.dayNum}
                      </div>
                      {d.count > 0 && (
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                          {d.count} task{d.count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ── Bottom grid: topic cards + timeline ── */}
          <div className="tour-dashboard-bottom dash-bottom-grid" style={{ gap: 16 }}>

            {/* 14-day streak calendar */}
            <div className="card-static">
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Last 14 Days</h3>
              {(() => {
                const today = new Date()
                const todayStr = today.toISOString().split('T')[0]
                const days = Array.from({ length: 14 }, (_, i) => {
                  const d = new Date(today)
                  d.setDate(today.getDate() - (13 - i))
                  const ds = d.toISOString().split('T')[0]
                  const count = (progress.tasks || []).filter(t => t.completed && t.date === ds).length
                  const totalForDay = (progress.tasks || []).filter(t => t.date === ds).length
                  const pct = totalForDay > 0 ? Math.round((count / totalForDay) * 100) : 0
                  return { ds, label: d.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: d.getDate(), month: d.toLocaleDateString('en-US', { month: 'short' }), count, totalForDay, pct, isToday: ds === todayStr }
                })
                const activeDays = days.filter(d => d.count > 0).length
                const totalDone = days.reduce((s, d) => s + d.count, 0)
                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 16 }}>
                      {days.map(d => (
                        <div key={d.ds} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{d.label}</span>
                          <div
                            title={`${d.month} ${d.dayNum}: ${d.count} completed${d.totalForDay > 0 ? `, ${d.pct}%` : ''}`}
                            style={{
                              width: '100%', aspectRatio: '1', borderRadius: 8,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 600,
                              background: d.count === 0
                                ? 'var(--bg-input)'
                                : d.pct === 100
                                  ? 'var(--accent-blue)'
                                  : d.pct >= 60
                                    ? 'rgba(99,102,241,0.6)'
                                    : 'rgba(99,102,241,0.25)',
                              color: d.count > 0
                                ? (d.pct >= 60 ? '#fff' : 'var(--accent-blue)')
                                : 'var(--text-muted)',
                              color: d.count > 0
                                ? (d.pct === 100 ? '#fff' : 'var(--accent-blue)')
                                : 'var(--text-muted)',
                              border: d.isToday ? '2px solid var(--accent-blue)' : '1px solid transparent',
                            }}
                          >
                            {d.count > 0 ? d.count : d.dayNum}
                          </div>
                          {/* Month label on 1st of month */}
                          {d.dayNum === 1 && (
                            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{d.month}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Second row for days 8-14 label spacing already handled by grid */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border-primary)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{activeDays}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Active days</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{totalDone}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Tasks done</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 20, fontWeight: 700, color: activeDays >= 10 ? 'var(--accent-blue)' : activeDays >= 5 ? 'var(--accent-blue)' : 'var(--text-primary)', lineHeight: 1 }}>
                          {activeDays === 0 ? '—' : `${Math.round((activeDays / 14) * 100)}%`}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                          {activeDays >= 10 ? 'Very consistent' : activeDays >= 5 ? 'Building habit' : activeDays > 0 ? 'Getting started' : 'No activity'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Timeline feed */}
            <div className="card-static">
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Recent Activity</h3>
              {recentCompletedTasks.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No completed tasks yet.</p>
              ) : (() => {
                // Group by date
                const todayStr = new Date().toISOString().split('T')[0]
                const yestStr  = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0] })()
                const groups   = {}
                recentCompletedTasks.slice(0, 15).forEach(t => {
                  const key = t.date || (t.completedAt ? t.completedAt.split('T')[0] : 'Unknown')
                  if (!groups[key]) groups[key] = []
                  groups[key].push(t)
                })
                const label = (ds) => {
                  if (ds === todayStr) return 'Today'
                  if (ds === yestStr)  return 'Yesterday'
                  return new Date(ds + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {Object.entries(groups).sort(([a],[b]) => b.localeCompare(a)).map(([ds, dayTasks]) => (
                      <div key={ds}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: ds === todayStr ? 'var(--accent-blue)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {label(ds)}
                          </span>
                          <div style={{ flex: 1, height: 1, background: 'var(--border-primary)' }} />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {dayTasks.map(task => (
                            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <CheckCircle2 size={14} color="var(--accent-green)" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {task.title}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                {task.topic && (
                                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: `${getTopicColor(task.topic)}20`, color: getTopicColor(task.topic), fontWeight: 600 }}>
                                    {task.topic}
                                  </span>
                                )}
                                {task.duration && (
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDuration(task.duration)}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
