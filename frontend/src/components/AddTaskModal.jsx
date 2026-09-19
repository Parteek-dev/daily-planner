import { useState, useEffect } from 'react'
import { X, Plus, Clock, Calendar, Tag, ListChecks, Repeat, Trash2, Copy, Flag, Link, AlertTriangle } from 'lucide-react'

const PRESET_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7', 
  '#ef4444', '#14b8a6', '#f59e0b', '#ec4899'
]

const PRIORITY_OPTIONS = [
  { value: null, label: 'None', color: 'var(--text-muted)' },
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'medium', label: 'Medium', color: '#f97316' },
  { value: 'low', label: 'Low', color: '#22c55e' },
]

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays (Mon-Fri)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom days' },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

export default function AddTaskModal({ 
  isOpen, 
  onClose, 
  onSave, 
  topics, 
  onAddTopic,
  editTask = null, // If editing, pass the task
  defaultDate = null,
  onSaveAsTemplate = null, // Optional: save as template callback
  availableTasks = [], // For dependency selection
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState(30)
  const [date, setDate] = useState('')
  const [dueTime, setDueTime] = useState('') // New: due time
  const [priority, setPriority] = useState(null)
  const [dependsOn, setDependsOn] = useState([])
  
  // Subtasks
  const [subtasks, setSubtasks] = useState([])
  const [newSubtask, setNewSubtask] = useState('')
  
  // Recurrence
  const [recurrence, setRecurrence] = useState('none')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [customRecurrenceDays, setCustomRecurrenceDays] = useState([])
  
  // New topic form
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [newTopicColor, setNewTopicColor] = useState(PRESET_COLORS[0])
  
  // Dependencies selector
  const [showDependencies, setShowDependencies] = useState(false)

  // Duplicate warning state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editTask) {
        setTitle(editTask.title)
        setDescription(editTask.description || '')
        setTopic(editTask.topic)
        setDuration(editTask.duration)
        setDate(editTask.date)
        setDueTime(editTask.dueTime || '')
        setPriority(editTask.priority || null)
        setDependsOn(editTask.dependsOn || [])
        setSubtasks(editTask.subtasks || [])
        setRecurrence(editTask.recurrence || 'none')
        setRecurrenceEndDate(editTask.recurrenceEndDate || '')
        setCustomRecurrenceDays(editTask.customRecurrenceDays || [])
      } else {
        setTitle('')
        setDescription('')
        setTopic(topics[0]?.name || '')
        setDuration(30)
        setDate(defaultDate || new Date().toISOString().split('T')[0])
        setDueTime('')
        setPriority(null)
        setDependsOn([])
        setSubtasks([])
        setRecurrence('none')
        setRecurrenceEndDate('')
        setCustomRecurrenceDays([])
      }
      setShowNewTopic(false)
      setShowDependencies(false)
      setNewSubtask('')
      setShowDuplicateWarning(false)
    }
  }, [isOpen, editTask, topics, defaultDate])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return

    // Check for duplicate title on the same date (skip when editing the same task)
    const isDuplicate = availableTasks.some(t =>
      t.title.trim().toLowerCase() === title.trim().toLowerCase() &&
      t.date === date &&
      t.id !== editTask?.id
    )

    if (isDuplicate && !showDuplicateWarning) {
      setShowDuplicateWarning(true)
      return
    }

    saveTask()
  }

  const saveTask = () => {
    onSave({
      id: editTask?.id,
      title: title.trim(),
      description: description.trim(),
      topic: topic || 'Personal',
      duration: parseInt(duration) || 30,
      date,
      dueTime: dueTime || null,
      priority: priority || null,
      dependsOn: dependsOn.length > 0 ? dependsOn : null,
      subtasks,
      recurrence,
      recurrenceEndDate: recurrenceEndDate || null,
      customRecurrenceDays: recurrence === 'custom' ? customRecurrenceDays : null,
    })
    onClose()
  }

  const toggleDependency = (taskId) => {
    setDependsOn(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  // Filter available tasks for dependencies (exclude self, completed tasks on other dates)
  const dependencyOptions = availableTasks.filter(t => 
    t.id !== editTask?.id && !t.completed
  )

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, { 
        id: Date.now().toString(), 
        title: newSubtask.trim(), 
        completed: false 
      }])
      setNewSubtask('')
    }
  }

  const handleRemoveSubtask = (id) => {
    setSubtasks(subtasks.filter(s => s.id !== id))
  }

  const toggleCustomDay = (day) => {
    if (customRecurrenceDays.includes(day)) {
      setCustomRecurrenceDays(customRecurrenceDays.filter(d => d !== day))
    } else {
      setCustomRecurrenceDays([...customRecurrenceDays, day].sort())
    }
  }

  const handleAddNewTopic = () => {
    if (newTopicName.trim()) {
      onAddTopic(newTopicName.trim(), newTopicColor)
      setTopic(newTopicName.trim())
      setShowNewTopic(false)
      setNewTopicName('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
            {editTask ? 'Edit Task' : 'Add New Task'}
          </h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Task Title *
            </label>
            <input
              type="text"
              className="input"
              placeholder="What do you need to do?"
              value={title}
              onChange={e => { setTitle(e.target.value); setShowDuplicateWarning(false) }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Description (optional)
            </label>
            <textarea
              className="input"
              placeholder="Add details..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              style={{ resize: 'vertical', minHeight: 60 }}
            />
          </div>

          {/* Topic */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <Tag size={14} /> Topic
            </label>
            {!showNewTopic ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {topics.map(t => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setTopic(t.name)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: topic === t.name ? `2px solid ${t.color}` : '1px solid var(--border-primary)',
                      background: topic === t.name ? `${t.color}20` : 'var(--bg-input)',
                      color: topic === t.name ? t.color : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowNewTopic(true)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: '1px dashed var(--border-secondary)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Plus size={14} /> New
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Topic name"
                  value={newTopicName}
                  onChange={e => setNewTopicName(e.target.value)}
                  style={{ flex: 1, minWidth: 120 }}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewTopicColor(c)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: c,
                        border: newTopicColor === c ? '2px solid white' : 'none',
                        cursor: 'pointer',
                        boxShadow: newTopicColor === c ? '0 0 0 2px var(--accent-blue)' : 'none',
                      }}
                    />
                  ))}
                </div>
                <button type="button" className="btn btn-primary" onClick={handleAddNewTopic} style={{ padding: '6px 12px' }}>
                  Add
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewTopic(false)} style={{ padding: '6px 12px' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Duration, Date & Time row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <Clock size={14} /> Duration (min)
              </label>
              <input
                type="number"
                className="input"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                min={1}
                max={480}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <Calendar size={14} /> Date
              </label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <Clock size={14} /> Time
              </label>
              <input
                type="time"
                className="input"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Priority */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <Flag size={14} /> Priority
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value ?? 'none'}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: priority === opt.value ? `2px solid ${opt.color}` : '1px solid var(--border-primary)',
                    background: priority === opt.value ? `${opt.color}20` : 'var(--bg-input)',
                    color: priority === opt.value ? opt.color : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dependencies */}
          {dependencyOptions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <Link size={14} /> Depends On
              </label>
              
              {dependsOn.length > 0 && (
                <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {dependsOn.map(depId => {
                    const depTask = availableTasks.find(t => t.id === depId)
                    return depTask ? (
                      <span
                        key={depId}
                        onClick={() => toggleDependency(depId)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          background: 'var(--accent-blue)',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {depTask.title}
                        <X size={12} />
                      </span>
                    ) : null
                  })}
                </div>
              )}
              
              <button
                type="button"
                onClick={() => setShowDependencies(!showDependencies)}
                className="btn btn-ghost"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                {showDependencies ? 'Hide tasks' : `+ Add dependency (${dependencyOptions.length} available)`}
              </button>
              
              {showDependencies && (
                <div style={{ 
                  marginTop: 8, 
                  maxHeight: 150, 
                  overflowY: 'auto',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  padding: 8,
                }}>
                  {dependencyOptions.map(task => (
                    <div
                      key={task.id}
                      onClick={() => toggleDependency(task.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: dependsOn.includes(task.id) ? 'rgba(59,130,246,0.15)' : 'transparent',
                        marginBottom: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={dependsOn.includes(task.id)}
                        onChange={() => {}}
                        style={{ pointerEvents: 'none' }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{task.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({task.date})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subtasks */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <ListChecks size={14} /> Subtasks (optional)
            </label>
            
            {subtasks.length > 0 && (
              <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {subtasks.map(s => (
                  <div key={s.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8,
                    padding: '8px 10px',
                    background: 'var(--bg-input)',
                    borderRadius: 8,
                  }}>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{s.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(s.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="input"
                placeholder="Add a subtask..."
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                style={{ flex: 1 }}
              />
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleAddSubtask}
                style={{ padding: '10px 14px' }}
                disabled={!newSubtask.trim()}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Recurrence */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <Repeat size={14} /> Repeat
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: recurrence !== 'none' ? 12 : 0 }}>
              {RECURRENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRecurrence(opt.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: recurrence === opt.value ? '2px solid var(--accent-blue)' : '1px solid var(--border-primary)',
                    background: recurrence === opt.value ? 'rgba(59,130,246,0.15)' : 'var(--bg-input)',
                    color: recurrence === opt.value ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            
            {/* Custom days selector */}
            {recurrence === 'custom' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Select days:
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleCustomDay(day.value)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: customRecurrenceDays.includes(day.value) ? '2px solid var(--accent-blue)' : '1px solid var(--border-primary)',
                        background: customRecurrenceDays.includes(day.value) ? 'var(--accent-blue)' : 'var(--bg-input)',
                        color: customRecurrenceDays.includes(day.value) ? 'white' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* End date for recurring tasks */}
            {recurrence !== 'none' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  End date (optional):
                </label>
                <input
                  type="date"
                  className="input"
                  value={recurrenceEndDate}
                  onChange={e => setRecurrenceEndDate(e.target.value)}
                  min={date}
                  style={{ maxWidth: 180 }}
                />
              </div>
            )}
          </div>

          {/* Duplicate warning */}
          {showDuplicateWarning && (
            <div style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(249,115,22,0.1)',
              border: '1px solid rgba(249,115,22,0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <p style={{ fontSize: 13, color: '#f97316', fontWeight: 500, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} color="#f97316" style={{ flexShrink: 0 }} />
                A task named <strong>"{title.trim()}"</strong> already exists on this date. Add it anyway?
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowDuplicateWarning(false)}
                  style={{ padding: '6px 14px', fontSize: 13 }}
                >
                  Go back
                </button>
                <button
                  type="button"
                  onClick={saveTask}
                  style={{
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: '1px solid #f97316',
                    background: 'rgba(249,115,22,0.15)',
                    color: '#f97316',
                    cursor: 'pointer',
                  }}
                >
                  Add anyway
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {onSaveAsTemplate && !editTask && title.trim() && (
                <button 
                  type="button" 
                  className="btn btn-ghost"
                  onClick={() => {
                    onSaveAsTemplate({
                      title: title.trim(),
                      description: description.trim(),
                      topic: topic || 'Personal',
                      duration: parseInt(duration) || 30,
                      subtasks: subtasks.map(s => ({ ...s, completed: false })),
                    })
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-purple)' }}
                >
                  <Copy size={14} /> Save as Template
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editTask ? 'Save Changes' : 'Add Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
