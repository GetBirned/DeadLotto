import { getSocket } from '../../lib/socket'
import { getHero } from '@shared/heroRegistry'
import type { LobbyPlayerState, LobbyState } from '@shared/types'
import { RouletteWheel } from './RouletteWheel'
import { PlayerAvatar } from './PlayerAvatar'
import type { useHeroRollAnimation } from '../../hooks/useHeroRollAnimation'

export function RouletteScreen({
  lobby,
  me,
  anim,
}: {
  lobby: LobbyState
  me: LobbyPlayerState
  anim: ReturnType<typeof useHeroRollAnimation>
}) {
  const socket = getSocket()
  const { rotation, rolling, revealedCount, spinEasing, spinMs } = anim

  const needed = lobby.settings.numHeroes
  const done = revealedCount >= needed

  function spin() {
    if (rolling || done) return
    socket.emit('lobby:roll-hero', { lobbyId: lobby.id })
  }

  const revealedHeroes = me.rolledHeroes.slice(0, revealedCount)

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="font-display text-3xl text-dl-text">Roll Your Heroes</h2>

      <RouletteWheel rotation={rotation} spinning={rolling} spinMs={spinMs} easing={spinEasing} />

      <button
        type="button"
        onClick={spin}
        disabled={rolling || done}
        className="rounded bg-dl-mint px-8 py-3 font-display text-lg tracking-wide text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {done ? 'All Rolled!' : rolling ? 'Spinning...' : `Spin (${revealedCount}/${needed})`}
      </button>

      {revealedHeroes.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {revealedHeroes.map((slug, i) => {
            const hero = getHero(slug)
            return (
              <div key={`${slug}-${i}`} className="flex w-24 flex-col items-center gap-1 rounded border border-dl-border bg-black/40 p-2">
                <img src={hero.icon} alt={hero.name} className="h-14 w-14 rounded object-cover" />
                <span className="text-center text-xs">{hero.name}</span>
              </div>
            )
          })}
        </div>
      )}

      {done && (
        <div className="flex flex-col items-center gap-2 text-dl-text/60">
          <p>Waiting for other players to finish rolling...</p>
          <div className="flex gap-2">
            {lobby.players.map((p) => (
              <div key={p.user.id} className="relative">
                <PlayerAvatar user={p.user} size={9} />
                {p.rolledHeroes.length >= needed && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-dl-mint text-[10px] text-black">
                    ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
