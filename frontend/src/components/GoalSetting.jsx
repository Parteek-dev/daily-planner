import { useState } from 'react'
import { Target, Minus, Plus, Trophy, CheckCircle2, Trash2, PlusCircle, X } from 'lucide-react'

const GOAL_TYPES = [
  { value: 'min_tasks',    label: 'Complete at least N tasks' },
  { value: 'min_time',     label: 'Spend at least X minutes'  },
  { value: 'all_priority', label: 'Complete all tasks by priority' },
]

const PRIORITY_OPTIONS = ['high', 'medium', 'low']

const GOAL_ICONS = {
  min_tasks:    '✅',
  min_time:     '⏱',
  all_priority: '🚩',
}

function goalLabel(goal) {
  switch (goal.type) {
    case 'min_tasks':
      return goal.topic
        ? `Complete ${goal.value}+ ${goal.topic} tasks`
        : `Complete ${goal.value}+ tasks`
    case 'min_time':
      return goal.topic
        ? `Spend ${goal.value}min on ${goal.topic}`
        : `Spend ${goal.value}min on any topic`
    case 'all_priority':
      return `Complete all ${goal.priority}-priority tasks`
    default:
      return 'Goal'
  }
}

function progressColor(achieved, percent) {
  if (achieved) return 'var(--accent-green)'
  if (percent >= 60) return 'var(--accent-blue)'
  return 'var(--accent-orange)'
}

// ── Add Goal Form ────────────────────────────────────────────────────────────

function AddGoalForm({ topics, existingGoals = [], onAdd, onCancel }) {
  const [type,     setType]     = useState('min_tasks')
  const [value,    setValue]    = useState(3)
  const [topic,    setTopic]    = useState('')
  const [priority, setPriority] = useState('high')
  const [dupError, setDupError] = useState(false)

  const isDuplicate = (goal) => {
    return existingGoals.some(g => {
      if (g.type !== goal.type) return false
      // For task/time goals: duplicate if same topic (any topic = undefined/empty)
      if (goal.type === 'min_tasks' || goal.type === 'min_time') {
        return (g.topic || '') === (goal.topic || '')
      }
      // For priority goals: duplicate if same priority level
      if (goal.type === 'all_priority') return g.priority === goal.priority
      return false
    })
  }

  const handleAdd = () => {
    const goal = { type }
    if (type === 'min_tasks')    { goal.value = Math.max(1, value); if (topic) goal.topic = topic }
    if (type === 'min_time')     { goal.value = Math.max(5, value); if (topic) goal.topic = topic }
    if (type === 'all_priority') { goal.priority = priority }

    if (isDuplicate(goal)) {
      setDupError(true)
      return
    }
    setDupError(false)
    onAdd(goal)
  }

  return (
    <div style={{
      padding: '14px 16px',
      background: 'var(--bg-input)',
      borderRadius: 12,
      border: '1px solid var(--border-primary)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Type selector */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Goal type</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {GOAL_TYPES.map(gt => (
            <button
              key={gt.value}
              type="button"
              onClick={() => { setType(gt.value); setDupError(false) }}
              style={{
                textAlign: 'left', padding: '7px 10px', borderRadius: 8,
                border: `1px solid ${type === gt.value ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                background: type === gt.value ? 'rgba(59,130,246,0.1)' : 'transparent',
                color: type === gt.value ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 13, fontWeight: type === gt.value ? 600 : 400,
              }}
            >
              {GOAL_ICONS[gt.value]} {gt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Value (not for all_priority) */}
      {type !== 'all_priority' && (
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
            {type === 'min_time' ? 'Minutes' : 'Task count'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }}
              onClick={() => { setValue(v => Math.max(type === 'min_time' ? 5 : 1, v - (type === 'min_time' ? 15 : 1))); setDupError(false) }}>
              <Minus size={14} />
            </button>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', minWidth: 44, textAlign: 'center' }}>
              {value}{type === 'min_time' ? 'm' : ''}
            </span>
            <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }}
              onClick={() => { setValue(v => v + (type === 'min_time' ? 15 : 1)); setDupError(false) }}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Priority picker */}
      {type === 'all_priority' && (
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Priority</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {PRIORITY_OPTIONS.map(p => (
              <button key={p} type="button"
                onClick={() => { setPriority(p); setDupError(false) }}
                style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer',
                  border: priority === p ? '2px solid var(--accent-blue)' : '1px solid var(--border-primary)',
                  background: priority === p ? 'rgba(59,130,246,0.12)' : 'var(--bg-input)',
                  color: priority === p ? 'var(--accent-blue)' : 'var(--text-secondary)',
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Topic filter (not for all_priority) */}
      {type !== 'all_priority' && topics.length > 0 && (
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
            Topic filter <span style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button"
              onClick={() => { setTopic(''); setDupError(false) }}
              style={{
                padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
                border: !topic ? '2px solid var(--accent-blue)' : '1px solid var(--border-primary)',
                background: !topic ? 'rgba(59,130,246,0.1)' : 'var(--bg-input)',
                color: !topic ? 'var(--accent-blue)' : 'var(--text-secondary)',
              }}
            >
              Any
            </button>
            {topics.map(t => (
              <button key={t.name} type="button"
                onClick={() => { setTopic(t.name); setDupError(false) }}
                style={{
                  padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
                  border: topic === t.name ? `2px solid ${t.color}` : '1px solid var(--border-primary)',
                  background: topic === t.name ? `${t.color}20` : 'var(--bg-input)',
                  color: topic === t.name ? t.color : 'var(--text-secondary)',
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dupError && (
          <p style={{ fontSize: 12, color: '#f97316', fontWeight: 500, margin: 0 }}>
            ⚠️ A goal of this type{type !== 'all_priority' ? ' for this topic' : ''} already exists.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ fontSize: 13 }}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleAdd} style={{ fontSize: 13 }}>Add goal</button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function GoalSetting({ dailyGoal, onSetGoal, progress, extraGoalsProgress = [], onAddExtraGoal, onRemoveExtraGoal, topics = [] }) {  const [isEditing,   setIsEditing]   = useState(false)
  const [tempGoal,    setTempGoal]    = useState(dailyGoal)
  const [showAddForm, setShowAddForm] = useState(false)

  const { target, completed, percent, achieved } = progress

  const handleSave = () => { onSetGoal(tempGoal); setIsEditing(false) }

  return (
    <div className="card-static">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={14} /> Daily Goals
        </h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {!isEditing && !showAddForm && (
            <>
              <button onClick={() => { setTempGoal(target); setIsEditing(true) }} className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }}>
                Edit
              </button>
              <button onClick={() => setShowAddForm(true)} className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-blue)' }}>
                <PlusCircle size={12} /> Add
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit task count */}
      {isEditing ? (
        <div className="animate-fadeIn" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>Tasks to complete daily:</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <button onClick={() => setTempGoal(p => Math.max(1, p - 1))} className="btn btn-secondary" style={{ padding: 8, width: 34, height: 34 }} disabled={tempGoal <= 1}>
              <Minus size={14} />
            </button>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', minWidth: 48, textAlign: 'center' }}>{tempGoal}</span>
            <button onClick={() => setTempGoal(p => Math.min(20, p + 1))} className="btn btn-secondary" style={{ padding: 8, width: 34, height: 34 }} disabled={tempGoal >= 20}>
              <Plus size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }}>Cancel</button>
            <button onClick={handleSave} className="btn btn-primary" style={{ flex: 1, fontSize: 13 }}>Save</button>
          </div>
        </div>
      ) : (
        <>
          {/* Primary goal: task count */}
          <div style={{ marginBottom: extraGoalsProgress.length > 0 ? 14 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>✅</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Complete {target}+ tasks
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: achieved ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                  {completed}/{target}
                </span>
                {achieved && <Trophy size={14} color="var(--accent-green)" />}
              </div>
            </div>
            <div className="progress-bar" style={{ height: 7 }}>
              <div className="progress-bar-fill" style={{
                width: `${percent}%`,
                background: progressColor(achieved, percent),
                transition: 'width 0.4s ease',
              }} />
            </div>
            {achieved && completed > target && (
              <p style={{ fontSize: 11, color: 'var(--accent-green)', marginTop: 4 }}>
                <CheckCircle2 size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                Exceeded by {completed - target} tasks!
              </p>
            )}
            {!achieved && completed > 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {target - completed} more to go
              </p>
            )}
          </div>

          {/* Extra goals */}
          {extraGoalsProgress.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ height: 1, background: 'var(--border-primary)' }} />
              {extraGoalsProgress.map(goal => (
                <div key={goal.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, flexShrink: 0 }}>{GOAL_ICONS[goal.type]}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', minWidth: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                          {goalLabel(goal)}
                        </span>
                        {goal.topic && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '1px 6px',
                            borderRadius: 10, background: 'var(--accent-blue)', opacity: 0.85,
                            color: 'white', whiteSpace: 'nowrap',
                          }}>
                            {goal.topic}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: goal.achieved ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                        {goal.type === 'min_time' ? `${goal.current}/${goal.target}m` : `${goal.current}/${goal.target}`}
                      </span>
                      {goal.achieved && <CheckCircle2 size={13} color="var(--accent-green)" />}
                      <button
                        onClick={() => onRemoveExtraGoal(goal.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 4 }}
                        title="Remove goal"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                  {goal.type !== 'all_priority' || goal.target > 0 ? (
                    <div className="progress-bar" style={{ height: 5 }}>
                      <div className="progress-bar-fill" style={{
                        width: `${goal.percent}%`,
                        background: progressColor(goal.achieved, goal.percent),
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  ) : (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No {goal.priority}-priority tasks today</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add goal form */}
      {showAddForm && (
        <div style={{ marginTop: isEditing ? 0 : 14 }}>
          {!isEditing && extraGoalsProgress.length > 0 && <div style={{ height: 1, background: 'var(--border-primary)', marginBottom: 14 }} />}
          <AddGoalForm
            topics={topics}
            existingGoals={extraGoalsProgress}
            onAdd={(g) => { onAddExtraGoal(g); setShowAddForm(false) }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}
    </div>
  )
}
