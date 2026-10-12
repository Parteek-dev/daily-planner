/**
 * DailyNotes.tsx — Collapsible daily journal notes.
 *
 * Clean, minimal design that expands inline when tapped.
 * Auto-saves as you type with debounced save.
 *
 * Requirements: 8.4, 8.5
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native'
import { PenLine, ChevronDown, ChevronUp, Check } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailyNotesProps {
  date: string
  note: string | null | undefined
  onSave: (date: string, text: string) => void
  /** If true, always show even when empty. If false, hide when not today and no note. Default: false */
  alwaysShow?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DailyNotes({ date, note, onSave, alwaysShow = false }: DailyNotesProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)

  const [isExpanded, setIsExpanded] = useState(false)
  const [text, setText] = useState(note ?? '')
  const [isSaved, setIsSaved] = useState(false)
  const inputRef = useRef<TextInput>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check if the date is today
  const today = new Date().toISOString().split('T')[0]
  const isToday = date === today
  const hasNote = !!(note?.trim())

  // Sync text when note or date changes externally
  useEffect(() => {
    setText(note ?? '')
  }, [note, date])

  // Auto-focus when expanding
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }, [isExpanded])

  // Debounced auto-save
  const handleTextChange = (newText: string) => {
    setText(newText)
    setIsSaved(false)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      onSave(date, newText)
      setIsSaved(true)
      // Hide saved indicator after 2 seconds
      setTimeout(() => setIsSaved(false), 2000)
    }, 800)
  }

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsExpanded(!isExpanded)
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  // Format the date for display
  const dateLabel = isToday
    ? 'today'
    : new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

  // Get preview text (first line or truncated)
  const previewText = hasNote
    ? note!.split('\n')[0].slice(0, 50) + (note!.length > 50 ? '...' : '')
    : null

  // Hide component if not today and no note (unless alwaysShow is true)
  // This must be AFTER all hooks to avoid "Rendered fewer hooks" error
  if (!alwaysShow && !isToday && !hasNote) {
    return null
  }

  return (
    <Pressable
      onPress={!isExpanded ? toggleExpanded : undefined}
      style={[
        styles.container,
        { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary },
        isExpanded && styles.containerExpanded,
      ]}
      accessibilityRole="button"
      accessibilityLabel={isExpanded ? 'Daily notes expanded' : 'Expand daily notes'}
    >
      {/* Collapsed view */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, { backgroundColor: `${tokens.accentPurple}15` }]}>
            <PenLine size={14} color={tokens.accentPurple} />
          </View>
          {isExpanded ? (
            <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
              {isToday ? "Today's Note" : `Note for ${dateLabel}`}
            </Text>
          ) : hasNote ? (
            <Text style={[styles.previewText, { color: tokens.textSecondary }]} numberOfLines={1}>
              {previewText}
            </Text>
          ) : (
            <Text style={[styles.placeholderText, { color: tokens.textMuted }]}>
              {isToday ? 'Add a note for today...' : `Add a note for ${dateLabel}...`}
            </Text>
          )}
        </View>

        <View style={styles.headerRight}>
          {isSaved && (
            <View style={styles.savedIndicator}>
              <Check size={12} color={tokens.accentGreen} />
              <Text style={[styles.savedText, { color: tokens.accentGreen }]}>Saved</Text>
            </View>
          )}
          <Pressable
            onPress={toggleExpanded}
            style={styles.expandBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp size={18} color={tokens.textMuted} />
            ) : (
              <ChevronDown size={18} color={tokens.textMuted} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Expanded view */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={handleTextChange}
            placeholder="What's on your mind today? Jot down thoughts, reflections, or wins..."
            placeholderTextColor={tokens.textMuted}
            multiline
            style={[
              styles.textInput,
              {
                color: tokens.textPrimary,
                backgroundColor: tokens.bgInput,
                borderColor: tokens.borderPrimary,
              },
            ]}
            accessible
            accessibilityLabel="Daily notes input"
          />
          <View style={styles.footer}>
            <Text style={[styles.wordCount, { color: tokens.textMuted }]}>
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </Text>
            <Text style={[styles.autoSaveHint, { color: tokens.textMuted }]}>
              Auto-saves as you type
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  )
}

// ── Styles factory ────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    container: {
      borderRadius: 14,
      borderWidth: 1,
      marginTop: 20,
      overflow: 'hidden',
    },
    containerExpanded: {
      // Slightly different style when expanded
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      paddingHorizontal: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 0,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '600',
    },
    previewText: {
      fontSize: 14,
      flex: 1,
    },
    placeholderText: {
      fontSize: 14,
      fontStyle: 'italic',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    savedIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    savedText: {
      fontSize: 12,
      fontWeight: '500',
    },
    expandBtn: {
      padding: 4,
    },
    expandedContent: {
      paddingHorizontal: 16,
      paddingBottom: 14,
    },
    textInput: {
      minHeight: 100,
      maxHeight: 200,
      borderRadius: 10,
      borderWidth: 1,
      padding: 12,
      fontSize: 14,
      lineHeight: 22,
      textAlignVertical: 'top',
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      paddingHorizontal: 4,
    },
    wordCount: {
      fontSize: 11,
    },
    autoSaveHint: {
      fontSize: 11,
    },
  })
}
