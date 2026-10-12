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
import { View, Text, Pressable, StyleSheet } from 'react-native'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { fmtDuration } from '@/src/lib/utils'
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg'

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
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDelta(mins: number): string {
  const sign = mins >= 0 ? '+' : '-'
  return sign + fmtDuration(Math.abs(mins))
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
}: WeeklyReportProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)

  const [weeksAgo, setWeeksAgo] = useState(0)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const report = weeksAgo === 0 ? thisWeek : weeksAgo === 1 ? lastWeek : getWeeklyReport(weeksAgo)
  const prevWeek = weeksAgo === 0 ? lastWeek : getWeeklyReport(weeksAgo + 1)

  const tasksTrend = report.completedTasks - prevWeek.completedTasks
  const minutesTrend = report.totalMinutes - prevWeek.totalMinutes
  const productivityTrend = report.completionRate - prevWeek.completionRate

  const hours = Math.floor(report.totalMinutes / 60)
  const mins = report.totalMinutes % 60

  const todayStr = new Date().toISOString().split('T')[0]
  const days = report.dailyBreakdown.map(d => ({ ...d, isToday: d.date === todayStr }))

  // Calculate daily productivity percentages based on completion
  const dailyProductivity = days.map(day => {
    // Simple productivity: if tasks were done that day, calculate completion rate
    // For now, use a simple heuristic: completed tasks / expected daily average
    const avgDaily = report.completedTasks / 7
    if (avgDaily === 0) return 0
    return Math.min(100, Math.round((day.completed / Math.max(avgDaily, 1)) * 100))
  })
  const maxProductivity = Math.max(...dailyProductivity, 1)

  const periodLabel =
    weeksAgo === 0 ? 'This Week' : weeksAgo === 1 ? 'Last Week' : `${weeksAgo} weeks ago`

  // Format trend percentage
  const tasksTrendPct = prevWeek.completedTasks > 0
    ? Math.round((tasksTrend / prevWeek.completedTasks) * 100)
    : tasksTrend > 0 ? 100 : 0
  const minutesTrendPct = prevWeek.totalMinutes > 0
    ? Math.round((minutesTrend / prevWeek.totalMinutes) * 100)
    : minutesTrend > 0 ? 100 : 0

  return (
    <View style={styles.container}>
      {/* Header with week navigation */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Weekly report</Text>
          <Text style={[styles.dateRange, { color: tokens.textMuted }]}>
            {formatDate(report.startDate)} — {formatDate(report.endDate)}
          </Text>
        </View>
        <View style={styles.navRow}>
          <Pressable onPress={() => setWeeksAgo(p => p + 1)} style={styles.navBtn} accessibilityLabel="Previous week">
            <ChevronLeft size={18} color={tokens.textSecondary} />
          </Pressable>
          <Text style={[styles.periodLabel, { color: tokens.textSecondary }]}>{periodLabel}</Text>
          <Pressable
            onPress={() => setWeeksAgo(p => Math.max(0, p - 1))}
            disabled={weeksAgo === 0}
            style={[styles.navBtnRight, { opacity: weeksAgo === 0 ? 0.3 : 1, borderColor: tokens.borderPrimary }]}
            accessibilityLabel="Next week"
          >
            <ChevronRight size={18} color={tokens.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Stats cards row */}
      <View style={styles.statsRow}>
        {/* Focus Time */}
        <View style={[styles.statCard, { backgroundColor: `${tokens.accentBlue}15`, borderColor: `${tokens.accentBlue}30` }]}>
          <View style={styles.statIconRow}>
            <Clock size={16} color={tokens.accentBlue} />
            <Text style={[styles.statCardLabel, { color: tokens.accentBlue }]}>Focus Time</Text>
          </View>
          <Text style={[styles.statCardValue, { color: tokens.textPrimary }]}>
            {hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`}
          </Text>
          {minutesTrend !== 0 && (
            <Text style={[styles.statTrend, { color: minutesTrend > 0 ? tokens.accentGreen : tokens.accentRed }]}>
              {minutesTrend > 0 ? '+' : ''}{minutesTrendPct}%
            </Text>
          )}
        </View>

        {/* Tasks Done */}
        <View style={[styles.statCard, { backgroundColor: `${tokens.accentGreen}15`, borderColor: `${tokens.accentGreen}30` }]}>
          <View style={styles.statIconRow}>
            <CheckCircle2 size={16} color={tokens.accentGreen} />
            <Text style={[styles.statCardLabel, { color: tokens.accentGreen }]}>Tasks Done</Text>
          </View>
          <Text style={[styles.statCardValue, { color: tokens.textPrimary }]}>
            {report.completedTasks}
          </Text>
          {tasksTrend !== 0 && (
            <Text style={[styles.statTrend, { color: tasksTrend > 0 ? tokens.accentGreen : tokens.accentRed }]}>
              {tasksTrend > 0 ? '+' : ''}{tasksTrendPct}%
            </Text>
          )}
        </View>

        {/* Productivity */}
        <View style={[styles.statCard, { backgroundColor: `${tokens.accentOrange}15`, borderColor: `${tokens.accentOrange}30` }]}>
          <View style={styles.statIconRow}>
            <TrendingUp size={16} color={tokens.accentOrange} />
            <Text style={[styles.statCardLabel, { color: tokens.accentOrange }]}>Productivity</Text>
          </View>
          <Text style={[styles.statCardValue, { color: tokens.textPrimary }]}>
            {report.completionRate}%
          </Text>
          {productivityTrend !== 0 && (
            <Text style={[styles.statTrend, { color: productivityTrend > 0 ? tokens.accentGreen : tokens.accentRed }]}>
              {productivityTrend > 0 ? '+' : ''}{productivityTrend}%
            </Text>
          )}
        </View>
      </View>

      {/* Productivity Overview chart */}
      <View style={[styles.chartCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        <Text style={[styles.chartTitle, { color: tokens.textPrimary }]}>Productivity Overview</Text>

        {/* Y-axis labels + bars */}
        <View style={styles.chartArea}>
          <View style={styles.yAxis}>
            <Text style={[styles.yLabel, { color: tokens.textMuted }]}>100%</Text>
            <Text style={[styles.yLabel, { color: tokens.textMuted }]}>75%</Text>
            <Text style={[styles.yLabel, { color: tokens.textMuted }]}>50%</Text>
            <Text style={[styles.yLabel, { color: tokens.textMuted }]}>25%</Text>
            <Text style={[styles.yLabel, { color: tokens.textMuted }]}>0%</Text>
          </View>

          <View style={styles.barsArea}>
            {/* Horizontal grid lines */}
            <View style={[styles.gridLine, { top: 0, backgroundColor: tokens.borderPrimary }]} />
            <View style={[styles.gridLine, { top: '25%', backgroundColor: tokens.borderPrimary }]} />
            <View style={[styles.gridLine, { top: '50%', backgroundColor: tokens.borderPrimary }]} />
            <View style={[styles.gridLine, { top: '75%', backgroundColor: tokens.borderPrimary }]} />
            <View style={[styles.gridLine, { bottom: 0, backgroundColor: tokens.borderPrimary }]} />

            {/* Bars */}
            <View style={styles.barsContainer}>
              {days.map((day, i) => {
                const pct = dailyProductivity[i]
                const barH = pct > 0 ? Math.max(8, (pct / 100) * 120) : 4
                const isSelected = selectedDay === i
                const isActive = pct > 0

                return (
                  <Pressable
                    key={i}
                    style={styles.barColumn}
                    onPress={() => setSelectedDay(isSelected ? null : i)}
                    accessibilityLabel={`${day.dayName}: ${pct}% productivity`}
                  >
                    {/* Tooltip */}
                    {isSelected && isActive && (
                      <View style={[styles.tooltip, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
                        <Text style={[styles.tooltipDay, { color: tokens.textSecondary }]}>{day.dayName}</Text>
                        <Text style={[styles.tooltipValue, { color: tokens.textPrimary }]}>{pct}%</Text>
                      </View>
                    )}

                    {/* Bar */}
                    <View style={styles.barWrapper}>
                      <Svg width="100%" height={barH}>
                        <Defs>
                          <LinearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={tokens.accentPrimary} stopOpacity="1" />
                            <Stop offset="1" stopColor={tokens.accentPrimary} stopOpacity="0.5" />
                          </LinearGradient>
                        </Defs>
                        <Rect
                          x="0"
                          y="0"
                          width="100%"
                          height={barH}
                          rx={6}
                          fill={isActive ? `url(#grad-${i})` : tokens.bgInput}
                        />
                      </Svg>
                    </View>

                    {/* Day label */}
                    <Text
                      style={[
                        styles.dayLabel,
                        {
                          color: day.isToday ? tokens.accentPrimary : tokens.textMuted,
                          fontWeight: day.isToday ? '600' : '400',
                        },
                      ]}
                    >
                      {day.dayName}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

// ── Styles factory ────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    container: {
      gap: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    dateRange: {
      fontSize: 12,
      marginTop: 2,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    navBtn: {
      padding: 4,
    },
    navBtnRight: {
      padding: 4,
      borderWidth: 1,
      borderRadius: 6,
    },
    periodLabel: {
      fontSize: 13,
      fontWeight: '500',
      minWidth: 80,
      textAlign: 'center',
    },

    // Stats cards row
    statsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    statCard: {
      flex: 1,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      gap: 4,
    },
    statIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statCardLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    statCardValue: {
      fontSize: 22,
      fontWeight: '700',
      marginTop: 4,
    },
    statTrend: {
      fontSize: 12,
      fontWeight: '600',
    },

    // Productivity Overview chart card
    chartCard: {
      borderRadius: 16,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
    },
    chartTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 16,
    },
    chartArea: {
      flexDirection: 'row',
      height: 150,
    },
    yAxis: {
      width: 36,
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingRight: 8,
      paddingBottom: 20,
    },
    yLabel: {
      fontSize: 10,
    },
    barsArea: {
      flex: 1,
      position: 'relative',
    },
    gridLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: StyleSheet.hairlineWidth,
    },
    barsContainer: {
      flexDirection: 'row',
      flex: 1,
      alignItems: 'flex-end',
      paddingBottom: 20,
      gap: 8,
    },
    barColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: '100%',
    },
    barWrapper: {
      width: '100%',
      maxWidth: 32,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    dayLabel: {
      fontSize: 11,
      marginTop: 8,
    },
    tooltip: {
      position: 'absolute',
      bottom: '100%',
      marginBottom: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      zIndex: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    tooltipDay: {
      fontSize: 11,
    },
    tooltipValue: {
      fontSize: 14,
      fontWeight: '700',
    },
  })
}
