/**
 * WeeklyReport.tsx — weekly task summary with navigation between weeks.
 *
 * Migrated from frontend/src/components/WeeklyReport.jsx.
 * All HTML elements replaced with RN primitives; all CSS replaced with
 * StyleSheet.create() using theme tokens. React Router removed; navigation
 * handled via props.
 *
 * Requirements: 9.3, 9.4
 */

import React, { useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { fmtDuration } from '@/src/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailyBreakdown {
  date: string
  dayName: string
  completed: number
  minutes: number
  isToday?: boolean
}

export interface TopicStats {
  count: number
  minutes: number
}

export interface WeeklyReportData {
  startDate: string
  endDate: string
  completedTasks: number
  totalMinutes: number
  completionRate: number
  dailyBreakdown: DailyBreakdown[]
  topicBreakdown: Record<string, TopicStats>
}

export interface WeeklyReportProps {
  thisWeek: WeeklyReportData
  lastWeek: WeeklyReportData
  getWeeklyReport: (weeksAgo: number) => WeeklyReportData
  getTopicColor: (topic: string) => string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDelta(mins: number): string {
  const sign = mins >= 0 ? '+' : '-'
  return sign + fmtDuration(Math.abs(mins))
}

function weekSummary(report: WeeklyReportData, weeksAgo: number): string {
  if (report.completedTasks === 0) {
    return weeksAgo === 0
      ? 'No tasks completed yet this week — get started!'
      : 'No tasks were completed this week.'
  }
  const best = report.dailyBreakdown.reduce<DailyBreakdown | null>(
    (b, d) => (d.completed > (b?.completed ?? 0) ? d : b),
    null,
  )
  const dayLabel = weeksAgo === 0 && best?.isToday ? 'today' : best?.dayName ?? ''
  if (best && best.completed > 0) {
    const taskPart = `${best.completed} task${best.completed !== 1 ? 's' : ''}`
    const durationPart = best.minutes > 0 ? ` · ${fmtDuration(best.minutes)} focused` : ''
    return `Best day · ${dayLabel}\n${taskPart}${durationPart}`
  }
  return ''
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeeklyReport({
  thisWeek,
  lastWeek,
  getWeeklyReport,
  getTopicColor,
}: WeeklyReportProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)

  const [weeksAgo, setWeeksAgo] = useState(0)
  const report = weeksAgo === 0 ? thisWeek : weeksAgo === 1 ? lastWeek : getWeeklyReport(weeksAgo)
  const prevWeek = weeksAgo === 0 ? lastWeek : getWeeklyReport(weeksAgo + 1)

  const tasksTrend = report.completedTasks - prevWeek.completedTasks
  const minutesTrend = report.totalMinutes - prevWeek.totalMinutes

  const hours = Math.floor(report.totalMinutes / 60)
  const mins = report.totalMinutes % 60

  const todayStr = new Date().toISOString().split('T')[0]
  const days = report.dailyBreakdown.map(d => ({ ...d, isToday: d.date === todayStr }))
  const maxCompleted = Math.max(...days.map(d => d.completed), 1)

  const allZero = days.every(d => d.completed === 0)

  const periodLabel =
    weeksAgo === 0 ? 'This Week' : weeksAgo === 1 ? 'Last Week' : `${weeksAgo} weeks ago`

  const sortedTopics = Object.entries(report.topicBreakdown).sort((a, b) => b[1].count - a[1].count).slice(0, 5)
  const maxTopicCount = Math.max(...sortedTopics.map(([, s]) => s.count), 1)

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: tokens.textSecondary }]}>Weekly report</Text>
        <View style={styles.navRow}>
          <Pressable onPress={() => setWeeksAgo(p => p + 1)} style={styles.navBtn} accessibilityLabel="Previous week">
            <ChevronLeft size={16} color={tokens.textSecondary} />
          </Pressable>
          <Text style={[styles.periodLabel, { color: tokens.textSecondary }]}>{periodLabel}</Text>
          <Pressable
            onPress={() => setWeeksAgo(p => Math.max(0, p - 1))}
            disabled={weeksAgo === 0}
            style={[styles.navBtn, { opacity: weeksAgo === 0 ? 0.3 : 1 }]}
            accessibilityLabel="Next week"
          >
            <ChevronRight size={16} color={tokens.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Date range */}
      <Text style={[styles.dateRange, { color: tokens.textMuted }]}>
        {formatDate(report.startDate)} — {formatDate(report.endDate)}
      </Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {/* Tasks done */}
        <View style={[styles.statBox, { backgroundColor: tokens.bgInput }]}>
          <View style={styles.statValueRow}>
            <CheckCircle2 size={14} color={tokens.accentGreen} />
            <Text style={[styles.statValue, { color: tokens.textPrimary }]}>{report.completedTasks}</Text>
          </View>
          <Text style={[styles.statLabel, { color: tokens.textMuted }]}>Tasks completed</Text>
          {tasksTrend !== 0 && (
            <View style={styles.trendRow}>
              {tasksTrend > 0
                ? <TrendingUp size={10} color={tokens.accentGreen} />
                : <TrendingDown size={10} color={tokens.accentRed} />}
              <Text style={{ fontSize: 10, color: tasksTrend > 0 ? tokens.accentGreen : tokens.accentRed }} numberOfLines={1}>
                {tasksTrend > 0 ? '+' : ''}{tasksTrend} vs prior
              </Text>
            </View>
          )}
        </View>

        {/* Time spent */}
        <View style={[styles.statBox, { backgroundColor: tokens.bgInput }]}>
          <View style={styles.statValueRow}>
            <Clock size={14} color={tokens.accentBlue} />
            <Text style={[styles.statValue, { color: tokens.textPrimary }]}>
              {hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`}
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: tokens.textMuted }]}>Time focused</Text>
          {minutesTrend !== 0 && (
            <View style={styles.trendRow}>
              {minutesTrend > 0
                ? <TrendingUp size={10} color={tokens.accentGreen} />
                : <TrendingDown size={10} color={tokens.accentRed} />}
              <Text style={{ fontSize: 10, color: minutesTrend > 0 ? tokens.accentGreen : tokens.accentRed }} numberOfLines={1}>
                {fmtDelta(minutesTrend)} vs prior
              </Text>
            </View>
          )}
        </View>

        {/* Completion % */}
        <View style={[styles.statBox, { backgroundColor: tokens.bgInput }]}>
          <Text style={[styles.statValue, { color: report.completionRate === 100 ? tokens.accentGreen : tokens.textPrimary }]}>
            {report.completionRate}%
          </Text>
          <Text style={[styles.statLabel, { color: tokens.textMuted }]}>Completion</Text>
        </View>
      </View>

      {/* Summary sentence */}
      <Text style={[styles.summary, { color: tokens.textSecondary }]}>
        {weekSummary(report, weeksAgo)}
      </Text>

      {/* Daily bar chart */}
      <View style={styles.chartSection}>
        <Text style={[styles.chartTitle, { color: tokens.textSecondary }]}>Daily activity</Text>
        {allZero ? (
          <View style={styles.barEmptyState}>
            <Text style={[styles.barEmptyText, { color: tokens.textMuted }]}>No activity this week</Text>
          </View>
        ) : (
          <View style={styles.barsContainer}>
            {days.map((day, i) => {
              const barH = day.completed > 0
                ? Math.max(4, Math.round((day.completed / maxCompleted) * 46))
                : 6
              const isActive = day.completed > 0
              return (
                <View key={i} style={styles.barColumn}>
                  {isActive && (
                    <Text style={[styles.barCount, { color: day.isToday ? tokens.accentBlue : tokens.textSecondary }]}>
                      {day.completed}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barH,
                        backgroundColor: day.isToday
                          ? tokens.accentBlue
                          : isActive
                            ? 'rgba(99,102,241,0.5)'
                            : tokens.bgInput,
                        borderWidth: isActive || day.isToday ? 0 : 1,
                        borderColor: tokens.borderPrimary,
                      },
                    ]}
                  />
                  <Text style={[styles.dayLabel, { color: day.isToday ? tokens.accentBlue : tokens.textMuted, fontWeight: day.isToday ? '700' : '400' }]}>
                    {day.dayName}
                  </Text>
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* Topic breakdown */}
      {sortedTopics.length > 0 && (
        <View>
          <Text style={[styles.chartTitle, { color: tokens.textSecondary }]}>By topic</Text>
          <View style={styles.topicBarList}>
            {sortedTopics.map(([topic, stats]) => {
              const fillPct = maxTopicCount > 0 ? (stats.count / maxTopicCount) * 100 : 0
              const topicColor = getTopicColor(topic)
              return (
                <View key={topic} style={styles.topicBarRow}>
                  <View style={styles.topicBarHeader}>
                    <View style={[styles.topicDot, { backgroundColor: topicColor }]} />
                    <Text style={[styles.topicBarName, { color: tokens.textSecondary }]} numberOfLines={1}>{topic}</Text>
                    <Text style={[styles.topicBarCount, { color: tokens.textPrimary }]}>{stats.count}</Text>
                  </View>
                  <View style={[styles.topicBarTrack, { backgroundColor: tokens.bgInput }]}>
                    <View style={[styles.topicBarFill, { width: `${fillPct}%` as any, backgroundColor: topicColor }]} />
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}

// ── Styles factory ────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    card: {
      backgroundColor: tokens.bgSecondary,
      borderRadius: 16,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.borderPrimary,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    navBtn: {
      padding: 4,
    },
    periodLabel: {
      fontSize: 12,
      minWidth: 120,
      textAlign: 'center',
    },
    dateRange: {
      fontSize: 12,
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    statBox: {
      flex: 1,
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
    },
    statValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 28,
    },
    statLabel: {
      fontSize: 11,
      textAlign: 'center',
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginTop: 3,
      maxWidth: '100%' as any,
    },
    summary: {
      fontSize: 12,
      lineHeight: 22,
      marginBottom: 16,
    },
    chartSection: {
      marginBottom: 16,
    },
    chartTitle: {
      fontSize: 12,
      fontWeight: '500',
      marginBottom: 8,
    },
    barsContainer: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'flex-end',
      height: 72,
    },
    barEmptyState: {
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
    },
    barEmptyText: {
      fontSize: 12,
      lineHeight: 18,
    },
    barColumn: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
      height: '100%',
      justifyContent: 'flex-end',
    },
    barCount: {
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 12,
    },
    bar: {
      width: '100%',
      borderRadius: 4,
      // height set dynamically
    },
    dayLabel: {
      fontSize: 10,
    },
    topicDot: {
      width: 8,
      height: 8,
      borderRadius: 2,
      flexShrink: 0,
    },
    topicBarList: {
      gap: 10,
    },
    topicBarRow: {
      gap: 4,
    },
    topicBarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    topicBarName: {
      fontSize: 12,
      flex: 1,
      lineHeight: 18,
    },
    topicBarCount: {
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 0,
      lineHeight: 18,
    },
    topicBarTrack: {
      height: 4,
      borderRadius: 99,
      overflow: 'hidden',
    },
    topicBarFill: {
      height: '100%',
      borderRadius: 99,
    },
  })
}
