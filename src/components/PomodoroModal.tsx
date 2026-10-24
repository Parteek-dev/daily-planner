/**
 * PomodoroModal.tsx — Floating modal for Pomodoro timer on web.
 *
 * Rendered at the layout level (like SettingsModal) to ensure
 * the transparent overlay shows the page content behind it.
 *
 * This is a component-based version of app/(modals)/pomodoro.tsx
 * for use on web where we need the page to remain visible behind.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
  TextInput,
  Modal,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native'
import Svg, { Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg'
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

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PomodoroModalProps {
  isOpen: boolean
  onClose: () => void
  initialTaskId?: string | null
}

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
      // deltaY > 0 means scrolling down → decrease value
      // deltaY < 0 means scrolling up → increase value
      const delta = e.deltaY > 0 ? -1 : 1
      const newValue = Math.max(1, Math.min(120, valueRef.current + delta))
      if (newValue !== valueRef.current) onChange(newValue)
    }

    node.addEventListener?.('wheel', handleWheel, { passive: false })
    return () => node.removeEventListener?.('wheel', handleWheel)
  }, [onChange])

  // Pan responder for mobile swipe gestures
  const panResponder = useMemo(() => {
    let startY = 0
    let lastValue = value
    let accumulatedDelta = 0
    const SWIPE_THRESHOLD = 15 // pixels to change by 1

    return PanResponder.create({
      onStartShouldSetPanResponder: () => Platform.OS !== 'web',
      onMoveShouldSetPanResponder: (_, gesture) =>
        Platform.OS !== 'web' && Math.abs(gesture.dy) > 5,
      onPanResponderGrant: () => {
        startY = 0
        lastValue = valueRef.current
        accumulatedDelta = 0
      },
      onPanResponderMove: (_, gesture) => {
        // Swipe up (negative dy) increases value, swipe down decreases
        const deltaY = -gesture.dy
        accumulatedDelta = deltaY
        const steps = Math.floor(accumulatedDelta / SWIPE_THRESHOLD)
        const newValue = Math.max(1, Math.min(120, lastValue + steps))
        if (newValue !== valueRef.current) {
          onChange(newValue)
        }
      },
      onPanResponderRelease: () => {
        // Reset tracking
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
            accessibilityLabel={`${label} minutes. Swipe up/down to adjust.`}
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function PomodoroModal({ isOpen, onClose, initialTaskId }: PomodoroModalProps) {
  const { tokens } = useTheme()
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

  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(initialTaskId ?? null)
  const [showInfo, setShowInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTaskPicker, setShowTaskPicker] = useState(false)

  // Update linked task when initialTaskId changes
  useEffect(() => {
    if (initialTaskId) {
      setLinkedTaskId(initialTaskId)
    }
  }, [initialTaskId])

  // Clear pip when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsMinimized(false)
    }
  }, [isOpen, setIsMinimized])

  const soundRef = useRef<Audio.Sound | null>(null)

  useEffect(() => () => { soundRef.current?.unloadAsync() }, [])

  // Play alert sound + Web Notification when timerAlert fires
  useEffect(() => {
    if (!timerAlert || !soundEnabled) return
    Audio.setAudioModeAsync({ playsInSilentModeIOS: false, allowsRecordingIOS: false }).catch(() => { })

    // Web: beep via AudioContext + show notification when tab is hidden
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
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
    onClose()
  }, [isRunning, resetTimer, onClose])

  // Minimize: set pip visible, close modal — timer keeps running in context
  const handleMinimize = useCallback(() => {
    setPipTaskTitle(linkedTask?.title ?? null)
    setIsMinimized(true)
    onClose()
  }, [linkedTask, setPipTaskTitle, setIsMinimized, onClose])

  // SVG ring
  const RING = 220
  const RADIUS = 90
  const CIRC = 2 * Math.PI * RADIUS
  const offset = CIRC - (progress / 100) * CIRC

  if (!isOpen) return null

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" />
        {/* Backdrop tap to close */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityLabel="Close pomodoro timer"
        />

        <View style={[styles.card, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Header ── */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Timer size={20} color={tokens.textPrimary} />
                <Text style={[styles.title, { color: tokens.textPrimary }]}>Focus Timer</Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => { setShowInfo(p => !p); setShowSettings(false) }}
                  style={[styles.iconBtn, showInfo && { backgroundColor: `${tokens.accentBlue}18` }]}
                  accessibilityRole="button"
                  accessibilityLabel="How it works"
                >
                  <Info size={18} color={showInfo ? tokens.accentBlue : tokens.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => setSoundEnabled(!soundEnabled)}
                  style={styles.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel={soundEnabled ? 'Mute sound' : 'Enable sound'}
                >
                  {soundEnabled
                    ? <Volume2 size={18} color={tokens.textMuted} />
                    : <VolumeX size={18} color={tokens.textMuted} />}
                </Pressable>
                <Pressable
                  onPress={() => { setShowSettings(p => !p); setShowInfo(false) }}
                  style={[styles.iconBtn, showSettings && { backgroundColor: `${tokens.accentBlue}18` }]}
                  accessibilityRole="button"
                  accessibilityLabel="Timer settings"
                >
                  <Settings size={18} color={showSettings ? tokens.accentBlue : tokens.textMuted} />
                </Pressable>
                <Pressable
                  onPress={handleClose}
                  style={styles.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X size={18} color={tokens.textMuted} />
                </Pressable>
                <Pressable
                  onPress={handleMinimize}
                  style={styles.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Minimize timer"
                >
                  <Minimize2 size={18} color={tokens.textMuted} />
                </Pressable>
              </View>
            </View>

            {/* ── Info panel ── */}
            {showInfo && (
              <View style={[styles.panel, { backgroundColor: tokens.bgInput }]}>
                <Text style={[styles.panelTitle, { color: tokens.textPrimary }]}>
                  🍅 The Pomodoro Technique
                </Text>
                <Text style={[styles.panelBody, { color: tokens.textSecondary }]}>
                  Created by Francesco Cirillo in the late 1980s.{' '}
                  <Text style={{ fontStyle: 'italic' }}>"Pomodoro"</Text> is Italian for{' '}
                  <Text style={{ fontWeight: '700' }}>tomato</Text> — he used a tomato-shaped kitchen timer as a student.
                </Text>

                <Text style={[styles.panelSub, { color: tokens.textSecondary }]}>How it works</Text>
                {[
                  ['🧠', `Work ${workMinutes} min`, 'deep focus, no distractions'],
                  ['☕', `Break ${breakMinutes} min`, 'step away, rest your mind'],
                  ['🔁', 'Repeat ×4', 'four rounds = one full cycle'],
                  ['🛋️', `Long break ${longBreakMinutes} min`, 'recharge fully'],
                ].map(([icon, label, desc]) => (
                  <View key={label} style={[styles.howRow, { backgroundColor: tokens.bgSecondary }]}>
                    <Text style={styles.howIcon}>{icon}</Text>
                    <Text style={[styles.howLabel, { color: tokens.textPrimary }]}>{label}</Text>
                    <Text style={[styles.howDesc, { color: tokens.textMuted }]}>{desc}</Text>
                  </View>
                ))}

                <Text style={[styles.panelSub, { color: tokens.textSecondary, marginTop: 10 }]}>Why it helps</Text>
                {[
                  'Forces focused work in short, manageable bursts',
                  'The countdown creates urgency — harder to procrastinate',
                  'Regular breaks prevent mental fatigue',
                  'Big tasks feel less overwhelming one sprint at a time',
                ].map(tip => (
                  <Text key={tip} style={[styles.tipItem, { color: tokens.textSecondary }]}>• {tip}</Text>
                ))}
              </View>
            )}

            {/* ── Settings panel ── */}
            {showSettings && (
              <View style={[styles.panel, { backgroundColor: tokens.bgInput }]}>
                <Text style={[styles.settingsTitle, { color: tokens.textSecondary }]}>
                  TIMER SETTINGS (minutes)
                </Text>
                <View style={styles.settingsRow}>
                  <MinuteInput label="Work" value={workMinutes} onChange={setWorkMinutes} tokens={tokens} />
                  <MinuteInput label="Break" value={breakMinutes} onChange={setBreakMinutes} tokens={tokens} />
                  <MinuteInput label="Long" value={longBreakMinutes} onChange={setLongBreakMinutes} tokens={tokens} />
                </View>
              </View>
            )}

            {/* ── Linked task ── */}
            {linkedTask && (
              <View style={[styles.linkedCard, { backgroundColor: tokens.bgInput }]}>
                <Text style={[styles.linkedLabel, { color: tokens.textMuted }]}>Working on: </Text>
                <Text style={[styles.linkedTitle, { color: tokens.textPrimary }]} numberOfLines={1}>
                  {linkedTask.title}
                </Text>
              </View>
            )}

            {/* ── Mode badge ── */}
            <View style={[styles.modeBadge, { backgroundColor: `${modeColor}18` }]}>
              <ModeIcon size={16} color={modeColor} />
              <Text style={[styles.modeLabel, { color: modeColor }]}>{cfg.label}</Text>
            </View>

            {/* ── Circular ring + time ── */}
            <View style={styles.ringWrapper}>
              <Svg width={RING} height={RING}>
                {/* Gradient definition */}
                <Defs>
                  <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#a855f7" />
                    <Stop offset="100%" stopColor="#3b82f6" />
                  </LinearGradient>
                </Defs>

                {/* Background track */}
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={tokens.bgInput}
                  strokeWidth={10}
                />

                {/* Tick marks */}
                {Array.from({ length: 60 }).map((_, i) => {
                  const angle = (i * 6 - 90) * (Math.PI / 180)
                  const isMajor = i % 15 === 0
                  const innerR = isMajor ? RADIUS - 18 : RADIUS - 12
                  const outerR = RADIUS - 6
                  const x1 = RING / 2 + innerR * Math.cos(angle)
                  const y1 = RING / 2 + innerR * Math.sin(angle)
                  const x2 = RING / 2 + outerR * Math.cos(angle)
                  const y2 = RING / 2 + outerR * Math.sin(angle)
                  return (
                    <Line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isMajor ? tokens.textMuted : tokens.borderPrimary}
                      strokeWidth={isMajor ? 2 : 1}
                    />
                  )
                })}

                {/* Minute labels at 15, 30, 45, 60 */}
                {[
                  { min: 60, angle: -90 },
                  { min: 15, angle: 0 },
                  { min: 30, angle: 90 },
                  { min: 45, angle: 180 },
                ].map(({ min, angle }) => {
                  const rad = (angle) * (Math.PI / 180)
                  const labelR = RADIUS - 28
                  const x = RING / 2 + labelR * Math.cos(rad)
                  const y = RING / 2 + labelR * Math.sin(rad) + 4
                  return (
                    <SvgText
                      key={min}
                      x={x}
                      y={y}
                      fontSize={11}
                      fontWeight="500"
                      fill={tokens.textMuted}
                      textAnchor="middle"
                    >
                      {min}
                    </SvgText>
                  )
                })}

                {/* Progress arc with gradient */}
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RADIUS}
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={`${CIRC}`}
                  strokeDashoffset={offset}
                  transform={`rotate(-90, ${RING / 2}, ${RING / 2})`}
                />

                {/* Progress indicator dot */}
                {progress > 0 && (() => {
                  const progressAngle = ((progress / 100) * 360 - 90) * (Math.PI / 180)
                  const dotX = RING / 2 + RADIUS * Math.cos(progressAngle)
                  const dotY = RING / 2 + RADIUS * Math.sin(progressAngle)
                  return (
                    <Circle
                      cx={dotX}
                      cy={dotY}
                      r={6}
                      fill="#3b82f6"
                    />
                  )
                })()}
              </Svg>

              {/* Time in center */}
              <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
                <View style={styles.ringCenter}>
                  <Text style={[styles.timeDisplayLarge, { color: tokens.textPrimary }]}>
                    {Math.floor(timeLeft / 60).toString().padStart(2, '0')}
                  </Text>
                  <Text style={[styles.timeDisplayLabel, { color: tokens.textMuted }]}>
                    :{(timeLeft % 60).toString().padStart(2, '0')} mins
                  </Text>
                </View>
              </View>
            </View>

            {/* ── From / Finish time ── */}
            <View style={styles.timeEstimate}>
              <View style={styles.timeEstimateCol}>
                <Text style={[styles.timeEstimateLabel, { color: tokens.textMuted }]}>From</Text>
                <Text style={[styles.timeEstimateValue, { color: tokens.textSecondary }]}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={[styles.timeEstimateDivider, { backgroundColor: tokens.borderPrimary }]} />
              <View style={styles.timeEstimateCol}>
                <Text style={[styles.timeEstimateLabel, { color: tokens.textMuted }]}>Finish</Text>
                <Text style={[styles.timeEstimateValue, { color: tokens.textSecondary }]}>
                  {new Date(Date.now() + timeLeft * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>

            {/* ── Controls ── */}
            <View style={styles.controls}>
              <Pressable
                onPress={resetTimer}
                style={[styles.sideBtn, { backgroundColor: tokens.bgPrimary, borderColor: tokens.borderPrimary }]}
                accessibilityRole="button"
                accessibilityLabel="Reset timer"
              >
                <RotateCcw size={20} color={tokens.textSecondary} />
              </Pressable>

              <Pressable
                onPress={toggleTimer}
                style={[styles.mainBtn, { backgroundColor: modeColor }]}
                accessibilityRole="button"
                accessibilityLabel={isRunning ? 'Pause timer' : 'Start timer'}
              >
                {isRunning
                  ? <Pause size={24} color="#fff" />
                  : <Play size={24} color="#fff" />}
                <Text style={styles.mainBtnText}>{isRunning ? 'Pause' : 'Start'}</Text>
              </Pressable>

              <Pressable
                onPress={skipToNext}
                style={[styles.sideBtn, { backgroundColor: tokens.bgPrimary, borderColor: tokens.borderPrimary }]}
                accessibilityRole="button"
                accessibilityLabel="Skip to next phase"
              >
                <Coffee size={20} color={tokens.textSecondary} />
              </Pressable>
            </View>

            {/* ── Session counter ── */}
            <View style={styles.sessionInfo}>
              <Text style={[styles.sessionText, { color: tokens.textMuted }]}>
                Sessions completed:{' '}
                <Text style={{ color: tokens.textPrimary, fontWeight: '600' }}>{completedSessions}</Text>
                {completedSessions > 0 && (
                  <Text style={{ color: tokens.textMuted }}>
                    {' '}({completedSessions * workMinutes} min focused)
                  </Text>
                )}
              </Text>
              <Text style={[styles.sessionHint, { color: tokens.textMuted }]}>
                Long break after every {SESSIONS_BEFORE_LONG_BREAK} sessions
              </Text>
            </View>

            {/* ── Task link ── */}
            {todayIncomplete.length > 0 && (
              <View style={styles.taskLinkSection}>
                <Pressable
                  onPress={() => setShowTaskPicker(p => !p)}
                  style={[styles.taskLinkBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }]}
                  accessibilityRole="button"
                  accessibilityLabel="Link a task"
                >
                  <Link size={14} color={tokens.textMuted} />
                  <Text style={[styles.taskLinkText, { color: linkedTask ? tokens.textPrimary : tokens.textMuted }]} numberOfLines={1}>
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
                  <View style={[styles.taskPicker, { backgroundColor: tokens.bgPrimary, borderColor: tokens.borderPrimary }]}>
                    <Pressable
                      onPress={() => { setLinkedTaskId(null); setShowTaskPicker(false) }}
                      style={[styles.taskOption, { borderBottomColor: tokens.borderPrimary }]}
                    >
                      <Text style={[styles.taskOptionText, { color: tokens.textMuted }]}>None</Text>
                    </Pressable>
                    {todayIncomplete.map(t => (
                      <Pressable
                        key={t.id}
                        onPress={() => { setLinkedTaskId(t.id); setShowTaskPicker(false) }}
                        style={[
                          styles.taskOption,
                          { borderBottomColor: tokens.borderPrimary },
                          linkedTaskId === t.id && { backgroundColor: `${tokens.accentBlue}15` },
                        ]}
                      >
                        <Text style={[styles.taskOptionText, { color: tokens.textPrimary }]} numberOfLines={2}>
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
        </View>

        <TimerAlert
          alert={timerAlert}
          onDismiss={dismissTimerAlert}
          onStart={startNextPhase}
        />
      </View>
    </Modal>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
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
      android: {},
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.15)' },
    }),
    elevation: 12,
  },
  scrollContent: {
    alignItems: 'center',
    padding: 20,
  },
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
  ringWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ringCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplayLarge: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timeDisplayLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: -4,
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 24,
  },
  timeEstimateCol: {
    alignItems: 'center',
    gap: 2,
  },
  timeEstimateLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeEstimateValue: {
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timeEstimateDivider: {
    width: 1,
    height: 32,
  },
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
  sessionInfo: { alignItems: 'center', gap: 4, marginBottom: 20 },
  sessionText: { fontSize: 13 },
  sessionHint: { fontSize: 11 },
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
