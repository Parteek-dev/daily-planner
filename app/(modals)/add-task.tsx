/**
 * Add / Edit Task modal — full implementation.
 *
 * Matches the original web app's AddTaskModal:
 *  - Title (required) with inline error
 *  - Description (optional)
 *  - Topic chips + inline "New topic" form with color picker
 *  - Duration / Date / Time fields (3-column row)
 *  - Priority buttons (None / High / Medium / Low)
 *  - Depends On selector (incomplete tasks on same date)
 *  - Subtasks list with add/remove
 *  - Recurrence (No repeat / Daily / Weekdays / Weekly / Custom days)
 *  - Duplicate warning with proceed/cancel
 *  - Android back / iOS swipe-back dirty guard
 *
 * Requirements: 7.1–7.11, 4.7
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
} from 'react-native'
import { useNavigation, useLocalSearchParams, useRouter } from 'expo-router'
import {
  X,
  Plus,
  Clock,
  Calendar,
  Tag,
  ListChecks,
  Repeat,
  Trash2,
  Flag,
  Link,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native'

import { useAuth } from '@/src/hooks/useAuth'
import { useProgress } from '@/src/hooks/useProgress'
import { useTheme } from '@/src/hooks/useTheme'
import { DatePickerField } from '@/src/components/DatePickerField'
import { TimePickerField } from '@/src/components/TimePickerField'
import { DurationField } from '@/src/components/DurationField'
import type { Task } from '@/src/lib/firestoreMappers'

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7',
  '#ef4444', '#14b8a6', '#f59e0b', '#ec4899',
]

const PRIORITY_OPTIONS = [
  { value: null, label: 'None', color: '#9ca3af' },
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'medium', label: 'Medium', color: '#f97316' },
  { value: 'low', label: 'Low', color: '#22c55e' },
] as const

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays (Mon–Fri)' },
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

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AddTaskModal() {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  const { width } = useWindowDimensions()
  const isWebWide = Platform.OS === 'web' && width > 640
  const navigation = useNavigation()
  const router = useRouter()
  const params = useLocalSearchParams<{ date?: string; taskId?: string }>()
  const { user } = useAuth()
  const {
    tasks,
    addTask,
    updateTask,
    topics,
    addTopic,
    getTopicColor,
  } = useProgress({ user })

  // Determine if we're editing an existing task
  const editTask = params.taskId
    ? tasks.find(t => t.id === params.taskId) ?? null
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

  // UI state
  const [titleError, setTitleError] = useState(false)
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [newTopicColor, setNewTopicColor] = useState(PRESET_COLORS[0])
  const [showDepsPanel, setShowDepsPanel] = useState(false)
  const [newSubtask, setNewSubtask] = useState('')
  const [showDupWarning, setShowDupWarning] = useState(false)
  const [saving, setSaving] = useState(false)

  const isDirty = useRef(false)
  const titleRef = useRef<TextInput>(null)

  // ── Populate form from editTask or params ─────────────────────────────────

  useEffect(() => {
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
    } else {
      setTitle('')
      setDesc('')
      setTopic(topics[0]?.name ?? 'Personal')
      setDuration(30)
      setDate(params.date ?? new Date().toISOString().split('T')[0])
      setDueTime(null)
      setPriority(null)
      setDependsOn([])
      setSubtasks([])
      setRecurrence('none')
      setRecurrenceEndDate('')
      setCustomDays([])
    }
    setTitleError(false)
    setShowNewTopic(false)
    setShowDupWarning(false)
    isDirty.current = false
  }, [editTask?.id, isEdit, params.date])

  // Set default topic when topics load (topics may be empty on first render)
  useEffect(() => {
    if (!isEdit && !topic && topics.length > 0) {
      setTopic(topics[0].name)
    }
  }, [topics, isEdit, topic])

  // ── Dirty guard (Android back / iOS swipe) ────────────────────────────────

  useEffect(() => {
    const unsub = navigation.addListener(
      'beforeRemove' as any,
      (e: any) => {
        if (!isDirty.current) return
        e.preventDefault()
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
                navigation.dispatch(e.data.action)
              },
            },
          ],
        )
      },
    )
    return unsub
  }, [navigation])

  const markDirty = () => { isDirty.current = true }

  // ── Dependency options: incomplete tasks (excluding self) ─────────────────

  const depOptions = tasks.filter(t =>
    !t.completed && t.id !== editTask?.id
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  const doSave = useCallback(async (trimmedTitle: string) => {
    // Prevent double-save if already saving
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
      router.back()
    } catch (error) {
      console.error('[AddTaskModal] Save failed:', error)
      // Keep modal open on error so user can retry
    } finally {
      setSaving(false)
    }
  }, [saving, description, topic, duration, date, dueTime, priority, dependsOn, subtasks, recurrence, recurrenceEndDate, customDays, isEdit, editTask, addTask, updateTask, router])

  const handleSubmit = useCallback(() => {
    // Prevent submission if already saving
    if (saving) return

    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError(true)
      titleRef.current?.focus()
      return
    }

    // Duplicate check
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

  // ── Render ────────────────────────────────────────────────────────────────

  // The form fields (shared between web dialog and mobile full-screen)
  // No ScrollView wrapper here — each platform branch provides its own.
  const formFields = (
    <>
      {/* ── Title ── */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: titleError ? tokens.accentRed : tokens.textSecondary }]}>
          Task Title *{titleError && '  — required'}
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
            { color: tokens.textPrimary, backgroundColor: tokens.bgInput, borderColor: titleError ? tokens.accentRed : tokens.borderPrimary },
            Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {},
          ]}
          autoFocus
          returnKeyType="next"
          maxLength={120}
          accessibilityLabel="Task title"
        />
      </View>

      {/* ── Description ── */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: tokens.textSecondary }]}>Description (optional)</Text>
        <TextInput
          value={description}
          onChangeText={v => { setDesc(v); markDirty() }}
          placeholder="Add details..."
          placeholderTextColor={tokens.textMuted}
          multiline
          numberOfLines={3}
          style={[
            styles.input,
            styles.textarea,
            { color: tokens.textPrimary, backgroundColor: tokens.bgInput, borderColor: tokens.borderPrimary },
            Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {},
          ]}
          maxLength={500}
          accessibilityLabel="Task description"
        />
      </View>

      {/* ── Topic ── */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Tag size={13} color={tokens.textSecondary} />
          <Text style={[styles.label, { color: tokens.textSecondary }]}>Topic</Text>
        </View>

        {!showNewTopic ? (
          <View style={styles.chipWrap}>
            {topics.map(t => {
              const active = topic === t.name
              return (
                <Pressable
                  key={t.name}
                  onPress={() => { setTopic(t.name); markDirty() }}
                  style={[
                    styles.topicChip,
                    {
                      borderColor: active ? t.color : tokens.borderPrimary,
                      borderWidth: active ? 2 : 1,
                      backgroundColor: active ? `${t.color}20` : tokens.bgInput,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.topicChipText, { color: active ? t.color : tokens.textSecondary }]}>
                    {t.name}
                  </Text>
                </Pressable>
              )
            })}
            <Pressable
              onPress={() => setShowNewTopic(true)}
              style={[styles.topicChip, { borderColor: tokens.borderSecondary, borderStyle: 'dashed' }]}
            >
              <Plus size={13} color={tokens.textMuted} />
              <Text style={[styles.topicChipText, { color: tokens.textMuted }]}>New</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.newTopicRow}>
            <TextInput
              value={newTopicName}
              onChangeText={setNewTopicName}
              placeholder="Topic name"
              placeholderTextColor={tokens.textMuted}
              style={[
                styles.input,
                styles.newTopicInput,
                { color: tokens.textPrimary, backgroundColor: tokens.bgInput, borderColor: tokens.borderPrimary },
                Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {},
              ]}
              autoFocus
            />
            <View style={styles.colorRow}>
              {PRESET_COLORS.map(c => (
                <Pressable
                  key={c}
                  onPress={() => setNewTopicColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    newTopicColor === c && styles.colorSwatchActive,
                  ]}
                />
              ))}
            </View>
            <View style={styles.newTopicActions}>
              <Pressable
                onPress={handleAddTopic}
                style={[styles.smallBtn, { backgroundColor: tokens.accentBlue }]}
              >
                <Text style={styles.smallBtnTextWhite}>Add</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowNewTopic(false)}
                style={[styles.smallBtn, { backgroundColor: tokens.bgInput, borderWidth: 1, borderColor: tokens.borderPrimary }]}
              >
                <Text style={[styles.smallBtnText, { color: tokens.textSecondary }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* ── Duration / Date / Time ── */}
      <View style={[styles.threeCol, { gap: 10 }]}>
        <View style={{ flex: 1 }}>
          <View style={styles.labelRow}>
            <Clock size={13} color={tokens.textSecondary} />
            <Text style={[styles.label, { color: tokens.textSecondary }]}>Duration</Text>
          </View>
          <DurationField
            value={duration}
            onChange={v => { setDuration(v); markDirty() }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.labelRow}>
            <Calendar size={13} color={tokens.textSecondary} />
            <Text style={[styles.label, { color: tokens.textSecondary }]}>Date</Text>
          </View>
          <DatePickerField
            value={date}
            onChange={v => { setDate(v); markDirty() }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.labelRow}>
            <Clock size={13} color={tokens.textSecondary} />
            <Text style={[styles.label, { color: tokens.textSecondary }]}>Time</Text>
          </View>
          <TimePickerField
            value={dueTime}
            onChange={v => { setDueTime(v); markDirty() }}
          />
        </View>
      </View>

      {/* ── Priority ── */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Flag size={13} color={tokens.textSecondary} />
          <Text style={[styles.label, { color: tokens.textSecondary }]}>Priority</Text>
        </View>
        <View style={styles.chipWrap}>
          {PRIORITY_OPTIONS.map(opt => {
            const active = priority === opt.value
            return (
              <Pressable
                key={opt.value ?? 'none'}
                onPress={() => { setPriority(opt.value as Priority); markDirty() }}
                style={[
                  styles.priorityChip,
                  {
                    borderColor: active ? opt.color : tokens.borderPrimary,
                    borderWidth: active ? 2 : 1,
                    backgroundColor: active ? `${opt.color}20` : tokens.bgInput,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.topicChipText, { color: active ? opt.color : tokens.textSecondary }]}>
                  {opt.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* ── Depends On ── */}
      {depOptions.length > 0 && (
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Link size={13} color={tokens.textSecondary} />
            <Text style={[styles.label, { color: tokens.textSecondary }]}>Depends On</Text>
          </View>

          {/* Selected deps */}
          {dependsOn.length > 0 && (
            <View style={[styles.chipWrap, { marginBottom: 8 }]}>
              {dependsOn.map(depId => {
                const t = tasks.find(x => x.id === depId)
                if (!t) return null
                return (
                  <Pressable
                    key={depId}
                    onPress={() => toggleDep(depId)}
                    style={[styles.depChip, { backgroundColor: tokens.accentBlue }]}
                  >
                    <Text style={styles.depChipText} numberOfLines={1}>{t.title}</Text>
                    <X size={11} color="#fff" />
                  </Pressable>
                )
              })}
            </View>
          )}

          <Pressable
            onPress={() => setShowDepsPanel(p => !p)}
            style={[styles.smallOutlineBtn, { borderColor: tokens.borderPrimary }]}
          >
            {showDepsPanel
              ? <ChevronUp size={13} color={tokens.textMuted} />
              : <ChevronDown size={13} color={tokens.textMuted} />}
            <Text style={[styles.smallBtnText, { color: tokens.textMuted }]}>
              {showDepsPanel ? 'Hide tasks' : `+ Add dependency (${depOptions.length} available)`}
            </Text>
          </Pressable>

          {showDepsPanel && (
            <View style={[styles.depList, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }]}>
              {depOptions.map(t => (
                <Pressable
                  key={t.id}
                  onPress={() => toggleDep(t.id)}
                  style={[
                    styles.depOption,
                    { backgroundColor: dependsOn.includes(t.id) ? `${tokens.accentBlue}18` : 'transparent' },
                  ]}
                >
                  <View style={[
                    styles.checkbox,
                    {
                      borderColor: dependsOn.includes(t.id) ? tokens.accentBlue : tokens.borderSecondary,
                      backgroundColor: dependsOn.includes(t.id) ? tokens.accentBlue : 'transparent',
                    },
                  ]} />
                  <Text style={[styles.depTitle, { color: tokens.textPrimary }]} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text style={[styles.depDate, { color: tokens.textMuted }]}>{t.date}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── Subtasks ── */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <ListChecks size={13} color={tokens.textSecondary} />
          <Text style={[styles.label, { color: tokens.textSecondary }]}>Subtasks (optional)</Text>
        </View>

        {subtasks.map(s => (
          <View key={s.id} style={[styles.subtaskRow, { backgroundColor: tokens.bgInput }]}>
            <Text style={[styles.subtaskTitle, { color: tokens.textPrimary }]} numberOfLines={2}>
              {s.title}
            </Text>
            <Pressable
              onPress={() => { setSubtasks(p => p.filter(x => x.id !== s.id)); markDirty() }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove subtask"
            >
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
            style={[
              styles.input,
              styles.subtaskInput,
              { color: tokens.textPrimary, backgroundColor: tokens.bgInput, borderColor: tokens.borderPrimary },
              Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {},
            ]}
            onSubmitEditing={handleAddSubtask}
            returnKeyType="done"
            maxLength={120}
          />
          <Pressable
            onPress={handleAddSubtask}
            disabled={!newSubtask.trim()}
            style={[
              styles.subtaskAddBtn,
              { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary, opacity: newSubtask.trim() ? 1 : 0.4 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add subtask"
          >
            <Plus size={18} color={tokens.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* ── Recurrence ── */}
      <View style={[styles.field, { marginBottom: 8 }]}>
        <View style={styles.labelRow}>
          <Repeat size={13} color={tokens.textSecondary} />
          <Text style={[styles.label, { color: tokens.textSecondary }]}>Repeat</Text>
        </View>
        <View style={styles.chipWrap}>
          {RECURRENCE_OPTIONS.map(opt => {
            const active = recurrence === opt.value
            return (
              <Pressable
                key={opt.value}
                onPress={() => { setRecurrence(opt.value as Recurrence); markDirty() }}
                style={[
                  styles.recurrenceChip,
                  {
                    borderColor: active ? tokens.accentBlue : tokens.borderPrimary,
                    borderWidth: active ? 2 : 1,
                    backgroundColor: active ? `${tokens.accentBlue}18` : tokens.bgInput,
                  },
                ]}
              >
                <Text style={[styles.topicChipText, { color: active ? tokens.accentBlue : tokens.textSecondary }]}>
                  {opt.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Custom day picker */}
        {recurrence === 'custom' && (
          <View style={[styles.customDays, { marginTop: 10 }]}>
            <Text style={[styles.smallLabel, { color: tokens.textMuted }]}>Select days:</Text>
            <View style={styles.daysRow}>
              {DAYS_OF_WEEK.map(d => {
                const on = customDays.includes(d.value)
                return (
                  <Pressable
                    key={d.value}
                    onPress={() => toggleCustomDay(d.value)}
                    style={[
                      styles.dayBtn,
                      {
                        borderColor: on ? tokens.accentBlue : tokens.borderPrimary,
                        backgroundColor: on ? tokens.accentBlue : tokens.bgInput,
                      },
                    ]}
                  >
                    <Text style={[styles.dayBtnText, { color: on ? '#fff' : tokens.textSecondary }]}>
                      {d.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )}

        {/* Recurrence end date */}
        {recurrence !== 'none' && (
          <View style={{ marginTop: 10 }}>
            <Text style={[styles.smallLabel, { color: tokens.textMuted }]}>End date (optional):</Text>
            <View style={{ maxWidth: 180, marginTop: 4 }}>
              <DatePickerField
                value={recurrenceEndDate}
                onChange={v => { setRecurrenceEndDate(v); markDirty() }}
                placeholder="No end date"
              />
            </View>
          </View>
        )}
      </View>

      {/* ── Duplicate warning ── */}
      {showDupWarning && (
        <View style={[styles.dupWarning, { backgroundColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.35)' }]}>
          <View style={styles.dupWarnHeader}>
            <AlertTriangle size={14} color="#f97316" />
            <Text style={styles.dupWarnText}>
              A task named <Text style={{ fontWeight: '700' }}>"{title.trim()}"</Text> already exists on this date. Add it anyway?
            </Text>
          </View>
          <View style={styles.dupActions}>
            <Pressable
              onPress={() => setShowDupWarning(false)}
              style={[styles.smallBtn, { backgroundColor: tokens.bgInput, borderWidth: 1, borderColor: tokens.borderPrimary }]}
            >
              <Text style={[styles.smallBtnText, { color: tokens.textSecondary }]}>Go back</Text>
            </Pressable>
            <Pressable
              onPress={() => doSave(title.trim())}
              style={[styles.smallBtn, { backgroundColor: 'rgba(249,115,22,0.15)', borderWidth: 1, borderColor: '#f97316' }]}
            >
              <Text style={[styles.smallBtnText, { color: '#f97316', fontWeight: '600' }]}>Add anyway</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Bottom spacer */}
      <View style={{ height: isWebWide ? 20 : 40 }} />
    </>
  )

  // Web: centered dialog over blurred backdrop
  if (isWebWide) {
    return (
      <Pressable
        style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
        onPress={() => router.back()}
        accessibilityLabel="Close dialog"
      >
        <Pressable
          onPress={() => { }}
          style={[styles.dialog, {
            backgroundColor: tokens.bgSecondary,
            borderColor: tokens.borderPrimary,
            ...(Platform.select({ web: { boxShadow: '0 8px 40px rgba(0,0,0,0.18)' } }) as object),
          }]}
        >
          {/* Dialog header */}
          <View style={[styles.header, { borderBottomColor: tokens.borderPrimary }]}>
            <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
              {isEdit ? 'Edit Task' : 'Add New Task'}
            </Text>
            <Pressable onPress={() => router.back()} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color={tokens.textSecondary} />
            </Pressable>
          </View>
          {/* Scrollable form */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {formFields}
          </ScrollView>
          {/* Footer */}
          <View style={[styles.dialogFooter, { borderTopColor: tokens.borderPrimary }]}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.cancelBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }]}
              accessibilityRole="button"
            >
              <Text style={[styles.cancelBtnText, { color: tokens.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={saving}
              style={[styles.submitBtn, { backgroundColor: tokens.accentBlue, opacity: saving ? 0.6 : 1 }]}
              accessibilityRole="button"
            >
              <Text style={styles.submitBtnText}>{isEdit ? 'Save Changes' : 'Add Task'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    )
  }

  // Mobile / narrow web: full-screen
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bgPrimary }]}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { borderBottomColor: tokens.borderPrimary }]}>
        <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
          {isEdit ? 'Edit Task' : 'Add New Task'}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
          <X size={20} color={tokens.textSecondary} />
        </Pressable>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {formFields}
        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          style={[styles.mobileSubmitBtn, { backgroundColor: tokens.accentBlue, opacity: saving ? 0.6 : 1 }]}
          accessibilityRole="button"
        >
          <Text style={styles.submitBtnText}>{isEdit ? 'Save Changes' : 'Add Task'}</Text>
        </Pressable>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    safe: { flex: 1 },
    // Web dialog
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    dialog: {
      width: '100%',
      maxWidth: 560,
      borderRadius: 20,
      borderWidth: 1,
      maxHeight: '90%' as any,
      overflow: 'hidden',
    },
    dialogFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: 1,
    },
    cancelBtn: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    cancelBtnText: { fontSize: 14, fontWeight: '500' },
    submitBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
    },
    submitBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    mobileSubmitBtn: {
      marginTop: 8,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      gap: 12,
    },
    closeBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
    saveBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
    },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    scroll: { flex: 1 },
    content: { padding: 16 },
    field: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
    smallLabel: { fontSize: 12 },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 15,
    },
    textarea: {
      minHeight: 72,
      textAlignVertical: 'top',
    },
    threeCol: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    // Topic chips
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    topicChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    topicChipText: { fontSize: 13, fontWeight: '500' },
    // New topic
    newTopicRow: { gap: 10 },
    newTopicInput: { flex: 1 },
    colorRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    colorSwatch: {
      width: 26,
      height: 26,
      borderRadius: 7,
    },
    colorSwatchActive: {
      borderWidth: 2.5,
      borderColor: '#fff',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4 },
        android: {},
        web: { boxShadow: '0 0 4px rgba(0,0,0,0.3)' },
      }),
      elevation: 4,
    },
    newTopicActions: { flexDirection: 'row', gap: 8 },
    smallBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    smallBtnText: { fontSize: 13 },
    smallBtnTextWhite: { fontSize: 13, color: '#fff', fontWeight: '600' },
    smallOutlineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
    // Priority
    priorityChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
    },
    // Deps
    depChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      maxWidth: 180,
    },
    depChipText: { color: '#fff', fontSize: 12, flex: 1 },
    depList: {
      marginTop: 8,
      borderRadius: 10,
      borderWidth: 1,
      maxHeight: 160,
      overflow: 'hidden',
    },
    depOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    checkbox: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1.5,
      flexShrink: 0,
    },
    depTitle: { flex: 1, fontSize: 13 },
    depDate: { fontSize: 11, flexShrink: 0 },
    // Subtasks
    subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 8,
      marginBottom: 6,
    },
    subtaskTitle: { flex: 1, fontSize: 13 },
    subtaskAddRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    subtaskInput: { flex: 1 },
    subtaskAddBtn: {
      width: 42,
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Recurrence
    recurrenceChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
    },
    customDays: { gap: 6 },
    daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    dayBtn: {
      width: 40,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayBtnText: { fontSize: 11, fontWeight: '600' },
    // Duplicate warning
    dupWarning: {
      borderRadius: 10,
      borderWidth: 1,
      padding: 14,
      marginBottom: 12,
      gap: 10,
    },
    dupWarnHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    dupWarnText: {
      flex: 1,
      fontSize: 13,
      color: '#f97316',
      lineHeight: 18,
    },
    dupActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  })
}
