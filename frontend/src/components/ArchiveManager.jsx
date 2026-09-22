import { useState } from 'react'
import { Archive, RotateCcw, Trash2, Calendar, Clock, Search, X } from 'lucide-react'
import { fmtDuration } from '../lib/utils'

export default function ArchiveManager({ 
  isOpen, 
  onClose, 
  archivedTasks, 
  onRestore, 
  onDelete,
  onArchiveOld,
  getTopicColor,
}) {
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  if (!isOpen) return null

  const filteredTasks = archivedTasks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.topic.toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Archive size={20} color="var(--accent-blue)" />
            Archived Tasks
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>
              ({archivedTasks.length})
            </span>
          </h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Auto-archive button */}
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          marginBottom: 16,
          padding: 12,
          background: 'var(--bg-input)',
          borderRadius: 10,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>Auto-Archive</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Archive completed tasks older than 7 days</p>
          </div>
          <button 
            className="btn btn-secondary"
            onClick={() => onArchiveOld(7)}
            style={{ alignSelf: 'center' }}
          >
            <Archive size={14} /> Archive Old
          </button>
        </div>

        {/* Search */}
        {archivedTasks.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search archived tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-primary)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: 14,
              }}
            />
          </div>
        )}

        {/* Task list */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
          {filteredTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Archive size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>
                {archivedTasks.length === 0 
                  ? 'No archived tasks yet' 
                  : 'No tasks match your search'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredTasks.map(task => (
                <div 
                  key={task.id}
                  style={{
                    background: 'var(--bg-input)',
                    borderRadius: 10,
                    padding: 14,
                    borderLeft: `3px solid ${getTopicColor(task.topic)}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        fontSize: 14, 
                        fontWeight: 500, 
                        color: 'var(--text-primary)',
                        marginBottom: 6,
                      }}>
                        {task.title}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: 2, 
                            background: getTopicColor(task.topic),
                          }} />
                          {task.topic}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} />
                          {formatDate(task.date)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} />
                          {fmtDuration(task.duration)}
                        </span>
                        {task.archivedAt && (
                          <span style={{ color: 'var(--text-muted)' }}>
                            Archived {formatDate(task.archivedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => onRestore(task.id)}
                        className="btn btn-ghost"
                        style={{ padding: 8 }}
                        title="Restore task"
                      >
                        <RotateCcw size={16} color="var(--accent-green)" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(task.id)}
                        className="btn btn-ghost"
                        style={{ padding: 8 }}
                        title="Delete permanently"
                      >
                        <Trash2 size={16} color="var(--accent-red)" />
                      </button>
                    </div>
                  </div>

                  {/* Delete confirmation */}
                  {confirmDelete === task.id && (
                    <div style={{ 
                      marginTop: 12, 
                      padding: 12, 
                      background: 'rgba(239,68,68,0.1)', 
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: 13, color: 'var(--accent-red)' }}>Delete permanently?</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          className="btn btn-ghost" 
                          onClick={() => setConfirmDelete(null)}
                          style={{ fontSize: 12, padding: '4px 10px' }}
                        >
                          Cancel
                        </button>
                        <button 
                          className="btn btn-danger" 
                          onClick={() => { onDelete(task.id); setConfirmDelete(null) }}
                          style={{ fontSize: 12, padding: '4px 10px' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-secondary" onClick={onClose} style={{ width: '100%' }}>
          Close
        </button>
      </div>
    </div>
  )
}
