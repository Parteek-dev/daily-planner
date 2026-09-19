import { useEffect, useState } from 'react'
import {
  CheckCircle2, Flame, BarChart2, Timer, Target, Calendar,
  ArrowRight, Sparkles, ClipboardList, Sun, Moon, SunMoon, Zap,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

// ── Feature data ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <CheckCircle2 size={22} />,
    color: '#22c55e',
    title: 'Task Tracking',
    desc: 'Organize your day with priorities, topics, and due times. Never lose track of what matters.',
  },
  {
    icon: <Flame size={22} />,
    color: '#f97316',
    title: 'Streak System',
    desc: 'Build momentum with daily streaks. Stay consistent and watch your productivity compound.',
  },
  {
    icon: <Timer size={22} />,
    color: '#6366f1',
    title: 'Focus Timer',
    desc: 'Built-in Pomodoro timer tracks actual time spent. Know exactly where your hours go.',
  },
  {
    icon: <BarChart2 size={22} />,
    color: '#3b82f6',
    title: 'Insights & Reports',
    desc: 'Weekly reports, activity heatmaps, and productivity scores reveal your patterns.',
  },
  {
    icon: <Target size={22} />,
    color: '#a855f7',
    title: 'Daily Goals',
    desc: 'Set custom completion targets and track progress toward them every single day.',
  },
  {
    icon: <Calendar size={22} />,
    color: '#14b8a6',
    title: 'Multi-view Calendar',
    desc: 'Switch between Today, Week, and Calendar views. Plan ahead or focus on the now.',
  },
]

const STEPS = [
  { n: '01', title: 'Add your tasks', desc: 'Create tasks with topics, durations, and priorities in seconds.' },
  { n: '02', title: 'Track your day', desc: 'Use the focus timer, check off tasks, and build your streak.' },
  { n: '03', title: 'Review & improve', desc: 'See your heatmap, reports, and score. Get better every week.' },
]

const PILLS = ['Free forever', 'No credit card', 'Works offline', 'Your data stays yours']

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = 0
    const step = Math.ceil(to / 40)
    const id = setInterval(() => {
      start += step
      if (start >= to) { setVal(to); clearInterval(id) }
      else setVal(start)
    }, 30)
    return () => clearInterval(id)
  }, [to])
  return <>{val.toLocaleString()}{suffix}</>
}

export default function LandingPage({ onGetStarted, onGuestMode, onFeedback }) {
  const { theme, themeMode, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // ── Theme-aware token shorthands ────────────────────────────────────────
  const bg      = isDark ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #0f172a 100%)' : 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 45%, #f0f4ff 100%)'
  const textPri  = isDark ? '#f0f4ff' : '#0f172a'
  const textSec  = isDark ? '#94a3b8' : '#475569'
  const textMut  = isDark ? '#4b6080' : '#94a3b8'
  const cardBg   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'
  const cardBdr  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.12)'
  const navBg  = isDark ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.18)'
  const navBdr = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.18)'

  return (
    <div style={{ minHeight: '100vh', background: bg, color: textPri, fontFamily: 'Inter, system-ui, sans-serif', WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Liquid glass nav ─────────────────────────────────────────── */}
      <nav className={`lp-nav ${isDark ? 'lp-nav--dark' : 'lp-nav--light'}`} style={{
        position: 'fixed', top: 16, left: 24, right: 24,
        zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 52,
        borderRadius: 20,
        transition: 'background 0.3s',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
            <ClipboardList size={18} color="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: textPri }}>Daily Planner</span>
        </div>

        {/* Nav right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={toggleTheme} title="Toggle theme"
            style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', border: `1px solid ${navBdr}`, borderRadius: 8, padding: 7, cursor: 'pointer', color: textSec, display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}>
            {themeMode === 'dark' ? <Moon size={15} /> : themeMode === 'light' ? <Sun size={15} /> : <SunMoon size={15} />}
          </button>
          <button onClick={onFeedback}
            style={{ background: 'none', border: 'none', color: textSec, fontSize: 13, cursor: 'pointer', padding: '6px 10px', textDecoration: 'none', borderRadius: 8, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
            onMouseLeave={e => e.currentTarget.style.color = textSec}>
            Feedback
          </button>
          <button onClick={onGetStarted}
            style={{ background: 'none', border: 'none', color: textSec, fontSize: 13, cursor: 'pointer', padding: '6px 10px', borderRadius: 8, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = textPri}
            onMouseLeave={e => e.currentTarget.style.color = textSec}>
            Sign in
          </button>
          <button onClick={onGetStarted}
            style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.4)', transition: 'filter 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}>
            Start planning free
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 60px', position: 'relative', overflow: 'hidden' }}>
        {/* Background blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: isDark ? 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', top: '-20%', left: '-10%', animation: 'blob1 14s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: isDark ? 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', bottom: '-10%', right: '-5%', animation: 'blob2 12s ease-in-out infinite alternate' }} />
        </div>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)', border: `1px solid rgba(99,102,241,${isDark ? '0.3' : '0.2'})`, marginBottom: 28 }}>
          <Sparkles size={13} color="#818cf8" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#818cf8', letterSpacing: '0.04em' }}>FREE · NO CREDIT CARD REQUIRED</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24, maxWidth: 800 }}>
          Your day,{' '}
          <span style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            perfectly planned
          </span>
        </h1>

        {/* Subtext */}
        <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: textSec, maxWidth: 520, lineHeight: 1.65, marginBottom: 44 }}>
          Track tasks, build streaks, and stay focused — all in one beautifully simple planner that works the way you think.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 48 }}>
          <button onClick={onGetStarted}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #6366f1, #3b82f6)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, padding: '14px 28px', borderRadius: 14, cursor: 'pointer', boxShadow: '0 8px 28px rgba(99,102,241,0.45)', transition: 'transform 0.15s, filter 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.filter = 'brightness(1)' }}>
            Start planning for free <ArrowRight size={18} />
          </button>
          <button onClick={onGuestMode}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: cardBg, border: `1px solid ${cardBdr}`, color: textSec, fontSize: 16, fontWeight: 500, padding: '14px 24px', borderRadius: 14, cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'border-color 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = '#818cf8' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = cardBdr; e.currentTarget.style.color = textSec }}>
            Try as Guest
          </button>
        </div>

        {/* Trust pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {PILLS.map(p => (
            <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: textMut, background: cardBg, border: `1px solid ${cardBdr}`, padding: '5px 12px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
              <CheckCircle2 size={12} color="#22c55e" /> {p}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, marginBottom: 14 }}>
            Everything you need to{' '}
            <span style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              stay on track
            </span>
          </h2>
          <p style={{ fontSize: 16, color: textSec, maxWidth: 480, margin: '0 auto' }}>
            Built for people who want to get things done without the complexity.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: cardBg, border: `1px solid ${cardBdr}`, borderRadius: 20, padding: '28px 24px', backdropFilter: 'blur(12px)', transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = `${f.color}40`; e.currentTarget.style.boxShadow = `0 12px 32px ${f.color}18` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = cardBdr; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${f.color}18`, border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: 16 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: textPri, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: textSec, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, marginBottom: 14 }}>
            Up and running in{' '}
            <span style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              3 steps
            </span>
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', gap: 24, alignItems: 'flex-start', padding: '28px 32px', background: cardBg, border: `1px solid ${cardBdr}`, borderRadius: 20, backdropFilter: 'blur(8px)', position: 'relative' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#6366f1', minWidth: 32, opacity: 0.7, paddingTop: 2 }}>{s.n}</span>
              <div style={{ width: 2, position: 'absolute', left: 48, top: 0, bottom: 0, background: i === STEPS.length - 1 ? 'transparent' : 'rgba(99,102,241,0.15)' }} />
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: textPri, marginBottom: 6 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: textSec, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <section style={{ padding: '60px 24px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { label: 'Tasks tracked', value: 50000, suffix: '+' },
            { label: 'Active streaks', value: 1200, suffix: '+' },
            { label: 'Focus hours logged', value: 8000, suffix: '+' },
            { label: 'Always free', value: '100', suffix: '%' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '28px 16px', background: cardBg, border: `1px solid ${cardBdr}`, borderRadius: 20, backdropFilter: 'blur(8px)' }}>
              <p style={{ fontSize: 36, fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>
                {typeof s.value === 'number' ? <Counter to={s.value} suffix={s.suffix} /> : `${s.value}${s.suffix}`}
              </p>
              <p style={{ fontSize: 13, color: textSec }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '56px 40px', background: cardBg, border: `1px solid ${cardBdr}`, borderRadius: 28, backdropFilter: 'blur(16px)', boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.4)' : '0 16px 48px rgba(99,102,241,0.12)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
            <Zap size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: textPri, marginBottom: 12 }}>
            Ready to take control of your day?
          </h2>
          <p style={{ fontSize: 15, color: textSec, marginBottom: 32, lineHeight: 1.6 }}>
            Join thousands of people who plan smarter with Daily Planner. It's free, always.
          </p>
          <button onClick={onGetStarted}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #6366f1, #3b82f6)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, padding: '14px 32px', borderRadius: 14, cursor: 'pointer', boxShadow: '0 8px 28px rgba(99,102,241,0.45)', transition: 'transform 0.15s, filter 0.15s', marginBottom: 16 }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.filter = 'brightness(1)' }}>
            Start planning for free <ArrowRight size={18} />
          </button>
          <p style={{ fontSize: 12, color: textMut }}>No account? <button onClick={onGuestMode} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Try as guest →</button></p>
        </div>

        {/* Footer */}
        <p style={{ marginTop: 40, fontSize: 12, color: textMut }}>
          © {new Date().getFullYear()} Daily Planner · Made with ♥
        </p>
      </section>

      <style>{`
        @keyframes blob1 { from { transform: translate(0,0) scale(1); } to { transform: translate(40px,30px) scale(1.08); } }
        @keyframes blob2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-30px,-20px) scale(1.06); } }

        /* ── Apple liquid glass navbar ── */
        .lp-nav {
          position: relative;
          isolation: isolate;
          overflow: hidden;
        }

        /* The actual glass layer */
        .lp-nav::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          backdrop-filter: blur(80px) saturate(240%) brightness(1.2);
          -webkit-backdrop-filter: blur(80px) saturate(240%) brightness(1.2);
          z-index: -2;
        }

        /* Tint fill */
        .lp-nav--dark::before  { background: rgba(10, 18, 40, 0.18); }
        .lp-nav--light::before { background: rgba(180, 195, 255, 0.35); }

        /* Specular rim */
        .lp-nav::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          z-index: -1;
          pointer-events: none;
        }

        .lp-nav--dark::after {
          background: linear-gradient(
            180deg,
            rgba(255,255,255,0.12) 0%,
            rgba(255,255,255,0.03) 40%,
            rgba(0,0,0,0.06) 100%
          );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.22),
            inset 0 -1px 0 rgba(0,0,0,0.15),
            0 0 0 1px rgba(255,255,255,0.10),
            0 12px 48px rgba(0,0,0,0.45),
            0 2px 8px rgba(0,0,0,0.25);
        }

        .lp-nav--light::after {
          background: linear-gradient(
            180deg,
            rgba(255,255,255,0.55) 0%,
            rgba(255,255,255,0.1) 60%,
            rgba(160,180,255,0.05) 100%
          );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.75),
            inset 0 -1px 0 rgba(99,102,241,0.1),
            0 0 0 1px rgba(140,165,255,0.3),
            0 16px 56px rgba(80,100,220,0.18),
            0 4px 16px rgba(99,102,241,0.12);
        }
      `}</style>
    </div>
  )
}
