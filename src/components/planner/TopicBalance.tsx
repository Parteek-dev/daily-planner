/**
 * TopicBalance.tsx — donut chart + legend showing time distribution by topic.
 *
 * - Uses VictoryPie from victory-native (v36.9.2, no Skia dependency).
 * - Displays at most 5 topics; groups the remainder as "Other".
 * - Renders an empty-state message when data is empty.
 * - No CSS, no `var(--` strings — all colours come from props or theme tokens.
 *
 * Requirements: 14.1, 14.5, 14.6, 2.3
 */

import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { VictoryPie, VictoryTheme } from 'victory-native'
import { useTheme } from '@/src/hooks/useTheme'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TopicBalanceDataPoint {
  name: string
  /** Time in minutes */
  minutes: number
  /** Optional per-topic hex color */
  color?: string
}

export interface TopicBalanceProps {
  readonly data: TopicBalanceDataPoint[]
  readonly accentColor?: string
}

// ─── Fallback palette ─────────────────────────────────────────────────────────

const PALETTE = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#22c55e',
  '#14b8a6',
  '#f59e0b',
  '#64748b',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minutesToLabel(m: number): string {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h}h ${rem}m` : `${h}h`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TopicBalance({
  data,
  accentColor,
}: TopicBalanceProps) {
  const { tokens } = useTheme()

  // ── Data processing ─────────────────────────────────────────────────────────
  // This hook must run unconditionally before any early return.

  const { segments, totalMinutes } = useMemo(() => {
    if (!data || data.length === 0) return { segments: [], totalMinutes: 0 }

    // Sort descending by minutes
    const sorted = [...data].sort((a, b) => b.minutes - a.minutes)

    const top5 = sorted.slice(0, 5)
    const rest = sorted.slice(5)

    // Assign colours
    const withColors = top5.map((d, i) => ({
      name: d.name,
      minutes: d.minutes,
      color: d.color ?? accentColor ?? PALETTE[i % PALETTE.length],
    }))

    if (rest.length > 0) {
      const otherMinutes = rest.reduce((s, d) => s + d.minutes, 0)
      withColors.push({
        name: 'Other',
        minutes: otherMinutes,
        color: tokens.textMuted,
      })
    }

    const totalMinutes = withColors.reduce((s, d) => s + d.minutes, 0)

    return { segments: withColors, totalMinutes }
  }, [data, accentColor, tokens.textMuted])

  // ── Empty state (after all hooks) ───────────────────────────────────────────

  if (!data || data.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: tokens.bgSecondary }]}
        accessibilityLabel="Topic balance chart — no data yet"
      >
        <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
          Add tasks to different topics to see your time distribution.
        </Text>
      </View>
    )
  }

  // Victory data shape
  const pieData = segments.map((s) => ({
    x: s.name,
    y: s.minutes,
  }))

  const pieColorScale = segments.map((s) => s.color)

  // ── Donut chart ──────────────────────────────────────────────────────────────

  return (
    <View
      style={[styles.container, { backgroundColor: tokens.bgSecondary }]}
      accessibilityLabel="Topic balance chart"
    >
      <Text style={[styles.title, { color: tokens.textPrimary }]}>
        Topic Balance
      </Text>

      <View style={styles.body}>
        {/* Donut */}
        <View style={styles.chartWrapper}>
          <VictoryPie
            data={pieData}
            colorScale={pieColorScale}
            innerRadius={55}
            padAngle={2}
            labels={() => null}          // no per-slice labels
            theme={VictoryTheme.material}
            width={160}
            height={160}
            style={{ parent: { overflow: 'visible' } }}
            animate={{ duration: 500, onLoad: { duration: 500 } }}
          />
          {/* Centre label */}
          <View style={[styles.centerLabel, { pointerEvents: 'none' }]}>
            <Text style={[styles.centerValue, { color: tokens.textPrimary }]}>
              {minutesToLabel(totalMinutes)}
            </Text>
            <Text style={[styles.centerSub, { color: tokens.textMuted }]}>
              total time
            </Text>
          </View>
        </View>

        {/* Legend with proportion bars */}
        <View style={styles.legend}>
          {segments.map((seg) => {
            const pct = totalMinutes > 0
              ? Math.round((seg.minutes / totalMinutes) * 100)
              : 0
            return (
              <View key={seg.name} style={styles.legendRow}>
                <View style={styles.legendNameRow}>
                  <View
                    style={[styles.legendDot, { backgroundColor: seg.color }]}
                  />
                  <Text
                    style={[styles.legendName, { color: tokens.textPrimary }]}
                    numberOfLines={1}
                  >
                    {seg.name}
                  </Text>
                  <Text
                    style={[styles.legendPct, { color: seg.color }]}
                  >
                    {pct}%
                  </Text>
                </View>
                {/* Proportion bar */}
                <View
                  style={[
                    styles.barTrack,
                    { backgroundColor: tokens.borderPrimary },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      { width: `${pct}%`, backgroundColor: seg.color },
                    ]}
                  />
                </View>
              </View>
            )
          })}
        </View>
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
    marginBottom: 16,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  chartWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  centerSub: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    gap: 3,
  },
  legendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    flexShrink: 0,
  },
  legendName: {
    fontSize: 12,
    flex: 1,
    minWidth: 0,
  },
  legendPct: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 0,
  },
  barTrack: {
    height: 3,
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
  },
})
