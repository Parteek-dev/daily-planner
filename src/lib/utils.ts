/**
 * Format a duration in minutes to a human-readable string.
 * < 60 min  → "45m"
 * exact hrs → "2h"
 * otherwise → "1h 30m"
 */
export function fmtDuration(mins: number | null | undefined): string {
  if (!mins && mins !== 0) return ''
  mins = Math.round(mins)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Parse a human-friendly duration string into minutes.
 * Accepts: "30", "30m", "1h", "1.5h", "90min", "1h 30m", "1h30"
 * Returns null for unrecognized input without throwing.
 */
export function parseDuration(str: string | null | undefined): number | null {
  if (!str) return null
  const s = String(str).trim().toLowerCase()
  // pure number → minutes
  if (/^\d+$/.test(s)) return parseInt(s, 10)
  // e.g. "1h 30m", "1h30m", "1h30"
  const hm = s.match(/^(\d+(?:\.\d+)?)\s*h(?:r|ours?)?\s*(\d+)?\s*m?$/)
  if (hm) {
    const h = parseFloat(hm[1])
    const m = hm[2] ? parseInt(hm[2], 10) : 0
    return Math.round(h * 60 + m)
  }
  // e.g. "1.5h", "2h"
  const hOnly = s.match(/^(\d+(?:\.\d+)?)\s*h(?:r|ours?)?$/)
  if (hOnly) return Math.round(parseFloat(hOnly[1]) * 60)
  // e.g. "30m", "90min"
  const mOnly = s.match(/^(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?$/)
  if (mOnly) return Math.round(parseFloat(mOnly[1]))
  return null
}
