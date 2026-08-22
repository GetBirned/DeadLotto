export type LobbyStatus =
  | 'lobby'
  | 'rolling'
  | 'awaiting-lock-in'
  | 'in-game'
  | 'finished-pending-stats'
  | 'summary'
  | 'closed'

export type GameOutcome = 'win' | 'loss'

export interface PublicUser {
  id: string
  username: string
  profilePictureUrl: string | null
}

export interface FriendSummary extends PublicUser {
  online: boolean
}

export interface GameHistoryEntry {
  id: string
  heroSlug: string
  challengeName: string
  outcome: GameOutcome
  souls: number
  kills: number
  deaths: number
  finishedAt: string
}

export interface UserProfile extends PublicUser {
  steamInfo: string | null
  allTimeWins: number
  allTimeLosses: number
  recentGames: GameHistoryEntry[]
}

export interface LobbySettings {
  numHeroes: 3 | 4 | 5
  numChallenges: 1 | 2 | 3
}

export interface LobbyPlayerState {
  user: PublicUser
  rolledHeroes: string[]
  lockedHeroSlug: string | null
  rolledChallenges: string[]
  souls: number | null
  kills: number | null
  deaths: number | null
  sessionWins: number
  sessionLosses: number
  ready: boolean
}

export interface LobbyState {
  id: string
  inviteCode: string
  hostUserId: string
  status: LobbyStatus
  settings: LobbySettings
  players: LobbyPlayerState[]
  lastOutcome: GameOutcome | null
}
