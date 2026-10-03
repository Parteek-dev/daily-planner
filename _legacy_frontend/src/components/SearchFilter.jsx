import { useState } from 'react'
import { Search, Filter, X, ChevronDown } from 'lucide-react'

export default function SearchFilter({ 
  value, 
  onChange, 
  topics = [],
  selectedTopic,
  onTopicChange,
  statusFilter, // 'all' | 'completed' | 'pending'
  onStatusChange,
  placeholder = "Search tasks...",
  showFilters = true,
}) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  const hasActiveFilters = selectedTopic || statusFilter !== 'all'

  const clearFilters = () => {
    onChange('')
    onTopicChange?.('')
    onStatusChange?.('all')
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Search bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: showFilters ? 12 : 0 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search 
            size={16} 
            style={{ 
              position: 'absolute', 
              left: 12, 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--text-muted)' 
            }} 
          />
          <input
            type="text"
            className="input"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
          {value && (
            <button
              onClick={() => onChange('')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        {showFilters && (
          <button
            className={`btn ${hasActiveFilters ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            style={{ padding: '10px 14px', position: 'relative' }}
          >
            <Filter size={16} />
            <ChevronDown size={14} style={{ transform: showFilterDropdown ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
            {hasActiveFilters && (
              <span style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent-orange)',
              }} />
            )}
          </button>
        )}
      </div>

      {/* Filter dropdown */}
      {showFilters && showFilterDropdown && (
        <div 
          className="card-static animate-fadeIn" 
          style={{ padding: 16 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Filters</span>
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: 12 }}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Status filter */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              Status
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'completed', label: 'Completed' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onStatusChange?.(opt.value)}
                  className={`btn ${statusFilter === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: 12, flex: 1 }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topic filter */}
          {topics.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                Topic
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => onTopicChange?.('')}
                  className={`btn ${!selectedTopic ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  All
                </button>
                {topics.map(t => (
                  <button
                    key={t.name}
                    onClick={() => onTopicChange?.(t.name)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      borderRadius: 10,
                      cursor: 'pointer',
                      border: selectedTopic === t.name ? `2px solid ${t.color}` : '1px solid var(--border-primary)',
                      background: selectedTopic === t.name ? `${t.color}20` : 'var(--bg-input)',
                      color: selectedTopic === t.name ? t.color : 'var(--text-secondary)',
                      fontWeight: 500,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Filter helper function to use with tasks
export function filterTasks(tasks, { searchQuery, topicFilter, statusFilter }) {
  return tasks.filter(task => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        task.title.toLowerCase().includes(query) ||
        (task.description || '').toLowerCase().includes(query) ||
        task.topic.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Topic filter
    if (topicFilter && task.topic !== topicFilter) return false

    // Status filter
    if (statusFilter === 'completed' && !task.completed) return false
    if (statusFilter === 'pending' && task.completed) return false

    return true
  })
}
