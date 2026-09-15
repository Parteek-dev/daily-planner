import { useState, useEffect, useRef, useCallback } from 'react'

const POMODORO_KEY = 'planner_pomodoro'
const DEFAULT_WORK_MINUTES = 25
const DEFAULT_BREAK_MINUTES = 5
const DEFAULT_LONG_BREAK_MINUTES = 15
const SESSIONS_BEFORE_LONG_BREAK = 4

export default function usePomodoro() {
  const [mode, setMode] = useState('work') // 'work' | 'break' | 'longBreak'
  const [timeLeft, setTimeLeft] = useState(DEFAULT_WORK_MINUTES * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  // timerAlert: shown as persistent toast widget when timer ends
  // { type: 'workDone'|'breakDone'|'longBreakEarned', sessions, nextMode, nextMinutes }
  const [timerAlert, setTimerAlert] = useState(null)
  
  // Customizable durations
  const [workMinutes, setWorkMinutes] = useState(DEFAULT_WORK_MINUTES)
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MINUTES)
  const [longBreakMinutes, setLongBreakMinutes] = useState(DEFAULT_LONG_BREAK_MINUTES)

  const intervalRef = useRef(null)

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(POMODORO_KEY)
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        setWorkMinutes(settings.workMinutes ?? DEFAULT_WORK_MINUTES)
        setBreakMinutes(settings.breakMinutes ?? DEFAULT_BREAK_MINUTES)
        setLongBreakMinutes(settings.longBreakMinutes ?? DEFAULT_LONG_BREAK_MINUTES)
        setSoundEnabled(settings.soundEnabled ?? true)
      } catch (e) {
        console.error('Failed to parse pomodoro settings', e)
      }
    }
  }, [])

  // Save settings
  const saveSettings = useCallback(() => {
    localStorage.setItem(POMODORO_KEY, JSON.stringify({
      workMinutes,
      breakMinutes,
      longBreakMinutes,
      soundEnabled,
    }))
  }, [workMinutes, breakMinutes, longBreakMinutes, soundEnabled])

  useEffect(() => {
    saveSettings()
  }, [saveSettings])

  // Play sound — 3 ascending beeps so it's hard to miss
  const playSound = useCallback(() => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()

      const beep = (freq, startTime, duration = 0.18) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
        osc.start(startTime)
        osc.stop(startTime + duration + 0.05)
      }

      // Three beeps: low → mid → high
      beep(600, ctx.currentTime)
      beep(750, ctx.currentTime + 0.25)
      beep(900, ctx.currentTime + 0.50)
    } catch (e) {
      console.log('Audio not supported')
    }
  }, [soundEnabled])

  // Send browser notification when timer ends
  const sendNotification = useCallback((title, body) => {
    if (!('Notification' in window)) return
    const send = () => {
      try {
        const n = new Notification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: 'pomodoro-timer',   // replaces previous one so they don't stack
          requireInteraction: true, // stays until user dismisses
        })
        // Auto-close after 8 seconds if user doesn't interact
        setTimeout(() => n.close(), 8000)
      } catch (e) {
        console.log('Notification failed', e)
      }
    }

    if (Notification.permission === 'granted') {
      send()
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') send()
      })
    }
  }, [])

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && isRunning) {
      // Timer completed
      playSound()
      setIsRunning(false)
      
      if (mode === 'work') {
        const newSessions = completedSessions + 1
        setCompletedSessions(newSessions)
        
        if (newSessions % SESSIONS_BEFORE_LONG_BREAK === 0) {
          setMode('longBreak')
          setTimeLeft(longBreakMinutes * 60)
          setTimerAlert({ type: 'longBreakEarned', sessions: newSessions, nextMode: 'longBreak', nextMinutes: longBreakMinutes })
          sendNotification(
            '🛋️ Time for a long break!',
            `Great work! You completed ${newSessions} sessions. Take a ${longBreakMinutes}-minute break — you earned it.`
          )
        } else {
          setMode('break')
          setTimeLeft(breakMinutes * 60)
          setTimerAlert({ type: 'workDone', sessions: newSessions, nextMode: 'break', nextMinutes: breakMinutes })
          sendNotification(
            '☕ Focus session complete!',
            `Session ${newSessions} done. Take a ${breakMinutes}-minute break before the next sprint.`
          )
        }
      } else {
        setMode('work')
        setTimeLeft(workMinutes * 60)
        setTimerAlert({ type: 'breakDone', sessions: completedSessions, nextMode: 'work', nextMinutes: workMinutes })
        sendNotification(
          '🧠 Break over — let\'s focus!',
          `Your ${mode === 'longBreak' ? 'long ' : ''}break is done. Start your next ${workMinutes}-minute focus session.`
        )
      }
    }

    return () => clearInterval(intervalRef.current)
  }, [isRunning, timeLeft, mode, completedSessions, workMinutes, breakMinutes, longBreakMinutes, playSound, sendNotification])

  // Update browser tab title while timer runs so it's visible on other tabs
  useEffect(() => {
    if (isRunning) {
      const modeLabel = mode === 'work' ? '🧠 Focus' : mode === 'break' ? '☕ Break' : '🛋️ Long Break'
      const mins = Math.floor(timeLeft / 60)
      const secs = timeLeft % 60
      document.title = `${modeLabel} ${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')} — Daily Planner`
    } else {
      document.title = 'Daily Planner'
    }
    return () => { document.title = 'Daily Planner' }
  }, [isRunning, timeLeft, mode])
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

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  const progress = (() => {
    const total = mode === 'work' 
      ? workMinutes * 60 
      : mode === 'break' 
        ? breakMinutes * 60 
        : longBreakMinutes * 60
    return ((total - timeLeft) / total) * 100
  })()

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
