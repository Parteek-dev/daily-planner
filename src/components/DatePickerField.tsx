/**
 * DatePickerField — cross-platform date input.
 *
 * Platform strategy:
 *   iOS/Android: Tries to use @react-native-community/datetimepicker if installed.
 *                Falls back to a validated TextInput (YYYY-MM-DD) if not available.
 *   web:         Renders <input type="date"> via TextInput with inputMode/type props.
 *
 * value and onChange deal exclusively in YYYY-MM-DD strings.
 *
 * Requirements: 7.1
 */

import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'

// Attempt to lazily require the native date picker without crashing if absent.
let DateTimePicker: React.ComponentType<any> | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePicker = require('@react-native-community/datetimepicker').default
} catch {
  DateTimePicker = null
}

export interface DatePickerFieldProps {
  readonly value: string
  readonly onChange: (date: string) => void
  readonly label?: string
  readonly placeholder?: string
}

/** Convert YYYY-MM-DD → Date (midnight UTC) */
function parseYMD(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const d = new Date(`${ymd}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Convert Date → YYYY-MM-DD */
function toYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Validate that a raw text string is a proper YYYY-MM-DD date */
function isValidYMD(str: string): boolean {
  return parseYMD(str) !== null
}

// ── Web implementation ────────────────────────────────────────────────────────

function DatePickerWeb({ value, onChange, label, placeholder }: DatePickerFieldProps) {
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
        value={value}
        onChangeText={(text) => {
          if (isValidYMD(text) || text === '') onChange(text)
        }}
        placeholder={placeholder ?? 'YYYY-MM-DD'}
        placeholderTextColor={tokens.textMuted}
        // On web these attrs render an <input type="date">
        {...(Platform.OS === 'web' ? ({ type: 'date' } as any) : {})}
        accessibilityLabel={label ?? 'Date'}
        {...(Platform.OS !== 'web' ? { accessibilityHint: 'Enter a date in YYYY-MM-DD format' } : {})}
      />
    </View>
  )
}

// ── Native fallback (TextInput-based) ─────────────────────────────────────────

function DatePickerTextFallback({ value, onChange, label, placeholder }: DatePickerFieldProps) {
  const { tokens } = useTheme()
  const [raw, setRaw] = useState(value)
  const [error, setError] = useState<string | null>(null)

  const handleBlur = () => {
    if (raw === '') {
      setError(null)
      onChange('')
      return
    }
    if (isValidYMD(raw)) {
      setError(null)
      onChange(raw)
    } else {
      setError('Enter a date like: 2025-01-31')
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
        placeholder={placeholder ?? 'YYYY-MM-DD'}
        placeholderTextColor={tokens.textMuted}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel={label ?? 'Date'}
        {...(Platform.OS !== 'web' ? { accessibilityHint: 'Enter a date in YYYY-MM-DD format' } : {})}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

// ── Native implementation using @react-native-community/datetimepicker ────────

function DatePickerNative({ value, onChange, label, placeholder }: DatePickerFieldProps) {
  const { tokens } = useTheme()
  const [show, setShow] = useState(false)

  const date = parseYMD(value) ?? new Date()

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
        accessibilityLabel={label ?? 'Date'}
        onTouchEnd={() => setShow(true)}
      >
        <Text style={styles.triggerText}>{value || (placeholder ?? 'Select date')}</Text>
      </View>
      {show && DateTimePicker ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(_: any, selected?: Date) => {
            setShow(Platform.OS === 'ios')
            if (selected) onChange(toYMD(selected))
          }}
        />
      ) : null}
    </View>
  )
}

// ── Exported component: picks the right implementation ────────────────────────

export function DatePickerField(props: DatePickerFieldProps) {
  if (Platform.OS === 'web') return <DatePickerWeb {...props} />
  if (DateTimePicker !== null) return <DatePickerNative {...props} />
  return <DatePickerTextFallback {...props} />
}
