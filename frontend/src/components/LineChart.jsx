import { useMemo, useState, useRef, useCallback, useEffect } from 'react'

// Fixed viewBox — all geometry lives in this coordinate space
const VW = 600   // viewBox width
const VH = 220   // viewBox height (matches default height prop)
const PAD = { top: 32, right: 24, bottom: 36, left: 40 }

function smoothPath(points) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const p = points[i - 1], c = points[i]
    const mx = (p.x + c.x) / 2
    d += ` C ${mx} ${p.y}, ${mx} ${c.y}, ${c.x} ${c.y}`
  }
  return d
}

function niceMax(raw) {
  if (raw <= 2)  return 2
  if (raw <= 4)  return 4
  if (raw <= 5)  return 5
  if (raw <= 8)  return 8
  if (raw <= 10) return 10
  const s = raw <= 20 ? 5 : 10
  return Math.ceil(raw / s) * s
}

export default function LineChart({ data, height = 220, color = '#4f7fff' }) {
  const wrapRef = useRef(null)
  const lineRef = useRef(null)
  const areaRef = useRef(null)
  const [hoverIdx, setHoverIdx] = useState(null)
  const [ready,    setReady]    = useState(false)

  const { maxY } = useMemo(() => {
    const vals = (data ?? []).map(d => d.completed)
    return { maxY: niceMax(Math.max(...vals, 1)) }
  }, [data])

  const plotW    = VW - PAD.left - PAD.right
  const plotH    = height - PAD.top - PAD.bottom
  const baseline = PAD.top + plotH

  const getX = useCallback((i) =>
    PAD.left + (i / ((data?.length ?? 1) - 1 || 1)) * plotW,
  [data?.length, plotW])

  const getY = useCallback((v) =>
    PAD.top + plotH - Math.min(v / maxY, 1) * plotH,
  [maxY, plotH])

  const { linePath, areaPath } = useMemo(() => {
    if (!data?.length) return {}
    const pts = data.map((d, i) => ({ x: getX(i), y: getY(d.completed) }))
    const lp  = smoothPath(pts)
    const ap  = `${lp} L ${pts[pts.length-1].x} ${baseline} L ${pts[0].x} ${baseline} Z`
    return { linePath: lp, areaPath: ap }
  }, [data, getX, getY, baseline])

  const yTicks = useMemo(() => {
    const step = maxY <= 4 ? 1 : maxY <= 10 ? 2 : maxY <= 20 ? 4 : 5
    const t = []
    for (let v = 0; v <= maxY; v += step) t.push(v)
    return t
  }, [maxY])

  const xIdxs = useMemo(() => {
    if (!data) return []
    const last = data.length - 1
    const s = new Set([0])
    data.forEach((d, i) => {
      if (d.date && new Date(d.date + 'T12:00:00').getDay() === 1) s.add(i)
    })
    s.add(last)
    // Remove any index that's within 3 positions of the last one (avoids "Sep 21 Today" overlap)
    return [...s].sort((a, b) => a - b).filter(i => i === last || last - i > 3)
  }, [data])

  // Draw animation
  useEffect(() => {
    setReady(false)
    const id = requestAnimationFrame(() => setTimeout(() => setReady(true), 40))
    return () => cancelAnimationFrame(id)
  }, [data])

  useEffect(() => {
    const line = lineRef.current
    const area = areaRef.current
    if (!line) return
    const len = line.getTotalLength?.() ?? 1200
    if (!ready) {
      line.style.transition = 'none'
      line.style.strokeDasharray = `${len}`
      line.style.strokeDashoffset = `${len}`
      if (area) { area.style.transition = 'none'; area.style.opacity = '0' }
    } else {
      line.style.strokeDasharray = `${len}`
      line.style.strokeDashoffset = '0'
      line.style.transition = 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)'
      if (area) { area.style.opacity = '1'; area.style.transition = 'opacity 0.5s ease 0.3s' }
    }
  }, [ready, linePath])

  // Hover — snap to nearest index
  const handleMouseMove = useCallback((e) => {
    const el = wrapRef.current
    if (!el || !data) return
    const rect = el.getBoundingClientRect()
    // Map screen x → plot fraction, accounting for HTML padding area
    const plotLeft  = PAD.left / VW * rect.width
    const plotRight = (VW - PAD.right) / VW * rect.width
    const sx = e.clientX - rect.left
    if (sx < plotLeft || sx > plotRight) { setHoverIdx(null); return }
    const idx = Math.round(((sx - plotLeft) / (plotRight - plotLeft)) * (data.length - 1))
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)))
  }, [data])

  if (!data?.length) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data available</div>
  }

  const hovDay = hoverIdx !== null ? data[hoverIdx] : null
  const colW   = plotW / (data.length - 1 || 1)
  const xPct   = (i) => (getX(i) / VW) * 100
  const yPct   = (v) => (getY(v) / height) * 100

  return (
    <div ref={wrapRef} style={{ width: '100%', position: 'relative', height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {/* ── Main SVG — geometry only, no dots ─────────────────────────── */}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VW} ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block', position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <defs>
          <linearGradient id="lcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.5" />
            <stop offset="55%"  stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0"   />
          </linearGradient>
          <clipPath id="lcClip">
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH + 1} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <line key={i}
            x1={PAD.left} y1={getY(v)} x2={PAD.left + plotW} y2={getY(v)}
            stroke="var(--border-primary)" strokeWidth="1" strokeDasharray="5,7" strokeOpacity="0.65"
          />
        ))}

        {/* Hover column — width capped to a sensible pixel size */}
        {hoverIdx !== null && (() => {
          const el = wrapRef.current
          const rect = el?.getBoundingClientRect()
          const scaleX = rect ? rect.width / VW : 1
          // Cap column to max 20px wide regardless of data density
          const colWpx = Math.min(colW * scaleX, 20)
          const colWvb = colWpx / scaleX
          return (
            <rect
              x={getX(hoverIdx) - colWvb * 0.5}
              y={PAD.top} width={colWvb} height={plotH}
              fill="rgba(0,0,0,0.08)" rx="3"
            />
          )
        })()}

        {/* Area */}
        <path ref={areaRef} d={areaPath} fill="url(#lcGrad)" stroke="none"
          clipPath="url(#lcClip)" style={{ opacity: 0 }} />

        {/* Line */}
        <path ref={lineRef} d={linePath} fill="none" stroke={color}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          vectorEffect="non-scaling-stroke" />
      </svg>

      {/* ── Dots as HTML — perfectly circular, pixel-perfect positioned ── */}
      {data.map((d, i) => {
        const isHover = hoverIdx === i
        const r = isHover ? 4 : 2.5
        return (
          <div key={i} style={{
            position:     'absolute',
            left:         `${xPct(i)}%`,
            top:          `${yPct(d.completed)}%`,
            width:        r * 2,
            height:       r * 2,
            borderRadius: '50%',
            background:   isHover ? color : 'var(--bg-card)',
            border:       `1.5px solid ${color}`,
            transform:    'translate(-50%, -50%)',
            pointerEvents: 'none',
            transition:   'width 0.1s, height 0.1s, background 0.1s',
            boxSizing:    'border-box',
            flexShrink:   0,
          }} />
        )
      })}

      {/* ── Y labels ─────────────────────────────────────────────────── */}
      {yTicks.map((v, i) => (
        <span key={i} style={{
          position: 'absolute',
          right: `${100 - (PAD.left - 8) / VW * 100}%`,
          top: `${yPct(v)}%`,
          transform: 'translateY(-50%)',
          fontSize: 11, color: 'var(--text-muted)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>{v}</span>
      ))}

      {/* ── X labels ─────────────────────────────────────────────────── */}
      {xIdxs.map((idx, i) => (
        <span key={idx} style={{
          position: 'absolute',
          left: `${xPct(idx)}%`,
          bottom: 0,
          transform: i === 0 ? 'translateX(0)' : i === xIdxs.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
          fontSize: 11,
          color: idx === data.length - 1 ? color : 'var(--text-muted)',
          fontWeight: idx === data.length - 1 ? 600 : 400,
          whiteSpace: 'nowrap', pointerEvents: 'none', lineHeight: 1,
        }}>
          {idx === data.length - 1 ? 'Today' : data[idx]?.label}
        </span>
      ))}

      {/* ── Tooltip — absolute inside wrapper, above the hovered column ── */}
      {hovDay && hoverIdx !== null && (() => {
        const xPctVal = xPct(hoverIdx)
        // Y: top of the plot area in % of wrapper height
        const topPct = (PAD.top / height) * 100
        return (
          <div style={{
            position:      'absolute',
            left:          `${xPctVal}%`,
            top:           `${topPct}%`,
            transform:     'translate(-50%, -110%)',
            background:    'var(--bg-card)',
            border:        '1px solid var(--border-primary)',
            borderRadius:  10,
            padding:       '6px 12px',
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           2,
            pointerEvents: 'none',
            zIndex:        10,
            boxShadow:     '0 4px 16px rgba(0,0,0,0.1)',
            whiteSpace:    'nowrap',
          }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
              {hovDay.completed}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
              {hovDay.label}
            </span>
          </div>
        )
      })()}
    </div>
  )
}
