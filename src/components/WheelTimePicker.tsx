/**
 * WheelTimePicker — themed 12-hour time selector (pure presentation).
 *
 * Hour (1–12), minute (00–59, +/- in steps of 5, wrapping so any value is
 * reachable), and an AM/PM segmented toggle, plus Clear (→ null) and Done.
 * No native wheel module — simple +/- steppers that work on iOS / Android / Web
 * from one implementation. Internally converts 24h ↔ 12h and always EMITS a
 * 24-hour HH:MM string (or null).
 *
 * 44x44 touch targets; on web controls are focusable and respond to
 * Enter/Space with a visible tokens.borderFocus ring.
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
import { ChevronUp, ChevronDown, X } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import type { Tokens } from '@/src/theme/tokens'
import { to12h, to24h, type Period } from '@/src/lib/datetime'

export interface WheelTimePickerProps {
  /** Current time as HH:MM (24h), or null when unset. */
  readonly value: string | null
  /** Called with the new HH:MM (24h) string, or null when cleared. */
  readonly onChange: (hhmm: string | null) => void
  /** Optional close handler (Done button). */
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

/** Default seed when value is null: 9:00 AM. */
const DEFAULT_PARTS = { hour12: 9, minute: 0, period: 'AM' as Period }

export function WheelTimePicker({ value, onChange, onClose }: WheelTimePickerProps) {
  const { tokens } = useTheme()
  const styles = useMemo(() => makeStyles(tokens), [tokens])

  const seed = useMemo(() => to12h(value) ?? DEFAULT_PARTS, [value])
  const [hour12, setHour12] = useState(seed.hour12)
  const [minute, setMinute] = useState(seed.minute)
  const [period, setPeriod] = useState<Period>(seed.period)

  const emit = (h: number, m: number, p: Period) => {
    onChange(to24h(h, m, p))
  }

  const changeHour = (delta: number) => {
    // Wrap within 1..12.
    const next = ((hour12 - 1 + delta + 12) % 12) + 1
    setHour12(next)
    emit(next, minute, period)
  }

  const changeMinute = (delta: number) => {
    // Step by 5 but keep any already-set value reachable by wrapping 0..59.
    const next = (((minute + delta) % 60) + 60) % 60
    setMinute(next)
    emit(hour12, next, period)
  }

  const selectPeriod = (p: Period) => {
    setPeriod(p)
    emit(hour12, minute, p)
  }

  const handleClear = () => {
    onChange(null)
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
        <ChevronUp size={20} color={tokens.textPrimary} />
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
        <ChevronDown size={20} color={tokens.textPrimary} />
      </Pressable>
    </View>
  )

  const periods: Period[] = ['AM', 'PM']

  return (
    <View style={styles.container}>
      <View style={styles.steppersRow}>
        {renderStepper('Hour', String(hour12), () => changeHour(1), () => changeHour(-1))}

        <Text style={styles.colon}>:</Text>

        {renderStepper(
          'Minute',
          String(minute).padStart(2, '0'),
          () => changeMinute(MINUTE_STEP),
          () => changeMinute(-MINUTE_STEP),
        )}

        {/* AM/PM segmented toggle */}
        <View style={styles.periodToggle}>
          {periods.map((p) => {
            const active = period === p
            return (
              <Pressable
                key={p}
                onPress={() => selectPeriod(p)}
                style={({ pressed, focused }: PressableState) => [
                  styles.periodBtn,
                  active && styles.periodBtnActive,
                  focused && styles.focused,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={p}
                {...webKeyProps(() => selectPeriod(p))}
              >
                <Text style={[styles.periodText, active && styles.periodTextActive]} numberOfLines={1}>
                  {p}
                </Text>
              </Pressable>
            )
          })}
        </View>
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
          <X size={16} color={tokens.textSecondary} />
          <Text style={styles.clearBtnText} numberOfLines={1}>
            Clear
          </Text>
        </Pressable>

        {onClose ? (
          <Pressable
            onPress={onClose}
            style={({ pressed, focused }: PressableState) => [
              styles.doneBtn,
              focused && styles.focused,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Done"
            {...webKeyProps(onClose)}
          >
            <Text style={styles.doneBtnText} numberOfLines={1}>
              Done
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    container: {
      gap: tokens.spacing.lg,
    },
    steppersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.sm,
    },
    stepper: {
      alignItems: 'center',
      gap: tokens.spacing.xs,
    },
    stepperLabel: {
      ...tokens.typography.label,
      color: tokens.textSecondary,
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
      minWidth: CONTROL_SIZE + tokens.spacing.lg,
      minHeight: CONTROL_SIZE,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.sm,
      backgroundColor: tokens.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    valueText: {
      ...tokens.typography.heading,
      color: tokens.textPrimary,
    },
    colon: {
      ...tokens.typography.heading,
      color: tokens.textPrimary,
      marginHorizontal: tokens.spacing.xs,
    },
    periodToggle: {
      marginLeft: tokens.spacing.sm,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      overflow: 'hidden',
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
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: tokens.spacing.md,
    },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.xs,
      minHeight: CONTROL_SIZE,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      backgroundColor: tokens.bgInput,
    },
    clearBtnText: {
      ...tokens.typography.body,
      color: tokens.textSecondary,
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
