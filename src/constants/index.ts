/**
 * src/constants/index.ts
 *
 * App-wide constants that are referenced from multiple files.
 * No business logic here — pure literals only.
 */

/** Breakpoint (px) above which the web sidebar layout is shown. */
export const SIDEBAR_BREAKPOINT = 768

/** Maximum overdue badge count shown in the tab bar. */
export const OVERDUE_BADGE_MAX = 99

/** Auto-save debounce delay for DailyNotes (ms). */
export const NOTES_AUTOSAVE_DELAY = 800

/** Pomodoro default durations (minutes). */
export const POMODORO_WORK_MINUTES = 25
export const POMODORO_SHORT_BREAK_MINUTES = 5
export const POMODORO_LONG_BREAK_MINUTES = 15
