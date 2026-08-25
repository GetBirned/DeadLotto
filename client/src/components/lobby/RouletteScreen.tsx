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

  const rerollsLeft = lobby.settings.rerollsAllowed - me.rerollsUsed
  // Rerolling is a deliberate post-roll choice, not something that happens mid-spin -
  // it only opens up once all of this player's heroes are rolled, and closes again the
  // moment they've either used up their rerolls or explicitly skipped the rest.
  const rerollsPending = done && lobby.settings.rerollsAllowed > 0 && !me.rerollsConfirmed && rerollsLeft > 0
  const waitingForOthers = done && !rerollsPending

  function rerollIndex(index: number) {
    if (rolling || !rerollsPending) return
    socket.emit('lobby:reroll-hero', { lobbyId: lobby.id, heroIndex: index })
  }

  function skipRerolls() {
    if (rolling || !rerollsPending) return
    socket.emit('lobby:confirm-rerolls', { lobbyId: lobby.id })
  }

  const revealedHeroes = me.rolledHeroes.slice(0, revealedCount)

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="font-display text-3xl text-dl-text">Roll Your Heroes</h2>

      <RouletteWheel rotation={rotation} spinning={rolling} spinMs={spinMs} easing={spinEasing} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={spin}
          disabled={rolling || done}
          className="rounded bg-dl-mint px-8 py-3 font-display text-lg tracking-wide text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {done ? 'All Rolled!' : rolling ? 'Spinning...' : `Spin (${revealedCount}/${needed})`}
        </button>
      </div>

      {revealedHeroes.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {revealedHeroes.map((slug, i) => {
            const hero = getHero(slug)
            return (
              <div key={`${slug}-${i}`} className="flex w-24 flex-col items-center gap-1 rounded border border-dl-border bg-black/40 p-2">
                <img src={hero.icon} alt={hero.name} className="h-14 w-14 rounded object-cover" />
                <span className="text-center text-xs">{hero.name}</span>
                {rerollsPending && (
                  <button
                    type="button"
                    onClick={() => rerollIndex(i)}
                    disabled={rolling}
                    className="mt-1 w-full rounded border border-dl-mint/60 py-1 text-[10px] text-dl-mint transition hover:bg-dl-mint hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Reroll
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {rerollsPending && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-dl-text/60">
            {rerollsLeft} reroll{rerollsLeft === 1 ? '' : 's'} left - pick a hero above to reroll it, or skip.
          </p>
          <button
            type="button"
            onClick={skipRerolls}
            disabled={rolling}
            className="rounded border border-dl-border px-4 py-2 text-xs text-dl-text/70 transition hover:border-dl-mint hover:text-dl-mint disabled:cursor-not-allowed disabled:opacity-30"
          >
            Skip Rerolls
          </button>
        </div>
      )}

      {waitingForOthers && (
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
