/**
 * Format a duration in minutes to a human-readable string.
 * < 60 min  → "45m"
 * exact hrs → "2h"
 * otherwise → "1h 30m"
 */
export function fmtDuration(mins) {
  if (!mins && mins !== 0) return ''
  mins = Math.round(mins)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
