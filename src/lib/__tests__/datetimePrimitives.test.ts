/**
 * Tests for the directly-untested datetime.ts primitives:
 * parseYMD, toYMD, parseHHMM, toHHMM, monthName.
 *
 * The higher-level helpers (to12h/to24h/formatTime12h/formatDateDisplay/
 * buildMonthGrid/durationBetween/isValidSameDayRange/isValidHHMM) are covered
 * in datetime.test.ts and are intentionally not duplicated here.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  parseYMD,
  toYMD,
  parseHHMM,
  toHHMM,
  monthName,
} from '../datetime'

describe('parseYMD', () => {
  it('parses a valid date into a local midnight Date', () => {
    const date = parseYMD('2025-01-31')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2025)
    expect(date!.getMonth()).toBe(0)
    expect(date!.getDate()).toBe(31)
  })

  it('returns null for malformed input', () => {
    expect(parseYMD('2025-1-1')).toBeNull()
    expect(parseYMD('abc')).toBeNull()
    expect(parseYMD('')).toBeNull()
  })

  it('returns null for an overflowing date', () => {
    expect(parseYMD('2025-02-30')).toBeNull()
  })

  it('accepts a valid leap day and rejects one in a non-leap year', () => {
    expect(parseYMD('2024-02-29')).not.toBeNull()
    expect(parseYMD('2025-02-29')).toBeNull()
  })
})

describe('toYMD', () => {
  it('zero-pads month and day', () => {
    expect(toYMD(new Date(2025, 0, 5))).toBe('2025-01-05')
    expect(toYMD(new Date(2025, 11, 31))).toBe('2025-12-31')
  })
})

describe('Property: parseYMD -> toYMD round-trip', () => {
  it('toYMD(parseYMD(ymd)) === ymd for valid dates across 2000-2035', () => {
    const BASE_MS = new Date(2000, 0, 1).getTime()
    const TOP_DAYS = Math.floor(
      (new Date(2035, 11, 31).getTime() - BASE_MS) / 86_400_000,
    )
    fc.assert(
      fc.property(fc.integer({ min: 0, max: TOP_DAYS }), (n) => {
        const ymd = toYMD(new Date(BASE_MS + n * 86_400_000))
        const parsed = parseYMD(ymd)
        return parsed !== null && toYMD(parsed) === ymd
      }),
      { numRuns: 500 },
    )
  })
})

describe('parseHHMM', () => {
  it('parses a valid time into a Date with those hours and minutes', () => {
    const d = parseHHMM('23:59')
    expect(d).not.toBeNull()
    expect(d!.getHours()).toBe(23)
    expect(d!.getMinutes()).toBe(59)
  })

  it('returns null for an out-of-range hour', () => {
    expect(parseHHMM('24:00')).toBeNull()
  })

  it('returns null for an out-of-range minute', () => {
    expect(parseHHMM('12:60')).toBeNull()
  })

  it('returns null for a single-digit hour', () => {
    expect(parseHHMM('9:30')).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    expect(parseHHMM('xx')).toBeNull()
  })
})

describe('toHHMM', () => {
  it('zero-pads hours and minutes', () => {
    const d = new Date()
    d.setHours(9, 5, 0, 0)
    expect(toHHMM(d)).toBe('09:05')
    d.setHours(23, 59, 0, 0)
    expect(toHHMM(d)).toBe('23:59')
  })
})

describe('monthName', () => {
  it('maps 0 to January and 11 to December', () => {
    expect(monthName(0)).toBe('January')
    expect(monthName(11)).toBe('December')
  })

  it('returns an empty string for out-of-range indices', () => {
    expect(monthName(-1)).toBe('')
    expect(monthName(12)).toBe('')
  })
})
