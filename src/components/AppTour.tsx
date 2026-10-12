/**
 * AppTour — step-by-step onboarding overlay.
 *
 * Port of frontend/src/components/AppTour.jsx to React Native.
 *
 * Key adaptations:
 * - CSS-selector spotlight replaced with a simplified centered Modal overlay.
 *   RN has no DOM queryselect mechanism; the popover floats centred on screen.
 * - `navigate` prop now accepts an `expo-router` `useRouter()` ref (via a
 *   callback type so callers can pass `router.push`).
 * - `localStorage.setItem('app_tour_completed', …)` replaced with AsyncStorage.
 * - Tour step descriptions that used JSX nodes with inline SVGs are simplified
 *   to plain text strings that are equivalent for RN.
 * - All tour steps and descriptions are preserved verbatim.
 *
 * Requirements: 20.1
 */

import React, { useCallback, useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  BarChart2,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns2,
  Compass,
  Flame,
  LayoutDashboard,
  MapPin,
  Mic,
  PartyPopper,
  Repeat2 as Layers,
  Settings,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react-native'
import type { LucideProps } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'

export const TOUR_COMPLETED_KEY = 'app_tour_completed'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppTourProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onComplete?: () => void
  /** Call with route strings to navigate between screens during the tour */
  readonly navigate?: (route: string) => void
}

// ── Tour step definitions (content preserved from web version) ────────────────

interface TourStep {
  id: string
  title: string
  description: string
  Icon: React.ComponentType<LucideProps>
  iconColor: string
  route?: string
}

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Daily Planner',
    description:
      'This quick tour walks you through every key feature. It only takes a minute — and you can relaunch it any time from Settings.',
    Icon: Compass,
    iconColor: '#3b82f6',
  },
  {
    id: 'nav-dashboard',
    title: 'Dashboard',
    description:
      'Your productivity HQ. It surfaces stats, charts, and insights all in one place so you never lose sight of the big picture.',
    Icon: LayoutDashboard,
    iconColor: '#3b82f6',
    route: '/',
  },
  {
    id: 'dashboard-stats',
    title: 'Daily Stats Cards',
    description:
      "Three cards show today's goal progress ring, your current & best streak, and total time invested across all completed tasks.",
    Icon: Target,
    iconColor: '#3b82f6',
    route: '/',
  },
  {
    id: 'dashboard-heatmap',
    title: 'Activity Heatmap',
    description:
      'A GitHub-style heatmap of every day you completed tasks. Darker squares = more tasks done. Great for spotting consistency patterns over time.',
    Icon: Flame,
    iconColor: '#f97316',
    route: '/',
  },
  {
    id: 'dashboard-goals',
    title: 'Goals & Productivity Score',
    description:
      'Set a daily task target and optional topic-specific goals. The Productivity Score (0–100) grades your streaks, completion rate, and goal achievement.',
    Icon: TrendingUp,
    iconColor: '#22c55e',
    route: '/',
  },
  {
    id: 'dashboard-analytics',
    title: 'Analytics & Insights',
    description:
      "Three deep-dive charts: Time Tracking (estimated vs actual), Best Hours (when you're most productive), and Topic Balance (are you neglecting anything?).",
    Icon: Clock,
    iconColor: '#8b5cf6',
    route: '/',
  },
  {
    id: 'dashboard-chart',
    title: 'Tasks Completed — Last 30 Days',
    description:
      'A line chart of how many tasks you finished each day over the past month. Spot your productive streaks and quiet spells at a glance.',
    Icon: TrendingUp,
    iconColor: '#3b82f6',
    route: '/',
  },
  {
    id: 'dashboard-bottom',
    title: 'Topics & Recent Completions',
    description:
      'Topic breakdown shows completion % per subject so you can see where your effort goes. Recent Completions is a live feed of your latest wins.',
    Icon: Layers,
    iconColor: '#22c55e',
    route: '/',
  },
  {
    id: 'nav-today',
    title: 'Today',
    description:
      "Your daily focus. See today's tasks in order, start Focus Mode on any one, and track actual vs estimated time.",
    Icon: Sparkles,
    iconColor: '#f97316',
    route: '/(tabs)/today',
  },
  {
    id: 'nav-week',
    title: 'Week View',
    description:
      'See all 7 days side-by-side in a kanban-style layout. Tap a day column to expand its tasks.',
    Icon: Columns2,
    iconColor: '#8b5cf6',
    route: '/(tabs)/week',
  },
  {
    id: 'nav-calendar',
    title: 'Calendar',
    description:
      'A full monthly calendar with inline task counts per day. Tap any date to jump straight to it.',
    Icon: CalendarDays,
    iconColor: '#22c55e',
    route: '/(tabs)/calendar',
  },
  {
    id: 'pomodoro',
    title: 'Pomodoro Timer',
    description:
      'Built-in Pomodoro with auto work/break cycling, local notifications, and per-session time logging.',
    Icon: Timer,
    iconColor: '#3b82f6',
  },
  {
    id: 'voice',
    title: 'Voice Input',
    description:
      "Type or dictate a new task. Say something like \"Study React for 45 minutes tomorrow\" and it's parsed automatically into title, date, duration, and priority.",
    Icon: Mic,
    iconColor: '#ec4899',
  },
  {
    id: 'stats',
    title: 'Stats & Reports',
    description:
      'Bar charts, line charts, and a heatmap give you a holistic view of your productivity over any period.',
    Icon: BarChart2,
    iconColor: '#f97316',
  },
  {
    id: 'settings',
    title: 'Settings',
    description:
      'Customise themes & accent colours, configure notifications, export/import your data, manage the archive, and more.',
    Icon: Settings,
    iconColor: '#9ca3af',
  },
  {
    id: 'notes',
    title: 'Daily Notes',
    description:
      "Each day has a private freeform notes area at the bottom of the Today page. Jot down ideas, blockers, or meeting notes that don't need to be tasks.",
    Icon: BookOpen,
    iconColor: '#14b8a6',
    route: '/(tabs)/today',
  },
  {
    id: 'done',
    title: "You're all set!",
    description:
      'Start by adding your first task with the + button on the Today page. Relaunch this tour any time from Settings.',
    Icon: MapPin,
    iconColor: '#22c55e',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppTour({ isOpen, onClose, onComplete, navigate }: AppTourProps) {
  const { tokens } = useTheme()
  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const total = STEPS.length
  const isFirst = step === 0
  const isLast = step === total - 1
  const progress = ((step + 1) / total) * 100

  // Reset to step 0 whenever the tour opens
  useEffect(() => {
    if (isOpen) setStep(0)
  }, [isOpen])

  // Navigate to the step's route when it changes
  useEffect(() => {
    if (!isOpen) return
    if (current.route && navigate) {
      navigate(current.route)
    }
  }, [isOpen, step]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSkip = useCallback(async () => {
    await AsyncStorage.setItem(TOUR_COMPLETED_KEY, 'true').catch(() => { })
    onClose()
  }, [onClose])

  const handleFinish = useCallback(async () => {
    await AsyncStorage.setItem(TOUR_COMPLETED_KEY, 'true').catch(() => { })
    onComplete?.()
    onClose()
  }, [onClose, onComplete])

  const goNext = useCallback(() => {
    if (step < total - 1) setStep(s => s + 1)
    else handleFinish()
  }, [step, total, handleFinish])

  const goPrev = useCallback(() => {
    if (step > 0) setStep(s => s - 1)
  }, [step])

  const styles = makeStyles(tokens)

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      {/* Semi-transparent overlay */}
      <Pressable style={styles.overlay} onPress={handleSkip} accessibilityLabel="Skip tour" />

      {/* Popover card — centred */}
      <View style={[styles.popoverWrap, { pointerEvents: 'box-none' }]}>
        <View
          style={styles.popover}
          accessibilityRole="alert"
          accessibilityLabel={`Tour step ${step + 1} of ${total}: ${current.title}`}
        >
          {/* Icon + close */}
          <View style={styles.popoverHeader}>
            <View style={[styles.iconWrap, { backgroundColor: `${current.iconColor}18` }]}>
              <current.Icon size={20} color={current.iconColor} />
            </View>
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Close tour"
            >
              <X size={15} color={tokens.textMuted} />
            </Pressable>
          </View>

          {/* Scrollable body */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.popoverTitle}>{current.title}</Text>
            <Text style={styles.popoverDesc}>{current.description}</Text>
          </ScrollView>

          {/* Progress + nav */}
          <View style={styles.bottom}>
            {/* Progress bar + counter */}
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.stepCount}>{step + 1} / {total}</Text>
            </View>

            {/* Buttons */}
            <View style={styles.navRow}>
              <Pressable
                onPress={handleSkip}
                style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Skip tour"
              >
                <Text style={styles.skipText}>Skip tour</Text>
              </Pressable>

              <View style={styles.navBtns}>
                {!isFirst && (
                  <Pressable
                    onPress={goPrev}
                    style={({ pressed }) => [styles.prevBtn, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityLabel="Previous step"
                  >
                    <ChevronLeft size={16} color={tokens.textSecondary} />
                    <Text style={styles.prevText}>Back</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={goNext}
                  style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel={isLast ? 'Finish tour' : 'Next step'}
                >
                  {isLast ? (
                    <>
                      <PartyPopper size={15} color="#ffffff" />
                      <Text style={styles.nextText}>Finish</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.nextText}>Next</Text>
                      <ChevronRight size={16} color="#ffffff" />
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    popoverWrap: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    popover: {
      backgroundColor: tokens.bgSecondary,
      borderRadius: 16,
      width: '100%',
      maxWidth: 340,
      overflow: 'hidden',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
        android: { elevation: 8 },
        web: { boxShadow: '0 4px 8px rgba(0,0,0,0.3)' },
      }),
    },
    popoverHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      paddingBottom: 0,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtn: {
      padding: 4,
    },
    body: {
      paddingHorizontal: 16,
      paddingTop: 12,
      maxHeight: 160,
    },
    popoverTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: tokens.textPrimary,
      marginBottom: 8,
    },
    popoverDesc: {
      fontSize: 14,
      color: tokens.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    bottom: {
      padding: 16,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: tokens.borderPrimary,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    progressTrack: {
      flex: 1,
      height: 4,
      backgroundColor: tokens.bgInput,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: 4,
      backgroundColor: tokens.accentBlue,
      borderRadius: 2,
    },
    stepCount: {
      fontSize: 12,
      color: tokens.textMuted,
      flexShrink: 0,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    skipBtn: {
      paddingVertical: 6,
    },
    skipText: {
      fontSize: 13,
      color: tokens.textMuted,
    },
    navBtns: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    prevBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: tokens.bgInput,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
    },
    prevText: {
      fontSize: 13,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    nextBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: tokens.accentBlue,
    },
    nextText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ffffff',
    },
  })
}
