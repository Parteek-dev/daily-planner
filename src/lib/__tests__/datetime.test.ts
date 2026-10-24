import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  to12h,
  to24h,
  formatTime12h,
  formatDateDisplay,
  buildMonthGrid,
  durationBetween,
  isValidSameDayRange,
  parseYMD,
  toYMD,
  isValidHHMM,
  type Period,
} from '../datetime'

// ---------------------------------------------------------------------------
// 24h ↔ 12h conversion
// ---------------------------------------------------------------------------

describe('to12h', () => {
  it('maps midnight hours to 12 AM', () => {
    expect(to12h('00:00')).toEqual({ hour12: 12, minute: 0, period: 'AM' })
    expect(to12h('00:30')).toEqual({ hour12: 12, minute: 30, period: 'AM' })
  })

  it('maps noon hours to 12 PM', () => {
    expect(to12h('12:00')).toEqual({ hour12: 12, minute: 0, period: 'PM' })
    expect(to12h('12:45')).toEqual({ hour12: 12, minute: 45, period: 'PM' })
  })

  it('maps afternoon hours correctly', () => {
    expect(to12h('13:00')).toEqual({ hour12: 1, minute: 0, period: 'PM' })
    expect(to12h('14:30')).toEqual({ hour12: 2, minute: 30, period: 'PM' })
    expect(to12h('23:59')).toEqual({ hour12: 11, minute: 59, period: 'PM' })
  })

  it('returns null for null or malformed input', () => {
    expect(to12h(null)).toBeNull()
    expect(to12h('')).toBeNull()
    expect(to12h('25:00')).toBeNull()
    expect(to12h('9:30')).toBeNull()
    expect(to12h('nope')).toBeNull()
  })
})

describe('to24h', () => {
  it('maps 12 AM to 00 and 12 PM to 12', () => {
    expect(to24h(12, 0, 'AM')).toBe('00:00')
    expect(to24h(12, 0, 'PM')).toBe('12:00')
  })

  it('zero-pads hours and minutes', () => {
    expect(to24h(1, 5, 'AM')).toBe('01:05')
    expect(to24h(2, 30, 'PM')).toBe('14:30')
  })
})

describe('Property: to24h/to12h round-trip over all 24 hours', () => {
  it('to24h(to12h(hh:mm)) === hh:mm for every valid hour/minute', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        (h, m) => {
          const hhmm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
          const parts = to12h(hhmm)
          if (!parts) return false
          return to24h(parts.hour12, parts.minute, parts.period) === hhmm
        },
      ),
      { numRuns: 500 },
    )
  })

  it('to12h(to24h(parts)) === parts for every 12h combination', () => {
    const periods: Period[] = ['AM', 'PM']
    for (const period of periods) {
      for (let hour12 = 1; hour12 <= 12; hour12++) {
        for (const minute of [0, 5, 30, 59]) {
          const hhmm = to24h(hour12, minute, period)
          expect(to12h(hhmm)).toEqual({ hour12, minute, period })
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Display formatters
// ---------------------------------------------------------------------------

describe('formatTime12h', () => {
  it('formats a known 24h time as 12-hour AM/PM', () => {
    expect(formatTime12h('14:30')).toBe('2:30 PM')
    expect(formatTime12h('00:05')).toBe('12:05 AM')
    expect(formatTime12h('12:00')).toBe('12:00 PM')
    expect(formatTime12h('09:00')).toBe('9:00 AM')
  })

  it('returns empty string for null / empty / malformed', () => {
    expect(formatTime12h(null)).toBe('')
    expect(formatTime12h('')).toBe('')
    expect(formatTime12h('99:99')).toBe('')
  })
})

describe('formatDateDisplay', () => {
  it('formats a valid YMD', () => {
    expect(formatDateDisplay('2025-01-31')).toBe('Jan 31, 2025')
    expect(formatDateDisplay('2025-12-01')).toBe('Dec 1, 2025')
  })

  it('returns empty string for empty / malformed / overflow dates', () => {
    expect(formatDateDisplay('')).toBe('')
    expect(formatDateDisplay('not-a-date')).toBe('')
    expect(formatDateDisplay('2025-02-30')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Month grid
// ---------------------------------------------------------------------------

describe('buildMonthGrid', () => {
  it('always returns a fixed flat 42-cell grid (6 rows x 7)', () => {
    // A month needing 6 week-rows (May 2027: 1st is Saturday, 31 days)…
    expect(buildMonthGrid(2027, 4)).toHaveLength(42)
    // …and a month needing only 5 rows is still padded to 42.
    expect(buildMonthGrid(2025, 1)).toHaveLength(42) // Feb 2025
    expect(buildMonthGrid(2024, 0)).toHaveLength(42) // Jan 2024
  })

  it('flags out-of-month leading/trailing days and includes every in-month day', () => {
    // Feb 2025: 1st is a Saturday, 28 days.
    const cells = buildMonthGrid(2025, 1)

    const inMonthDays = cells
      .filter((c) => c.inCurrentMonth)
      .map((c) => Number(c.ymd.slice(8, 10)))
    // All 28 days present, in order, exactly once.
    expect(inMonthDays).toEqual(Array.from({ length: 28 }, (_, i) => i + 1))

    // Leading cells before Feb 1 (Saturday) are out-of-month.
    expect(cells[0].inCurrentMonth).toBe(false)
    expect(cells.slice(0, 6).every((c) => !c.inCurrentMonth)).toBe(true)
    // First in-month cell is Feb 1.
    expect(cells[6]).toMatchObject({ inCurrentMonth: true, ymd: '2025-02-01' })
  })

  it('produces cells whose ymd parses back to a valid date', () => {
    for (const cell of buildMonthGrid(2024, 0)) {
      expect(parseYMD(cell.ymd)).not.toBeNull()
    }
  })

  it('marks exactly the real current date as isToday', () => {
    const now = new Date()
    const todayYMD = toYMD(now)
    const cells = buildMonthGrid(now.getFullYear(), now.getMonth())
    const todayCells = cells.filter((c) => c.isToday)
    expect(todayCells).toHaveLength(1)
    expect(todayCells[0].ymd).toBe(todayYMD)
    expect(todayCells[0].inCurrentMonth).toBe(true)
  })

  it('has no isToday cell for a month that is not the current month', () => {
    // A month far in the past can never contain today.
    const cells = buildMonthGrid(2000, 0) // Jan 2000
    expect(cells.some((c) => c.isToday)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Same-day time range
// ---------------------------------------------------------------------------

describe('durationBetween', () => {
  it('computes minutes for a valid same-day range', () => {
    expect(durationBetween('09:30', '10:30')).toBe(60)
    expect(durationBetween('09:00', '09:15')).toBe(15)
    expect(durationBetween('00:00', '23:59')).toBe(1439)
  })

  it('returns null when end is not strictly after start (no cross-midnight)', () => {
    expect(durationBetween('10:00', '10:00')).toBeNull() // equal
    expect(durationBetween('10:00', '09:00')).toBeNull() // end before start
    expect(durationBetween('23:00', '01:00')).toBeNull() // would cross midnight
  })

  it('returns null for null or malformed input', () => {
    expect(durationBetween(null, '10:00')).toBeNull()
    expect(durationBetween('09:00', null)).toBeNull()
    expect(durationBetween('bad', '10:00')).toBeNull()
    expect(durationBetween('09:00', '99:99')).toBeNull()
  })
})

describe('isValidSameDayRange', () => {
  it('is true only when end is strictly after start on the same day', () => {
    expect(isValidSameDayRange('09:30', '10:30')).toBe(true)
    expect(isValidSameDayRange('10:00', '10:00')).toBe(false)
    expect(isValidSameDayRange('10:00', '09:00')).toBe(false)
    expect(isValidSameDayRange('23:00', '01:00')).toBe(false)
    expect(isValidSameDayRange(null, '10:00')).toBe(false)
  })
})

// Sanity: isValidHHMM used by components agrees with to12h.
describe('isValidHHMM', () => {
  it('accepts valid times and rejects invalid ones', () => {
    expect(isValidHHMM('00:00')).toBe(true)
    expect(isValidHHMM('23:59')).toBe(true)
    expect(isValidHHMM('24:00')).toBe(false)
    expect(isValidHHMM('12:60')).toBe(false)
  })
})
