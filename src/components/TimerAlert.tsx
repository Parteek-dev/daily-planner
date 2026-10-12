/**
 * TimerAlert.tsx — Pomodoro phase-complete toast overlay.
 *
 * Migrated from frontend/src/components/TimerAlert.jsx.
 * All HTML elements replaced with RN primitives; CSS animation
 * (translateY slide-up + fade) replaced with react-native-reanimated
 * `useSharedValue` + `withTiming`/`withSpring`. Backdrop and panel
 * positioned absolutely using RN `Modal`. All CSS replaced with
 * StyleSheet.create() using theme tokens.
 *
 * Requirements: 11.5, 11.6
 */

import React, { useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  AccessibilityInfo,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated'
import { X, Play, Brain, Coffee, Armchair } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AlertType = 'workDone' | 'longBreakEarned' | 'breakDone'

export interface TimerAlertData {
  type: AlertType
  sessions: number
  nextMode: string
  nextMinutes: number
}

export interface TimerAlertProps {
  alert: TimerAlertData | null
  onDismiss: () => void
  onStart: () => void
}

// ── Alert config ──────────────────────────────────────────────────────────────

interface AlertConfig {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  accent: string
  title: string
  subtitle: (alert: TimerAlertData) => string
  message: (alert: TimerAlertData) => string
  nextLabel: (alert: TimerAlertData) => string
}

function buildConfig(tokens: ReturnType<typeof useTheme>['tokens']): Record<AlertType, AlertConfig> {
  return {
    workDone: {
      icon: <Coffee size={22} color="#22c55e" />,
      iconBg: 'rgba(34,197,94,0.15)',
      iconColor: '#22c55e',
      accent: '#22c55e',
      title: 'Focus session complete! ☕',
      subtitle: (a) => `Session ${a.sessions} of 4 done`,
      message: (a) => `Time for a ${a.nextMinutes}-min break — step away and recharge.`,
      nextLabel: (a) => `Start ${a.nextMinutes}-min Break`,
    },
    longBreakEarned: {
      icon: <Armchair size={22} color="#a855f7" />,
      iconBg: 'rgba(168,85,247,0.15)',
      iconColor: '#a855f7',
      accent: '#a855f7',
      title: 'Long break earned! 🛋️',
      subtitle: (a) => `${a.sessions} sessions completed`,
      message: (a) => `You finished a full cycle! Take a well-deserved ${a.nextMinutes}-min break.`,
      nextLabel: (a) => `Start ${a.nextMinutes}-min Long Break`,
    },
    breakDone: {
      icon: <Brain size={22} color={tokens.accentBlue} />,
      iconBg: 'rgba(59,130,246,0.15)',
      iconColor: tokens.accentBlue,
      accent: tokens.accentBlue,
      title: "Break over — let's go! 🧠",
      subtitle: (a) => `${a.sessions} session${a.sessions !== 1 ? 's' : ''} done today`,
      message: (a) => `Ready for another ${a.nextMinutes}-min focus sprint?`,
      nextLabel: (a) => `Start ${a.nextMinutes}-min Focus`,
    },
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TimerAlert({ alert, onDismiss, onStart }: TimerAlertProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  const configs = buildConfig(tokens)

  const translateY = useSharedValue(32)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (alert) {
      AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
        if (reduced) {
          translateY.value = 0
          opacity.value = 1
        } else {
          translateY.value = withSpring(0, { damping: 14, stiffness: 200 })
          opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
        }
      })
    } else {
      translateY.value = withTiming(32, { duration: 200 })
      opacity.value = withTiming(0, { duration: 200 })
    }
  }, [alert])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  if (!alert) return null

  const c = configs[alert.type] ?? configs.workDone
  const sessionInCycle = (alert.sessions % 4) || 4

  return (
    <Modal
      visible={!!alert}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Backdrop — semi-transparent, tappable to dismiss */}
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      {/* Toast panel — bottom-right */}
      <Animated.View
        style={[styles.toast, { backgroundColor: tokens.bgSecondary, borderColor: `${c.accent}40` }, animatedStyle]}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        {/* Accent bar at top */}
        <View style={[styles.accentBar, { backgroundColor: c.accent }]} />

        <View style={styles.toastBody}>
          {/* Header row */}
          <View style={styles.headerRow}>
            {/* Icon */}
            <View style={[styles.iconWrapper, { backgroundColor: c.iconBg }]}>
              {c.icon}
            </View>

            {/* Text */}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.toastTitle, { color: tokens.textPrimary }]}>{c.title}</Text>
              <Text style={[styles.toastSubtitle, { color: tokens.textMuted }]}>{c.subtitle(alert)}</Text>
            </View>

            {/* Close */}
            <Pressable
              onPress={onDismiss}
              style={styles.closeBtn}
              accessibilityLabel="Dismiss alert"
              accessibilityRole="button"
            >
              <X size={16} color={tokens.textMuted} />
            </Pressable>
          </View>

          {/* Message */}
          <View style={[styles.messageBox, { backgroundColor: tokens.bgInput }]}>
            <Text style={[styles.messageText, { color: tokens.textSecondary }]}>{c.message(alert)}</Text>
          </View>

          {/* Session cycle dots */}
          <View style={styles.dotsRow}>
            <Text style={[styles.cycleLabel, { color: tokens.textMuted }]}>Cycle</Text>
            {Array.from({ length: 4 }).map((_, i) => {
              const filled = i < sessionInCycle
              return (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      width: filled ? 20 : 8,
                      backgroundColor: filled ? c.accent : tokens.bgInput,
                    },
                  ]}
                />
              )
            })}
            <Text style={[styles.cycleLabel, { color: tokens.textMuted }]}>{sessionInCycle}/4</Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={onStart}
              style={[styles.startBtn, { backgroundColor: c.accent }]}
              accessibilityRole="button"
              accessibilityLabel={c.nextLabel(alert)}
            >
              <Play size={14} color="#fff" />
              <Text style={styles.startBtnText}>{c.nextLabel(alert)}</Text>
            </Pressable>
            <Pressable
              onPress={onDismiss}
              style={[styles.dismissBtn, { borderColor: tokens.borderPrimary }]}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            >
              <Text style={[styles.dismissBtnText, { color: tokens.textSecondary }]}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Modal>
  )
}

// ── Styles factory ────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.15)',
    },
    toast: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 320,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      // Shadow
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20 },
        android: { elevation: 12 },
        web: { boxShadow: '0 8px 20px rgba(0,0,0,0.25)' },
      }),
    },
    accentBar: {
      height: 3,
    },
    toastBody: {
      padding: 16,
      paddingBottom: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12,
    },
    iconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 12,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toastTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2,
    },
    toastSubtitle: {
      fontSize: 12,
    },
    closeBtn: {
      padding: 2,
      flexShrink: 0,
    },
    messageBox: {
      padding: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 14,
    },
    messageText: {
      fontSize: 13,
      lineHeight: 20,
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 14,
    },
    cycleLabel: {
      fontSize: 11,
    },
    dot: {
      height: 8,
      borderRadius: 4,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    startBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 9,
    },
    startBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600',
    },
    dismissBtn: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 9,
      borderWidth: 1,
    },
    dismissBtnText: {
      fontSize: 13,
    },
  })
}
