import { Sun, Moon, Palette, Check, SunMoon } from 'lucide-react'
import { useTheme, ACCENT_COLORS } from '../hooks/useTheme.jsx'

export default function ThemeCustomizer({ isOpen, onClose }) {
  const { theme, themeMode, setThemeMode, accentColor, setAccentColor } = useTheme()

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <h2 style={{ 
          fontSize: 18, 
          fontWeight: 600, 
          color: 'var(--text-primary)', 
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Palette size={20} color="var(--accent-blue)" />
          Customize Theme
        </h2>

        {/* Light/Dark/Auto Mode */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Mode
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { mode: 'light', label: 'Light', Icon: Sun },
              { mode: 'dark',  label: 'Dark',  Icon: Moon },
              { mode: 'auto',  label: 'Auto',  Icon: SunMoon },
            ].map(({ mode, label, Icon }) => (
              <button
                key={mode}
                onClick={() => setThemeMode(mode)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: 16,
                  background: themeMode === mode ? 'var(--accent-blue)' : 'var(--bg-input)',
                  border: `2px solid ${themeMode === mode ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={24} color={themeMode === mode ? 'white' : 'var(--text-secondary)'} />
                <span style={{ fontSize: 13, fontWeight: 500, color: themeMode === mode ? 'white' : 'var(--text-secondary)' }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
          {themeMode === 'auto' && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Follows your system's dark/light preference automatically.
            </p>
          )}
        </div>

        {/* Accent Color */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Accent Color
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {ACCENT_COLORS.map(color => (
              <button
                key={color.value}
                onClick={() => setAccentColor(color.value)}
                title={color.name}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  background: color.value,
                  border: accentColor === color.value ? '3px solid white' : 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: accentColor === color.value 
                    ? `0 0 0 2px var(--bg-secondary), 0 0 0 4px ${color.value}` 
                    : 'none',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {accentColor === color.value && <Check size={20} color="white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Color */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Custom Color
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="color"
              value={accentColor}
              onChange={e => setAccentColor(e.target.value)}
              style={{
                width: 50,
                height: 40,
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                background: 'transparent',
              }}
            />
            <input
              type="text"
              value={accentColor}
              onChange={e => {
                const val = e.target.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                  setAccentColor(val)
                }
              }}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-primary)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'monospace',
              }}
            />
          </div>
        </div>

        {/* Preview */}
        <div style={{ 
          background: 'var(--bg-input)', 
          borderRadius: 12, 
          padding: 16,
          marginBottom: 20,
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Preview</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ fontSize: 13 }}>Primary Button</button>
            <button className="btn btn-secondary" style={{ fontSize: 13 }}>Secondary</button>
            <span style={{ 
              padding: '6px 12px', 
              background: accentColor, 
              color: 'white', 
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
            }}>
              Badge
            </span>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={onClose} style={{ width: '100%' }}>
          Done
        </button>
      </div>
    </div>
  )
}
