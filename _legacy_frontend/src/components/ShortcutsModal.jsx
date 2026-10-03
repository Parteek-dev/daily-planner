import { X, Keyboard } from 'lucide-react'
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts'

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
            <Keyboard size={20} />
            Keyboard Shortcuts
          </h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SHORTCUTS.map(({ key, description }) => (
            <div 
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'var(--bg-input)',
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                {description}
              </span>
              <kbd style={{
                padding: '4px 10px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-secondary)',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'monospace',
                color: 'var(--text-primary)',
                boxShadow: '0 2px 0 var(--border-primary)',
              }}>
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <p style={{ 
          marginTop: 16, 
          fontSize: 12, 
          color: 'var(--text-muted)', 
          textAlign: 'center' 
        }}>
          Press <kbd style={{ padding: '2px 6px', background: 'var(--bg-input)', borderRadius: 4, fontSize: 11 }}>?</kbd> anytime to show this help
        </p>
      </div>
    </div>
  )
}
