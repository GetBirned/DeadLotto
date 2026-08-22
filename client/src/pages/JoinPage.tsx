import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api, ApiError } from '../lib/api'
import type { LobbyState } from '@shared/types'

export function JoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user || !inviteCode) return
    api
      .post<LobbyState>('/lobbies/join', { inviteCode })
      .then((lobby) => navigate(`/lobby/${lobby.id}`, { replace: true }))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Something went wrong.'))
  }, [loading, user, inviteCode, navigate])

  if (loading) return null

  if (!user) {
    return (
      <div className="mx-auto max-w-md text-center text-dl-text/70">
        Log in or sign up above, then this link will join you into the lobby automatically.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md text-center text-dl-text/70">
      {error ? <p className="text-red-400">{error}</p> : <p>Joining lobby...</p>}
    </div>
  )
}
