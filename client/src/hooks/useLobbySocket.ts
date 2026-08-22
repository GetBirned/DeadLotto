import { useEffect, useState } from 'react'
import { getSocket } from '../lib/socket'
import type { LobbyState } from '@shared/types'

export function useLobbySocket(lobbyId: string | undefined, initialState: LobbyState | null = null) {
  const [state, setState] = useState<LobbyState | null>(initialState)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lobbyId) return
    const socket = getSocket()
    socket.emit('lobby:join', { lobbyId })

    const onState = (s: LobbyState) => {
      if (s.id === lobbyId) setState(s)
    }
    const onError = (msg: string) => setError(msg)

    socket.on('lobby:state', onState)
    socket.on('lobby:error', onError)

    return () => {
      socket.off('lobby:state', onState)
      socket.off('lobby:error', onError)
      socket.emit('lobby:leave', { lobbyId })
    }
  }, [lobbyId])

  return { state, error, socket: getSocket() }
}
