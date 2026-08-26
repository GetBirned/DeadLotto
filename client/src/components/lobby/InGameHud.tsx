import { useState } from 'react'
import { getHero } from '@shared/heroRegistry'
import { CHALLENGE_BY_SLUG } from '@shared/challenges'
import { resolveTitleDisplay } from '@shared/achievements'
import type { LobbyPlayerState } from '@shared/types'
import { PlayerAvatar } from './PlayerAvatar'

export function InGameHud({ players, selfId }: { players: LobbyPlayerState[]; selfId: string }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const teammates = players.filter((p) => p.user.id !== selfId)

  if (teammates.length === 0) return null

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <p className="text-center text-xs uppercase tracking-widest text-dl-text/40">Your Team</p>
      {teammates.map((p) => {
        const hero = p.lockedHeroSlug ? getHero(p.lockedHeroSlug) : null
        const challenges = p.rolledChallenges.map((s) => CHALLENGE_BY_SLUG[s]).filter(Boolean)
        const title = resolveTitleDisplay(p.selectedTitleSlug)
        return (
          <div
            key={p.user.id}
            className="relative flex items-center gap-3 rounded-lg border border-dl-border bg-black/50 p-2.5"
            onMouseEnter={() => setHovered(p.user.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <PlayerAvatar user={p.user} size={10} />
            <div className="min-w-0 flex-1 text-left text-xs">
              <p className="truncate font-display text-sm text-dl-text">{p.user.username}</p>
              {title && (
                <p className="truncate text-[10px] uppercase tracking-wide" style={{ color: title.color }}>
                  {title.name}
                </p>
              )}
              <p className="truncate text-dl-text/60">{challenges.map((c) => c.name).join(', ') || 'No challenge'}</p>
            </div>
            {hero && (
              <img
                src={hero.icon}
                alt={hero.name}
                title={hero.name}
                className="h-9 w-9 shrink-0 rounded-full border border-dl-border object-cover"
              />
            )}

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
