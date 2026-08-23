import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { useLobbySocket } from '../hooks/useLobbySocket'
import { useHeroRollAnimation } from '../hooks/useHeroRollAnimation'
import type { LobbyPlayerState, LobbyState } from '@shared/types'
import { LobbyDashboard } from '../components/lobby/LobbyDashboard'
import { RouletteScreen } from '../components/lobby/RouletteScreen'
import { HeroRevealModal } from '../components/lobby/HeroRevealModal'
import { GameScreen } from '../components/lobby/GameScreen'
import { FinishGameFlow } from '../components/lobby/FinishGameFlow'
import { GameSummary } from '../components/lobby/GameSummary'

export function LobbyPage() {
  const { lobbyId } = useParams<{ lobbyId: string }>()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [initialState, setInitialState] = useState<LobbyState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!lobbyId || !user) return
    api
      .get<LobbyState>(`/lobbies/${lobbyId}`)
      .then(setInitialState)
      .catch(() => setLoadError('Lobby not found.'))
  }, [lobbyId, user])

  const { state, error, kicked } = useLobbySocket(user ? lobbyId : undefined, initialState)

  if (loading) return null
  if (!user) {
    return (
      <div className="mx-auto max-w-md text-center text-dl-text/70">
        Please log in to view this lobby.
      </div>
    )
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="mb-4 text-red-400">{loadError}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded border border-dl-mint/60 px-4 py-2 font-display text-dl-mint hover:bg-dl-mint hover:text-black"
        >
          Back Home
        </button>
      </div>
    )
  }
  if (!state) {
    return <div className="text-center text-dl-text/60">Connecting to lobby...</div>
  }

  if (kicked) {
    return <KickedNotice />
  }

  const me = state.players.find((p) => p.user.id === user.id)
  if (!me) {
    return <div className="text-center text-dl-text/60">Joining lobby...</div>
  }
  const isHost = state.hostUserId === user.id

  if (state.status === 'closed') {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="mb-4 text-dl-text/70">This lobby has been closed by the host.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded border border-dl-mint/60 px-4 py-2 font-display text-dl-mint hover:bg-dl-mint hover:text-black"
        >
          Back Home
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      {error && <p className="mb-4 text-center text-sm text-red-400">{error}</p>}
      <LobbyPhases state={state} me={me} isHost={isHost} />
    </div>
  )
}

function KickedNotice() {
  const navigate = useNavigate()

  useEffect(() => {
    const timeout = setTimeout(() => navigate('/'), 4000)
    return () => clearTimeout(timeout)
  }, [navigate])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-lg border border-dl-border bg-black/60 p-8 text-center">
      <h2 className="font-display text-2xl text-red-400">Removed from Lobby</h2>
      <p className="text-dl-text/70">The host removed you from this lobby.</p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="rounded border border-dl-mint/60 px-4 py-2 font-display text-dl-mint transition hover:bg-dl-mint hover:text-black"
      >
        Back Home
      </button>
    </div>
  )
}

// Split out so useHeroRollAnimation only ever mounts once `me` is guaranteed to be the
// real, loaded player record - avoids replaying a spin animation for rolls that were
// already known before this component existed (e.g. on a page refresh mid-round).
function LobbyPhases({ state, me, isHost }: { state: LobbyState; me: LobbyPlayerState; isHost: boolean }) {
  const anim = useHeroRollAnimation(me)

  // The server flips to "awaiting-lock-in" the instant everyone's roll data is in,
  // which can be before this player's own wheel has visually finished spinning. Keep
  // showing the roulette screen until the local animation has caught up.
  const rollAnimationCaughtUp = anim.revealedCount >= state.settings.numHeroes
  const showRoulette = state.status === 'rolling' || (state.status === 'awaiting-lock-in' && !rollAnimationCaughtUp)

  if (state.status === 'lobby') return <LobbyDashboard lobby={state} isHost={isHost} />
  if (showRoulette) return <RouletteScreen lobby={state} me={me} anim={anim} />
  if (state.status === 'awaiting-lock-in') return <HeroRevealModal lobby={state} me={me} />
  if (state.status === 'in-game') return <GameScreen lobby={state} me={me} isHost={isHost} />
  if (state.status === 'finished-pending-stats') return <FinishGameFlow lobby={state} me={me} />
  if (state.status === 'summary') return <GameSummary lobby={state} isHost={isHost} />
  return null
}
