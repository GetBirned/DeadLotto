import { Router } from 'express'
import { prisma } from '../db.js'

export const sharedSummariesRouter = Router()

// Deliberately no requireAuth - this is the whole point of a "shareable" link:
// anyone with the URL can see it, no DeadLotto account needed.
sharedSummariesRouter.get('/:shareCode', async (req, res) => {
  const shareCode = String(req.params.shareCode).toUpperCase()
  const summary = await prisma.sharedGameSummary.findUnique({
    where: { shareCode },
    include: { players: true },
  })
  if (!summary) {
    res.status(404).json({ error: 'Shared game not found.' })
    return
  }
  res.json({
    shareCode: summary.shareCode,
    outcome: summary.outcome,
    createdAt: summary.createdAt.toISOString(),
    players: summary.players.map((p) => ({
      username: p.username,
      profilePictureUrl: p.profilePictureUrl,
      heroSlug: p.heroSlug,
      challengeNames: p.challengeNames.split(', ').filter(Boolean),
      kills: p.kills,
      deaths: p.deaths,
      souls: p.souls,
      sessionWins: p.sessionWins,
      sessionLosses: p.sessionLosses,
    })),
  })
})
