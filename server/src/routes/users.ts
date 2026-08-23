import { Router } from 'express'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth.js'
import { saveAvatar } from '../storage.js'
import { uploadLimiter } from '../rateLimits.js'

export const usersRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'))
      return
    }
    cb(null, true)
  },
})

async function buildProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null
  const [recentGames, lifetimeAgg] = await Promise.all([
    prisma.gameHistoryEntry.findMany({
      where: { userId },
      orderBy: { finishedAt: 'desc' },
      take: 5,
    }),
    // Lifetime K/D is across every game ever played, not just the 5 shown below.
    prisma.gameHistoryEntry.aggregate({
      where: { userId },
      _sum: { kills: true, deaths: true },
    }),
  ])
  return {
    id: user.id,
    username: user.username,
    profilePictureUrl: user.profilePictureUrl,
    steamInfo: user.steamInfo,
    allTimeWins: user.allTimeWins,
    allTimeLosses: user.allTimeLosses,
    lifetimeKills: lifetimeAgg._sum.kills ?? 0,
    lifetimeDeaths: lifetimeAgg._sum.deaths ?? 0,
    recentGames: recentGames.map((g) => ({
      id: g.id,
      heroSlug: g.heroSlug,
      challengeName: g.challengeName,
      outcome: g.outcome,
      souls: g.souls,
      kills: g.kills,
      deaths: g.deaths,
      finishedAt: g.finishedAt.toISOString(),
    })),
  }
}

usersRouter.get('/me/profile', requireAuth, async (req: AuthedRequest, res) => {
  const profile = await buildProfile(req.userId!)
  if (!profile) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(profile)
})

usersRouter.get('/:id/profile', requireAuth, async (req, res) => {
  const profile = await buildProfile(String(req.params.id))
  if (!profile) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(profile)
})

usersRouter.post('/me/password', requireAuth, async (req: AuthedRequest, res) => {
  const { currentPassword, newPassword } = req.body ?? {}
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be 6+ characters.' })
    return
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const ok = await bcrypt.compare(currentPassword ?? '', user.passwordHash)
  if (!ok) {
    res.status(401).json({ error: 'Current password is incorrect.' })
    return
  }
  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
  res.json({ ok: true })
})

usersRouter.post('/me/steam-info', requireAuth, async (req: AuthedRequest, res) => {
  const { steamInfo } = req.body ?? {}
  await prisma.user.update({ where: { id: req.userId }, data: { steamInfo: steamInfo ?? null } })
  res.json({ ok: true })
})

usersRouter.post('/me/avatar', uploadLimiter, requireAuth, upload.single('avatar'), async (req: AuthedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }
  const url = await saveAvatar(req.file.buffer, req.file.mimetype, req.userId!)
  await prisma.user.update({ where: { id: req.userId }, data: { profilePictureUrl: url } })
  res.json({ profilePictureUrl: url })
})

usersRouter.get('/search', requireAuth, async (req, res) => {
  const q = String(req.query.q ?? '').trim()
  if (q.length < 2) {
    res.json([])
    return
  }
  const users = await prisma.user.findMany({
    where: { username: { contains: q } },
    take: 10,
  })
  res.json(users.map((u) => ({ id: u.id, username: u.username, profilePictureUrl: u.profilePictureUrl })))
})
