import { useEffect, useRef } from 'react'
import { getSocket } from '../../lib/socket'
import { HEROES, getHero } from '@shared/heroRegistry'
import { resolveTitleDisplay } from '@shared/achievements'
import type { LobbyPlayerState, LobbyState } from '@shared/types'
import { PlayerAvatar } from './PlayerAvatar'
import { playPickSound, unlockAudio } from '../../lib/sound'

export function DraftScreen({ lobby, me }: { lobby: LobbyState; me: LobbyPlayerState }) {
  const socket = getSocket()
  const needed = lobby.settings.numHeroes
  const myTurn = lobby.draftCurrentPickerId === me.user.id
  const picker = lobby.players.find((p) => p.user.id === lobby.draftCurrentPickerId)
  const pickerTitle = picker ? resolveTitleDisplay(picker.selectedTitleSlug) : null

  const takenSlugs = new Set(lobby.players.flatMap((p) => p.rolledHeroes))

  const totalPicks = lobby.players.reduce((sum, p) => sum + p.rolledHeroes.length, 0)
  const lastTotalPicks = useRef(totalPicks)
  useEffect(() => {
    // Fires for everyone in the lobby, not just whoever clicked - a pick made by any
    // player bumps the shared total, and every client sees the same increase via
    // broadcastLobby. Skips the very first render so joining/reloading mid-draft
    // doesn't play a sound for picks that already happened.
    if (totalPicks > lastTotalPicks.current) playPickSound()
    lastTotalPicks.current = totalPicks
  }, [totalPicks])

  function pick(slug: string) {
    unlockAudio()
    if (!myTurn || takenSlugs.has(slug) || me.rolledHeroes.length >= needed) return
    socket.emit('lobby:draft-pick', { lobbyId: lobby.id, heroSlug: slug })
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="font-display text-3xl text-dl-text">Draft Your Heroes</h2>

      {picker && (
        <div className="flex items-center gap-3 rounded-lg border border-dl-mint/60 bg-black/40 px-5 py-3">
          <PlayerAvatar user={picker.user} size={10} />
          <div>
            <p className="font-display text-lg text-dl-text">
              {picker.user.username} {myTurn ? 'selecting...' : 'is selecting...'}
            </p>
            {pickerTitle && (
              <p className="text-[11px] uppercase tracking-wide" style={{ color: pickerTitle.color }}>
                {pickerTitle.name}
              </p>
            )}
          </div>
        </div>
      )}

      <p className="text-sm text-dl-text/60">
        {myTurn ? "It's your turn - pick a hero below." : 'Waiting for your turn...'} ({me.rolledHeroes.length}/{needed} picked)
      </p>

      <div className="grid w-full max-w-4xl grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {HEROES.map((h) => {
          const taken = takenSlugs.has(h.slug)
          const clickable = myTurn && !taken && me.rolledHeroes.length < needed
          return (
            <button
              key={h.slug}
              type="button"
              onClick={() => pick(h.slug)}
              disabled={!clickable}
              title={h.name}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition ${
                taken
                  ? 'border-dl-border/30 bg-black/10 opacity-30'
                  : clickable
                    ? 'border-dl-border bg-black/30 hover:border-dl-mint hover:bg-dl-mint/10'
                    : 'border-dl-border/30 bg-black/20 opacity-60'
              }`}
            >
              <img src={h.icon} alt="" className="h-10 w-10 rounded-full border border-dl-border object-cover" />
              <span className="w-full truncate text-center text-[10px] text-dl-text">{h.name}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {lobby.players.map((p) => (
          <div key={p.user.id} className="flex flex-col items-center gap-1.5">
            <span className="text-xs text-dl-text/60">{p.user.username}</span>
            <div className="flex gap-1">
              {Array.from({ length: needed }).map((_, i) => {
                const slug = p.rolledHeroes[i]
                const hero = slug ? getHero(slug) : null
                return (
                  <div
                    key={i}
                    className="flex h-9 w-9 items-center justify-center rounded border border-dl-border bg-black/40"
                  >
                    {hero && <img src={hero.icon} alt={hero.name} title={hero.name} className="h-full w-full rounded object-cover" />}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
