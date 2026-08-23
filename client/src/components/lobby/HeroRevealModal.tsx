import { getSocket } from '../../lib/socket'
import { getHero } from '@shared/heroRegistry'
import type { LobbyPlayerState, LobbyState } from '@shared/types'
import { PlayerAvatar } from './PlayerAvatar'
import { playRevealChime } from '../../lib/sfx'

export function HeroRevealModal({ lobby, me }: { lobby: LobbyState; me: LobbyPlayerState }) {
  const socket = getSocket()

  function lockIn(slug: string) {
    if (me.lockedHeroSlug) return
    playRevealChime()
    socket.emit('lobby:lock-in-hero', { lobbyId: lobby.id, heroSlug: slug })
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 rounded-lg border border-dl-border bg-black/60 p-6 text-center">
      <h2 className="font-display text-3xl text-dl-text">What character did you get?</h2>
      <p className="max-w-lg text-dl-text/60">
        Once Deadlock actually starts, lock in the hero you'll play. Everyone must lock in before the round continues.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        {me.rolledHeroes.map((slug, i) => {
          const hero = getHero(slug)
          const selected = me.lockedHeroSlug === slug
          return (
            <button
              key={`${slug}-${i}`}
              type="button"
              onClick={() => lockIn(slug)}
              disabled={!!me.lockedHeroSlug}
              className={`flex w-28 flex-col items-center gap-2 rounded-lg border-2 p-3 transition ${
                selected
                  ? 'border-dl-mint bg-dl-mint/10'
                  : 'border-dl-border bg-black/40 hover:border-dl-mint disabled:hover:border-dl-border'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <img src={hero.cardArt} alt={hero.name} className="h-20 w-20 rounded object-cover" />
              <span className="font-display text-sm">{hero.name}</span>
            </button>
          )
        })}
      </div>

      {me.lockedHeroSlug ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-dl-text">You locked in {getHero(me.lockedHeroSlug).name}. Waiting for your team...</p>
          <div className="flex gap-2">
            {lobby.players.map((p) => (
              <div key={p.user.id} className="relative">
                <PlayerAvatar user={p.user} size={9} />
                {p.lockedHeroSlug && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-dl-mint text-[10px] text-black">
                    ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-dl-text/50">Click a hero above once you know what you'll be playing.</p>
      )}
    </div>
  )
}
