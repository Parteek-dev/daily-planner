/**
 * LineChart.tsx — daily task-completion line/area chart.
 *
 * Web:    Pure SVG with smooth bezier path, gradient fill, draw animation,
 *         hover tooltip — exact match of legacy LineChart.jsx.
 * Native: Victory-native fallback (no SVG/HTML interop available).
 *
 * Requirements: 14.1, 14.3, 14.6, 2.3
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LineChartDataPoint {
  date: string    // ISO "YYYY-MM-DD"
  count: number   // completed tasks
  label?: string  // e.g. "Sep 28"
}

export interface LineChartProps {
  data: LineChartDataPoint[]
  accentColor?: string
}

// ── Geometry constants (fixed viewBox) ───────────────────────────────────────

const VW = 600
const VH = 200
const PAD = { top: 32, right: 24, bottom: 36, left: 40 }

// ── Helpers ───────────────────────────────────────────────────────────────────

function niceMax(raw: number): number {
  if (raw <= 2) return 2
  if (raw <= 4) return 4
  if (raw <= 5) return 5
  if (raw <= 8) return 8
  if (raw <= 10) return 10
  const s = raw <= 20 ? 5 : 10
  return Math.ceil(raw / s) * s
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i]
    const mx = (p.x + c.x) / 2
    d += ` C ${mx} ${p.y}, ${mx} ${c.y}, ${c.x} ${c.y}`
  }
  return d
}

function shortLabel(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Web SVG chart ─────────────────────────────────────────────────────────────

function WebLineChart({ data, accentColor }: LineChartProps & { accentColor: string }) {
  const { tokens } = useTheme()
  const wrapRef = useRef<any>(null)
  const lineRef = useRef<any>(null)
  const areaRef = useRef<any>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [ready, setReady] = useState(false)

  const plotW = VW - PAD.left - PAD.right
  const plotH = VH - PAD.top - PAD.bottom
  const baseline = PAD.top + plotH

  const maxY = useMemo(() => niceMax(Math.max(...(data ?? []).map(d => d.count), 1)), [data])

  const getX = useCallback((i: number) =>
    PAD.left + (i / ((data?.length ?? 1) - 1 || 1)) * plotW,
    [data?.length, plotW])

  const getY = useCallback((v: number) => {
    const raw = PAD.top + plotH - Math.min(v / maxY, 1) * plotH
    // Lift zero-value points 2px above the baseline so they're visible above the x-axis
    return v === 0 ? raw - 2 : raw
  }, [maxY, plotH])

  const { linePath, areaPath } = useMemo(() => {
    if (!data?.length) return { linePath: '', areaPath: '' }
    const pts = data.map((d, i) => ({ x: getX(i), y: getY(d.count) }))
    const lp = smoothPath(pts)
    const ap = `${lp} L ${pts[pts.length - 1].x} ${baseline} L ${pts[0].x} ${baseline} Z`
    return { linePath: lp, areaPath: ap }
  }, [data, getX, getY, baseline])

  const yTicks = useMemo(() => {
    const step = maxY <= 4 ? 1 : maxY <= 10 ? 2 : maxY <= 20 ? 4 : 5
    const t: number[] = []
    for (let v = 0; v <= maxY; v += step) t.push(v)
    return t
  }, [maxY])

  const xIdxs = useMemo(() => {
    if (!data) return []
    const last = data.length - 1
    const s = new Set<number>([0])
    data.forEach((d, i) => {
      if (d.date && new Date(d.date + 'T12:00:00').getDay() === 1) s.add(i)
    })
    s.add(last)
    return [...s]
      .sort((a, b) => a - b)
      // Remove labels too close to their neighbours (within 3 positions)
      .filter((idx, pos, arr) => {
        const prev = arr[pos - 1] ?? -999
        const next = arr[pos + 1] ?? 999
        // Always keep first and last
        if (idx === 0 || idx === last) return true
        // Drop if too close to previous or next
        return idx - prev > 3 && next - idx > 3
      })
  }, [data])

  // Draw animation
  useEffect(() => {
    setReady(false)
    const id = requestAnimationFrame(() => setTimeout(() => setReady(true), 40))
    return () => cancelAnimationFrame(id)
  }, [data])

  useEffect(() => {
    const line = lineRef.current as SVGPathElement | null
    const area = areaRef.current as SVGPathElement | null
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

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = wrapRef.current
    if (!el || !data) return
    const rect = (el as HTMLDivElement).getBoundingClientRect()
    const plotLeft = PAD.left / VW * rect.width
    const plotRight = (VW - PAD.right) / VW * rect.width
    const sx = e.clientX - rect.left
    if (sx < plotLeft || sx > plotRight) { setHoverIdx(null); return }
    const idx = Math.round(((sx - plotLeft) / (plotRight - plotLeft)) * (data.length - 1))
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)))
  }, [data])

  const xPct = (i: number) => (getX(i) / VW) * 100
  const yPct = (v: number) => (getY(v) / VH) * 100

  const hovDay = hoverIdx !== null ? data[hoverIdx] : null

  const gradId = `lcGrad_${accentColor.replace(/[^a-z0-9]/gi, '')}`
  const clipId = `lcClip_${accentColor.replace(/[^a-z0-9]/gi, '')}`
  const colW = plotW / ((data?.length ?? 2) - 1 || 1)

  return (
    <div
      ref={wrapRef}
      style={{ width: '100%', position: 'relative', height: VH } as React.CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {/* ── SVG — geometry only ── */}
      <svg
        width="100%" height={VH}
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        style={{ display: 'block', position: 'absolute', inset: 0, pointerEvents: 'none' } as React.CSSProperties}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.45" />
            <stop offset="55%" stopColor={accentColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH + 1} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <line key={i}
            x1={PAD.left} y1={getY(v)} x2={PAD.left + plotW} y2={getY(v)}
            stroke={tokens.borderPrimary} strokeWidth="1" strokeDasharray="5,7" strokeOpacity="0.5"
          />
        ))}

        {/* Hover column */}
        {hoverIdx !== null && (() => {
          const colWvb = Math.min(colW, 20)
          return (
            <rect
              x={getX(hoverIdx) - colWvb * 0.5}
              y={PAD.top} width={colWvb} height={plotH}
              fill="rgba(0,0,0,0.06)" rx="3"
            />
          )
        })()}

        {/* Area */}
        <path ref={areaRef} d={areaPath} fill={`url(#${gradId})`} stroke="none"
          clipPath={`url(#${clipId})`} style={{ opacity: 0 } as React.CSSProperties} />

        {/* Line — always continuous across all 30 days */}
        <path ref={lineRef} d={linePath} fill="none"
          stroke={accentColor} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          opacity="0.85" />
      </svg>

      {/* ── Dots (HTML for pixel-perfect circles) ── */}
      {(data ?? []).map((d, i) => {
        const isHover = hoverIdx === i
        const hasData = d.count > 0
        const isToday = i === (data?.length ?? 1) - 1
        const r = isHover ? 6 : isToday ? 4 : hasData ? 2.5 : 1.5
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${xPct(i)}%`,
            top: `${yPct(d.count)}%`,
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            background: isHover ? accentColor : hasData ? accentColor : 'transparent',
            border: `1.5px solid ${accentColor}`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            transition: 'width 0.1s, height 0.1s',
            boxSizing: 'border-box',
            opacity: isHover ? 1 : (isToday || hasData) ? 1 : 0.35,
          } as React.CSSProperties} />
        )
      })}

      {/* ── Y labels ── */}
      {yTicks.map((v, i) => (
        <span key={i} style={{
          position: 'absolute',
          right: `${100 - (PAD.left - 6) / VW * 100}%`,
          top: `${yPct(v)}%`,
          transform: 'translateY(-50%)',
          fontSize: 11,
          color: tokens.textMuted,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: '1',
        } as React.CSSProperties}>{v}</span>
      ))}

      {/* ── X labels ── */}
      {xIdxs.map((idx, i) => (
        <span key={idx} style={{
          position: 'absolute',
          left: `${xPct(idx)}%`,
          bottom: 0,
          transform: i === 0
            ? 'translateX(0)'
            : i === xIdxs.length - 1
              ? 'translateX(-100%)'
              : 'translateX(-50%)',
          fontSize: 11,
          color: idx === (data?.length ?? 0) - 1 ? accentColor : tokens.textMuted,
          fontWeight: idx === (data?.length ?? 0) - 1 ? '600' : '400',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          lineHeight: '1',
        } as React.CSSProperties}>
          {idx === (data?.length ?? 0) - 1 ? 'Today' : (data?.[idx]?.label ?? shortLabel(data?.[idx]?.date ?? ''))}
        </span>
      ))}

      {/* ── Tooltip ── */}
      {hovDay && hoverIdx !== null && (() => {
        const xPctVal = xPct(hoverIdx)
        const topPct = (PAD.top / VH) * 100
        return (
          <div style={{
            position: 'absolute',
            left: `${xPctVal}%`,
            top: `${topPct}%`,
            transform: 'translate(-50%, -110%)',
            background: tokens.bgSecondary,
            border: `1px solid ${tokens.borderPrimary}`,
            borderRadius: 10,
            padding: '6px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            whiteSpace: 'nowrap',
          } as React.CSSProperties}>
            <span style={{ fontSize: 18, fontWeight: 700, color: tokens.textPrimary, lineHeight: '1.1', fontVariantNumeric: 'tabular-nums' } as React.CSSProperties}>
              {hovDay.count}
            </span>
            <span style={{ fontSize: 10, color: tokens.textMuted, marginTop: 1 } as React.CSSProperties}>
              {hovDay.label ?? shortLabel(hovDay.date)}
            </span>
          </div>
        )
      })()}
    </div>
  )
}

// ── Native fallback (Victory) ─────────────────────────────────────────────────

function NativeLineChart({ data, accentColor }: LineChartProps & { accentColor: string }) {
  const { tokens } = useTheme()

  // Lazy-require Victory only on native to avoid web bundle bloat
  let VictoryChart: any, VictoryLine: any, VictoryArea: any,
    VictoryAxis: any, VictoryTheme: any, VictoryScatter: any
  try {
    const v = require('victory-native')
    VictoryChart = v.VictoryChart
    VictoryLine = v.VictoryLine
    VictoryArea = v.VictoryArea
    VictoryAxis = v.VictoryAxis
    VictoryTheme = v.VictoryTheme
    VictoryScatter = v.VictoryScatter
  } catch {
    return (
      <View style={[native.empty, { backgroundColor: tokens.bgSecondary }]}>
        <Text style={[native.emptyText, { color: tokens.textMuted }]}>Chart unavailable</Text>
      </View>
    )
  }

  const chartData = (data ?? []).map((d, i) => ({ x: i, y: d.count }))

  return (
    <VictoryChart
      theme={VictoryTheme.material}
      padding={{ top: 16, bottom: 36, left: 32, right: 12 }}
      height={180}
      domainPadding={{ y: [0, 4] }}
    >
      <VictoryAxis
        tickValues={chartData.filter((_: any, i: number) => i % 7 === 0 || i === chartData.length - 1).map((d: any) => d.x)}
        tickFormat={(t: number) => data[t] ? shortLabel(data[t].date) : ''}
        style={{ axis: { stroke: tokens.borderPrimary }, tickLabels: { fill: tokens.textMuted, fontSize: 9 }, grid: { stroke: 'transparent' } }}
      />
      <VictoryAxis
        dependentAxis
        style={{ axis: { stroke: 'transparent' }, tickLabels: { fill: tokens.textMuted, fontSize: 9 }, grid: { stroke: tokens.borderPrimary, strokeDasharray: '4,6' } }}
        tickFormat={(t: number) => Number.isInteger(t) ? String(t) : ''}
      />
      <VictoryArea
        data={chartData}
        style={{ data: { fill: accentColor, fillOpacity: 0.15, stroke: 'transparent' } }}
        interpolation="monotoneX"
      />
      <VictoryLine
        data={chartData}
        style={{ data: { stroke: accentColor, strokeWidth: 2.5 } }}
        interpolation="monotoneX"
      />
      <VictoryScatter
        data={chartData}
        style={{ data: { fill: accentColor } }}
        size={3}
      />
    </VictoryChart>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function LineChart({ data, accentColor }: LineChartProps) {
  const { tokens } = useTheme()
  const accent = accentColor ?? tokens.accentPrimary

  if (!data || data.length === 0) {
    return (
      <View style={[native.empty, { backgroundColor: tokens.bgSecondary }]}>
        <Text style={[native.emptyText, { color: tokens.textMuted }]}>
          Complete tasks to see your progress chart.
        </Text>
      </View>
    )
  }

  const activeCount = (data ?? []).filter(d => d.count > 0).length
  const showSparseTip = activeCount < 5

  if (Platform.OS === 'web') {
    return (
      <View>
        <WebLineChart data={data} accentColor={accent} />
        {showSparseTip && (
          <Text style={[native.sparseTip, { color: tokens.textMuted }]}>
            Complete a few more tasks to see your productivity trend.
          </Text>
        )}
      </View>
    )
  }

  return (
    <View>
      <NativeLineChart data={data} accentColor={accent} />
      {showSparseTip && (
        <Text style={[native.sparseTip, { color: tokens.textMuted }]}>
          Complete a few more tasks to see your productivity trend.
        </Text>
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const native = StyleSheet.create({
  empty: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  sparseTip: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
})
