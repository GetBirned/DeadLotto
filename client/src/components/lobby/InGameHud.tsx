import { useState } from 'react'
import { getHero } from '@shared/heroRegistry'
import { CHALLENGE_BY_SLUG } from '@shared/challenges'
import type { LobbyPlayerState } from '@shared/types'
import { PlayerAvatar } from './PlayerAvatar'

export function InGameHud({ players, selfId }: { players: LobbyPlayerState[]; selfId: string }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const teammates = players.filter((p) => p.user.id !== selfId)

  if (teammates.length === 0) return null

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {teammates.map((p) => {
        const hero = p.lockedHeroSlug ? getHero(p.lockedHeroSlug) : null
        const challenges = p.rolledChallenges.map((s) => CHALLENGE_BY_SLUG[s]).filter(Boolean)
        return (
          <div
            key={p.user.id}
            className="relative flex items-center gap-2 rounded-full border border-dl-border bg-black/50 py-1.5 pl-1.5 pr-4"
            onMouseEnter={() => setHovered(p.user.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <PlayerAvatar user={p.user} size={8} />
            {hero && <img src={hero.icon} alt={hero.name} className="h-7 w-7 rounded-full border border-dl-border object-cover" />}
            <div className="text-xs">
              <p className="font-display">{p.user.username}</p>
              <p className="text-dl-text/60">{challenges.map((c) => c.name).join(', ') || '...'}</p>
            </div>

            {hovered === p.user.id && challenges.length > 0 && (
              <div className="absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded border border-dl-border bg-dl-panel p-3 text-left text-xs shadow-xl">
                {challenges.map((c) => (
                  <div key={c.slug} className="mb-1 last:mb-0">
                    <p className="font-display text-dl-text">{c.name}</p>
                    <p className="text-dl-text/70">{c.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
