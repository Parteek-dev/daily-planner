import { useState } from 'react'
import {
  X, Palette, Bell, Database, Archive as ArchiveIcon, Info,
  Download, Upload, RotateCcw, Flame, Target, Zap, Clock,
  BarChart3, CheckCircle2, TrendingUp, Sun, Moon, SunMoon, Check,
  Search, Calendar, Trash2,
} from 'lucide-react'
import { useTheme, ACCENT_COLORS } from '../hooks/useTheme.jsx'

// ── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'appearance',    label: 'Appearance',    icon: Palette      },
  { id: 'notifications', label: 'Notifications', icon: Bell         },
  { id: 'data',          label: 'Data',          icon: Database     },
  { id: 'archive',       label: 'Archive',       icon: ArchiveIcon  },
  { id: 'about',         label: 'About',         icon: Info         },
]

// ── Main modal ───────────────────────────────────────────────────────────────

export default function SettingsModal({
  isOpen, onClose,
  notifications,
  onExport, onImport, onReset, totalTasks,
  archivedTasks, onRestore, onDeleteArchived, onArchiveOld, getTopicColor,
}) {
  const [activeTab, setActiveTab] = useState('appearance')

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 700, width: '95vw', maxHeight: '88vh',
          padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px 16px', borderBottom: '1px solid var(--border-primary)', flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>⚙️ Settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left tab list */}
          <div style={{
            width: 164, flexShrink: 0, borderRight: '1px solid var(--border-primary)',
            padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: activeTab === id ? 600 : 400, textAlign: 'left', width: '100%',
                  background: activeTab === id ? 'var(--accent-blue)' : 'transparent',
                  color: activeTab === id ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (activeTab !== id) e.currentTarget.style.background = 'var(--bg-input)' }}
                onMouseLeave={e => { if (activeTab !== id) e.currentTarget.style.background = 'transparent' }}
              >
                <Icon size={15} />{label}
              </button>
            ))}
          </div>

          {/* Right content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {activeTab === 'appearance'    && <AppearanceTab />}
            {activeTab === 'notifications' && <NotificationsTab notifications={notifications} />}
            {activeTab === 'data'          && <DataTab onExport={onExport} onImport={onImport} onReset={() => { onClose(); onReset() }} totalTasks={totalTasks} />}
            {activeTab === 'archive'       && <ArchiveTab archivedTasks={archivedTasks} onRestore={onRestore} onDelete={onDeleteArchived} onArchiveOld={onArchiveOld} getTopicColor={getTopicColor} />}
            {activeTab === 'about'         && <AboutTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section header helper ─────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  )
}

// ── APPEARANCE tab ────────────────────────────────────────────────────────────

function AppearanceTab() {
  const { theme, themeMode, setThemeMode, accentColor, setAccentColor } = useTheme()

  return (
    <div>
      <SectionHeader title="Appearance" subtitle="Customize how the app looks" />

      {/* Light / Dark / Auto */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Mode</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            ['light', <Sun size={22} />, 'Light'],
            ['dark',  <Moon size={22} />, 'Dark'],
            ['auto',  <SunMoon size={22} />, 'Auto'],
          ].map(([t, icon, label]) => (
            <button
              key={t}
              onClick={() => setThemeMode(t)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: 16, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                background: themeMode === t ? 'var(--accent-blue)' : 'var(--bg-input)',
                border: `2px solid ${themeMode === t ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                color: themeMode === t ? 'white' : 'var(--text-secondary)',
              }}
            >
              {icon}
              <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
            </button>
          ))}
        </div>
        {themeMode === 'auto' && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Follows your system's dark/light preference automatically.
          </p>
        )}
      </div>

      {/* Accent color */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Accent Color</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
          {ACCENT_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setAccentColor(c.value)}
              title={c.name}
              style={{
                width: '100%', aspectRatio: '1', background: c.value, border: 'none',
                borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: accentColor === c.value ? `0 0 0 2px var(--bg-secondary), 0 0 0 4px ${c.value}` : 'none',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {accentColor === c.value && <Check size={18} color="white" strokeWidth={3} />}
            </button>
          ))}
        </div>

        {/* Custom hex */}
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Custom Color</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
            style={{ width: 46, height: 38, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }} />
          <input type="text" value={accentColor}
            onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setAccentColor(e.target.value) }}
            style={{ flex: 1, padding: '9px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-primary)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, fontFamily: 'monospace' }} />
        </div>
      </div>

      {/* Preview */}
      <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Preview</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ fontSize: 13 }}>Primary</button>
          <button className="btn btn-secondary" style={{ fontSize: 13 }}>Secondary</button>
          <span style={{ padding: '6px 12px', background: accentColor, color: 'white', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>Badge</span>
        </div>
      </div>
    </div>
  )
}

// ── NOTIFICATIONS tab ─────────────────────────────────────────────────────────

function NotificationsTab({ notifications }) {
  const { isSupported, permission, enabled, reminderMinutes, toggleNotifications, updateReminderMinutes } = notifications
  const isBlocked = permission === 'denied'

  return (
    <div>
      <SectionHeader title="Notifications" subtitle="Configure task reminders" />

      <div className="card-static" style={{ padding: 18, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: enabled ? 16 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={18} color={enabled ? 'var(--accent-blue)' : 'var(--text-muted)'} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Task Reminders</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {!isSupported ? 'Not supported in this browser'
                  : isBlocked ? 'Blocked — enable in browser settings'
                  : permission === 'default' ? 'Get reminded before tasks are due'
                  : enabled ? 'Active' : 'Disabled'}
              </p>
            </div>
          </div>
          {isSupported && !isBlocked && (
            <button onClick={toggleNotifications} className={`btn ${enabled ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 16px', fontSize: 13 }}>
              {enabled ? 'On' : 'Off'}
            </button>
          )}
        </div>

        {enabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 14, borderTop: '1px solid var(--border-primary)' }}>
            <Clock size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Remind me</span>
            <select value={reminderMinutes} onChange={e => updateReminderMinutes(e.target.value)}
              className="input" style={{ width: 'auto', padding: '6px 10px', fontSize: 13, background: 'var(--bg-input)' }}>
              {[1,5,10,15,30,60].map(m => <option key={m} value={m}>{m < 60 ? `${m} minutes` : '1 hour'}</option>)}
            </select>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>before due time</span>
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Reminders only work for tasks that have a due time set. Make sure to set a time when creating tasks.
      </p>
    </div>
  )
}

// ── DATA tab ──────────────────────────────────────────────────────────────────

function DataTab({ onExport, onImport, onReset, totalTasks }) {
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = e => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => onImport(ev.target.result)
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionHeader title="Data Management" subtitle="Export, import, or reset your planner data" />

      <div className="card-static" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>Export Data</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Download all {totalTasks} tasks as a JSON backup</p>
          </div>
          <button onClick={onExport} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="card-static" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>Import Data</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Restore from a previously exported JSON file</p>
          </div>
          <button onClick={handleImport} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Upload size={14} /> Import
          </button>
        </div>
      </div>

      <div className="card-static" style={{ padding: 18, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', marginBottom: 3 }}>Reset All Data</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Permanently delete everything. Cannot be undone.</p>
          </div>
          <button onClick={onReset} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ARCHIVE tab ───────────────────────────────────────────────────────────────

function ArchiveTab({ archivedTasks, onRestore, onDelete, onArchiveOld, getTopicColor }) {
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = archivedTasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.topic.toLowerCase().includes(search.toLowerCase())
  )

  const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <SectionHeader title={`Archive (${archivedTasks.length})`} subtitle="View and restore completed tasks" />
        <button className="btn btn-secondary" onClick={() => onArchiveOld(7)} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, fontSize: 12 }}>
          <ArchiveIcon size={13} /> Archive old
        </button>
      </div>

      {archivedTasks.length > 0 && (
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search archived tasks..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 34px', background: 'var(--bg-input)', border: '1px solid var(--border-primary)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <ArchiveIcon size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>{archivedTasks.length === 0 ? 'No archived tasks yet' : 'No tasks match your search'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(task => (
            <div key={task.id} style={{ background: 'var(--bg-input)', borderRadius: 10, padding: 14, borderLeft: `3px solid ${getTopicColor(task.topic)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 5 }}>{task.title}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: getTopicColor(task.topic), display: 'inline-block' }} />
                      {task.topic}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} />{fmt(task.date)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{task.duration}m</span>
                    {task.archivedAt && <span>Archived {fmt(task.archivedAt)}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => onRestore(task.id)} className="btn btn-ghost" style={{ padding: 7 }} title="Restore">
                    <RotateCcw size={15} color="var(--accent-green)" />
                  </button>
                  <button onClick={() => setConfirmDelete(task.id)} className="btn btn-ghost" style={{ padding: 7 }} title="Delete permanently">
                    <Trash2 size={15} color="#ef4444" />
                  </button>
                </div>
              </div>
              {confirmDelete === task.id && (
                <div style={{ marginTop: 10, padding: 10, background: 'rgba(239,68,68,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#ef4444' }}>Delete permanently?</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)} style={{ fontSize: 12, padding: '4px 10px' }}>Cancel</button>
                    <button className="btn btn-danger" onClick={() => { onDelete(task.id); setConfirmDelete(null) }} style={{ fontSize: 12, padding: '4px 10px' }}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ABOUT tab ─────────────────────────────────────────────────────────────────

function AboutTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionHeader title="About Daily Planner" subtitle="Feature guide and keyboard shortcuts" />

      <AboutSection icon={<Zap size={15} color="#f59e0b" />} title="Productivity Score" desc="Score out of 100 based on streaks, completion, and goals">
        {[['Streaks','40 pts','4 pts/day, max 40'],['Completion','30 pts','Based on overall % done'],['Goals','30 pts','Days you hit daily goal (last 7)']].map(([l,p,d]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-primary)', fontSize: 13 }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{l} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{d}</span></span>
            <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{p}</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {[['Beginner','0-19','var(--text-muted)'],['Apprentice','20-39','#22c55e'],['Intermediate','40-59','#3b82f6'],['Expert','60-79','#a855f7'],['Master','80+','#eab308']].map(([n,r,c]) => (
            <div key={n} style={{ padding: '3px 10px', background: 'var(--bg-input)', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: c }}>{n}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r}</div>
            </div>
          ))}
        </div>
      </AboutSection>

      <AboutSection icon={<Flame size={15} color="#f97316" />} title="Streak" desc="Consecutive days with at least 1 completed task">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Complete at least <strong>1 task/day</strong> to keep your streak. Missing a day resets it to 0.</p>
      </AboutSection>

      <AboutSection icon={<Clock size={15} color="#8b5cf6" />} title="Time Tracking" desc="Estimated vs actual time in Focus Mode">
        <ul style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 16, lineHeight: 1.8 }}>
          <li><strong style={{ color: 'var(--accent-green)' }}>Finished Early</strong> — actual &lt; estimated</li>
          <li><strong style={{ color: 'var(--accent-blue)' }}>On Target</strong> — within 10%</li>
          <li><strong style={{ color: 'var(--accent-orange)' }}>Took Longer</strong> — actual &gt; estimated</li>
        </ul>
      </AboutSection>

      <AboutSection icon={<CheckCircle2 size={15} color="#ef4444" />} title="Keyboard Shortcuts" desc="Quick actions for power users">
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Navigation</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[['D','Dashboard'],['T','Today'],['W','Week'],['C','Calendar']].map(([k,a]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <code style={{ background: 'var(--bg-input)', padding: '1px 6px', borderRadius: 4, fontSize: 11, color: 'var(--text-primary)' }}>{k}</code>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tasks</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[['N','New task'],['P','Start Pomodoro'],['Ctrl+Z','Undo'],['Ctrl+Y','Redo']].map(([k,a]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <code style={{ background: 'var(--bg-input)', padding: '1px 6px', borderRadius: 4, fontSize: 11, color: 'var(--text-primary)' }}>{k}</code>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>General</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[['Ctrl+/','Search tasks'],['?','Show shortcuts'],['Esc','Close modal']].map(([k,a]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <code style={{ background: 'var(--bg-input)', padding: '1px 6px', borderRadius: 4, fontSize: 11, color: 'var(--text-primary)' }}>{k}</code>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
      </AboutSection>

      <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-primary)', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Daily Planner v2.0 · React + Vite + Supabase</p>
      </div>
    </div>
  )
}

function AboutSection({ icon, title, desc, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon}
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</p>
        </div>
      </div>
      <div style={{ marginLeft: 22 }}>{children}</div>
    </div>
  )
}
