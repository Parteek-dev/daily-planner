/**
 * ThemeCustomizer — accent color picker and light/dark/auto mode selector.
 *
 * Port of frontend/src/components/ThemeCustomizer.jsx to React Native.
 * - Replaces <input type="color"> with a grid of colored Pressable buttons.
 * - Replaces <input type="text"> with TextInput for hex entry.
 * - Uses ACCENT_COLORS from useTheme (same set as the web version).
 * - Rendered inside a React Native Modal instead of a CSS modal-overlay.
 *
 * Requirements: 3.6
 */

import React, { useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native'
import { Check, Moon, Palette, Sun, SunMoon } from 'lucide-react-native'
import { ACCENT_COLORS, useTheme } from '@/src/hooks/useTheme'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ThemeCustomizerProps {
  readonly isOpen: boolean
  readonly onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ThemeCustomizer({ isOpen, onClose }: ThemeCustomizerProps) {
  const { theme, themeMode, setThemeMode, accentColor, setAccentColor, tokens } = useTheme()

  // Local hex input — keeps partial text while the user is typing
  const [hexInput, setHexInput] = useState(accentColor)

  const styles = makeStyles(tokens)

  const handleHexChange = (text: string) => {
    setHexInput(text)
    // Commit only when it's a complete 7-char hex colour
    if (/^#[0-9A-Fa-f]{6}$/.test(text)) {
      setAccentColor(text)
    }
  }

  const handleAccentPress = (value: string) => {
    setAccentColor(value)
    setHexInput(value)
  }

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityLabel="Close theme customizer"
      >
        <Pressable onPress={() => { }} style={styles.modalContent}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Palette size={20} color={tokens.accentBlue} />
            <Text style={styles.title}>Customize Theme</Text>
          </View>

          {/* ── Mode selector ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Mode</Text>
            <View style={styles.modeRow}>
              {(
                [
                  { mode: 'light', label: 'Light', Icon: Sun },
                  { mode: 'dark', label: 'Dark', Icon: Moon },
                  { mode: 'auto', label: 'Auto', Icon: SunMoon },
                ] as const
              ).map(({ mode, label, Icon }) => {
                const active = themeMode === mode
                return (
                  <Pressable
                    key={mode}
                    onPress={() => setThemeMode(mode)}
                    style={({ pressed }) => [
                      styles.modeBtn,
                      active ? styles.modeBtnActive : styles.modeBtnInactive,
                      pressed && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${label} mode`}
                    accessibilityState={{ selected: active }}
                  >
                    <Icon size={24} color={active ? '#ffffff' : tokens.textSecondary} />
                    <Text style={active ? styles.modeLabelActive : styles.modeLabelInactive}>
                      {label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {themeMode === 'auto' && (
              <Text style={styles.autoHint}>
                Follows your system's dark/light preference automatically.
              </Text>
            )}
          </View>

          {/* ── Accent color grid ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Accent Color</Text>
            <View style={styles.colorGrid}>
              {ACCENT_COLORS.map(color => {
                const active = accentColor === color.value
                return (
                  <Pressable
                    key={color.value}
                    onPress={() => handleAccentPress(color.value)}
                    style={({ pressed }) => [
                      styles.colorSwatch,
                      {
                        backgroundColor: color.value,
                        borderWidth: active ? 3 : 0,
                        borderColor: '#ffffff',
                        ...(Platform.OS !== 'web' ? {
                          shadowColor: active ? color.value : 'transparent',
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: active ? 0.6 : 0,
                          shadowRadius: active ? 4 : 0,
                        } : { boxShadow: active ? `0 0 0 3px ${color.value}` : 'none' }),
                        elevation: active ? 4 : 0,
                      },
                      pressed && { transform: [{ scale: 1.1 }] },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={color.name}
                    accessibilityState={{ selected: active }}
                  >
                    {active && <Check size={18} color="white" strokeWidth={3} />}
                  </Pressable>
                )
              })}
            </View>
          </View>

          {/* ── Custom hex input ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Custom Hex Color</Text>
            <View style={styles.hexRow}>
              {/* Live preview swatch */}
              <View style={[styles.hexPreview, { backgroundColor: accentColor }]} />
              <TextInput
                style={styles.hexInput}
                value={hexInput}
                onChangeText={handleHexChange}
                placeholder="#3b82f6"
                placeholderTextColor={tokens.textMuted}
                autoCapitalize="characters"
                maxLength={7}
                accessibilityLabel="Custom hex color"
                {...(Platform.OS !== 'web' ? { accessibilityHint: 'Enter a 6-digit hex color code starting with #' } : {})}
              />
            </View>
          </View>

          {/* ── Preview strip ── */}
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Preview</Text>
            <View style={styles.previewRow}>
              <Pressable
                style={[styles.previewBtnPrimary, { backgroundColor: accentColor }]}
                accessibilityRole="button"
                accessibilityLabel="Primary button preview"
              >
                <Text style={styles.previewBtnPrimaryText}>Primary</Text>
              </Pressable>

              <Pressable
                style={styles.previewBtnSecondary}
                accessibilityRole="button"
                accessibilityLabel="Secondary button preview"
              >
                <Text style={styles.previewBtnSecondaryText}>Secondary</Text>
              </Pressable>

              <View style={[styles.previewBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.previewBadgeText}>Badge</Text>
              </View>
            </View>
          </View>

          {/* ── Done ── */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>

        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: tokens.bgSecondary,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 420,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    section: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.textSecondary,
      marginBottom: 12,
    },
    // ── mode row ──
    modeRow: {
      flexDirection: 'row',
      gap: 12,
    },
    modeBtn: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
    },
    modeBtnActive: {
      backgroundColor: tokens.accentBlue,
      borderColor: tokens.accentBlue,
    },
    modeBtnInactive: {
      backgroundColor: tokens.bgInput,
      borderColor: tokens.borderPrimary,
    },
    modeLabelActive: {
      fontSize: 13,
      fontWeight: '500',
      color: '#ffffff',
    },
    modeLabelInactive: {
      fontSize: 13,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    autoHint: {
      fontSize: 12,
      color: tokens.textMuted,
      marginTop: 8,
    },
    // ── color grid ──
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    colorSwatch: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // ── hex input ──
    hexRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    hexPreview: {
      width: 44,
      height: 40,
      borderRadius: 8,
    },
    hexInput: {
      flex: 1,
      padding: 10,
      backgroundColor: tokens.bgInput,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      borderRadius: 8,
      color: tokens.textPrimary,
      fontSize: 14,
      fontFamily: 'monospace',
    },
    // ── preview ──
    previewSection: {
      backgroundColor: tokens.bgInput,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    previewLabel: {
      fontSize: 12,
      color: tokens.textMuted,
      marginBottom: 12,
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    },
    previewBtnPrimary: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
    },
    previewBtnPrimaryText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#ffffff',
    },
    previewBtnSecondary: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: tokens.bgSecondary,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
    },
    previewBtnSecondaryText: {
      fontSize: 13,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    previewBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    previewBadgeText: {
      fontSize: 13,
      fontWeight: '500',
      color: '#ffffff',
    },
    // ── done ──
    doneBtn: {
      backgroundColor: tokens.bgInput,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    doneBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
  })
}
