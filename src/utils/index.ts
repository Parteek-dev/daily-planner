/**
 * src/utils/index.ts
 *
 * Pure helper functions that have no side-effects and no external dependencies.
 * These are distinct from src/lib/utils.ts (which contains app-specific
 * helpers like fmtDuration tied to domain types).
 *
 * Example:
 *   import { clamp, debounce } from '@/src/utils'
 */

/** Clamp a number between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Returns true if the string is a valid 7-character hex color (#rrggbb). */
export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}
