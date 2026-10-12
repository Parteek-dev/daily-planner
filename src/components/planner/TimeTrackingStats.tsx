/**
 * TimeTrackingStats.tsx — accuracy ring and per-topic time tracking breakdown.
 *
 * Migrated from frontend/src/components/TimeTrackingStats.jsx.
 * All HTML elements replaced with RN primitives; React Router `useNavigate`
 * replaced with expo-router `useRouter`; all CSS replaced with
 * StyleSheet.create() using theme tokens.
 *
 * Requirements: 9.4
 */

import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  ArrowRight,
} from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '@/src/hooks/useTheme'
import { fmtDuration } from '@/src/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TopicTimeData {
  estimated: number
  actual: number
}

export interface TimeTrackingStatsData {
  totalEstimated: number
  totalActual: number
  accuracy: number
  overEstimateCount: number
  underEstimateCount: number
  accurateCount: number
  averageVariance: number
  byTopic: Record<string, TopicTimeData>
  totalTracked: number
}

export interface TimeTrackingStatsProps {
  stats: TimeTrackingStatsData
  getTopicColor: (topic: string) => string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function accuracyVerdict(accuracy: number): { label: string; color: string } {
  if (accuracy >= 90) return { label: 'Excellent estimator', color: '#22c55e' }
  if (accuracy >= 75) return { label: 'Good estimator', color: '#22c55e' }
  if (accuracy >= 60) return { label: 'Getting there', color: '#f97316' }
  return { label: 'Needs calibration', color: '#ef4444' }
}

function varianceLabel(averageVariance: number): string {
  if (averageVariance === 0) return 'Your estimates are spot on!'
  const abs = Math.abs(averageVariance)
  if (averageVariance > 0) return `You typically underestimate by ${abs}m`
  return `You typically finish ${abs}m early`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TimeTrackingStats({ stats, getTopicColor }: TimeTrackingStatsProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  const router = useRouter()

  const {
    totalEstimated,
    totalActual,
    accuracy,
    overEstimateCount,
    underEstimateCount,
    accurateCount,
    averageVariance,
    byTopic,
    totalTracked,
  } = stats

  const accuracyColor =
    accuracy >= 75 ? tokens.accentGreen : accuracy >= 60 ? tokens.accentOrange : tokens.accentRed
  const verdict = accuracyVerdict(accuracy)

  // Ring geometry
  const RADIUS = 34
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const dashOffset = CIRCUMFERENCE * (1 - accuracy / 100)

  if (totalTracked === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Clock size={16} color={tokens.accentBlue} />
          <Text style={[styles.cardTitle, { color: tokens.textSecondary }]}>Time Tracking</Text>
        </View>

        <View style={[styles.emptyBox, { backgroundColor: tokens.bgInput }]}>
          <Clock size={28} color={tokens.textMuted} strokeWidth={1.5} />
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={[styles.emptyTitle, { color: tokens.textPrimary }]}>No tracking data yet</Text>
            <Text style={[styles.emptyDesc, { color: tokens.textMuted }]}>
              Use Focus Mode to time your tasks. You'll see if your estimates are realistic.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/today')}
            style={[styles.ctaBtn, { backgroundColor: tokens.accentBlue }]}
            accessibilityLabel="Start Focus Mode"
            accessibilityRole="button"
          >
            <Text style={styles.ctaBtnText}>Start Focus Mode</Text>
            <ArrowRight size={14} color="#fff" />
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Clock size={16} color={tokens.accentBlue} />
        <Text style={[styles.cardTitle, { color: tokens.textSecondary }]}>Time Tracking</Text>
        <Text style={[styles.trackedCount, { color: tokens.textMuted }]}>{totalTracked} tasks tracked</Text>
      </View>

      {/* Accuracy ring */}
      <View style={styles.ringRow}>
        <View style={styles.ringWrapper}>
          <Svg width={80} height={80} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={40} cy={40} r={RADIUS} fill="none" stroke={tokens.bgInput} strokeWidth={8} />
            <Circle
              cx={40} cy={40} r={RADIUS} fill="none"
              stroke={accuracyColor} strokeWidth={8} strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringLabel, { color: accuracyColor }]}>{accuracy}%</Text>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.verdictTitle, { color: verdict.color }]}>{verdict.label}</Text>
          <Text style={[styles.verdictDesc, { color: tokens.textMuted }]}>{varianceLabel(averageVariance)}</Text>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: tokens.textMuted }]}>
              Estimated: <Text style={{ color: tokens.textPrimary, fontWeight: '700' }}>{fmtDuration(totalEstimated)}</Text>
            </Text>
            <Text style={[styles.totalLabel, { color: tokens.textMuted }]}>
              Actual: <Text style={{ color: tokens.textPrimary, fontWeight: '700' }}>{fmtDuration(totalActual)}</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Breakdown boxes */}
      <View style={styles.breakdownRow}>
        <View style={[styles.breakdownBox, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
          <TrendingDown size={16} color={tokens.accentGreen} />
          <Text style={[styles.breakdownNum, { color: tokens.accentGreen }]}>{overEstimateCount}</Text>
          <Text style={[styles.breakdownLabel, { color: tokens.textMuted }]}>Finished Early</Text>
        </View>
        <View style={[styles.breakdownBox, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
          <Target size={16} color={tokens.accentBlue} />
          <Text style={[styles.breakdownNum, { color: tokens.accentBlue }]}>{accurateCount}</Text>
          <Text style={[styles.breakdownLabel, { color: tokens.textMuted }]}>On Target</Text>
        </View>
        <View style={[styles.breakdownBox, { backgroundColor: 'rgba(249,115,22,0.1)' }]}>
          <TrendingUp size={16} color={tokens.accentOrange} />
          <Text style={[styles.breakdownNum, { color: tokens.accentOrange }]}>{underEstimateCount}</Text>
          <Text style={[styles.breakdownLabel, { color: tokens.textMuted }]}>Took Longer</Text>
        </View>
      </View>

      {/* By topic */}
      {Object.keys(byTopic).length > 0 && (
        <View>
          <Text style={[styles.sectionSubtitle, { color: tokens.textSecondary }]}>By Topic</Text>
          <View style={{ gap: 8 }}>
            {Object.entries(byTopic).map(([topic, data]) => {
              const delta = data.actual - data.estimated
              const deltaAbs = Math.abs(delta)
              const deltaLabel =
                delta === 0 ? 'spot on' : delta > 0 ? `+${deltaAbs}m over` : `-${deltaAbs}m under`
              const deltaColor =
                delta === 0 ? tokens.accentGreen : delta > 0 ? tokens.accentOrange : tokens.accentGreen

              return (
                <View key={topic} style={styles.topicRow}>
                  <View style={[styles.topicDot, { backgroundColor: getTopicColor(topic) }]} />
                  <Text style={[styles.topicName, { color: tokens.textPrimary }]}>{topic}</Text>
                  <Text style={[styles.topicTimes, { color: tokens.textMuted }]}>
                    {fmtDuration(data.estimated)} → {fmtDuration(data.actual)}
                  </Text>
                  <Text style={[styles.topicDelta, { color: deltaColor }]}>{deltaLabel}</Text>
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
      padding: 20,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
    },
    trackedCount: {
      fontSize: 11,
      fontWeight: '400',
    },
    emptyBox: {
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 4,
    },
    emptyDesc: {
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      maxWidth: 220,
    },
    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 8,
    },
    ctaBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#fff',
    },
    ringRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
      marginBottom: 20,
      flexWrap: 'wrap',
    },
    ringWrapper: {
      position: 'relative',
      width: 80,
      height: 80,
      flexShrink: 0,
      alignSelf: 'center',
    },
    ringCenter: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringLabel: {
      fontSize: 20,
      fontWeight: '700',
    },
    verdictTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2,
    },
    verdictDesc: {
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 8,
    },
    totalRow: {
      flexDirection: 'row',
      gap: 12,
      flexWrap: 'wrap',
    },
    totalLabel: {
      fontSize: 11,
    },
    breakdownRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    breakdownBox: {
      flex: 1,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
      gap: 4,
    },
    breakdownNum: {
      fontSize: 18,
      fontWeight: '700',
    },
    breakdownLabel: {
      fontSize: 10,
    },
    sectionSubtitle: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 10,
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    topicDot: {
      width: 10,
      height: 10,
      borderRadius: 3,
      flexShrink: 0,
    },
    topicName: {
      fontSize: 12,
      flex: 1,
      minWidth: 60,
    },
    topicTimes: {
      fontSize: 11,
    },
    topicDelta: {
      fontSize: 11,
      fontWeight: '600',
      minWidth: 60,
      textAlign: 'right',
    },
  })
}
