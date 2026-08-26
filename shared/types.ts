import type { AchievementRarity } from './achievements'

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

export interface AuthedUser extends PublicUser {
  isAdmin: boolean
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
  assists: number
  finishedAt: string
}

export interface UnlockedAchievement {
  slug: string
  name: string
  description: string
  unlockedAt: string
}

export interface AchievementProgressEntry {
  slug: string
  name: string
  description: string
  rarity: AchievementRarity
  unlocked: boolean
  unlockedAt: string | null
  current: number | null
  target: number | null
}

export type FriendshipStatus = 'self' | 'none' | 'friends' | 'pending-outgoing' | 'pending-incoming'

export interface UserProfile extends PublicUser {
  steamInfo: string | null
  steamDisplayName: string | null
  steamAvatarUrl: string | null
  allTimeWins: number
  allTimeLosses: number
  currentWinStreak: number
  bestWinStreak: number
  lifetimeKills: number
  lifetimeDeaths: number
  lifetimeAssists: number
  favoriteHeroSlug: string | null
  profileAccentColor: string | null
  selectedTitleSlug: string | null
  isAdmin: boolean
  isOwner: boolean
  recentGames: GameHistoryEntry[]
  achievements: UnlockedAchievement[]
  friendshipStatus: FriendshipStatus
  friendshipRequestId: string | null
}

export interface LobbySettings {
  numHeroes: 3 | 4 | 5
  numChallenges: 0 | 1 | 2 | 3
  rerollsAllowed: 0 | 1 | 2
}

export interface LobbyPlayerState {
  user: PublicUser
  selectedTitleSlug: string | null
  rolledHeroes: string[]
  lockedHeroSlug: string | null
  rolledChallenges: string[]
  randomBuildItemSlugs: string[]
  rerollsUsed: number
  rerollsConfirmed: boolean
  souls: number | null
  kills: number | null
  deaths: number | null
  assists: number | null
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
  disabledChallengeSlugs: string[]
  disabledHeroSlugs: string[]
  discordWebhookUrl: string | null
  players: LobbyPlayerState[]
  lastOutcome: GameOutcome | null
  lastShareCode: string | null
}

export interface LobbyChatMessage {
  id: string
  user: PublicUser
  text: string
  sentAt: string
}

export interface SessionRecap {
  totalGames: number
  sessionWins: number
  sessionLosses: number
  mostPlayedHero: { heroSlug: string; heroName: string; heroIcon: string; plays: number } | null
}

export interface SharedGameSummaryPlayer {
  username: string
  profilePictureUrl: string | null
  heroSlug: string | null
  challengeNames: string[]
  kills: number
  deaths: number
  assists: number
  souls: number
  sessionWins: number
  sessionLosses: number
}

export interface SharedGameSummary {
  shareCode: string
  outcome: GameOutcome
  createdAt: string
  players: SharedGameSummaryPlayer[]
}

export interface MostPlayedHero {
  heroSlug: string
  heroName: string
  heroIcon: string
  plays: number
}

export interface LeaderboardEntry extends PublicUser {
  wins: number
  losses: number
  winRate: number
  currentWinStreak: number
  bestWinStreak: number
  mostPlayedHero: MostPlayedHero | null
}

export interface ChallengeWinRate {
  challengeName: string
  wins: number
  plays: number
  winRate: number
}

export interface LeaderboardRecordHolder extends PublicUser {
  value: number
}

export interface LeaderboardHighlights {
  highestWinRateChallenge: ChallengeWinRate | null
  lowestWinRateChallenge: ChallengeWinRate | null
  topSouls: LeaderboardRecordHolder | null
  topKills: LeaderboardRecordHolder | null
  topAssists: LeaderboardRecordHolder | null
}

export interface AdminChallengeSuggestion {
  id: string
  challengeName: string
  details: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  suggestedBy: PublicUser
}

export interface AdminUserSummary extends PublicUser {
  isAdmin: boolean
  isOwner: boolean
  hiddenFromLeaderboard: boolean
  allTimeWins: number
  allTimeLosses: number
  createdAt: string
}

export interface AdminErrorLogEntry {
  id: string
  message: string
  context: string | null
  occurredAt: string
}
