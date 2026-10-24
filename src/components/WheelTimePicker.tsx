/**
 * WheelTimePicker — themed start→end time RANGE selector (pure presentation).
 *
 * Two 12-hour selectors (Start and End), each with Hour (1–12), Minute
 * (00–59, +/- in steps of 5, wrapping) and an AM/PM toggle. A live duration
 * readout shows end − start. Same-day only: end must be strictly after start
 * (no crossing midnight) or Done is disabled and an inline error is shown.
 *
 * Draft/commit model: the picker holds its own draft while editing and emits a
 * committed range only on a valid Done (both times set) or on Clear (→ null).
 * It never emits a transient-invalid end mid-edit. Internally converts 24h ↔
 * 12h and always emits 24-hour HH:MM strings (or null).
 *
 * No native wheel module — simple +/- steppers that work on iOS / Android / Web
 * from one implementation. 44x44 touch targets; on web controls are focusable
 * and respond to Enter/Space with a visible tokens.borderFocus ring.
 */

import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type PressableStateCallbackType,
} from 'react-native'
import { ChevronUp, ChevronDown } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import type { Tokens } from '@/src/theme/tokens'
import {
  to12h,
  to24h,
  durationBetween,
  isValidSameDayRange,
  type Period,
} from '@/src/lib/datetime'
import { fmtDuration } from '@/src/lib/utils'

export interface TimeRange {
  readonly start: string | null
  readonly end: string | null
}

export interface WheelTimePickerProps {
  /** Current start time as HH:MM (24h), or null when unset. */
  readonly startValue: string | null
  /** Current end time as HH:MM (24h), or null when unset. */
  readonly endValue: string | null
  /** Called with the committed range on a valid Done, or {null,null} on Clear. */
  readonly onChange: (range: TimeRange) => void
  /** Optional close handler (invoked after a committed Done / Clear). */
  readonly onClose?: () => void
}

const MINUTE_STEP = 5
const CONTROL_SIZE = 44

type WebKeyProps = {
  onKeyDown?: (e: { key?: string; preventDefault?: () => void }) => void
  focusable?: boolean
}

// react-native-web adds `focused` to the Pressable state callback; the RN types
// don't declare it, so extend the type for the web focus-ring styling.
type PressableState = PressableStateCallbackType & { focused?: boolean }

interface Parts {
  hour12: number
  minute: number
  period: Period
}

/** Default start seed when no value yet: 9:00 AM. */
const DEFAULT_START: Parts = { hour12: 9, minute: 0, period: 'AM' }

/** Seed an End one hour after start, clamped to 23:59 so it never crosses midnight. */
function seedEndFromStart(start: string): Parts {
  const [h, m] = start.split(':').map(Number)
  const clampedEndMin = Math.min(h * 60 + m + 60, 23 * 60 + 59)
  const hh = Math.floor(clampedEndMin / 60)
  const mm = clampedEndMin % 60
  return to12hParts(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`) ?? DEFAULT_START
}

function to12hParts(hhmm: string | null): Parts | null {
  const p = to12h(hhmm)
  return p ? { hour12: p.hour12, minute: p.minute, period: p.period } : null
}

function partsTo24h(p: Parts): string {
  return to24h(p.hour12, p.minute, p.period)
}

export function WheelTimePicker({ startValue, endValue, onChange, onClose }: WheelTimePickerProps) {
  const { tokens } = useTheme()
  const styles = useMemo(() => makeStyles(tokens), [tokens])

  // Draft parts — seeded from the committed values, defaulting to 9:00 → 10:00.
  const initialStart = useMemo<Parts>(
    () => to12hParts(startValue) ?? DEFAULT_START,
    // Seed once per open; parent remounts via `key` when reopening if needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const initialEnd = useMemo<Parts>(
    () => to12hParts(endValue) ?? seedEndFromStart(partsTo24h(initialStart)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [start, setStart] = useState<Parts>(initialStart)
  const [end, setEnd] = useState<Parts>(initialEnd)

  const start24 = partsTo24h(start)
  const end24 = partsTo24h(end)
  const durationMins = durationBetween(start24, end24)
  const valid = isValidSameDayRange(start24, end24)

  const changeHour = (which: 'start' | 'end', delta: number) => {
    const set = which === 'start' ? setStart : setEnd
    set((p) => ({ ...p, hour12: ((p.hour12 - 1 + delta + 12) % 12) + 1 }))
  }

  const changeMinute = (which: 'start' | 'end', delta: number) => {
    const set = which === 'start' ? setStart : setEnd
    set((p) => ({ ...p, minute: (((p.minute + delta) % 60) + 60) % 60 }))
  }

  const selectPeriod = (which: 'start' | 'end', period: Period) => {
    const set = which === 'start' ? setStart : setEnd
    set((p) => ({ ...p, period }))
  }

  const handleClear = () => {
    onChange({ start: null, end: null })
    onClose?.()
  }

  const handleDone = () => {
    if (!valid) return
    onChange({ start: start24, end: end24 })
    onClose?.()
  }

  const webKeyProps = (action: () => void): WebKeyProps =>
    Platform.OS === 'web'
      ? {
        focusable: true,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault?.()
            action()
          }
        },
      }
      : {}

  const renderStepper = (
    label: string,
    display: string,
    onUp: () => void,
    onDown: () => void,
  ) => (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel} numberOfLines={1}>
        {label}
      </Text>
      <Pressable
        onPress={onUp}
        style={({ pressed, focused }: PressableState) => [
          styles.stepBtn,
          focused && styles.focused,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        {...webKeyProps(onUp)}
      >
        <ChevronUp size={18} color={tokens.textPrimary} />
      </Pressable>

      <View style={styles.valueBox}>
        <Text style={styles.valueText} numberOfLines={1}>
          {display}
        </Text>
      </View>

      <Pressable
        onPress={onDown}
        style={({ pressed, focused }: PressableState) => [
          styles.stepBtn,
          focused && styles.focused,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        {...webKeyProps(onDown)}
      >
        <ChevronDown size={18} color={tokens.textPrimary} />
      </Pressable>
    </View>
  )

  const periods: Period[] = ['AM', 'PM']

  const renderPeriodToggle = (which: 'start' | 'end', current: Period) => (
    <View style={styles.periodToggle}>
      {periods.map((p) => {
        const active = current === p
        return (
          <Pressable
            key={p}
            onPress={() => selectPeriod(which, p)}
            style={({ pressed, focused }: PressableState) => [
              styles.periodBtn,
              active && styles.periodBtnActive,
              focused && styles.focused,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${which === 'start' ? 'Start' : 'End'} ${p}`}
            {...webKeyProps(() => selectPeriod(which, p))}
          >
            <Text style={[styles.periodText, active && styles.periodTextActive]} numberOfLines={1}>
              {p}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )

  const renderRow = (which: 'start' | 'end', label: string, parts: Parts) => (
    <View style={styles.rangeRow}>
      <Text style={styles.rangeLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.steppersRow}>
        {renderStepper(
          'Hour',
          String(parts.hour12),
          () => changeHour(which, 1),
          () => changeHour(which, -1),
        )}
        <Text style={styles.colon}>:</Text>
        {renderStepper(
          'Minute',
          String(parts.minute).padStart(2, '0'),
          () => changeMinute(which, MINUTE_STEP),
          () => changeMinute(which, -MINUTE_STEP),
        )}
        {renderPeriodToggle(which, parts.period)}
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      {renderRow('start', 'Start', start)}
      {renderRow('end', 'End', end)}

      {/* Live duration / validation readout */}
      <View style={styles.readoutRow}>
        {valid && durationMins !== null ? (
          <Text style={styles.durationText} numberOfLines={1}>
            Duration: {fmtDuration(durationMins)}
          </Text>
        ) : (
          <Text
            style={styles.errorText}
            numberOfLines={2}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            End time must be after the start time (same day).
          </Text>
        )}
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={handleClear}
          style={({ pressed, focused }: PressableState) => [
            styles.clearBtn,
            focused && styles.focused,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Clear time"
          {...webKeyProps(handleClear)}
        >
          <Text style={styles.clearBtnText} numberOfLines={1}>
            Clear
          </Text>
        </Pressable>

        <Pressable
          onPress={handleDone}
          disabled={!valid}
          style={({ pressed, focused }: PressableState) => [
            styles.doneBtn,
            !valid && styles.doneBtnDisabled,
            focused && styles.focused,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !valid }}
          accessibilityLabel="Done"
          {...webKeyProps(handleDone)}
        >
          <Text style={styles.doneBtnText} numberOfLines={1}>
            Done
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    container: {
      gap: tokens.spacing.md,
    },
    rangeRow: {
      gap: tokens.spacing.xs,
    },
    rangeLabel: {
      ...tokens.typography.label,
      color: tokens.textSecondary,
    },
    steppersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm,
    },
    stepper: {
      alignItems: 'center',
      gap: tokens.spacing.xs,
    },
    stepperLabel: {
      ...tokens.typography.label,
      color: tokens.textMuted,
    },
    stepBtn: {
      width: CONTROL_SIZE,
      height: CONTROL_SIZE,
      borderRadius: tokens.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.bgInput,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    valueBox: {
      minWidth: CONTROL_SIZE,
      minHeight: CONTROL_SIZE,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.sm,
      backgroundColor: tokens.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    valueText: {
      ...tokens.typography.subheading,
      color: tokens.textPrimary,
    },
    colon: {
      ...tokens.typography.subheading,
      color: tokens.textPrimary,
    },
    periodToggle: {
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    periodBtn: {
      minWidth: CONTROL_SIZE,
      minHeight: CONTROL_SIZE,
      paddingHorizontal: tokens.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.bgInput,
    },
    periodBtnActive: {
      backgroundColor: tokens.accentPrimary,
    },
    periodText: {
      ...tokens.typography.body,
      color: tokens.textSecondary,
    },
    periodTextActive: {
      color: tokens.textInverse,
      fontWeight: '600',
    },
    readoutRow: {
      minHeight: tokens.spacing.xl,
      justifyContent: 'center',
    },
    durationText: {
      ...tokens.typography.caption,
      color: tokens.textSecondary,
    },
    errorText: {
      ...tokens.typography.caption,
      color: tokens.accentRed,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: tokens.spacing.md,
    },
    clearBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: CONTROL_SIZE,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    clearBtnText: {
      ...tokens.typography.body,
      color: tokens.textMuted,
      fontWeight: '500',
    },
    doneBtn: {
      minHeight: CONTROL_SIZE,
      paddingHorizontal: tokens.spacing.xl,
      borderRadius: tokens.radius.sm,
      backgroundColor: tokens.accentPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    doneBtnDisabled: {
      opacity: 0.4,
    },
    doneBtnText: {
      ...tokens.typography.body,
      color: tokens.textInverse,
      fontWeight: '600',
    },
    focused: {
      borderColor: tokens.borderFocus,
    },
    pressed: {
      opacity: 0.7,
    },
  })
}
