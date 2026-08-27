import { prisma } from '../db.js'
import type { LobbyState, LobbyPlayerState, GameOutcome, LobbyStatus, RollMode } from '@shared/types'
import { isUserOnline } from './presence.js'

// Every player shares the same numHeroes target, so a plain round-robin through
// draftOrder never desyncs - whoever's turn it is can always be derived from the total
// number of picks made so far, no separate stored pointer needed. Departed players are
// filtered out of the order rather than removed from it, so a leave mid-draft can't
// leave the cycle referencing someone who's gone.
export function computeCurrentDraftPicker(
  players: { userId: string; rolledHeroesJson: string }[],
  draftOrder: string[],
  numHeroes: number,
): string | null {
  const activePlayerIds = new Set(players.map((p) => p.userId))
  const activeOrder = draftOrder.filter((id) => activePlayerIds.has(id))
  if (activeOrder.length === 0) return null
  const totalPicks = players.reduce((sum, p) => sum + (JSON.parse(p.rolledHeroesJson) as string[]).length, 0)
  if (totalPicks >= activeOrder.length * numHeroes) return null
  return activeOrder[totalPicks % activeOrder.length]
}

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
    online: isUserOnline(p.user.id),
    selectedTitleSlug: p.user.selectedTitleSlug,
    rolledHeroes: JSON.parse(p.rolledHeroesJson) as string[],
    lockedHeroSlug: p.lockedHeroSlug,
    rolledChallenges: JSON.parse(p.rolledChallengesJson) as string[],
    randomBuildItemSlugs: JSON.parse(p.randomBuildItemSlugs) as string[],
    rerollsUsed: p.rerollsUsed,
    rerollsConfirmed: p.rerollsConfirmed,
    readyToRoll: p.readyToRoll,
    souls: p.souls,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    sessionWins: p.sessionWins,
    sessionLosses: p.sessionLosses,
    ready: p.kills !== null && p.deaths !== null && p.assists !== null && p.souls !== null,
  }))

  return {
    id: lobby.id,
    inviteCode: lobby.inviteCode,
    hostUserId: lobby.hostUserId,
    status: lobby.status as LobbyStatus,
    settings: {
      numHeroes: lobby.numHeroes as 3 | 4 | 5,
      numChallenges: lobby.numChallenges as 0 | 1 | 2 | 3,
      rerollsAllowed: lobby.rerollsAllowed as 0 | 1 | 2,
      rollMode: lobby.rollMode as RollMode,
    },
    disabledChallengeSlugs: JSON.parse(lobby.disabledChallengeSlugs) as string[],
    disabledHeroSlugs: JSON.parse(lobby.disabledHeroSlugs) as string[],
    discordWebhookUrl: lobby.discordWebhookUrl ?? null,
    players,
    lastOutcome: (lobby.lastOutcome as GameOutcome | null) ?? null,
    lastShareCode: lobby.lastShareCode ?? null,
    draftCurrentPickerId:
      lobby.status === 'rolling' && lobby.rollMode === 'draft'
        ? computeCurrentDraftPicker(lobby.players, JSON.parse(lobby.draftOrder), lobby.numHeroes)
        : null,
  }
}
