/**
 * DurationField — text input that accepts human-friendly duration strings
 * and converts them to/from minutes.
 *
 * Display: shows fmtDuration(value) when not focused.
 * On blur:  parses with parseDuration; shows inline error if unrecognised.
 *
 * Requirements: 7.1, 24.1
 */

import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native'
import { parseDuration, fmtDuration } from '@/src/lib/utils'
import { useTheme } from '@/src/hooks/useTheme'

export interface DurationFieldProps {
  /** Duration in minutes, or null when empty */
  readonly value: number | null
  readonly onChange: (minutes: number | null) => void
  readonly label?: string
  readonly placeholder?: string
}

export function DurationField({ value, onChange, label, placeholder }: DurationFieldProps) {
  const { tokens } = useTheme()

  // Raw text the user is typing; initialised from the formatted value prop
  const [raw, setRaw] = useState<string>(value !== null ? fmtDuration(value) : '')
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  // Sync display text when the external value changes while the field is not focused
  useEffect(() => {
    if (!focused) {
      setRaw(value !== null ? fmtDuration(value) : '')
    }
  }, [value, focused])

  const handleFocus = () => {
    setFocused(true)
    // While editing, show the raw formatted text so the user can modify it
  }

  const handleBlur = () => {
    setFocused(false)
    if (raw.trim() === '') {
      setError(null)
      setRaw('')
      onChange(null)
      return
    }
    const parsed = parseDuration(raw)
    if (parsed !== null) {
      setError(null)
      setRaw(fmtDuration(parsed))
      onChange(parsed)
    } else {
      setError('Enter like: 30m, 1h, 1h 30m')
    }
  }

  const styles = StyleSheet.create({
    wrapper: { gap: 4 },
    labelText: {
      fontSize: 13,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
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
    inputFocused: {
      borderColor: error ? tokens.accentRed : tokens.accentPrimary,
    },
    errorText: {
      fontSize: 12,
      color: tokens.accentRed,
    },
  })

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.labelText}>{label}</Text> : null}
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        value={raw}
        onChangeText={(text) => {
          setRaw(text)
          if (error) setError(null)
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder ?? '30m, 1h, 1h 30m'}
        placeholderTextColor={tokens.textMuted}
        keyboardType="default"
        returnKeyType="done"
        accessibilityLabel={label ?? 'Duration'}
        {...(Platform.OS !== 'web' ? { accessibilityHint: 'Enter a duration like 30m, 1h, or 1h 30m' } : {})}
      />
      {error ? (
        <Text
          style={styles.errorText}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </View>
  )
}
