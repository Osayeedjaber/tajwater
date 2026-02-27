'use client'

import { useEffect, useRef } from 'react'

interface Bubble {
  x: number
  y: number
  r: number
  speed: number
  opacity: number
  drift: number
  driftDir: number
}

export default function WaterBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const bubbles: Bubble[] = Array.from({ length: 28 }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 200,
      r: Math.random() * 6 + 2,
      speed: Math.random() * 0.6 + 0.2,
      opacity: Math.random() * 0.3 + 0.05,
      drift: Math.random() * 1.5 - 0.75,
      driftDir: Math.random() > 0.5 ? 1 : -1,
    }))

    let frame = 0
    let raf: number

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++

      bubbles.forEach((b) => {
        b.y -= b.speed
        b.x += Math.sin(frame * 0.015 + b.drift) * 0.4
        if (b.y + b.r < 0) {
          b.y = canvas.height + b.r
          b.x = Math.random() * canvas.width
        }

        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,255,255,${b.opacity * 1.5})`
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.fillStyle = `rgba(255,255,255,${b.opacity * 0.4})`
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}
