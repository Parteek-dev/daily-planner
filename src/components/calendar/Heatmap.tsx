/**
 * Heatmap.tsx
 *
 * Mobile  (< 768 px):  Monthly calendar-style heatmap with prev/next navigation.
 * Web/wide (≥ 768 px): 52-week contribution grid — "Activity (Last 12 Months)".
 *
 * Requirements: 14.1, 14.4, 14.6, 9.2
 */

import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '@/src/hooks/useTheme'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeatmapProps {
  /** ISO date → task-completion count, e.g. { "2025-06-01": 3 } */
  readonly data: Record<string, number>
}

// Desktop week-column types
interface DayCell {
  date: string
  count: number
  isToday: boolean
}

interface WeekColumn {
  cells: DayCell[]
  firstIso: string | null
}

// Mobile calendar types
interface CalendarDay {
  date: string
  dayNum: number
  count: number
  isToday: boolean
  isFuture: boolean
}

type CalendarRow = (CalendarDay | null)[]

// ─── Constants ────────────────────────────────────────────────────────────────

/** Activity intensity colour ramp — shared by both layouts */
const COLORS: (string | null)[] = [
  null,       // 0 tasks → emptyColor at render time
  '#bfdbfe',  // 1
  '#60a5fa',  // 2–3
  '#2563eb',  // 4–6
  '#1e3a8a',  // 7+
]

// Desktop 52-week grid
const CELL = 13
const GAP = 3
const STEP = CELL + GAP
const DOW_WIDTH = 32
const MONTH_H = 16
const DOW_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Mobile monthly calendar
const CAL_DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
/** Gap (px) between calendar cells in the mobile grid */
const CELL_GAP = 3

const SIDEBAR_BREAKPOINT = 768

// ─── Shared helpers ───────────────────────────────────────────────────────────

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function countToLevel(n: number): number {
  if (n === 0) return 0
  if (n === 1) return 1
  if (n <= 3) return 2
  if (n <= 6) return 3
  return 4
}

// ─── Desktop helpers ──────────────────────────────────────────────────────────

function buildGrid(
  data: Record<string, number>,
  numWeeks: number,
): { columns: WeekColumn[]; totalCompleted: number; activeDays: number; bestDay: DayCell | null } {
  const today = new Date()
  const todayIso = toIso(today)

  const start = new Date(today)
  start.setDate(start.getDate() - numWeeks * 7 + 1)
  start.setDate(start.getDate() - start.getDay())   // align to Sunday

  const columns: WeekColumn[] = []
  const cursor = new Date(start)
  let totalCompleted = 0
  let activeDays = 0
  let bestDay: DayCell | null = null

  for (let week = 0; week < numWeeks + 1 && columns.length < numWeeks + 1; week++) {
    const weekCol: WeekColumn = { cells: [], firstIso: null }
    for (let dow = 0; dow < 7; dow++) {
      const iso = toIso(cursor)
      const isFuture = cursor > today
      const count = isFuture ? 0 : (data[iso] ?? 0)
      const cell: DayCell = { date: iso, count, isToday: iso === todayIso }
      weekCol.cells.push(cell)
      if (dow === 0) weekCol.firstIso = iso
      if (!isFuture) {
        totalCompleted += count
        if (count > 0) {
          activeDays++
          if (!bestDay || count > bestDay.count) bestDay = cell
        }
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    columns.push(weekCol)
  }

  return { columns, totalCompleted, activeDays, bestDay }
}

function buildMonthLabels(columns: WeekColumn[]) {
  const labels: { colIndex: number; label: string }[] = []
  let lastMonth = -1
  let lastColIndex = -999

  columns.forEach((col, i) => {
    if (!col.firstIso) return
    const m = new Date(col.firstIso + 'T12:00:00').getMonth()
    if (m !== lastMonth && i - lastColIndex >= 3) {
      labels.push({ colIndex: i, label: MONTH_NAMES[m] })
      lastMonth = m
      lastColIndex = i
    }
  })
  return labels
}

// ─── Mobile helpers ───────────────────────────────────────────────────────────

function buildMonthGrid(
  data: Record<string, number>,
  year: number,
  month: number,
): { rows: CalendarRow[]; totalCompleted: number; activeDays: number; bestDay: CalendarDay | null } {
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1)
  // JS: 0=Sun … 6=Sat → Mon-first: 0=Mon … 6=Sun
  const firstDowMonFirst = (firstDay.getDay() + 6) % 7

  const rows: CalendarRow[] = []
  let currentRow: CalendarRow = new Array(firstDowMonFirst).fill(null)
  let totalCompleted = 0
  let activeDays = 0
  let bestDay: CalendarDay | null = null

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d)
    dateObj.setHours(0, 0, 0, 0)
    const iso = toIso(dateObj)
    const isFuture = dateObj > todayDate
    const count = isFuture ? 0 : (data[iso] ?? 0)

    const cell: CalendarDay = {
      date: iso, dayNum: d, count,
      isToday: dateObj.getTime() === todayDate.getTime(),
      isFuture,
    }
    currentRow.push(cell)

    if (!isFuture) {
      totalCompleted += count
      if (count > 0) {
        activeDays++
        if (!bestDay || count > bestDay.count) bestDay = cell
      }
    }

    if (currentRow.length === 7) {
      rows.push(currentRow)
      currentRow = []
    }
  }

  // Pad and push the last partial row
  if (currentRow.length > 0) {
    while (currentRow.length < 7) currentRow.push(null)
    rows.push(currentRow)
  }

  return { rows, totalCompleted, activeDays, bestDay }
}

// ─── Desktop grid component ───────────────────────────────────────────────────

function HeatmapGrid({
  columns,
  monthLabels,
  emptyColor,
  onCellPress,
  cellSize,
  gapSize,
}: {
  columns: WeekColumn[]
  monthLabels: { colIndex: number; label: string }[]
  emptyColor: string
  onCellPress: (cell: DayCell) => void
  cellSize: number
  gapSize: number
}) {
  const { tokens } = useTheme()

  const stepSize = cellSize + gapSize
  const svgW = DOW_WIDTH + columns.length * stepSize
  const svgH = MONTH_H + 7 * stepSize + gapSize

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 2 }}
    >
      <View style={{ width: svgW, height: svgH, minHeight: svgH }}>
        <Svg width={svgW} height={svgH}>
          {/* Month labels */}
          {monthLabels.map(({ colIndex, label }) => (
            <SvgText
              key={`m-${colIndex}`}
              x={DOW_WIDTH + colIndex * stepSize}
              y={11}
              fontSize={9}
              fill={tokens.textMuted}
              fontWeight="500"
            >
              {label}
            </SvgText>
          ))}

          {/* Day-of-week labels */}
          {DOW_LABELS.map((lbl, row) =>
            lbl ? (
              <SvgText
                key={`dow-${row}`}
                x={0}
                y={MONTH_H + row * stepSize + (cellSize + 9) / 2}
                fontSize={9}
                fill={tokens.textMuted}
              >
                {lbl}
              </SvgText>
            ) : null,
          )}

          {/* Cells */}
          {columns.map((col, ci) =>
            col.cells.map((cell, row) => {
              const fill = COLORS[countToLevel(cell.count)] ?? emptyColor
              return (
                <Rect
                  key={cell.date}
                  x={DOW_WIDTH + ci * stepSize}
                  y={MONTH_H + row * stepSize}
                  width={cellSize}
                  height={cellSize}
                  rx={Math.max(2, cellSize * 0.1)}
                  fill={fill}
                  stroke={cell.isToday ? tokens.accentBlue : 'rgba(0,0,0,0.06)'}
                  strokeWidth={cell.isToday ? 1.5 : 0.5}
                />
              )
            }),
          )}
        </Svg>

        {/* Pressable tap overlays */}
        <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' } as any]}>
          {columns.map((col, ci) =>
            col.cells.map((cell, row) => {
              if (cell.count === 0) return null
              return (
                <Pressable
                  key={`p-${cell.date}`}
                  onPress={() => onCellPress(cell)}
                  style={{
                    position: 'absolute',
                    left: DOW_WIDTH + ci * stepSize,
                    top: MONTH_H + row * stepSize,
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 2,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${cell.date}: ${cell.count} tasks`}
                />
              )
            }),
          )}
        </View>
      </View>
    </ScrollView>
  )
}

// ─── Mobile monthly calendar styles ──────────────────────────────────────────

type ThemeTokens = ReturnType<typeof useTheme>['tokens']

const makeMobileStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      flexWrap: 'wrap',
      gap: 4,
    },
    title: {
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 20,
      color: tokens.textMuted,
    },
    headerStats: {
      fontSize: 12,
      color: tokens.textMuted,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    navBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.bgInput,
    },
    navBtnDisabled: {
      opacity: 0.3,
    },
    navArrow: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '500',
    },
    monthLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textSecondary,
      textAlign: 'center',
      flex: 1,
    },
    dayHeaderRow: {
      flexDirection: 'row',
      gap: CELL_GAP,
      marginBottom: 4,
    },
    dayHeaderCell: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayHeaderText: {
      fontSize: 10,
      fontWeight: '500',
      color: tokens.textMuted,
    },
    calGrid: {
      gap: CELL_GAP,
    },
    weekRow: {
      flexDirection: 'row',
      gap: CELL_GAP,
    },
    cell: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
    },
    cellNum: {
      fontWeight: '500',
    },
    cellCount: {
      fontWeight: '600',
    },
    footer: {
      marginTop: 12,
      gap: 6,
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    legendTxt: {
      fontSize: 10,
      color: tokens.textMuted,
      marginHorizontal: 2,
    },
    swatch: {
      width: 11,
      height: 11,
      borderRadius: 2,
      borderWidth: 0.5,
    },
    summarySection: {
      gap: 3,
    },
    summaryLabel: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.4,
      color: tokens.textMuted,
    },
    statLine: {
      fontSize: 12,
      color: tokens.textMuted,
      lineHeight: 18,
    },
  })

// ─── Mobile monthly calendar component ───────────────────────────────────────

function MobileMonthHeatmap({
  data,
  containerWidth,
}: {
  data: Record<string, number>
  containerWidth: number
}) {
  const router = useRouter()
  const { tokens } = useTheme()
  const mStyles = useMemo(() => makeMobileStyles(tokens), [tokens])

  // Initialise to current month
  const todayRef = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])
  const [viewYear, setViewYear] = useState(todayRef.getFullYear())
  const [viewMonth, setViewMonth] = useState(todayRef.getMonth())

  const isCurrentMonth = (
    viewYear === todayRef.getFullYear() &&
    viewMonth === todayRef.getMonth()
  )

  const { rows, totalCompleted, activeDays, bestDay } = useMemo(
    () => buildMonthGrid(data, viewYear, viewMonth),
    [data, viewYear, viewMonth],
  )

  // ── Responsive cell size ──────────────────────────────────────────────────
  // containerWidth is the outer card width (measured via onLayout).
  // Subtract card's 16px horizontal padding on each side, then divide into 7
  // equal columns separated by CELL_GAP.
  const CARD_H_PADDING = 32
  const innerWidth = containerWidth > 0 ? containerWidth - CARD_H_PADDING : 280
  const cellSize = Math.max(32, Math.floor((innerWidth - 6 * CELL_GAP) / 7))
  const numFontSize = Math.max(10, Math.round(cellSize * 0.26))
  const countFontSize = Math.max(8, Math.round(cellSize * 0.19))

  // ── Derived stats ─────────────────────────────────────────────────────────
  const bestDayLabel = bestDay
    ? new Date(bestDay.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const monthLabel = `${MONTH_NAMES_FULL[viewMonth]} ${viewYear}`

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const goToNext = () => {
    if (isCurrentMonth) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // ── Cell press ────────────────────────────────────────────────────────────
  async function handleDayPress(cell: CalendarDay) {
    if (cell.count === 0) return
    try { await AsyncStorage.setItem('calendar_jump_date', cell.date) } catch { }
    router.push('/(tabs)/calendar')
  }

  return (
    <View>
      {/* Section header: title + month stats */}
      <View style={mStyles.sectionHeader}>
        <Text style={mStyles.title}>Activity</Text>
        <Text style={mStyles.headerStats}>
          {totalCompleted} task{totalCompleted !== 1 ? 's' : ''} · {activeDays} active {activeDays === 1 ? 'day' : 'days'}
        </Text>
      </View>

      {/* Month navigator: ‹  October 2026  › */}
      <View style={mStyles.monthNav}>
        <Pressable
          onPress={goToPrev}
          style={mStyles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Text style={[mStyles.navArrow, { color: tokens.accentPrimary }]}>‹</Text>
        </Pressable>

        <Text style={mStyles.monthLabel}>{monthLabel}</Text>

        <Pressable
          onPress={goToNext}
          style={[mStyles.navBtn, isCurrentMonth && mStyles.navBtnDisabled]}
          disabled={isCurrentMonth}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: isCurrentMonth }}
        >
          <Text style={[mStyles.navArrow, { color: isCurrentMonth ? tokens.textMuted : tokens.accentPrimary }]}>›</Text>
        </Pressable>
      </View>

      {/* Day-of-week header row */}
      <View style={mStyles.dayHeaderRow}>
        {CAL_DAY_HEADERS.map(d => (
          <View key={d} style={[mStyles.dayHeaderCell, { width: cellSize }]}>
            <Text style={mStyles.dayHeaderText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={mStyles.calGrid}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={mStyles.weekRow}>
            {row.map((cell, colIdx) => {
              // Empty placeholder (days before month start / after month end)
              if (!cell) {
                return (
                  <View
                    key={`empty-${rowIdx}-${colIdx}`}
                    style={{ width: cellSize, height: cellSize }}
                  />
                )
              }

              const level = countToLevel(cell.count)
              const bgColor = level === 0
                ? tokens.bgInput
                : (COLORS[level] as string)
              // Date number: white on dark fill, accent-blue for today, muted otherwise
              const numColor = level >= 2
                ? '#ffffff'
                : cell.isToday
                  ? tokens.accentBlue
                  : tokens.textMuted
              // Today ring: white on dark fill (always readable), accent-blue on light/empty
              const todayBorderColor = level >= 2 ? 'rgba(255,255,255,0.8)' : tokens.accentBlue
              // Count badge: white on dark fill, accent-blue on light fill
              const countColor = level >= 2 ? 'rgba(255,255,255,0.85)' : tokens.accentBlue

              return (
                <Pressable
                  key={cell.date}
                  onPress={() => handleDayPress(cell)}
                  style={[
                    mStyles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: bgColor,
                      borderRadius: Math.max(4, Math.round(cellSize * 0.14)),
                      borderWidth: cell.isToday ? 2 : 0.5,
                      borderColor: cell.isToday ? todayBorderColor : tokens.borderPrimary,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${cell.date}: ${cell.count} tasks`}
                  accessibilityState={{ disabled: cell.count === 0 }}
                >
                  <Text
                    style={[
                      mStyles.cellNum,
                      {
                        fontSize: numFontSize,
                        color: numColor,
                        fontWeight: cell.isToday ? '700' : '400',
                      },
                    ]}
                  >
                    {cell.dayNum}
                  </Text>
                  {cell.count > 0 && (
                    <Text style={[mStyles.cellCount, { fontSize: countFontSize, color: countColor }]}>
                      {`${cell.count}`}
                    </Text>
                  )}
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>

      {/* Footer: legend + monthly summary */}
      <View style={mStyles.footer}>
        <View style={mStyles.legend}>
          <Text style={mStyles.legendTxt}>Less</Text>
          {[tokens.bgInput, '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'].map((c, i) => (
            <View
              key={i}
              style={[mStyles.swatch, { backgroundColor: c, borderColor: tokens.borderPrimary }]}
            />
          ))}
          <Text style={mStyles.legendTxt}>More</Text>
        </View>

        <View style={mStyles.summarySection}>
          <Text style={mStyles.statLine} numberOfLines={2}>
            {`🔥 ${activeDays} active ${activeDays === 1 ? 'day' : 'days'} · ✓ ${totalCompleted} ${totalCompleted === 1 ? 'task' : 'tasks'}${bestDayLabel ? ` · 🏆 Best: ${bestDayLabel}` : ''}`}
          </Text>
        </View>
      </View>
    </View>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Heatmap({ data }: HeatmapProps) {
  const { tokens } = useTheme()
  const router = useRouter()
  const { width } = useWindowDimensions()

  const isWide = Platform.OS === 'web' && width >= SIDEBAR_BREAKPOINT

  // Measure card width so MobileMonthHeatmap can compute per-cell sizes
  const [containerWidth, setContainerWidth] = useState(0)
  const onCardLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width)
  }

  // Desktop grid data (52-week)
  const { columns, totalCompleted, activeDays, bestDay } = useMemo(
    () => buildGrid(data, 52),
    [data],
  )
  const monthLabels = useMemo(() => buildMonthLabels(columns), [columns])
  const desktopAvg = activeDays > 0 ? (totalCompleted / activeDays).toFixed(1) : '0'
  const bestDayLabel = bestDay
    ? new Date(bestDay.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  const hasData = useMemo(() => Object.values(data).some(v => v > 0), [data])

  async function handleCellPress(cell: DayCell) {
    if (cell.count === 0) return
    try { await AsyncStorage.setItem('calendar_jump_date', cell.date) } catch { }
    router.push('/(tabs)/calendar')
  }

  // Desktop-only empty state
  if (!hasData && isWide) {
    return (
      <View
        onLayout={onCardLayout}
        style={[styles.card, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}
      >
        <Text style={[styles.title, { color: tokens.textMuted }]}>Activity (last 12 months)</Text>
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
            Complete tasks to see your activity heatmap.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View
      onLayout={onCardLayout}
      style={[styles.card, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}
    >
      {!isWide ? (
        /* ── Mobile: monthly calendar view ─────────────────────────────────── */
        <MobileMonthHeatmap data={data} containerWidth={containerWidth} />
      ) : (
        /* ── Desktop: 52-week contribution heatmap (unchanged) ─────────────── */
        <>
          <View style={styles.header}>
            <Text style={[styles.title, { color: tokens.textMuted }]}>
              Activity (last 12 months)
            </Text>
            <Text style={[styles.headerStats, { color: tokens.textMuted }]}>
              {totalCompleted} tasks on {activeDays} active days
            </Text>
          </View>

          <HeatmapGrid
            columns={columns}
            monthLabels={monthLabels}
            emptyColor={tokens.bgInput}
            onCellPress={handleCellPress}
            cellSize={CELL}
            gapSize={GAP}
          />

          <View style={styles.footer}>
            <View style={styles.legend}>
              <Text style={[styles.legendTxt, { color: tokens.textMuted }]}>Less</Text>
              {[tokens.bgInput, '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'].map((c, i) => (
                <View
                  key={i}
                  style={[styles.swatch, { backgroundColor: c, borderColor: tokens.borderPrimary }]}
                />
              ))}
              <Text style={[styles.legendTxt, { color: tokens.textMuted }]}>More</Text>
            </View>

            <View style={styles.stats}>
              {bestDayLabel && (
                <Text style={[styles.statItem, { color: tokens.textMuted }]}>
                  {'🏆 Best day: '}
                  <Text style={{ color: tokens.textSecondary, fontWeight: '600' }}>
                    {bestDayLabel} ({bestDay!.count} tasks)
                  </Text>
                </Text>
              )}
              <Text style={[styles.statItem, { color: tokens.textMuted }]}>
                {'↗ Avg: '}
                <Text style={{ color: tokens.textSecondary, fontWeight: '600' }}>
                  {desktopAvg} tasks/active day
                </Text>
              </Text>
              <Text style={[styles.statItem, styles.hint, { color: tokens.textMuted }]}>
                Tap a day to view tasks
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  )
}

// ─── Shared card styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  headerStats: {
    fontSize: 12,
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendTxt: {
    fontSize: 10,
    marginHorizontal: 2,
  },
  swatch: {
    width: 11,
    height: 11,
    borderRadius: 2,
    borderWidth: 0.5,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  statItem: {
    fontSize: 11,
  },
  hint: {
    fontStyle: 'italic',
  },
  emptyWrap: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
})
