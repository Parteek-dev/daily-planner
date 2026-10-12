/**
 * QuickAdd.tsx — natural language quick-add bar for tasks.
 *
 * Migrated from frontend/src/components/QuickAdd.jsx.
 * All HTML elements replaced with RN primitives; portal / DOM click listeners
 * removed; DatePickerField / TimePickerField / DurationField sub-components
 * referenced from their RN equivalents in this package.
 * sessionStorage removed; all CSS replaced with StyleSheet.create()
 * using theme tokens.
 *
 * Requirements: 8.3
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native'
import {
  Zap,
  Plus,
  Tag,
  Flag,
  AlertTriangle,
  Mic,
} from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuickAddTopic {
  name: string
  color: string
}

export interface QuickAddTaskData {
  title: string
  description: string
  topic: string
  duration: number
  date: string
  dueTime: string | null
  priority: 'high' | 'medium' | 'low' | null
  subtasks: []
  recurrence: 'none'
}

export interface QuickAddProps {
  onAdd: (task: QuickAddTaskData) => void
  topics: QuickAddTopic[]
  getTopicColor: (topic: string) => string
  tasks?: Array<{ id: string; title: string; date: string }>
  onVoiceInput?: () => void
}

// ── Natural-language parser ───────────────────────────────────────────────────

interface ParsedInput {
  title: string
  duration: number
  date: string
  dueTime: string | null
  topic: string | null
  priority: 'high' | 'medium' | 'low' | null
}

function getNextDayOfWeek(dayOfWeek: number): string {
  const today = new Date()
  const currentDay = today.getDay()
  let daysUntil = dayOfWeek - currentDay
  if (daysUntil <= 0) daysUntil += 7
  const target = new Date(today)
  target.setDate(target.getDate() + daysUntil)
  return target.toISOString().split('T')[0]
}

function parseQuickInput(input: string, topics: QuickAddTopic[]): ParsedInput {
  const result: ParsedInput = {
    title: '',
    duration: 30,
    date: new Date().toISOString().split('T')[0],
    dueTime: null,
    topic: null,
    priority: null,
  }

  let text = input.trim()

  // Extract topic with #hashtag
  const topicMatch = text.match(/#(\w+)/i)
  if (topicMatch) {
    const tagName = topicMatch[1].toLowerCase()
    const matched = topics.find(t => t.name.toLowerCase() === tagName)
    if (matched) {
      result.topic = matched.name
    } else {
      const partial = topics.find(t => t.name.toLowerCase().startsWith(tagName))
      if (partial) result.topic = partial.name
    }
    text = text.replace(/#\w+/g, '').trim()
  }

  // Extract priority
  const priorityMatch = text.match(/!(high|medium|low|1|2|3)/i)
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase()
    if (p === 'high' || p === '1') result.priority = 'high'
    else if (p === 'medium' || p === '2') result.priority = 'medium'
    else if (p === 'low' || p === '3') result.priority = 'low'
    text = text.replace(/!(high|medium|low|1|2|3)/gi, '').trim()
  }

  // Extract duration
  const durationPatterns = [
    /for\s+(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minutes?)/i,
    /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minutes?)\b/i,
  ]
  for (const pattern of durationPatterns) {
    const match = text.match(pattern)
    if (match) {
      const value = parseFloat(match[1])
      const unit = match[2].toLowerCase()
      result.duration = unit.startsWith('h') ? Math.round(value * 60) : Math.round(value)
      text = text.replace(pattern, '').trim()
      break
    }
  }

  // Extract time
  const timePatterns = [
    /(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
    /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
  ]
  for (const pattern of timePatterns) {
    const match = text.match(pattern)
    if (match) {
      let hours = parseInt(match[1], 10)
      const minutes = parseInt(match[2] ?? '0', 10)
      const period = match[3]?.toLowerCase()
      if (period === 'pm' && hours < 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0
      result.dueTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      text = text.replace(pattern, '').trim()
      break
    }
  }

  // Extract date
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const datePatterns: Array<{ pattern: RegExp; getDate: (m: RegExpMatchArray) => string }> = [
    { pattern: /\btoday\b/i, getDate: () => todayStr },
    {
      pattern: /\btomorrow\b/i, getDate: () => {
        const d = new Date(today); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]
      },
    },
    {
      pattern: /\bnext\s+week\b/i, getDate: () => {
        const d = new Date(today); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]
      },
    },
    { pattern: /\b(monday|mon)\b/i, getDate: () => getNextDayOfWeek(1) },
    { pattern: /\b(tuesday|tue)\b/i, getDate: () => getNextDayOfWeek(2) },
    { pattern: /\b(wednesday|wed)\b/i, getDate: () => getNextDayOfWeek(3) },
    { pattern: /\b(thursday|thu)\b/i, getDate: () => getNextDayOfWeek(4) },
    { pattern: /\b(friday|fri)\b/i, getDate: () => getNextDayOfWeek(5) },
    { pattern: /\b(saturday|sat)\b/i, getDate: () => getNextDayOfWeek(6) },
    { pattern: /\b(sunday|sun)\b/i, getDate: () => getNextDayOfWeek(0) },
    {
      pattern: /\bin\s+(\d+)\s+days?\b/i, getDate: (m) => {
        const d = new Date(today); d.setDate(d.getDate() + parseInt(m[1], 10)); return d.toISOString().split('T')[0]
      },
    },
  ]

  for (const { pattern, getDate } of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      result.date = getDate(match)
      text = text.replace(pattern, '').trim()
      break
    }
  }

  result.title = text.replace(/\s+/g, ' ').trim()
  return result
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrowStr) return 'Tomorrow'
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(timeStr: string | null): string | null {
  if (!timeStr) return null
  const [hours, minutes] = timeStr.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#22c55e',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuickAdd({ onAdd, topics, getTopicColor, tasks = [], onVoiceInput }: QuickAddProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  const { width } = useWindowDimensions()
  const isMobile = !(Platform.OS === 'web' && width > 768)

  const [input, setInput] = useState('')
  const [preview, setPreview] = useState<ParsedInput | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [showDupWarning, setShowDupWarning] = useState(false)
  const [pendingTask, setPendingTask] = useState<QuickAddTaskData | null>(null)

  // Quick-select overrides
  const [dateOverride, setDateOverride] = useState<string | null>(null)
  const [timeOverride, setTimeOverride] = useState<string | null | undefined>(undefined)
  const [durationOverride, setDurationOverride] = useState<number | null>(null)

  // Parse input on change
  useEffect(() => {
    if (input.trim()) {
      setPreview(parseQuickInput(input, topics))
      setShowDupWarning(false)
      setPendingTask(null)
    } else {
      setPreview(null)
      setShowDupWarning(false)
    }
  }, [input, topics])

  const handleSubmit = () => {
    if (!preview?.title) return

    const resolvedDate = dateOverride ?? preview.date
    const resolvedTime = timeOverride !== undefined ? timeOverride : preview.dueTime
    const resolvedDuration = durationOverride ?? preview.duration

    const taskData: QuickAddTaskData = {
      title: preview.title,
      description: '',
      topic: preview.topic ?? topics[0]?.name ?? 'Personal',
      duration: resolvedDuration,
      date: resolvedDate,
      dueTime: resolvedTime,
      priority: preview.priority,
      subtasks: [],
      recurrence: 'none',
    }

    // Duplicate check
    const isDup = tasks.some(
      t => t.title.trim().toLowerCase() === taskData.title.toLowerCase() && t.date === taskData.date,
    )
    if (isDup && !showDupWarning) {
      setPendingTask(taskData)
      setShowDupWarning(true)
      return
    }

    commitTask(taskData)
  }

  const commitTask = (taskData: QuickAddTaskData) => {
    onAdd(taskData)
    setInput('')
    setPreview(null)
    setShowDupWarning(false)
    setPendingTask(null)
    setDateOverride(null)
    setTimeOverride(undefined)
    setDurationOverride(null)
  }

  const confirmAddAnyway = () => {
    if (pendingTask) commitTask(pendingTask)
  }

  const cancelDup = () => {
    setShowDupWarning(false)
    setPendingTask(null)
  }

  const resolvedDate = dateOverride ?? preview?.date
  const resolvedTime = timeOverride !== undefined ? timeOverride : preview?.dueTime
  const resolvedDuration = durationOverride ?? preview?.duration

  return (
    <View style={{ marginBottom: 20 }}>
      <View style={[styles.card, { borderColor: isFocused ? tokens.accentPrimary : tokens.borderPrimary, borderWidth: isFocused ? 2 : 1 }]}>
        {/* Input row */}
        <View style={styles.inputRow}>
          <Zap size={18} color={tokens.accentPrimary} />
          <TextInput
            value={input}
            onChangeText={setInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
            placeholder={isMobile ? 'Quick add: "Task tomorrow 2pm"' : 'Quick add: "Review docs tomorrow at 2pm for 30m #work"'}
            placeholderTextColor={tokens.textMuted}
            style={[styles.textInput, { color: tokens.textPrimary }]}
            accessible
            accessibilityLabel="Quick add task"
          />
          {/* Mic button */}
          {onVoiceInput && (
            <Pressable
              onPress={onVoiceInput}
              style={styles.micBtn}
              accessibilityLabel="Voice input"
              accessibilityRole="button"
            >
              <Mic size={16} color={tokens.textSecondary} />
            </Pressable>
          )}
          <Pressable
            onPress={handleSubmit}
            disabled={!preview?.title}
            style={[styles.addBtn, { opacity: preview?.title ? 1 : 0.4 }]}
            accessibilityLabel="Add task"
            accessibilityRole="button"
          >
            <Plus size={16} color={tokens.accentPrimary} />
          </Pressable>
        </View>

        {/* Preview row */}
        {preview?.title && (
          <View style={[styles.previewRow, { borderTopColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }]}>
            <Text style={[styles.previewTitle, { color: tokens.textPrimary }]} numberOfLines={1}>
              {preview.title}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {/* Topic chip */}
                {preview.topic && (
                  <View style={[styles.chip, { backgroundColor: `${getTopicColor(preview.topic)}20` }]}>
                    <Tag size={10} color={getTopicColor(preview.topic)} />
                    <Text style={{ fontSize: 11, color: getTopicColor(preview.topic) }}>{preview.topic}</Text>
                  </View>
                )}

                {/* Date chip */}
                {resolvedDate && (
                  <Pressable
                    onPress={() => {
                      const today = new Date().toISOString().split('T')[0]
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      const tomorrowStr = tomorrow.toISOString().split('T')[0]
                      if (resolvedDate === today) setDateOverride(tomorrowStr)
                      // For anything else, cycle back to today
                      else setDateOverride(today)
                    }}
                    style={[styles.chip, { backgroundColor: `${tokens.accentPrimary}20` }]}
                  >
                    <Text style={{ fontSize: 11, color: tokens.accentPrimary }}>{formatDate(resolvedDate)}</Text>
                  </Pressable>
                )}

                {/* Time chip */}
                {resolvedTime !== undefined && (
                  <Pressable
                    onPress={() => setTimeOverride(timeOverride ? null : '09:00')}
                    style={[styles.chip, { backgroundColor: `${tokens.accentPurple}20` }]}
                  >
                    <Text style={{ fontSize: 11, color: tokens.accentPurple }}>
                      {resolvedTime ? (formatTime(resolvedTime) ?? resolvedTime) : 'No time'}
                    </Text>
                  </Pressable>
                )}

                {/* Duration chip */}
                {resolvedDuration != null && (
                  <View style={[styles.chip, { backgroundColor: `${tokens.accentGreen}20` }]}>
                    <Text style={{ fontSize: 11, color: tokens.accentGreen }}>
                      {resolvedDuration < 60 ? `${resolvedDuration}m` : `${Math.floor(resolvedDuration / 60)}h${resolvedDuration % 60 > 0 ? ` ${resolvedDuration % 60}m` : ''}`}
                    </Text>
                  </View>
                )}

                {/* Priority chip */}
                {preview.priority && (
                  <View style={[styles.chip, { backgroundColor: `${PRIORITY_COLORS[preview.priority]}20` }]}>
                    <Flag size={10} color={PRIORITY_COLORS[preview.priority]} />
                    <Text style={{ fontSize: 11, color: PRIORITY_COLORS[preview.priority] }}>{preview.priority}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Duplicate warning */}
        {showDupWarning && (
          <View style={[styles.dupWarning, { backgroundColor: 'rgba(249,115,22,0.08)', borderTopColor: 'rgba(249,115,22,0.3)' }]}>
            <View style={styles.dupWarningLeft}>
              <AlertTriangle size={12} color="#f97316" />
              <Text style={styles.dupWarningText}>
                "{pendingTask?.title}" already exists on this date.
              </Text>
            </View>
            <View style={styles.dupActions}>
              <Pressable onPress={cancelDup} style={[styles.dupBtn, { borderColor: tokens.borderPrimary }]}>
                <Text style={{ fontSize: 12, color: tokens.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmAddAnyway} style={[styles.dupBtn, { borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.15)' }]}>
                <Text style={{ fontSize: 12, color: '#f97316', fontWeight: '600' }}>Add anyway</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Help text */}
      {isFocused && !input && (
        <Text style={[styles.helpText, { color: tokens.textMuted }]}>
          Tips: use #topic, !high for priority, "at 2pm" for time, "30m" for duration, "tomorrow" for date
        </Text>
      )}
    </View>
  )
}

// ── Styles factory ────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    card: {
      backgroundColor: tokens.bgSecondary,
      borderRadius: 16,
      overflow: 'hidden',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      paddingHorizontal: 16,
    },
    textInput: {
      flex: 1,
      fontSize: 14,
      paddingVertical: 0,
      minWidth: 0,
      // Suppress browser default focus ring on web — the card border handles focus state
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    addBtn: {
      padding: 8,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    micBtn: {
      padding: 8,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewRow: {
      padding: 10,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      gap: 8,
    },
    previewTitle: {
      fontSize: 14,
      fontWeight: '500',
      flexShrink: 1,
    },
    chipRow: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    dupWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 10,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      flexWrap: 'wrap',
      gap: 8,
    },
    dupWarningLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flex: 1,
    },
    dupWarningText: {
      fontSize: 12,
      color: '#f97316',
      fontWeight: '500',
      flex: 1,
    },
    dupActions: {
      flexDirection: 'row',
      gap: 8,
    },
    dupBtn: {
      fontSize: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
    },
    helpText: {
      fontSize: 11,
      marginTop: 8,
      paddingLeft: 4,
    },
  })
}
