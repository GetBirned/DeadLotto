import { Router } from 'express'
import { customAlphabet } from 'nanoid'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth.js'
import { loadLobbyState } from '../sockets/lobbyState.js'
import { lobbyCreateLimiter, lobbyJoinLimiter } from '../rateLimits.js'
import { getHero } from '@shared/heroRegistry'

export const lobbiesRouter = Router()

const MAX_PLAYERS = 6
const inviteCodeAlphabet = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)

lobbiesRouter.post('/', lobbyCreateLimiter, requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  let inviteCode = inviteCodeAlphabet()
  for (let attempts = 0; attempts < 5; attempts++) {
    const clash = await prisma.lobby.findUnique({ where: { inviteCode } })
    if (!clash) break
    inviteCode = inviteCodeAlphabet()
  }

  const lobby = await prisma.lobby.create({
    data: {
      inviteCode,
      hostUserId: userId,
      players: { create: [{ userId }] },
    },
  })
  const state = await loadLobbyState(lobby.id)
  res.status(201).json(state)
})

lobbiesRouter.post('/join', lobbyJoinLimiter, requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const { inviteCode } = req.body ?? {}
  const lobby = await prisma.lobby.findUnique({
    where: { inviteCode: String(inviteCode ?? '').toUpperCase() },
    include: { players: true },
  })
  if (!lobby) {
    res.status(404).json({ error: 'Lobby not found. Check the invite code.' })
    return
  }
  if (lobby.status !== 'lobby') {
    res.status(409).json({ error: 'That lobby has already started.' })
    return
  }
  const alreadyIn = lobby.players.some((p) => p.userId === userId)
  if (!alreadyIn) {
    if (lobby.players.length >= MAX_PLAYERS) {
      res.status(409).json({ error: 'That lobby is full.' })
      return
    }
    await prisma.lobbyPlayer.create({ data: { lobbyId: lobby.id, userId } })
  }
  const state = await loadLobbyState(lobby.id)
  res.json(state)
})

lobbiesRouter.get('/:id', requireAuth, async (req, res) => {
  const state = await loadLobbyState(String(req.params.id))
  if (!state) {
    res.status(404).json({ error: 'Lobby not found' })
    return
  }
  res.json(state)
})

// Session-wide recap for the closing screen - aggregates across every "Play Again"
// round in this lobby, not just the last one. Win/loss is shared lobby-wide per round
// (everyone in a lobby wins or loses together), so any one player's session
// counters represent the whole lobby's session record.
lobbiesRouter.get('/:id/session-recap', requireAuth, async (req, res) => {
  const lobbyId = String(req.params.id)
  const anyPlayer = await prisma.lobbyPlayer.findFirst({ where: { lobbyId } })
  if (!anyPlayer) {
    res.json({ totalGames: 0, sessionWins: 0, sessionLosses: 0, mostPlayedHero: null })
    return
  }
  const heroRows = await prisma.gameHistoryEntry.groupBy({
    by: ['heroSlug'],
    where: { lobbyId },
    _count: { _all: true },
    orderBy: { _count: { heroSlug: 'desc' } },
    take: 1,
  })
  const topHero = heroRows[0]
  const mostPlayedHero = topHero
    ? (() => {
        const hero = getHero(topHero.heroSlug)
        return { heroSlug: hero.slug, heroName: hero.name, heroIcon: hero.icon, plays: topHero._count._all }
      })()
    : null
  res.json({
    totalGames: anyPlayer.sessionWins + anyPlayer.sessionLosses,
    sessionWins: anyPlayer.sessionWins,
    sessionLosses: anyPlayer.sessionLosses,
    mostPlayedHero,
  })
})
