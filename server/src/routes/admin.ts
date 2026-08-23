import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAdmin } from '../auth.js'
import { getRecentErrors } from '../errorLog.js'

export const adminRouter = Router()
adminRouter.use(requireAdmin)

adminRouter.get('/suggestions', async (_req, res) => {
  const suggestions = await prisma.challengeSuggestion.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: true },
  })
  res.json(
    suggestions.map((s) => ({
      id: s.id,
      challengeName: s.challengeName,
      details: s.details,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      suggestedBy: { id: s.user.id, username: s.user.username, profilePictureUrl: s.user.profilePictureUrl },
    })),
  )
})

adminRouter.post('/suggestions/:id/status', async (req, res) => {
  const { status } = req.body ?? {}
  if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
    res.status(400).json({ error: 'Invalid status.' })
    return
  }
  await prisma.challengeSuggestion.update({ where: { id: req.params.id }, data: { status } })
  res.json({ ok: true })
})

adminRouter.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
  res.json(
    users.map((u) => ({
      id: u.id,
      username: u.username,
      profilePictureUrl: u.profilePictureUrl,
      isAdmin: u.isAdmin,
      isOwner: u.isOwner,
      hiddenFromLeaderboard: u.hiddenFromLeaderboard,
      allTimeWins: u.allTimeWins,
      allTimeLosses: u.allTimeLosses,
      createdAt: u.createdAt.toISOString(),
    })),
  )
})

adminRouter.post('/users/:username/set-admin', async (req, res) => {
  const { isAdmin } = req.body ?? {}
  if (typeof isAdmin !== 'boolean') {
    res.status(400).json({ error: 'isAdmin must be a boolean.' })
    return
  }
  const user = await prisma.user.findUnique({ where: { username: req.params.username } })
  if (!user) {
    res.status(404).json({ error: 'User not found.' })
    return
  }
  // The owner's admin status is permanent - no other admin (or the owner themself,
  // via this endpoint) can revoke it.
  if (user.isOwner && !isAdmin) {
    res.status(403).json({ error: "The owner's admin access can't be removed." })
    return
  }
  await prisma.user.update({ where: { id: user.id }, data: { isAdmin } })
  res.json({ ok: true })
})

adminRouter.post('/users/:username/set-leaderboard-visibility', async (req, res) => {
  const { hiddenFromLeaderboard } = req.body ?? {}
  if (typeof hiddenFromLeaderboard !== 'boolean') {
    res.status(400).json({ error: 'hiddenFromLeaderboard must be a boolean.' })
    return
  }
  const user = await prisma.user.findUnique({ where: { username: req.params.username } })
  if (!user) {
    res.status(404).json({ error: 'User not found.' })
    return
  }
  await prisma.user.update({ where: { id: user.id }, data: { hiddenFromLeaderboard } })
  res.json({ ok: true })
})

adminRouter.get('/errors', (_req, res) => {
  res.json(getRecentErrors())
})
