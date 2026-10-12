/**
 * IcsImportPreview — ICS import review modal.
 *
 * Port of frontend/src/components/IcsImportPreview.jsx to React Native.
 * - Replaces HTML <select> topic mapper with a Pressable-based picker
 *   (FlatList-based dropdown sheet on native, HTML <select> on web).
 * - Uses React Native Modal instead of CSS modal-overlay.
 * - Renders task list in a FlatList for performance.
 *
 * Requirements: 15.4
 */

import React, { useMemo, useState } from 'react'
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckSquare,
  Clock,
  Flag,
  Repeat,
  Square,
  X,
} from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { fmtDuration } from '@/src/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IcsTask {
  title: string
  date: string
  dueTime?: string
  duration?: number
  priority?: 'high' | 'medium' | 'low'
  recurrence?: string
  topic?: string
  _uid?: string
  _isDuplicate?: boolean
  _isAllDay?: boolean
  _categories?: string
  [key: string]: unknown
}

export interface ParseResult {
  tasks: IcsTask[]
  calendarCategories?: string[]
  total?: number
  duplicates?: number
}

export interface IcsImportPreviewProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly parseResult: ParseResult | null
  readonly topics: Array<{ name: string; color?: string }>
  readonly onConfirm: (selectedTasks: IcsTask[]) => void
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#22c55e',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

// ── Topic picker (native) ─────────────────────────────────────────────────────

interface TopicPickerNativeProps {
  topics: Array<{ name: string }>
  value: string
  onChange: (v: string) => void
  tokens: ReturnType<typeof useTheme>['tokens']
}

function TopicPickerNative({ topics, value, onChange, tokens }: TopicPickerNativeProps) {
  const [open, setOpen] = useState(false)

  const btnStyles = StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: tokens.bgInput,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      borderRadius: 6,
      minWidth: 100,
    },
    triggerText: {
      fontSize: 12,
      color: tokens.textPrimary,
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: tokens.bgSecondary,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      maxHeight: 300,
    },
    sheetTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginBottom: 12,
    },
    option: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    optionText: {
      fontSize: 14,
      color: tokens.textPrimary,
    },
    optionSelected: {
      backgroundColor: `${tokens.accentBlue}20`,
    },
    optionTextSelected: {
      color: tokens.accentBlue,
      fontWeight: '600',
    },
  })

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={btnStyles.trigger}>
        <Text style={btnStyles.triggerText} numberOfLines={1}>{value}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={btnStyles.overlay}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close topic picker"
        >
          <Pressable onPress={() => { }} style={btnStyles.sheet}>
            <Text style={btnStyles.sheetTitle}>Select Topic</Text>
            <FlatList
              data={topics}
              keyExtractor={t => t.name}
              renderItem={({ item }) => {
                const active = item.name === value
                return (
                  <Pressable
                    onPress={() => { onChange(item.name); setOpen(false) }}
                    style={[btnStyles.option, active && btnStyles.optionSelected]}
                  >
                    <Text style={[btnStyles.optionText, active && btnStyles.optionTextSelected]}>
                      {item.name}
                    </Text>
                  </Pressable>
                )
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

// ── Topic picker (web) ────────────────────────────────────────────────────────

interface TopicPickerWebProps {
  topics: Array<{ name: string }>
  value: string
  onChange: (v: string) => void
  tokens: ReturnType<typeof useTheme>['tokens']
}

function TopicPickerWeb({ topics, value, onChange, tokens }: TopicPickerWebProps) {
  const selectStyle: React.CSSProperties = {
    width: 140,
    padding: '5px 8px',
    fontSize: 12,
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
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      style={selectStyle}
    >
      {topics.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
    </select>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IcsImportPreview({
  isOpen,
  onClose,
  parseResult,
  topics,
  onConfirm,
}: IcsImportPreviewProps) {
  const { tokens } = useTheme()

  const [selected, setSelected] = useState<Set<number>>(() =>
    new Set(parseResult?.tasks?.filter(t => !t._isDuplicate).map((_, i) => i) ?? [])
  )

  const [topicMap, setTopicMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    parseResult?.calendarCategories?.forEach(cat => {
      const match = topics.find(t => t.name.toLowerCase() === cat.toLowerCase())
      map[cat] = match?.name ?? topics[0]?.name ?? 'Personal'
    })
    return map
  })

  const tasks = parseResult?.tasks ?? []
  const dupCount = tasks.filter(t => t._isDuplicate).length
  const allDayCount = tasks.filter(t => t._isAllDay).length
  const selCount = selected.size

  const mappedTasks: IcsTask[] = useMemo(() =>
    tasks.map(t => ({
      ...t,
      topic: t._categories
        ? (topicMap[t._categories] ?? 'Personal')
        : 'Personal',
    })),
    [tasks, topicMap]
  )

  const toggleAll = () => {
    if (selected.size === tasks.length) setSelected(new Set())
    else setSelected(new Set(tasks.map((_, i) => i)))
  }

  const toggle = (i: number) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const handleConfirm = () => {
    const toImport = Array.from(selected).map(i => {
      const { _uid, _isAllDay, _isDuplicate, _categories, ...clean } = mappedTasks[i]
      return clean as IcsTask
    })
    onConfirm(toImport)
  }

  const styles = makeStyles(tokens)

  if (!isOpen || !parseResult) return null

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
        accessibilityLabel="Close import preview"
      >
        <Pressable onPress={() => { }} style={styles.modalContent}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Calendar size={18} color={tokens.accentBlue} />
              <Text style={styles.headerTitle}>Import from ICS</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={18} color={tokens.textMuted} />
            </Pressable>
          </View>

          {/* Summary line */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              Found <Text style={styles.bold}>{tasks.length}</Text> event
              {tasks.length !== 1 ? 's' : ''}
              {dupCount > 0
                ? <Text style={{ color: tokens.accentOrange }}>  · {dupCount} possible duplicate{dupCount !== 1 ? 's' : ''}</Text>
                : null}
              {allDayCount > 0
                ? <Text style={{ color: tokens.textMuted }}>  · {allDayCount} all-day</Text>
                : null}
            </Text>
          </View>

          {/* ── Category → Topic mapping ── */}
          {(parseResult.calendarCategories?.length ?? 0) > 0 && (
            <View style={styles.mappingBox}>
              <Text style={styles.mappingLabel}>Map categories → topics</Text>
              {parseResult.calendarCategories!.map(cat => (
                <View key={cat} style={styles.mappingRow}>
                  <Text style={styles.mappingCat} numberOfLines={1}>"{cat}"</Text>
                  <ArrowRight size={14} color={tokens.textMuted} />
                  {Platform.OS === 'web'
                    ? <TopicPickerWeb
                      topics={topics}
                      value={topicMap[cat] ?? 'Personal'}
                      onChange={v => setTopicMap(p => ({ ...p, [cat]: v }))}
                      tokens={tokens}
                    />
                    : <TopicPickerNative
                      topics={topics}
                      value={topicMap[cat] ?? 'Personal'}
                      onChange={v => setTopicMap(p => ({ ...p, [cat]: v }))}
                      tokens={tokens}
                    />
                  }
                </View>
              ))}
            </View>
          )}

          {/* ── Select-all row ── */}
          <View style={styles.selectAllRow}>
            <Pressable
              onPress={toggleAll}
              style={({ pressed }) => [styles.selectAllBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={selected.size === tasks.length ? 'Deselect all' : 'Select all'}
            >
              {selected.size === tasks.length
                ? <CheckSquare size={14} color={tokens.accentBlue} />
                : <Square size={14} color={tokens.textMuted} />
              }
              <Text style={styles.selectAllText}>
                {selected.size === tasks.length ? 'Deselect all' : 'Select all'}
              </Text>
            </Pressable>
            <Text style={styles.selCountText}>{selCount} of {tasks.length} selected</Text>
          </View>

          {/* ── Task list ── */}
          <FlatList
            data={mappedTasks}
            keyExtractor={(t, i) => t._uid ?? String(i)}
            style={styles.list}
            renderItem={({ item: task, index: i }) => {
              const isSelected = selected.has(i)
              const topicColor = topics.find(t => t.name === task.topic)?.color ?? tokens.accentBlue
              return (
                <Pressable
                  onPress={() => toggle(i)}
                  style={[
                    styles.taskRow,
                    {
                      backgroundColor: isSelected
                        ? `${tokens.accentBlue}0f`
                        : tokens.bgInput,
                      borderColor: task._isDuplicate
                        ? `${tokens.accentOrange}60`
                        : isSelected
                          ? `${tokens.accentBlue}50`
                          : tokens.borderPrimary,
                      opacity: isSelected ? 1 : 0.6,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={task.title}
                  accessibilityState={{ selected: isSelected }}
                >
                  {/* Checkbox */}
                  {isSelected
                    ? <CheckSquare size={15} color={tokens.accentBlue} />
                    : <Square size={15} color={tokens.textMuted} />
                  }

                  {/* Content */}
                  <View style={styles.taskContent}>
                    <View style={styles.taskTitleRow}>
                      <Text style={styles.taskTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                      {task._isDuplicate ? (
                        <View style={styles.dupBadge}>
                          <AlertTriangle size={9} color={tokens.accentOrange} />
                          <Text style={styles.dupText}>Duplicate</Text>
                        </View>
                      ) : null}
                      {task._isAllDay ? (
                        <Text style={styles.allDayBadge}>All-day</Text>
                      ) : null}
                    </View>

                    <View style={styles.taskMeta}>
                      <Text style={styles.metaText}>{formatDate(task.date)}</Text>
                      {task.dueTime ? (
                        <View style={styles.metaItem}>
                          <Clock size={9} color={tokens.accentOrange} />
                          <Text style={[styles.metaText, { color: tokens.accentOrange }]}>
                            {task.dueTime}
                          </Text>
                        </View>
                      ) : null}
                      {task.duration ? (
                        <Text style={styles.metaText}>{fmtDuration(task.duration)}</Text>
                      ) : null}
                      <View style={[styles.topicBadge, {
                        backgroundColor: `${topicColor}20`,
                      }]}>
                        <Text style={[styles.topicBadgeText, { color: topicColor }]}>
                          {task.topic}
                        </Text>
                      </View>
                      {task.priority ? (
                        <Flag size={10} color={PRIORITY_COLORS[task.priority]} />
                      ) : null}
                      {task.recurrence && task.recurrence !== 'none' ? (
                        <View style={styles.metaItem}>
                          <Repeat size={9} color={tokens.accentPurple} />
                          <Text style={[styles.metaText, { color: tokens.accentPurple }]}>
                            {task.recurrence}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              )
            }}
          />

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={selCount === 0}
              style={({ pressed }) => [
                styles.importBtn,
                selCount === 0 && { opacity: 0.5 },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Import ${selCount} events`}
            >
              <Text style={styles.importBtnText}>
                Import {selCount} event{selCount !== 1 ? 's' : ''} →
              </Text>
            </Pressable>
          </View>

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
      padding: 16,
    },
    modalContent: {
      backgroundColor: tokens.bgSecondary,
      borderRadius: 16,
      padding: 16,
      width: '100%',
      maxWidth: 600,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    closeBtn: {
      padding: 4,
    },
    summaryRow: {
      marginBottom: 12,
    },
    summaryText: {
      fontSize: 13,
      color: tokens.textSecondary,
    },
    bold: {
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    // ── mapping ──
    mappingBox: {
      backgroundColor: tokens.bgInput,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
      gap: 8,
    },
    mappingLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: tokens.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    mappingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    mappingCat: {
      flex: 1,
      fontSize: 13,
      color: tokens.textSecondary,
    },
    // ── select all ──
    selectAllRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    selectAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    selectAllText: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textMuted,
    },
    selCountText: {
      fontSize: 12,
      color: tokens.textMuted,
    },
    // ── list ──
    list: {
      maxHeight: 320,
      marginBottom: 12,
    },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 6,
    },
    taskContent: {
      flex: 1,
      gap: 4,
    },
    taskTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    taskTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    dupBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: `${tokens.accentOrange}18`,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    dupText: {
      fontSize: 10,
      fontWeight: '700',
      color: tokens.accentOrange,
    },
    allDayBadge: {
      fontSize: 10,
      color: tokens.textMuted,
      backgroundColor: tokens.bgSecondary,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    taskMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    metaText: {
      fontSize: 11,
      color: tokens.textMuted,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    topicBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    topicBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },
    // ── footer ──
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: tokens.borderPrimary,
      paddingTop: 12,
    },
    cancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: tokens.bgInput,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
    },
    cancelText: {
      fontSize: 13,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    importBtn: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: tokens.accentBlue,
    },
    importBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#ffffff',
    },
  })
}
