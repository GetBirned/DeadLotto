import { useEffect, useRef, useState } from 'react'
import { getSocket } from '../lib/socket'
import type { LobbyState } from '@shared/types'

// How long to wait before actually telling the server "I left" after this hook
// unmounts. React 18 StrictMode intentionally double-invokes effects in dev
// (mount -> cleanup -> mount again, synchronously) to catch effect bugs - without
// this debounce, that synthetic cleanup would send a real leave/removal on the very
// first render and the immediate remount's rejoin wouldn't undo it. A short delay
// that the next mount can cancel handles both that and any stray remount in
// production, while still leaving promptly on a real navigation-away or tab close.
const LEAVE_DEBOUNCE_MS = 150

export function useLobbySocket(lobbyId: string | undefined, initialState: LobbyState | null = null) {
  const [state, setState] = useState<LobbyState | null>(initialState)
  const [error, setError] = useState<string | null>(null)
  const [kicked, setKicked] = useState(false)
  const pendingLeaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!lobbyId) return
    const socket = getSocket()

    if (pendingLeaveRef.current) {
      clearTimeout(pendingLeaveRef.current)
      pendingLeaveRef.current = null
    }

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

    return () => {
      socket.off('lobby:state', onState)
      socket.off('lobby:error', onError)
      socket.off('lobby:kicked', onKicked)
      socket.off('connect', join)
      pendingLeaveRef.current = setTimeout(() => {
        socket.emit('lobby:leave', { lobbyId })
        pendingLeaveRef.current = null
      }, LEAVE_DEBOUNCE_MS)
    }
  }, [lobbyId])

  return { state, error, kicked, socket: getSocket() }
}
