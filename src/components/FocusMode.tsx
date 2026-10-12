/**
 * FocusMode.tsx — Persistent fullscreen / mini-pill focus overlay for a single task.
 *
 * Migrated from frontend/src/components/FocusMode.jsx.
 *
 * Key changes from the web version:
 *  - `createPortal` removed — rendered as a sibling `View` in the root layout.
 *  - `window.addEventListener('keydown')` for spacebar removed — no keyboard on mobile.
 *  - `window.innerWidth/innerHeight` + mouse drag removed — pill uses fixed positioning.
 *  - All DOM/CSS replaced with RN primitives (`View`, `Text`, `Pressable`) and `useTheme` tokens.
 *  - `FocusContext` exported so other components (e.g. Pomodoro Timer) can read the active task.
 *
 * Rendering contract:
 *  - Full mode: `absolute`-positioned `View`, `zIndex: 100`, fills the screen.
 *    Shows task title (≤60 chars, ellipsis), MM:SS elapsed timer, complete button,
 *    and a next-task button (when a next task is available).
 *  - Minimized mode: compact pill at the bottom of the screen, `zIndex: 100`.
 *    Shows task title (≤30 chars) and elapsed MM:SS.
 *  - Pomodoro Modal: when launched while Focus Mode is active, the modal can read
 *    `useFocusContext().focusTask` to link the session to the focused task.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native'
import {
  CheckCircle2,
  Circle,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Sparkles,
  PartyPopper,
  Timer,
  Minimize2,
  Maximize2,
  Flag,
  X,
} from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { PRIORITY_CONFIG } from '@/src/hooks/useProgress'
import { fmtDuration } from '@/src/lib/utils'
import type { Task } from '@/src/lib/firestoreMappers'

// ── FocusContext ──────────────────────────────────────────────────────────────
// Exported so the Pomodoro Timer (and any other component) can read the active
// focus task reference without prop-drilling.  Req 12.5.

export interface FocusContextValue {
  /** The task currently in focus, or null when Focus Mode is inactive. */
  focusTask: Task | null
  /** Open Focus Mode for a specific task. */
  openFocus: (task: Task) => void
  /** Close Focus Mode entirely. */
  closeFocus: () => void
}

const FocusContext = createContext<FocusContextValue | undefined>(undefined)

export function FocusProvider({ children }: { readonly children: ReactNode }) {
  const [focusTask, setFocusTask] = useState<Task | null>(null)

  const openFocus = useCallback((task: Task) => setFocusTask(task), [])
  const closeFocus = useCallback(() => setFocusTask(null), [])

  const value = useMemo<FocusContextValue>(
    () => ({ focusTask, openFocus, closeFocus }),
    [focusTask, openFocus, closeFocus],
  )

  return (
    <FocusContext.Provider value={value}>
      {children}
    </FocusContext.Provider>
  )
}

/** Consumes the FocusContext. Must be used inside a FocusProvider. */
export function useFocusContext(): FocusContextValue {
  const ctx = useContext(FocusContext)
  if (!ctx) throw new Error('useFocusContext must be used within FocusProvider')
  return ctx
}

// ── Encouraging messages shown when timer starts ──────────────────────────────

const START_MESSAGES = [
  'Deep work time 🧠',
  "You've got this!",
  'Stay in the zone ⚡',
  'Make it count 🎯',
  'Full focus mode 🔒',
]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FocusModeProps {
  readonly task: Task | null | undefined
  readonly todayTasks?: Task[]
  readonly onToggleComplete: (taskId: string) => void
  readonly onSetActualDuration?: (taskId: string, minutes: number) => void
  readonly onNextTask?: (nextTask: Task) => void
  readonly onClose: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a duration in seconds as MM:SS (or H:MM:SS when ≥ 1 hour). */
function formatTime(seconds: number): string {
  const s = Math.abs(seconds)
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/** Format a HH:MM 24h string as "h:mm AM/PM". */
function formatDueTime(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null
  const [hoursStr, minutesStr] = timeStr.split(':')
  const h = Number.parseInt(hoursStr, 10)
  return `${h % 12 || 12}:${minutesStr} ${h < 12 ? 'AM' : 'PM'}`
}

/** Truncate a string to `maxLen` chars, appending '…' when cut. */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * FocusMode renders either a fullscreen overlay or a minimized pill.
 * The component manages its own minimize state internally; the parent
 * controls visibility by passing/removing `task`.
 *
 * Req 12.1: persistent overlay above tab content (zIndex: 100), below modals.
 */
export default function FocusMode({
  task,
  todayTasks = [],
  onToggleComplete,
  onSetActualDuration,
  onNextTask,
  onClose,
}: FocusModeProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)

  const [elapsed, setElapsed] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [countDown, setCountDown] = useState(true)
  const [minimized, setMinimized] = useState(false)
  const [startMessage, setStartMessage] = useState('')
  const [showStartMsg, setShowStartMsg] = useState(false)

  const hasStarted = elapsed > 0 || isTimerRunning

  // Reset timer whenever the focused task changes
  useEffect(() => {
    setElapsed(0)
    setIsTimerRunning(false)
    setShowStartMsg(false)
    setStartMessage('')
    setMinimized(false)
  }, [task?.id])

  // Pause timer when task is completed so elapsed reflects actual work time
  useEffect(() => {
    if (task?.completed) {
      setIsTimerRunning(false)
    }
  }, [task?.completed])

  // Timer tick — increments every second while running and task is incomplete
  useEffect(() => {
    if (!isTimerRunning || task?.completed) return
    const id = setInterval(() => setElapsed(p => p + 1), 1000)
    return () => clearInterval(id)
  }, [isTimerRunning, task?.completed])

  // Separate effect to manage the start-message auto-hide timeout
  const startMsgTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (showStartMsg) {
      startMsgTimeoutRef.current = setTimeout(() => setShowStartMsg(false), 2500)
      return () => {
        if (startMsgTimeoutRef.current) clearTimeout(startMsgTimeoutRef.current)
      }
    }
  }, [showStartMsg])

  const handleToggleTimerClean = useCallback(() => {
    setIsTimerRunning(prev => {
      const next = !prev
      if (next && elapsed === 0) {
        const idx = Math.floor(Math.random() * START_MESSAGES.length)
        setStartMessage(START_MESSAGES[idx])
        setShowStartMsg(true)
      }
      return next
    })
  }, [elapsed])

  const handleComplete = useCallback((taskId: string) => {
    const actualMinutes = Math.ceil(elapsed / 60)
    if (onSetActualDuration && elapsed > 0) {
      onSetActualDuration(taskId, actualMinutes)
    }
    onToggleComplete(taskId)
  }, [elapsed, onSetActualDuration, onToggleComplete])

  const handleReset = useCallback(() => {
    setElapsed(0)
    setIsTimerRunning(false)
  }, [])

  // Derived values
  const estimatedSecs = (task?.duration ?? 0) * 60
  const isOverTime = elapsed > estimatedSecs && estimatedSecs > 0
  const progress = estimatedSecs > 0 ? Math.min(100, (elapsed / estimatedSecs) * 100) : 0
  const countdownSecs = estimatedSecs - elapsed
  const displaySeconds = countDown ? Math.abs(countdownSecs) : elapsed

  // Completion summary (Req 12.2)
  const actualMins = Math.ceil(elapsed / 60)
  const diffMins = actualMins - (task?.duration ?? 0)
  let completionNote: string | null = null
  if (elapsed > 0) {
    if (diffMins === 0) completionNote = 'Right on time!'
    else if (diffMins > 0) completionNote = `${fmtDuration(diffMins)} over estimate`
    else completionNote = `${fmtDuration(Math.abs(diffMins))} under estimate`
  }

  // Next incomplete task (Req 12.4)
  const today = new Date().toISOString().split('T')[0]
  const nextTask = todayTasks.find(
    t => !t.completed && t.id !== task?.id && t.date === today,
  ) ?? null

  if (!task) return null

  const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null

  // Status line text (extracted from nested ternary to satisfy linter)
  let statusText: string
  if (!hasStarted) {
    statusText = `${fmtDuration(task?.duration)} estimated`
  } else if (isOverTime) {
    statusText = `${fmtDuration(Math.round((elapsed - estimatedSecs) / 60))} over estimate`
  } else if (countDown) {
    statusText = `${fmtDuration(Math.max(0, Math.round(countdownSecs / 60)))} remaining`
  } else {
    statusText = `${fmtDuration(Math.round(elapsed / 60))} elapsed`
  }

  // ── Minimized pill (Req 12.3) ─────────────────────────────────────────────
  if (minimized) {
    return (
      <View
        style={[styles.pillContainer, { pointerEvents: 'box-none' } as any]}
        accessible
        accessibilityRole="none"
        accessibilityLabel={`Focus Mode: ${task.title}`}
      >
        <View style={[
          styles.pill,
          { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary },
          isOverTime && { borderColor: tokens.accentOrange },
        ]}>
          {/* Title — truncated at 30 chars (Req 12.3) */}
          <Text
            style={[styles.pillTitle, { color: tokens.textPrimary }]}
            numberOfLines={1}
          >
            {truncate(task.title, 30)}
          </Text>

          {/* Timer */}
          <Text style={[
            styles.pillTimer,
            { color: isOverTime ? tokens.accentOrange : tokens.accentBlue },
          ]}>
            {isOverTime && countDown ? '+' : ''}{formatTime(displaySeconds)}
          </Text>

          {/* Play / Pause */}
          <Pressable
            onPress={handleToggleTimerClean}
            style={[
              styles.pillIconBtn,
              { backgroundColor: isTimerRunning ? 'rgba(99,102,241,0.12)' : tokens.accentBlue },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isTimerRunning ? 'Pause timer' : 'Resume timer'}
          >
            {isTimerRunning
              ? <Pause size={14} color={tokens.accentBlue} />
              : <Play size={14} color="#fff" />}
          </Pressable>

          {/* Expand */}
          <Pressable
            onPress={() => setMinimized(false)}
            style={styles.pillIconBtn}
            accessibilityRole="button"
            accessibilityLabel="Expand Focus Mode"
          >
            <Maximize2 size={14} color={tokens.textMuted} />
          </Pressable>

          {/* Close */}
          <Pressable
            onPress={onClose}
            style={styles.pillIconBtn}
            accessibilityRole="button"
            accessibilityLabel="Exit Focus Mode"
          >
            <X size={14} color={tokens.textMuted} />
          </Pressable>
        </View>
      </View>
    )
  }

  // ── Full-screen overlay (Req 12.1, 12.2) ──────────────────────────────────
  return (
    <View
      style={[styles.overlay, { pointerEvents: 'box-none' } as any]}
      accessible={false}
    >
      {/* Exit + Minimize buttons */}
      <View style={styles.topButtons}>
        <Pressable
          onPress={() => setMinimized(true)}
          style={[styles.headerBtn, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}
          accessibilityRole="button"
          accessibilityLabel="Minimize to pill"
        >
          <Minimize2 size={16} color={tokens.textSecondary} />
        </Pressable>
        <Pressable
          onPress={onClose}
          style={[styles.headerBtn, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}
          accessibilityRole="button"
          accessibilityLabel="Exit Focus Mode"
        >
          <X size={18} color={tokens.textSecondary} />
          <Text style={[styles.headerBtnLabel, { color: tokens.textSecondary }]}>Exit Focus</Text>
        </Pressable>
      </View>

      {/* Focus label */}
      <View style={styles.focusLabel}>
        <Sparkles size={16} color={tokens.accentBlue} />
        <Text style={[styles.focusLabelText, { color: tokens.accentBlue }]}>
          {showStartMsg ? startMessage : 'Focus Mode'}
        </Text>
      </View>

      {/* ── Completed state (Req 12.4) ── */}
      {task.completed ? (
        <View style={styles.completedContainer}>
          <PartyPopper size={64} color={tokens.accentGreen} />
          <Text style={[styles.completedHeading, { color: tokens.accentGreen }]}>Task Completed!</Text>
          {completionNote !== null && (
            <Text style={[
              styles.completionNote,
              { color: diffMins > 0 ? tokens.accentOrange : tokens.accentGreen },
            ]}>
              {completionNote}
            </Text>
          )}
          <Text style={[styles.completionSub, { color: tokens.textSecondary }]}>
            You spent {fmtDuration(actualMins)} on this task
            {task.duration ? ` · estimated ${fmtDuration(task.duration)}` : ''}
          </Text>

          {/* Req 12.4: offer next-task or close-only */}
          <View style={styles.completedActions}>
            {nextTask !== null && onNextTask ? (
              <Pressable
                onPress={() => onNextTask(nextTask)}
                style={[styles.primaryBtn, { backgroundColor: tokens.accentBlue }]}
                accessibilityRole="button"
                accessibilityLabel="Advance to next task"
              >
                <Text style={styles.primaryBtnText}>Next Task</Text>
                <ChevronRight size={20} color="#fff" />
              </Pressable>
            ) : null}
            <Pressable
              onPress={onClose}
              style={[
                styles.secondaryBtn,
                { borderColor: tokens.borderPrimary },
                nextTask === null && { marginTop: 0 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close Focus Mode"
            >
              <Text style={[styles.secondaryBtnText, { color: tokens.textSecondary }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {/* Priority badge */}
          {priorityConfig !== null && (
            <View style={[
              styles.priorityBadge,
              { backgroundColor: priorityConfig.bgColor },
            ]}>
              <Flag size={14} color={priorityConfig.color} />
              <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                {priorityConfig.label} Priority
              </Text>
            </View>
          )}

          {/* Task title — truncated at 60 chars (Req 12.2) */}
          <Text
            style={[styles.taskTitle, { color: tokens.textPrimary }]}
            numberOfLines={2}
            ellipsizeMode="tail"
            accessibilityRole="header"
          >
            {truncate(task.title, 60)}
          </Text>

          {/* Description */}
          {task.description ? (
            <Text style={[styles.taskDescription, { color: tokens.textMuted }]} numberOfLines={3}>
              {task.description}
            </Text>
          ) : null}

          {/* Due time */}
          {task.dueTime ? (
            <View style={styles.dueTimeChip}>
              <Text style={[styles.dueTimeText, { color: tokens.accentOrange }]}>
                @ {formatDueTime(task.dueTime)}
              </Text>
            </View>
          ) : <View style={{ height: 32 }} />}

          {/* ── Timer (Req 12.2 — MM:SS updating every second) ── */}
          <View style={styles.timerContainer}>
            {/* Countdown / elapsed toggle */}
            <Pressable
              onPress={() => setCountDown(p => !p)}
              style={styles.timerModeBtn}
              accessibilityRole="button"
              accessibilityLabel={countDown ? 'Switch to elapsed time' : 'Switch to countdown'}
            >
              <Timer size={11} color={tokens.textMuted} />
              <Text style={[styles.timerModeText, { color: tokens.textMuted }]}>
                {countDown ? 'countdown' : 'elapsed'}
              </Text>
            </Pressable>

            {/* Large time display */}
            <Text style={[
              styles.timerDisplay,
              { color: isOverTime ? tokens.accentOrange : tokens.textPrimary },
            ]}>
              {isOverTime && countDown ? '+' : ''}{formatTime(displaySeconds)}
            </Text>

            {/* Progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: tokens.bgSecondary }]}>
              <View style={[
                styles.progressFill,
                {
                  width: `${progress}%` as any,
                  backgroundColor: isOverTime ? tokens.accentOrange : tokens.accentBlue,
                },
              ]} />
            </View>

            {/* Status line */}
            <Text style={[
              styles.statusLine,
              { color: isOverTime ? tokens.accentOrange : tokens.textMuted },
              isOverTime && { fontWeight: '600' },
            ]}>
              {statusText}
            </Text>
          </View>

          {/* Timer controls */}
          <View style={styles.controlsRow}>
            <Pressable
              onPress={handleReset}
              style={[styles.iconControlBtn, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}
              accessibilityRole="button"
              accessibilityLabel="Reset timer"
            >
              <RotateCcw size={20} color={tokens.textSecondary} />
            </Pressable>

            <Pressable
              onPress={handleToggleTimerClean}
              style={[styles.playBtn, { backgroundColor: tokens.accentBlue }]}
              accessibilityRole="button"
              accessibilityLabel={isTimerRunning ? 'Pause timer' : 'Start timer'}
            >
              {isTimerRunning
                ? <Pause size={22} color="#fff" />
                : <Play size={22} color="#fff" />}
              <Text style={styles.playBtnText}>
                {isTimerRunning ? 'Pause' : 'Start'}
              </Text>
            </Pressable>
          </View>

          {/* Complete button — enabled only after timer has started (Req 12.2) */}
          <Pressable
            onPress={() => handleComplete(task.id)}
            disabled={!hasStarted}
            style={[
              styles.completeBtn,
              hasStarted
                ? { backgroundColor: tokens.accentGreen, borderWidth: 0 }
                : { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary, borderWidth: 1 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasStarted }}
            accessibilityLabel={hasStarted ? 'Mark task as complete' : 'Start the timer first'}
          >
            <CheckCircle2 size={22} color={hasStarted ? '#fff' : tokens.textMuted} />
            <Text style={[
              styles.completeBtnText,
              { color: hasStarted ? '#fff' : tokens.textMuted },
            ]}>
              Mark as Complete
            </Text>
          </Pressable>

          {!hasStarted && (
            <Text style={[styles.startHint, { color: tokens.textMuted }]}>
              Start the timer to enable completion
            </Text>
          )}

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <View style={[styles.subtasksCard, { backgroundColor: tokens.bgSecondary }]}>
              <Text style={[styles.subtasksHeading, { color: tokens.textSecondary }]}>
                Subtasks ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
              </Text>
              {task.subtasks.map(subtask => (
                <View
                  key={subtask.id}
                  style={[styles.subtaskRow, { borderBottomColor: tokens.borderPrimary }]}
                >
                  {subtask.completed
                    ? <CheckCircle2 size={18} color={tokens.accentGreen} />
                    : <Circle size={18} color={tokens.textMuted} />}
                  <Text style={[
                    styles.subtaskTitle,
                    {
                      color: subtask.completed ? tokens.textMuted : tokens.textPrimary,
                      textDecorationLine: subtask.completed ? 'line-through' : 'none',
                    },
                  ]}>
                    {subtask.title}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  )
}

// ── Styles factory ─────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    // ── Full-screen overlay ──────────────────────────────────────────────────
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
      backgroundColor: tokens.bgPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 32,
      // On web we need pointer-events to allow tap-through to the content
      // below when the overlay is not covering (e.g. minimized state is handled
      // by the pill branch — this branch always takes full focus).
    },
    topButtons: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 56 : 24,
      right: 24,
      flexDirection: 'row',
      gap: 8,
    },
    headerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    headerBtnLabel: {
      fontSize: 14,
    },

    // ── Focus label ──────────────────────────────────────────────────────────
    focusLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 20,
    },
    focusLabelText: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },

    // ── Priority badge ───────────────────────────────────────────────────────
    priorityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 20,
      marginBottom: 16,
    },
    priorityText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // ── Task title + description ─────────────────────────────────────────────
    taskTitle: {
      fontSize: 30,
      fontWeight: '700',
      textAlign: 'center',
      maxWidth: 560,
      marginBottom: 8,
      lineHeight: 36,
    },
    taskDescription: {
      fontSize: 15,
      textAlign: 'center',
      maxWidth: 480,
      marginBottom: 20,
      lineHeight: 22,
    },

    // ── Due time chip ────────────────────────────────────────────────────────
    dueTimeChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: 'rgba(249,115,22,0.15)',
      marginBottom: 32,
    },
    dueTimeText: {
      fontSize: 14,
    },

    // ── Timer ────────────────────────────────────────────────────────────────
    timerContainer: {
      alignItems: 'center',
      marginBottom: 24,
      width: '100%',
    },
    timerModeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 8,
    },
    timerModeText: {
      fontSize: 11,
    },
    timerDisplay: {
      fontSize: 68,
      fontWeight: '700',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      letterSpacing: 4,
    },
    progressTrack: {
      width: 300,
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      marginTop: 16,
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    statusLine: {
      fontSize: 13,
      marginTop: 4,
    },

    // ── Controls ─────────────────────────────────────────────────────────────
    controlsRow: {
      flexDirection: 'row',
      gap: 16,
      alignItems: 'center',
      marginBottom: 32,
    },
    iconControlBtn: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    playBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 36,
      borderRadius: 12,
    },
    playBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },

    // ── Complete button ───────────────────────────────────────────────────────
    completeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 16,
      paddingHorizontal: 36,
      borderRadius: 12,
    },
    completeBtnText: {
      fontSize: 17,
      fontWeight: '600',
    },
    startHint: {
      fontSize: 11,
      marginTop: 8,
    },

    // ── Subtasks card ─────────────────────────────────────────────────────────
    subtasksCard: {
      marginTop: 36,
      width: '100%',
      maxWidth: 400,
      borderRadius: 12,
      padding: 20,
    },
    subtasksHeading: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 12,
    },
    subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    subtaskTitle: {
      fontSize: 14,
      flex: 1,
    },

    // ── Completed state ───────────────────────────────────────────────────────
    completedContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    completedHeading: {
      fontSize: 30,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 8,
    },
    completionNote: {
      fontSize: 15,
      fontWeight: '500',
      marginBottom: 4,
    },
    completionSub: {
      fontSize: 14,
      marginBottom: 24,
    },
    completedActions: {
      alignItems: 'center',
      gap: 12,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryBtn: {
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 12,
      borderWidth: 1,
    },
    secondaryBtnText: {
      fontSize: 15,
    },

    // ── Minimized pill (Req 12.3) ─────────────────────────────────────────────
    pillContainer: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 100 : 80,
      left: 16,
      right: 16,
      zIndex: 100,
      alignItems: 'center',
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 28,
      borderWidth: 1,
      // Shadow
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12 },
        android: { elevation: 8 },
        web: { boxShadow: '0 4px 12px rgba(0,0,0,0.18)' },
      }),
      maxWidth: 500,
    },
    pillTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
    },
    pillTimer: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      letterSpacing: 1,
      flexShrink: 0,
    },
    pillIconBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
  })
}
