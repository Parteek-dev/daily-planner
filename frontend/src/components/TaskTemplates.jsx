import { useState } from 'react'
import { Copy, Plus, Trash2, X, Clock, Tag, ChevronDown, ChevronRight } from 'lucide-react'
import { fmtDuration } from '../lib/utils'
import DatePickerField from './DatePickerField'

export default function TaskTemplates({ 
  templates, 
  onAddTemplate, 
  onDeleteTemplate, 
  onCreateFromTemplate,
  topics,
  getTopicColor,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0])

  const handleUseTemplate = (template) => {
    setSelectedTemplate(template)
    setTargetDate(new Date().toISOString().split('T')[0])
    setShowCreateModal(true)
  }

  const handleConfirmCreate = () => {
    if (selectedTemplate && targetDate) {
      onCreateFromTemplate(selectedTemplate.id, targetDate)
      setShowCreateModal(false)
      setSelectedTemplate(null)
    }
  }

  if (templates.length === 0) {
    return null
  }

  return (
    <>
      <div className="card-static" style={{ marginBottom: 20, padding: 0 }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: '100%',
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Copy size={16} color="var(--accent-purple)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Task Templates</span>
            <span style={{ 
              fontSize: 12, 
              color: 'var(--text-muted)',
              background: 'var(--bg-input)',
              padding: '2px 8px',
              borderRadius: 10,
            }}>
              {templates.length}
            </span>
          </div>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {isExpanded && (
          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {templates.map(template => (
              <div
                key={template.id}
                style={{
                  padding: 12,
                  background: 'var(--bg-input)',
                  borderRadius: 10,
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span
                        className="tag"
                        style={{
                          background: `${getTopicColor(template.topic)}20`,
                          color: getTopicColor(template.topic),
                          borderColor: `${getTopicColor(template.topic)}40`,
                          fontSize: 11,
                        }}
                      >
                        {template.topic}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} /> {fmtDuration(template.duration)}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {template.title}
                    </p>
                    {template.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {template.description}
                      </p>
                    )}
                    {template.subtasks && template.subtasks.length > 0 && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {template.subtasks.length} subtask{template.subtasks.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="btn btn-primary"
                      style={{ padding: '6px 10px', fontSize: 12 }}
                      title="Create task from template"
                    >
                      <Plus size={14} /> Use
                    </button>
                    <button
                      onClick={() => onDeleteTemplate(template.id)}
                      className="btn btn-ghost"
                      style={{ padding: 6, color: 'var(--text-muted)' }}
                      title="Delete template"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create from Template Modal */}
      {showCreateModal && selectedTemplate && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                Create from Template
              </h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ 
              padding: 12, 
              background: 'var(--bg-input)', 
              borderRadius: 10, 
              marginBottom: 20,
              border: '1px solid var(--border-primary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  className="tag"
                  style={{
                    background: `${getTopicColor(selectedTemplate.topic)}20`,
                    color: getTopicColor(selectedTemplate.topic),
                    borderColor: `${getTopicColor(selectedTemplate.topic)}40`,
                    fontSize: 11,
                  }}
                >
                  {selectedTemplate.topic}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {fmtDuration(selectedTemplate.duration)}
                </span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                {selectedTemplate.title}
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Schedule for Date
              </label>
              <DatePickerField value={targetDate} onChange={setTargetDate} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleConfirmCreate}
                disabled={!targetDate}
              >
                <Plus size={16} /> Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
