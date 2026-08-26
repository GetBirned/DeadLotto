import type { Server, Socket } from 'socket.io'
import { randomUUID } from 'node:crypto'
import { customAlphabet } from 'nanoid'
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/socketEvents'
import { rollRandomHero, WILDCARD_SLUG } from '@shared/heroRegistry'
import { rollRandomChallenges, CHALLENGE_BY_SLUG } from '@shared/challenges'
import { prisma } from '../db.js'
import { verifyToken, AUTH_COOKIE } from '../auth.js'
import { loadLobbyState } from './lobbyState.js'
import { markOnline, markOffline, getUserSocketIds } from './presence.js'
import { checkAndUnlockAchievements } from '../achievements.js'
import type { AchievementDefinition } from '@shared/achievements'
import { postDiscordGameResult } from '../discord.js'

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents> & { userId?: string }

const DISCONNECT_GRACE_MS = 10_000
const shareCodeAlphabet = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    out[key] = decodeURIComponent(value)
  }
  return out
}

async function broadcastLobby(io: IOServer, lobbyId: string) {
  const state = await loadLobbyState(lobbyId)
  if (state) io.to(lobbyId).emit('lobby:state', state)
}

async function assertPlayerInLobby(lobbyId: string, userId: string) {
  return prisma.lobbyPlayer.findUnique({ where: { lobbyId_userId: { lobbyId, userId } } })
}

// A player is ready to move on from rolling once they've rolled all their heroes AND
// resolved their rerolls - either the lobby doesn't allow any, they've used them all
// up, or they explicitly confirmed they're done rerolling. Without that last case, the
// lobby-wide status flips to "awaiting-lock-in" the instant everyone hits their hero
// count, leaving no window to actually use a reroll on the hero you just got.
function isPlayerReadyForLockIn(
  rolledCount: number,
  numHeroes: number,
  rerollsAllowed: number,
  rerollsUsed: number,
  rerollsConfirmed: boolean,
): boolean {
  if (rolledCount < numHeroes) return false
  if (rerollsAllowed === 0) return true
  if (rerollsUsed >= rerollsAllowed) return true
  return rerollsConfirmed
}

// Pushes a live toast to every active tab/device a player has open, rather than
// leaving the unlock to only show up next time they happen to open their profile.
function notifyUnlockedAchievements(io: IOServer, userId: string, unlocked: AchievementDefinition[]) {
  for (const achievement of unlocked) {
    for (const sid of getUserSocketIds(userId)) {
      io.to(sid).emit('achievement:unlocked', achievement)
    }
  }
}

// Records a finished game's outcome on the user's lifetime stats and keeps their win
// streak in sync - a win extends it, a loss breaks it, and the best-ever streak is
// tracked separately since it should never go back down.
async function applyGameOutcome(userId: string, outcome: 'win' | 'loss') {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { currentWinStreak: true, bestWinStreak: true } })
  const currentWinStreak = outcome === 'win' ? (user?.currentWinStreak ?? 0) + 1 : 0
  const bestWinStreak = Math.max(user?.bestWinStreak ?? 0, currentWinStreak)
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(outcome === 'win' ? { allTimeWins: { increment: 1 } } : { allTimeLosses: { increment: 1 } }),
      currentWinStreak,
      bestWinStreak,
    },
  })
}

// Which lobby rooms each socket is currently a member of, so a disconnect (tab close,
// network drop) knows which lobbies to remove the player from.
const socketLobbies = new Map<string, Set<string>>()

function trackJoin(socketId: string, lobbyId: string) {
  if (!socketLobbies.has(socketId)) socketLobbies.set(socketId, new Set())
  socketLobbies.get(socketId)!.add(lobbyId)
}

function trackLeave(socketId: string, lobbyId: string) {
  socketLobbies.get(socketId)?.delete(lobbyId)
}

function takeTrackedLobbies(socketId: string): string[] {
  const set = socketLobbies.get(socketId)
  socketLobbies.delete(socketId)
  return set ? Array.from(set) : []
}

// A disconnect doesn't necessarily mean "left" - it could just be a page refresh or a
// brief network blip. Give reconnects a short grace window to cancel the removal
// before it actually happens; an explicit leave (navigating away) skips the grace
// period entirely.
const pendingRemovals = new Map<string, ReturnType<typeof setTimeout>>()

function pendingKey(lobbyId: string, userId: string) {
  return `${lobbyId}:${userId}`
}

function cancelScheduledRemoval(lobbyId: string, userId: string) {
  const key = pendingKey(lobbyId, userId)
  const existing = pendingRemovals.get(key)
  if (existing) {
    clearTimeout(existing)
    pendingRemovals.delete(key)
  }
}

function scheduleRemoval(io: IOServer, lobbyId: string, userId: string) {
  cancelScheduledRemoval(lobbyId, userId)
  const timeout = setTimeout(() => {
    pendingRemovals.delete(pendingKey(lobbyId, userId))
    removePlayerFromLobby(io, lobbyId, userId).catch((err) => console.error('[lobby] removal failed', err))
  }, DISCONNECT_GRACE_MS)
  pendingRemovals.set(pendingKey(lobbyId, userId), timeout)
}

// Removes a player from a lobby (voluntary leave, or disconnect grace period expiring).
// Reassigns host if the host left, closes the lobby if it's now empty, and re-checks
// whether the current phase can now advance without the player who left (e.g. everyone
// else had already rolled/locked in/submitted stats and were just waiting on them).
async function removePlayerFromLobby(io: IOServer, lobbyId: string, userId: string) {
  const [lobby, player] = await Promise.all([
    prisma.lobby.findUnique({ where: { id: lobbyId } }),
    assertPlayerInLobby(lobbyId, userId),
  ])
  if (!lobby || !player) return

  await prisma.lobbyPlayer.delete({ where: { id: player.id } })

  const remaining = await prisma.lobbyPlayer.findMany({ where: { lobbyId }, orderBy: { id: 'asc' } })

  if (remaining.length === 0) {
    await prisma.lobby.update({ where: { id: lobbyId }, data: { status: 'closed' } })
    await broadcastLobby(io, lobbyId)
    return
  }

  const data: { hostUserId?: string; status?: string } = {}
  if (lobby.hostUserId === userId) {
    data.hostUserId = remaining[0].userId
  }

  if (lobby.status === 'rolling') {
    const everyoneDone = remaining.every((p) => {
      const list: string[] = JSON.parse(p.rolledHeroesJson)
      return isPlayerReadyForLockIn(list.length, lobby.numHeroes, lobby.rerollsAllowed, p.rerollsUsed, p.rerollsConfirmed)
    })
    if (everyoneDone) data.status = 'awaiting-lock-in'
  } else if (lobby.status === 'awaiting-lock-in') {
    const everyoneLocked = remaining.every((p) => !!p.lockedHeroSlug)
    if (everyoneLocked) {
      const disabledSlugs: string[] = JSON.parse(lobby.disabledChallengeSlugs)
      for (const p of remaining) {
        const challenges = rollRandomChallenges(lobby.numChallenges, disabledSlugs)
        await prisma.lobbyPlayer.update({
          where: { id: p.id },
          data: { rolledChallengesJson: JSON.stringify(challenges.map((c) => c.slug)) },
        })
      }
      data.status = 'in-game'
    }
  } else if (lobby.status === 'finished-pending-stats') {
    const everyoneSubmitted = remaining.every((p) => p.kills !== null && p.deaths !== null && p.souls !== null)
    if (everyoneSubmitted) {
      const outcome = lobby.lastOutcome as 'win' | 'loss'
      for (const p of remaining) {
        const challengeSlugs: string[] = JSON.parse(p.rolledChallengesJson)
        const challengeNames = challengeSlugs.map((slug) => CHALLENGE_BY_SLUG[slug]?.name ?? slug)
        await prisma.gameHistoryEntry.create({
          data: {
            userId: p.userId,
            lobbyId,
            heroSlug: p.lockedHeroSlug ?? 'unknown',
            challengeName: challengeNames.join(', '),
            outcome,
            kills: p.kills!,
            deaths: p.deaths!,
            souls: p.souls!,
          },
        })
        await applyGameOutcome(p.userId, outcome)
        await prisma.lobbyPlayer.update({
          where: { id: p.id },
          data: outcome === 'win' ? { sessionWins: { increment: 1 } } : { sessionLosses: { increment: 1 } },
        })
        checkAndUnlockAchievements(p.userId)
          .then((unlocked) => notifyUnlockedAchievements(io, p.userId, unlocked))
          .catch((err) => console.error('[achievements] unlock check failed', err))
      }
      data.status = 'summary'
    }
  }

  if (Object.keys(data).length > 0) {
    await prisma.lobby.update({ where: { id: lobbyId }, data })
  }
  await broadcastLobby(io, lobbyId)
}

export function registerLobbySocket(io: IOServer) {
  io.use((socket, next) => {
    const cookies = parseCookies(socket.handshake.headers.cookie)
    const token = cookies[AUTH_COOKIE]
    const userId = token ? verifyToken(token) : null
    if (!userId) {
      next(new Error('unauthorized'))
      return
    }
    ;(socket as IOSocket).userId = userId
    next()
  })

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as IOSocket
    const userId = socket.userId!
    const becameOnline = markOnline(userId, socket.id)
    if (becameOnline) io.emit('presence:update', { userId, online: true })

    socket.on('disconnect', () => {
      const wentOffline = markOffline(userId, socket.id)
      if (wentOffline) io.emit('presence:update', { userId, online: false })
      for (const lobbyId of takeTrackedLobbies(socket.id)) {
        scheduleRemoval(io, lobbyId, userId)
      }
    })

    socket.on('lobby:join', async ({ lobbyId }) => {
      cancelScheduledRemoval(lobbyId, userId)
      socket.join(lobbyId)
      trackJoin(socket.id, lobbyId)
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:leave', async ({ lobbyId }) => {
      socket.leave(lobbyId)
      trackLeave(socket.id, lobbyId)
      cancelScheduledRemoval(lobbyId, userId)
      await removePlayerFromLobby(io, lobbyId, userId)
    })

    socket.on('lobby:update-settings', async ({ lobbyId, numHeroes, numChallenges, rerollsAllowed }) => {
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } })
      if (!lobby || lobby.hostUserId !== userId || lobby.status !== 'lobby') return
      await prisma.lobby.update({ where: { id: lobbyId }, data: { numHeroes, numChallenges, rerollsAllowed } })
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:update-challenge-pool', async ({ lobbyId, disabledChallengeSlugs }) => {
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } })
      if (!lobby || lobby.hostUserId !== userId || lobby.status !== 'lobby') return
      const validSlugs = disabledChallengeSlugs.filter((slug) => !!CHALLENGE_BY_SLUG[slug])
      await prisma.lobby.update({
        where: { id: lobbyId },
        data: { disabledChallengeSlugs: JSON.stringify(validSlugs) },
      })
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:update-hero-pool', async ({ lobbyId, disabledHeroSlugs }) => {
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } })
      if (!lobby || lobby.hostUserId !== userId || lobby.status !== 'lobby') return
      const validSlugs = disabledHeroSlugs.filter((slug) => slug !== WILDCARD_SLUG)
      await prisma.lobby.update({
        where: { id: lobbyId },
        data: { disabledHeroSlugs: JSON.stringify(validSlugs) },
      })
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:update-discord-webhook', async ({ lobbyId, discordWebhookUrl }) => {
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } })
      if (!lobby || lobby.hostUserId !== userId || lobby.status !== 'lobby') return
      const trimmed = discordWebhookUrl?.trim() || null
      if (trimmed && !trimmed.startsWith('https://discord.com/api/webhooks/') && !trimmed.startsWith('https://discordapp.com/api/webhooks/')) {
        socket.emit('lobby:error', "That doesn't look like a Discord webhook URL.")
        return
      }
      await prisma.lobby.update({ where: { id: lobbyId }, data: { discordWebhookUrl: trimmed } })
      // Also remembered on the host's account so their next lobby starts pre-filled
      // instead of needing the URL pasted in again every time.
      await prisma.user.update({ where: { id: userId }, data: { savedDiscordWebhookUrl: trimmed } })
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:start-rolling', async ({ lobbyId }) => {
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } })
      if (!lobby || lobby.hostUserId !== userId || lobby.status !== 'lobby') return
      await prisma.lobby.update({ where: { id: lobbyId }, data: { status: 'rolling' } })
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:roll-hero', async ({ lobbyId }) => {
      const [lobby, player] = await Promise.all([
        prisma.lobby.findUnique({ where: { id: lobbyId } }),
        assertPlayerInLobby(lobbyId, userId),
      ])
      if (!lobby || !player || lobby.status !== 'rolling') return
      const rolled: string[] = JSON.parse(player.rolledHeroesJson)
      if (rolled.length >= lobby.numHeroes) return
      const disabledHeroSlugs: string[] = JSON.parse(lobby.disabledHeroSlugs)
      // Exclude heroes this player already rolled too, so their own set of picks never
      // has a duplicate (the wildcard slot is exempt - see rollRandomHero).
      const picked = rollRandomHero([...disabledHeroSlugs, ...rolled])
      rolled.push(picked.slug)
      await prisma.lobbyPlayer.update({
        where: { id: player.id },
        data: { rolledHeroesJson: JSON.stringify(rolled) },
      })

      const allPlayers = await prisma.lobbyPlayer.findMany({ where: { lobbyId } })
      const everyoneDone = allPlayers.every((p) => {
        const list: string[] = p.id === player.id ? rolled : JSON.parse(p.rolledHeroesJson)
        return isPlayerReadyForLockIn(list.length, lobby.numHeroes, lobby.rerollsAllowed, p.rerollsUsed, p.rerollsConfirmed)
      })
      if (everyoneDone) {
        await prisma.lobby.update({ where: { id: lobbyId }, data: { status: 'awaiting-lock-in' } })
      }
      await broadcastLobby(io, lobbyId)
    })

    // Only usable once a player has rolled all their heroes - lets them pick ANY of
    // their rolled slots to reroll (not just the last one), so rerolls are a deliberate
    // post-roll decision rather than something that has to happen mid-spin.
    socket.on('lobby:reroll-hero', async ({ lobbyId, heroIndex }) => {
      const [lobby, player] = await Promise.all([
        prisma.lobby.findUnique({ where: { id: lobbyId } }),
        assertPlayerInLobby(lobbyId, userId),
      ])
      if (!lobby || !player || lobby.status !== 'rolling') return
      const rolled: string[] = JSON.parse(player.rolledHeroesJson)
      if (rolled.length < lobby.numHeroes) return
      if (!Number.isInteger(heroIndex) || heroIndex < 0 || heroIndex >= rolled.length) return
      if (player.rerollsUsed >= lobby.rerollsAllowed) return
      const disabledHeroSlugs: string[] = JSON.parse(lobby.disabledHeroSlugs)
      // Exclude every other already-rolled hero (not the one being replaced) so the
      // reroll can't just duplicate one of this player's other picks.
      const otherRolled = rolled.filter((_, i) => i !== heroIndex)
      const picked = rollRandomHero([...disabledHeroSlugs, ...otherRolled])
      rolled[heroIndex] = picked.slug
      const newRerollsUsed = player.rerollsUsed + 1
      await prisma.lobbyPlayer.update({
        where: { id: player.id },
        data: { rolledHeroesJson: JSON.stringify(rolled), rerollsUsed: { increment: 1 } },
      })

      const allPlayers = await prisma.lobbyPlayer.findMany({ where: { lobbyId } })
      const everyoneDone = allPlayers.every((p) => {
        const isMe = p.id === player.id
        const list: string[] = isMe ? rolled : JSON.parse(p.rolledHeroesJson)
        const rerollsUsed = isMe ? newRerollsUsed : p.rerollsUsed
        return isPlayerReadyForLockIn(list.length, lobby.numHeroes, lobby.rerollsAllowed, rerollsUsed, p.rerollsConfirmed)
      })
      if (everyoneDone) {
        await prisma.lobby.update({ where: { id: lobbyId }, data: { status: 'awaiting-lock-in' } })
      }
      await broadcastLobby(io, lobbyId)
    })

    // Explicit "I'm done rerolling" - lets a player with rerolls left move the lobby
    // forward without spending them.
    socket.on('lobby:confirm-rerolls', async ({ lobbyId }) => {
      const [lobby, player] = await Promise.all([
        prisma.lobby.findUnique({ where: { id: lobbyId } }),
        assertPlayerInLobby(lobbyId, userId),
      ])
      if (!lobby || !player || lobby.status !== 'rolling') return
      const rolled: string[] = JSON.parse(player.rolledHeroesJson)
      if (rolled.length < lobby.numHeroes) return
      await prisma.lobbyPlayer.update({ where: { id: player.id }, data: { rerollsConfirmed: true } })

      const allPlayers = await prisma.lobbyPlayer.findMany({ where: { lobbyId } })
      const everyoneDone = allPlayers.every((p) => {
        const isMe = p.id === player.id
        const list: string[] = JSON.parse(p.rolledHeroesJson)
        const confirmed = isMe ? true : p.rerollsConfirmed
        return isPlayerReadyForLockIn(list.length, lobby.numHeroes, lobby.rerollsAllowed, p.rerollsUsed, confirmed)
      })
      if (everyoneDone) {
        await prisma.lobby.update({ where: { id: lobbyId }, data: { status: 'awaiting-lock-in' } })
      }
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:lock-in-hero', async ({ lobbyId, heroSlug }) => {
      const [lobby, player] = await Promise.all([
        prisma.lobby.findUnique({ where: { id: lobbyId } }),
        assertPlayerInLobby(lobbyId, userId),
      ])
      if (!lobby || !player || lobby.status !== 'awaiting-lock-in') return
      const rolled: string[] = JSON.parse(player.rolledHeroesJson)
      if (!rolled.includes(heroSlug) && heroSlug !== WILDCARD_SLUG) return
      await prisma.lobbyPlayer.update({ where: { id: player.id }, data: { lockedHeroSlug: heroSlug } })

      const allPlayers = await prisma.lobbyPlayer.findMany({ where: { lobbyId } })
      const everyoneLocked = allPlayers.every((p) => (p.id === player.id ? true : !!p.lockedHeroSlug))
      if (everyoneLocked) {
        const disabledSlugs: string[] = JSON.parse(lobby.disabledChallengeSlugs)
        for (const p of allPlayers) {
          const challenges = rollRandomChallenges(lobby.numChallenges, disabledSlugs)
          await prisma.lobbyPlayer.update({
            where: { id: p.id },
            data: { rolledChallengesJson: JSON.stringify(challenges.map((c) => c.slug)) },
          })
        }
        await prisma.lobby.update({ where: { id: lobbyId }, data: { status: 'in-game' } })
      }
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:finish-game', async ({ lobbyId, outcome }) => {
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } })
      if (!lobby || lobby.hostUserId !== userId || lobby.status !== 'in-game') return
      await prisma.lobby.update({
        where: { id: lobbyId },
        data: { status: 'finished-pending-stats', lastOutcome: outcome },
      })
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:submit-stats', async ({ lobbyId, kills, deaths, souls }) => {
      const [lobby, player] = await Promise.all([
        prisma.lobby.findUnique({ where: { id: lobbyId } }),
        assertPlayerInLobby(lobbyId, userId),
      ])
      if (!lobby || !player || lobby.status !== 'finished-pending-stats') return
      await prisma.lobbyPlayer.update({
        where: { id: player.id },
        data: { kills: Math.max(0, kills | 0), deaths: Math.max(0, deaths | 0), souls: Math.max(0, souls | 0) },
      })

      const allPlayers = await prisma.lobbyPlayer.findMany({ where: { lobbyId }, include: { user: true } })
      const everyoneSubmitted = allPlayers.every((p) =>
        p.id === player.id ? true : p.kills !== null && p.deaths !== null && p.souls !== null,
      )
      if (everyoneSubmitted) {
        const outcome = lobby.lastOutcome as 'win' | 'loss'
        const summarySnapshot: {
          username: string
          profilePictureUrl: string | null
          heroSlug: string | null
          challengeNames: string
          kills: number
          deaths: number
          souls: number
          sessionWins: number
          sessionLosses: number
        }[] = []
        // Separate from summarySnapshot (which mirrors the SharedGameSummaryPlayer
        // DB shape exactly) - the webhook wants full challenge descriptions, not just
        // names.
        const discordPlayers: {
          username: string
          heroSlug: string | null
          challenges: { name: string; description: string }[]
          kills: number
          deaths: number
          souls: number
        }[] = []

        for (const p of allPlayers) {
          const kills2 = p.id === player.id ? kills : p.kills!
          const deaths2 = p.id === player.id ? deaths : p.deaths!
          const souls2 = p.id === player.id ? souls : p.souls!
          const challengeSlugs: string[] = JSON.parse(p.rolledChallengesJson)
          const challengeDefs = challengeSlugs.map((slug) => CHALLENGE_BY_SLUG[slug]).filter(Boolean)
          const challengeNames = challengeSlugs.map((slug) => CHALLENGE_BY_SLUG[slug]?.name ?? slug)
          await prisma.gameHistoryEntry.create({
            data: {
              userId: p.userId,
              lobbyId,
              heroSlug: p.lockedHeroSlug ?? 'unknown',
              challengeName: challengeNames.join(', '),
              outcome,
              kills: kills2,
              deaths: deaths2,
              souls: souls2,
            },
          })
          await applyGameOutcome(p.userId, outcome)
          const updatedPlayer = await prisma.lobbyPlayer.update({
            where: { id: p.id },
            data:
              outcome === 'win'
                ? { sessionWins: { increment: 1 } }
                : { sessionLosses: { increment: 1 } },
          })
          summarySnapshot.push({
            username: p.user.username,
            profilePictureUrl: p.user.profilePictureUrl,
            heroSlug: p.lockedHeroSlug,
            challengeNames: challengeNames.join(', '),
            kills: kills2,
            deaths: deaths2,
            souls: souls2,
            sessionWins: updatedPlayer.sessionWins,
            sessionLosses: updatedPlayer.sessionLosses,
          })
          discordPlayers.push({
            username: p.user.username,
            heroSlug: p.lockedHeroSlug,
            challenges: challengeDefs.map((c) => ({ name: c.name, description: c.description })),
            kills: kills2,
            deaths: deaths2,
            souls: souls2,
          })
        }

        let shareCode = shareCodeAlphabet()
        for (let attempts = 0; attempts < 5; attempts++) {
          const clash = await prisma.sharedGameSummary.findUnique({ where: { shareCode } })
          if (!clash) break
          shareCode = shareCodeAlphabet()
        }
        await prisma.sharedGameSummary.create({
          data: {
            shareCode,
            outcome,
            players: { create: summarySnapshot },
          },
        })

        await prisma.lobby.update({ where: { id: lobbyId }, data: { status: 'summary', lastShareCode: shareCode } })

        // Best-effort side effects - never let these block the actual state transition
        // players are waiting on.
        Promise.all(
          allPlayers.map((p) =>
            checkAndUnlockAchievements(p.userId).then((unlocked) => notifyUnlockedAchievements(io, p.userId, unlocked)),
          ),
        ).catch((err) => console.error('[achievements] unlock check failed', err))
        if (lobby.discordWebhookUrl) {
          postDiscordGameResult(lobby.discordWebhookUrl, outcome, discordPlayers).catch((err) =>
            console.error('[discord] post failed', err),
          )
        }
      }
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:play-again', async ({ lobbyId }) => {
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } })
      if (!lobby || lobby.hostUserId !== userId) return
      await prisma.lobbyPlayer.updateMany({
        where: { lobbyId },
        data: {
          rolledHeroesJson: '[]',
          lockedHeroSlug: null,
          rolledChallengesJson: '[]',
          rerollsUsed: 0,
          rerollsConfirmed: false,
          kills: null,
          deaths: null,
          souls: null,
        },
      })
      await prisma.lobby.update({
        where: { id: lobbyId },
        data: { status: 'lobby', lastOutcome: null, lastShareCode: null },
      })
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:close', async ({ lobbyId }) => {
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } })
      if (!lobby || lobby.hostUserId !== userId) return
      await prisma.lobby.update({ where: { id: lobbyId }, data: { status: 'closed' } })
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:invite-friend', async ({ lobbyId, friendUserId }) => {
      const [lobby, sender] = await Promise.all([
        prisma.lobby.findUnique({ where: { id: lobbyId }, include: { players: true } }),
        assertPlayerInLobby(lobbyId, userId),
      ])
      if (!lobby || !sender) return
      if (lobby.status !== 'lobby') {
        socket.emit('lobby:error', 'This lobby has already started.')
        return
      }
      if (lobby.players.length >= 6) {
        socket.emit('lobby:error', 'This lobby is full.')
        return
      }
      if (lobby.players.some((p) => p.userId === friendUserId)) {
        socket.emit('lobby:error', 'That friend is already in the lobby.')
        return
      }
      const friendship = await prisma.friendship.findFirst({
        where: {
          status: 'accepted',
          OR: [
            { userId, friendId: friendUserId },
            { userId: friendUserId, friendId: userId },
          ],
        },
      })
      if (!friendship) {
        socket.emit('lobby:error', 'You can only invite friends.')
        return
      }
      const targetSockets = getUserSocketIds(friendUserId)
      if (targetSockets.length === 0) {
        socket.emit('lobby:error', 'That friend is not currently online.')
        return
      }
      const fromUser = await prisma.user.findUnique({ where: { id: userId } })
      if (!fromUser) return
      for (const sid of targetSockets) {
        io.to(sid).emit('lobby:invite-received', {
          lobbyId,
          inviteCode: lobby.inviteCode,
          fromUser: { id: fromUser.id, username: fromUser.username, profilePictureUrl: fromUser.profilePictureUrl },
        })
      }
    })

    socket.on('lobby:chat-send', async ({ lobbyId, text }) => {
      const trimmed = text.trim().slice(0, 300)
      if (!trimmed) return
      const [player, user] = await Promise.all([
        assertPlayerInLobby(lobbyId, userId),
        prisma.user.findUnique({ where: { id: userId } }),
      ])
      if (!player || !user) return
      io.to(lobbyId).emit('lobby:chat-message', {
        id: randomUUID(),
        user: { id: user.id, username: user.username, profilePictureUrl: user.profilePictureUrl },
        text: trimmed,
        sentAt: new Date().toISOString(),
      })
    })

    socket.on('lobby:kick-player', async ({ lobbyId, targetUserId }) => {
      if (targetUserId === userId) return
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } })
      if (!lobby || lobby.hostUserId !== userId) return
      const targetPlayer = await assertPlayerInLobby(lobbyId, targetUserId)
      if (!targetPlayer) return

      await removePlayerFromLobby(io, lobbyId, targetUserId)

      // Tell the kicked player directly and pull their socket(s) out of the room so
      // they stop receiving further state for a lobby they're no longer part of.
      for (const sid of getUserSocketIds(targetUserId)) {
        io.to(sid).emit('lobby:kicked', { lobbyId })
        cancelScheduledRemoval(lobbyId, targetUserId)
        trackLeave(sid, lobbyId)
        io.sockets.sockets.get(sid)?.leave(lobbyId)
      }
    })
  })
}
