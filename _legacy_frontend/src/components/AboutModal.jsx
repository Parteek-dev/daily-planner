import { X, Info, Flame, Target, Zap, Clock, BarChart3, Calendar, CheckCircle2, TrendingUp } from 'lucide-react'

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 600, maxHeight: '85vh', overflow: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Info size={22} color="var(--accent-blue)" />
            About Daily Planner
          </h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Productivity Score */}
          <Section 
            icon={<Zap size={18} color="#f59e0b" />}
            title="Productivity Score"
            description="Your overall productivity rating out of 100 points"
          >
            <ScoreItem label="Streaks" points="40" description="4 points per streak day (max 40)" />
            <ScoreItem label="Completion" points="30" description="Based on overall task completion %" />
            <ScoreItem label="Goals" points="30" description="Days you met daily goal in last 7 days" />
            
            <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-input)', borderRadius: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Levels:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, fontSize: 11 }}>
                <LevelBadge name="Beginner" range="0-19" color="var(--text-muted)" />
                <LevelBadge name="Apprentice" range="20-39" color="#22c55e" />
                <LevelBadge name="Intermediate" range="40-59" color="#3b82f6" />
                <LevelBadge name="Expert" range="60-79" color="#a855f7" />
                <LevelBadge name="Master" range="80-100" color="#eab308" />
              </div>
            </div>
          </Section>

          {/* Streaks */}
          <Section 
            icon={<Flame size={18} color="#f97316" />}
            title="Daily Streak"
            description="Consecutive days with at least one completed task"
          >
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Complete at least <strong>1 task per day</strong> to maintain your streak. 
              Missing a day resets your current streak to 0. Your best streak is saved for reference.
            </p>
          </Section>

          {/* Daily Goal */}
          <Section 
            icon={<Target size={18} color="#22c55e" />}
            title="Daily Goal"
            description="Set a target number of tasks to complete each day"
          >
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Default goal is <strong>3 tasks per day</strong>. Click "Edit" to change it. 
              Meeting your daily goal contributes to your productivity score.
            </p>
          </Section>

          {/* Activity Heatmap */}
          <Section 
            icon={<Calendar size={18} color="#3b82f6" />}
            title="Activity Heatmap"
            description="Visual representation of your task completions over 60 days"
          >
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Each cell represents one day. Darker colors indicate more tasks completed that day.
              Today is highlighted with a blue border at the top-left.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Less</span>
              {['var(--bg-input)', '#1e3a5f', '#1d4ed8', '#3b82f6', '#60a5fa'].map((color, i) => (
                <div key={i} style={{ width: 16, height: 16, borderRadius: 3, background: color }} />
              ))}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>More</span>
            </div>
          </Section>

          {/* Time Tracking */}
          <Section 
            icon={<Clock size={18} color="#8b5cf6" />}
            title="Time Tracking"
            description="Compare estimated vs actual time spent on tasks"
          >
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              When you complete tasks in <strong>Focus Mode</strong>, the actual time spent is recorded.
              Accuracy shows how close your estimates are to reality.
            </p>
            <ul style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, paddingLeft: 20 }}>
              <li><strong style={{ color: 'var(--accent-green)' }}>Finished Early:</strong> Actual &lt; Estimated (overestimated)</li>
              <li><strong style={{ color: 'var(--accent-blue)' }}>On Target:</strong> Within 10% of estimate</li>
              <li><strong style={{ color: 'var(--accent-orange)' }}>Took Longer:</strong> Actual &gt; Estimated (underestimated)</li>
            </ul>
          </Section>

          {/* Best Hours */}
          <Section 
            icon={<TrendingUp size={18} color="#ec4899" />}
            title="Best Hours Analysis"
            description="Discover when you're most productive"
          >
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Based on the time you complete tasks, the app identifies your peak productivity hours.
              Time periods are divided into:
            </p>
            <ul style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, paddingLeft: 20 }}>
              <li><strong>Morning:</strong> 6 AM - 12 PM</li>
              <li><strong>Afternoon:</strong> 12 PM - 6 PM</li>
              <li><strong>Evening:</strong> 6 PM - 12 AM</li>
              <li><strong>Night:</strong> 12 AM - 6 AM</li>
            </ul>
          </Section>

          {/* Topic Balance */}
          <Section 
            icon={<BarChart3 size={18} color="#14b8a6" />}
            title="Topic Balance"
            description="Visualize how your time is distributed across topics"
          >
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              The pie chart shows time allocation. Suggestions appear when:
            </p>
            <ul style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, paddingLeft: 20 }}>
              <li><strong>Dominant:</strong> One topic takes &gt;50% of time</li>
              <li><strong>Neglected:</strong> A topic has &lt;10% of time (with 2+ tasks)</li>
              <li><strong>Low Completion:</strong> Topic has &lt;50% completion rate</li>
            </ul>
          </Section>

          {/* Task Priority */}
          <Section 
            icon={<CheckCircle2 size={18} color="#ef4444" />}
            title="Task Priority"
            description="Organize tasks by importance"
          >
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <PriorityBadge label="High" color="#ef4444" />
              <PriorityBadge label="Medium" color="#f97316" />
              <PriorityBadge label="Low" color="#22c55e" />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Use the "Sort by Priority" button to organize tasks with high priority at the top.
            </p>
          </Section>

          {/* Keyboard Shortcuts */}
          <Section 
            icon={<Info size={18} color="var(--text-muted)" />}
            title="Keyboard Shortcuts"
            description="Quick actions for power users"
          >
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Navigation</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                <Shortcut keys="D" action="Go to Dashboard" />
                <Shortcut keys="T" action="Go to Today" />
                <Shortcut keys="W" action="Go to Week" />
                <Shortcut keys="C" action="Go to Calendar" />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tasks</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                <Shortcut keys="N" action="New task" />
                <Shortcut keys="P" action="Start Pomodoro (Today)" />
                <Shortcut keys="Ctrl+Z" action="Undo" />
                <Shortcut keys="Ctrl+Y" action="Redo" />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>General</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                <Shortcut keys="Ctrl+/" action="Search all tasks" />
                <Shortcut keys="?" action="Show shortcuts" />
                <Shortcut keys="Esc" action="Close modal" />
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Shortcuts don't trigger when typing in an input field.
            </p>
          </Section>

        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-primary)', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Daily Planner v1.0 • Built with React + Vite
          </p>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, description, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        {icon}
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{description}</p>
        </div>
      </div>
      <div style={{ marginLeft: 28 }}>
        {children}
      </div>
    </div>
  )
}

function ScoreItem({ label, points, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-primary)' }}>
      <div>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{description}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}>{points} pts</span>
    </div>
  )
}

function LevelBadge({ name, range, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 600, color }}>{name}</div>
      <div style={{ color: 'var(--text-muted)' }}>{range}</div>
    </div>
  )
}

function PriorityBadge({ label, color }) {
  return (
    <span style={{ 
      padding: '4px 12px', 
      borderRadius: 6, 
      fontSize: 12, 
      fontWeight: 500,
      background: `${color}20`, 
      color,
      border: `1px solid ${color}40`,
    }}>
      {label}
    </span>
  )
}

function Shortcut({ keys, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <code style={{ 
        background: 'var(--bg-input)', 
        padding: '2px 6px', 
        borderRadius: 4, 
        fontSize: 11,
        color: 'var(--text-primary)',
      }}>
        {keys}
      </code>
      <span style={{ color: 'var(--text-muted)' }}>{action}</span>
    </div>
  )
}
