/**
 * Pomodoro Timer modal — compact design matching the original web app.
 *
 * Header: Timer icon + "Focus Timer" title + Info (ℹ) / Sound / Settings (⚙) / Close (×)
 * Info panel:   "The Pomodoro Technique" explanation (toggleable)
 * Settings panel: Work / Break / Long minute inputs (toggleable)
 * Mode badge:   colored pill (Focus Time / Short Break / Long Break)
 * Timer ring:   SVG circular progress with large MM:SS inside
 * Controls:     Reset (↺) + Start/Pause (main) + Skip (→)
 * Footer:       Sessions completed + long-break cadence hint
 *
 * Requirements: 11.1–11.8
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  TextInput,
  PanResponder,
  Modal,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Audio } from 'expo-av'
import {
  Timer,
  Info,
  Volume2,
  VolumeX,
  Settings,
  X,
  Play,
  Pause,
  RotateCcw,
  Brain,
  Coffee,
  Armchair,
  Link,
  Minimize2,
  Maximize2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native'

import { usePomodoroMini } from '@/src/context/PomodoroMiniContext'
import { useAuth } from '@/src/hooks/useAuth'
import { useProgress } from '@/src/hooks/useProgress'
import { useTheme } from '@/src/hooks/useTheme'

import TimerAlert from '@/src/components/TimerAlert'

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

const MODE_CONFIG = {
  work: {
    label: 'Focus Time',
    color: '#3b82f6',
    icon: Brain,
  },
  break: {
    label: 'Short Break',
    color: '#22c55e',
    icon: Coffee,
  },
  longBreak: {
    label: 'Long Break',
    color: '#a855f7',
    icon: Armchair,
  },
} as const

// ── Number stepper input with scroll/swipe support ─────────────────────────────

function MinuteInput({
  label,
  value,
  onChange,
  tokens,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  tokens: ReturnType<typeof useTheme>['tokens']
}) {
  const wrapperRef = useRef<View>(null)
  const valueRef = useRef(value)

  // Keep ref in sync with value for pan responder
  useEffect(() => {
    valueRef.current = value
  }, [value])

  // Handle wheel scroll to increment/decrement value (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return

    const node = wrapperRef.current as any
    if (!node) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -1 : 1
      const newValue = Math.max(1, Math.min(120, valueRef.current + delta))
      if (newValue !== valueRef.current) onChange(newValue)
    }

    node.addEventListener?.('wheel', handleWheel, { passive: false })
    return () => node.removeEventListener?.('wheel', handleWheel)
  }, [onChange])

  // Pan responder for mobile swipe gestures
  const panResponder = useMemo(() => {
    let lastValue = value
    let accumulatedDelta = 0
    const SWIPE_THRESHOLD = 15

    return PanResponder.create({
      onStartShouldSetPanResponder: () => Platform.OS !== 'web',
      onMoveShouldSetPanResponder: (_, gesture) =>
        Platform.OS !== 'web' && Math.abs(gesture.dy) > 5,
      onPanResponderGrant: () => {
        lastValue = valueRef.current
        accumulatedDelta = 0
      },
      onPanResponderMove: (_, gesture) => {
        const deltaY = -gesture.dy
        accumulatedDelta = deltaY
        const steps = Math.floor(accumulatedDelta / SWIPE_THRESHOLD)
        const newValue = Math.max(1, Math.min(120, lastValue + steps))
        if (newValue !== valueRef.current) {
          onChange(newValue)
        }
      },
      onPanResponderRelease: () => {
        accumulatedDelta = 0
      },
    })
  }, [onChange])

  const increment = useCallback(() => {
    const newValue = Math.min(120, value + 1)
    if (newValue !== value) onChange(newValue)
  }, [value, onChange])

  const decrement = useCallback(() => {
    const newValue = Math.max(1, value - 1)
    if (newValue !== value) onChange(newValue)
  }, [value, onChange])

  return (
    <View style={inputStyles.wrapper}>
      <Text style={[inputStyles.label, { color: tokens.textMuted }]}>{label}</Text>
      <View style={inputStyles.stepperContainer}>
        {/* Increment button */}
        <Pressable
          onPress={increment}
          style={inputStyles.stepperBtn}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
        >
          <ChevronUp size={18} color={tokens.textMuted} />
        </Pressable>

        {/* Input with swipe support */}
        <View
          ref={wrapperRef}
          {...panResponder.panHandlers}
          style={[
            inputStyles.inputWrapper,
            {
              backgroundColor: tokens.bgSecondary,
              borderColor: tokens.borderPrimary,
            },
            Platform.OS === 'web' ? ({ cursor: 'ns-resize' } as any) : {},
          ]}
        >
          <TextInput
            value={String(value)}
            onChangeText={t => {
              const n = parseInt(t, 10)
              if (!isNaN(n) && n >= 1 && n <= 120) onChange(n)
            }}
            keyboardType="number-pad"
            style={[
              inputStyles.input,
              { color: tokens.textPrimary },
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
            ]}
            maxLength={3}
            accessibilityLabel={`${label} minutes`}
          />
        </View>

        {/* Decrement button */}
        <Pressable
          onPress={decrement}
          style={inputStyles.stepperBtn}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
        >
          <ChevronDown size={18} color={tokens.textMuted} />
        </Pressable>
      </View>
    </View>
  )
}

const inputStyles = StyleSheet.create({
  wrapper: { flex: 1, alignItems: 'center', gap: 6 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  stepperContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: '100%',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
  },
  input: {
    width: '100%',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
})

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function PomodoroModal() {
  const { tokens } = useTheme()
  const s = makeStyles(tokens)
  const router = useRouter()
  const params = useLocalSearchParams<{ initialTask?: string }>()
  const { user } = useAuth()
  const { tasks } = useProgress({ user })
  const {
    mode, timeLeft, isRunning, completedSessions, soundEnabled,
    workMinutes, breakMinutes, longBreakMinutes, progress, formattedTime,
    timerAlert, dismissTimerAlert, startNextPhase, toggleTimer, resetTimer,
    skipToNext, setSoundEnabled, setWorkMinutes, setBreakMinutes,
    setLongBreakMinutes, SESSIONS_BEFORE_LONG_BREAK,
    setIsMinimized, setPipTaskTitle,
  } = usePomodoroMini()

  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(params.initialTask ?? null)
  const [showInfo, setShowInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTaskPicker, setShowTaskPicker] = useState(false)

  // Clear pip when modal opens
  useEffect(() => { setIsMinimized(false) }, [])

  const soundRef = useRef<Audio.Sound | null>(null)

  useEffect(() => () => { soundRef.current?.unloadAsync() }, [])

  // Play alert sound + Web Notification when timerAlert fires
  useEffect(() => {
    if (!timerAlert || !soundEnabled) return
    Audio.setAudioModeAsync({ playsInSilentModeIOS: false, allowsRecordingIOS: false }).catch(() => { })

    // Web: beep via AudioContext + show notification when tab is hidden
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Oscillator beep (works even when tab is in background)
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        gain.gain.setValueAtTime(0.4, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 1.2)
      } catch (_e) { /* AudioContext not available */ }

      // Browser notification if tab is hidden
      if (document.hidden && 'Notification' in window) {
        const msg = timerAlert.type === 'workDone'
          ? '✅ Focus session complete! Time for a break.'
          : timerAlert.type === 'longBreakEarned'
            ? '🎉 4 sessions done! Take a long break.'
            : '☕ Break over! Ready to focus again?'
        if (Notification.permission === 'granted') {
          new Notification('Daily Planner – Pomodoro', { body: msg, icon: '/favicon.svg' })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(p => {
            if (p === 'granted') new Notification('Daily Planner – Pomodoro', { body: msg, icon: '/favicon.svg' })
          })
        }
      }
    }
  }, [timerAlert, soundEnabled])

  const today = getToday()
  const todayIncomplete = tasks.filter(t => t.date === today && !t.completed)
  const linkedTask = todayIncomplete.find(t => t.id === linkedTaskId)

  const cfg = MODE_CONFIG[mode]
  const modeColor = cfg.color
  const ModeIcon = cfg.icon

  const handleClose = useCallback(() => {
    if (isRunning) resetTimer()
    router.back()
  }, [isRunning, resetTimer, router])

  // Minimize: set pip visible, navigate back — timer keeps running in context
  const handleMinimize = useCallback(() => {
    setPipTaskTitle(linkedTask?.title ?? null)
    setIsMinimized(true)
    router.back()
  }, [linkedTask, setPipTaskTitle, setIsMinimized, router])


  // SVG ring
  const RING = 180
  const RADIUS = 76
  const CIRC = 2 * Math.PI * RADIUS
  const offset = CIRC - (progress / 100) * CIRC

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <StatusBar barStyle="light-content" />
        {/* Backdrop tap to close */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityLabel="Close pomodoro timer"
        />

        <View style={[s.card, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── Header ── */}
            <View style={s.header}>
              <View style={s.headerLeft}>
                <Timer size={20} color={tokens.textPrimary} />
                <Text style={[s.title, { color: tokens.textPrimary }]}>Focus Timer</Text>
              </View>
              <View style={s.headerActions}>
                <Pressable
                  onPress={() => { setShowInfo(p => !p); setShowSettings(false) }}
                  style={[s.iconBtn, showInfo && { backgroundColor: `${tokens.accentBlue}18` }]}
                  accessibilityRole="button"
                  accessibilityLabel="How it works"
                >
                  <Info size={18} color={showInfo ? tokens.accentBlue : tokens.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => setSoundEnabled(!soundEnabled)}
                  style={s.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel={soundEnabled ? 'Mute sound' : 'Enable sound'}
                >
                  {soundEnabled
                    ? <Volume2 size={18} color={tokens.textMuted} />
                    : <VolumeX size={18} color={tokens.textMuted} />}
                </Pressable>
                <Pressable
                  onPress={() => { setShowSettings(p => !p); setShowInfo(false) }}
                  style={[s.iconBtn, showSettings && { backgroundColor: `${tokens.accentBlue}18` }]}
                  accessibilityRole="button"
                  accessibilityLabel="Timer settings"
                >
                  <Settings size={18} color={showSettings ? tokens.accentBlue : tokens.textMuted} />
                </Pressable>
                <Pressable
                  onPress={handleClose}
                  style={s.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X size={18} color={tokens.textMuted} />
                </Pressable>
                {/* Minimize — navigates back, pip shown globally */}
                <Pressable
                  onPress={handleMinimize}
                  style={s.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Minimize timer"
                >
                  <Minimize2 size={18} color={tokens.textMuted} />
                </Pressable>
              </View>
            </View>

            {/* ── Info panel ── */}
            {showInfo && (
              <View style={[s.panel, { backgroundColor: tokens.bgInput }]}>
                <Text style={[s.panelTitle, { color: tokens.textPrimary }]}>
                  🍅 The Pomodoro Technique
                </Text>
                <Text style={[s.panelBody, { color: tokens.textSecondary }]}>
                  Created by Francesco Cirillo in the late 1980s.{' '}
                  <Text style={{ fontStyle: 'italic' }}>"Pomodoro"</Text> is Italian for{' '}
                  <Text style={{ fontWeight: '700' }}>tomato</Text> — he used a tomato-shaped kitchen timer as a student.
                </Text>

                <Text style={[s.panelSub, { color: tokens.textSecondary }]}>How it works</Text>
                {[
                  ['🧠', `Work ${workMinutes} min`, 'deep focus, no distractions'],
                  ['☕', `Break ${breakMinutes} min`, 'step away, rest your mind'],
                  ['🔁', 'Repeat ×4', 'four rounds = one full cycle'],
                  ['🛋️', `Long break ${longBreakMinutes} min`, 'recharge fully'],
                ].map(([icon, label, desc]) => (
                  <View key={label} style={[s.howRow, { backgroundColor: tokens.bgSecondary }]}>
                    <Text style={s.howIcon}>{icon}</Text>
                    <Text style={[s.howLabel, { color: tokens.textPrimary }]}>{label}</Text>
                    <Text style={[s.howDesc, { color: tokens.textMuted }]}>{desc}</Text>
                  </View>
                ))}

                <Text style={[s.panelSub, { color: tokens.textSecondary, marginTop: 10 }]}>Why it helps</Text>
                {[
                  'Forces focused work in short, manageable bursts',
                  'The countdown creates urgency — harder to procrastinate',
                  'Regular breaks prevent mental fatigue',
                  'Big tasks feel less overwhelming one sprint at a time',
                ].map(tip => (
                  <Text key={tip} style={[s.tipItem, { color: tokens.textSecondary }]}>• {tip}</Text>
                ))}
              </View>
            )}

            {/* ── Settings panel ── */}
            {showSettings && (
              <View style={[s.panel, { backgroundColor: tokens.bgInput }]}>
                <Text style={[s.settingsTitle, { color: tokens.textSecondary }]}>
                  TIMER SETTINGS (minutes)
                </Text>
                <View style={s.settingsRow}>
                  <MinuteInput label="Work" value={workMinutes} onChange={setWorkMinutes} tokens={tokens} />
                  <MinuteInput label="Break" value={breakMinutes} onChange={setBreakMinutes} tokens={tokens} />
                  <MinuteInput label="Long" value={longBreakMinutes} onChange={setLongBreakMinutes} tokens={tokens} />
                </View>
              </View>
            )}

            {/* ── Linked task ── */}
            {linkedTask && (
              <View style={[s.linkedCard, { backgroundColor: tokens.bgInput }]}>
                <Text style={[s.linkedLabel, { color: tokens.textMuted }]}>Working on: </Text>
                <Text style={[s.linkedTitle, { color: tokens.textPrimary }]} numberOfLines={1}>
                  {linkedTask.title}
                </Text>
              </View>
            )}

            {/* ── Mode badge ── */}
            <View style={[s.modeBadge, { backgroundColor: `${modeColor}18` }]}>
              <ModeIcon size={16} color={modeColor} />
              <Text style={[s.modeLabel, { color: modeColor }]}>{cfg.label}</Text>
            </View>

            {/* ── Circular ring + time ── */}
            <View style={s.ringWrapper}>
              <Svg width={RING} height={RING}>
                {/* Background */}
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={tokens.bgInput}
                  strokeWidth={9}
                />
                {/* Progress */}
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={modeColor}
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeDasharray={`${CIRC}`}
                  strokeDashoffset={offset}
                  transform={`rotate(-90, ${RING / 2}, ${RING / 2})`}
                />
              </Svg>
              {/* Time in center */}
              <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
                <View style={s.ringCenter}>
                  <Text
                    style={[s.timeDisplay, { color: tokens.textPrimary }]}
                    accessibilityLiveRegion="polite"
                    accessibilityLabel={`${formattedTime} remaining`}
                  >
                    {formattedTime}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Controls ── */}
            <View style={s.controls}>
              {/* Reset */}
              <Pressable
                onPress={resetTimer}
                style={[s.sideBtn, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}
                accessibilityRole="button"
                accessibilityLabel="Reset timer"
              >
                <RotateCcw size={20} color={tokens.textSecondary} />
              </Pressable>

              {/* Start / Pause */}
              <Pressable
                onPress={toggleTimer}
                style={[s.mainBtn, { backgroundColor: modeColor }]}
                accessibilityRole="button"
                accessibilityLabel={isRunning ? 'Pause timer' : 'Start timer'}
              >
                {isRunning
                  ? <Pause size={24} color="#fff" />
                  : <Play size={24} color="#fff" />}
                <Text style={s.mainBtnText}>{isRunning ? 'Pause' : 'Start'}</Text>
              </Pressable>

              {/* Skip */}
              <Pressable
                onPress={skipToNext}
                style={[s.sideBtn, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}
                accessibilityRole="button"
                accessibilityLabel="Skip to next phase"
              >
                <Coffee size={20} color={tokens.textSecondary} />
              </Pressable>
            </View>

            {/* ── Session counter ── */}
            <View style={s.sessionInfo}>
              <Text style={[s.sessionText, { color: tokens.textMuted }]}>
                Sessions completed:{' '}
                <Text style={{ color: tokens.textPrimary, fontWeight: '600' }}>{completedSessions}</Text>
                {completedSessions > 0 && (
                  <Text style={{ color: tokens.textMuted }}>
                    {' '}({completedSessions * workMinutes} min focused)
                  </Text>
                )}
              </Text>
              <Text style={[s.sessionHint, { color: tokens.textMuted }]}>
                Long break after every {SESSIONS_BEFORE_LONG_BREAK} sessions
              </Text>
            </View>

            {/* ── Task link ── */}
            {todayIncomplete.length > 0 && (
              <View style={s.taskLinkSection}>
                <Pressable
                  onPress={() => setShowTaskPicker(p => !p)}
                  style={[s.taskLinkBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }]}
                  accessibilityRole="button"
                  accessibilityLabel="Link a task"
                >
                  <Link size={14} color={tokens.textMuted} />
                  <Text style={[s.taskLinkText, { color: linkedTask ? tokens.textPrimary : tokens.textMuted }]} numberOfLines={1}>
                    {linkedTask ? linkedTask.title : 'Link a task (optional)'}
                  </Text>
                  {linkedTask && (
                    <Pressable
                      onPress={() => setLinkedTaskId(null)}
                      hitSlop={8}
                      accessibilityLabel="Remove task link"
                    >
                      <X size={12} color={tokens.textMuted} />
                    </Pressable>
                  )}
                </Pressable>

                {showTaskPicker && (
                  <View style={[s.taskPicker, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
                    <Pressable
                      onPress={() => { setLinkedTaskId(null); setShowTaskPicker(false) }}
                      style={[s.taskOption, { borderBottomColor: tokens.borderPrimary }]}
                    >
                      <Text style={[s.taskOptionText, { color: tokens.textMuted }]}>None</Text>
                    </Pressable>
                    {todayIncomplete.map(t => (
                      <Pressable
                        key={t.id}
                        onPress={() => { setLinkedTaskId(t.id); setShowTaskPicker(false) }}
                        style={[
                          s.taskOption,
                          { borderBottomColor: tokens.borderPrimary },
                          linkedTaskId === t.id && { backgroundColor: `${tokens.accentBlue}15` },
                        ]}
                      >
                        <Text style={[s.taskOptionText, { color: tokens.textPrimary }]} numberOfLines={2}>
                          {t.title}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          <TimerAlert
            alert={timerAlert}
            onDismiss={dismissTimerAlert}
            onStart={startNextPhase}
          />
        </View>
      </View>
    </Modal>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    // Minimized state — fills screen, shows pip + hint
    minimizedOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    },
    minimizedHint: { fontSize: 12, marginTop: 10 },
    // Minimized pip — large centered pill
    pip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 28,
      paddingVertical: 18,
      borderRadius: 40,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
        android: { elevation: 8 },
        web: { boxShadow: '0 4px 16px rgba(0,0,0,0.25)' } as any,
      }),
    },
    pipTime: {
      color: '#fff',
      fontSize: 36,
      fontWeight: '700',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      letterSpacing: 2,
    },
    card: {
      width: '100%',
      maxWidth: 480,
      borderRadius: 20,
      borderWidth: 1,
      overflow: 'hidden',
      maxHeight: '90%',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
        android: { elevation: 12 },
        web: { boxShadow: '0 8px 24px rgba(0,0,0,0.15)' },
      }),
    },
    scroll: {
      alignItems: 'center',
      padding: 20,
    },
    // Header
    header: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 18, fontWeight: '600' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    iconBtn: {
      padding: 8,
      borderRadius: 8,
    },
    // Info / Settings panel
    panel: {
      width: '100%',
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
    },
    panelTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
    panelBody: { fontSize: 12, lineHeight: 19, marginBottom: 12 },
    panelSub: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
    howRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 8,
      borderRadius: 8,
      marginBottom: 4,
    },
    howIcon: { fontSize: 14, width: 20, textAlign: 'center' },
    howLabel: { fontSize: 12, fontWeight: '600', width: 90 },
    howDesc: { fontSize: 11, flex: 1 },
    tipItem: { fontSize: 12, lineHeight: 19, marginBottom: 2 },
    settingsTitle: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    settingsRow: { flexDirection: 'row', gap: 12, width: '100%' },
    // Linked task
    linkedCard: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      marginBottom: 16,
    },
    linkedLabel: { fontSize: 13 },
    linkedTitle: { flex: 1, fontSize: 13, fontWeight: '500' },
    // Mode badge
    modeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 20,
    },
    modeLabel: { fontSize: 14, fontWeight: '600' },
    // Ring
    ringWrapper: {
      width: 180,
      height: 180,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    ringCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeDisplay: {
      fontSize: 36,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      letterSpacing: 1,
    },
    // Controls
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 20,
    },
    sideBtn: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mainBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 28,
    },
    mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    // Sessions
    sessionInfo: { alignItems: 'center', gap: 4, marginBottom: 20 },
    sessionText: { fontSize: 13 },
    sessionHint: { fontSize: 11 },
    // Task link
    taskLinkSection: { width: '100%' },
    taskLinkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
    },
    taskLinkText: { flex: 1, fontSize: 13 },
    taskPicker: {
      borderRadius: 10,
      borderWidth: 1,
      marginTop: 6,
      maxHeight: 200,
      overflow: 'hidden',
    },
    taskOption: {
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    taskOptionText: { fontSize: 13 },
  })
}
