import { useMemo } from 'react'
import { Clock, Flag, Link, AlertCircle } from 'lucide-react'
import { PRIORITY_CONFIG } from '../hooks/useProgress'

const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0-23
const HOUR_HEIGHT = 60 // pixels per hour

export default function TimeBlockView({ 
  tasks, 
  getTopicColor,
  onTaskClick,
  areDependenciesMet,
}) {
  // Filter tasks with dueTime and sort by time
  const scheduledTasks = useMemo(() => {
    return tasks
      .filter(t => t.dueTime)
      .map(t => {
        const [hours, minutes] = t.dueTime.split(':').map(Number)
        const startMinutes = hours * 60 + minutes
        const endMinutes = startMinutes + (t.duration || 30)
        return { ...t, startMinutes, endMinutes, hours, minutes }
      })
      .sort((a, b) => a.startMinutes - b.startMinutes)
  }, [tasks])

  // Tasks without scheduled time
  const unscheduledTasks = useMemo(() => {
    return tasks.filter(t => !t.dueTime && !t.completed)
  }, [tasks])

  // Calculate visible hour range (with padding)
  const visibleRange = useMemo(() => {
    if (scheduledTasks.length === 0) {
      // Default to 8am-6pm if no scheduled tasks
      return { start: 8, end: 18 }
    }
    const minHour = Math.max(0, Math.floor(scheduledTasks[0].startMinutes / 60) - 1)
    const maxHour = Math.min(24, Math.ceil(scheduledTasks[scheduledTasks.length - 1].endMinutes / 60) + 1)
    return { start: minHour, end: Math.max(maxHour, minHour + 4) }
  }, [scheduledTasks])

  const formatHour = (hour) => {
    if (hour === 0) return '12 AM'
    if (hour === 12) return '12 PM'
    if (hour < 12) return `${hour} AM`
    return `${hour - 12} PM`
  }

  const formatTime = (hours, minutes) => {
    const h = hours % 12 || 12
    const ampm = hours >= 12 ? 'PM' : 'AM'
    return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`
  }

  // Current time indicator
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const currentHour = now.getHours()
  const showCurrentTime = currentHour >= visibleRange.start && currentHour <= visibleRange.end

  const visibleHours = HOURS.slice(visibleRange.start, visibleRange.end + 1)
  const totalHeight = visibleHours.length * HOUR_HEIGHT

  return (
    <div className="card-static" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ 
          fontSize: 14, 
          fontWeight: 600, 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Clock size={16} />
          Time Blocks
        </h3>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {scheduledTasks.length} scheduled
        </span>
      </div>

      {/* Unscheduled tasks */}
      {unscheduledTasks.length > 0 && (
        <div style={{ 
          padding: '12px 20px', 
          background: 'var(--bg-input)',
          borderBottom: '1px solid var(--border-primary)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Unscheduled ({unscheduledTasks.length})
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {unscheduledTasks.slice(0, 5).map(task => {
              const depMet = areDependenciesMet?.(task) ?? true
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    background: `${getTopicColor(task.topic)}20`,
                    color: getTopicColor(task.topic),
                    border: `1px solid ${getTopicColor(task.topic)}40`,
                    cursor: 'pointer',
                    opacity: depMet ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {!depMet && <Link size={10} />}
                  {task.title.length > 20 ? task.title.slice(0, 20) + '...' : task.title}
                </div>
              )
            })}
            {unscheduledTasks.length > 5 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
                +{unscheduledTasks.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      {scheduledTasks.length > 0 ? (
        <div style={{ position: 'relative', height: totalHeight, margin: '0 20px 20px' }}>
          {/* Hour lines */}
          {visibleHours.map((hour, index) => (
            <div
              key={hour}
              style={{
                position: 'absolute',
                top: index * HOUR_HEIGHT,
                left: 0,
                right: 0,
                display: 'flex',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ 
                width: 50, 
                fontSize: 11, 
                color: 'var(--text-muted)',
                marginTop: -6,
              }}>
                {formatHour(hour)}
              </span>
              <div style={{ 
                flex: 1, 
                borderTop: '1px solid var(--border-primary)',
                marginLeft: 8,
              }} />
            </div>
          ))}

          {/* Current time indicator */}
          {showCurrentTime && (
            <div
              style={{
                position: 'absolute',
                top: ((currentMinutes / 60) - visibleRange.start) * HOUR_HEIGHT,
                left: 58,
                right: 0,
                display: 'flex',
                alignItems: 'center',
                zIndex: 10,
              }}
            >
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent-red)',
                marginRight: -4,
              }} />
              <div style={{
                flex: 1,
                height: 2,
                background: 'var(--accent-red)',
              }} />
            </div>
          )}

          {/* Task blocks */}
          {scheduledTasks.map(task => {
            const top = ((task.startMinutes / 60) - visibleRange.start) * HOUR_HEIGHT
            const height = Math.max(30, (task.duration / 60) * HOUR_HEIGHT - 4)
            const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null
            const depMet = areDependenciesMet?.(task) ?? true

            return (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                style={{
                  position: 'absolute',
                  top: top,
                  left: 66,
                  right: 8,
                  height: height,
                  background: task.completed 
                    ? 'var(--bg-input)' 
                    : `${getTopicColor(task.topic)}20`,
                  border: `2px solid ${task.completed ? 'var(--border-primary)' : getTopicColor(task.topic)}`,
                  borderRadius: 8,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  opacity: depMet ? 1 : 0.6,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'scale(1.01)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ 
                    fontSize: 10, 
                    color: task.completed ? 'var(--text-muted)' : getTopicColor(task.topic),
                    fontWeight: 600,
                  }}>
                    {formatTime(task.hours, task.minutes)}
                  </span>
                  {priorityConfig && (
                    <Flag size={10} color={priorityConfig.color} />
                  )}
                  {!depMet && (
                    <AlertCircle size={10} color="var(--accent-orange)" title="Has unmet dependencies" />
                  )}
                </div>
                <p style={{ 
                  fontSize: 13, 
                  fontWeight: 500, 
                  color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: task.completed ? 'line-through' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {task.title}
                </p>
                {height > 50 && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {task.duration}min
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            No scheduled tasks. Add a due time to see tasks here.
          </p>
        </div>
      )}
    </div>
  )
}
