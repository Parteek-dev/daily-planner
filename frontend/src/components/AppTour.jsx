import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, ChevronRight, ChevronLeft, LayoutDashboard, Sparkles, Columns2,
  CalendarDays, Timer, Mic, PanelTop, Settings, BarChart2, BookOpen,
  MapPin, Compass, Flame, Target, TrendingUp, Clock, Layers, PartyPopper, Hand,
} from 'lucide-react'

// ─── Tour step definitions ────────────────────────────────────────────────────
// route: if set, the tour will navigate to this path before spotlighting.
// selector: CSS selector for the spotlight ring. null = centred popover.
// placement: where the popover appears relative to the spotlight element.
// titleSuffix: optional Lucide icon rendered inline after the title text.
// descNode: optional JSX that replaces description when emoji-in-text is needed.

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Daily Planner',
    titleSuffix: <Hand size={20} color="var(--accent-orange)" />,
    description:
      'This quick tour walks you through every key feature. It only takes a minute — and you can relaunch it any time from your profile menu or Settings.',
    icon: <Compass size={22} color="var(--accent-blue)" />,
    route: '/',
    selector: null,
    placement: 'center',
  },
  {
    id: 'sidebar-stats',
    title: 'Your Progress at a Glance',
    description: null,
    descNode: (
      <span>
        The sidebar header shows your overall completion %, current streak{' '}
        <Flame size={13} color="var(--accent-orange)" style={{ display: 'inline', verticalAlign: 'middle', marginBottom: 1 }} />,
        and today's task count — all updated in real time.
      </span>
    ),
    icon: <BarChart2 size={20} color="var(--accent-orange)" />,
    route: null,
    selector: '.sidebar:not(.sidebar-hidden) .sidebar-header-stats',
    placement: 'right',
  },
  {
    id: 'nav-dashboard',
    title: 'Dashboard',
    description:
      'Your productivity HQ. It surfaces stats, charts, and insights all in one place so you never lose sight of the big picture.',
    icon: <LayoutDashboard size={20} color="var(--accent-blue)" />,
    route: null,
    selector: '.sidebar:not(.sidebar-hidden) .tour-nav-dashboard',
    placement: 'right',
  },
  {
    id: 'dashboard-stats',
    title: 'Daily Stats Cards',
    description:
      "Three cards show today's goal progress ring, your current & best streak, and total time invested across all completed tasks.",
    icon: <Target size={20} color="var(--accent-blue)" />,
    route: '/',
    selector: '.tour-dashboard-stats',
    placement: 'overlay',
  },
  {
    id: 'dashboard-heatmap',
    title: 'Activity Heatmap',
    description:
      'A GitHub-style heatmap of every day you completed tasks. Darker squares = more tasks done. Great for spotting consistency patterns over time.',
    icon: <Flame size={20} color="var(--accent-orange)" />,
    route: '/',
    selector: '.tour-dashboard-heatmap',
    placement: 'overlay',
  },
  {
    id: 'dashboard-goals',
    title: 'Goals & Productivity Score',
    description:
      'Set a daily task target and optional topic-specific goals. The Productivity Score (0–100) grades your streaks, completion rate, and goal achievement.',
    icon: <TrendingUp size={20} color="var(--accent-green)" />,
    route: '/',
    selector: '.tour-dashboard-goals',
    placement: 'overlay',
  },
  {
    id: 'dashboard-analytics',
    title: 'Analytics & Insights',
    description:
      "Three deep-dive charts: Time Tracking (estimated vs actual), Best Hours (when you're most productive), and Topic Balance (are you neglecting anything?).",
    icon: <Clock size={20} color="#8b5cf6" />,
    route: '/',
    selector: '.tour-dashboard-analytics',
    placement: 'overlay',
  },
  {
    id: 'dashboard-chart',
    title: 'Tasks Completed — Last 30 Days',
    description:
      'A line chart of how many tasks you finished each day over the past month. Spot your productive streaks and quiet spells at a glance.',
    icon: <TrendingUp size={20} color="var(--accent-blue)" />,
    route: '/',
    selector: '.tour-dashboard-chart',
    placement: 'overlay',
  },
  {
    id: 'dashboard-bottom',
    title: 'Topics & Recent Completions',
    description:
      'Topic breakdown shows completion % per subject so you can see where your effort goes. Recent Completions is a live feed of your latest wins.',
    icon: <Layers size={20} color="var(--accent-green)" />,
    route: '/',
    selector: '.tour-dashboard-bottom',
    placement: 'overlay',
  },
  {
    id: 'nav-today',
    title: 'Today',
    description:
      "Your daily focus. See today's tasks in order, start Focus Mode on any one, and track actual vs estimated time.",
    icon: <Sparkles size={20} color="#f97316" />,
    route: null,
    selector: '.sidebar:not(.sidebar-hidden) .tour-nav-today',
    placement: 'right',
  },
  {
    id: 'nav-week',
    title: 'Week View',
    description:
      'See all 7 days side-by-side in a kanban-style layout. Reassign tasks across days with a single click.',
    icon: <Columns2 size={20} color="var(--accent-purple)" />,
    route: null,
    selector: '.sidebar:not(.sidebar-hidden) .tour-nav-week',
    placement: 'right',
  },
  {
    id: 'nav-calendar',
    title: 'Calendar',
    description:
      'A full monthly calendar with inline task counts per day. Click any date to jump straight to it.',
    icon: <CalendarDays size={20} color="var(--accent-green)" />,
    route: null,
    selector: '.sidebar:not(.sidebar-hidden) .tour-nav-calendar',
    placement: 'right',
  },
  {
    id: 'pomodoro',
    title: 'Pomodoro Timer',
    description:
      'Built-in Pomodoro with auto work/break cycling, desktop notifications, and per-session time logging. Press P anywhere to start.',
    icon: <Timer size={20} color="var(--accent-blue)" />,
    route: null,
    selector: '.sidebar:not(.sidebar-hidden) .tour-pomodoro-btn',
    placement: 'right',
  },
  {
    id: 'voice',
    title: 'Voice Input',
    description:
      "Dictate a new task hands-free. Say something like \"Study React for 45 minutes tomorrow\" and it's parsed automatically.",
    icon: <Mic size={20} color="#ec4899" />,
    route: null,
    selector: '.sidebar:not(.sidebar-hidden) .tour-voice-btn',
    placement: 'right',
  },
  {
    id: 'widget',
    title: 'Widget View',
    description:
      "A compact floating widget showing today's tasks. Perfect for a second monitor or keeping a running checklist visible.",
    icon: <PanelTop size={20} color="var(--accent-green)" />,
    route: null,
    selector: '.sidebar:not(.sidebar-hidden) .tour-widget-btn',
    placement: 'right',
  },
  {
    id: 'settings',
    title: 'Settings',
    description:
      'Customise themes & accent colours, configure notifications, export/import your data, manage the archive, and more.',
    icon: <Settings size={20} color="var(--text-secondary)" />,
    route: null,
    selector: '.sidebar:not(.sidebar-hidden) .tour-settings-btn',
    placement: 'right',
  },
  {
    id: 'notes',
    title: 'Daily Notes',
    description:
      "Each day has a private freeform notes area at the bottom of the Today page. Jot down ideas, blockers, or meeting notes that don't need to be tasks.",
    icon: <BookOpen size={20} color="#14b8a6" />,
    route: '/today',
    selector: '.tour-daily-notes',
    placement: 'overlay',
  },
  {
    id: 'done',
    title: "You're all set!",
    titleSuffix: <PartyPopper size={20} color="var(--accent-green)" />,
    description:
      'Start by pressing N to add your first task, or use the + button on the Today page. Relaunch this tour any time from your profile avatar.',
    icon: <MapPin size={22} color="var(--accent-green)" />,
    route: null,
    selector: null,
    placement: 'center',
  },
]

// ─── Popover sizing ───────────────────────────────────────────────────────────

const POPOVER_W = 340
const POPOVER_H = 280 // generous so clamping is accurate
const GAP       = 16

// ─── Position calculation ─────────────────────────────────────────────────────
// placement options:
//   'right'   — beside the element (sidebar items)
//   'top'     — above the element, flips to bottom if needed
//   'bottom'  — below the element, flips to top if needed
//   'overlay' — fixed position in the viewport corner that keeps maximum
//               clearance from the spotlight ring; used for wide/tall elements
//   'center'  — centred in viewport (no target element)

function computePosition(rect, placement, vpW, vpH) {
  // Reserve space at top for browser chrome and bottom for OS dock
  const safeTop  = 90          // below browser address bar + bookmarks bar
  const safeBot  = vpH - 90   // above macOS dock / Windows taskbar
  const safeH    = safeBot - safeTop

  // ── center ──
  if (!rect || placement === 'center') {
    return {
      top:  Math.max(safeTop, safeTop + (safeH - POPOVER_H) / 2),
      left: Math.max(16, (vpW - POPOVER_W) / 2),
    }
  }

  // ── overlay: fixed corner away from the element ──
  // Place popover in the quadrant of the viewport that has most clearance
  // from the spotlight box so it never overlaps the ring.
  if (placement === 'overlay') {
    const elCentreX = rect.left + rect.width  / 2
    const elCentreY = rect.top  + rect.height / 2
    // Pick horizontal side with more viewport space
    const spaceRight = vpW  - rect.right
    const spaceLeft  = rect.left
    const spaceBelow = safeBot - rect.bottom
    const spaceAbove = rect.top - safeTop

    let left, top

    // Horizontal: prefer the wider side
    if (spaceRight >= POPOVER_W + GAP + 16) {
      left = rect.right + GAP
    } else if (spaceLeft >= POPOVER_W + GAP + 16) {
      left = rect.left - POPOVER_W - GAP
    } else {
      // Element is full-width — park popover in bottom-right quadrant of viewport
      left = vpW - POPOVER_W - 24
    }

    // Vertical: prefer below, fall back to above, fall back to viewport centre
    if (spaceBelow >= POPOVER_H + GAP) {
      top = rect.bottom + GAP
    } else if (spaceAbove >= POPOVER_H + GAP) {
      top = rect.top - POPOVER_H - GAP
    } else {
      // Not enough room above or below — float at safe vertical centre
      top = safeTop + (safeH - POPOVER_H) / 2
    }

    left = Math.max(16, Math.min(left, vpW - POPOVER_W - 16))
    top  = Math.max(safeTop, Math.min(top, safeBot - POPOVER_H - 16))
    return { top, left }
  }

  let top, left

  if (placement === 'right') {
    left = rect.right + GAP
    top  = rect.top + rect.height / 2 - POPOVER_H / 2
  } else if (placement === 'left') {
    left = rect.left - POPOVER_W - GAP
    top  = rect.top + rect.height / 2 - POPOVER_H / 2
  } else if (placement === 'bottom') {
    left = rect.left + rect.width / 2 - POPOVER_W / 2
    top  = rect.bottom + GAP
    if (top + POPOVER_H > safeBot - 16) top = rect.top - POPOVER_H - GAP
  } else {
    // 'top'
    left = rect.left + rect.width / 2 - POPOVER_W / 2
    top  = rect.top - POPOVER_H - GAP
    if (top < safeTop) top = rect.bottom + GAP
  }

  left = Math.max(16,      Math.min(left, vpW    - POPOVER_W - 16))
  top  = Math.max(safeTop, Math.min(top,  safeBot - POPOVER_H - 16))

  return { top, left }
}

// ─── Spotlight ring ───────────────────────────────────────────────────────────

function SpotlightBox({ rect }) {
  if (!rect) return null
  const pad = 8
  return (
    <div
      className="tour-spotlight-box"
      style={{
        position:      'fixed',
        top:           rect.top  - pad,
        left:          rect.left - pad,
        width:         rect.width  + pad * 2,
        height:        rect.height + pad * 2,
        borderRadius:  12,
        pointerEvents: 'none',
        zIndex:        9998,
      }}
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AppTour({ isOpen, onClose, onComplete, navigate }) {
  const [step,      setStep]   = useState(0)
  const [rect,      setRect]   = useState(null)
  const [pos,       setPos]    = useState({ top: 0, left: 0 })
  const [anim,      setAnim]   = useState(false)
  const [navigating, setNavigating] = useState(false)
  const timerRef = useRef(null)

  const current = STEPS[step]
  const total   = STEPS.length

  // Scroll the target element into view, then measure it.
  // Takes the step index explicitly to avoid stale closure issues with timers.
  const measureStep = useCallback((stepIdx) => {
    if (!isOpen) return
    const sel = STEPS[stepIdx]?.selector
    const el  = sel ? document.querySelector(sel) : null

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Wait for smooth scroll to settle (~420ms), then measure
      timerRef.current = setTimeout(() => {
        const r = el.getBoundingClientRect()
        setRect(r)
        setPos(computePosition(r, STEPS[stepIdx]?.placement, window.innerWidth, window.innerHeight))
      }, 420)
    } else {
      setRect(null)
      setPos(computePosition(null, STEPS[stepIdx]?.placement, window.innerWidth, window.innerHeight))
    }
  }, [isOpen])

  // When the step changes: navigate if needed, then scroll+measure
  useEffect(() => {
    if (!isOpen) return

    const s = STEPS[step]

    // Clear any pending timers from the previous step
    if (timerRef.current) clearTimeout(timerRef.current)

    if (s.route && navigate) {
      // Navigate first, wait for the new page to render, then scroll+measure
      setNavigating(true)
      setAnim(false)
      navigate(s.route)
      timerRef.current = setTimeout(() => {
        setNavigating(false)
        measureStep(step)
        // Trigger popover animation after scroll settles (420ms inside measureStep)
        setTimeout(() => setAnim(true), 460)
      }, 320)
    } else {
      setAnim(false)
      measureStep(step)
      // Trigger popover animation after scroll settles
      setTimeout(() => setAnim(true), 460)
    }

    const onResize = () => {
      const sel = STEPS[step]?.selector
      const el  = sel ? document.querySelector(sel) : null
      const r   = el ? el.getBoundingClientRect() : null
      setRect(r)
      setPos(computePosition(r, STEPS[step]?.placement, window.innerWidth, window.innerHeight))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [isOpen, step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to step 0 whenever the tour opens
  useEffect(() => {
    if (isOpen) {
      setStep(0)
      setAnim(false)
    }
  }, [isOpen])

  // Cleanup timers on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const goToStep = useCallback((i) => {
    setAnim(false)
    timerRef.current = setTimeout(() => setStep(i), 160)
  }, [])

  const goNext = useCallback(() => {
    if (step < total - 1) goToStep(step + 1)
    else handleFinish()
  }, [step, total]) // eslint-disable-line react-hooks/exhaustive-deps

  const goPrev = useCallback(() => {
    if (step > 0) goToStep(step - 1)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinish = () => {
    localStorage.setItem('app_tour_completed', 'true')
    onComplete?.()
    onClose()
  }

  const handleSkip = useCallback(() => {
    localStorage.setItem('app_tour_completed', 'true')
    onClose()
  }, [onClose])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft')                        { e.preventDefault(); goPrev() }
      if (e.key === 'Escape')                           { e.preventDefault(); handleSkip() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, goNext, goPrev, handleSkip])

  if (!isOpen) return null

  const isFirst    = step === 0
  const isLast     = step === total - 1
  const progressPc = ((step + 1) / total) * 100

  return (
    <>
      {/* ── Dark overlay ── */}
      <div className="tour-overlay" onClick={handleSkip} aria-label="Skip tour" />

      {/* ── Spotlight ring ── */}
      {!navigating && <SpotlightBox rect={rect} />}

      {/* ── Popover card ── */}
      <div
        className={`tour-popover${anim && !navigating ? ' tour-popover--in' : ''}`}
        style={{ top: pos.top, left: pos.left, width: POPOVER_W }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Tour step ${step + 1} of ${total}: ${current.title}`}
      >
        {/* Header: icon + close */}
        <div className="tour-popover__header">
          <div className="tour-popover__icon">{current.icon}</div>
          <button onClick={handleSkip} className="tour-popover__close" aria-label="Close tour">
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="tour-popover__body">
          <h3 className="tour-popover__title">
            {current.title}
            {current.titleSuffix && (
              <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 7, marginBottom: 2 }}>
                {current.titleSuffix}
              </span>
            )}
          </h3>
          <p className="tour-popover__desc">
            {current.descNode ?? current.description}
          </p>
        </div>

        {/* Bottom bar — always pinned to the bottom of the card */}
        <div className="tour-popover__bottom">
          {/* Progress bar with step counter inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div className="tour-progress-track" style={{ marginBottom: 0, flex: 1 }}>
              <div className="tour-progress-fill" style={{ width: `${progressPc}%` }} />
            </div>
            <span className="tour-step-count" style={{ marginTop: 0, flexShrink: 0 }}>
              {step + 1} / {total}
            </span>
          </div>

          {/* Footer: skip left, nav right */}
          <div className="tour-popover__footer">
            <button onClick={handleSkip} className="tour-btn-skip">Skip tour</button>
            <div className="tour-popover__nav">
              {!isFirst && (
                <button onClick={goPrev} className="tour-btn-prev" aria-label="Previous step">
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              <button onClick={goNext} className="tour-btn-next" aria-label={isLast ? 'Finish tour' : 'Next step'}>
                {isLast ? <><PartyPopper size={15} /> Finish</> : <>Next <ChevronRight size={16} /></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
