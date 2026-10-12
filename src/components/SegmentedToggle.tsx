/**
 * SegmentedToggle.tsx
 *
 * Shared pill-style segmented control — the same visual style as the
 * Month / Week toggle in the calendar screen.
 *
 * Active segment:   bgInput container → bgElevated pill → accentPrimary icon + label
 * Inactive segment: no background, icon only, textMuted
 *
 * Usage:
 *   <SegmentedToggle
 *     options={[
 *       { value: 'month', label: 'Month', icon: (color) => <CalendarDays size={14} color={color} /> },
 *       { value: 'week',  label: 'Week',  icon: (color) => <CalendarCheck size={14} color={color} /> },
 *     ]}
 *     value={viewMode}
 *     onChange={(v) => setViewMode(v as 'month' | 'week')}
 *   />
 */

import React, { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SegmentOption {
  /** Unique identifier for this segment */
  value: string
  /** Label shown only when this segment is active */
  label: string
  /**
   * Icon factory — receives the resolved color string so the icon automatically
   * matches the active / inactive state.
   */
  icon: (color: string) => React.ReactElement
}

export interface SegmentedToggleProps {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
}

// ─── Styles ───────────────────────────────────────────────────────────────────

type ThemeTokens = ReturnType<typeof useTheme>['tokens']

const makeStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      borderRadius: tokens.radius.md,
      padding: 3,
      gap: 2,
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: tokens.radius.sm,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
    },
  })

// ─── Component ────────────────────────────────────────────────────────────────

export default function SegmentedToggle({
  options,
  value,
  onChange,
}: Readonly<SegmentedToggleProps>) {
  const { tokens } = useTheme()
  const styles = useMemo(() => makeStyles(tokens), [tokens])

  return (
    <View style={[styles.container, { backgroundColor: tokens.bgInput }]}>
      {options.map((opt) => {
        const isActive = opt.value === value
        const iconColor = isActive ? tokens.accentPrimary : tokens.textMuted

        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.btn,
              isActive && { backgroundColor: tokens.bgElevated },
            ]}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: isActive }}
          >
            {opt.icon(iconColor)}
            {isActive && (
              <Text style={[styles.label, { color: tokens.accentPrimary }]}>
                {opt.label}
              </Text>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}
