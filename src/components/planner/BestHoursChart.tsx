/**
 * BestHoursChart.tsx — bar chart showing task-completion counts by hour of day.
 *
 * - Uses VictoryBar from victory-native (no Skia dependency, v36.9.2).
 * - The peak-hour bar is highlighted in the accent colour from theme tokens.
 * - Renders an empty-state message when `data` is empty or all counts are zero.
 *
 * Requirements: 14.1, 14.2, 14.6, 2.3
 */

import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import {
  VictoryBar,
  VictoryChart,
  VictoryAxis,
  VictoryTheme,
} from 'victory-native'
import { useTheme } from '@/src/hooks/useTheme'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BestHoursDataPoint {
  hour: number   // 0–23
  count: number
}

export interface BestHoursChartProps {
  readonly data: BestHoursDataPoint[]
  readonly accentColor?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format hour 0–23 as a short AM/PM label; only label multiples of 6. */
function hourLabel(h: number): string {
  if (h === 0) return '12a'
  if (h === 6) return '6a'
  if (h === 12) return '12p'
  if (h === 18) return '6p'
  return ''
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BestHoursChart({
  data,
  accentColor,
}: BestHoursChartProps) {
  const { tokens } = useTheme()

  const accent = accentColor ?? tokens.accentPrimary

  // Determine whether there is any data to show
  const hasData = useMemo(
    () => data.some((d) => d.count > 0),
    [data],
  )

  // Find the peak hour index (first max)
  const peakHour = useMemo(() => {
    if (!hasData) return -1
    let max = 0
    let peak = -1
    for (const d of data) {
      if (d.count > max) {
        max = d.count
        peak = d.hour
      }
    }
    return peak
  }, [data, hasData])

  // Build VictoryBar-compatible dataset; fill all 0–23 gaps if needed.
  // Each datum includes a `fill` field so we avoid a function in the style prop
  // (VictoryStyleInterface v36 does not accept functions directly).
  const chartData = useMemo(() => {
    const map: Record<number, number> = {}
    for (const d of data) map[d.hour] = d.count
    return Array.from({ length: 24 }, (_, h) => ({
      x: h,
      y: map[h] ?? 0,
      fill: h === peakHour ? accent : tokens.accentBlue + '99',
    }))
  }, [data, peakHour, accent, tokens.accentBlue])

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (!hasData) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: tokens.bgSecondary }]}
        accessibilityLabel="Best hours chart — no data yet"
      >
        <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
          Complete some tasks to see your best hours.
        </Text>
      </View>
    )
  }

  // ── Chart ───────────────────────────────────────────────────────────────────

  // Per-bar colour: accent for peak hour, subdued for the rest.
  // The fill is embedded as a data field (see chartData) and accessed via a
  // datum accessor; typed `as any` to work around VictoryStyleInterface v36.
  const barStyle = {
    data: {
      fill: ({ datum }: { datum: { fill: string } }) => datum.fill,
      width: 8,
    },
  } as any

  const axisStyle = {
    axis: { stroke: tokens.borderPrimary },
    ticks: { stroke: 'transparent' },
    tickLabels: {
      fill: tokens.textMuted,
      fontSize: 9,
      padding: 4,
    },
    grid: { stroke: 'transparent' },
  }

  const yAxisStyle = {
    axis: { stroke: 'transparent' },
    ticks: { stroke: 'transparent' },
    tickLabels: {
      fill: tokens.textMuted,
      fontSize: 9,
      padding: 4,
    },
    grid: {
      stroke: tokens.borderPrimary,
      strokeWidth: 1,
      strokeDasharray: '4,6',
    },
  }

  return (
    <View
      style={[styles.container, { backgroundColor: tokens.bgSecondary }]}
      accessibilityLabel="Best hours chart"
    >
      <Text style={[styles.title, { color: tokens.textSecondary }]}>
        Tasks Completed by Hour
      </Text>
      <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
        Peak hour highlighted in accent colour
      </Text>

      <VictoryChart
        theme={VictoryTheme.material}
        domainPadding={{ x: 8 }}
        padding={{ top: 16, bottom: 32, left: 32, right: 12 }}
        height={160}
      >
        <VictoryAxis
          tickValues={[0, 6, 12, 18, 23]}
          tickFormat={(t: number) => hourLabel(t)}
          style={axisStyle}
        />
        <VictoryAxis
          dependentAxis
          style={yAxisStyle}
          tickFormat={(t: number) => (Number.isInteger(t) ? String(t) : '')}
        />
        <VictoryBar
          data={chartData}
          style={barStyle}
          cornerRadius={{ top: 2 }}
          animate={{ duration: 400, onLoad: { duration: 400 } }}
        />
      </VictoryChart>

      {/* X-axis labels at quarter marks */}
      <View style={styles.xLabels}>
        {[0, 6, 12, 18, 23].map((h) => (
          <Text key={h} style={[styles.xLabel, { color: tokens.textMuted }]}>
            {hourLabel(h)}
          </Text>
        ))}
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    overflow: 'hidden',
  },
  emptyContainer: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    marginBottom: 4,
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    marginTop: -8,
  },
  xLabel: {
    fontSize: 9,
  },
})
