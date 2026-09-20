import { useMemo, useState } from 'react'
import { Flame, Trophy, Clock, CheckCircle2, TrendingUp, AlertCircle, X, PartyPopper, LayoutDashboard, BarChart2, Activity } from 'lucide-react'
import ProgressRing from '../components/ProgressRing'
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
          <div className="tour-dashboard-stats dash-stats-grid" style={{ gap: 16, marginBottom: 24 }}>
            {/* Progress Ring */}
            <div className="card-static" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <ProgressRing percent={dailyGoalProgress.percent} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
                {todayCompleted} / {dailyGoalProgress.target} today
              </p>
            </div>

            {/* Streak */}
            <div className="card-static">
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Daily Streak</h3>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, textAlign: 'center', padding: 12, background: 'var(--bg-input)', borderRadius: 12 }}>
                  <Flame size={24} color={streakData.current > 0 ? '#f97316' : 'var(--text-muted)'} style={{ marginBottom: 4 }} />
                  <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{streakData.current}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Current</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: 12, background: 'var(--bg-input)', borderRadius: 12 }}>
                  <Trophy size={24} color="#eab308" style={{ marginBottom: 4 }} />
                  <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{streakData.best}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Best</p>
                </div>
              </div>
              {!streakData.studiedToday && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(249,115,22,0.1)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.3)' }}>
                  <AlertCircle size={14} color="#f97316" />
                  <p style={{ fontSize: 12, color: '#fb923c' }}>Complete a task to keep your streak!</p>
                </div>
              )}
              {streakData.studiedToday && streakData.current > 0 && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(34,197,94,0.1)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.3)' }}>
                  <Flame size={14} color="#22c55e" />
                  <p style={{ fontSize: 12, color: '#4ade80' }}>Streak protected for today!</p>
                </div>
              )}
            </div>

            {/* Time invested */}
            <div className="card-static">
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Time Invested</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <Clock size={20} color="var(--accent-blue)" />
                <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{hours}</span>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>hrs</span>
                <span style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>{mins}</span>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>min</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total time from completed tasks</p>
            </div>
          </div>

          {/* Heatmap */}
          <div className="card-static tour-dashboard-heatmap" style={{ marginBottom: 24, overflowX: 'auto' }}>
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
          Topics breakdown · Recent completions
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'activity' && (
        <div className="animate-fadeIn">
          <div className="tour-dashboard-bottom dash-bottom-grid" style={{ gap: 16 }}>

            {/* Topic breakdown */}
            <div className="card-static">
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Topics</h3>
              {topTopics.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No tasks yet. Add some to see topic breakdown.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {topTopics.map(topic => (
                    <div key={topic.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: getTopicColor(topic.name) }}>{topic.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{topic.completed}/{topic.total}</span>
                      </div>
                      <div className="progress-bar" style={{ height: 6 }}>
                        <div className="progress-bar-fill" style={{ width: `${topic.percent}%`, background: getTopicColor(topic.name) }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent completions */}
            <div className="card-static">
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Recent Completions</h3>
              {recentCompletedTasks.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No completed tasks yet. Get started!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recentCompletedTasks.slice(0, 10).map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle2 size={16} color="var(--accent-green)" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.title}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {task.completedAt && new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {task.topic && <span style={{ marginLeft: 6, color: getTopicColor(task.topic) }}>· {task.topic}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
