/**
 * Add / Edit Task modal — full implementation.
 *
 * Matches the original web app's AddTaskModal:
 *  - Title (required) with inline error
 *  - Description (optional)
 *  - Topic chips + inline "New topic" form with color picker
 *  - Schedule section with Duration / Date / Time fields
 *  - Priority buttons (None / Low / Medium / High)
 *  - More options (collapsed): Depends On, Subtasks, Repeat
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
  Trash2,
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
import { SIDEBAR_BREAKPOINT } from '@/src/constants'
import type { Task } from '@/src/lib/firestoreMappers'
import type { Tokens } from '@/src/theme/tokens'

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7',
  '#ef4444', '#14b8a6', '#f59e0b', '#ec4899',
]

// Priority options ordered: None → Low → Medium → High
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

// ── Helper to get priority color from tokens ──────────────────────────────────

function getPriorityColor(
  colorKey: 'neutral' | 'accentBlue' | 'accentOrange' | 'accentRed',
  tokens: Tokens
): string {
  if (colorKey === 'neutral') return tokens.textMuted
  return tokens[colorKey]
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AddTaskModal() {
  const { tokens } = useTheme()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
  const { width } = useWindowDimensions()
  const isMobile = !(Platform.OS === 'web' && width > SIDEBAR_BREAKPOINT)
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
  const [showMoreOptions, setShowMoreOptions] = useState(false)

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
      // Expand more options if any advanced fields are populated
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
      setDate(params.date ?? new Date().toISOString().split('T')[0])
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
  const formFields = (
    <>
      {/* ── Task title (primary field) ── */}
      <View style={styles.field}>
        <Text style={[styles.labelPrimary, titleError && { color: tokens.accentRed }]}>
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
            styles.inputPrimary,
            {
              borderColor: titleError ? tokens.accentRed : tokens.borderPrimary,
            },
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
          ]}
          autoFocus
          returnKeyType="next"
          maxLength={120}
          accessibilityLabel="Task title"
        />
      </View>

      {/* ── Description ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={v => { setDesc(v); markDirty() }}
          placeholder="Add details..."
          placeholderTextColor={tokens.textMuted}
          multiline
          numberOfLines={isMobile ? 2 : 3}
          style={[
            styles.input,
            styles.textarea,
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
          ]}
          maxLength={500}
          accessibilityLabel="Task description"
        />
      </View>

      {/* ── Topic ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Topic</Text>

        {!showNewTopic ? (
          <View style={styles.chipWrap}>
            {topics.map(t => {
              const active = topic === t.name
              return (
                <Pressable
                  key={t.name}
                  onPress={() => { setTopic(t.name); markDirty() }}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? tokens.accentPrimary : tokens.borderPrimary,
                      borderWidth: active ? 2 : 1,
                      backgroundColor: active ? tokens.accentPrimaryMuted : tokens.bgInput,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[
                    styles.chipText,
                    { color: active ? tokens.accentPrimary : tokens.textSecondary }
                  ]}>
                    {t.name}
                  </Text>
                </Pressable>
              )
            })}
            <Pressable
              onPress={() => setShowNewTopic(true)}
              style={[styles.chip, styles.chipDashed]}
            >
              <Plus size={13} color={tokens.textMuted} />
              <Text style={[styles.chipText, { color: tokens.textMuted }]}>New</Text>
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
                Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
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
                  accessibilityLabel={`Color ${c}`}
                />
              ))}
            </View>
            <View style={styles.newTopicActions}>
              <Pressable
                onPress={handleAddTopic}
                style={[styles.smallBtn, { backgroundColor: tokens.accentPrimary }]}
              >
                <Text style={styles.smallBtnTextWhite}>Add</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowNewTopic(false)}
                style={[styles.smallBtn, styles.smallBtnOutline]}
              >
                <Text style={[styles.smallBtnText, { color: tokens.textSecondary }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* ── Schedule section ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>

        {isMobile ? (
          // Mobile: stacked layout
          <>
            <View style={styles.scheduleRowMobile}>
              <View style={styles.scheduleFieldMobile}>
                <Text style={styles.labelSmall}>Date</Text>
                <DatePickerField
                  value={date}
                  onChange={v => { setDate(v); markDirty() }}
                />
              </View>
              <View style={styles.scheduleFieldMobile}>
                <Text style={styles.labelSmall}>Time</Text>
                <TimePickerField
                  value={dueTime}
                  onChange={v => { setDueTime(v); markDirty() }}
                  placeholder="Add time"
                />
              </View>
            </View>
            <View style={styles.scheduleFieldFull}>
              <Text style={styles.labelSmall}>Duration</Text>
              <DurationField
                value={duration}
                onChange={v => { setDuration(v); markDirty() }}
              />
            </View>
          </>
        ) : (
          // Desktop: 3-column row
          <View style={styles.scheduleRowDesktop}>
            <View style={styles.scheduleFieldDesktop}>
              <Text style={styles.labelSmall}>Date</Text>
              <DatePickerField
                value={date}
                onChange={v => { setDate(v); markDirty() }}
              />
            </View>
            <View style={styles.scheduleFieldDesktop}>
              <Text style={styles.labelSmall}>Time</Text>
              <TimePickerField
                value={dueTime}
                onChange={v => { setDueTime(v); markDirty() }}
                placeholder="Add time"
              />
            </View>
            <View style={styles.scheduleFieldDesktop}>
              <Text style={styles.labelSmall}>Duration</Text>
              <DurationField
                value={duration}
                onChange={v => { setDuration(v); markDirty() }}
              />
            </View>
          </View>
        )}
      </View>

      {/* ── Priority ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.chipWrap}>
          {PRIORITY_OPTIONS.map(opt => {
            const active = priority === opt.value
            const color = getPriorityColor(opt.colorKey, tokens)
            const bgColor = opt.colorKey === 'neutral'
              ? tokens.bgTertiary
              : `${color}20`

            return (
              <Pressable
                key={opt.value ?? 'none'}
                onPress={() => { setPriority(opt.value as Priority); markDirty() }}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? color : tokens.borderPrimary,
                    borderWidth: active ? 2 : 1,
                    backgroundColor: active ? bgColor : tokens.bgInput,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[
                  styles.chipText,
                  { color: active ? color : tokens.textSecondary }
                ]}>
                  {opt.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* ── More options toggle ── */}
      <Pressable
        onPress={() => setShowMoreOptions(prev => !prev)}
        style={styles.moreOptionsToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: showMoreOptions }}
      >
        <Text style={styles.moreOptionsText}>More options</Text>
        {showMoreOptions
          ? <ChevronUp size={16} color={tokens.textSecondary} />
          : <ChevronDown size={16} color={tokens.textSecondary} />
        }
      </Pressable>

      {/* ── Advanced options (collapsed by default) ── */}
      {showMoreOptions && (
        <View style={styles.moreOptionsContent}>
          {/* ── Depends On ── */}
          {depOptions.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.label}>Depends on</Text>

              {/* Selected deps */}
              {dependsOn.length > 0 && (
                <View style={[styles.chipWrap, { marginBottom: tokens.spacing.sm }]}>
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
                        <X size={11} color={tokens.textInverse} />
                      </Pressable>
                    )
                  })}
                </View>
              )}

              <Pressable
                onPress={() => setShowDepsPanel(p => !p)}
                style={styles.addDepBtn}
              >
                {showDepsPanel
                  ? <ChevronUp size={13} color={tokens.textMuted} />
                  : <ChevronDown size={13} color={tokens.textMuted} />}
                <Text style={[styles.smallBtnText, { color: tokens.textMuted }]}>
                  {showDepsPanel ? 'Hide tasks' : '+ Add dependency'}
                </Text>
              </Pressable>

              {showDepsPanel && (
                <View style={styles.depList}>
                  <Text style={styles.depListCount}>{depOptions.length} available</Text>
                  {depOptions.map(t => (
                    <Pressable
                      key={t.id}
                      onPress={() => toggleDep(t.id)}
                      style={[
                        styles.depOption,
                        dependsOn.includes(t.id) && { backgroundColor: `${tokens.accentBlue}18` },
                      ]}
                    >
                      <View style={[
                        styles.checkbox,
                        {
                          borderColor: dependsOn.includes(t.id) ? tokens.accentBlue : tokens.borderSecondary,
                          backgroundColor: dependsOn.includes(t.id) ? tokens.accentBlue : 'transparent',
                        },
                      ]} />
                      <Text style={styles.depTitle} numberOfLines={1}>
                        {t.title}
                      </Text>
                      <Text style={styles.depDate}>{t.date}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Subtasks ── */}
          <View style={styles.field}>
            <Text style={styles.label}>Subtasks</Text>

            {subtasks.map(s => (
              <View key={s.id} style={styles.subtaskRow}>
                <Text style={styles.subtaskTitle} numberOfLines={2}>
                  {s.title}
                </Text>
                <Pressable
                  onPress={() => { setSubtasks(p => p.filter(x => x.id !== s.id)); markDirty() }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Remove subtask"
                  style={styles.subtaskRemoveBtn}
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
                  Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
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
                  { opacity: newSubtask.trim() ? 1 : 0.4 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add subtask"
              >
                <Plus size={18} color={tokens.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* ── Repeat ── */}
          <View style={styles.field}>
            <Text style={styles.label}>Repeat</Text>
            <View style={styles.chipWrap}>
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
                    <Text style={[
                      styles.chipText,
                      { color: active ? tokens.accentPrimary : tokens.textSecondary }
                    ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Custom day picker */}
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
                        style={[
                          styles.dayBtn,
                          {
                            borderColor: on ? tokens.accentPrimary : tokens.borderPrimary,
                            backgroundColor: on ? tokens.accentPrimary : tokens.bgInput,
                          },
                        ]}
                      >
                        <Text style={[
                          styles.dayBtnText,
                          { color: on ? tokens.textInverse : tokens.textSecondary }
                        ]}>
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
              <View style={styles.recurrenceEndDate}>
                <Text style={styles.labelSmall}>End date (optional):</Text>
                <View style={{ maxWidth: 180 }}>
                  <DatePickerField
                    value={recurrenceEndDate}
                    onChange={v => { setRecurrenceEndDate(v); markDirty() }}
                    placeholder="No end date"
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Duplicate warning ── */}
      {showDupWarning && (
        <View style={styles.dupWarning}>
          <View style={styles.dupWarnHeader}>
            <AlertTriangle size={14} color={tokens.accentOrange} />
            <Text style={styles.dupWarnText}>
              A task named <Text style={{ fontWeight: '700' }}>"{title.trim()}"</Text> already exists on this date. Add it anyway?
            </Text>
          </View>
          <View style={styles.dupActions}>
            <Pressable
              onPress={() => setShowDupWarning(false)}
              style={[styles.smallBtn, styles.smallBtnOutline]}
            >
              <Text style={[styles.smallBtnText, { color: tokens.textSecondary }]}>Go back</Text>
            </Pressable>
            <Pressable
              onPress={() => doSave(title.trim())}
              style={[styles.smallBtn, styles.dupWarnBtn]}
            >
              <Text style={[styles.smallBtnText, { color: tokens.accentOrange, fontWeight: '600' }]}>Add anyway</Text>
            </Pressable>
          </View>
        </View>
      )}
    </>
  )

  // Web: centered dialog over blurred backdrop
  if (!isMobile) {
    return (
      <Pressable
        style={styles.backdrop}
        onPress={() => router.back()}
        accessibilityLabel="Close dialog"
      >
        <Pressable
          onPress={() => { }}
          style={styles.dialog}
        >
          {/* Dialog header */}
          <View style={styles.dialogHeader}>
            <Text style={styles.dialogTitle}>
              {isEdit ? 'Edit task' : 'Add task'}
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={20} color={tokens.textSecondary} />
            </Pressable>
          </View>

          {/* Scrollable form */}
          <ScrollView
            style={styles.dialogScroll}
            contentContainerStyle={styles.dialogContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {formFields}
          </ScrollView>

          {/* Fixed footer */}
          <View style={styles.dialogFooter}>
            <Pressable
              onPress={() => router.back()}
              style={styles.cancelBtn}
              accessibilityRole="button"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={saving}
              style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
              accessibilityRole="button"
            >
              <Text style={styles.submitBtnText}>
                {saving ? 'Adding...' : isEdit ? 'Save changes' : 'Add task'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    )
  }

  // Mobile / narrow web: full-screen with sticky bottom button
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.mobileHeader}>
        <Text style={styles.mobileHeaderTitle}>
          {isEdit ? 'Edit task' : 'Add task'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={20} color={tokens.textSecondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.mobileScroll}
          contentContainerStyle={styles.mobileContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {formFields}
        </ScrollView>

        {/* Sticky bottom button */}
        <View style={styles.stickyFooter}>
          <Pressable
            onPress={handleSubmit}
            disabled={saving}
            style={[styles.mobileSubmitBtn, saving && styles.submitBtnDisabled]}
            accessibilityRole="button"
          >
            <Text style={styles.mobileSubmitBtnText}>
              {saving ? 'Adding...' : isEdit ? 'Save changes' : 'Add task'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    // ─── Mobile layout ───
    safe: {
      flex: 1,
      backgroundColor: tokens.bgPrimary,
    },
    mobileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: tokens.borderPrimary,
    },
    mobileHeaderTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 24,
      color: tokens.textPrimary,
    },
    keyboardAvoid: {
      flex: 1,
    },
    mobileScroll: {
      flex: 1,
    },
    mobileContent: {
      padding: tokens.spacing.lg,
      paddingBottom: 120, // Extra padding so sticky button doesn't cover content
    },
    stickyFooter: {
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md,
      paddingBottom: tokens.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: tokens.borderPrimary,
      backgroundColor: tokens.bgPrimary,
    },
    mobileSubmitBtn: {
      backgroundColor: tokens.accentPrimary,
      paddingVertical: tokens.spacing.md + 2, // ~14px for 48-50px total height
      borderRadius: tokens.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    mobileSubmitBtnText: {
      color: tokens.textInverse,
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
    },

    // ─── Desktop dialog ───
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: tokens.spacing.xl,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    dialog: {
      width: '100%',
      maxWidth: 680,
      maxHeight: '90%',
      borderRadius: tokens.radius.xl,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      backgroundColor: tokens.bgPrimary,
      overflow: 'hidden',
      ...Platform.select({
        web: { boxShadow: '0 8px 40px rgba(0,0,0,0.18)' } as any,
        default: {},
      }),
    },
    dialogHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.xl,
      paddingVertical: tokens.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: tokens.borderPrimary,
    },
    dialogTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 26,
      color: tokens.textPrimary,
    },
    dialogScroll: {
      flex: 1,
    },
    dialogContent: {
      padding: tokens.spacing.xl,
      paddingBottom: tokens.spacing.lg,
    },
    dialogFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.xl,
      paddingVertical: tokens.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: tokens.borderPrimary,
    },
    cancelBtn: {
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.sm + 2,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      backgroundColor: tokens.bgInput,
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      color: tokens.textSecondary,
    },
    submitBtn: {
      paddingHorizontal: tokens.spacing.xl,
      paddingVertical: tokens.spacing.sm + 2,
      borderRadius: tokens.radius.sm,
      backgroundColor: tokens.accentPrimary,
    },
    submitBtnText: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
      color: tokens.textInverse,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    closeBtn: {
      padding: tokens.spacing.xs,
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ─── Form fields ───
    field: {
      marginBottom: tokens.spacing.lg,
    },
    section: {
      marginBottom: tokens.spacing.lg,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
      color: tokens.textPrimary,
      marginBottom: tokens.spacing.md,
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 18,
      marginBottom: tokens.spacing.sm,
      color: tokens.textSecondary,
    },
    labelPrimary: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      marginBottom: tokens.spacing.sm,
      color: tokens.textSecondary,
    },
    labelSmall: {
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 18,
      marginBottom: tokens.spacing.xs,
      color: tokens.textMuted,
    },
    input: {
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      borderRadius: tokens.radius.sm,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: Platform.OS === 'ios' ? tokens.spacing.md : tokens.spacing.sm + 2,
      fontSize: 15,
      lineHeight: 22,
      color: tokens.textPrimary,
      backgroundColor: tokens.bgInput,
    },
    inputPrimary: {
      borderWidth: 1,
      borderRadius: tokens.radius.sm,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: Platform.OS === 'ios' ? tokens.spacing.md + 2 : tokens.spacing.md,
      fontSize: 16,
      lineHeight: 24,
      color: tokens.textPrimary,
      backgroundColor: tokens.bgInput,
    },
    textarea: {
      minHeight: 64,
      textAlignVertical: 'top',
    },

    // ─── Schedule section ───
    scheduleRowDesktop: {
      flexDirection: 'row',
      gap: tokens.spacing.md,
    },
    scheduleFieldDesktop: {
      flex: 1,
    },
    scheduleRowMobile: {
      flexDirection: 'row',
      gap: tokens.spacing.md,
      marginBottom: tokens.spacing.md,
    },
    scheduleFieldMobile: {
      flex: 1,
    },
    scheduleFieldFull: {
      width: '100%',
    },

    // ─── Chips ───
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm,
    },
    chip: {
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
      borderRadius: tokens.radius.full,
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.xs,
      minHeight: 36, // Ensure 44px touch target with padding
    },
    chipDashed: {
      borderColor: tokens.borderSecondary,
      borderStyle: 'dashed',
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 18,
    },

    // ─── New topic form ───
    newTopicRow: {
      gap: tokens.spacing.sm,
    },
    newTopicInput: {
      flex: 1,
    },
    colorRow: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      flexWrap: 'wrap',
    },
    colorSwatch: {
      width: 28,
      height: 28,
      borderRadius: tokens.radius.sm,
    },
    colorSwatchActive: {
      borderWidth: 3,
      borderColor: tokens.bgPrimary,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
        android: { elevation: 4 },
        web: { boxShadow: '0 2px 4px rgba(0,0,0,0.3)' } as any,
      }),
    },
    newTopicActions: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
    smallBtn: {
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
      borderRadius: tokens.radius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.xs,
      minHeight: 36,
    },
    smallBtnOutline: {
      backgroundColor: tokens.bgInput,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
    },
    smallBtnText: {
      fontSize: 13,
      lineHeight: 18,
    },
    smallBtnTextWhite: {
      fontSize: 13,
      lineHeight: 18,
      color: tokens.textInverse,
      fontWeight: '600',
    },

    // ─── More options ───
    moreOptionsToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.md,
      marginBottom: tokens.spacing.md,
      borderRadius: tokens.radius.sm,
      backgroundColor: tokens.bgInput,
      minHeight: 44,
    },
    moreOptionsText: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      color: tokens.textSecondary,
    },
    moreOptionsContent: {
      paddingTop: tokens.spacing.sm,
    },

    // ─── Dependencies ───
    addDepBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      alignSelf: 'flex-start',
      minHeight: 36,
    },
    depChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.xs,
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: tokens.spacing.xs,
      borderRadius: tokens.radius.sm,
      maxWidth: 180,
    },
    depChipText: {
      color: tokens.textInverse,
      fontSize: 12,
      lineHeight: 16,
      flex: 1,
    },
    depList: {
      marginTop: tokens.spacing.sm,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      backgroundColor: tokens.bgInput,
      maxHeight: 180,
      overflow: 'hidden',
    },
    depListCount: {
      fontSize: 11,
      lineHeight: 16,
      color: tokens.textMuted,
      paddingHorizontal: tokens.spacing.md,
      paddingTop: tokens.spacing.sm,
      paddingBottom: tokens.spacing.xs,
    },
    depOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
      minHeight: 44,
    },
    checkbox: {
      width: 16,
      height: 16,
      borderRadius: tokens.radius.xs,
      borderWidth: 1.5,
      flexShrink: 0,
    },
    depTitle: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: tokens.textPrimary,
    },
    depDate: {
      fontSize: 11,
      lineHeight: 16,
      color: tokens.textMuted,
      flexShrink: 0,
    },

    // ─── Subtasks ───
    subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
      borderRadius: tokens.radius.sm,
      marginBottom: tokens.spacing.sm,
      backgroundColor: tokens.bgInput,
      minHeight: 44,
    },
    subtaskTitle: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: tokens.textPrimary,
    },
    subtaskRemoveBtn: {
      padding: tokens.spacing.xs,
      minWidth: 32,
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subtaskAddRow: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      alignItems: 'center',
    },
    subtaskInput: {
      flex: 1,
    },
    subtaskAddBtn: {
      width: 44,
      height: 44,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      backgroundColor: tokens.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ─── Recurrence ───
    customDays: {
      gap: tokens.spacing.sm,
      marginTop: tokens.spacing.md,
    },
    daysRow: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      flexWrap: 'wrap',
    },
    dayBtn: {
      width: 44,
      height: 44,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayBtnText: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
    },
    recurrenceEndDate: {
      marginTop: tokens.spacing.md,
      gap: tokens.spacing.xs,
    },

    // ─── Duplicate warning ───
    dupWarning: {
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: `${tokens.accentOrange}50`,
      backgroundColor: `${tokens.accentOrange}10`,
      padding: tokens.spacing.md,
      marginBottom: tokens.spacing.md,
      gap: tokens.spacing.sm,
    },
    dupWarnHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: tokens.spacing.sm,
    },
    dupWarnText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: tokens.accentOrange,
    },
    dupActions: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      flexWrap: 'wrap',
    },
    dupWarnBtn: {
      backgroundColor: `${tokens.accentOrange}15`,
      borderWidth: 1,
      borderColor: tokens.accentOrange,
    },
  })
}
