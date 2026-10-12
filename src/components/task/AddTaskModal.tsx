/**
 * AddTaskModal.tsx — Floating modal for adding/editing tasks.
 *
 * Rendered at the layout level (like CommandPalette) to ensure
 * transparent backdrop properly shows the screen behind it.
 *
 * Requirements: 7.1–7.11
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
  Modal,
} from 'react-native'
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native'

import { useAuth } from '@/src/hooks/useAuth'
import { useProgress } from '@/src/hooks/useProgress'
import { useTheme } from '@/src/hooks/useTheme'
import { DatePickerField } from '@/src/components/DatePickerField'
import { TimePickerField } from '@/src/components/TimePickerField'
import { DurationField } from '@/src/components/DurationField'
import { SIDEBAR_BREAKPOINT } from '@/src/constants'
import type { Task } from '@/src/lib/firestoreMappers'
import type { Tokens } from '@/src/theme/tokens'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  editTaskId?: string | null
  initialDate?: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7',
  '#ef4444', '#14b8a6', '#f59e0b', '#ec4899',
]

const PRIORITY_OPTIONS = [
  { value: null, label: 'None', colorKey: 'neutral' as const },
  { value: 'low', label: 'Low', colorKey: 'accentBlue' as const },
  { value: 'medium', label: 'Medium', colorKey: 'accentOrange' as const },
  { value: 'high', label: 'High', colorKey: 'accentRed' as const },
] as const

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom days' },
] as const

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

type Priority = 'high' | 'medium' | 'low' | null
type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'custom'

interface SubtaskItem {
  id: string
  title: string
  completed: boolean
}

function getPriorityColor(
  colorKey: 'neutral' | 'accentBlue' | 'accentOrange' | 'accentRed',
  tokens: Tokens
): string {
  if (colorKey === 'neutral') return tokens.textMuted
  return tokens[colorKey]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddTaskModal({
  isOpen,
  onClose,
  editTaskId,
  initialDate,
}: AddTaskModalProps) {
  const { tokens } = useTheme()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
  const { width } = useWindowDimensions()
  const isMobile = !(Platform.OS === 'web' && width > SIDEBAR_BREAKPOINT)
  const { user } = useAuth()
  const {
    tasks,
    addTask,
    updateTask,
    topics,
    addTopic,
    deleteTopic,
  } = useProgress({ user })

  const editTask = editTaskId
    ? tasks.find(t => t.id === editTaskId) ?? null
    : null
  const isEdit = editTask !== null

  // ── Form state ────────────────────────────────────────────────────────────

  const [title, setTitle] = useState('')
  const [description, setDesc] = useState('')
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState<number | null>(30)
  const [date, setDate] = useState('')
  const [dueTime, setDueTime] = useState<string | null>(null)
  const [priority, setPriority] = useState<Priority>(null)
  const [dependsOn, setDependsOn] = useState<string[]>([])
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([])
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [customDays, setCustomDays] = useState<number[]>([])

  const [titleError, setTitleError] = useState(false)
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [newTopicColor, setNewTopicColor] = useState(PRESET_COLORS[0])
  const [showDepsPanel, setShowDepsPanel] = useState(false)
  const [newSubtask, setNewSubtask] = useState('')
  const [showDupWarning, setShowDupWarning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  const isDirty = useRef(false)
  const titleRef = useRef<TextInput>(null)

  // ── Reset form when modal opens/closes ────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      if (isEdit && editTask) {
        setTitle(editTask.title)
        setDesc(editTask.description ?? '')
        setTopic(editTask.topic)
        setDuration(editTask.duration)
        setDate(editTask.date)
        setDueTime(editTask.dueTime)
        setPriority(editTask.priority as Priority)
        setDependsOn(editTask.dependsOn ?? [])
        setSubtasks(editTask.subtasks ?? [])
        setRecurrence((editTask.recurrence as Recurrence) ?? 'none')
        setRecurrenceEndDate(editTask.recurrenceEndDate ?? '')
        setCustomDays(editTask.customRecurrenceDays ?? [])
        if ((editTask.dependsOn?.length ?? 0) > 0 ||
          (editTask.subtasks?.length ?? 0) > 0 ||
          (editTask.recurrence && editTask.recurrence !== 'none')) {
          setShowMoreOptions(true)
        }
      } else {
        setTitle('')
        setDesc('')
        setTopic(topics[0]?.name ?? 'Personal')
        setDuration(30)
        setDate(initialDate ?? new Date().toISOString().split('T')[0])
        setDueTime(null)
        setPriority(null)
        setDependsOn([])
        setSubtasks([])
        setRecurrence('none')
        setRecurrenceEndDate('')
        setCustomDays([])
        setShowMoreOptions(false)
      }
      setTitleError(false)
      setShowNewTopic(false)
      setShowDupWarning(false)
      isDirty.current = false
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [isOpen, editTask, isEdit, initialDate, topics])

  useEffect(() => {
    if (isOpen && !isEdit && !topic && topics.length > 0) {
      setTopic(topics[0].name)
    }
  }, [isOpen, topics, isEdit, topic])

  const markDirty = () => { isDirty.current = true }

  const depOptions = tasks.filter(t =>
    !t.completed && t.id !== editTask?.id
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    if (isDirty.current) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              isDirty.current = false
              onClose()
            },
          },
        ],
      )
    } else {
      onClose()
    }
  }, [onClose])

  const doSave = useCallback(async (trimmedTitle: string) => {
    if (saving) return
    setSaving(true)

    const payload = {
      title: trimmedTitle,
      description: description.trim(),
      topic: topic || 'Personal',
      duration: duration ?? 30,
      date,
      dueTime: dueTime || null,
      priority: priority || null,
      dependsOn,
      subtasks,
      recurrence,
      recurrenceEndDate: recurrenceEndDate || null,
      customRecurrenceDays: recurrence === 'custom' ? customDays : null,
    }

    try {
      if (isEdit && editTask) {
        await updateTask(editTask.id, payload as Partial<Task>)
      } else {
        await addTask(payload as any)
      }
      isDirty.current = false
      onClose()
    } catch (error) {
      console.error('[AddTaskModal] Save failed:', error)
    } finally {
      setSaving(false)
    }
  }, [saving, description, topic, duration, date, dueTime, priority, dependsOn, subtasks, recurrence, recurrenceEndDate, customDays, isEdit, editTask, addTask, updateTask, onClose])

  const handleSubmit = useCallback(() => {
    if (saving) return
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError(true)
      titleRef.current?.focus()
      return
    }
    const isDup = tasks.some(t =>
      t.title.trim().toLowerCase() === trimmed.toLowerCase() &&
      t.date === date &&
      t.id !== editTask?.id,
    )
    if (isDup && !showDupWarning) {
      setShowDupWarning(true)
      return
    }
    doSave(trimmed)
  }, [saving, title, date, tasks, editTask, showDupWarning, doSave])

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return
    setSubtasks(p => [...p, { id: Date.now().toString(), title: newSubtask.trim(), completed: false }])
    setNewSubtask('')
    markDirty()
  }

  const handleAddTopic = () => {
    if (!newTopicName.trim()) return
    addTopic(newTopicName.trim(), newTopicColor)
    setTopic(newTopicName.trim())
    setShowNewTopic(false)
    setNewTopicName('')
    markDirty()
  }

  const toggleDep = (id: string) => {
    setDependsOn(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
    markDirty()
  }

  const toggleCustomDay = (day: number) => {
    setCustomDays(p =>
      p.includes(day) ? p.filter(d => d !== day) : [...p, day].sort((a, b) => a - b)
    )
    markDirty()
  }

  if (!isOpen) return null

  // ── Form content ──────────────────────────────────────────────────────────

  const formContent = (
    <>
      {/* Card 1: Title + Description */}
      <View style={styles.card}>
        <View style={styles.cardField}>
          <Text style={[styles.label, titleError && { color: tokens.accentRed }]}>
            Task title {titleError ? '— required' : '*'}
          </Text>
          <TextInput
            ref={titleRef}
            value={title}
            onChangeText={v => {
              setTitle(v)
              if (v.trim()) setTitleError(false)
              setShowDupWarning(false)
              markDirty()
            }}
            placeholder="What do you need to do?"
            placeholderTextColor={tokens.textMuted}
            style={[
              styles.input,
              { borderColor: titleError ? tokens.accentRed : tokens.borderPrimary },
              Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
            ]}
            returnKeyType="next"
            maxLength={120}
          />
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.cardField}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={v => { setDesc(v); markDirty() }}
            placeholder="Add details..."
            placeholderTextColor={tokens.textMuted}
            multiline
            numberOfLines={2}
            style={[
              styles.input,
              styles.textarea,
              Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
            ]}
            maxLength={500}
          />
        </View>
      </View>

      {/* Card 2: Topic */}
      <View style={styles.card}>
        <View style={styles.cardField}>
          <Text style={styles.label}>Topic</Text>
          {!showNewTopic ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScrollContainer}
              contentContainerStyle={styles.chipScrollContent}
            >
              {topics.map(t => {
                const active = topic === t.name
                const topicColor = t.color || tokens.accentPrimary
                const isDefault = ['Learning', 'Work', 'Health', 'Personal'].includes(t.name)
                return (
                  <View key={t.name} style={styles.topicChipContainer}>
                    <Pressable
                      onPress={() => { setTopic(t.name); markDirty() }}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? topicColor : tokens.borderPrimary,
                          borderWidth: active ? 2 : 1,
                          backgroundColor: active ? `${topicColor}20` : tokens.bgInput,
                        },
                      ]}
                    >
                      <View style={[styles.colorDot, { backgroundColor: topicColor }]} />
                      <Text style={[styles.chipText, { color: active ? topicColor : tokens.textSecondary }]}>
                        {t.name}
                      </Text>
                    </Pressable>
                    {!isDefault && (
                      <Pressable
                        onPress={() => {
                          if (topic === t.name && topics.length > 1) {
                            const next = topics.find(tp => tp.name !== t.name)
                            if (next) setTopic(next.name)
                          }
                          deleteTopic(t.id)
                        }}
                        style={styles.topicDeleteBtn}
                        hitSlop={4}
                      >
                        <X size={10} color={tokens.textMuted} />
                      </Pressable>
                    )}
                  </View>
                )
              })}
              <Pressable onPress={() => setShowNewTopic(true)} style={[styles.chip, styles.chipDashed]}>
                <Plus size={13} color={tokens.textMuted} />
                <Text style={[styles.chipText, { color: tokens.textMuted }]}>New</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <View style={styles.newTopicRow}>
              <TextInput
                value={newTopicName}
                onChangeText={setNewTopicName}
                placeholder="Topic name"
                placeholderTextColor={tokens.textMuted}
                style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                autoFocus
              />
              <View style={styles.colorRow}>
                {PRESET_COLORS.map(c => (
                  <Pressable
                    key={c}
                    onPress={() => setNewTopicColor(c)}
                    style={[styles.colorSwatch, { backgroundColor: c }, newTopicColor === c && styles.colorSwatchActive]}
                  />
                ))}
              </View>
              <View style={styles.newTopicActions}>
                <Pressable onPress={handleAddTopic} style={[styles.smallBtn, { backgroundColor: tokens.accentPrimary }]}>
                  <Text style={styles.smallBtnTextWhite}>Add</Text>
                </Pressable>
                <Pressable onPress={() => setShowNewTopic(false)} style={[styles.smallBtn, styles.smallBtnOutline]}>
                  <Text style={[styles.smallBtnText, { color: tokens.textSecondary }]}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Card 3: Schedule */}
      <View style={styles.card}>
        <View style={styles.cardField}>
          <Text style={styles.label}>Schedule</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScrollContainer}
            contentContainerStyle={styles.scheduleScrollContent}
          >
            <View style={styles.scheduleFieldInline}>
              <Text style={styles.labelSmall}>Date</Text>
              <DatePickerField value={date} onChange={v => { setDate(v); markDirty() }} />
            </View>
            <View style={styles.scheduleFieldInline}>
              <Text style={styles.labelSmall}>Time</Text>
              <TimePickerField value={dueTime} onChange={v => { setDueTime(v); markDirty() }} placeholder="Add time" />
            </View>
            <View style={styles.scheduleFieldInline}>
              <Text style={styles.labelSmall}>Duration</Text>
              <DurationField value={duration} onChange={v => { setDuration(v); markDirty() }} />
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Card 4: Priority */}
      <View style={styles.card}>
        <View style={styles.cardField}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.chipWrap}>
            {PRIORITY_OPTIONS.map(opt => {
              const active = priority === opt.value
              const color = getPriorityColor(opt.colorKey, tokens)
              return (
                <Pressable
                  key={opt.value ?? 'none'}
                  onPress={() => { setPriority(opt.value as Priority); markDirty() }}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? color : tokens.borderPrimary,
                      borderWidth: active ? 2 : 1,
                      backgroundColor: active ? `${color}20` : tokens.bgInput,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? color : tokens.textSecondary }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </View>

      {/* Card 5: More Options */}
      <View style={styles.card}>
        <Pressable onPress={() => setShowMoreOptions(p => !p)} style={styles.moreOptionsToggle}>
          <Text style={styles.moreOptionsText}>More options</Text>
          {showMoreOptions ? <ChevronUp size={16} color={tokens.textSecondary} /> : <ChevronDown size={16} color={tokens.textSecondary} />}
        </Pressable>

        {showMoreOptions && (
          <>
            {/* Depends On */}
            {depOptions.length > 0 && (
              <>
                <View style={styles.cardDivider} />
                <View style={styles.cardField}>
                  <Text style={styles.label}>Depends on</Text>
                  {dependsOn.length > 0 && (
                    <View style={[styles.chipWrap, { marginBottom: tokens.spacing.sm }]}>
                      {dependsOn.map(depId => {
                        const t = tasks.find(x => x.id === depId)
                        if (!t) return null
                        return (
                          <Pressable key={depId} onPress={() => toggleDep(depId)} style={[styles.depChip, { backgroundColor: tokens.accentBlue }]}>
                            <Text style={styles.depChipText} numberOfLines={1}>{t.title}</Text>
                            <X size={11} color={tokens.textInverse} />
                          </Pressable>
                        )
                      })}
                    </View>
                  )}
                  <Pressable onPress={() => setShowDepsPanel(p => !p)} style={styles.addDepBtn}>
                    {showDepsPanel ? <ChevronUp size={13} color={tokens.textMuted} /> : <ChevronDown size={13} color={tokens.textMuted} />}
                    <Text style={[styles.smallBtnText, { color: tokens.textMuted }]}>{showDepsPanel ? 'Hide tasks' : '+ Add dependency'}</Text>
                  </Pressable>
                  {showDepsPanel && (
                    <ScrollView style={styles.depList} nestedScrollEnabled>
                      {depOptions.map(t => (
                        <Pressable
                          key={t.id}
                          onPress={() => toggleDep(t.id)}
                          style={[styles.depOption, dependsOn.includes(t.id) && { backgroundColor: `${tokens.accentBlue}18` }]}
                        >
                          <View style={[styles.checkbox, { borderColor: dependsOn.includes(t.id) ? tokens.accentBlue : tokens.borderSecondary, backgroundColor: dependsOn.includes(t.id) ? tokens.accentBlue : 'transparent' }]} />
                          <Text style={styles.depTitle} numberOfLines={1}>{t.title}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </>
            )}

            {/* Subtasks */}
            <View style={styles.cardDivider} />
            <View style={styles.cardField}>
              <Text style={styles.label}>Subtasks</Text>
              {subtasks.map(s => (
                <View key={s.id} style={styles.subtaskRow}>
                  <Text style={styles.subtaskTitle} numberOfLines={2}>{s.title}</Text>
                  <Pressable onPress={() => { setSubtasks(p => p.filter(x => x.id !== s.id)); markDirty() }} hitSlop={8}>
                    <Trash2 size={15} color={tokens.textMuted} />
                  </Pressable>
                </View>
              ))}
              <View style={styles.subtaskAddRow}>
                <TextInput
                  value={newSubtask}
                  onChangeText={setNewSubtask}
                  placeholder="Add a subtask..."
                  placeholderTextColor={tokens.textMuted}
                  style={[styles.input, { flex: 1 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                  onSubmitEditing={handleAddSubtask}
                  returnKeyType="done"
                  maxLength={120}
                />
                <Pressable onPress={handleAddSubtask} disabled={!newSubtask.trim()} style={[styles.subtaskAddBtn, { opacity: newSubtask.trim() ? 1 : 0.4 }]}>
                  <Plus size={18} color={tokens.textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* Repeat */}
            <View style={styles.cardDivider} />
            <View style={styles.cardField}>
              <Text style={styles.label}>Repeat</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScrollContainer}
                contentContainerStyle={styles.chipScrollContent}
              >
                {RECURRENCE_OPTIONS.map(opt => {
                  const active = recurrence === opt.value
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => { setRecurrence(opt.value as Recurrence); markDirty() }}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? tokens.accentPrimary : tokens.borderPrimary,
                          borderWidth: active ? 2 : 1,
                          backgroundColor: active ? tokens.accentPrimaryMuted : tokens.bgInput,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? tokens.accentPrimary : tokens.textSecondary }]}>{opt.label}</Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
              {recurrence === 'custom' && (
                <View style={styles.customDays}>
                  <Text style={styles.labelSmall}>Select days:</Text>
                  <View style={styles.daysRow}>
                    {DAYS_OF_WEEK.map(d => {
                      const on = customDays.includes(d.value)
                      return (
                        <Pressable
                          key={d.value}
                          onPress={() => toggleCustomDay(d.value)}
                          style={[styles.dayBtn, { borderColor: on ? tokens.accentPrimary : tokens.borderPrimary, backgroundColor: on ? tokens.accentPrimaryMuted : tokens.bgInput }]}
                        >
                          <Text style={[styles.dayBtnText, { color: on ? tokens.accentPrimary : tokens.textSecondary }]}>{d.label}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              )}
              {recurrence !== 'none' && (
                <View style={{ marginTop: tokens.spacing.sm }}>
                  <Text style={styles.labelSmall}>End date (optional)</Text>
                  <DatePickerField value={recurrenceEndDate} onChange={v => { setRecurrenceEndDate(v); markDirty() }} />
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Duplicate warning */}
      {showDupWarning && (
        <View style={[styles.card, { backgroundColor: `${tokens.accentOrange}15`, borderColor: tokens.accentOrange }]}>
          <View style={styles.cardField}>
            <Text style={[styles.label, { color: tokens.accentOrange }]}>Similar task exists</Text>
            <Text style={[styles.smallText, { color: tokens.textSecondary }]}>A task with this title already exists for this date.</Text>
            <Pressable onPress={() => doSave(title.trim())} style={[styles.smallBtn, { marginTop: tokens.spacing.sm }]}>
              <Text style={[styles.smallBtnText, { color: tokens.accentOrange, fontWeight: '600' }]}>Add anyway</Text>
            </Pressable>
          </View>
        </View>
      )}
    </>
  )

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.dialogWrapper}
        >
          <View style={styles.dialog}>
            {/* Header */}
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>{isEdit ? 'Edit task' : 'Add task'}</Text>
              <Pressable onPress={handleClose} style={styles.closeBtn}>
                <X size={20} color={tokens.textMuted} />
              </Pressable>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.dialogScroll}
              contentContainerStyle={styles.dialogContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {formContent}
            </ScrollView>

            {/* Footer */}
            <View style={styles.dialogFooter}>
              <Pressable
                onPress={handleSubmit}
                disabled={saving}
                style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
              >
                <Text style={styles.submitBtnText}>
                  {saving ? 'Adding...' : isEdit ? 'Save changes' : 'Add task'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: tokens.spacing.lg,
    },
    dialogWrapper: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '90%',
    },
    dialog: {
      width: '100%',
      maxHeight: '100%',
      borderRadius: tokens.radius.xl,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      backgroundColor: tokens.bgSecondary,
      overflow: 'hidden',
      position: 'relative',
      ...Platform.select({
        web: { boxShadow: '0 20px 48px rgba(0,0,0,0.18)' } as any,
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
        android: { elevation: 12 },
      }),
    },
    dialogHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.md,
      gap: tokens.spacing.sm,
    },
    dialogTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    dialogScroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    dialogContent: {
      padding: tokens.spacing.lg,
      paddingBottom: tokens.spacing.lg + 60, // Extra padding for floating button
    },
    dialogFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md,
      paddingBottom: tokens.spacing.lg,
    },
    closeBtn: {
      padding: tokens.spacing.xs,
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtn: {
      flex: 1,
      paddingVertical: tokens.spacing.md,
      borderRadius: tokens.radius.xxl,
      backgroundColor: tokens.accentPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
      ...Platform.select({
        ios: {
          shadowColor: tokens.accentPrimary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: { elevation: 6 },
        web: { boxShadow: `0 4px 12px ${tokens.accentPrimary}50` } as any,
      }),
    },
    submitBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textInverse,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    card: {
      backgroundColor: tokens.bgPrimary,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      marginBottom: tokens.spacing.md,
      overflow: 'hidden',
    },
    cardField: {
      padding: tokens.spacing.md,
    },
    cardDivider: {
      height: 1,
      backgroundColor: tokens.borderPrimary,
      marginHorizontal: tokens.spacing.md,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginBottom: tokens.spacing.sm,
    },
    labelSmall: {
      fontSize: 12,
      fontWeight: '500',
      color: tokens.textSecondary,
      marginBottom: tokens.spacing.xs,
    },
    input: {
      backgroundColor: tokens.bgInput,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      borderRadius: tokens.radius.md,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
      fontSize: 14,
      color: tokens.textPrimary,
    },
    textarea: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.xs,
    },
    chipScrollContainer: {
      marginHorizontal: -tokens.spacing.md,
    },
    chipScrollContent: {
      flexDirection: 'row',
      gap: tokens.spacing.xs,
      paddingHorizontal: tokens.spacing.md,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: tokens.spacing.xs,
      borderRadius: tokens.radius.full,
      borderWidth: 1,
    },
    chipDashed: {
      borderStyle: 'dashed',
      borderColor: tokens.borderSecondary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
    },
    colorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    topicChipContainer: {
      position: 'relative',
    },
    topicDeleteBtn: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: tokens.bgTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
    },
    newTopicRow: {
      gap: tokens.spacing.sm,
    },
    colorRow: {
      flexDirection: 'row',
      gap: tokens.spacing.xs,
    },
    colorSwatch: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    colorSwatchActive: {
      borderWidth: 2,
      borderColor: tokens.textPrimary,
    },
    newTopicActions: {
      flexDirection: 'row',
      gap: tokens.spacing.xs,
    },
    smallBtn: {
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: tokens.spacing.xs,
      borderRadius: tokens.radius.sm,
    },
    smallBtnOutline: {
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
    },
    smallBtnText: {
      fontSize: 12,
      fontWeight: '500',
    },
    smallBtnTextWhite: {
      fontSize: 12,
      fontWeight: '500',
      color: tokens.textInverse,
    },
    smallText: {
      fontSize: 12,
    },
    scheduleRow: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
    scheduleField: {
      flex: 1,
    },
    scheduleScrollContent: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
    },
    scheduleFieldInline: {
      minWidth: 120,
    },
    moreOptionsToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: tokens.spacing.md,
    },
    moreOptionsText: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    depChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: tokens.spacing.xs,
      borderRadius: tokens.radius.full,
    },
    depChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: tokens.textInverse,
      maxWidth: 120,
    },
    addDepBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    depList: {
      maxHeight: 150,
      marginTop: tokens.spacing.sm,
    },
    depOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
      paddingVertical: tokens.spacing.xs,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.sm,
    },
    depTitle: {
      flex: 1,
      fontSize: 13,
      color: tokens.textPrimary,
    },
    checkbox: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1,
    },
    subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
      paddingVertical: tokens.spacing.xs,
    },
    subtaskTitle: {
      flex: 1,
      fontSize: 13,
      color: tokens.textPrimary,
    },
    subtaskAddRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.xs,
      marginTop: tokens.spacing.sm,
    },
    subtaskAddBtn: {
      padding: tokens.spacing.xs,
    },
    customDays: {
      marginTop: tokens.spacing.sm,
    },
    daysRow: {
      flexDirection: 'row',
      gap: tokens.spacing.xs,
      marginTop: tokens.spacing.xs,
    },
    dayBtn: {
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: tokens.spacing.xs,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
    },
    dayBtnText: {
      fontSize: 12,
      fontWeight: '500',
    },
  })
}
