import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api, ApiError } from '../lib/api'
import { HowItWorksModal } from '../components/HowItWorksModal'
import type { LobbyState } from '@shared/types'

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)

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
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center sm:gap-10">
      <img
        src="/assets/branding/deadLotto_textLogo.png"
        alt="DeadLotto"
        className="w-52 max-w-full drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] sm:w-[26rem]"
      />
      <p className="max-w-2xl text-sm text-dl-text/70 sm:text-lg">
        A strat-roulette companion for Deadlock. Roll a random hero, roll a random challenge, and see if your team
        can pull off the run.
      </p>

      {!user ? (
        <p className="text-lg text-dl-text sm:text-xl">Log in or sign up above to create or join a lobby.</p>
      ) : (
        <div className="grid w-full grid-cols-2 gap-3 sm:gap-6">
          <div className="rounded-lg border border-dl-border bg-black/40 p-4 sm:p-8">
            <h2 className="mb-1 font-display text-base text-dl-text sm:mb-3 sm:text-2xl">Host a Lobby</h2>
            <p className="mb-3 hidden text-dl-text/60 sm:mb-6 sm:block">Start a new lobby and invite up to 5 friends.</p>
            <button
              type="button"
              disabled={busy}
              onClick={createLobby}
              className="w-full rounded bg-dl-mint py-2 font-display text-sm tracking-wide text-black transition hover:brightness-110 disabled:opacity-50 sm:py-3 sm:text-lg"
            >
              Create Lobby
            </button>
          </div>

          <div className="rounded-lg border border-dl-border bg-black/40 p-4 sm:p-8">
            <h2 className="mb-1 font-display text-base text-dl-text sm:mb-3 sm:text-2xl">Join a Lobby</h2>
            <p className="mb-3 hidden text-dl-text/60 sm:mb-6 sm:block">Enter the invite code your host shared with you.</p>
            <form onSubmit={joinLobby} className="flex gap-1.5 sm:gap-2">
              <input
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={8}
                className="w-0 flex-1 rounded border border-dl-border bg-black/40 px-2 py-2 text-center font-display text-sm tracking-[0.1em] outline-none focus:border-dl-mint sm:px-3 sm:py-3 sm:text-lg sm:tracking-[0.2em]"
              />
              <button
                type="submit"
                disabled={busy}
                className="shrink-0 rounded border border-dl-mint/60 px-3 py-2 font-display text-sm text-dl-mint transition hover:bg-dl-mint hover:text-black disabled:opacity-50 sm:px-5 sm:py-3 sm:text-lg"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setHowItWorksOpen(true)}
        className="rounded border border-dl-border px-4 py-1.5 font-display text-sm tracking-wide text-dl-text/70 transition hover:border-dl-mint hover:text-dl-mint"
      >
        What is DeadLotto?
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {howItWorksOpen && <HowItWorksModal onClose={() => setHowItWorksOpen(false)} />}
    </div>
  )
}
