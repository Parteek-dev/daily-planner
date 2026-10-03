/**
 * ProductivityScore.tsx — circular score ring with level badge and breakdown.
 *
 * Requirements: 9.1, 9.2
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { Zap, Flame, Target, CheckCircle2 } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductivityScoreBreakdown {
  streakScore: number
  completionScore: number
  goalScore: number
}

export interface ProductivityScoreProps {
  score: number
  breakdown: ProductivityScoreBreakdown
  level: string
  levelColor: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductivityScore({
  score,
  breakdown,
  level,
  levelColor,
}: ProductivityScoreProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)

  const { streakScore, completionScore, goalScore } = breakdown

  // SVG ring geometry
  const RADIUS = 45
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const strokeDashoffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Zap size={14} color={tokens.textMuted} />
        <Text style={styles.headerText}>Productivity Score</Text>
      </View>

      <View style={styles.body}>
        {/* Score ring */}
        <View style={styles.ringWrapper}>
          <Svg width={100} height={100} style={styles.svg}>
            {/* Background circle */}
            <Circle
              cx={50}
              cy={50}
              r={RADIUS}
              fill="none"
              stroke={tokens.bgInput}
              strokeWidth={8}
            />
            {/* Progress circle */}
            <Circle
              cx={50}
              cy={50}
              r={RADIUS}
              fill="none"
              stroke={levelColor}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
            />
          </Svg>
          {/* Center label */}
          <View style={styles.ringCenter}>
            <Text style={[styles.scoreValue, { color: tokens.textPrimary }]}>{score}</Text>
            <Text style={[styles.scoreMax, { color: tokens.textMuted }]}>/ 100</Text>
          </View>
        </View>

        {/* Level and breakdown */}
        <View style={styles.rightCol}>
          {/* Level badge */}
          <View style={[styles.levelBadge, { backgroundColor: `${levelColor}20` }]}>
            <Zap size={14} color={levelColor} />
            <Text style={[styles.levelText, { color: levelColor }]}>{level}</Text>
          </View>

          {/* Breakdown rows */}
          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <Flame size={14} color={tokens.accentOrange} />
              <Text style={[styles.breakdownLabel, { color: tokens.textSecondary }]}>Streaks</Text>
              <Text style={[styles.breakdownValue, { color: tokens.textPrimary }]}>{streakScore}/40</Text>
            </View>
            <View style={styles.breakdownRow}>
              <CheckCircle2 size={14} color={tokens.accentGreen} />
              <Text style={[styles.breakdownLabel, { color: tokens.textSecondary }]}>Completion</Text>
              <Text style={[styles.breakdownValue, { color: tokens.textPrimary }]}>{completionScore}/30</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Target size={14} color={tokens.accentBlue} />
              <Text style={[styles.breakdownLabel, { color: tokens.textSecondary }]}>Goals</Text>
              <Text style={[styles.breakdownValue, { color: tokens.textPrimary }]}>{goalScore}/30</Text>
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
    card: {
      backgroundColor: tokens.bgSecondary,
      borderRadius: 16,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.borderPrimary,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    headerText: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.textMuted,
      lineHeight: 20,
    },
    body: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 24,
      flexWrap: 'wrap',
    },
    ringWrapper: {
      position: 'relative',
      width: 100,
      height: 100,
      flexShrink: 0,
      alignSelf: 'center',
    },
    svg: {
      transform: [{ rotate: '-90deg' }],
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
    scoreValue: {
      fontSize: 24,
      fontWeight: '700',
    },
    scoreMax: {
      fontSize: 10,
    },
    rightCol: {
      flex: 1,
    },
    levelBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    levelText: {
      fontSize: 13,
      fontWeight: '600',
    },
    breakdown: {
      gap: 8,
    },
    breakdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    breakdownLabel: {
      fontSize: 12,
      flex: 1,
    },
    breakdownValue: {
      fontSize: 12,
      fontWeight: '600',
    },
  })
}
