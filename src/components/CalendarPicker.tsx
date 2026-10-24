/**
 * CalendarPicker — themed month-grid calendar (pure presentation).
 *
 * Parent owns open/close; this component only renders the grid and emits the
 * picked day. Works on iOS / Android / Web from one implementation.
 *
 *   - Weekday header (Sun–Sat), weeks of days, prev/next month navigation.
 *   - Today gets a subtle border ring; the selected day fills with
 *     tokens.accentPrimary and tokens.textInverse text.
 *   - Day cells are >=44x44 touch targets; on web they are focusable and
 *     selectable via Enter/Space with a visible tokens.borderFocus ring.
 */

import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type GestureResponderEvent,
  type PressableStateCallbackType,
} from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import type { Tokens } from '@/src/theme/tokens'
import {
  buildMonthGrid,
  monthName,
  parseYMD,
  toYMD,
  type MonthCell,
} from '@/src/lib/datetime'

export interface CalendarPickerProps {
  /** Selected day as YYYY-MM-DD, or '' when none. */
  readonly value: string
  /** Called with the picked YYYY-MM-DD. */
  readonly onSelect: (ymd: string) => void
  /** Optional close handler (e.g. for a Done button). */
  readonly onClose?: () => void
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const CELL_SIZE = 44

// Web-only key handler props, typed loosely for the RN/RN-Web gap.
type WebKeyProps = {
  onKeyDown?: (e: { key?: string; preventDefault?: () => void }) => void
  focusable?: boolean
}

// react-native-web adds `focused` to the Pressable state callback; the RN types
// don't declare it, so extend the type for the web focus-ring styling.
type PressableState = PressableStateCallbackType & { focused?: boolean }

export function CalendarPicker({ value, onSelect, onClose }: CalendarPickerProps) {
  const { tokens } = useTheme()
  const styles = useMemo(() => makeStyles(tokens), [tokens])

  // Seed the visible month from the selected value, falling back to today.
  const seed = useMemo(() => parseYMD(value) ?? new Date(), [value])
  const [viewYear, setViewYear] = useState(seed.getFullYear())
  const [viewMonth, setViewMonth] = useState(seed.getMonth())

  // Fixed 42-cell grid, chunked into 6 rows of 7 for rendering.
  const weeks = useMemo(() => {
    const cells = buildMonthGrid(viewYear, viewMonth)
    const rows: MonthCell[][] = []
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7))
    }
    return rows
  }, [viewYear, viewMonth])

  const goPrevMonth = () => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }

  const goNextMonth = () => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }

  const handleSelect = (cell: MonthCell) => {
    // Selecting a leading/trailing day also navigates to that day's month.
    if (!cell.inCurrentMonth) {
      const d = parseYMD(cell.ymd)
      if (d) {
        setViewYear(d.getFullYear())
        setViewMonth(d.getMonth())
      }
    }
    onSelect(cell.ymd)
  }

  const goToday = () => {
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    onSelect(toYMD(now))
  }

  const makeKeyProps = (cell: MonthCell): WebKeyProps =>
    Platform.OS === 'web'
      ? {
        focusable: true,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault?.()
            handleSelect(cell)
          }
        },
      }
      : {}

  return (
    <View style={styles.container}>
      {/* Header: month/year + prev/next nav */}
      <View style={styles.header}>
        <Pressable
          onPress={goPrevMonth}
          style={({ pressed, focused }: PressableState) => [
            styles.navBtn,
            focused && styles.focused,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          {...(Platform.OS === 'web' ? ({ focusable: true } as WebKeyProps) : {})}
        >
          <ChevronLeft size={20} color={tokens.textPrimary} />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {monthName(viewMonth)} {viewYear}
        </Text>

        <Pressable
          onPress={goToday}
          style={({ pressed, focused }: PressableState) => [
            styles.todayBtn,
            focused && styles.focused,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go to today"
          {...(Platform.OS === 'web' ? ({ focusable: true } as WebKeyProps) : {})}
        >
          <Text style={styles.todayBtnText} numberOfLines={1}>
            Today
          </Text>
        </Pressable>

        <Pressable
          onPress={goNextMonth}
          style={({ pressed, focused }: PressableState) => [
            styles.navBtn,
            focused && styles.focused,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          {...(Platform.OS === 'web' ? ({ focusable: true } as WebKeyProps) : {})}
        >
          <ChevronRight size={20} color={tokens.textPrimary} />
        </Pressable>
      </View>

      {/* Weekday labels */}
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((wd) => (
          <View key={wd} style={styles.weekdayCell}>
            <Text style={styles.weekdayText} numberOfLines={1}>
              {wd}
            </Text>
          </View>
        ))}
      </View>

      {/* Fixed 6-row grid (42 cells), rendered a week of 7 at a time */}
      {weeks.map((week, wi) => (
        <View key={`week-${wi}`} style={styles.weekRow}>
          {week.map((cell) => {
            const isSelected = value !== '' && cell.ymd === value
            const dayNum = Number(cell.ymd.slice(8, 10))
            return (
              <Pressable
                key={cell.ymd}
                onPress={() => handleSelect(cell)}
                style={({ pressed, focused }: PressableState) => [
                  styles.dayCell,
                  cell.isToday && !isSelected && styles.dayToday,
                  isSelected && styles.daySelected,
                  isSelected && cell.isToday && styles.daySelectedToday,
                  focused && styles.focused,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={cell.isToday ? `${cell.ymd}, today` : cell.ymd}
                {...makeKeyProps(cell)}
              >
                <Text
                  style={[
                    styles.dayText,
                    !cell.inCurrentMonth && styles.dayTextMuted,
                    isSelected && styles.dayTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {dayNum}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ))}

      {onClose ? (
        <Pressable
          onPress={(_e: GestureResponderEvent) => onClose()}
          style={({ pressed, focused }: PressableState) => [
            styles.doneBtn,
            focused && styles.focused,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Done"
          {...(Platform.OS === 'web' ? ({ focusable: true } as WebKeyProps) : {})}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    container: {
      gap: tokens.spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: tokens.spacing.xs,
    },
    headerTitle: {
      ...tokens.typography.subheading,
      color: tokens.textPrimary,
      flex: 1,
      textAlign: 'center',
    },
    todayBtn: {
      minHeight: CELL_SIZE,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
      marginRight: tokens.spacing.xs,
    },
    todayBtnText: {
      ...tokens.typography.caption,
      color: tokens.accentPrimary,
      fontWeight: '600',
    },
    navBtn: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      borderRadius: tokens.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    weekdayCell: {
      flex: 1,
      minWidth: CELL_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: tokens.spacing.xs,
    },
    weekdayText: {
      ...tokens.typography.caption,
      color: tokens.textSecondary,
    },
    dayCell: {
      flex: 1,
      minWidth: CELL_SIZE,
      minHeight: CELL_SIZE,
      height: CELL_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    dayToday: {
      borderColor: tokens.borderFocus,
    },
    daySelected: {
      backgroundColor: tokens.accentPrimary,
      borderColor: tokens.accentPrimary,
    },
    // When today is also the selected day: filled + a distinct ring.
    daySelectedToday: {
      borderColor: tokens.textInverse,
    },
    dayText: {
      ...tokens.typography.body,
      color: tokens.textPrimary,
    },
    dayTextMuted: {
      color: tokens.textMuted,
    },
    dayTextSelected: {
      color: tokens.textInverse,
      fontWeight: '600',
    },
    focused: {
      borderColor: tokens.borderFocus,
    },
    pressed: {
      opacity: 0.7,
    },
    doneBtn: {
      marginTop: tokens.spacing.sm,
      minHeight: CELL_SIZE,
      borderRadius: tokens.radius.sm,
      backgroundColor: tokens.accentPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    doneBtnText: {
      ...tokens.typography.body,
      color: tokens.textInverse,
      fontWeight: '600',
    },
  })
}
