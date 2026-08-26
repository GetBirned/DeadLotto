import { useEffect, useState, type FormEvent } from 'react'
import { getSocket } from '../../lib/socket'
import type { LobbyPlayerState, LobbyState } from '@shared/types'
import { PlayerAvatar } from './PlayerAvatar'
import { playWinStinger, playLossStinger } from '../../lib/sfx'

export function FinishGameFlow({ lobby, me }: { lobby: LobbyState; me: LobbyPlayerState }) {
  const socket = getSocket()
  const [kills, setKills] = useState('')
  const [deaths, setDeaths] = useState('')
  const [assists, setAssists] = useState('')
  const [souls, setSouls] = useState('')
  const won = lobby.lastOutcome === 'win'

  useEffect(() => {
    if (won) playWinStinger()
    else playLossStinger()
    // Fires once when this screen first appears for the outcome it was mounted with -
    // not on every re-render while the player is filling out the stats form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    socket.emit('lobby:submit-stats', {
      lobbyId: lobby.id,
      kills: Number(kills) || 0,
      deaths: Number(deaths) || 0,
      assists: Number(assists) || 0,
      souls: Number(souls) || 0,
    })
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center">
      <h2
        className={`font-display text-5xl tracking-wide ${won ? 'text-dl-text' : 'text-red-500'} drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]`}
      >
        {won ? 'VICTORY' : 'DEFEAT'}
      </h2>

      {me.ready ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-dl-text/60">Stats submitted. Waiting on your team...</p>
          <div className="flex gap-2">
            {lobby.players.map((p) => (
              <div key={p.user.id} className="relative">
                <PlayerAvatar user={p.user} size={9} />
                {p.ready && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-dl-mint text-[10px] text-black">
                    ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex w-full flex-col gap-3 rounded-lg border border-dl-border bg-black/50 p-6">
          <p className="mb-1 text-sm text-dl-text/70">Enter your final stats for this game.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatInput label="Kills" value={kills} onChange={setKills} />
            <StatInput label="Deaths" value={deaths} onChange={setDeaths} />
            <StatInput label="Assists" value={assists} onChange={setAssists} />
            <StatInput label="Souls" value={souls} onChange={setSouls} />
          </div>
          <button
            type="submit"
            className="mt-2 rounded bg-dl-mint py-2 font-display tracking-wide text-black transition hover:brightness-110"
          >
            Submit Stats
          </button>
        </form>
      )}
    </div>
  )
}

function StatInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      {label}
      <input
        required
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-dl-border bg-black/40 px-2 py-2 text-center outline-none focus:border-dl-mint"
      />
    </label>
  )
}
