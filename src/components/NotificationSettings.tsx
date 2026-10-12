/**
 * NotificationSettings — notification toggle and lead-time selector.
 *
 * Port of frontend/src/components/NotificationSettings.jsx to React Native.
 * Replaces <select> with a Pressable-based picker (Platform.OS === 'web' uses
 * a native HTML select via TextInput passthrough; on native a row of Pressable
 * option chips is rendered).
 *
 * Requirements: 17.1, 17.4
 */

import React, { useState } from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { AlertCircle, Bell, BellOff, Clock } from 'lucide-react-native'
import { PermissionStatus } from 'expo-modules-core'
import { useTheme } from '@/src/hooks/useTheme'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotificationSettingsProps {
  readonly isSupported: boolean
  readonly permission: PermissionStatus | string
  readonly enabled: boolean
  readonly reminderMinutes: number
  readonly onToggle: () => void | Promise<void>
  readonly onUpdateMinutes: (minutes: number) => void | Promise<void>
}

// ── Reminder option set ───────────────────────────────────────────────────────

const REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1 min' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hr' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationSettings({
  isSupported,
  permission,
  enabled,
  reminderMinutes,
  onToggle,
  onUpdateMinutes,
}: NotificationSettingsProps) {
  const { tokens } = useTheme()
  const [pickerOpen, setPickerOpen] = useState(false)

  const isBlocked = permission === 'denied' || permission === PermissionStatus.DENIED
  const isPending = permission === 'default' || permission === PermissionStatus.UNDETERMINED

  const styles = makeStyles(tokens)

  // Status text under the bell label
  function statusText(): string {
    if (!isSupported) return 'Not supported on this platform'
    if (isBlocked) return 'Notifications blocked — enable in settings'
    if (isPending && !enabled) return 'Get reminded before tasks are due'
    if (permission === 'granted' || permission === PermissionStatus.GRANTED) {
      return enabled ? 'Active' : 'Disabled'
    }
    return 'Get reminded before tasks are due'
  }

  // Selected option label
  const selectedLabel =
    REMINDER_OPTIONS.find(o => o.value === reminderMinutes)?.label ??
    `${reminderMinutes} min`

  return (
    <View style={styles.card}>

      {/* ── Top row: icon + labels + toggle ── */}
      <View style={[styles.topRow, !enabled && { marginBottom: 0 }]}>
        <View style={styles.iconWrap}>
          {enabled
            ? <Bell size={18} color={tokens.accentBlue} />
            : <BellOff size={18} color={tokens.textMuted} />
          }
        </View>

        <View style={styles.labelCol}>
          <Text style={styles.labelTitle}>Task Reminders</Text>
          <Text style={styles.labelSub}>{statusText()}</Text>
        </View>

        {/* Toggle button — hidden when blocked */}
        {isSupported && !isBlocked && (
          <Pressable
            onPress={onToggle}
            style={({ pressed }) => [
              styles.toggleBtn,
              enabled ? styles.toggleBtnOn : styles.toggleBtnOff,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={enabled ? 'Turn off notifications' : 'Turn on notifications'}
            accessibilityState={{ checked: enabled }}
          >
            <Text style={enabled ? styles.toggleTextOn : styles.toggleTextOff}>
              {enabled ? 'On' : 'Off'}
            </Text>
          </Pressable>
        )}

        {/* Blocked badge */}
        {isBlocked && (
          <View style={styles.blockedBadge}>
            <AlertCircle size={14} color={tokens.accentRed} />
            <Text style={styles.blockedText}>Blocked</Text>
          </View>
        )}
      </View>

      {/* ── Lead-time picker (visible only when enabled) ── */}
      {enabled && (
        <View style={styles.pickerSection}>
          <Clock size={14} color={tokens.textMuted} />
          <Text style={styles.pickerLabel}>Remind me</Text>

          {/* Web: use a native <select> via a small inline element */}
          {Platform.OS === 'web' ? (
            <WebSelect
              value={reminderMinutes}
              onChange={(v) => onUpdateMinutes(v)}
              options={REMINDER_OPTIONS}
              tokens={tokens}
            />
          ) : (
            /* Native: chips row */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              style={styles.chipsScroll}
            >
              {REMINDER_OPTIONS.map(opt => {
                const active = opt.value === reminderMinutes
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => onUpdateMinutes(opt.value)}
                    style={({ pressed }) => [
                      styles.chip,
                      active ? styles.chipActive : styles.chipInactive,
                      pressed && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={active ? styles.chipTextActive : styles.chipTextInactive}>
                      {opt.label}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          )}

          <Text style={styles.pickerSuffix}>before due</Text>
        </View>
      )}
    </View>
  )
}

// ── Web-only <select> wrapper ─────────────────────────────────────────────────

interface WebSelectProps {
  value: number
  onChange: (v: number) => void
  options: { value: number; label: string }[]
  tokens: ReturnType<typeof useTheme>['tokens']
}

function WebSelect({ value, onChange, options, tokens }: WebSelectProps) {
  // On web we can render a real <select> element via dangerouslySetInnerHTML
  // pattern is not available in RN, but on RN Web a plain View with the web
  // 'select' element works via the React DOM renderer.
  // We cast to any to avoid TS errors for the web-only `as` attribute.
  const selectStyle: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: 13,
    background: tokens.bgInput,
    color: tokens.textPrimary,
    border: `1px solid ${tokens.borderPrimary}`,
    borderRadius: 6,
    cursor: 'pointer',
    outline: 'none',
  }

  return (
    // @ts-ignore — web-only element, rendered only when Platform.OS === 'web'
    <select
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(Number(e.target.value))}
      style={selectStyle}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    card: {
      backgroundColor: tokens.bgSecondary,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.borderPrimary,
      padding: 16,
      marginBottom: 20,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: tokens.bgInput,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    labelCol: {
      flex: 1,
    },
    labelTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    labelSub: {
      fontSize: 12,
      color: tokens.textMuted,
      marginTop: 2,
    },
    toggleBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
    },
    toggleBtnOn: {
      backgroundColor: tokens.accentBlue,
    },
    toggleBtnOff: {
      backgroundColor: tokens.bgInput,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
    },
    toggleTextOn: {
      fontSize: 13,
      fontWeight: '600',
      color: '#ffffff',
    },
    toggleTextOff: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    blockedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    blockedText: {
      fontSize: 12,
      color: tokens.accentRed,
    },
    // ── picker section ──
    pickerSection: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: tokens.borderPrimary,
      flexWrap: 'wrap',
      gap: 8,
    },
    pickerLabel: {
      fontSize: 13,
      color: tokens.textSecondary,
    },
    pickerSuffix: {
      fontSize: 13,
      color: tokens.textSecondary,
    },
    chipsScroll: {
      flexShrink: 1,
      maxWidth: '100%',
    },
    chipsRow: {
      flexDirection: 'row',
      gap: 6,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 16,
      borderWidth: 1,
    },
    chipActive: {
      backgroundColor: tokens.accentBlue,
      borderColor: tokens.accentBlue,
    },
    chipInactive: {
      backgroundColor: tokens.bgInput,
      borderColor: tokens.borderPrimary,
    },
    chipTextActive: {
      fontSize: 12,
      fontWeight: '600',
      color: '#ffffff',
    },
    chipTextInactive: {
      fontSize: 12,
      color: tokens.textSecondary,
    },
  })
}
