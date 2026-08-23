import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { WHEEL_SLOTS, WILDCARD_SLUG } from '@shared/heroRegistry'
import { playWheelTick } from '../../lib/sfx'

const SLOT_COUNT = WHEEL_SLOTS.length
const ANGLE_PER_SLOT = 360 / SLOT_COUNT
const MAX_SIZE = 480
// Reference proportions at MAX_SIZE - scaled down to match whatever size the wheel
// actually renders at, so icons/center hub shrink together with the wheel on narrow
// screens instead of overflowing it.
const ICON_INSET_AT_MAX = 32
const ICON_SIZE_AT_MAX = 32
const CENTER_SIZE_AT_MAX = 92
const CENTER_LOGO_SIZE_AT_MAX = 48

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function wedgePath(index: number, radius: number) {
  const start = index * ANGLE_PER_SLOT
  const end = start + ANGLE_PER_SLOT
  const outer = radius - 4
  const p1 = polarToCartesian(radius, radius, outer, start)
  const p2 = polarToCartesian(radius, radius, outer, end)
  return `M ${radius} ${radius} L ${p1.x} ${p1.y} A ${outer} ${outer} 0 0 1 ${p2.x} ${p2.y} Z`
}

function wedgeColor(hero: (typeof WHEEL_SLOTS)[number], index: number) {
  if (hero.slug === WILDCARD_SLUG) return '#1e8f5f'
  return index % 2 === 0 ? '#8c1f1f' : '#141414'
}

export function RouletteWheel({
  rotation,
  spinning,
  spinMs = 5200,
  easing = 'cubic-bezier(0.1, 0.6, 0.05, 1)',
}: {
  rotation: number
  spinning: boolean
  spinMs?: number
  easing?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wheelRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(MAX_SIZE)

  // Ticks once per wheel-slot crossed, timed off the wheel's actual on-screen angle
  // (read back from its live CSS transform) rather than recomputing the easing curve,
  // so the ticks always match what's rendered - fast and blurred together while the
  // wheel is spinning quickly, then distinct as it decelerates into the result.
  useEffect(() => {
    if (!spinning) return
    const el = wheelRef.current
    if (!el) return
    let raf = 0
    let lastAngle: number | null = null
    let unwrapped = 0
    let lastSlot = 0

    const sample = () => {
      const transform = getComputedStyle(el).transform
      const match = transform.match(/^matrix\(([^,]+),\s*([^,]+),/)
      if (match) {
        const a = parseFloat(match[1])
        const b = parseFloat(match[2])
        const angle = (((Math.atan2(b, a) * 180) / Math.PI) + 360) % 360
        if (lastAngle !== null) {
          unwrapped += (angle - lastAngle + 360) % 360
          const slot = Math.floor(unwrapped / ANGLE_PER_SLOT)
          if (slot !== lastSlot) {
            playWheelTick()
            lastSlot = slot
          }
        }
        lastAngle = angle
      }
      raf = requestAnimationFrame(sample)
    }
    raf = requestAnimationFrame(sample)
    return () => cancelAnimationFrame(raf)
  }, [spinning])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = (width: number) => setSize(Math.max(1, Math.min(MAX_SIZE, width)))
    measure(el.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) measure(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scale = size / MAX_SIZE
  const radius = size / 2
  const iconInset = ICON_INSET_AT_MAX * scale
  const iconSize = ICON_SIZE_AT_MAX * scale
  const centerSize = CENTER_SIZE_AT_MAX * scale
  const centerLogoSize = CENTER_LOGO_SIZE_AT_MAX * scale

  return (
    <div ref={containerRef} className="relative mx-auto aspect-square w-full max-w-[480px]">
      <div
        className={`absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/3 transition-transform ${spinning ? 'animate-pulse' : ''}`}
      >
        <div className="h-0 w-0 border-x-[14px] border-t-[22px] border-x-transparent border-t-dl-mint drop-shadow-[0_0_10px_var(--color-dl-mint)]" />
      </div>

      <div
        ref={wheelRef}
        className="absolute inset-0 rounded-full border-4 border-[#3a331f] shadow-[0_0_40px_rgba(0,0,0,0.6)]"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${spinMs}ms ${easing}` : 'none',
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 rounded-full">
          {WHEEL_SLOTS.map((hero, i) => (
            <path key={hero.slug} d={wedgePath(i, radius)} fill={wedgeColor(hero, i)} stroke="#0b0a08" strokeWidth={1} />
          ))}
        </svg>

        {WHEEL_SLOTS.map((hero, i) => {
          const angle = i * ANGLE_PER_SLOT + ANGLE_PER_SLOT / 2
          const pos = polarToCartesian(radius, radius, radius - iconInset, angle)
          return (
            <img
              key={hero.slug}
              src={hero.icon}
              alt=""
              title={hero.name}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/50 object-cover"
              style={{ left: pos.x, top: pos.y, width: iconSize, height: iconSize }}
            />
          )
        })}
      </div>

      <div
        className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#3a331f] bg-dl-bg"
        style={{ width: centerSize, height: centerSize }}
      >
        <img src="/assets/branding/deadLotto_logo.png" alt="" style={{ width: centerLogoSize, height: centerLogoSize }} />
      </div>
    </div>
  )
}
