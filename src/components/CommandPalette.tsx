/**
 * CommandPalette.tsx — spotlight-style task search overlay.
 *
 * Appearance matches the original web app:
 * - Centered card near the top of the screen
 * - Search input with Esc badge
 * - Empty state: "Search across all tasks, topics and notes" + keyboard hints
 * - Results appear inline below the input as the user types
 *
 * Requirements: 8.1
 */

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
  useWindowDimensions,
  type ListRenderItemInfo,
} from 'react-native'
import {
  Search,
  CheckCircle2,
  Circle,
  ArrowRight,
  Clock,
} from 'lucide-react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '@/src/hooks/useTheme'
import { fmtDuration } from '@/src/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CommandPaletteTask {
  id: string
  title: string
  topic: string
  description?: string
  note?: string
  completed: boolean
  date: string
  duration: number
}

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  tasks: CommandPaletteTask[]
  getTopicColor: (topic: string) => string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDateLabel(dateStr: string): string {
  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  if (dateStr === todayStr) return 'Today'
  if (dateStr === tomorrowStr) return 'Tomorrow'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

// ── Keyboard hint chip ────────────────────────────────────────────────────────

function KbdChip({ label, tokens }: { label: string; tokens: ReturnType<typeof useTheme>['tokens'] }) {
  return (
    <View style={[kbdStyles.chip, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
      <Text style={[kbdStyles.text, { color: tokens.textSecondary }]}>{label}</Text>
    </View>
  )
}
const kbdStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
})

// ── Component ─────────────────────────────────────────────────────────────────

export default function CommandPalette({
  isOpen,
  onClose,
  tasks,
  getTopicColor,
}: Readonly<CommandPaletteProps>) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  const router = useRouter()
  const { width } = useWindowDimensions()
  // Keyboard hints only make sense on desktop — hide on narrow mobile web
  const isDesktop = Platform.OS === 'web' && width > 768

  const [query, setQuery] = useState('')
  const inputRef = useRef<TextInput>(null)

  // Reset + focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [isOpen])

  // Web: close on Escape key
  useEffect(() => {
    if (!isOpen || Platform.OS !== 'web') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return tasks
      .filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.topic.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q)) ||
        (t.note?.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        return b.date.localeCompare(a.date)
      })
      .slice(0, 10)
  }, [query, tasks])

  const handleSelect = async (task: CommandPaletteTask) => {
    const todayStr = new Date().toISOString().split('T')[0]
    if (task.date === todayStr) {
      router.push('/(tabs)/today')
    } else {
      await AsyncStorage.setItem('calendar_jump_date', task.date)
      router.push('/(tabs)/calendar')
    }
    onClose()
  }

  const renderItem = ({ item: task }: ListRenderItemInfo<CommandPaletteTask>) => {
    const topicColor = getTopicColor(task.topic)
    const dateLabel = getDateLabel(task.date)
    return (
      <Pressable
        onPress={() => handleSelect(task)}
        style={({ pressed }) => [
          styles.resultRow,
          { backgroundColor: pressed ? tokens.bgInput : 'transparent' },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${task.title}, ${dateLabel}`}
      >
        {/* Status icon */}
        {task.completed
          ? <CheckCircle2 size={15} color={tokens.accentGreen} />
          : <Circle size={15} color={tokens.textMuted} />}

        {/* Task title */}
        <Text
          style={[
            styles.resultTitle,
            {
              color: task.completed ? tokens.textMuted : tokens.textPrimary,
              textDecorationLine: task.completed ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={1}
        >
          {task.title}
        </Text>

        {/* Right side: topic + date */}
        <View style={styles.resultMeta}>
          <View style={[styles.topicChip, { backgroundColor: `${topicColor}18` }]}>
            <Text style={[styles.topicText, { color: topicColor }]}>{task.topic}</Text>
          </View>
          <Text style={[styles.dateText, { color: tokens.textMuted }]}>{dateLabel}</Text>
        </View>
      </Pressable>
    )
  }

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Full-screen dismiss area + card */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Spotlight card — stop propagation so tapping card doesn't close */}
        <Pressable
          style={[styles.cardWrapper, { pointerEvents: 'box-none' } as any]}
          onPress={e => e.stopPropagation()}
        >
          <View style={[styles.card, { backgroundColor: tokens.bgPrimary }]}>

            {/* ── Search input row ── */}
            <View style={[styles.inputRow, { borderBottomColor: results.length > 0 ? tokens.borderPrimary : 'transparent' }]}>
              <Search size={18} color={tokens.textMuted} />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Search tasks, topics, notes..."
                placeholderTextColor={tokens.textMuted}
                style={[styles.input, { color: tokens.textPrimary }]}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Search tasks"
              />
              {/* Esc badge — desktop only (no hardware Esc key on mobile) */}
              {isDesktop && (
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close search"
                >
                  <KbdChip label="Esc" tokens={tokens} />
                </Pressable>
              )}
            </View>

            {/* ── Results ── */}
            {query.trim() ? (
              results.length === 0 ? (
                <View style={styles.emptyResults}>
                  <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
                    No results for "{query}"
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={results}
                  keyExtractor={t => t.id}
                  renderItem={renderItem}
                  style={styles.resultsList}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  ItemSeparatorComponent={() => (
                    <View style={[styles.separator, { backgroundColor: tokens.borderPrimary }]} />
                  )}
                />
              )
            ) : (
              /* ── Empty state with keyboard hints ── */
              <View style={styles.hints}>
                <Text style={[styles.hintsTitle, { color: tokens.textMuted }]}>
                  Search across all tasks, topics and notes
                </Text>
                {isDesktop && (
                  <View style={styles.hintRow}>
                    <View style={styles.hintItem}>
                      <KbdChip label="↑↓" tokens={tokens} />
                      <Text style={[styles.hintLabel, { color: tokens.textMuted }]}>navigate</Text>
                    </View>
                    <View style={styles.hintItem}>
                      <KbdChip label="Enter" tokens={tokens} />
                      <Text style={[styles.hintLabel, { color: tokens.textMuted }]}>open</Text>
                    </View>
                    <View style={styles.hintItem}>
                      <KbdChip label="Esc" tokens={tokens} />
                      <Text style={[styles.hintLabel, { color: tokens.textMuted }]}>close</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    cardWrapper: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: '12%' as any,
      paddingHorizontal: 20,
    },
    card: {
      width: '100%',
      maxWidth: 560,
      borderRadius: 16,
      overflow: 'hidden',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24 },
        android: { elevation: 16 },
        web: { boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
      }),
    },
    // ── Input row ──
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderBottomWidth: 1,
    },
    input: {
      flex: 1,
      fontSize: 16,
      paddingVertical: 0,
      // Remove browser default focus ring on web
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    // ── Results ──
    resultsList: {
      maxHeight: 360,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    resultTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
    },
    resultMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    topicChip: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    topicText: {
      fontSize: 11,
      fontWeight: '600',
    },
    dateText: {
      fontSize: 12,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 44,
    },
    emptyResults: {
      paddingVertical: 24,
      paddingHorizontal: 18,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
    },
    // ── Hints ──
    hints: {
      paddingVertical: 24,
      paddingHorizontal: 18,
      alignItems: 'center',
      gap: 14,
    },
    hintsTitle: {
      fontSize: 14,
      textAlign: 'center',
    },
    hintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    hintItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    hintLabel: {
      fontSize: 12,
    },
  })
}
