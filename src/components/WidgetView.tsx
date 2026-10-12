/**
 * WidgetView.tsx — today's tasks as a bottom sheet (mobile) or floating panel (web).
 *
 * Migrated from frontend/src/components/WidgetView.jsx.
 * Desktop draggable panel: on mobile, replaced with a React Native Modal bottom
 * sheet (the more natural RN pattern). On web (Platform.OS === 'web'), a
 * fixed-position panel is rendered instead. window.innerWidth / mouse events
 * removed; all CSS replaced with StyleSheet.create() using theme tokens.
 *
 * Requirements: 8.1
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native'
import { X, CheckCircle2, Circle, Minimize2, Maximize2 } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WidgetTask {
  id: string
  title: string
  topic: string
  completed: boolean
  date: string
}

export interface WidgetViewProps {
  isOpen: boolean
  onClose: () => void
  tasks: WidgetTask[]
  onToggleComplete: (id: string) => void
  getTopicColor: (topic: string) => string
}

// ── TaskItem (internal) ───────────────────────────────────────────────────────

interface TaskItemProps {
  task: WidgetTask
  onToggle: (id: string) => void
  getTopicColor: (topic: string) => string
  tokens: ReturnType<typeof useTheme>['tokens']
}

function TaskItem({ task, onToggle, getTopicColor, tokens }: TaskItemProps) {
  return (
    <Pressable
      onPress={() => onToggle(task.id)}
      style={({ pressed }) => [
        styles.taskRow,
        pressed && { backgroundColor: tokens.bgInput },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.completed }}
      accessibilityLabel={task.title}
    >
      {task.completed
        ? <CheckCircle2 size={18} color={tokens.accentGreen} />
        : <Circle size={18} color={tokens.textMuted} />}

      <Text
        style={[
          styles.taskTitle,
          {
            color: task.completed ? tokens.textMuted : tokens.textPrimary,
            textDecorationLine: task.completed ? 'line-through' : 'none',
          },
        ]}
        numberOfLines={1}
      >
        {task.title}
      </Text>

      <View style={[styles.topicDot, { backgroundColor: getTopicColor(task.topic) }]} />
    </Pressable>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WidgetView({
  isOpen,
  onClose,
  tasks,
  onToggleComplete,
  getTopicColor,
}: WidgetViewProps) {
  const { tokens } = useTheme()
  const [isMinimized, setIsMinimized] = useState(false)

  if (!isOpen) return null

  const todayStr = new Date().toISOString().split('T')[0]
  const todayTasks = tasks.filter(t => t.date === todayStr)
  const completedCount = todayTasks.filter(t => t.completed).length
  const pendingTasks = todayTasks.filter(t => !t.completed)
  const completedTasks = todayTasks.filter(t => t.completed)
  const allDone = todayTasks.length > 0 && completedCount === todayTasks.length

  const badgeColor = allDone ? tokens.accentGreen : tokens.accentBlue

  const headerContent = (
    <View style={[styles.header, { backgroundColor: tokens.bgInput, borderBottomColor: tokens.borderPrimary }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>Today's Tasks</Text>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{completedCount}/{todayTasks.length}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <Pressable onPress={() => setIsMinimized(p => !p)} style={styles.iconBtn} accessibilityLabel={isMinimized ? 'Expand' : 'Minimize'}>
          {isMinimized ? <Maximize2 size={14} color={tokens.textMuted} /> : <Minimize2 size={14} color={tokens.textMuted} />}
        </Pressable>
        <Pressable onPress={onClose} style={styles.iconBtn} accessibilityLabel="Close widget">
          <X size={18} color={tokens.textMuted} />
        </Pressable>
      </View>
    </View>
  )

  const taskBody = (
    <>
      {todayTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: tokens.textMuted }]}>No tasks for today</Text>
        </View>
      ) : (
        <View style={styles.taskList}>
          {pendingTasks.map(task => (
            <TaskItem key={task.id} task={task} onToggle={onToggleComplete} getTopicColor={getTopicColor} tokens={tokens} />
          ))}
          {completedTasks.map(task => (
            <TaskItem key={task.id} task={task} onToggle={onToggleComplete} getTopicColor={getTopicColor} tokens={tokens} />
          ))}
        </View>
      )}
      {todayTasks.length > 0 && (
        <View style={[styles.progressTrack, { backgroundColor: tokens.bgInput }]}>
          <View style={[styles.progressFill, {
            width: `${(completedCount / todayTasks.length) * 100}%` as any,
            backgroundColor: allDone ? tokens.accentGreen : tokens.accentBlue,
          }]} />
        </View>
      )}
    </>
  )

  // Use a Modal bottom sheet on native; fixed panel on web
  if (Platform.OS === 'web') {
    // Web: fixed panel in bottom-right corner
    return (
      <View style={[styles.webPanel, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        {headerContent}
        {!isMinimized && (
          <ScrollView style={{ maxHeight: 400 }}>
            {taskBody}
          </ScrollView>
        )}
      </View>
    )
  }

  // Native: bottom sheet modal
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}
          onPress={e => e.stopPropagation()}
        >
          {/* Pull handle */}
          <View style={styles.handleWrapper}>
            <View style={[styles.handle, { backgroundColor: tokens.borderSecondary }]} />
          </View>

          {headerContent}

          <ScrollView style={{ flex: 1 }}>
            {taskBody}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Styles (module-level, no tokens needed) ───────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '80%',
  },
  handleWrapper: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  iconBtn: {
    padding: 6,
  },
  taskList: {
    padding: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  taskTitle: {
    flex: 1,
    fontSize: 13,
  },
  topicDot: {
    width: 6,
    height: 6,
    borderRadius: 2,
    flexShrink: 0,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  progressTrack: {
    height: 4,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  // Web only
  webPanel: {
    position: 'absolute' as any,
    bottom: 24,
    right: 24,
    width: 320,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    zIndex: 300,
  },
})
