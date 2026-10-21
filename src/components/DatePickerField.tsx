/**
 * DatePickerField — cross-platform date input.
 *
 * One themed implementation on iOS / Android / Web: a Pressable trigger styled
 * from tokens shows the formatted date (or placeholder), and opening it reveals
 * the themed CalendarPicker inside a Modal overlay — a centered card on web/wide
 * viewports and a bottom-sheet card on mobile. No <input type="date"> and no
 * native datetimepicker module.
 *
 * value and onChange deal exclusively in YYYY-MM-DD strings ('' when unset).
 *
 * Requirements: 7.1
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
import { formatDateDisplay } from '@/src/lib/datetime'
import { CalendarPicker } from '@/src/components/CalendarPicker'

export interface DatePickerFieldProps {
  readonly value: string
  readonly onChange: (date: string) => void
  readonly label?: string
  readonly placeholder?: string
}

type WebFocusProps = { focusable?: boolean }

// react-native-web adds `focused` to the Pressable state callback; the RN types
// don't declare it, so extend the type for the web focus-ring styling.
type PressableState = PressableStateCallbackType & { focused?: boolean }

export function DatePickerField({ value, onChange, label, placeholder }: DatePickerFieldProps) {
  const { tokens } = useTheme()
  const { width } = useWindowDimensions()
  const styles = useMemo(() => makeStyles(tokens), [tokens])

  const isMobile = !(Platform.OS === 'web' && width > SIDEBAR_BREAKPOINT)
  const [open, setOpen] = useState(false)

  const display = formatDateDisplay(value)
  const hasValue = display !== ''

  const handleSelect = (ymd: string) => {
    onChange(ymd)
  }

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.labelText}>{label}</Text> : null}

      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed, focused }: PressableState) => [
          styles.trigger,
          focused && styles.triggerFocused,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Date'}
        {...(Platform.OS === 'web' ? ({ focusable: true } as WebFocusProps) : {})}
      >
        <Text
          style={[styles.triggerText, !hasValue && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {hasValue ? display : placeholder ?? 'Select date'}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, isMobile ? styles.backdropMobile : styles.backdropCentered]}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close date picker"
        >
          <Pressable
            style={[styles.card, isMobile ? styles.cardMobile : styles.cardCentered]}
            onPress={(e) => e.stopPropagation()}
          >
            <CalendarPicker
              value={value}
              onSelect={handleSelect}
              onClose={() => setOpen(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    wrapper: {
      gap: tokens.spacing.xs,
    },
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
      backgroundColor: tokens.bgInput,
      minHeight: 44,
      justifyContent: 'center',
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
      ...applyElevation(tokens.elevation.lg),
    },
    cardCentered: {
      width: '100%',
      maxWidth: 360,
      borderRadius: tokens.radius.lg,
    },
    cardMobile: {
      width: '100%',
      borderTopLeftRadius: tokens.radius.xl,
      borderTopRightRadius: tokens.radius.xl,
      paddingBottom: tokens.spacing.xl,
    },
  })
}
