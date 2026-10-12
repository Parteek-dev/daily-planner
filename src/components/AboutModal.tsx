/**
 * AboutModal.tsx — app information and feature guide overlay.
 *
 * Migrated from frontend/src/components/AboutModal.jsx.
 * All HTML elements replaced with RN primitives; Modal used as overlay;
 * CSS grid replaced with View flexWrap; <ul>/<li> replaced with Text bullets;
 * all CSS replaced with StyleSheet.create() using theme tokens.
 *
 * Requirements: N/A (informational modal)
 */

import React from 'react'
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native'
import {
  X,
  Info,
  Flame,
  Target,
  Zap,
  Clock,
  BarChart3,
  Calendar,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  tokens: ReturnType<typeof useTheme>['tokens']
}

function Section({ icon, title, description, children, tokens }: SectionProps) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        {icon}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: tokens.textPrimary }}>{title}</Text>
          <Text style={{ fontSize: 12, color: tokens.textMuted }}>{description}</Text>
        </View>
      </View>
      <View style={{ marginLeft: 28 }}>
        {children}
      </View>
    </View>
  )
}

interface ScoreItemProps {
  label: string
  points: string
  description: string
  tokens: ReturnType<typeof useTheme>['tokens']
}

function ScoreItem({ label, points, description, tokens }: ScoreItemProps) {
  return (
    <View style={[scoreItemStyles.row, { borderBottomColor: tokens.borderPrimary }]}>
      <View>
        <Text style={{ fontSize: 13, fontWeight: '500', color: tokens.textPrimary }}>{label}</Text>
        <Text style={{ fontSize: 11, color: tokens.textMuted, marginLeft: 8 }}>{description}</Text>
      </View>
      <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.accentBlue }}>{points} pts</Text>
    </View>
  )
}
const scoreItemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
})

interface LevelBadgeProps {
  name: string
  range: string
  color: string
}

function LevelBadge({ name, range, color }: LevelBadgeProps) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontWeight: '600', color, fontSize: 12 }}>{name}</Text>
      <Text style={{ fontSize: 11, color: '#9ca3af' }}>{range}</Text>
    </View>
  )
}

interface PriorityBadgeProps {
  label: string
  color: string
}

function PriorityBadge({ label, color }: PriorityBadgeProps) {
  return (
    <View style={[priorityStyles.badge, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
      <Text style={{ fontSize: 12, fontWeight: '500', color }}>{label}</Text>
    </View>
  )
}
const priorityStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
})

interface ShortcutItemProps {
  keys: string
  action: string
  tokens: ReturnType<typeof useTheme>['tokens']
}

function ShortcutItem({ keys, action, tokens }: ShortcutItemProps) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <View style={[shortcutStyles.kbd, { backgroundColor: tokens.bgInput, borderColor: tokens.borderPrimary }]}>
        <Text style={{ fontSize: 11, color: tokens.textPrimary, fontFamily: 'monospace' }}>{keys}</Text>
      </View>
      <Text style={{ fontSize: 12, color: tokens.textMuted }}>{action}</Text>
    </View>
  )
}
const shortcutStyles = StyleSheet.create({
  kbd: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
})

// ── Main component ────────────────────────────────────────────────────────────

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.panel, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}
          onPress={e => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Info size={22} color={tokens.accentBlue} />
              <Text style={[styles.panelTitle, { color: tokens.textPrimary }]}>About Daily Planner</Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Close">
              <X size={20} color={tokens.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Productivity Score */}
            <Section icon={<Zap size={18} color="#f59e0b" />} title="Productivity Score" description="Your overall productivity rating out of 100 points" tokens={tokens}>
              <ScoreItem label="Streaks" points="40" description="4 points per streak day (max 40)" tokens={tokens} />
              <ScoreItem label="Completion" points="30" description="Based on overall task completion %" tokens={tokens} />
              <ScoreItem label="Goals" points="30" description="Days you met daily goal in last 7 days" tokens={tokens} />
              <View style={[styles.levelGrid, { backgroundColor: tokens.bgInput }]}>
                <Text style={[styles.levelsLabel, { color: tokens.textSecondary }]}>Levels:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
                  <LevelBadge name="Beginner" range="0-19" color={tokens.textMuted} />
                  <LevelBadge name="Apprentice" range="20-39" color="#22c55e" />
                  <LevelBadge name="Intermediate" range="40-59" color="#3b82f6" />
                  <LevelBadge name="Expert" range="60-79" color="#a855f7" />
                  <LevelBadge name="Master" range="80-100" color="#eab308" />
                </View>
              </View>
            </Section>

            {/* Streaks */}
            <Section icon={<Flame size={18} color="#f97316" />} title="Daily Streak" description="Consecutive days with at least one completed task" tokens={tokens}>
              <Text style={[styles.bodyText, { color: tokens.textSecondary }]}>
                Complete at least <Text style={{ fontWeight: '700' }}>1 task per day</Text> to maintain your streak.{' '}
                Missing a day resets your current streak to 0. Your best streak is saved for reference.
              </Text>
            </Section>

            {/* Daily Goal */}
            <Section icon={<Target size={18} color="#22c55e" />} title="Daily Goal" description="Set a target number of tasks to complete each day" tokens={tokens}>
              <Text style={[styles.bodyText, { color: tokens.textSecondary }]}>
                Default goal is <Text style={{ fontWeight: '700' }}>3 tasks per day</Text>. Tap "Edit" to change it.{' '}
                Meeting your daily goal contributes to your productivity score.
              </Text>
            </Section>

            {/* Activity Heatmap */}
            <Section icon={<Calendar size={18} color="#3b82f6" />} title="Activity Heatmap" description="Visual representation of your task completions over 60 days" tokens={tokens}>
              <Text style={[styles.bodyText, { color: tokens.textSecondary }]}>
                Each cell represents one day. Darker colors indicate more tasks completed that day.
              </Text>
              <View style={styles.heatmapLegend}>
                <Text style={{ fontSize: 11, color: tokens.textMuted }}>Less</Text>
                {[tokens.bgInput, '#1e3a5f', '#1d4ed8', '#3b82f6', '#60a5fa'].map((color, i) => (
                  <View key={i} style={[styles.heatCell, { backgroundColor: color }]} />
                ))}
                <Text style={{ fontSize: 11, color: tokens.textMuted }}>More</Text>
              </View>
            </Section>

            {/* Time Tracking */}
            <Section icon={<Clock size={18} color="#8b5cf6" />} title="Time Tracking" description="Compare estimated vs actual time spent on tasks" tokens={tokens}>
              <Text style={[styles.bodyText, { color: tokens.textSecondary }]}>
                When you complete tasks in <Text style={{ fontWeight: '700' }}>Focus Mode</Text>, the actual time spent is recorded.
                Accuracy shows how close your estimates are to reality.
              </Text>
              <View style={{ gap: 4, marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: tokens.textMuted }}>
                  <Text style={{ color: tokens.accentGreen, fontWeight: '700' }}>Finished Early: </Text>
                  Actual &lt; Estimated (overestimated)
                </Text>
                <Text style={{ fontSize: 12, color: tokens.textMuted }}>
                  <Text style={{ color: tokens.accentBlue, fontWeight: '700' }}>On Target: </Text>
                  Within 10% of estimate
                </Text>
                <Text style={{ fontSize: 12, color: tokens.textMuted }}>
                  <Text style={{ color: tokens.accentOrange, fontWeight: '700' }}>Took Longer: </Text>
                  Actual &gt; Estimated (underestimated)
                </Text>
              </View>
            </Section>

            {/* Best Hours */}
            <Section icon={<TrendingUp size={18} color="#ec4899" />} title="Best Hours Analysis" description="Discover when you're most productive" tokens={tokens}>
              <Text style={[styles.bodyText, { color: tokens.textSecondary }]}>
                Based on the time you complete tasks, the app identifies your peak productivity hours.
              </Text>
              <View style={{ gap: 4, marginTop: 8 }}>
                {[
                  ['Morning', '6 AM - 12 PM'],
                  ['Afternoon', '12 PM - 6 PM'],
                  ['Evening', '6 PM - 12 AM'],
                  ['Night', '12 AM - 6 AM'],
                ].map(([period, range]) => (
                  <Text key={period} style={{ fontSize: 12, color: tokens.textMuted }}>
                    <Text style={{ fontWeight: '700' }}>{period}: </Text>{range}
                  </Text>
                ))}
              </View>
            </Section>

            {/* Topic Balance */}
            <Section icon={<BarChart3 size={18} color="#14b8a6" />} title="Topic Balance" description="Visualize how your time is distributed across topics" tokens={tokens}>
              <Text style={[styles.bodyText, { color: tokens.textSecondary }]}>
                The chart shows time allocation. Suggestions appear when:
              </Text>
              <View style={{ gap: 4, marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: tokens.textMuted }}>
                  <Text style={{ fontWeight: '700' }}>Dominant: </Text>One topic takes &gt;50% of time
                </Text>
                <Text style={{ fontSize: 12, color: tokens.textMuted }}>
                  <Text style={{ fontWeight: '700' }}>Neglected: </Text>A topic has &lt;10% of time (with 2+ tasks)
                </Text>
                <Text style={{ fontSize: 12, color: tokens.textMuted }}>
                  <Text style={{ fontWeight: '700' }}>Low Completion: </Text>Topic has &lt;50% completion rate
                </Text>
              </View>
            </Section>

            {/* Task Priority */}
            <Section icon={<CheckCircle2 size={18} color="#ef4444" />} title="Task Priority" description="Organize tasks by importance" tokens={tokens}>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <PriorityBadge label="High" color="#ef4444" />
                <PriorityBadge label="Medium" color="#f97316" />
                <PriorityBadge label="Low" color="#22c55e" />
              </View>
            </Section>

            {/* Keyboard Shortcuts */}
            <Section icon={<Info size={18} color={tokens.textMuted} />} title="Keyboard Shortcuts" description="Quick actions for power users (web)" tokens={tokens}>
              <Text style={[styles.groupLabel, { color: tokens.textMuted }]}>Navigation</Text>
              <View style={styles.shortcutGrid}>
                <ShortcutItem keys="D" action="Dashboard" tokens={tokens} />
                <ShortcutItem keys="T" action="Today" tokens={tokens} />
                <ShortcutItem keys="W" action="Week" tokens={tokens} />
                <ShortcutItem keys="C" action="Calendar" tokens={tokens} />
              </View>
              <Text style={[styles.groupLabel, { color: tokens.textMuted }]}>Tasks</Text>
              <View style={styles.shortcutGrid}>
                <ShortcutItem keys="N" action="New task" tokens={tokens} />
                <ShortcutItem keys="P" action="Pomodoro" tokens={tokens} />
                <ShortcutItem keys="Ctrl+Z" action="Undo" tokens={tokens} />
                <ShortcutItem keys="Ctrl+Y" action="Redo" tokens={tokens} />
              </View>
              <Text style={[styles.groupLabel, { color: tokens.textMuted }]}>General</Text>
              <View style={styles.shortcutGrid}>
                <ShortcutItem keys="Ctrl+/" action="Search" tokens={tokens} />
                <ShortcutItem keys="?" action="Shortcuts" tokens={tokens} />
                <ShortcutItem keys="Esc" action="Close" tokens={tokens} />
              </View>
            </Section>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: tokens.borderPrimary }]}>
              <Text style={{ fontSize: 12, color: tokens.textMuted, textAlign: 'center' }}>
                Daily Planner v1.0
              </Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Styles factory ────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    panel: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingTop: 16,
      maxHeight: '90%',
      borderWidth: 1,
      borderBottomWidth: 0,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    panelTitle: {
      fontSize: 20,
      fontWeight: '700',
    },
    bodyText: {
      fontSize: 13,
      lineHeight: 20,
    },
    levelGrid: {
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
    },
    levelsLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
    },
    heatmapLegend: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
      alignItems: 'center',
    },
    heatCell: {
      width: 16,
      height: 16,
      borderRadius: 3,
    },
    groupLabel: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 6,
      marginTop: 10,
    },
    shortcutGrid: {
      gap: 2,
    },
    footer: {
      marginTop: 24,
      paddingTop: 16,
      borderTopWidth: 1,
      paddingBottom: 8,
    },
  })
}
