/**
 * datetime.ts — pure, side-effect-free date & time helpers.
 *
 * These back the themed CalendarPicker / WheelTimePicker components and the
 * DatePickerField / TimePickerField wrappers. Keeping them here (no React / RN
 * imports) means they can be unit-tested under the project's node/vitest setup
 * and keeps business logic out of the presentation layer.
 *
 * Conventions:
 *   - Dates are YYYY-MM-DD strings ('' when unset).
 *   - Times are HH:MM 24-hour strings (null when unset).
 */

export type Period = 'AM' | 'PM'

/** A single cell in the month grid. */
export interface MonthCell {
  /** YYYY-MM-DD for this cell. */
  ymd: string
  /** Day-of-month number (1-31). */
  day: number
  /** False for leading/trailing days that belong to adjacent months. */
  inMonth: boolean
}

// ─── Date (YYYY-MM-DD) ─────────────────────────────────────────────────────────

/** Convert YYYY-MM-DD → local Date (midnight). Returns null for invalid input. */
export function parseYMD(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  // Reject overflow (e.g. 2025-02-30 rolling into March).
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null
  }
  return date
}

/** Convert Date → YYYY-MM-DD (local). */
export function toYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Validate that a raw string is a proper YYYY-MM-DD date. */
export function isValidYMD(str: string): boolean {
  return parseYMD(str) !== null
}

// ─── Time (HH:MM 24h) ──────────────────────────────────────────────────────────

/** Parse HH:MM (24h) into a Date (today's date with that time). Null if invalid. */
export function parseHHMM(hhmm: string): Date | null {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (h > 23 || m > 59) return null
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

/** Convert a Date → HH:MM (24h). */
export function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Validate that a raw string is a proper HH:MM (24h) time. */
export function isValidHHMM(str: string): boolean {
  return parseHHMM(str) !== null
}

// ─── 24h ↔ 12h conversion ────────────────────────────────────────────────────

/**
 * Convert a 24-hour HH:MM string into 12-hour parts.
 * '00:xx' → 12 AM, '12:xx' → 12 PM, '13:00' → 1 PM.
 * Returns null for null / invalid input.
 */
export function to12h(hhmm: string | null): { hour12: number; minute: number; period: Period } | null {
  if (hhmm === null || !isValidHHMM(hhmm)) return null
  const [h, m] = hhmm.split(':').map(Number)
  const period: Period = h < 12 ? 'AM' : 'PM'
  let hour12 = h % 12
  if (hour12 === 0) hour12 = 12
  return { hour12, minute: m, period }
}

/**
 * Inverse of to12h: convert 12-hour parts to a zero-padded 24-hour HH:MM string.
 * 12 AM → '00', 12 PM → '12'.
 */
export function to24h(hour12: number, minute: number, period: Period): string {
  let h = hour12 % 12 // 12 → 0
  if (period === 'PM') h += 12
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// ─── Display formatters ────────────────────────────────────────────────────────

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Full month name for a 0-based month index (0 = January). '' if out of range. */
export function monthName(monthIndex0: number): string {
  return MONTHS_LONG[monthIndex0] ?? ''
}

/** Display a time as 12-hour with AM/PM, e.g. '2:05 PM'. '' when null/invalid. */
export function formatTime12h(hhmm: string | null): string {
  const parts = to12h(hhmm)
  if (!parts) return ''
  return `${parts.hour12}:${String(parts.minute).padStart(2, '0')} ${parts.period}`
}

/** Display a YYYY-MM-DD date as e.g. 'Jan 31, 2025'. '' for empty/invalid. */
export function formatDateDisplay(ymd: string): string {
  const date = parseYMD(ymd)
  if (!date) return ''
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

// ─── Month grid ────────────────────────────────────────────────────────────────

/**
 * Build a month grid as weeks × 7 cells, week starting Sunday.
 * Leading/trailing days from adjacent months are flagged `inMonth: false`.
 */
export function buildMonthGrid(year: number, monthIndex0: number): MonthCell[][] {
  const firstOfMonth = new Date(year, monthIndex0, 1)
  const startWeekday = firstOfMonth.getDay() // 0 = Sunday

  // Start from the Sunday on or before the 1st.
  const gridStart = new Date(year, monthIndex0, 1 - startWeekday)

  const weeks: MonthCell[][] = []
  const cursor = new Date(gridStart)

  // Always render 6 weeks so the grid height is stable, then trim trailing
  // weeks that are entirely out of month.
  for (let week = 0; week < 6; week++) {
    const row: MonthCell[] = []
    for (let d = 0; d < 7; d++) {
      row.push({
        ymd: toYMD(cursor),
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === monthIndex0,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(row)
  }

  // Drop a trailing week only if none of its cells are in the month.
  while (weeks.length > 4 && weeks[weeks.length - 1].every((c) => !c.inMonth)) {
    weeks.pop()
  }

  return weeks
}
