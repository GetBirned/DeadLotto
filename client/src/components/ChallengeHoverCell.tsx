import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ChallengeDefinition } from '@shared/challenges'

const POPUP_WIDTH = 256
const POPUP_MARGIN = 8

// Shows the challenge name(s) truncated, with a styled popup of name+description
// per challenge on hover - used anywhere a challenge (or list of them) is displayed
// as a compact label: the game summary table and profile game history.
//
// Renders the popup through a portal at a fixed, viewport-computed position instead
// of a plain absolutely-positioned child, because every place this is used sits
// inside a scroll-clipped container (the game summary table's overflow-x-auto
// wrapper, the profile modal's overflow-y-auto panel) that would otherwise cut the
// popup off.
export function ChallengeHoverCell({
  challenges,
  fallbackText,
}: {
  challenges: ChallengeDefinition[]
  fallbackText?: string
}) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null)
  const label = challenges.length > 0 ? challenges.map((c) => c.name).join(', ') : (fallbackText ?? '-')

  function handleEnter() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const estimatedHeight = 70 * challenges.length + 24
    const above = rect.bottom + estimatedHeight > window.innerHeight
    setPos({
      top: above ? rect.top - POPUP_MARGIN : rect.bottom + POPUP_MARGIN,
      left: Math.min(rect.left, window.innerWidth - POPUP_WIDTH - POPUP_MARGIN),
      above,
    })
  }

  return (
    <span
      ref={triggerRef}
      className="relative inline-block max-w-full cursor-default"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setPos(null)}
    >
      <span className="block truncate">{label}</span>

      {pos &&
        challenges.length > 0 &&
        createPortal(
          <div
            className="fixed z-[100] rounded border border-dl-border bg-dl-panel p-3 text-left text-xs normal-case shadow-xl"
            style={{ top: pos.top, left: pos.left, width: POPUP_WIDTH, transform: pos.above ? 'translateY(-100%)' : undefined }}
          >
            {challenges.map((c) => (
              <div key={c.slug} className="mb-2 last:mb-0">
                <p className="font-display text-dl-text">{c.name}</p>
                <p className="text-dl-text/70">{c.description}</p>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </span>
  )
}
