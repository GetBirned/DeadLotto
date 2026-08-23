import { useState } from 'react'
import { getSocket } from '../../lib/socket'
import { getHero } from '@shared/heroRegistry'
import type { LobbyPlayerState, LobbyState } from '@shared/types'
import { ChallengeRollOverlay } from './ChallengeRollOverlay'
import { InGameHud } from './InGameHud'

export function GameScreen({ lobby, me, isHost }: { lobby: LobbyState; me: LobbyPlayerState; isHost: boolean }) {
  const socket = getSocket()
  const [confirming, setConfirming] = useState(false)
  const hero = me.lockedHeroSlug ? getHero(me.lockedHeroSlug) : null

  function finish(outcome: 'win' | 'loss') {
    socket.emit('lobby:finish-game', { lobbyId: lobby.id, outcome })
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {hero && (
        <>
          <img
            src={hero.background}
            alt=""
            className="pointer-events-none fixed inset-0 -z-[5] h-full w-full object-cover opacity-90"
          />
          {hero.nameSvg && (
            <img
              src={hero.nameSvg}
              alt={hero.name}
              className="mt-4 h-20 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] sm:h-28"
            />
          )}
        </>
      )}

      {me.rolledChallenges.length > 0 && <ChallengeRollOverlay challengeSlugs={me.rolledChallenges} />}

      <InGameHud players={lobby.players} selfId={me.user.id} />

      {isHost && (
        <div className="mt-4">
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded border border-dl-mint/70 bg-black/50 px-6 py-2 font-display tracking-wide text-dl-mint transition hover:bg-dl-mint hover:text-black"
            >
              Finish Game
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-dl-border bg-black/60 p-4">
              <span className="text-sm">Did your team win?</span>
              <button
                type="button"
                onClick={() => finish('win')}
                className="rounded bg-dl-mint px-4 py-2 font-display text-black hover:brightness-110"
              >
                Win
              </button>
              <button
                type="button"
                onClick={() => finish('loss')}
                className="rounded bg-red-800 px-4 py-2 font-display text-white hover:brightness-110"
              >
                Loss
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="text-xs text-dl-text/50 hover:text-dl-text">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
