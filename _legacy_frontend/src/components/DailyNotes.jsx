import { useState, useEffect, useRef } from 'react'
import { BookOpen, Save, X, Edit3 } from 'lucide-react'

export default function DailyNotes({ date, note, onSave }) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(note || '')
  const textareaRef = useRef(null)

  useEffect(() => {
    setText(note || '')
  }, [note, date])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to end
      textareaRef.current.setSelectionRange(text.length, text.length)
    }
  }, [isEditing])

  const handleSave = () => {
    onSave(date, text)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setText(note || '')
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel()
    }
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSave()
    }
  }

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  })

  return (
    <div className="card-static tour-daily-notes" style={{ marginTop: 20, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          fontSize: 13, 
          fontWeight: 600, 
          color: 'var(--text-secondary)', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em' 
        }}>
          <BookOpen size={14} />
          Daily Notes
        </h3>
        
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: 12 }}
          >
            <Edit3 size={12} />
            {note ? 'Edit' : 'Add'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="animate-fadeIn">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your thoughts, reflections, or notes for today..."
            className="input"
            style={{
              minHeight: 120,
              resize: 'vertical',
              lineHeight: 1.6,
              fontSize: 14,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Ctrl+Enter to save, Esc to cancel
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleCancel}
                className="btn btn-ghost"
                style={{ padding: '6px 12px', fontSize: 13 }}
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: 13 }}
              >
                <Save size={14} />
                Save
              </button>
            </div>
          </div>
        </div>
      ) : note ? (
        <div 
          onClick={() => setIsEditing(true)}
          style={{
            padding: 12,
            background: 'var(--bg-input)',
            borderRadius: 10,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          className="btn-ghost"
        >
          <p style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            margin: 0,
          }}>
            {note}
          </p>
        </div>
      ) : (
        <div 
          onClick={() => setIsEditing(true)}
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: 10,
            border: '1px dashed var(--border-secondary)',
            transition: 'all 0.15s ease',
          }}
          className="btn-ghost"
        >
          <p style={{ fontSize: 14, marginBottom: 4 }}>No notes for today</p>
          <p style={{ fontSize: 12 }}>Click to add a reflection or journal entry</p>
        </div>
      )}
    </div>
  )
}
