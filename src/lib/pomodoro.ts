/**
 * pomodoro — pure, dependency-free helpers extracted from `usePomodoro`.
 *
 * These mirror the timer-completion/skip/progress/format logic verbatim so the
 * hook can import and call them without any runtime behavior change. No React,
 * AsyncStorage, or other I/O is referenced here.
 */

export const SESSIONS_BEFORE_LONG_BREAK = 4

export type PomodoroMode = 'work' | 'break' | 'longBreak'

export interface TimerAlertPayload {
  type: 'workDone' | 'breakDone' | 'longBreakEarned'
  sessions: number
  nextMode: PomodoroMode
  nextMinutes: number
}

export interface PomodoroDurations {
  workMinutes: number
  breakMinutes: number
  longBreakMinutes: number
}

export interface NextPhaseState {
  mode: PomodoroMode
  completedSessions: number
}

export interface NextPhaseResult {
  mode: PomodoroMode
  timeLeft: number
  completedSessions: number
  timerAlert: TimerAlertPayload
}

/**
 * Computes the next phase after a timer completes. Mirrors the branches in the
 * timer-completion effect of `usePomodoro` exactly:
 *  - work → longBreak when the new session count is a multiple of
 *    SESSIONS_BEFORE_LONG_BREAK ('longBreakEarned')
 *  - work → break otherwise ('workDone')
 *  - break | longBreak → work ('breakDone')
 */
export function computeNextPhase(
  state: NextPhaseState,
  durations: PomodoroDurations,
): NextPhaseResult {
  const { mode, completedSessions } = state
  const { workMinutes, breakMinutes, longBreakMinutes } = durations

  if (mode === 'work') {
    const newSessions = completedSessions + 1

    if (newSessions % SESSIONS_BEFORE_LONG_BREAK === 0) {
      return {
        mode: 'longBreak',
        timeLeft: longBreakMinutes * 60,
        completedSessions: newSessions,
        timerAlert: { type: 'longBreakEarned', sessions: newSessions, nextMode: 'longBreak', nextMinutes: longBreakMinutes },
      }
    }

    return {
      mode: 'break',
      timeLeft: breakMinutes * 60,
      completedSessions: newSessions,
      timerAlert: { type: 'workDone', sessions: newSessions, nextMode: 'break', nextMinutes: breakMinutes },
    }
  }

  return {
    mode: 'work',
    timeLeft: workMinutes * 60,
    completedSessions,
    timerAlert: { type: 'breakDone', sessions: completedSessions, nextMode: 'work', nextMinutes: workMinutes },
  }
}

export interface SkipResult {
  mode: PomodoroMode
  timeLeft: number
}

/**
 * Computes the phase after an explicit skip. Mirrors `skipToNext`:
 *  - work → break
 *  - anything else → work
 */
export function computeSkip(mode: PomodoroMode, durations: PomodoroDurations): SkipResult {
  if (mode === 'work') {
    return { mode: 'break', timeLeft: durations.breakMinutes * 60 }
  }
  return { mode: 'work', timeLeft: durations.workMinutes * 60 }
}

/**
 * Computes the progress percentage for the current phase, matching
 * `((totalSeconds - timeLeft) / totalSeconds) * 100`.
 */
export function computeProgress(
  mode: PomodoroMode,
  timeLeft: number,
  durations: PomodoroDurations,
): number {
  let totalSeconds: number
  if (mode === 'work') {
    totalSeconds = durations.workMinutes * 60
  } else if (mode === 'break') {
    totalSeconds = durations.breakMinutes * 60
  } else {
    totalSeconds = durations.longBreakMinutes * 60
  }
  return ((totalSeconds - timeLeft) / totalSeconds) * 100
}

/** Formats a number of seconds as mm:ss with zero padding. */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
