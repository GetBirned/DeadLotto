import { prisma } from '../db.js'
import type { LobbyState, LobbyPlayerState, GameOutcome, LobbyStatus } from '@shared/types'
import { isUserOnline } from './presence.js'

export async function loadLobbyState(lobbyId: string): Promise<LobbyState | null> {
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: { players: { include: { user: true } } },
  })
  if (!lobby) return null

  const players: LobbyPlayerState[] = lobby.players.map((p) => ({
    user: {
      id: p.user.id,
      username: p.user.username,
      profilePictureUrl: p.user.profilePictureUrl,
    },
    rolledHeroes: JSON.parse(p.rolledHeroesJson) as string[],
    lockedHeroSlug: p.lockedHeroSlug,
    rolledChallenges: JSON.parse(p.rolledChallengesJson) as string[],
    souls: p.souls,
    kills: p.kills,
    deaths: p.deaths,
    sessionWins: p.sessionWins,
    sessionLosses: p.sessionLosses,
    ready: p.kills !== null && p.deaths !== null && p.souls !== null,
  }))

  return {
    id: lobby.id,
    inviteCode: lobby.inviteCode,
    hostUserId: lobby.hostUserId,
    status: lobby.status as LobbyStatus,
    settings: {
      numHeroes: lobby.numHeroes as 3 | 4 | 5,
      numChallenges: lobby.numChallenges as 1 | 2 | 3,
    },
    players,
    lastOutcome: (lobby.lastOutcome as GameOutcome | null) ?? null,
    lastShareCode: lobby.lastShareCode ?? null,
  }
}

export function withOnlineFlags(players: { user: { id: string } }[]) {
  return players.map((p) => ({ ...p, online: isUserOnline(p.user.id) }))
}
