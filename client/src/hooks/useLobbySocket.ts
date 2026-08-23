import { useEffect, useState } from 'react'
import { getSocket } from '../lib/socket'
import type { LobbyState } from '@shared/types'

export function useLobbySocket(lobbyId: string | undefined, initialState: LobbyState | null = null) {
  const [state, setState] = useState<LobbyState | null>(initialState)
  const [error, setError] = useState<string | null>(null)
  const [kicked, setKicked] = useState(false)

  useEffect(() => {
    if (!lobbyId) return
    const socket = getSocket()

    const join = () => socket.emit('lobby:join', { lobbyId })
    join()

    const onState = (s: LobbyState) => {
      if (s.id === lobbyId) setState(s)
    }
    const onError = (msg: string) => setError(msg)
    const onKicked = (payload: { lobbyId: string }) => {
      if (payload.lobbyId === lobbyId) setKicked(true)
    }

    socket.on('lobby:state', onState)
    socket.on('lobby:error', onError)
    socket.on('lobby:kicked', onKicked)
    // If the underlying connection drops and reconnects (server restart/redeploy, a
    // brief network blip), the server has no memory of which room this socket was in -
    // re-join so state keeps flowing instead of the page silently going stale.
    socket.on('connect', join)

    // Deliberately does not emit lobby:leave here - this cleanup also runs on every
    // navigation away from the lobby page (e.g. checking the leaderboard or a
    // profile), not just on an actual departure, and there's no way to tell those
    // apart from an unmount alone. Real departure is handled by an explicit
    // lobby:leave from the "Leave Lobby" button, or server-side by the socket
    // disconnect grace period (tab close, network drop) - both know the difference.
    return () => {
      socket.off('lobby:state', onState)
      socket.off('lobby:error', onError)
      socket.off('lobby:kicked', onKicked)
      socket.off('connect', join)
    }
  }, [lobbyId])

  return { state, error, kicked, socket: getSocket() }
}
