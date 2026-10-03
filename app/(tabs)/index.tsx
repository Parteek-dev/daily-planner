/**
 * Dashboard tab screen — three-tab layout matching the legacy web app.
 *
 * Tabs:
 *   Overview   — 4-stat bar, progress bar, heatmap, goals, productivity score
 *   Statistics — Weekly report, 30-day chart, time tracking, best hours, topic balance
 *   Activity   — This week mini-grid, last 14 days grid, recent activity feed
 *
 * Works on iOS, Android, and web (responsive at 768px breakpoint).
 * Requirements: 9.1–9.11
 */

import React, { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  Platform,
} from 'react-native'
import {
  Flame,
  Search,
  LayoutDashboard,
  BarChart2,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  PieChart,
} from 'lucide-react-native'

import { useAuth } from '@/src/hooks/useAuth'
import { useProgress } from '@/src/hooks/useProgress'
import { useTheme } from '@/src/hooks/useTheme'
import { useMobileHeader } from '@/src/context/MobileHeaderContext'
import SegmentedToggle from '@/src/components/SegmentedToggle'
import { useRouter } from 'expo-router'
import ProductivityScore from '@/src/components/planner/ProductivityScore'
import Heatmap from '@/src/components/calendar/Heatmap'
import WeeklyReport from '@/src/components/planner/WeeklyReport'
import TopicBalance from '@/src/components/planner/TopicBalance'
import BestHoursChart from '@/src/components/planner/BestHoursChart'
import GoalSetting from '@/src/components/planner/GoalSetting'
import LineChart from '@/src/components/planner/LineChart'
import { fmtDuration } from '@/src/lib/utils'
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg'

const SIDEBAR_BREAKPOINT = 768

type TabId = 'overview' | 'statistics' | 'activity'

const TABS: { id: TabId; label: string; Icon: any }[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'statistics', label: 'Statistics', Icon: BarChart2 },
  { id: 'activity', label: 'Activity', Icon: Activity },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ── Overview tab ───────────────────────────────────────────────────────────────

function OverviewTab({
  tokens, dailyGoalProgress, todayCompleted, totalMinutesCompleted,
  completedTasks, streakData, heatmapRecord, goals, setDailyGoal,
  extraGoalsProgress, addExtraGoal, removeExtraGoal, topics,
  productivityScore, isMobile,
}: any) {
  const hours = Math.floor(totalMinutesCompleted / 60)
  const mins = totalMinutesCompleted % 60

  return (
    <>
      {/* ── Stats Section ── */}
      {isMobile ? (
        /* Mobile: 2x2 grid of separate cards */
        <View style={s.statsGrid}>
          {/* Today Card */}
          <View style={[s.statCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
            <Text style={[s.statCardLabel, { color: tokens.textMuted }]}>TODAY</Text>
            <Text style={[s.statCardValue, { color: dailyGoalProgress.percent === 100 ? tokens.accentGreen : tokens.accentBlue }]}>
              {dailyGoalProgress.percent}%
            </Text>
            <Text style={[s.statCardSub, { color: tokens.textMuted }]}>
              {todayCompleted} of {dailyGoalProgress.target} tasks
            </Text>
          </View>

          {/* Streak Card */}
          <View style={[s.statCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
            <Text style={[s.statCardLabel, { color: tokens.textMuted }]}>STREAK</Text>
            <View style={s.streakRow}>
              <Flame size={18} color={streakData.current > 0 ? '#f97316' : tokens.textMuted} />
              <Text style={[s.statCardValue, { color: streakData.current > 0 ? '#f97316' : tokens.textPrimary }]}>
                {streakData.current}
              </Text>
            </View>
            <Text style={[s.statCardSub, { color: tokens.textMuted }]}>Best: {streakData.best} days</Text>
          </View>

          {/* Time Invested Card */}
          <View style={[s.statCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
            <Text style={[s.statCardLabel, { color: tokens.textMuted }]}>TIME INVESTED</Text>
            <View style={s.timeRow}>
              <Text style={[s.statCardValue, { color: tokens.textPrimary }]}>{hours}</Text>
              <Text style={[s.statCardUnit, { color: tokens.textMuted }]}>h</Text>
              {mins > 0 && <>
                <Text style={[s.statCardValue, { color: tokens.textPrimary, marginLeft: 2 }]}>{mins}</Text>
                <Text style={[s.statCardUnit, { color: tokens.textMuted }]}>m</Text>
              </>}
            </View>
            <Text style={[s.statCardSub, { color: tokens.textMuted }]}>All time</Text>
          </View>

          {/* Completed Card */}
          <View style={[s.statCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
            <Text style={[s.statCardLabel, { color: tokens.textMuted }]}>COMPLETED</Text>
            <Text style={[s.statCardValue, { color: tokens.textPrimary }]}>{completedTasks}</Text>
            <Text style={[s.statCardSub, { color: tokens.textMuted }]}>Tasks total</Text>
          </View>
        </View>
      ) : (
        /* Desktop: Original unified stat bar */
        <View style={[s.statBar, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
          <View style={s.statRow}>
            {/* Today */}
            <View style={[s.statCell, s.statCellBorder, { borderColor: tokens.borderPrimary }]}>
              <Text style={[s.statLabel, { color: tokens.textMuted }]}>TODAY</Text>
              <Text style={[s.statValue, { color: dailyGoalProgress.percent === 100 ? tokens.accentGreen : tokens.accentBlue }]}>
                {dailyGoalProgress.percent}%
              </Text>
              <Text style={[s.statSub, { color: tokens.textMuted }]}>
                {todayCompleted} of {dailyGoalProgress.target} tasks
              </Text>
            </View>
            {/* Streak */}
            <View style={[s.statCell, s.statCellBorder, { borderColor: tokens.borderPrimary }]}>
              <Text style={[s.statLabel, { color: tokens.textMuted }]}>STREAK</Text>
              <View style={s.streakRow}>
                <Flame size={16} color={streakData.current > 0 ? '#f97316' : tokens.textMuted} />
                <Text style={[s.statValue, { color: streakData.current > 0 ? '#f97316' : tokens.textPrimary }]}>
                  {streakData.current}
                </Text>
              </View>
              <Text style={[s.statSub, { color: tokens.textMuted }]}>Best: {streakData.best} days</Text>
            </View>
            {/* Time invested */}
            <View style={[s.statCell, s.statCellBorder, { borderColor: tokens.borderPrimary }]}>
              <Text style={[s.statLabel, { color: tokens.textMuted }]}>TIME INVESTED</Text>
              <View style={s.timeRow}>
                <Text style={[s.statValue, { color: tokens.textPrimary }]}>{hours}</Text>
                <Text style={[s.timeUnit, { color: tokens.textMuted }]}>h</Text>
                {mins > 0 && <>
                  <Text style={[s.statValue, { color: tokens.textPrimary }]}>{mins}</Text>
                  <Text style={[s.timeUnit, { color: tokens.textMuted }]}>m</Text>
                </>}
              </View>
              <Text style={[s.statSub, { color: tokens.textMuted }]}>All time</Text>
            </View>
            {/* Completed */}
            <View style={s.statCell}>
              <Text style={[s.statLabel, { color: tokens.textMuted }]}>COMPLETED</Text>
              <Text style={[s.statValue, { color: tokens.textPrimary }]}>{completedTasks}</Text>
              <Text style={[s.statSub, { color: tokens.textMuted }]}>Tasks total</Text>
            </View>
          </View>
        </View>
      )}

      {/* Progress bar - shown for both mobile and desktop */}
      <View style={[s.progressCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        <View style={s.progressLabelRow}>
          <Text style={[s.progressLabel, { color: tokens.textMuted }]}>Today's goal progress</Text>
          {!streakData.studiedToday && todayCompleted === 0 ? (
            <View style={s.progressHint}>
              <AlertCircle size={11} color="#f97316" />
              <Text style={[s.progressHintText, { color: '#f97316' }]}>Complete a task to keep your streak</Text>
            </View>
          ) : streakData.studiedToday && streakData.current > 0 ? (
            <View style={s.progressHint}>
              <Flame size={11} color={tokens.accentGreen} />
              <Text style={[s.progressHintText, { color: tokens.accentGreen }]}>Streak protected today</Text>
            </View>
          ) : null}
        </View>
        <View style={[s.progressTrack, { backgroundColor: tokens.borderPrimary }]}>
          <View style={[
            s.progressFill,
            {
              width: `${dailyGoalProgress.percent}%` as any,
              backgroundColor: dailyGoalProgress.percent === 100 ? tokens.accentGreen : tokens.accentBlue,
            },
          ]} />
        </View>
      </View>

      {/* Heatmap */}
      <View style={s.cardWrapper}>
        <Heatmap data={heatmapRecord} />
      </View>

      {/* Goals + Productivity Score */}
      <View style={s.cardWrapper}>
        <GoalSetting
          dailyGoal={goals.dailyTaskTarget}
          onSetGoal={setDailyGoal}
          progress={dailyGoalProgress}
          extraGoalsProgress={extraGoalsProgress}
          onAddExtraGoal={addExtraGoal}
          onRemoveExtraGoal={removeExtraGoal}
          topics={topics}
        />
      </View>
      <View style={s.cardWrapper}>
        <ProductivityScore
          score={productivityScore.score}
          breakdown={productivityScore.breakdown}
          level={productivityScore.level}
          levelColor={productivityScore.levelColor}
        />
      </View>
    </>
  )
}

// ── Best Hours card (matches legacy BestHoursChart layout) ───────────────────

function BestHoursChartRN({ tokens, data, analysis, flex }: any) {
  const { peakHours, mostProductivePeriod, byPeriod } = analysis ?? {}
  const hasData = (data as any[]).some((d: any) => d.count > 0)

  const periodTimeRanges: Record<string, string> = {
    morning: '6 AM – 12 PM',
    afternoon: '12 PM – 6 PM',
    evening: '6 PM – 12 AM',
    night: '12 AM – 6 AM',
  }

  const periodColors: Record<string, string> = {
    morning: '#f97316', afternoon: '#3b82f6', evening: '#a855f7', night: '#64748b',
  }
  const periodLabels: Record<string, string> = {
    morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night',
  }
  const maxBar = Math.max(...(data as any[]).map((d: any) => d.count), 1)

  const periodDisplay = mostProductivePeriod
    ? mostProductivePeriod.charAt(0).toUpperCase() + mostProductivePeriod.slice(1)
    : '—'
  const peakH = peakHours?.[0] as number | undefined
  const peakH12 = peakH !== undefined ? (peakH === 0 ? 12 : peakH > 12 ? peakH - 12 : peakH) : null
  const peakAmPm = peakH !== undefined ? (peakH < 12 ? 'AM' : 'PM') : null

  return (
    <View style={[s.card, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }, flex && { flex: 1 }]}>
      <View style={s.cardHeaderRow}>
        <Clock size={14} color={tokens.accentPurple ?? '#a855f7'} />
        <Text style={[s.sectionTitle, { color: tokens.textSecondary, flex: 1 }]}>Most productive time</Text>
      </View>

      {!hasData ? (
        <View style={[s.emptyState, { backgroundColor: tokens.bgInput }]}>
          <Text style={[s.emptySub, { color: tokens.textMuted, textAlign: 'center' }]}>
            Complete some tasks to see your productivity patterns.
          </Text>
        </View>
      ) : (
        <>
          {/* Most productive period */}
          <View style={[s.bhPeriodBox, { backgroundColor: tokens.bgInput }]}>
            <Text style={[s.bhPeriodValue, { color: tokens.accentPurple ?? '#a855f7' }]}>
              {periodDisplay}
            </Text>
            <Text style={[s.bhPeriodRange, { color: tokens.textMuted }]}>
              {mostProductivePeriod ? periodTimeRanges[mostProductivePeriod] : ''}
            </Text>
            {peakH !== undefined && peakH12 !== null && peakAmPm !== null && (
              <Text style={[s.bhPeakHours, { color: tokens.textMuted }]}>
                Peak activity: {peakH12} {peakAmPm}
              </Text>
            )}
          </View>

          {/* 24-bar chart */}
          <View style={s.bhChartWrap}>
            <Text style={[s.bhChartTitle, { color: tokens.textSecondary }]}>Tasks Completed by Hour</Text>
            <View style={s.bhBars}>
              {(data as any[]).map((d: any, hour: number) => {
                const isPeak = peakHours?.includes(hour)
                const barH = d.count > 0 ? Math.max(8, (d.count / maxBar) * 56) : 3
                return (
                  <View
                    key={hour}
                    style={[
                      s.bhBar,
                      {
                        height: barH,
                        backgroundColor: isPeak
                          ? (tokens.accentPurple ?? '#a855f7')
                          : d.count > 0 ? tokens.accentBlue : tokens.borderPrimary,
                      },
                    ]}
                  />
                )
              })}
            </View>
            <View style={s.bhXLabels}>
              {['12 AM', '6 AM', '12 PM', '6 PM', '11 PM'].map(l => (
                <Text key={l} style={[s.bhXLabel, { color: tokens.textMuted }]}>{l}</Text>
              ))}
            </View>
          </View>

          {/* Period breakdown */}
          <View style={s.bhPeriods}>
            {byPeriod && Object.entries(byPeriod).map(([period, pd]: [string, any]) => {
              const color = periodColors[period] ?? tokens.accentBlue
              return (
                <View key={period} style={[s.bhPeriodCell, { backgroundColor: `${color}18` }]}>
                  <Text style={[s.bhPeriodCount, { color }]}>{pd.count}</Text>
                  <Text style={[s.bhPeriodName, { color: tokens.textMuted }]}>{periodLabels[period]}</Text>
                </View>
              )
            })}
          </View>
        </>
      )}
    </View>
  )
}

// ── Topic Balance card (matches legacy TopicBalance layout) ───────────────────

// SVG donut helpers (same geometry as legacy)
function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  // Full circle — use two half-arcs to avoid degenerate path
  if (endDeg - startDeg >= 359.9) {
    const top = polarToCartesian(cx, cy, r, 0)
    const bot = polarToCartesian(cx, cy, r, 180)
    return `M ${top.x} ${top.y} A ${r} ${r} 0 1 0 ${bot.x} ${bot.y} A ${r} ${r} 0 1 0 ${top.x} ${top.y} Z`
  }
  const s = polarToCartesian(cx, cy, r, endDeg)
  const e = polarToCartesian(cx, cy, r, startDeg)
  const large = endDeg - startDeg <= 180 ? 0 : 1
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} L ${cx} ${cy} Z`
}

function TopicBalanceRN({ tokens, data, analysis, getTopicColor, flex }: any) {
  const [mode, setMode] = useState<'time' | 'tasks'>('time')
  const { topics, totalTime, totalTasks, suggestions, isBalanced } = analysis ?? {}

  if (!totalTasks) {
    return (
      <View style={[s.card, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }, flex && { flex: 1 }]}>
        <View style={s.cardHeaderRow}>
          <Text style={[s.tbCardTitle, { color: tokens.textSecondary }]}>Topic Balance</Text>
        </View>
        <View style={[s.emptyState, { backgroundColor: tokens.bgInput }]}>
          <Text style={[s.emptySub, { color: tokens.textMuted, textAlign: 'center' }]}>
            Add tasks to different topics to see your time distribution.
          </Text>
        </View>
      </View>
    )
  }

  // Build donut segments
  let angle = 0
  const segments = (topics as any[] ?? []).map((topic: any) => {
    const pct = mode === 'time'
      ? (totalTime > 0 ? topic.totalTime / totalTime * 100 : 0)
      : (totalTasks > 0 ? topic.taskCount / totalTasks * 100 : 0)
    const seg = { ...topic, pct: Math.round(pct), startAngle: angle, endAngle: angle + (pct / 100) * 360 }
    angle += (pct / 100) * 360
    return seg
  })

  const centerLabel = mode === 'time' ? fmtDuration(totalTime) : `${totalTasks}`
  const centerSub = mode === 'time' ? 'total time' : `task${totalTasks !== 1 ? 's' : ''}`

  // Rewrite suggestion text to match legacy
  const rewriteSuggestion = (s: string) => {
    const m = s.match(/(\w+) takes (\d+)% of your time/i)
    if (m) return `${m[1]} takes up ${m[2]}% of your time — try exploring other areas too`
    return s
  }

  return (
    <View style={[s.card, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }, flex && { flex: 1 }]}>
      {/* Header + toggle */}
      <View style={[s.cardHeaderRow, { marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <PieChart size={16} color={tokens.accentGreen} />
          <Text style={[s.tbCardTitle, { color: tokens.textPrimary }]}>Topic Balance</Text>
        </View>
        <SegmentedToggle
          options={[
            { value: 'time', label: 'Time', icon: (color) => <Clock size={13} color={color} /> },
            { value: 'tasks', label: 'Tasks', icon: (color) => <CheckCircle2 size={13} color={color} /> },
          ]}
          value={mode}
          onChange={(v) => setMode(v as 'time' | 'tasks')}
        />
      </View>

      {/* Donut + legend side by side */}
      <View style={s.tbDonutRow}>
        {/* SVG Donut */}
        <View style={s.tbDonutWrap}>
          <Svg width={96} height={96} viewBox="0 0 100 100">
            {segments.map((seg: any) => {
              if (seg.endAngle - seg.startAngle < 0.5) return null
              return (
                <Path
                  key={seg.name}
                  d={describeArc(50, 50, 45, seg.startAngle, Math.max(seg.endAngle - 0.3, seg.startAngle + 0.5))}
                  fill={getTopicColor(seg.name)}
                />
              )
            })}
            {/* White inner hole */}
            <Circle cx={50} cy={50} r={26} fill={tokens.bgSecondary} />
            <SvgText x={50} y={46} textAnchor="middle" dominantBaseline="middle"
              fill={tokens.textPrimary} fontSize={10} fontWeight="700">
              {centerLabel}
            </SvgText>
            <SvgText x={50} y={58} textAnchor="middle" dominantBaseline="middle"
              fill={tokens.textMuted} fontSize={7}>
              {centerSub}
            </SvgText>
          </Svg>
        </View>

        {/* Legend with proportion bars */}
        <View style={s.tbLegend}>
          {segments.slice(0, 5).map((seg: any) => {
            const color = getTopicColor(seg.name)
            return (
              <View key={seg.name} style={s.tbLegendRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <View style={[s.tbDot, { backgroundColor: color }]} />
                  <Text style={[s.tbName, { color: tokens.textPrimary }]} numberOfLines={1}>{seg.name}</Text>
                  <Text style={[s.tbPct, { color }]}>{seg.pct}%</Text>
                </View>
                <View style={[s.tbBarTrack, { backgroundColor: tokens.borderPrimary }]}>
                  <View style={[s.tbBarFill, { width: `${seg.pct}%` as any, backgroundColor: color }]} />
                </View>
              </View>
            )
          })}
        </View>
      </View>

      {/* Divider */}
      <View style={[s.divider, { backgroundColor: tokens.borderPrimary }]} />

      {/* Per-topic rows */}
      <View style={s.tbTopics}>
        {(topics as any[] ?? []).map((topic: any) => {
          const color = getTopicColor(topic.name)
          return (
            <View key={topic.name} style={[s.tbTopicRow, { borderLeftColor: color }]}>
              <View style={s.tbTopicHeader}>
                <Text style={[s.tbTopicName, { color: tokens.textPrimary }]}>{topic.name}</Text>
                <Text style={[s.tbTopicMeta, { color: tokens.textMuted }]}>
                  {topic.taskCount} task{topic.taskCount !== 1 ? 's' : ''} · {fmtDuration(topic.totalTime)}
                </Text>
              </View>
            </View>
          )
        })}
      </View>

    </View>
  )
}

// ── Statistics tab ─────────────────────────────────────────────────────────────

function StatisticsTab({
  tokens, thisWeekReport, lastWeekReport, getWeeklyReport, getTopicColor,
  chartData30Days, timeTrackingStats, bestHoursData, topicBalanceData,
  bestHoursAnalysis, topicBalanceAnalysis, isWide,
}: any) {
  return (
    <>
      {/* Weekly Report */}
      <View style={s.cardWrapper}>
        <WeeklyReport
          thisWeek={thisWeekReport}
          lastWeek={lastWeekReport}
          getWeeklyReport={getWeeklyReport}
          getTopicColor={getTopicColor}
        />
      </View>

      {/* 30-day chart */}
      <View style={[s.card, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }, s.cardWrapper]}>
        <Text style={[s.sectionTitle, { color: tokens.textSecondary }]}>Tasks completed</Text>
        {(() => {
          const activePoints = (chartData30Days as any[]).filter((d: any) => d.count > 0).length
          return activePoints < 5 ? (
            <Text style={[s.sparseTrendMsg, { color: tokens.textMuted }]}>
              Complete a few more tasks to see your productivity trend.
            </Text>
          ) : null
        })()}
        <View style={{ marginTop: 8 }}>
          <LineChart data={chartData30Days} />
        </View>
      </View>

      {/* Analytics heading */}
      <Text style={[s.analyticsHeading, { color: tokens.textPrimary }]}>Analytics & Insights</Text>

      {/* 3-column grid — row on wide, stack on mobile */}
      <View style={[s.analyticsGrid, isWide && s.analyticsGridWide]}>
        <View style={[s.analyticsCell, isWide && s.analyticsCellWide]}>
          <TimeTrackingCard tokens={tokens} stats={timeTrackingStats} getTopicColor={getTopicColor} flex={isWide} />
        </View>
        <View style={[s.analyticsCell, isWide && s.analyticsCellWide]}>
          <BestHoursChartRN tokens={tokens} data={bestHoursData} analysis={bestHoursAnalysis} flex={isWide} />
        </View>
        <View style={[s.analyticsCell, isWide && s.analyticsCellWide]}>
          <TopicBalanceRN
            tokens={tokens}
            data={topicBalanceData}
            analysis={topicBalanceAnalysis}
            getTopicColor={getTopicColor}
            flex={isWide}
          />
        </View>
      </View>
    </>
  )
}

// ── Time Tracking card (inline, no separate component needed) ─────────────────

function TimeTrackingCard({ tokens, stats, getTopicColor, flex }: any) {
  const router = useRouter()
  const {
    totalEstimated, totalActual, accuracy, overEstimateCount,
    underEstimateCount, accurateCount, averageVariance, byTopic, totalTracked,
  } = stats

  const accuracyColor = accuracy >= 75 ? tokens.accentGreen : accuracy >= 60 ? tokens.accentOrange : tokens.accentRed
  const verdict = accuracy >= 90 ? 'Excellent estimator'
    : accuracy >= 75 ? 'Good estimator'
      : accuracy >= 60 ? 'Getting there'
        : 'Needs calibration'
  const varianceText = averageVariance === 0 ? 'Your estimates are spot on!'
    : averageVariance > 0 ? `You typically underestimate by ${Math.abs(averageVariance)}m`
      : `You typically finish ${Math.abs(averageVariance)}m early`

  const r = 28 // ring radius
  const circ = 2 * Math.PI * r
  const dashOffset = circ * (1 - (accuracy / 100))

  return (
    <View style={[s.card, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }, flex && { flex: 1 }]}>
      <View style={s.cardHeaderRow}>
        <Clock size={14} color={tokens.accentBlue} />
        <Text style={[s.sectionTitle, { color: tokens.textSecondary }]}>Time Tracking</Text>
        {totalTracked > 0 && (
          <Text style={[s.cardBadge, { color: tokens.textMuted }]}>{totalTracked} tasks tracked</Text>
        )}
      </View>

      {totalTracked === 0 ? (
        <View style={[s.emptyState, { backgroundColor: tokens.bgInput }]}>
          <Clock size={28} color={tokens.textMuted} />
          <Text style={[s.emptyTitle, { color: tokens.textPrimary }]}>No tracking data yet</Text>
          <Text style={[s.emptySub, { color: tokens.textMuted }]}>
            Use Focus Mode to time your tasks. You'll see if your estimates are realistic.
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/today')}
            style={({ pressed }) => [
              s.focusModeBtn,
              { backgroundColor: tokens.accentPrimary, opacity: pressed ? 0.8 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Start Focus Mode"
          >
            <Text style={s.focusModeBtnText}>Start Focus Mode →</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Ring + verdict */}
          <View style={s.ringRow}>
            <View style={s.ringWrap}>
              {/* Simple percentage display since SVG ring needs react-native-svg */}
              <View style={[s.ringFallback, { borderColor: `${accuracyColor}40` }]}>
                <Text style={[s.ringPct, { color: accuracyColor }]}>{accuracy}%</Text>
              </View>
            </View>
            <View style={s.ringInfo}>
              <Text style={[s.verdictText, { color: accuracyColor }]}>{verdict}</Text>
              <Text style={[s.varianceText, { color: tokens.textMuted }]}>{varianceText}</Text>
              <Text style={[s.trackingMeta, { color: tokens.textMuted }]}>
                Estimated: <Text style={{ color: tokens.textPrimary, fontWeight: '600' }}>{fmtDuration(totalEstimated)}</Text>
                {'  '}Actual: <Text style={{ color: tokens.textPrimary, fontWeight: '600' }}>{fmtDuration(totalActual)}</Text>
              </Text>
            </View>
          </View>

          {/* 3-cell breakdown */}
          <View style={s.breakdownRow}>
            <View style={[s.breakdownCell, { backgroundColor: `${tokens.accentGreen}15` }]}>
              <Text style={[s.breakdownNum, { color: tokens.accentGreen }]}>{overEstimateCount}</Text>
              <Text style={[s.breakdownLabel, { color: tokens.textMuted }]}>Finished Early</Text>
            </View>
            <View style={[s.breakdownCell, { backgroundColor: `${tokens.accentBlue}15` }]}>
              <Text style={[s.breakdownNum, { color: tokens.accentBlue }]}>{accurateCount}</Text>
              <Text style={[s.breakdownLabel, { color: tokens.textMuted }]}>On Target</Text>
            </View>
            <View style={[s.breakdownCell, { backgroundColor: `${tokens.accentOrange}15` }]}>
              <Text style={[s.breakdownNum, { color: tokens.accentOrange }]}>{underEstimateCount}</Text>
              <Text style={[s.breakdownLabel, { color: tokens.textMuted }]}>Took Longer</Text>
            </View>
          </View>

          {/* By topic */}
          {Object.keys(byTopic).length > 0 && (
            <View style={s.byTopicSection}>
              <Text style={[s.byTopicLabel, { color: tokens.textSecondary }]}>By Topic</Text>
              {Object.entries(byTopic).map(([topic, data]: [string, any]) => {
                const delta = data.actual - data.estimated
                const deltaAbs = Math.abs(delta)
                const deltaLabel = delta === 0 ? 'spot on'
                  : delta > 0 ? `+${deltaAbs}m over`
                    : `-${deltaAbs}m under`
                const deltaColor = delta === 0 ? tokens.accentGreen
                  : delta > 0 ? tokens.accentOrange
                    : tokens.accentGreen
                return (
                  <View key={topic} style={s.topicRow}>
                    <View style={[s.topicDot, { backgroundColor: getTopicColor(topic) }]} />
                    <Text style={[s.topicName, { color: tokens.textPrimary }]}>{topic}</Text>
                    <Text style={[s.topicEstAct, { color: tokens.textMuted }]}>
                      {fmtDuration(data.estimated)} → {fmtDuration(data.actual)}
                    </Text>
                    <Text style={[s.topicDelta, { color: deltaColor }]}>{deltaLabel}</Text>
                  </View>
                )
              })}
            </View>
          )}
        </>
      )}
    </View>
  )
}

// ── Activity tab ───────────────────────────────────────────────────────────────

function ActivityTab({ tokens, tasks, recentCompletedTasks, getTopicColor, isWide }: any) {
  const today = getToday()
  const yesterday = addDays(today, -1)

  // ── Last 7 Days ───────────────────────────────────────────────────────────
  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const ds = addDays(today, -(6 - i))
      const d = new Date(ds + 'T12:00:00')
      const count = (tasks as any[]).filter((t: any) => t.completed && t.date === ds).length
      const totalForDay = (tasks as any[]).filter((t: any) => t.date === ds).length
      const pct = totalForDay > 0 ? Math.round((count / totalForDay) * 100) : 0
      return {
        ds,
        dow: d.toLocaleDateString('en-US', { weekday: 'short' }), // "Mon"
        dayNum: d.getDate(),
        count, totalForDay, pct,
        isToday: ds === today,
      }
    })
  }, [tasks, today])

  const activeDays = last7.filter(d => d.count > 0).length
  const totalDone = last7.reduce((s, d) => s + d.count, 0)
  const consistencyPct = Math.round((activeDays / 7) * 100)
  const consistencyLabel = activeDays === 7 ? 'Perfect week'
    : activeDays >= 5 ? 'Very consistent'
      : activeDays >= 3 ? 'Building habit'
        : activeDays >= 1 ? 'Keep it up'
          : 'No activity'

  // ── Recent Activity groups ─────────────────────────────────────────────────
  const activityGroups = useMemo(() => {
    const groups: Record<string, any[]> = {}
      ; (recentCompletedTasks as any[]).slice(0, 20).forEach((t: any) => {
        const key = t.date || (t.completedAt ? t.completedAt.split('T')[0] : 'Unknown')
        if (!groups[key]) groups[key] = []
        groups[key].push(t)
      })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [recentCompletedTasks])

  const dayLabel = (ds: string) => {
    if (ds === today) return 'Today'
    if (ds === yesterday) return 'Yesterday'
    return new Date(ds + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    })
  }

  return (
    <View style={[s.activityBottom, isWide && s.activityBottomWide]}>

      {/* ── Last 7 Days ── */}
      <View style={[s.card, s.activityCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary, paddingBottom: 24 }]}>
        <Text style={[s.sectionTitle, { color: tokens.textSecondary, marginBottom: 16 }]}>Last 7 days</Text>

        {/* 7-day grid — one row */}
        <View style={s.sevenGrid}>
          {last7.map(d => {
            const filled = d.count > 0
            const full = d.pct === 100
            const cellBg = !filled ? tokens.bgInput
              : full ? tokens.accentBlue
                : d.pct >= 60 ? `${tokens.accentBlue}cc`
                  : `${tokens.accentBlue}44`
            const numColor = filled
              ? (full || d.pct >= 60) ? '#fff' : tokens.accentBlue
              : tokens.textSecondary

            return (
              <View key={d.ds} style={s.sevenCell}>
                <Text style={[s.sevenDow, { color: tokens.textMuted }]}>{d.dow}</Text>
                <View style={[
                  s.sevenBox,
                  {
                    backgroundColor: cellBg,
                    borderColor: d.isToday ? tokens.accentBlue : tokens.borderPrimary,
                    borderWidth: d.isToday ? 2 : 1,
                  },
                ]}>
                  <Text style={[s.sevenNum, { color: numColor, fontWeight: d.isToday ? '700' : '500' }]}>
                    {d.dayNum}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* Summary row */}
        <View style={[s.summaryRow, { borderTopColor: tokens.borderPrimary }]}>
          <View style={s.summaryCell}>
            <Text style={[s.summaryNum, { color: tokens.textPrimary }]}>{activeDays}</Text>
            <Text style={[s.summaryLabel, { color: tokens.textMuted }]}>Active days</Text>
          </View>
          <View style={[s.summarySep, { backgroundColor: tokens.borderPrimary }]} />
          <View style={s.summaryCell}>
            <Text style={[s.summaryNum, { color: tokens.textPrimary }]}>{totalDone}</Text>
            <Text style={[s.summaryLabel, { color: tokens.textMuted }]}>Tasks done</Text>
          </View>
          <View style={[s.summarySep, { backgroundColor: tokens.borderPrimary }]} />
          <View style={s.summaryCell}>
            <Text style={[s.summaryNum, { color: activeDays >= 4 ? tokens.accentBlue : tokens.textPrimary }]}>
              {activeDays === 0 ? '—' : `${consistencyPct}%`}
            </Text>
            <Text style={[s.summaryLabel, { color: tokens.textMuted }]}>{consistencyLabel}</Text>
          </View>
        </View>
      </View>

      {/* ── Recent Activity ── */}
      <View style={[s.card, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }, s.activityCard, { paddingBottom: 20 }]}>
        <Text style={[s.sectionTitle, { color: tokens.textSecondary, marginBottom: 14 }]}>Recent activity</Text>

        {activityGroups.length === 0 ? (
          <View style={s.emptyActivityWrap}>
            <Text style={[s.emptyActivity, { color: tokens.textMuted }]}>No completed tasks yet.</Text>
            <Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 4, textAlign: 'center' }}>
              Complete a task to see your activity here.
            </Text>
          </View>
        ) : (
          activityGroups.map(([ds, dayTasks], groupIdx) => (
            <View key={ds} style={[
              s.activityGroup,
              groupIdx > 0 && { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: tokens.borderPrimary },
            ]}>
              <View style={s.activityGroupHeader}>
                <Text style={[s.activityDate, {
                  color: ds === today ? tokens.accentBlue : tokens.textSecondary,
                }]}>
                  {dayLabel(ds).toUpperCase()}
                </Text>
                <View style={[s.activityDivider, { backgroundColor: tokens.borderPrimary }]} />
                <Text style={[s.activityCount, { color: tokens.textMuted }]}>
                  {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {dayTasks.map((task: any, ti: number) => (
                <View key={task.id} style={[
                  s.activityTask,
                  ti < dayTasks.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.borderPrimary },
                ]}>
                  <CheckCircle2 size={14} color={tokens.accentGreen} />
                  <Text style={[s.activityTitle, { color: tokens.textPrimary }]} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <View style={s.activityMeta}>
                    {task.topic && (
                      <View style={[s.topicPill, { backgroundColor: `${getTopicColor(task.topic)}18` }]}>
                        <Text style={[s.topicPillText, { color: getTopicColor(task.topic) }]}>
                          {task.topic}
                        </Text>
                      </View>
                    )}
                    {task.duration > 0 && (
                      <Text style={[s.activityDuration, { color: tokens.textMuted }]}>
                        {fmtDuration(task.duration)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </View>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { tokens } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { openSearch } = useMobileHeader()
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const isMobile = !(Platform.OS === 'web' && width > SIDEBAR_BREAKPOINT)

  const {
    tasks,
    productivityScore,
    heatmapData,
    streakData,
    thisWeekReport,
    lastWeekReport,
    getWeeklyReport,
    getTopicColor,
    topicBalanceAnalysis,
    bestHoursAnalysis,
    goals,
    setDailyGoal,
    dailyGoalProgress,
    extraGoalsProgress,
    addExtraGoal,
    removeExtraGoal,
    topics,
    todayCompleted,
    completedTasks,
    totalMinutesCompleted,
    chartData30Days,
    timeTrackingStats,
    recentCompletedTasks,
  } = useProgress({ user })

  const heatmapRecord = useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of heatmapData) map[d.date] = d.count
    return map
  }, [heatmapData])

  const topicBalanceData = useMemo(() =>
    topicBalanceAnalysis.topics.map((t: any) => ({
      name: t.name,
      minutes: t.totalTime,
      color: getTopicColor(t.name),
    })), [topicBalanceAnalysis.topics, getTopicColor])

  const bestHoursData = useMemo(() =>
    bestHoursAnalysis.hourlyData.map((d: any, hour: number) => ({
      hour,
      count: d.completed,
    })), [bestHoursAnalysis.hourlyData])

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: tokens.bgPrimary }]}>
      <StatusBar barStyle={tokens.bgPrimary === '#0f172a' || tokens.bgPrimary === '#ffffff' ? 'dark-content' : 'light-content'} />

      <ScrollView style={st.scroll} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

        {/* Page header */}
        <View style={st.header}>
          <View>
            <Text style={[st.pageTitle, { color: tokens.textPrimary }]}>Dashboard</Text>
            <Text style={[st.pageSubtitle, { color: tokens.textSecondary }]}>Your productivity at a glance</Text>
          </View>
        </View>

        {/* Tab bar */}
        <View style={[st.tabBar, { backgroundColor: tokens.bgInput }]}>
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id
            return (
              <Pressable
                key={id}
                onPress={() => setActiveTab(id)}
                style={({ pressed }) => [
                  st.tabBtn,
                  active && [st.tabBtnActive, { backgroundColor: tokens.accentPrimaryLight }],
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={label}
              >
                <Icon
                  size={13}
                  color={active ? tokens.accentBlue : tokens.textMuted}
                  strokeWidth={active ? 2.5 : 2}
                />
                <Text style={[st.tabLabel, { color: active ? tokens.accentBlue : tokens.textMuted }]}>
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <OverviewTab
            tokens={tokens}
            dailyGoalProgress={dailyGoalProgress}
            todayCompleted={todayCompleted}
            totalMinutesCompleted={totalMinutesCompleted}
            completedTasks={completedTasks}
            streakData={streakData}
            heatmapRecord={heatmapRecord}
            goals={goals}
            setDailyGoal={setDailyGoal}
            extraGoalsProgress={extraGoalsProgress}
            addExtraGoal={addExtraGoal}
            removeExtraGoal={removeExtraGoal}
            topics={topics}
            productivityScore={productivityScore}
            isMobile={isMobile}
          />
        )}

        {activeTab === 'statistics' && (
          <StatisticsTab
            tokens={tokens}
            thisWeekReport={thisWeekReport}
            lastWeekReport={lastWeekReport}
            getWeeklyReport={getWeeklyReport}
            getTopicColor={getTopicColor}
            chartData30Days={chartData30Days}
            timeTrackingStats={timeTrackingStats}
            bestHoursData={bestHoursData}
            topicBalanceData={topicBalanceData}
            bestHoursAnalysis={bestHoursAnalysis}
            topicBalanceAnalysis={topicBalanceAnalysis}
            isWide={!isMobile}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityTab
            tokens={tokens}
            tasks={tasks}
            recentCompletedTasks={recentCompletedTasks}
            getTopicColor={getTopicColor}
            isWide={!isMobile}
          />
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Shared styles (used by sub-components via `s`) ────────────────────────────

const s = StyleSheet.create({
  cardWrapper: { marginBottom: 16 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  cardBadge: { fontSize: 11, marginLeft: 'auto' as any },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
  },
  analyticsHeading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
    marginTop: 24,
  },
  // Stat bar (desktop)
  statBar: {
    borderRadius: 16,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  statRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  statCell: {
    flex: 1,
    paddingHorizontal: 12,
  },
  statCellBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingRight: 12,
    marginRight: 0,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 30,
  },
  statSub: { fontSize: 11, marginTop: 3 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  timeUnit: { fontSize: 12, marginBottom: 2 },

  // Stat cards (mobile 2x2 grid)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    width: '47%' as any,
    flexGrow: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 8,
    textAlign: 'center',
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  statCardSub: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 16,
  },
  statCardUnit: {
    fontSize: 14,
    marginBottom: 2,
  },

  // Progress card (separate card for mobile)
  progressCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },

  // Progress bar
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: { fontSize: 12 },
  progressHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressHintText: { fontSize: 11 },
  progressTrack: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  // Time tracking card
  emptyState: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 13, fontWeight: '600' },
  emptySub: { fontSize: 12, textAlign: 'center', lineHeight: 18, maxWidth: 220 },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  ringWrap: { flexShrink: 0 },
  ringFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: { fontSize: 18, fontWeight: '700' },
  ringInfo: { flex: 1, gap: 4 },
  verdictText: { fontSize: 14, fontWeight: '700' },
  varianceText: { fontSize: 12, lineHeight: 17 },
  trackingMeta: { fontSize: 11 },
  breakdownRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  breakdownCell: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  breakdownNum: { fontSize: 18, fontWeight: '700' },
  breakdownLabel: { fontSize: 10, textAlign: 'center' },
  byTopicSection: { gap: 8 },
  byTopicLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topicDot: { width: 10, height: 10, borderRadius: 3 },
  topicName: { fontSize: 12, flex: 1 },
  topicEstAct: { fontSize: 11 },
  topicDelta: { fontSize: 11, fontWeight: '600', minWidth: 64, textAlign: 'right' },
  // Activity tab — layout
  activityBottom: { flexDirection: 'column', gap: 14 },
  activityBottomWide: { flexDirection: 'row', alignItems: 'flex-start' },
  activityCard: { flexGrow: 1, flexShrink: 0 },
  // 7-day grid
  sevenGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  sevenCell: { flex: 1, alignItems: 'center', gap: 8, minWidth: 0 },
  sevenDow: { fontSize: 12, fontWeight: '500' },
  sevenBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  sevenNum: { fontSize: 18, lineHeight: 22 },
  sevenCount: { fontSize: 9, fontWeight: '600', opacity: 0.85 },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 2,
  },
  summaryCell: { alignItems: 'center', flex: 1 },
  summarySep: { width: 1, alignSelf: 'stretch', marginVertical: 4 },
  summaryNum: { fontSize: 24, fontWeight: '700', lineHeight: 28 },
  summaryLabel: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  // Recent Activity
  emptyActivityWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyActivity: { fontSize: 14, fontWeight: '500' },
  activityGroup: {},
  activityGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  activityDate: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  activityDivider: { flex: 1, height: 1 },
  activityCount: { fontSize: 11 },
  activityTask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  activityTitle: { fontSize: 13, fontWeight: '500', flex: 1 },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  topicPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  topicPillText: { fontSize: 10, fontWeight: '600' },
  activityDuration: { fontSize: 11 },

  // Analytics 3-column grid
  analyticsGrid: { gap: 14 },
  analyticsGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  analyticsCell: { marginBottom: 14 },
  analyticsCellWide: { flex: 1, minWidth: 260, marginBottom: 0, alignSelf: 'stretch' as any },

  // Focus Mode button (Time Tracking empty state)
  focusModeBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  focusModeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Sparse trend message (Statistics tab — 30-day chart)
  sparseTrendMsg: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },

  // BestHoursChart
  bhPeriodBox: { borderRadius: 12, padding: 14, marginBottom: 16, alignItems: 'center' },
  bhPeriodLabel: { fontSize: 11, marginBottom: 4 },
  bhPeriodValue: { fontSize: 18, fontWeight: '700' },
  bhPeriodRange: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  bhPeakHours: { fontSize: 11, marginTop: 6 },
  bhChartWrap: { marginBottom: 16 },
  bhChartTitle: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  bhChartSub: { fontSize: 11, marginBottom: 8 },
  bhBars: { flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 1 },
  bhBar: { flex: 1, borderRadius: 2 },
  bhXLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  bhXLabel: { fontSize: 9 },
  bhPeriods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bhPeriodCell: { flex: 1, minWidth: 60, borderRadius: 10, padding: 10, alignItems: 'center', gap: 2 },
  bhPeriodCount: { fontSize: 16, fontWeight: '700' },
  bhPeriodName: { fontSize: 9 },
  bhPeriodPct: { fontSize: 10, fontWeight: '600' },

  // TopicBalance
  tbCardTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  tbDonutRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  tbDonutWrap: { flexShrink: 0 },
  tbToggle: {
    flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2,
  },
  tbToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tbToggleTxt: { fontSize: 11, fontWeight: '600' },
  tbLegend: { marginBottom: 14, gap: 8 },
  tbLegendRow: { gap: 3 },
  tbDot: { width: 8, height: 8, borderRadius: 2, flexShrink: 0 },
  tbName: { fontSize: 12, flex: 1 },
  tbPct: { fontSize: 11, fontWeight: '700', flexShrink: 0 },
  tbBarTrack: { height: 3, borderRadius: 99, overflow: 'hidden', marginTop: 0 },
  tbBarFill: { height: '100%' as any, borderRadius: 99 },
  divider: { height: 1, marginVertical: 14 },
  tbTopics: { gap: 12, marginBottom: 14 },
  tbTopicRow: { borderLeftWidth: 3, paddingLeft: 10, gap: 4 },
  tbTopicHeader: { gap: 2 },
  tbTopicName: { fontSize: 13, fontWeight: '600' },
  tbTopicMeta: { fontSize: 11 },
  tbProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tbProgressTrack: { flex: 1, height: 5, borderRadius: 99, overflow: 'hidden' },
  tbProgressFill: { height: '100%', borderRadius: 99 },
  tbRatePct: { fontSize: 11, fontWeight: '700', flexShrink: 0 },
  tbRateCount: { fontSize: 11, flexShrink: 0 },
  tbSuggestions: { borderRadius: 10, padding: 12, borderLeftWidth: 3, gap: 4 },
  tbSuggestionsTitle: { fontSize: 12, fontWeight: '600' },
  tbSuggestionItem: { fontSize: 12, lineHeight: 18 },
  tbBalanced: { borderRadius: 10, padding: 12, alignItems: 'center' },
  tbBalancedTxt: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
})

// ── Screen-level styles ───────────────────────────────────────────────────────

const st = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  pageSubtitle: { fontSize: 14, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  tabBtnActive: {},
  tabLabel: { fontSize: 13, fontWeight: '500' },
})
