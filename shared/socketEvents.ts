import type { LobbyState, GameOutcome, PublicUser } from './types'

// Client -> Server events
export interface ClientToServerEvents {
  'lobby:join': (payload: { lobbyId: string }) => void
  'lobby:leave': (payload: { lobbyId: string }) => void
  'lobby:update-settings': (payload: { lobbyId: string; numHeroes: 3 | 4 | 5; numChallenges: 1 | 2 | 3 }) => void
  'lobby:start-rolling': (payload: { lobbyId: string }) => void
  'lobby:roll-hero': (payload: { lobbyId: string }) => void
  'lobby:lock-in-hero': (payload: { lobbyId: string; heroSlug: string }) => void
  'lobby:finish-game': (payload: { lobbyId: string; outcome: GameOutcome }) => void
  'lobby:submit-stats': (payload: { lobbyId: string; kills: number; deaths: number; souls: number }) => void
  'lobby:play-again': (payload: { lobbyId: string }) => void
  'lobby:close': (payload: { lobbyId: string }) => void
  'lobby:invite-friend': (payload: { lobbyId: string; friendUserId: string }) => void
  'lobby:kick-player': (payload: { lobbyId: string; targetUserId: string }) => void
  'presence:heartbeat': () => void
}

// Server -> Client events
export interface ServerToClientEvents {
  'lobby:state': (state: LobbyState) => void
  'lobby:error': (message: string) => void
  'lobby:invite-received': (payload: { lobbyId: string; inviteCode: string; fromUser: PublicUser }) => void
  'lobby:kicked': (payload: { lobbyId: string }) => void
  'presence:update': (payload: { userId: string; online: boolean }) => void
}
