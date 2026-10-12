/**
 * Analytics tab screen — Statistics and Activity tabs for detailed insights.
 *
 * Tabs:
 *   Statistics — Weekly report, 30-day chart, time tracking, best hours, topic balance
 *   Activity   — Heatmap and productivity score
 *
 * Works on iOS, Android, and web (responsive at 768px breakpoint).
 */

import React, { useMemo, useState } from 'react'
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
  BarChart2,
  Activity,
  CheckCircle2,
  Clock,
  PieChart,
} from 'lucide-react-native'

import { useAuth } from '@/src/hooks/useAuth'
import { useProgress } from '@/src/hooks/useProgress'
import { useTheme } from '@/src/hooks/useTheme'
import SegmentedToggle from '@/src/components/SegmentedToggle'
import { useRouter } from 'expo-router'
import ProductivityScore from '@/src/components/planner/ProductivityScore'
import Heatmap from '@/src/components/calendar/Heatmap'
import WeeklyReport from '@/src/components/planner/WeeklyReport'
import { fmtDuration } from '@/src/lib/utils'
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg'

const SIDEBAR_BREAKPOINT = 768

type TabId = 'statistics' | 'activity'

const TABS: { id: TabId; label: string; Icon: any }[] = [
  { id: 'statistics', label: 'Statistics', Icon: BarChart2 },
  { id: 'activity', label: 'Activity', Icon: Activity },
]

// ── Best Hours card ───────────────────────────────────────────────────────────

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

// ── Topic Balance card ────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  if (endDeg - startDeg >= 359.9) {
    const top = polarToCartesian(cx, cy, r, 0)
    const bot = polarToCartesian(cx, cy, r, 180)
    return `M ${top.x} ${top.y} A ${r} ${r} 0 1 0 ${bot.x} ${bot.y} A ${r} ${r} 0 1 0 ${top.x} ${top.y} Z`
  }
  const ss = polarToCartesian(cx, cy, r, endDeg)
  const e = polarToCartesian(cx, cy, r, startDeg)
  const large = endDeg - startDeg <= 180 ? 0 : 1
  return `M ${ss.x} ${ss.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} L ${cx} ${cy} Z`
}

function TopicBalanceRN({ tokens, data, analysis, getTopicColor, flex }: any) {
  const [mode, setMode] = useState<'time' | 'tasks'>('time')
  const { topics, totalTime, totalTasks } = analysis ?? {}

  if (!totalTasks) {
    return (
      <View style={[s.card, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }, flex && { flex: 1 }]}>
        <View style={s.cardHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <PieChart size={16} color={tokens.accentGreen} />
            <Text style={[s.tbCardTitle, { color: tokens.textPrimary }]}>Topic Balance</Text>
          </View>
        </View>
        <View style={[s.emptyState, { backgroundColor: tokens.bgInput }]}>
          <Text style={[s.emptySub, { color: tokens.textMuted, textAlign: 'center' }]}>
            Add tasks to different topics to see your time distribution.
          </Text>
        </View>
      </View>
    )
  }

  let angle = 0
  const segments = (topics as any[] ?? []).map((topic: any) => {
    const pct = mode === 'time'
      ? (totalTime > 0 ? topic.totalTime / totalTime * 100 : 0)
      : (totalTasks > 0 ? topic.taskCount / totalTasks * 100 : 0)
    const seg = { ...topic, pct: Math.round(pct), startAngle: angle, endAngle: angle + (pct / 100) * 360 }
    angle += (pct / 100) * 360
    return seg
  })

  const hours = Math.floor(totalTime / 60)
  const mins = totalTime % 60

  return (
    <View style={[s.card, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }, flex && { flex: 1 }]}>
      {/* Header with toggle */}
      <View style={[s.cardHeaderRow, { marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <PieChart size={16} color={tokens.accentGreen} />
          <Text style={[s.tbCardTitle, { color: tokens.textPrimary }]}>Topic Balance</Text>
        </View>
        <SegmentedToggle
          options={[
            { value: 'time', label: 'Time', icon: (color) => <Clock size={14} color={color} /> },
            { value: 'tasks', label: 'Tasks', icon: (color) => <CheckCircle2 size={14} color={color} /> },
          ]}
          value={mode}
          onChange={(v) => setMode(v as 'time' | 'tasks')}
        />
      </View>

      {/* Centered donut chart */}
      <View style={s.tbDonutCenter}>
        <Svg width={140} height={140} viewBox="0 0 100 100">
          {segments.map((seg: any) => {
            if (seg.endAngle - seg.startAngle < 0.5) return null
            return (
              <Path
                key={seg.name}
                d={describeArc(50, 50, 40, seg.startAngle, Math.max(seg.endAngle - 0.5, seg.startAngle + 0.5))}
                fill={getTopicColor(seg.name)}
              />
            )
          })}
          <Circle cx={50} cy={50} r={26} fill={tokens.bgSecondary} />
          {mode === 'time' ? (
            <>
              <SvgText x={50} y={hours > 0 && mins > 0 ? 46 : 52} textAnchor="middle" fill={tokens.textPrimary} fontSize={12} fontWeight="700">
                {hours > 0 ? `${hours}h` : `${mins}m`}
              </SvgText>
              {hours > 0 && mins > 0 && (
                <SvgText x={50} y={60} textAnchor="middle" fill={tokens.textPrimary} fontSize={12} fontWeight="700">
                  {mins}m
                </SvgText>
              )}
            </>
          ) : (
            <>
              <SvgText x={50} y={46} textAnchor="middle" fill={tokens.textPrimary} fontSize={14} fontWeight="700">
                {totalTasks}
              </SvgText>
              <SvgText x={50} y={60} textAnchor="middle" fill={tokens.textMuted} fontSize={8}>
                Total
              </SvgText>
            </>
          )}
        </Svg>
      </View>

      {/* Legend list - shows time or task count based on mode */}
      <View style={s.tbLegendList}>
        {(topics as any[] ?? []).map((topic: any) => {
          const color = getTopicColor(topic.name)
          // Time mode: show time invested, Tasks mode: show task count
          const valueText = mode === 'time'
            ? fmtDuration(topic.totalTime)
            : `${topic.taskCount}`
          return (
            <View key={topic.name} style={s.tbLegendItem}>
              <View style={[s.tbLegendDot, { backgroundColor: color }]} />
              <Text style={[s.tbLegendName, { color: tokens.textPrimary }]} numberOfLines={1}>{topic.name}</Text>
              <Text style={[s.tbLegendValue, { color: tokens.textMuted }]}>{valueText}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ── Time Tracking card ────────────────────────────────────────────────────────

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
          <View style={s.ringRow}>
            <View style={s.ringWrap}>
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

// ── Statistics tab ────────────────────────────────────────────────────────────

function StatisticsTab({
  tokens, thisWeekReport, lastWeekReport, getWeeklyReport, getTopicColor,
  timeTrackingStats, bestHoursData, topicBalanceData,
  bestHoursAnalysis, topicBalanceAnalysis, isWide,
}: any) {
  return (
    <>
      <View style={s.cardWrapper}>
        <WeeklyReport
          thisWeek={thisWeekReport}
          lastWeek={lastWeekReport}
          getWeeklyReport={getWeeklyReport}
        />
      </View>

      <Text style={[s.analyticsHeading, { color: tokens.textPrimary }]}>Analytics & Insights</Text>

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

// ── Activity tab ──────────────────────────────────────────────────────────────

function ActivityTab({ tokens, heatmapRecord, productivityScore }: any) {
  return (
    <>
      <View style={s.cardWrapper}>
        <Heatmap data={heatmapRecord} />
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

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const { tokens } = useTheme()
  const { user } = useAuth()
  const { width } = useWindowDimensions()
  const [activeTab, setActiveTab] = useState<TabId>('statistics')

  const isMobile = !(Platform.OS === 'web' && width > SIDEBAR_BREAKPOINT)

  const {
    tasks,
    productivityScore,
    heatmapData,
    thisWeekReport,
    lastWeekReport,
    getWeeklyReport,
    getTopicColor,
    topicBalanceAnalysis,
    bestHoursAnalysis,
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
        <View style={st.header}>
          <View>
            <Text style={[st.pageTitle, { color: tokens.textPrimary }]}>Analytics</Text>
            <Text style={[st.pageSubtitle, { color: tokens.textSecondary }]}>Detailed insights and statistics</Text>
          </View>
        </View>

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

        {activeTab === 'statistics' && (
          <StatisticsTab
            tokens={tokens}
            thisWeekReport={thisWeekReport}
            lastWeekReport={lastWeekReport}
            getWeeklyReport={getWeeklyReport}
            getTopicColor={getTopicColor}
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
            heatmapRecord={heatmapRecord}
            productivityScore={productivityScore}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
  analyticsGrid: { gap: 14 },
  analyticsGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  analyticsCell: { marginBottom: 14 },
  analyticsCellWide: { flex: 1, minWidth: 260, marginBottom: 0, alignSelf: 'stretch' as any },
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
  bhPeriodBox: { borderRadius: 12, padding: 14, marginBottom: 16, alignItems: 'center' },
  bhPeriodValue: { fontSize: 18, fontWeight: '700' },
  bhPeriodRange: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  bhPeakHours: { fontSize: 11, marginTop: 6 },
  bhChartWrap: { marginBottom: 16 },
  bhChartTitle: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  bhBars: { flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 1 },
  bhBar: { flex: 1, borderRadius: 2 },
  bhXLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  bhXLabel: { fontSize: 9 },
  bhPeriods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bhPeriodCell: { flex: 1, minWidth: 60, borderRadius: 10, padding: 10, alignItems: 'center', gap: 2 },
  bhPeriodCount: { fontSize: 16, fontWeight: '700' },
  bhPeriodName: { fontSize: 9 },
  tbCardTitle: { fontSize: 15, fontWeight: '600' },
  tbDonutCenter: { alignItems: 'center', marginBottom: 20 },
  tbLegendList: { gap: 14 },
  tbLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tbLegendDot: { width: 12, height: 12, borderRadius: 3 },
  tbLegendName: { fontSize: 14, fontWeight: '500', flex: 1 },
  tbLegendValue: { fontSize: 14, fontWeight: '500' },
})

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
