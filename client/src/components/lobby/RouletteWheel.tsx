import { WHEEL_SLOTS, WILDCARD_SLUG } from '@shared/heroRegistry'

const SLOT_COUNT = WHEEL_SLOTS.length
const ANGLE_PER_SLOT = 360 / SLOT_COUNT
const SIZE = 480
const RADIUS = SIZE / 2

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function wedgePath(index: number) {
  const start = index * ANGLE_PER_SLOT
  const end = start + ANGLE_PER_SLOT
  const outer = RADIUS - 4
  const p1 = polarToCartesian(RADIUS, RADIUS, outer, start)
  const p2 = polarToCartesian(RADIUS, RADIUS, outer, end)
  return `M ${RADIUS} ${RADIUS} L ${p1.x} ${p1.y} A ${outer} ${outer} 0 0 1 ${p2.x} ${p2.y} Z`
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
  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <div
        className={`absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/3 transition-transform ${spinning ? 'animate-pulse' : ''}`}
      >
        <div className="h-0 w-0 border-x-[14px] border-t-[22px] border-x-transparent border-t-dl-mint drop-shadow-[0_0_10px_var(--color-dl-mint)]" />
      </div>

      <div
        className="absolute inset-0 rounded-full border-4 border-[#3a331f] shadow-[0_0_40px_rgba(0,0,0,0.6)]"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${spinMs}ms ${easing}` : 'none',
        }}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 rounded-full">
          {WHEEL_SLOTS.map((hero, i) => (
            <path key={hero.slug} d={wedgePath(i)} fill={wedgeColor(hero, i)} stroke="#0b0a08" strokeWidth={1} />
          ))}
        </svg>

        {WHEEL_SLOTS.map((hero, i) => {
          const angle = i * ANGLE_PER_SLOT + ANGLE_PER_SLOT / 2
          const pos = polarToCartesian(RADIUS, RADIUS, RADIUS - 32, angle)
          return (
            <img
              key={hero.slug}
              src={hero.icon}
              alt=""
              title={hero.name}
              className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/50 object-cover"
              style={{ left: pos.x, top: pos.y }}
            />
          )
        })}
      </div>

      <div className="absolute left-1/2 top-1/2 z-10 flex h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#3a331f] bg-dl-bg">
        <img src="/assets/branding/deadLotto_logo.png" alt="" className="h-12 w-12" />
      </div>
    </div>
  )
}
