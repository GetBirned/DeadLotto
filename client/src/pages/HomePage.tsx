import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api, ApiError } from '../lib/api'
import type { LobbyState } from '@shared/types'

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function createLobby() {
    setBusy(true)
    setError(null)
    try {
      const lobby = await api.post<LobbyState>('/lobbies')
      navigate(`/lobby/${lobby.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function joinLobby(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const lobby = await api.post<LobbyState>('/lobbies/join', { inviteCode })
      navigate(`/lobby/${lobby.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 text-center">
      <img
        src="/assets/branding/deadLotto_textLogo.png"
        alt="DeadLotto"
        className="w-[26rem] max-w-full drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
      />
      <p className="max-w-2xl text-lg text-dl-text/70">
        A strat-roulette companion for Deadlock. Roll a random hero, roll a random challenge, and see if your team
        can pull off the run.
      </p>

      {!user ? (
        <p className="text-xl text-dl-text">Log in or sign up above to create or join a lobby.</p>
      ) : (
        <div className="flex w-full flex-col gap-6 sm:flex-row sm:items-stretch sm:justify-center">
          <div className="flex-1 rounded-lg border border-dl-border bg-black/40 p-8">
            <h2 className="mb-3 font-display text-2xl text-dl-text">Host a Lobby</h2>
            <p className="mb-6 text-dl-text/60">Start a new lobby and invite up to 5 friends.</p>
            <button
              type="button"
              disabled={busy}
              onClick={createLobby}
              className="w-full rounded bg-dl-mint py-3 font-display text-lg tracking-wide text-black transition hover:brightness-110 disabled:opacity-50"
            >
              Create Lobby
            </button>
          </div>

          <div className="flex-1 rounded-lg border border-dl-border bg-black/40 p-8">
            <h2 className="mb-3 font-display text-2xl text-dl-text">Join a Lobby</h2>
            <p className="mb-6 text-dl-text/60">Enter the invite code your host shared with you.</p>
            <form onSubmit={joinLobby} className="flex gap-2">
              <input
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={8}
                className="flex-1 rounded border border-dl-border bg-black/40 px-3 py-3 text-center font-display text-lg tracking-[0.2em] outline-none focus:border-dl-mint"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded border border-dl-mint/60 px-5 py-3 font-display text-lg text-dl-mint transition hover:bg-dl-mint hover:text-black disabled:opacity-50"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
