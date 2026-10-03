/**
 * GoalSetting.tsx — daily goal progress card with extra goals.
 *
 * Migrated from frontend/src/components/GoalSetting.jsx.
 * All HTML elements replaced with RN primitives; all CSS replaced with
 * StyleSheet.create() using theme tokens.
 *
 * Requirements: 9.5, 9.6, 9.7, 9.8, 9.9, 9.10
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native'
import {
  Target,
  Minus,
  Plus,
  Trophy,
  CheckCircle2,
  X,
  PlusCircle,
  CheckSquare,
  Timer,
  Flag,
  AlertTriangle,
  Pencil,
} from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'

// ── Types ─────────────────────────────────────────────────────────────────────

type GoalType = 'min_tasks' | 'min_time' | 'all_priority'
type Priority = 'high' | 'medium' | 'low'

export interface Topic {
  name: string
  color: string
}

export interface ExtraGoal {
  id: string
  type: GoalType
  value?: number
  topic?: string
  priority?: Priority
}

export interface ExtraGoalProgress extends ExtraGoal {
  current: number
  target: number
  percent: number
  achieved: boolean
}

export interface GoalProgress {
  target: number
  completed: number
  percent: number
  achieved: boolean
}

export interface GoalSettingProps {
  dailyGoal: number
  onSetGoal: (goal: number) => void
  progress: GoalProgress
  extraGoalsProgress?: ExtraGoalProgress[]
  onAddExtraGoal: (goal: ExtraGoal) => void
  onRemoveExtraGoal: (id: string) => void
  topics?: Topic[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GOAL_TYPES: Array<{ value: GoalType; label: string }> = [
  { value: 'min_tasks', label: 'Complete at least N tasks' },
  { value: 'min_time', label: 'Spend at least X minutes' },
  { value: 'all_priority', label: 'Complete all tasks by priority' },
]

const PRIORITY_OPTIONS: Priority[] = ['high', 'medium', 'low']

function goalLabel(goal: ExtraGoalProgress): string {
  switch (goal.type) {
    case 'min_tasks':
      return goal.topic ? `${goal.topic} tasks (${goal.value}+)` : `Task goal (${goal.value}+)`
    case 'min_time':
      return goal.topic ? `${goal.topic} focus time` : 'Focus time'
    case 'all_priority':
      return `${(goal.priority ?? '').charAt(0).toUpperCase() + (goal.priority ?? '').slice(1)} priority`
    default:
      return 'Goal'
  }
}

function progressColor(achieved: boolean, percent: number, tokens: ReturnType<typeof useTheme>['tokens']): string {
  if (achieved) return tokens.accentGreen
  if (percent >= 60) return tokens.accentBlue
  return tokens.accentOrange
}

// ── AddGoalForm ───────────────────────────────────────────────────────────────

interface AddGoalFormProps {
  topics: Topic[]
  existingGoals: ExtraGoalProgress[]
  onAdd: (goal: ExtraGoal) => void
  onCancel: () => void
}

function AddGoalForm({ topics, existingGoals, onAdd, onCancel }: AddGoalFormProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)

  const [type, setType] = useState<GoalType>('min_tasks')
  const [value, setValue] = useState(3)
  const [topic, setTopic] = useState('')
  const [priority, setPriority] = useState<Priority>('high')
  const [dupError, setDupError] = useState(false)

  const isDuplicate = (goal: Partial<ExtraGoal>): boolean => {
    return existingGoals.some(g => {
      if (g.type !== goal.type) return false
      if (goal.type === 'min_tasks' || goal.type === 'min_time') {
        return (g.topic ?? '') === (goal.topic ?? '')
      }
      if (goal.type === 'all_priority') return g.priority === goal.priority
      return false
    })
  }

  const handleAdd = () => {
    const goal: ExtraGoal = { id: Date.now().toString(), type }
    if (type === 'min_tasks') { goal.value = Math.max(1, value); if (topic) goal.topic = topic }
    if (type === 'min_time') { goal.value = Math.max(5, value); if (topic) goal.topic = topic }
    if (type === 'all_priority') { goal.priority = priority }

    if (isDuplicate(goal)) {
      setDupError(true)
      return
    }
    setDupError(false)
    onAdd(goal)
  }

  return (
    <View style={styles.addFormCard}>
      {/* Type selector */}
      <Text style={[styles.fieldLabel, { color: tokens.textMuted }]}>Goal type</Text>
      <View style={{ gap: 4, marginBottom: 12 }}>
        {GOAL_TYPES.map(gt => (
          <Pressable
            key={gt.value}
            onPress={() => { setType(gt.value); setDupError(false) }}
            style={[
              styles.goalTypeBtn,
              {
                borderColor: type === gt.value ? tokens.accentBlue : tokens.borderPrimary,
                backgroundColor: type === gt.value ? `${tokens.accentBlue}1A` : 'transparent',
              },
            ]}
          >
            <Text style={[
              styles.goalTypeBtnText,
              { color: type === gt.value ? tokens.accentBlue : tokens.textSecondary, fontWeight: type === gt.value ? '600' : '400' },
            ]}>
              {gt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Value stepper */}
      {type !== 'all_priority' && (
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.fieldLabel, { color: tokens.textMuted }]}>
            {type === 'min_time' ? 'Minutes' : 'Task count'}
          </Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => { setValue(v => Math.max(type === 'min_time' ? 5 : 1, v - (type === 'min_time' ? 15 : 1))); setDupError(false) }}
              style={[styles.stepperBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }]}
            >
              <Minus size={14} color={tokens.textPrimary} />
            </Pressable>
            <Text style={[styles.stepperValue, { color: tokens.textPrimary }]}>
              {value}{type === 'min_time' ? 'm' : ''}
            </Text>
            <Pressable
              onPress={() => { setValue(v => v + (type === 'min_time' ? 15 : 1)); setDupError(false) }}
              style={[styles.stepperBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }]}
            >
              <Plus size={14} color={tokens.textPrimary} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Priority picker */}
      {type === 'all_priority' && (
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.fieldLabel, { color: tokens.textMuted }]}>Priority</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {PRIORITY_OPTIONS.map(p => (
              <Pressable
                key={p}
                onPress={() => { setPriority(p); setDupError(false) }}
                style={[
                  styles.priorityBtn,
                  {
                    borderColor: priority === p ? tokens.accentBlue : tokens.borderPrimary,
                    borderWidth: priority === p ? 2 : 1,
                    backgroundColor: priority === p ? `${tokens.accentBlue}1F` : tokens.bgInput,
                  },
                ]}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: priority === p ? tokens.accentBlue : tokens.textSecondary }}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Topic filter */}
      {type !== 'all_priority' && topics.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.fieldLabel, { color: tokens.textMuted }]}>Topic filter (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Pressable
                onPress={() => { setTopic(''); setDupError(false) }}
                style={[styles.topicChip, { borderColor: !topic ? tokens.accentBlue : tokens.borderPrimary, borderWidth: !topic ? 2 : 1, backgroundColor: !topic ? `${tokens.accentBlue}1A` : tokens.bgInput }]}
              >
                <Text style={{ fontSize: 12, color: !topic ? tokens.accentBlue : tokens.textSecondary }}>Any</Text>
              </Pressable>
              {topics.map(t => (
                <Pressable
                  key={t.name}
                  onPress={() => { setTopic(t.name); setDupError(false) }}
                  style={[styles.topicChip, { borderColor: topic === t.name ? t.color : tokens.borderPrimary, borderWidth: topic === t.name ? 2 : 1, backgroundColor: topic === t.name ? `${t.color}20` : tokens.bgInput }]}
                >
                  <Text style={{ fontSize: 12, color: topic === t.name ? t.color : tokens.textSecondary }}>{t.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Duplicate error */}
      {dupError && (
        <View style={styles.dupErrorRow}>
          <AlertTriangle size={13} color="#f97316" />
          <Text style={styles.dupErrorText}>
            A goal of this type{type !== 'all_priority' ? ' for this topic' : ''} already exists.
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.formActions}>
        <Pressable onPress={onCancel} style={[styles.cancelBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }]}>
          <Text style={{ fontSize: 13, color: tokens.textSecondary }}>Cancel</Text>
        </Pressable>
        <Pressable onPress={handleAdd} style={[styles.addBtn, { backgroundColor: tokens.accentBlue }]}>
          <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>Add goal</Text>
        </Pressable>
      </View>
    </View>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GoalSetting({
  dailyGoal,
  onSetGoal,
  progress,
  extraGoalsProgress = [],
  onAddExtraGoal,
  onRemoveExtraGoal,
  topics = [],
}: GoalSettingProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)

  const [isEditing, setIsEditing] = useState(false)
  const [tempGoal, setTempGoal] = useState(dailyGoal)
  const [showAddForm, setShowAddForm] = useState(false)

  const { target, completed, percent, achieved } = progress

  const handleSave = () => { onSetGoal(tempGoal); setIsEditing(false) }

  const goalIconMap: Record<GoalType, React.ReactNode> = {
    min_tasks: <CheckSquare size={14} color="#22c55e" />,
    min_time: <Timer size={14} color="#6366f1" />,
    all_priority: <Flag size={14} color="#ef4444" />,
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Target size={14} color={tokens.textMuted} />
          <Text style={[styles.sectionTitle, { color: tokens.textMuted }]}>Daily Goals</Text>
        </View>
        {!isEditing && !showAddForm && (
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <Pressable
              onPress={() => { setTempGoal(target); setIsEditing(true) }}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Edit goals"
            >
              <Pencil size={14} color={tokens.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => setShowAddForm(true)}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Add goal"
            >
              <Plus size={14} color={tokens.textMuted} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Edit task count */}
      {isEditing ? (
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.editLabel, { color: tokens.textSecondary }]}>Tasks to complete daily:</Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => setTempGoal(p => Math.max(1, p - 1))}
              disabled={tempGoal <= 1}
              style={[styles.stepperBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput, opacity: tempGoal <= 1 ? 0.4 : 1 }]}
            >
              <Minus size={14} color={tokens.textPrimary} />
            </Pressable>
            <Text style={[styles.stepperLarge, { color: tokens.textPrimary }]}>{tempGoal}</Text>
            <Pressable
              onPress={() => setTempGoal(p => Math.min(20, p + 1))}
              disabled={tempGoal >= 20}
              style={[styles.stepperBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput, opacity: tempGoal >= 20 ? 0.4 : 1 }]}
            >
              <Plus size={14} color={tokens.textPrimary} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Pressable onPress={() => setIsEditing(false)} style={[styles.halfBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }]}>
              <Text style={{ fontSize: 13, color: tokens.textSecondary }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={[styles.halfBtn, { backgroundColor: tokens.accentBlue, borderColor: tokens.accentBlue }]}>
              <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {/* Primary goal */}
          <View style={{ marginBottom: extraGoalsProgress.length > 0 ? 14 : 0 }}>
            <View style={styles.goalRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckSquare size={14} color="#22c55e" />
                <Text style={[styles.goalLabel, { color: tokens.textSecondary }]}>Daily tasks</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: achieved ? tokens.accentGreen : tokens.textPrimary }}>
                  {achieved ? '✓ Done' : `${completed} of ${target}`}
                </Text>
                {achieved && <Trophy size={14} color={tokens.accentGreen} />}
              </View>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressBarBg, { backgroundColor: tokens.bgInput }]}>
              <View style={[styles.progressBarFill, {
                width: `${Math.min(100, percent)}%` as any,
                backgroundColor: progressColor(achieved, percent, tokens),
              }]} />
            </View>

            {achieved && completed > target && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                <CheckCircle2 size={11} color={tokens.accentGreen} />
                <Text style={{ fontSize: 11, color: tokens.accentGreen }}>Exceeded by {completed - target} tasks!</Text>
              </View>
            )}
            {!achieved && completed > 0 && (
              <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 4 }}>{target - completed} remaining</Text>
            )}
          </View>

          {/* Extra goals */}
          {extraGoalsProgress.length > 0 && (
            <View style={{ gap: 12 }}>
              <View style={[styles.divider, { backgroundColor: tokens.borderPrimary }]} />
              {extraGoalsProgress.map(goal => (
                <View key={goal.id}>
                  <View style={styles.goalRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      {goalIconMap[goal.type]}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: tokens.textSecondary }}>
                          {goalLabel(goal)}
                        </Text>
                        {goal.topic && (
                          <View style={[styles.topicPill, { backgroundColor: tokens.accentBlue }]}>
                            <Text style={styles.topicPillText}>{goal.topic}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: goal.achieved ? tokens.accentGreen : tokens.textPrimary }}>
                        {goal.achieved
                          ? '✓ Done'
                          : goal.type === 'all_priority' && goal.target === 0
                            ? '—'
                            : goal.type === 'min_time'
                              ? `${goal.current}m / ${goal.target}m`
                              : `${goal.current} of ${goal.target}`
                        }
                      </Text>
                      {goal.achieved && <CheckCircle2 size={13} color={tokens.accentGreen} />}
                      <Pressable
                        onPress={() => onRemoveExtraGoal(goal.id)}
                        style={{ padding: 2 }}
                        accessibilityLabel="Remove goal"
                      >
                        <X size={13} color={tokens.textMuted} />
                      </Pressable>
                    </View>
                  </View>

                  {goal.type === 'all_priority' && goal.target === 0 ? (
                    <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 3 }}>Nothing to do here today</Text>
                  ) : goal.type !== 'all_priority' || goal.target > 0 ? (
                    <View style={[styles.progressBarBg, { backgroundColor: tokens.bgInput, height: 5, marginTop: 6 }]}>
                      <View style={[styles.progressBarFill, {
                        width: `${Math.min(100, goal.percent)}%` as any,
                        backgroundColor: progressColor(goal.achieved, goal.percent, tokens),
                      }]} />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Add goal form */}
      {showAddForm && (
        <View style={{ marginTop: 14 }}>
          {!isEditing && extraGoalsProgress.length > 0 && (
            <View style={[styles.divider, { backgroundColor: tokens.borderPrimary, marginBottom: 14 }]} />
          )}
          <AddGoalForm
            topics={topics}
            existingGoals={extraGoalsProgress}
            onAdd={(g) => { onAddExtraGoal(g); setShowAddForm(false) }}
            onCancel={() => setShowAddForm(false)}
          />
        </View>
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
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.borderPrimary,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 20,
    },
    smallBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
    },
    iconBtn: {
      padding: 6,
      borderRadius: 8,
    },
    editLabel: {
      fontSize: 13,
      marginBottom: 10,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stepperBtn: {
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperValue: {
      fontSize: 22,
      fontWeight: '700',
      minWidth: 44,
      textAlign: 'center',
    },
    stepperLarge: {
      fontSize: 28,
      fontWeight: '700',
      minWidth: 48,
      textAlign: 'center',
    },
    halfBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    goalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 6,
      flexWrap: 'wrap',
    },
    goalLabel: {
      fontSize: 13,
      fontWeight: '500',
    },
    progressBarBg: {
      height: 7,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    divider: {
      height: 1,
    },
    topicPill: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 10,
      opacity: 0.85,
    },
    topicPillText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#fff',
    },
    addFormCard: {
      padding: 14,
      backgroundColor: 'transparent',
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 6,
    },
    goalTypeBtn: {
      textAlign: 'left',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
    },
    goalTypeBtnText: {
      fontSize: 13,
    },
    priorityBtn: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 8,
    },
    topicChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 16,
    },
    dupErrorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 8,
    },
    dupErrorText: {
      fontSize: 12,
      color: '#f97316',
      fontWeight: '500',
    },
    formActions: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'flex-end',
    },
    cancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    addBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
  })
}
