/**
 * ArchiveManager.tsx — archived task list with restore and delete.
 *
 * Migrated from frontend/src/components/ArchiveManager.jsx.
 * All HTML elements replaced with RN primitives; modal-overlay div replaced
 * with React Native Modal; position:absolute search icon removed — inline
 * layout used instead. All CSS replaced with StyleSheet.create() using
 * theme tokens.
 *
 * Requirements: 19.5
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native'
import {
  Archive,
  RotateCcw,
  Trash2,
  Calendar,
  Clock,
  Search,
  X,
} from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { fmtDuration } from '@/src/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ArchivedTask {
  id: string
  title: string
  topic: string
  duration: number
  date: string
  archivedAt?: string
}

export interface ArchiveManagerProps {
  isOpen: boolean
  onClose: () => void
  archivedTasks: ArchivedTask[]
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  onArchiveOld: (daysOld: number) => void
  getTopicColor: (topic: string) => string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ArchiveManager({
  isOpen,
  onClose,
  archivedTasks,
  onRestore,
  onDelete,
  onArchiveOld,
  getTopicColor,
}: ArchiveManagerProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)

  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filteredTasks = archivedTasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.topic.toLowerCase().includes(search.toLowerCase()),
  )

  const renderItem = ({ item: task }: ListRenderItemInfo<ArchivedTask>) => {
    const topicColor = getTopicColor(task.topic)
    const isConfirming = confirmDelete === task.id

    return (
      <View style={[styles.taskCard, { backgroundColor: tokens.bgInput, borderLeftColor: topicColor }]}>
        <View style={styles.taskHeader}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.taskTitle, { color: tokens.textPrimary }]} numberOfLines={2}>
              {task.title}
            </Text>
            <View style={styles.taskMeta}>
              <View style={styles.metaItem}>
                <View style={[styles.topicDot, { backgroundColor: topicColor }]} />
                <Text style={[styles.metaText, { color: tokens.textMuted }]}>{task.topic}</Text>
              </View>
              <View style={styles.metaItem}>
                <Calendar size={12} color={tokens.textMuted} />
                <Text style={[styles.metaText, { color: tokens.textMuted }]}>{formatDate(task.date)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Clock size={12} color={tokens.textMuted} />
                <Text style={[styles.metaText, { color: tokens.textMuted }]}>{fmtDuration(task.duration)}</Text>
              </View>
              {!!task.archivedAt && (
                <Text style={[styles.metaText, { color: tokens.textMuted }]}>
                  Archived {formatDate(task.archivedAt)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.actionBtns}>
            <Pressable
              onPress={() => onRestore(task.id)}
              style={styles.iconBtn}
              accessibilityLabel="Restore task"
              accessibilityRole="button"
            >
              <RotateCcw size={16} color={tokens.accentGreen} />
            </Pressable>
            <Pressable
              onPress={() => setConfirmDelete(task.id)}
              style={styles.iconBtn}
              accessibilityLabel="Delete task permanently"
              accessibilityRole="button"
            >
              <Trash2 size={16} color={tokens.accentRed} />
            </Pressable>
          </View>
        </View>

        {/* Delete confirmation inline */}
        {isConfirming && (
          <View style={[styles.confirmRow, { backgroundColor: `${tokens.accentRed}1A` }]}>
            <Text style={[styles.confirmText, { color: tokens.accentRed }]}>Delete permanently?</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => setConfirmDelete(null)}
                style={[styles.confirmBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }]}
              >
                <Text style={{ fontSize: 12, color: tokens.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { onDelete(task.id); setConfirmDelete(null) }}
                style={[styles.confirmBtn, { backgroundColor: tokens.accentRed, borderColor: tokens.accentRed }]}
                accessibilityRole="button"
                accessibilityLabel="Confirm delete"
              >
                <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    )
  }

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.panel, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]} onPress={e => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.panelHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Archive size={20} color={tokens.accentBlue} />
              <Text style={[styles.panelTitle, { color: tokens.textPrimary }]}>
                Archived Tasks
              </Text>
              <Text style={[styles.countLabel, { color: tokens.textMuted }]}>
                ({archivedTasks.length})
              </Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Close archive manager">
              <X size={20} color={tokens.textMuted} />
            </Pressable>
          </View>

          {/* Auto-archive banner */}
          <View style={[styles.autoArchiveBanner, { backgroundColor: tokens.bgInput }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.autoArchiveTitle, { color: tokens.textPrimary }]}>Auto-Archive</Text>
              <Text style={[styles.autoArchiveDesc, { color: tokens.textMuted }]}>
                Archive completed tasks older than 7 days
              </Text>
            </View>
            <Pressable
              onPress={() => onArchiveOld(7)}
              style={[styles.autoArchiveBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgSecondary }]}
              accessibilityRole="button"
              accessibilityLabel="Archive old completed tasks"
            >
              <Archive size={14} color={tokens.textSecondary} />
              <Text style={{ fontSize: 13, color: tokens.textSecondary }}>Archive Old</Text>
            </Pressable>
          </View>

          {/* Search */}
          {archivedTasks.length > 0 && (
            <View style={[styles.searchRow, { backgroundColor: tokens.bgInput, borderColor: tokens.borderPrimary }]}>
              <Search size={16} color={tokens.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search archived tasks..."
                placeholderTextColor={tokens.textMuted}
                style={[styles.searchInput, { color: tokens.textPrimary }]}
                accessible
                accessibilityLabel="Search archived tasks"
              />
              {!!search && (
                <Pressable onPress={() => setSearch('')} accessibilityLabel="Clear search">
                  <X size={14} color={tokens.textMuted} />
                </Pressable>
              )}
            </View>
          )}

          {/* Task list */}
          {filteredTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Archive size={40} color={tokens.textMuted} strokeWidth={1.5} />
              <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
                {archivedTasks.length === 0
                  ? 'No archived tasks yet'
                  : 'No tasks match your search'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredTasks}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              style={styles.taskList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            />
          )}

          {/* Close button */}
          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }]}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={{ fontSize: 14, color: tokens.textSecondary, fontWeight: '500' }}>Close</Text>
          </Pressable>
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
      justifyContent: 'flex-end',
    },
    panel: {
      borderRadius: 20,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingTop: 16,
      maxHeight: '80%',
      borderWidth: 1,
      borderBottomWidth: 0,
      gap: 12,
    },
    panelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    panelTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    countLabel: {
      fontSize: 13,
      fontWeight: '400',
    },
    autoArchiveBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 10,
    },
    autoArchiveTitle: {
      fontSize: 13,
      marginBottom: 2,
    },
    autoArchiveDesc: {
      fontSize: 12,
    },
    autoArchiveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      paddingVertical: 0,
    },
    taskList: {
      flex: 1,
    },
    taskCard: {
      borderRadius: 10,
      padding: 14,
      borderLeftWidth: 3,
    },
    taskHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    taskTitle: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 6,
    },
    taskMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    topicDot: {
      width: 8,
      height: 8,
      borderRadius: 2,
    },
    metaText: {
      fontSize: 12,
    },
    actionBtns: {
      flexDirection: 'row',
      gap: 6,
    },
    iconBtn: {
      padding: 8,
      borderRadius: 8,
    },
    confirmRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
    },
    confirmText: {
      fontSize: 13,
    },
    confirmBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
    },
    closeBtn: {
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
  })
}
