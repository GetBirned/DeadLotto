import { useEffect, useState } from 'react'
import { CHALLENGES, CHALLENGE_BY_SLUG, RANDOM_BUILD_CHALLENGE_SLUG } from '@shared/challenges'
import { ITEM_BY_SLUG } from '@shared/deadlockItems'
import { playRevealChime } from '../../lib/sfx'

const CYCLE_MS = 2400
const CYCLE_INTERVAL = 90

export function ChallengeRollOverlay({
  challengeSlugs,
  randomBuildItemSlugs,
}: {
  challengeSlugs: string[]
  randomBuildItemSlugs: string[]
}) {
  const [revealed, setRevealed] = useState(false)
  const [flickerNames, setFlickerNames] = useState<string[]>(challengeSlugs.map(() => CHALLENGES[0].name))

  useEffect(() => {
    if (challengeSlugs.length === 0) return
    setRevealed(false)
    const interval = window.setInterval(() => {
      setFlickerNames(challengeSlugs.map(() => CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)].name))
    }, CYCLE_INTERVAL)
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval)
      setRevealed(true)
      playRevealChime()
    }, CYCLE_MS)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [challengeSlugs.join(',')])

  const challenges = challengeSlugs.map((s) => CHALLENGE_BY_SLUG[s]).filter(Boolean)
  const isRandomBuild = challengeSlugs.includes(RANDOM_BUILD_CHALLENGE_SLUG)
  const randomBuildItems = randomBuildItemSlugs.map((s) => ITEM_BY_SLUG[s]).filter(Boolean)

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dl-border bg-black/70 px-8 py-6 text-center">
      <p className="text-xs uppercase tracking-widest text-dl-text/50">Your Challenge{challenges.length > 1 ? 's' : ''}</p>

      {revealed ? (
        <div className="flex flex-col gap-4">
          {challenges.map((c) => (
            <div key={c.slug} className="flex flex-col gap-1">
              <p className="font-display text-2xl text-dl-text">{c.name}</p>
              <p className="text-sm text-dl-text/70">{c.description}</p>
            </div>
          ))}

          {isRandomBuild && randomBuildItems.length > 0 && (
            <div className="grid max-w-2xl grid-cols-3 gap-2 sm:grid-cols-4">
              {randomBuildItems.map((item) => (
                <div
                  key={item.slug}
                  title={item.description}
                  className="flex flex-col items-center gap-1 rounded border border-dl-border bg-black/40 p-2"
                >
                  <img src={item.icon} alt={item.name} className="h-10 w-10 object-contain" />
                  <span className="text-center text-[11px] leading-tight text-dl-text">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {flickerNames.map((name, i) => (
            <p key={i} className="font-display text-2xl text-dl-text/50 blur-[1px] transition-all">
              {name}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
