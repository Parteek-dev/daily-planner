import { useEffect, useRef } from 'react'

const COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7',
  '#ef4444', '#eab308', '#14b8a6', '#ec4899',
]

function rand(a, b) { return a + Math.random() * (b - a) }

function burst(canvas, count) {
  const ctx = canvas.getContext('2d')
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight

  const particles = Array.from({ length: count }, () => ({
    x: rand(canvas.width * 0.15, canvas.width * 0.85),
    y: rand(canvas.height * 0.15, canvas.height * 0.5),
    vx: rand(-7, 7), vy: rand(-15, -5),
    gravity: rand(0.35, 0.55),
    rot: rand(0, Math.PI * 2), rotV: rand(-0.25, 0.25),
    w: rand(8, 14), h: rand(4, 7),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: 1,
    circle: Math.random() > 0.5,
  }))

  let rafId
  let running = true

  const tick = () => {
    if (!running) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let any = false
    for (const p of particles) {
      if (p.alpha <= 0) continue
      any = true
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity
      p.rot += p.rotV
      if (p.y > canvas.height * 0.65) p.alpha -= 0.02
      p.alpha = Math.max(0, p.alpha)
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      if (p.circle) {
        ctx.beginPath()
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      }
      ctx.restore()
    }
    if (any) {
      rafId = requestAnimationFrame(tick)
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      running = false
    }
  }

  rafId = requestAnimationFrame(tick)
  return () => { running = false; cancelAnimationFrame(rafId) }
}

/**
 * Renders a canvas overlay. Fires a burst every time `trigger` increments.
 * Usage: keep trigger=0, increment by 1 each time you want a burst.
 */
export default function Confetti({ trigger = 0, count = 120 }) {
  const canvasRef = useRef(null)
  const cleanupRef = useRef(null)

  useEffect(() => {
    if (trigger <= 0) return
    // Cancel any in-progress burst
    if (cleanupRef.current) cleanupRef.current()
    cleanupRef.current = burst(canvasRef.current, count)
  }, [trigger]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}
