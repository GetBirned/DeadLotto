import { useEffect, useState } from 'react'
import { getSocket } from '../../lib/socket'
import { api } from '../../lib/api'
import { getHero } from '@shared/heroRegistry'
import { CHALLENGE_BY_SLUG } from '@shared/challenges'
import type { LobbyState, SessionRecap } from '@shared/types'
import { PlayerAvatar } from './PlayerAvatar'
import { SoulsStat } from '../SoulsStat'
import { ChallengeHoverCell } from '../ChallengeHoverCell'
import { downloadRecapImage } from '../../lib/recapImage'

export function GameSummary({ lobby, isHost }: { lobby: LobbyState; isHost: boolean }) {
  const socket = getSocket()
  const won = lobby.lastOutcome === 'win'
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [recap, setRecap] = useState<SessionRecap | null>(null)

  useEffect(() => {
    api
      .get<SessionRecap>(`/lobbies/${lobby.id}/session-recap`)
      .then(setRecap)
      .catch(() => {})
  }, [lobby.id])

  function copyShareLink() {
    if (!lobby.lastShareCode) return
    const url = `${window.location.origin}/summary/${lobby.lastShareCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function downloadImage() {
    setDownloading(true)
    try {
      await downloadRecapImage(
        won ? 'win' : 'loss',
        lobby.players.map((p) => ({
          username: p.user.username,
          heroSlug: p.lockedHeroSlug,
          challengeNames: p.rolledChallenges.map((s) => CHALLENGE_BY_SLUG[s]?.name).filter(Boolean).join(', '),
          kills: p.kills ?? 0,
          deaths: p.deaths ?? 0,
          souls: p.souls ?? 0,
        })),
      )
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
      <h2 className={`font-display text-3xl ${won ? 'text-dl-text' : 'text-red-500'}`}>
        Game Summary - {won ? 'Victory' : 'Defeat'}
      </h2>

      {recap && recap.totalGames > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-dl-text/60">
          <span>
            This session: <span className="text-dl-text">{recap.sessionWins}W - {recap.sessionLosses}L</span> over{' '}
            {recap.totalGames} games
          </span>
          {recap.mostPlayedHero && (
            <span className="flex items-center gap-1.5">
              Most rolled:
              <img src={recap.mostPlayedHero.heroIcon} alt="" className="h-5 w-5 rounded-full border border-dl-border object-cover" />
              <span className="text-dl-text">{recap.mostPlayedHero.heroName}</span>
            </span>
          )}
        </div>
      )}

      {/* Card layout below sm: the 6-column table doesn't fit a phone screen without an
          unlabeled horizontal scroll, so mobile gets one stat card per player instead. */}
      <div className="flex w-full flex-col gap-3 sm:hidden">
        {lobby.players.map((p) => {
          const hero = p.lockedHeroSlug ? getHero(p.lockedHeroSlug) : null
          const challengeDefs = p.rolledChallenges.map((s) => CHALLENGE_BY_SLUG[s]).filter(Boolean)
          return (
            <div key={p.user.id} className="rounded-lg border border-dl-border bg-black/40 p-3 text-left text-sm">
              <div className="mb-2 flex items-center gap-2">
                <PlayerAvatar user={p.user} size={7} />
                <span className="font-display text-dl-text">{p.user.username}</span>
              </div>
              {hero && (
                <div className="mb-1 flex items-center gap-2 text-dl-text/80">
                  <img src={hero.icon} alt="" className="h-6 w-6 rounded-full border border-dl-border object-cover" />
                  {hero.name}
                </div>
              )}
              <div className="mb-2 text-dl-text/80">
                <ChallengeHoverCell challenges={challengeDefs} />
              </div>
              <div className="flex items-center justify-between text-dl-text/70">
                <span>
                  {p.kills} / {p.deaths} K/D
                </span>
                <SoulsStat souls={p.souls ?? 0} size="sm" />
                <span>
                  {p.sessionWins}W - {p.sessionLosses}L
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden w-full overflow-x-auto rounded-lg border border-dl-border sm:block">
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

      <div className="flex flex-wrap justify-center gap-3">
        {lobby.lastShareCode && (
          <button
            type="button"
            onClick={copyShareLink}
            className="flex items-center gap-2 rounded border border-dl-mint/60 px-4 py-2 font-display text-sm tracking-wide text-dl-mint transition hover:bg-dl-mint hover:text-black"
          >
            {copied ? 'Link Copied!' : 'Copy Share Link'}
          </button>
        )}
        <button
          type="button"
          onClick={downloadImage}
          disabled={downloading}
          className="flex items-center gap-2 rounded border border-dl-border px-4 py-2 font-display text-sm tracking-wide text-dl-text/70 transition hover:border-dl-mint hover:text-dl-mint disabled:opacity-50"
        >
          {downloading ? 'Generating...' : 'Download Recap Image'}
        </button>
      </div>
    </div>
  )
}
