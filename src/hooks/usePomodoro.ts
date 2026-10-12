import { useState, useEffect, useRef, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const POMODORO_KEY = 'planner_pomodoro'
const DEFAULT_WORK_MINUTES = 25
const DEFAULT_BREAK_MINUTES = 5
const DEFAULT_LONG_BREAK_MINUTES = 15
const SESSIONS_BEFORE_LONG_BREAK = 4

type PomodoroMode = 'work' | 'break' | 'longBreak'

interface TimerAlertPayload {
  type: 'workDone' | 'breakDone' | 'longBreakEarned'
  sessions: number
  nextMode: PomodoroMode
  nextMinutes: number
}

interface PomodoroSettings {
  workMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  soundEnabled: boolean
}

export interface UsePomodoroReturn {
  mode: PomodoroMode
  timeLeft: number
  isRunning: boolean
  completedSessions: number
  soundEnabled: boolean
  workMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  progress: number
  formattedTime: string
  timerAlert: TimerAlertPayload | null
  dismissTimerAlert: () => void
  startNextPhase: () => void
  toggleTimer: () => void
  resetTimer: () => void
  skipToNext: () => void
  setSoundEnabled: (enabled: boolean) => void
  setWorkMinutes: (minutes: number) => void
  setBreakMinutes: (minutes: number) => void
  setLongBreakMinutes: (minutes: number) => void
  formatTime: (seconds: number) => string
  SESSIONS_BEFORE_LONG_BREAK: number
}

export default function usePomodoro(): UsePomodoroReturn {
  const [mode, setMode] = useState<PomodoroMode>('work')
  const [timeLeft, setTimeLeft] = useState(DEFAULT_WORK_MINUTES * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  // timerAlert: shown as persistent toast widget when timer ends
  // { type: 'workDone'|'breakDone'|'longBreakEarned', sessions, nextMode, nextMinutes }
  const [timerAlert, setTimerAlert] = useState<TimerAlertPayload | null>(null)

  // Customizable durations
  const [workMinutes, setWorkMinutes] = useState(DEFAULT_WORK_MINUTES)
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MINUTES)
  const [longBreakMinutes, setLongBreakMinutes] = useState(DEFAULT_LONG_BREAK_MINUTES)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load settings from AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem(POMODORO_KEY)
        if (saved) {
          const settings: Partial<PomodoroSettings> = JSON.parse(saved)
          setWorkMinutes(settings.workMinutes ?? DEFAULT_WORK_MINUTES)
          setBreakMinutes(settings.breakMinutes ?? DEFAULT_BREAK_MINUTES)
          setLongBreakMinutes(settings.longBreakMinutes ?? DEFAULT_LONG_BREAK_MINUTES)
          setSoundEnabled(settings.soundEnabled ?? true)
        }
      } catch (e) {
        console.error('Failed to parse pomodoro settings', e)
      }
    }
    loadSettings()
  }, [])

  // Save settings
  const saveSettings = useCallback(async () => {
    try {
      await AsyncStorage.setItem(POMODORO_KEY, JSON.stringify({
        workMinutes,
        breakMinutes,
        longBreakMinutes,
        soundEnabled,
      }))
    } catch (e) {
      console.error('Failed to save pomodoro settings', e)
    }
  }, [workMinutes, breakMinutes, longBreakMinutes, soundEnabled])

  useEffect(() => {
    saveSettings()
  }, [saveSettings])

  // Sound is handled by expo-av at the call site (timer screen).
  // Notifications are handled by useNotifications via expo-notifications.
  // Both are triggered via the timerAlert state that the UI consumes.

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && isRunning) {
      // Timer completed
      setIsRunning(false)

      if (mode === 'work') {
        const newSessions = completedSessions + 1
        setCompletedSessions(newSessions)

        if (newSessions % SESSIONS_BEFORE_LONG_BREAK === 0) {
          setMode('longBreak')
          setTimeLeft(longBreakMinutes * 60)
          setTimerAlert({ type: 'longBreakEarned', sessions: newSessions, nextMode: 'longBreak', nextMinutes: longBreakMinutes })
        } else {
          setMode('break')
          setTimeLeft(breakMinutes * 60)
          setTimerAlert({ type: 'workDone', sessions: newSessions, nextMode: 'break', nextMinutes: breakMinutes })
        }
      } else {
        setMode('work')
        setTimeLeft(workMinutes * 60)
        setTimerAlert({ type: 'breakDone', sessions: completedSessions, nextMode: 'work', nextMinutes: workMinutes })
      }
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft, mode, completedSessions, workMinutes, breakMinutes, longBreakMinutes])

  // Update time when settings change (if not running)
  useEffect(() => {
    if (!isRunning) {
      if (mode === 'work') setTimeLeft(workMinutes * 60)
      else if (mode === 'break') setTimeLeft(breakMinutes * 60)
      else setTimeLeft(longBreakMinutes * 60)
    }
  }, [workMinutes, breakMinutes, longBreakMinutes, mode, isRunning])

  const dismissTimerAlert = useCallback(() => setTimerAlert(null), [])

  // Start the next phase immediately from the alert widget
  const startNextPhase = useCallback(() => {
    setTimerAlert(null)
    setIsRunning(true)
  }, [])

  const toggleTimer = useCallback(() => setIsRunning(prev => !prev), [])

  const resetTimer = useCallback(() => {
    setIsRunning(false)
    setMode('work')
    setTimeLeft(workMinutes * 60)
    setCompletedSessions(0)
  }, [workMinutes])

  const skipToNext = useCallback(() => {
    setIsRunning(false)
    if (mode === 'work') {
      setMode('break')
      setTimeLeft(breakMinutes * 60)
    } else {
      setMode('work')
      setTimeLeft(workMinutes * 60)
    }
  }, [mode, breakMinutes, workMinutes])

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  let totalSeconds: number
  if (mode === 'work') {
    totalSeconds = workMinutes * 60
  } else if (mode === 'break') {
    totalSeconds = breakMinutes * 60
  } else {
    totalSeconds = longBreakMinutes * 60
  }
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100

  return {
    mode,
    timeLeft,
    isRunning,
    completedSessions,
    soundEnabled,
    workMinutes,
    breakMinutes,
    longBreakMinutes,
    progress,
    formattedTime: formatTime(timeLeft),
    timerAlert,
    dismissTimerAlert,
    startNextPhase,
    toggleTimer,
    resetTimer,
    skipToNext,
    setSoundEnabled,
    setWorkMinutes,
    setBreakMinutes,
    setLongBreakMinutes,
    formatTime,
    SESSIONS_BEFORE_LONG_BREAK,
  }
}
