/**
 * Tests for the dependency-free pure helpers in src/utils/index.ts.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { clamp, isHexColor } from '@/src/utils'

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('clamps to min when below range', () => {
    expect(clamp(-1, 0, 10)).toBe(0)
  })

  it('clamps to max when above range', () => {
    expect(clamp(11, 0, 10)).toBe(10)
  })

  it('returns the bound when min equals max', () => {
    expect(clamp(5, 3, 3)).toBe(3)
    expect(clamp(1, 3, 3)).toBe(3)
  })

  it('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5)
    expect(clamp(-20, -10, -1)).toBe(-10)
    expect(clamp(0, -10, -1)).toBe(-1)
  })

  it('always returns a value within [min, max] for min <= max', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (x, a, b) => {
          const min = Math.min(a, b)
          const max = Math.max(a, b)
          const result = clamp(x, min, max)
          return result >= min && result <= max
        },
      ),
      { numRuns: 500 },
    )
  })
})

describe('isHexColor', () => {
  it('accepts a lowercase #rrggbb value', () => {
    expect(isHexColor('#64748b')).toBe(true)
  })

  it('accepts an uppercase #rrggbb value', () => {
    expect(isHexColor('#AABBCC')).toBe(true)
  })

  it('rejects the 3-digit shorthand form', () => {
    expect(isHexColor('#fff')).toBe(false)
  })

  it('rejects a value missing the leading #', () => {
    expect(isHexColor('64748b')).toBe(false)
  })

  it('rejects a value of the wrong length', () => {
    expect(isHexColor('#64748')).toBe(false)
    expect(isHexColor('#64748bb')).toBe(false)
  })

  it('rejects non-hex characters', () => {
    expect(isHexColor('#gggggg')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isHexColor('')).toBe(false)
  })
})
