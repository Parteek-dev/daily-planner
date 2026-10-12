/**
 * TimePickerField — cross-platform time input.
 *
 * Platform strategy:
 *   iOS/Android: Tries to use @react-native-community/datetimepicker if installed.
 *                Falls back to a validated TextInput (HH:MM) if not available.
 *   web:         Renders <input type="time"> via TextInput with type prop.
 *
 * value and onChange deal in HH:MM strings (24-hour) or null.
 *
 * Requirements: 7.1
 */

import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'

let DateTimePicker: React.ComponentType<any> | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePicker = require('@react-native-community/datetimepicker').default
} catch {
  DateTimePicker = null
}

export interface TimePickerFieldProps {
  readonly value: string | null
  readonly onChange: (time: string | null) => void
  readonly label?: string
  readonly placeholder?: string
}

/** Parse HH:MM string into a Date (today's date with that time) */
function parseHHMM(hhmm: string): Date | null {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (h > 23 || m > 59) return null
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

/** Convert a Date to HH:MM (24-hour) */
function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function isValidHHMM(str: string): boolean {
  return parseHHMM(str) !== null
}

// ── Web ───────────────────────────────────────────────────────────────────────

function TimePickerWeb({ value, onChange, label, placeholder }: TimePickerFieldProps) {
  const { tokens } = useTheme()

  const styles = StyleSheet.create({
    wrapper: { gap: 4 },
    labelText: { fontSize: 13, color: tokens.textSecondary, fontWeight: '500' },
    input: {
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: tokens.textPrimary,
      backgroundColor: tokens.bgInput,
      fontSize: 15,
    },
  })

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.labelText}>{label}</Text> : null}
      <TextInput
        style={styles.input}
        value={value ?? ''}
        onChangeText={(text) => {
          if (text === '') { onChange(null); return }
          // Allow partial typing; onBlur validates and resets if malformed
          onChange(text)
        }}
        onBlur={() => {
          if (value && !isValidHHMM(value)) onChange(null)
        }}
        placeholder={placeholder ?? 'HH:MM'}
        placeholderTextColor={tokens.textMuted}
        {...(Platform.OS === 'web' ? ({ type: 'time' } as any) : {})}
        accessibilityLabel={label ?? 'Time'}
        {...(Platform.OS !== 'web' ? { accessibilityHint: 'Enter time in HH:MM 24-hour format' } : {})}
      />
    </View>
  )
}

// ── Native fallback ───────────────────────────────────────────────────────────

function TimePickerTextFallback({ value, onChange, label, placeholder }: TimePickerFieldProps) {
  const { tokens } = useTheme()
  const [raw, setRaw] = useState(value ?? '')
  const [error, setError] = useState<string | null>(null)

  const handleBlur = () => {
    if (raw === '') {
      setError(null)
      onChange(null)
      return
    }
    if (isValidHHMM(raw)) {
      setError(null)
      onChange(raw)
    } else {
      setError('Enter time like: 09:30 or 14:00')
    }
  }

  const styles = StyleSheet.create({
    wrapper: { gap: 4 },
    labelText: { fontSize: 13, color: tokens.textSecondary, fontWeight: '500' },
    input: {
      borderWidth: 1,
      borderColor: error ? tokens.accentRed : tokens.borderPrimary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: tokens.textPrimary,
      backgroundColor: tokens.bgInput,
      fontSize: 15,
    },
    errorText: { fontSize: 12, color: tokens.accentRed },
  })

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.labelText}>{label}</Text> : null}
      <TextInput
        style={styles.input}
        value={raw}
        onChangeText={(text) => {
          setRaw(text)
          if (error) setError(null)
        }}
        onBlur={handleBlur}
        placeholder={placeholder ?? 'HH:MM'}
        placeholderTextColor={tokens.textMuted}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel={label ?? 'Time'}
        {...(Platform.OS !== 'web' ? { accessibilityHint: 'Enter time in HH:MM 24-hour format' } : {})}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

// ── Native with DateTimePicker ─────────────────────────────────────────────────

function TimePickerNative({ value, onChange, label, placeholder }: TimePickerFieldProps) {
  const { tokens } = useTheme()
  const [show, setShow] = useState(false)

  const date = value ? (parseHHMM(value) ?? new Date()) : new Date()

  const styles = StyleSheet.create({
    wrapper: { gap: 4 },
    labelText: { fontSize: 13, color: tokens.textSecondary, fontWeight: '500' },
    trigger: {
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: tokens.bgInput,
    },
    triggerText: {
      fontSize: 15,
      color: value ? tokens.textPrimary : tokens.textMuted,
    },
  })

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.labelText}>{label}</Text> : null}
      <View
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Time'}
        onTouchEnd={() => setShow(true)}
      >
        <Text style={styles.triggerText}>{value ?? (placeholder ?? 'Select time')}</Text>
      </View>
      {show && DateTimePicker ? (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour
          display="default"
          onChange={(_: any, selected?: Date) => {
            setShow(Platform.OS === 'ios')
            if (selected) onChange(toHHMM(selected))
          }}
        />
      ) : null}
    </View>
  )
}

// ── Exported component ────────────────────────────────────────────────────────

export function TimePickerField(props: TimePickerFieldProps) {
  if (Platform.OS === 'web') return <TimePickerWeb {...props} />
  if (DateTimePicker !== null) return <TimePickerNative {...props} />
  return <TimePickerTextFallback {...props} />
}
