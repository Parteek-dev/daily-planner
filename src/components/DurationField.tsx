/**
 * DurationField — text input that accepts human-friendly duration strings
 * and converts them to/from minutes.
 *
 * Display: shows fmtDuration(value) when not focused.
 * On blur:  parses with parseDuration; shows inline error if unrecognised.
 *
 * Requirements: 7.1, 24.1
 */

import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native'
import { parseDuration, fmtDuration } from '@/src/lib/utils'
import { useTheme } from '@/src/hooks/useTheme'
import type { Tokens } from '@/src/theme/tokens'

/** Quick-add preset durations, in minutes. */
const DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const

export interface DurationFieldProps {
  /** Duration in minutes, or null when empty */
  readonly value: number | null
  readonly onChange: (minutes: number | null) => void
  readonly label?: string
  readonly placeholder?: string
  /** Show a row of quick-add preset chips above the input. */
  readonly showPresets?: boolean
}

type WebFocusProps = { focusable?: boolean }

export function DurationField({ value, onChange, label, placeholder, showPresets }: DurationFieldProps) {
  const { tokens } = useTheme()
  const styles = useMemo(() => makeStyles(tokens), [tokens])

  // Raw text the user is typing; initialised from the formatted value prop
  const [raw, setRaw] = useState<string>(value !== null ? fmtDuration(value) : '')
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  // A value is "custom" when it's set but not one of the presets.
  const isPreset = value !== null && (DURATION_PRESETS as readonly number[]).includes(value)
  const isCustomValue = value !== null && !isPreset

  // Whether the custom text input is revealed (chips mode only). Starts open
  // when the current value is a non-preset custom value.
  const [customOpen, setCustomOpen] = useState(isCustomValue)

  // Keep the custom input open whenever the value is a custom (non-preset) one.
  useEffect(() => {
    if (isCustomValue) setCustomOpen(true)
  }, [isCustomValue])

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
      // Collapse the inline custom field back to the "Custom" chip.
      setCustomOpen(false)
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

  // Tapping a preset sets that duration; tapping the active one clears it.
  const selectPreset = (mins: number) => {
    setError(null)
    setCustomOpen(false)
    if (value === mins) {
      setRaw('')
      onChange(null)
    } else {
      setRaw(fmtDuration(mins))
      onChange(mins)
    }
  }

  const toggleCustom = () => {
    setError(null)
    // Toggle the custom input; closing it when a custom value is set clears it.
    if (customOpen && isCustomValue) {
      setRaw('')
      onChange(null)
      setCustomOpen(false)
    } else {
      setCustomOpen((v) => !v)
    }
  }

  // The full-width plain input (non-preset mode only).
  const renderInput = (extraStyle?: object) => (
    <TextInput
      style={[
        styles.input,
        extraStyle,
        error ? styles.inputError : focused && styles.inputFocused,
      ]}
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
      autoFocus={showPresets}
      accessibilityLabel={label ?? 'Duration'}
      {...(Platform.OS !== 'web' ? { accessibilityHint: 'Enter a duration like 30m, 1h, or 1h 30m' } : {})}
    />
  )

  // ── Chips mode (Idea A): preset chips sized like the Date/Time boxes, plus a
  //    Custom chip that turns the SAME chip into an inline editable field. ──
  if (showPresets) {
    const customActive = customOpen || isCustomValue
    return (
      <View style={styles.wrapper}>
        {label ? <Text style={styles.labelText}>{label}</Text> : null}

        <View style={styles.presetRow}>
          {DURATION_PRESETS.map((mins) => {
            const active = value === mins
            return (
              <Pressable
                key={mins}
                onPress={() => selectPreset(mins)}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Set duration to ${fmtDuration(mins)}`}
                {...(Platform.OS === 'web' ? ({ focusable: true } as WebFocusProps) : {})}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                  numberOfLines={1}
                >
                  {fmtDuration(mins)}
                </Text>
              </Pressable>
            )
          })}

          {customOpen ? (
            // The Custom chip becomes an inline editable field (same box size).
            renderInput(styles.customInputChip)
          ) : (
            <Pressable
              onPress={toggleCustom}
              style={({ pressed }) => [
                styles.chip,
                customActive && styles.chipActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: customActive }}
              accessibilityLabel="Enter a custom duration"
              {...(Platform.OS === 'web' ? ({ focusable: true } as WebFocusProps) : {})}
            >
              <Text
                style={[styles.chipText, customActive && styles.chipTextActive]}
                numberOfLines={1}
              >
                {isCustomValue ? fmtDuration(value) : 'Custom'}
              </Text>
            </Pressable>
          )}
        </View>

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

  // ── Plain mode: just the input (unchanged) ──
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.labelText}>{label}</Text> : null}
      {renderInput()}
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

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    wrapper: { gap: tokens.spacing.xs },
    labelText: {
      ...tokens.typography.caption,
      color: tokens.textSecondary,
    },
    presetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm,
    },
    // Chip sized to match the Date/Time trigger box: same radius, height,
    // border and background tokens.
    chip: {
      paddingHorizontal: tokens.spacing.md,
      minHeight: 44,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      backgroundColor: tokens.bgInput,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: {
      borderColor: tokens.accentPrimary,
      backgroundColor: tokens.accentPrimaryMuted,
    },
    chipText: {
      ...tokens.typography.body,
      color: tokens.textSecondary,
    },
    chipTextActive: {
      color: tokens.accentPrimary,
      fontWeight: '600',
    },
    // Inline editable field that replaces the Custom chip — same box footprint.
    customInputChip: {
      minWidth: 96,
      paddingVertical: 0,
    },
    pressed: {
      opacity: 0.7,
    },
    input: {
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      borderRadius: tokens.radius.sm,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.md,
      minHeight: 44,
      ...tokens.typography.body,
      color: tokens.textPrimary,
      backgroundColor: tokens.bgInput,
    },
    inputFocused: {
      borderColor: tokens.borderFocus,
    },
    inputError: {
      borderColor: tokens.accentRed,
    },
    errorText: {
      ...tokens.typography.caption,
      color: tokens.accentRed,
    },
  })
}
