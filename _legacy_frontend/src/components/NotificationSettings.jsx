import { Bell, BellOff, Clock, AlertCircle } from 'lucide-react'

export default function NotificationSettings({
  isSupported,
  permission,
  enabled,
  reminderMinutes,
  onToggle,
  onUpdateMinutes,
}) {
  const isBlocked = permission === 'denied'
  const isPending = permission === 'default'

  return (
    <div className="card-static" style={{ padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: enabled ? 16 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {enabled ? (
            <Bell size={18} color="var(--accent-blue)" />
          ) : (
            <BellOff size={18} color="var(--text-muted)" />
          )}
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Task Reminders
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {!isSupported && 'Not supported in this browser'}
              {isSupported && isBlocked && 'Notifications blocked - enable in browser settings'}
              {isSupported && isPending && 'Get reminded before tasks are due'}
              {isSupported && permission === 'granted' && (enabled ? 'Active' : 'Disabled')}
            </p>
          </div>
        </div>
        
        {isSupported && !isBlocked && (
          <button
            onClick={onToggle}
            className={`btn ${enabled ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            {enabled ? 'On' : 'Off'}
          </button>
        )}
        
        {isBlocked && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6, 
            color: 'var(--accent-red)', 
            fontSize: 12 
          }}>
            <AlertCircle size={14} />
            Blocked
          </div>
        )}
      </div>

      {enabled && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--border-primary)',
        }}>
          <Clock size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Remind me
          </span>
          <select
            value={reminderMinutes}
            onChange={(e) => onUpdateMinutes(e.target.value)}
            className="input"
            style={{ 
              width: 'auto', 
              padding: '6px 10px', 
              fontSize: 13,
              background: 'var(--bg-input)',
            }}
          >
            <option value="1">1 minute</option>
            <option value="5">5 minutes</option>
            <option value="10">10 minutes</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
          </select>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            before due time
          </span>
        </div>
      )}
    </div>
  )
}
