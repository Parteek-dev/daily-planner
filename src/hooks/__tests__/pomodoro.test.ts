import { describe, it, expect } from 'vitest'
import {
  SESSIONS_BEFORE_LONG_BREAK,
  computeNextPhase,
  computeSkip,
  computeProgress,
  formatTime,
} from '@/src/lib/pomodoro'

const DEFAULT_DURATIONS = { workMinutes: 25, breakMinutes: 5, longBreakMinutes: 15 }

describe('computeNextPhase', () => {
  it('transitions work -> break and increments the session with a workDone alert', () => {
    const result = computeNextPhase({ mode: 'work', completedSessions: 0 }, DEFAULT_DURATIONS)
    expect(result.mode).toBe('break')
    expect(result.completedSessions).toBe(1)
    expect(result.timeLeft).toBe(5 * 60)
    expect(result.timerAlert).toEqual({ type: 'workDone', sessions: 1, nextMode: 'break', nextMinutes: 5 })
  })

  it('transitions to a long break on the SESSIONS_BEFORE_LONG_BREAK-th session with a longBreakEarned alert', () => {
    const result = computeNextPhase(
      { mode: 'work', completedSessions: SESSIONS_BEFORE_LONG_BREAK - 1 },
      DEFAULT_DURATIONS,
    )
    expect(result.mode).toBe('longBreak')
    expect(result.completedSessions).toBe(SESSIONS_BEFORE_LONG_BREAK)
    expect(result.timeLeft).toBe(15 * 60)
    expect(result.timerAlert).toEqual({
      type: 'longBreakEarned',
      sessions: SESSIONS_BEFORE_LONG_BREAK,
      nextMode: 'longBreak',
      nextMinutes: 15,
    })
  })

  it('transitions break -> work, resets to workMinutes*60, with a breakDone alert', () => {
    const result = computeNextPhase({ mode: 'break', completedSessions: 2 }, DEFAULT_DURATIONS)
    expect(result.mode).toBe('work')
    expect(result.completedSessions).toBe(2)
    expect(result.timeLeft).toBe(25 * 60)
    expect(result.timerAlert).toEqual({ type: 'breakDone', sessions: 2, nextMode: 'work', nextMinutes: 25 })
  })

  it('transitions longBreak -> work without changing the session count', () => {
    const result = computeNextPhase({ mode: 'longBreak', completedSessions: 4 }, DEFAULT_DURATIONS)
    expect(result.mode).toBe('work')
    expect(result.completedSessions).toBe(4)
    expect(result.timeLeft).toBe(25 * 60)
    expect(result.timerAlert).toEqual({ type: 'breakDone', sessions: 4, nextMode: 'work', nextMinutes: 25 })
  })

  it('respects custom durations', () => {
    const custom = { workMinutes: 50, breakMinutes: 10, longBreakMinutes: 30 }
    expect(computeNextPhase({ mode: 'work', completedSessions: 0 }, custom).timeLeft).toBe(10 * 60)
    expect(computeNextPhase({ mode: 'break', completedSessions: 1 }, custom).timeLeft).toBe(50 * 60)
    expect(
      computeNextPhase({ mode: 'work', completedSessions: SESSIONS_BEFORE_LONG_BREAK - 1 }, custom).timeLeft,
    ).toBe(30 * 60)
  })
})

describe('computeSkip', () => {
  it('skips work -> break', () => {
    expect(computeSkip('work', DEFAULT_DURATIONS)).toEqual({ mode: 'break', timeLeft: 5 * 60 })
  })

  it('skips break -> work', () => {
    expect(computeSkip('break', DEFAULT_DURATIONS)).toEqual({ mode: 'work', timeLeft: 25 * 60 })
  })

  it('skips longBreak -> work', () => {
    expect(computeSkip('longBreak', DEFAULT_DURATIONS)).toEqual({ mode: 'work', timeLeft: 25 * 60 })
  })
})

describe('computeProgress', () => {
  it('is 0 at the start of a phase', () => {
    expect(computeProgress('work', 25 * 60, DEFAULT_DURATIONS)).toBe(0)
  })

  it('is 50 at the midpoint of a phase', () => {
    expect(computeProgress('work', 25 * 30, DEFAULT_DURATIONS)).toBe(50)
  })

  it('is 100 at the end of a phase', () => {
    expect(computeProgress('work', 0, DEFAULT_DURATIONS)).toBe(100)
  })

  it('uses break and longBreak durations for the total', () => {
    expect(computeProgress('break', 0, DEFAULT_DURATIONS)).toBe(100)
    expect(computeProgress('longBreak', 15 * 60, DEFAULT_DURATIONS)).toBe(0)
  })
})

describe('formatTime', () => {
  it('formats zero as 00:00', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('formats 65 seconds as 01:05', () => {
    expect(formatTime(65)).toBe('01:05')
  })

  it('formats 3600 seconds as 60:00', () => {
    expect(formatTime(3600)).toBe('60:00')
  })
})
