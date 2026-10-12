import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { fmtDuration, parseDuration } from '../utils'

// ---------------------------------------------------------------------------
// Smoke tests — specific values
// ---------------------------------------------------------------------------

describe('fmtDuration', () => {
  it('formats minutes below 60 as "Nm"', () => {
    expect(fmtDuration(45)).toBe('45m')
    expect(fmtDuration(1)).toBe('1m')
    expect(fmtDuration(59)).toBe('59m')
  })

  it('formats exact hours as "Nh"', () => {
    expect(fmtDuration(60)).toBe('1h')
    expect(fmtDuration(120)).toBe('2h')
    expect(fmtDuration(480)).toBe('8h')
  })

  it('formats mixed hours and minutes as "Nh Mm"', () => {
    expect(fmtDuration(90)).toBe('1h 30m')
    expect(fmtDuration(75)).toBe('1h 15m')
    expect(fmtDuration(135)).toBe('2h 15m')
  })

  it('returns empty string for null/undefined', () => {
    expect(fmtDuration(null)).toBe('')
    expect(fmtDuration(undefined)).toBe('')
  })
})

describe('parseDuration', () => {
  it('parses plain integer strings as minutes', () => {
    expect(parseDuration('30')).toBe(30)
    expect(parseDuration('90')).toBe(90)
  })

  it('parses "Xm" notation', () => {
    expect(parseDuration('45m')).toBe(45)
    expect(parseDuration('90min')).toBe(90)
  })

  it('parses "Xh" notation', () => {
    expect(parseDuration('1h')).toBe(60)
    expect(parseDuration('2h')).toBe(120)
  })

  it('parses "1.5h" decimal hour notation', () => {
    expect(parseDuration('1.5h')).toBe(90)
  })

  it('parses "Xh Ym" combined notation', () => {
    expect(parseDuration('1h 30m')).toBe(90)
    expect(parseDuration('2h15m')).toBe(135)
  })

  it('returns null for null/undefined/empty', () => {
    expect(parseDuration(null)).toBeNull()
    expect(parseDuration(undefined)).toBeNull()
    expect(parseDuration('')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Property 1: Duration format round-trip
// Validates: Requirements 24.2
// ---------------------------------------------------------------------------

describe('Property 1: Duration format round-trip', () => {
  it('parseDuration(fmtDuration(n)) === n for any integer n in 1–480', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 480 }), (n) => {
        const formatted = fmtDuration(n)
        const parsed = parseDuration(formatted)
        return parsed === n
      }),
      { numRuns: 200 },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 3: parseDuration returns null on unrecognized input
// Validates: Requirements 24.4
// ---------------------------------------------------------------------------

// Patterns that parseDuration recognizes as valid
const VALID_PATTERNS = [
  /^\d+$/,           // plain integer → minutes
  /^\d+m$/i,         // "30m"
  /^\d+min$/i,       // "30min"
  /^\d+minutes?$/i,  // "30minute" / "30minutes"
  /^\d+h$/i,         // "2h"
  /^\d+hr$/i,        // "2hr"
  /^\d+hours?$/i,    // "2hour" / "2hours"
  /^\d+(\.\d+)?h$/i, // "1.5h"
  /^\d+(\.\d+)?hr$/i,
  /^\d+(\.\d+)?hours?$/i,
  /^\d+h\s*\d+m?$/i, // "1h30" or "1h 30m" family
  /^\d+h\s*\d+min$/i,
]

function looksLikeValidDuration(s: string): boolean {
  const lower = s.trim().toLowerCase()
  return VALID_PATTERNS.some((p) => p.test(lower))
}

describe('Property 3: parseDuration returns null on unrecognized input', () => {
  it('returns null without throwing for any string that does not match a valid duration format', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !looksLikeValidDuration(s)),
        (s) => {
          let result: number | null | undefined
          let threw = false
          try {
            result = parseDuration(s)
          } catch {
            threw = true
          }
          return !threw && result === null
        },
      ),
      { numRuns: 500 },
    )
  })
})
