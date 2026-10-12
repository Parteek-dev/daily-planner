/**
 * OverdueRolloverModal.tsx
 *
 * Bottom-sheet modal showing overdue tasks from previous days.
 * Uses React Native Modal with slide animation.
 *
 * Business logic is identical to the original implementation.
 * Requirements: 8.7, 8.8
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native'
import {
  X,
  CalendarClock,
  CheckSquare,
  Square,
  MoveRight,
} from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { fmtDuration } from '@/src/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OverdueTask {
  id: string
  title: string
  topic: string
  duration: number
  date: string
}

export interface OverdueRolloverModalProps {
  tasks: OverdueTask[]
  onMoveSelected: (ids: string[]) => void
  onDismiss: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OverdueRolloverModal({
  tasks,
  onMoveSelected,
  onDismiss,
}: OverdueRolloverModalProps) {
  const { tokens } = useTheme()

  const [selected, setSelected] = useState<Set<string>>(
    new Set(tasks.map(t => t.id)),
  )

  if (!tasks.length) return null

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === tasks.length) setSelected(new Set())
    else setSelected(new Set(tasks.map(t => t.id)))
  }

  const handleMove = () => {
    if (selected.size > 0) onMoveSelected(Array.from(selected))
  }

  // Group by date, most recent first
  const byDate: Record<string, OverdueTask[]> = {}
  tasks.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = []
    byDate[t.date].push(t)
  })
  const sortedDates = Object.keys(byDate).sort().reverse()

  const allSelected = selected.size === tasks.length

  // ── Shared inner content ────────────────────────────────────────────────────

  const innerContent = (
    <>
      {/* Header */}
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <CalendarClock size={20} color={tokens.accentOrange} />
          <Text style={[s.headerTitle, { color: tokens.textPrimary }]}>
            Unfinished tasks from the past
          </Text>
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={18} color={tokens.textMuted} />
        </Pressable>
      </View>

      {/* Subtitle */}
      <Text style={[s.subtitle, { color: tokens.textSecondary }]}>
        You have{' '}
        <Text style={{ fontWeight: '700', color: tokens.accentOrange }}>
          {tasks.length} incomplete {tasks.length === 1 ? 'task' : 'tasks'}
        </Text>
        {' '}from previous days. Move selected ones to today or dismiss.
      </Text>

      {/* Select all */}
      <Pressable
        onPress={toggleAll}
        style={s.selectAll}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: allSelected }}
      >
        {allSelected
          ? <CheckSquare size={14} color={tokens.accentBlue} />
          : <Square size={14} color={tokens.textMuted} />}
        <Text style={[s.selectAllText, { color: tokens.textMuted }]}>
          {allSelected ? 'Deselect all' : 'Select all'}
        </Text>
      </Pressable>

      {/* Task list */}
      <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
        {sortedDates.map(date => (
          <View key={date} style={s.dateGroup}>
            <Text style={[s.dateLabel, { color: tokens.textMuted }]}>
              {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'short', day: 'numeric',
              })}
            </Text>

            {byDate[date].map(task => {
              const isSelected = selected.has(task.id)
              return (
                <Pressable
                  key={task.id}
                  onPress={() => toggle(task.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={task.title}
                  style={[
                    s.taskRow,
                    {
                      backgroundColor: isSelected
                        ? `${tokens.accentBlue}10`
                        : tokens.bgInput,
                      borderColor: isSelected
                        ? `${tokens.accentBlue}40`
                        : tokens.borderPrimary,
                    },
                  ]}
                >
                  {isSelected
                    ? <CheckSquare size={16} color={tokens.accentBlue} />
                    : <Square size={16} color={tokens.textMuted} />}
                  <View style={s.taskContent}>
                    <Text
                      style={[s.taskTitle, { color: tokens.textPrimary }]}
                      numberOfLines={1}
                    >
                      {task.title}
                    </Text>
                    <Text style={[s.taskMeta, { color: tokens.textMuted }]}>
                      {task.topic} · {fmtDuration(task.duration)}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        ))}
      </ScrollView>

      {/* Actions */}
      <View style={s.actions}>
        <Pressable
          onPress={onDismiss}
          style={[s.dismissBtn, { borderColor: tokens.borderPrimary }]}
          accessibilityRole="button"
          accessibilityLabel="Dismiss for today"
        >
          <Text style={[s.dismissText, { color: tokens.textMuted }]}>
            Dismiss for today
          </Text>
        </Pressable>

        <Pressable
          onPress={handleMove}
          disabled={selected.size === 0}
          style={[
            s.moveBtn,
            { backgroundColor: tokens.accentBlue, opacity: selected.size === 0 ? 0.4 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Move ${selected.size} tasks to today`}
        >
          <MoveRight size={14} color="#fff" />
          <Text style={s.moveBtnText}>
            Move {selected.size > 0 ? selected.size : ''} to today
          </Text>
        </Pressable>
      </View>
    </>
  )

  // ── Centered dialog — all platforms ────────────────────────────────────────

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        {/* Backdrop tap target */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Close" />

        {/* Dialog */}
        <View
          style={[
            s.dialog,
            {
              backgroundColor: tokens.bgSecondary,
              borderColor: tokens.borderPrimary,
            },
          ]}
        >
          {innerContent}
        </View>
      </View>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Overlay + dialog (all platforms) ────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    zIndex: 1,
    ...Platform.select({
      web: { boxShadow: '0 20px 48px rgba(0,0,0,0.18)' } as any,
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  taskContent: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  taskMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  dismissBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  dismissText: {
    fontSize: 13,
  },
  moveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  moveBtnText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
})
