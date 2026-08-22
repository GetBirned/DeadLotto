import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/socketEvents'
import { rollRandomHero, WILDCARD_SLUG } from '@shared/heroRegistry'
import { rollRandomChallenges, CHALLENGE_BY_SLUG } from '@shared/challenges'
import { prisma } from '../db.js'
import { verifyToken, AUTH_COOKIE } from '../auth.js'
import { loadLobbyState } from './lobbyState.js'
import { markOnline, markOffline } from './presence.js'

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents> & { userId?: string }

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
    })

    socket.on('lobby:join', async ({ lobbyId }) => {
      socket.join(lobbyId)
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:leave', ({ lobbyId }) => {
      socket.leave(lobbyId)
    })

    socket.on('lobby:update-settings', async ({ lobbyId, numHeroes, numChallenges }) => {
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } })
      if (!lobby || lobby.hostUserId !== userId || lobby.status !== 'lobby') return
      await prisma.lobby.update({ where: { id: lobbyId }, data: { numHeroes, numChallenges } })
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
      const picked = rollRandomHero()
      rolled.push(picked.slug)
      await prisma.lobbyPlayer.update({
        where: { id: player.id },
        data: { rolledHeroesJson: JSON.stringify(rolled) },
      })

      const allPlayers = await prisma.lobbyPlayer.findMany({ where: { lobbyId } })
      const everyoneDone = allPlayers.every((p) => {
        const list: string[] = p.id === player.id ? rolled : JSON.parse(p.rolledHeroesJson)
        return list.length >= lobby.numHeroes
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
        for (const p of allPlayers) {
          const challenges = rollRandomChallenges(lobby.numChallenges)
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

      const allPlayers = await prisma.lobbyPlayer.findMany({ where: { lobbyId } })
      const everyoneSubmitted = allPlayers.every((p) =>
        p.id === player.id ? true : p.kills !== null && p.deaths !== null && p.souls !== null,
      )
      if (everyoneSubmitted) {
        const outcome = lobby.lastOutcome as 'win' | 'loss'
        for (const p of allPlayers) {
          const kills2 = p.id === player.id ? kills : p.kills!
          const deaths2 = p.id === player.id ? deaths : p.deaths!
          const souls2 = p.id === player.id ? souls : p.souls!
          const challengeSlugs: string[] = JSON.parse(p.rolledChallengesJson)
          const challengeNames = challengeSlugs.map((slug) => CHALLENGE_BY_SLUG[slug]?.name ?? slug)
          await prisma.gameHistoryEntry.create({
            data: {
              userId: p.userId,
              heroSlug: p.lockedHeroSlug ?? 'unknown',
              challengeName: challengeNames.join(', '),
              outcome,
              kills: kills2,
              deaths: deaths2,
              souls: souls2,
            },
          })
          await prisma.user.update({
            where: { id: p.userId },
            data:
              outcome === 'win'
                ? { allTimeWins: { increment: 1 } }
                : { allTimeLosses: { increment: 1 } },
          })
          await prisma.lobbyPlayer.update({
            where: { id: p.id },
            data:
              outcome === 'win'
                ? { sessionWins: { increment: 1 } }
                : { sessionLosses: { increment: 1 } },
          })
        }
        await prisma.lobby.update({ where: { id: lobbyId }, data: { status: 'summary' } })
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
          kills: null,
          deaths: null,
          souls: null,
        },
      })
      await prisma.lobby.update({ where: { id: lobbyId }, data: { status: 'lobby', lastOutcome: null } })
      await broadcastLobby(io, lobbyId)
    })

    socket.on('lobby:close', async ({ lobbyId }) => {
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } })
      if (!lobby || lobby.hostUserId !== userId) return
      await prisma.lobby.update({ where: { id: lobbyId }, data: { status: 'closed' } })
      await broadcastLobby(io, lobbyId)
    })
  })
}
