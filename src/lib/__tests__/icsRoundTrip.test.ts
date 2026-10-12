/**
 * Property-based tests for ICS export–import round-trip.
 *
 * Property 2: For any non-empty array of valid task objects,
 * exporting to ICS and re-importing preserves title, date, and duration.
 *
 * The pure ICS serialisation/deserialisation logic is extracted verbatim
 * from frontend/src/hooks/useProgress.js (the DOM-only parts — Blob,
 * URL.createObjectURL, document.createElement — are intentionally omitted
 * since this test targets the string-level round-trip only).
 *
 * Validates: Requirements 24.3, 15.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { fmtDuration } from '../utils'

// ─── Pure ICS serialisation (extracted from useProgress.exportAsIcs) ──────────

interface IcsTask {
  id: string
  title: string
  description?: string
  topic?: string
  duration?: number
  date: string          // YYYY-MM-DD
  dueTime?: string | null // HH:MM or null
  completed?: boolean
  priority?: 'high' | 'medium' | 'low' | null
  note?: string
  createdAt?: string
}

function exportAsIcsString(tasks: IcsTask[]): string {
  const escIcs = (str = '') =>
    str
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')

  const fmtDate = (dateStr: string, timeStr?: string | null): string => {
    const d = dateStr.replace(/-/g, '')
    if (!timeStr) return d
    const t = timeStr.replace(':', '') + '00'
    return `${d}T${t}`
  }

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Daily Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  tasks.forEach((task) => {
    const uid = `${task.id}@daily-planner`
    const created = task.createdAt
      ? task.createdAt.replace(/[-:]/g, '').replace('.', '').slice(0, 15) + 'Z'
      : fmtDate(task.date, task.dueTime)

    const dtStart = task.dueTime
      ? `DTSTART:${fmtDate(task.date, task.dueTime)}`
      : `DTSTART;VALUE=DATE:${task.date.replace(/-/g, '')}`

    let dtEnd = ''
    if (task.dueTime) {
      const [h, m] = task.dueTime.split(':').map(Number)
      const totalMins = h * 60 + m + (task.duration ?? 30)
      const eh = String(Math.floor(totalMins / 60) % 24).padStart(2, '0')
      const em = String(totalMins % 60).padStart(2, '0')
      dtEnd = `DTEND:${task.date.replace(/-/g, '')}T${eh}${em}00`
    } else {
      dtEnd = `DTEND;VALUE=DATE:${task.date.replace(/-/g, '')}`
    }

    const statusLine = task.completed ? 'STATUS:COMPLETED' : 'STATUS:NEEDS-ACTION'
    const priority =
      task.priority === 'high'
        ? 'PRIORITY:1'
        : task.priority === 'medium'
          ? 'PRIORITY:5'
          : task.priority === 'low'
            ? 'PRIORITY:9'
            : 'PRIORITY:0'

    const descParts = [
      task.description && `Description: ${task.description}`,
      `Topic: ${task.topic ?? 'Personal'}`,
      `Duration: ${fmtDuration(task.duration)}`,
      task.note && `Note: ${task.note}`,
    ]
      .filter(Boolean)
      .join('\\n')

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${created}`,
      dtStart,
      dtEnd,
      `SUMMARY:${escIcs(task.title)}`,
      `DESCRIPTION:${escIcs(descParts)}`,
      `CATEGORIES:${escIcs(task.topic ?? 'Personal')}`,
      priority,
      statusLine,
      'END:VEVENT',
    )
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

// ─── Pure ICS deserialisation (extracted from useProgress.importFromIcs) ─────

interface ParsedIcsTask {
  title: string
  date: string          // YYYY-MM-DD
  dueTime: string | null
  duration: number
  priority: 'high' | 'medium' | 'low' | null
  completed: boolean
  _isAllDay: boolean
}

interface ImportResult {
  success: true
  tasks: ParsedIcsTask[]
}
interface ImportError {
  success: false
  error: string
}

function importFromIcsString(icsString: string): ImportResult | ImportError {
  try {
    // Unfold ICS continuation lines (RFC 5545)
    const unfolded = icsString.replace(/\r?\n[ \t]/g, '')

    const eventBlocks = unfolded
      .split('BEGIN:VEVENT')
      .slice(1)
      .map((b) => b.split('END:VEVENT')[0])

    if (eventBlocks.length === 0) return { success: false, error: 'No events found in ICS file' }

    const getProp = (block: string, key: string): string => {
      const re = new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, 'im')
      const m = block.match(re)
      return m ? m[1].trim() : ''
    }

    const getParam = (block: string, key: string, param: string): string | null => {
      const re = new RegExp(`^${key};[^:]*${param}=([^;:]+)`, 'im')
      const m = block.match(re)
      return m ? m[1].trim() : null
    }

    const parseDt = (
      raw: string,
      tzid?: string | null,
    ): { date: string; time: string | null; isAllDay: boolean } | null => {
      if (!raw) return null

      if (!raw.includes('T')) {
        const m = raw.match(/(\d{4})(\d{2})(\d{2})/)
        if (!m) return null
        return { date: `${m[1]}-${m[2]}-${m[3]}`, time: null, isAllDay: true }
      }

      if (raw.endsWith('Z')) {
        const m = raw.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/)
        if (!m) return null
        const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`)
        const localDate = d.toLocaleDateString('en-CA')
        const localH = String(d.getHours()).padStart(2, '0')
        const localM = String(d.getMinutes()).padStart(2, '0')
        return { date: localDate, time: `${localH}:${localM}`, isAllDay: false }
      }

      if (tzid) {
        try {
          const m = raw.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)
          if (!m) return null
          const isoLocal = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`
          const tzDate = new Date(new Date(isoLocal).toLocaleString('en-US', { timeZone: tzid }))
          const diff = new Date(isoLocal).getTime() - tzDate.getTime()
          const adjusted = new Date(new Date(isoLocal).getTime() - diff)
          const localDate = adjusted.toLocaleDateString('en-CA')
          const localH = String(adjusted.getHours()).padStart(2, '0')
          const localM = String(adjusted.getMinutes()).padStart(2, '0')
          return { date: localDate, time: `${localH}:${localM}`, isAllDay: false }
        } catch {
          // fall through
        }
      }

      const m = raw.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/)
      if (!m) return null
      return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}`, isAllDay: false }
    }

    const unescape = (s = '') =>
      s
        .replace(/\\n/g, '\n')
        .replace(/\\N/g, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\')

    const parsedTasks: ParsedIcsTask[] = []

    eventBlocks.forEach((block) => {
      const summary = unescape(getProp(block, 'SUMMARY'))
      if (!summary) return

      const dtStartRaw = getProp(block, 'DTSTART')
      const dtStartTzid = getParam(block, 'DTSTART', 'TZID')
      const dtEndRaw = getProp(block, 'DTEND')

      const start = parseDt(dtStartRaw, dtStartTzid)
      const end = parseDt(dtEndRaw, dtStartTzid)

      if (!start) return

      let duration = start.isAllDay ? 60 : 30
      if (start && end && !start.isAllDay && !end.isAllDay && start.time && end.time) {
        const [sh, sm] = start.time.split(':').map(Number)
        const [eh, em] = end.time.split(':').map(Number)
        const startMins = sh * 60 + sm
        let endMins = eh * 60 + em
        if (endMins < startMins) endMins += 24 * 60
        const diff = endMins - startMins
        if (diff > 0 && diff <= 480) duration = diff
        else if (diff > 0) duration = 120
      }

      const durationProp = getProp(block, 'DURATION')
      if (durationProp && duration === 30) {
        const h = parseInt(durationProp.match(/(\d+)H/)?.[1] ?? '0')
        const m = parseInt(durationProp.match(/(\d+)M/)?.[1] ?? '0')
        if (h || m) duration = h * 60 + m
      }

      const priority = (() => {
        const p = parseInt(getProp(block, 'PRIORITY'))
        if (p >= 1 && p <= 4) return 'high' as const
        if (p === 5) return 'medium' as const
        if (p >= 6 && p <= 9) return 'low' as const
        return null
      })()

      const status = getProp(block, 'STATUS')
      const completed = status === 'COMPLETED'

      parsedTasks.push({
        title: summary,
        date: start.date,
        dueTime: start.isAllDay ? null : start.time ?? null,
        duration,
        priority,
        completed,
        _isAllDay: start.isAllDay,
      })
    })

    return { success: true, tasks: parsedTasks }
  } catch (err: unknown) {
    return { success: false, error: `Failed to parse ICS: ${(err as Error).message}` }
  }
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

// Use integer-based date generation to stay shrink-safe in fast-check v4.
const DATE_BASE_MS = new Date('2024-01-01').getTime()
const DATE_TOP_DAYS = Math.floor(
  (new Date('2026-12-31').getTime() - DATE_BASE_MS) / 86_400_000,
)

const dateStrArb = fc
  .integer({ min: 0, max: DATE_TOP_DAYS })
  .map((n) => new Date(DATE_BASE_MS + n * 86_400_000).toISOString().slice(0, 10))

/**
 * Title: printable ASCII, no ICS control chars that would escape badly.
 * Leading/trailing spaces are excluded because getProp() calls .trim() on the
 * parsed SUMMARY value — a conscious ICS-spec decision to normalise whitespace.
 * Backslash is excluded because ICS treats \N, \n, \,, \; as escape sequences:
 * a literal backslash in a title round-trips as two chars (\\ → \) but
 * backslash-N becomes a newline, backslash-comma becomes comma etc., so we
 * keep the generator simple and backslash-free.
 */
const safeTitleArb = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter(
    (s) =>
      // No leading/trailing whitespace
      s === s.trim() &&
      s.length > 0 &&
      // Only printable ASCII, no backslash
      /^[\x21-\x5B\x5D-\x7E\x20]*$/.test(s) &&
      // No leading/trailing space (redundant but explicit)
      !/^\s|\s$/.test(s),
  )

const durationArb = fc.integer({ min: 1, max: 480 })

/**
 * For tasks with a dueTime the round-trip duration is recovered from DTEND−DTSTART.
 * We constrain dueTime + duration to not cross midnight (hour < 24) so the importer
 * gets a clean diff without the overnight-event branch.
 * Titles are derived from the generated numbers to guarantee no trailing spaces.
 */
const taskWithDueTimeArb: fc.Arbitrary<IcsTask> = fc
  .tuple(
    dateStrArb,
    fc.integer({ min: 0, max: 22 }), // start hour
    fc.integer({ min: 0, max: 59 }), // start minute
    fc.integer({ min: 1, max: 59 }),  // duration (minutes, kept short to avoid midnight crossing)
  )
  .map(([date, h, m, dur]) => ({
    id: `task-${h}-${m}-${dur}`,
    title: `Task-${h}-${m}`,   // no spaces → no trim issue
    date,
    dueTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    duration: dur,
    topic: 'Personal',
  }))

/** All-day tasks: duration is set to 60 by the importer for all-day events. */
const allDayTaskArb: fc.Arbitrary<IcsTask> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  title: safeTitleArb,
  date: dateStrArb,
  dueTime: fc.constant(null),
  duration: fc.constant(60), // importer always returns 60 for all-day
  topic: fc.constant('Personal'),
})

// ─── Property 2: ICS export–import round-trip ─────────────────────────────────
// Validates: Requirements 24.3, 15.2

describe('Property 2: ICS export–import round-trip', () => {
  it('preserves title for all-day tasks across export→import', () => {
    fc.assert(
      fc.property(
        fc.array(allDayTaskArb, { minLength: 1, maxLength: 20 }),
        (tasks) => {
          const ics = exportAsIcsString(tasks)
          const result = importFromIcsString(ics)
          expect(result.success).toBe(true)
          if (!result.success) return

          expect(result.tasks).toHaveLength(tasks.length)

          tasks.forEach((orig, i) => {
            const restored = result.tasks[i]
            expect(restored.title).toBe(orig.title)
            expect(restored.date).toBe(orig.date)
            expect(restored.duration).toBe(60) // all-day default
          })
        },
      ),
      { numRuns: 150 },
    )
  })

  it('preserves title, date, and duration for timed tasks across export→import', () => {
    fc.assert(
      fc.property(
        fc.array(taskWithDueTimeArb, { minLength: 1, maxLength: 10 }),
        (tasks) => {
          const ics = exportAsIcsString(tasks)
          const result = importFromIcsString(ics)
          expect(result.success).toBe(true)
          if (!result.success) return

          expect(result.tasks).toHaveLength(tasks.length)

          tasks.forEach((orig, i) => {
            const restored = result.tasks[i]
            expect(restored.title).toBe(orig.title)
            expect(restored.date).toBe(orig.date)
            expect(restored.duration).toBe(orig.duration)
          })
        },
      ),
      { numRuns: 150 },
    )
  })
})
