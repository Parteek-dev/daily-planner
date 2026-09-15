import { useMemo, useState } from 'react'
import { Flame, Trophy, Clock, CheckCircle2, TrendingUp, AlertCircle, X } from 'lucide-react'
import ProgressRing from '../components/ProgressRing'
import Heatmap from '../components/Heatmap'
import ProductivityScore from '../components/ProductivityScore'
import GoalSetting from '../components/GoalSetting'
import WeeklyReport from '../components/WeeklyReport'
import LineChart from '../components/LineChart'
import TimeTrackingStats from '../components/TimeTrackingStats'
import BestHoursChart from '../components/BestHoursChart'
import TopicBalance from '../components/TopicBalance'

export default function Dashboard({ progress }) {
  const {
    todayCompleted,
    todayTotal,
    todayPercent,
    totalMinutesCompleted,
    topicStats,
    streakData,
    heatmapData,
    recentCompletedTasks,
    getTopicColor,
    productivityScore,
    goals,
    setDailyGoal,
    dailyGoalProgress,
    extraGoalsProgress,
    addExtraGoal,
    removeExtraGoal,
    thisWeekReport,
    lastWeekReport,
    getWeeklyReport,
    chartData30Days,
    timeTrackingStats,
    bestHoursAnalysis,
    topicBalanceAnalysis,
  } = progress

  const hours = Math.floor(totalMinutesCompleted / 60)
  const mins = totalMinutesCompleted % 60

  const allDoneToday = todayTotal > 0 && todayCompleted === todayTotal

  // ── Celebration banner ──────────────────────────────────────────────────
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const showBanner = allDoneToday && !bannerDismissed
  const dismissBanner = () => setBannerDismissed(true)

  // Top topics by completion
  const topTopics = useMemo(() => {
    return Object.entries(topicStats)
      .map(([name, stats]) => ({ name, ...stats, percent: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0 }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5)
  }, [topicStats])

  // Today's focus time (completed tasks only)
  const todayFocusHours = Math.floor(
    progress.todayTasks?.filter(t => t.completed).reduce((s, t) => s + (t.actualDuration ?? t.duration ?? 0), 0) / 60
  )
  const todayFocusMins = progress.todayTasks?.filter(t => t.completed).reduce((s, t) => s + (t.actualDuration ?? t.duration ?? 0), 0) % 60

  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  return (
    <div className="animate-fadeIn">

      {/* ── Celebration banner ── */}
      {showBanner && (
        <div style={{
          marginBottom: 24,
          padding: '18px 20px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(59,130,246,0.12) 100%)',
          border: '1px solid rgba(34,197,94,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative shimmer strip */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          <span style={{ fontSize: 32, lineHeight: 1 }}>🎉</span>

          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {dayName} complete!
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                <CheckCircle2 size={14} />
                {todayCompleted} of {todayTotal} tasks
              </span>
              {(todayFocusHours > 0 || todayFocusMins > 0) && (
                <span style={{ fontSize: 13, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                  <Clock size={14} />
                  {todayFocusHours > 0 && `${todayFocusHours}h `}{todayFocusMins}m focused
                </span>
              )}
              {streakData.current > 0 && (
                <span style={{ fontSize: 13, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                  <Flame size={14} />
                  {streakData.current}-day streak 🔥
                </span>
              )}
              {dailyGoalProgress?.achieved && (
                <span style={{ fontSize: 13, color: '#eab308', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                  <Trophy size={14} />
                  Daily goal smashed!
                </span>
              )}
            </div>
          </div>

          <button
            onClick={dismissBanner}
            title="Dismiss"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 6, borderRadius: 8,
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Your productivity overview</p>
      </div>

      {/* Top stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Progress Ring */}
        <div className="card-static" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <ProgressRing percent={todayPercent} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
            {todayCompleted} / {todayTotal} today
          </p>
        </div>

        {/* Streak */}
        <div className="card-static">
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
            Study Streak
          </h3>
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
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: 8, border: '1px solid rgba(249, 115, 22, 0.3)' }}>
              <AlertCircle size={14} color="#f97316" />
              <p style={{ fontSize: 12, color: '#fb923c' }}>Complete a task to keep your streak!</p>
            </div>
          )}
          {streakData.studiedToday && streakData.current > 0 && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <Flame size={14} color="#22c55e" />
              <p style={{ fontSize: 12, color: '#4ade80' }}>Streak protected for today!</p>
            </div>
          )}
        </div>

        {/* Time invested */}
        <div className="card-static">
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
            Time Invested
          </h3>
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
      <div className="card-static" style={{ marginBottom: 24 }}>
        <Heatmap heatmapData={heatmapData} />
      </div>

      {/* Goal & Productivity Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
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

      {/* Weekly Report */}
      <div style={{ marginBottom: 24 }}>
        <WeeklyReport 
          thisWeek={thisWeekReport}
          lastWeek={lastWeekReport}
          getWeeklyReport={getWeeklyReport}
          getTopicColor={getTopicColor}
        />
      </div>

      {/* Analytics Section */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
          Analytics & Insights
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <TimeTrackingStats stats={timeTrackingStats} getTopicColor={getTopicColor} />
          <BestHoursChart analysis={bestHoursAnalysis} />
          <TopicBalance analysis={topicBalanceAnalysis} getTopicColor={getTopicColor} />
        </div>
      </div>

      {/* Tasks Over Time Chart */}
      <div className="card-static" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
          Tasks Completed (Last 30 Days)
        </h3>
        <LineChart data={chartData30Days} height={180} />
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Topic breakdown */}
        <div className="card-static">
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
            Topics
          </h3>
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
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${topic.percent}%`, background: getTopicColor(topic.name) }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card-static">
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
            Recent Completions
          </h3>
          {recentCompletedTasks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No completed tasks yet. Get started!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentCompletedTasks.slice(0, 5).map(task => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={16} color="var(--accent-green)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.title}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {task.completedAt && new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}