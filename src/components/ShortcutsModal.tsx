/**
 * ShortcutsModal.tsx — keyboard shortcuts reference overlay.
 *
 * Migrated from frontend/src/components/ShortcutsModal.jsx.
 * All HTML elements replaced with RN primitives; Modal used as overlay.
 * `<kbd>` element replaced with a styled View/Text. SHORTCUTS array is
 * defined inline (no import from useKeyboardShortcuts, which is a no-op
 * on native). All CSS replaced with StyleSheet.create() using theme tokens.
 *
 * Requirements: N/A (informational modal, web-focused shortcuts)
 */

import React from 'react'
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { X, Keyboard } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

// ── Shortcuts data ────────────────────────────────────────────────────────────

interface ShortcutEntry {
  key: string
  description: string
}

const SHORTCUTS: ShortcutEntry[] = [
  { key: 'D', description: 'Go to Dashboard' },
  { key: 'T', description: 'Go to Today' },
  { key: 'W', description: 'Go to Week' },
  { key: 'C', description: 'Go to Calendar' },
  { key: 'N', description: 'New task' },
  { key: 'P', description: 'Start Pomodoro (Today)' },
  { key: 'Ctrl+/', description: 'Search all tasks' },
  { key: '?', description: 'Show shortcuts' },
  { key: 'Ctrl+Z', description: 'Undo' },
  { key: 'Ctrl+Y', description: 'Redo' },
  { key: 'Esc', description: 'Close modal' },
]

// ── Kbd chip component ────────────────────────────────────────────────────────

function KbdChip({ label, tokens }: { label: string; tokens: ReturnType<typeof useTheme>['tokens'] }) {
  return (
    <View style={[kbdStyles.chip, { backgroundColor: tokens.bgInput, borderColor: tokens.borderSecondary }]}>
      <Text style={[kbdStyles.text, { color: tokens.textPrimary }]}>{label}</Text>
    </View>
  )
}

const kbdStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
})

// ── Component ─────────────────────────────────────────────────────────────────

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.panel, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}
          onPress={e => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Keyboard size={20} color={tokens.textPrimary} />
              <Text style={[styles.title, { color: tokens.textPrimary }]}>Keyboard Shortcuts</Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Close">
              <X size={20} color={tokens.textMuted} />
            </Pressable>
          </View>

          {/* Shortcuts list */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            <View style={{ gap: 8 }}>
              {SHORTCUTS.map(({ key, description }) => (
                <View
                  key={key}
                  style={[styles.shortcutRow, { backgroundColor: tokens.bgInput }]}
                >
                  <Text style={[styles.shortcutDesc, { color: tokens.textSecondary }]}>
                    {description}
                  </Text>
                  <KbdChip label={key} tokens={tokens} />
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Footer hint */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: tokens.textMuted }]}>
              Press{' '}
            </Text>
            <KbdChip label="?" tokens={tokens} />
            <Text style={[styles.footerText, { color: tokens.textMuted }]}>
              {' '}anytime to show this help
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Styles factory ────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    panel: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      gap: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
    },
    shortcutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    shortcutDesc: {
      fontSize: 14,
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    footerText: {
      fontSize: 12,
    },
  })
}
