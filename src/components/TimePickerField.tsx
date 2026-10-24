/**
 * TimePickerField — themed start→end time RANGE input (cross-platform).
 *
 * Renders a tappable trigger showing the current range ("9:30 AM – 10:30 AM")
 * or the placeholder when empty. Tapping opens a themed Modal containing the
 * WheelTimePicker range selector — a centered card on web/wide viewports and a
 * bottom-sheet card on mobile, mirroring DatePickerField. Works identically on
 * iOS / Android / Web from one implementation — no native datetimepicker module.
 *
 * Values are HH:MM 24-hour strings (or null). The range is same-day only.
 */

import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
  useWindowDimensions,
  type PressableStateCallbackType,
} from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { applyElevation, type Tokens } from '@/src/theme/tokens'
import { SIDEBAR_BREAKPOINT } from '@/src/constants'
import { formatTime12h } from '@/src/lib/datetime'
import { WheelTimePicker, type TimeRange } from '@/src/components/WheelTimePicker'

export interface TimePickerFieldProps {
  /** Start time as HH:MM (24h), or null when unset. */
  readonly startValue: string | null
  /** End time as HH:MM (24h), or null when unset. */
  readonly endValue: string | null
  /** Called with the committed {start, end} range (both null when cleared). */
  readonly onChange: (range: TimeRange) => void
  readonly label?: string
  readonly placeholder?: string
}

type WebFocusProps = { focusable?: boolean }

type WebKeyProps = {
  onKeyDown?: (e: { key?: string; preventDefault?: () => void }) => void
  focusable?: boolean
}

type PressableState = PressableStateCallbackType & { focused?: boolean }

/** Build the trigger label from the current range. */
function rangeLabel(start: string | null, end: string | null): string | null {
  const s = formatTime12h(start)
  if (!s) return null
  const e = formatTime12h(end)
  return e ? `${s} – ${e}` : s
}

export function TimePickerField({
  startValue,
  endValue,
  onChange,
  label,
  placeholder,
}: TimePickerFieldProps) {
  const { tokens } = useTheme()
  const { width } = useWindowDimensions()
  const styles = useMemo(() => makeStyles(tokens), [tokens])

  const isMobile = !(Platform.OS === 'web' && width > SIDEBAR_BREAKPOINT)
  const [open, setOpen] = useState(false)

  const display = rangeLabel(startValue, endValue)
  const hasValue = display !== null

  const openPicker = () => setOpen(true)
  const closePicker = () => setOpen(false)

  const webKeyProps: WebKeyProps =
    Platform.OS === 'web'
      ? {
        focusable: true,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault?.()
            openPicker()
          }
        },
      }
      : {}

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.labelText}>{label}</Text> : null}

      <Pressable
        onPress={openPicker}
        style={({ pressed, focused }: PressableState) => [
          styles.trigger,
          focused && styles.triggerFocused,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Time range'}
        accessibilityValue={{ text: display ?? (placeholder ?? 'No time set') }}
        {...webKeyProps}
      >
        <Text
          style={[styles.triggerText, !hasValue && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {display ?? (placeholder ?? 'Add time')}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closePicker}
      >
        <Pressable
          style={[styles.backdrop, isMobile ? styles.backdropMobile : styles.backdropCentered]}
          onPress={closePicker}
          accessibilityLabel="Close time picker"
        >
          <Pressable
            style={[styles.card, isMobile ? styles.cardMobile : styles.cardCentered]}
            onPress={(e) => e.stopPropagation()}
          >
            {label ? <Text style={styles.cardTitle}>{label}</Text> : null}
            <WheelTimePicker
              // Remount per open so the draft reseeds from the latest committed value.
              key={open ? `${startValue ?? ''}-${endValue ?? ''}` : 'closed'}
              startValue={startValue}
              endValue={endValue}
              onChange={onChange}
              onClose={closePicker}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
    trigger: {
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      borderRadius: tokens.radius.sm,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.md,
      minHeight: 44,
      justifyContent: 'center',
      backgroundColor: tokens.bgInput,
    },
    triggerFocused: {
      borderColor: tokens.borderFocus,
    },
    pressed: {
      opacity: 0.7,
    },
    triggerText: {
      ...tokens.typography.body,
      color: tokens.textPrimary,
    },
    triggerPlaceholder: {
      color: tokens.textMuted,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backdropCentered: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: tokens.spacing.lg,
    },
    backdropMobile: {
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: tokens.bgElevated,
      padding: tokens.spacing.lg,
      gap: tokens.spacing.md,
      ...applyElevation(tokens.elevation.lg),
    },
    cardCentered: {
      width: '100%',
      maxWidth: 420,
      borderRadius: tokens.radius.lg,
    },
    cardMobile: {
      width: '100%',
      borderTopLeftRadius: tokens.radius.xl,
      borderTopRightRadius: tokens.radius.xl,
      paddingBottom: tokens.spacing.xl,
    },
    cardTitle: {
      ...tokens.typography.subheading,
      color: tokens.textPrimary,
    },
  })
}
