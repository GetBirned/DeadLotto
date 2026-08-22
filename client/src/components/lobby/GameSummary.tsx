import { getSocket } from '../../lib/socket'
import { getHero } from '@shared/heroRegistry'
import { CHALLENGE_BY_SLUG } from '@shared/challenges'
import type { LobbyState } from '@shared/types'
import { PlayerAvatar } from './PlayerAvatar'
import { SoulsStat } from '../SoulsStat'
import { ChallengeHoverCell } from '../ChallengeHoverCell'

export function GameSummary({ lobby, isHost }: { lobby: LobbyState; isHost: boolean }) {
  const socket = getSocket()
  const won = lobby.lastOutcome === 'win'

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
      <h2 className={`font-display text-3xl ${won ? 'text-dl-text' : 'text-red-500'}`}>
        Game Summary - {won ? 'Victory' : 'Defeat'}
      </h2>

      <div className="w-full overflow-x-auto rounded-lg border border-dl-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/50 text-dl-text/50">
            <tr>
              <th className="p-2 font-normal">Player</th>
              <th className="p-2 font-normal">Hero</th>
              <th className="p-2 font-normal">Challenge</th>
              <th className="p-2 font-normal">K / D</th>
              <th className="p-2 font-normal">Souls</th>
              <th className="p-2 font-normal">Session</th>
            </tr>
          </thead>
          <tbody>
            {lobby.players.map((p) => {
              const hero = p.lockedHeroSlug ? getHero(p.lockedHeroSlug) : null
              const challengeDefs = p.rolledChallenges.map((s) => CHALLENGE_BY_SLUG[s]).filter(Boolean)
              return (
                <tr key={p.user.id} className="border-t border-dl-border/50">
                  <td className="flex items-center gap-2 p-2">
                    <PlayerAvatar user={p.user} size={7} />
                    {p.user.username}
                  </td>
                  <td className="p-2">
                    {hero ? (
                      <span className="flex items-center gap-2">
                        <img src={hero.icon} alt="" className="h-7 w-7 rounded-full border border-dl-border object-cover" />
                        {hero.name}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="max-w-[160px] p-2">
                    <ChallengeHoverCell challenges={challengeDefs} />
                  </td>
                  <td className="p-2">
                    {p.kills} / {p.deaths}
                  </td>
                  <td className="p-2">
                    <SoulsStat souls={p.souls ?? 0} size="sm" />
                  </td>
                  <td className="p-2 text-dl-text">
                    {p.sessionWins}W - {p.sessionLosses}L
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isHost ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => socket.emit('lobby:play-again', { lobbyId: lobby.id })}
            className="rounded bg-dl-mint px-6 py-2 font-display tracking-wide text-black transition hover:brightness-110"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={() => socket.emit('lobby:close', { lobbyId: lobby.id })}
            className="rounded border border-dl-border px-6 py-2 font-display tracking-wide text-dl-text/70 transition hover:border-red-500 hover:text-red-400"
          >
            Close Lobby
          </button>
        </div>
      ) : (
        <p className="text-sm text-dl-text/50">Waiting for the host to start another round or close the lobby...</p>
      )}
    </div>
  )
}
