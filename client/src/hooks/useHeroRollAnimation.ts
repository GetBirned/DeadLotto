import { useEffect, useRef, useState } from 'react'
import { WHEEL_SLOTS } from '@shared/heroRegistry'
import type { LobbyPlayerState } from '@shared/types'

const SLOT_COUNT = WHEEL_SLOTS.length
const ANGLE_PER_SLOT = 360 / SLOT_COUNT

// Longer spin with a slow, suspenseful settle at the end rather than a quick linear stop.
export const SPIN_MS = 5200
const FULL_SPINS = 8
const SPIN_EASING = 'cubic-bezier(0.1, 0.6, 0.05, 1)'

// Tracks the local player's own wheel animation, independent of how fast the server
// broadcasts the authoritative roll. `revealedCount` only advances once the wheel has
// visually finished spinning, so the UI never jumps ahead of what the player sees.
export function useHeroRollAnimation(me: LobbyPlayerState) {
  const [rotation, setRotation] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [revealedCount, setRevealedCount] = useState(me.rolledHeroes.length)
  const previousCount = useRef(me.rolledHeroes.length)

  useEffect(() => {
    // "Play Again" resets rolledHeroes back to [] server-side for a new round, but this
    // hook stays mounted for the whole lobby session - without this, a fresh round's
    // first roll (length 0 -> 1) would look like length is still behind previousCount
    // from the prior round and never trigger a new spin animation.
    if (me.rolledHeroes.length === 0 && previousCount.current !== 0) {
      previousCount.current = 0
      setRevealedCount(0)
      return
    }
    if (me.rolledHeroes.length > previousCount.current) {
      const newSlug = me.rolledHeroes[me.rolledHeroes.length - 1]
      const index = WHEEL_SLOTS.findIndex((h) => h.slug === newSlug)
      if (index !== -1) {
        const targetCenter = index * ANGLE_PER_SLOT + ANGLE_PER_SLOT / 2
        const jitter = (Math.random() - 0.5) * (ANGLE_PER_SLOT - 4)
        const desiredMod = (360 - (targetCenter + jitter) + 360) % 360
        setRotation((prev) => {
          const currentMod = ((prev % 360) + 360) % 360
          let delta = desiredMod - currentMod
          if (delta <= 0) delta += 360
          return prev + delta + FULL_SPINS * 360
        })
        setRolling(true)
        const revealedAt = me.rolledHeroes.length
        window.setTimeout(() => {
          setRolling(false)
          setRevealedCount(revealedAt)
        }, SPIN_MS)
      }
      previousCount.current = me.rolledHeroes.length
    }
  }, [me.rolledHeroes.length, me.rolledHeroes])

  return { rotation, rolling, revealedCount, spinEasing: SPIN_EASING, spinMs: SPIN_MS }
}
