import { Router } from 'express'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth.js'
import { saveAvatar } from '../storage.js'
import { uploadLimiter } from '../rateLimits.js'
import { HERO_BY_SLUG } from '@shared/heroRegistry'
import { ACHIEVEMENT_BY_SLUG, ROLE_TITLE_BY_SLUG, computeAchievementProgress } from '@shared/achievements'
import { ACCENT_COLORS } from '@shared/profileStyle'
import { getIO } from '../socketBus.js'
import { broadcastLobby } from '../sockets/lobbySocket.js'
import { computeAchievementStatsForUser } from '../achievements.js'

export const usersRouter = Router()

// Avatar/title changes are visible in any lobby the user is currently sitting in, but
// those come through this plain REST router, not a lobby socket event - so nothing
// would normally re-broadcast that lobby's state. Push a fresh broadcast to every
// active (non-closed) lobby they're a member of so the change shows up live instead of
// only after their next lobby-affecting action or a page reload.
async function rebroadcastActiveLobbies(userId: string) {
  const io = getIO()
  if (!io) return
  const memberships = await prisma.lobbyPlayer.findMany({
    where: { userId, lobby: { status: { not: 'closed' } } },
    select: { lobbyId: true },
  })
  await Promise.all(memberships.map((m) => broadcastLobby(io, m.lobbyId)))
}

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

async function buildProfile(userId: string, viewerId?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null
  const [recentGames, lifetimeAgg, unlockedAchievements, friendship] = await Promise.all([
    prisma.gameHistoryEntry.findMany({
      where: { userId },
      orderBy: { finishedAt: 'desc' },
      take: 5,
    }),
    // Lifetime K/D/A is across every game ever played, not just the 5 shown below.
    prisma.gameHistoryEntry.aggregate({
      where: { userId },
      _sum: { kills: true, deaths: true, assists: true },
    }),
    prisma.userAchievement.findMany({ where: { userId }, orderBy: { unlockedAt: 'desc' } }),
    viewerId && viewerId !== userId
      ? prisma.friendship.findFirst({
          where: {
            OR: [
              { userId: viewerId, friendId: userId },
              { userId, friendId: viewerId },
            ],
          },
        })
      : null,
  ])

  let friendshipStatus: 'self' | 'none' | 'friends' | 'pending-outgoing' | 'pending-incoming' = 'none'
  let friendshipRequestId: string | null = null
  if (!viewerId || viewerId === userId) {
    friendshipStatus = 'self'
  } else if (friendship?.status === 'accepted') {
    friendshipStatus = 'friends'
  } else if (friendship?.status === 'pending') {
    friendshipStatus = friendship.userId === viewerId ? 'pending-outgoing' : 'pending-incoming'
    friendshipRequestId = friendship.id
  }

  return {
    id: user.id,
    username: user.username,
    profilePictureUrl: user.profilePictureUrl,
    steamInfo: user.steamInfo,
    steamDisplayName: user.steamDisplayName,
    steamAvatarUrl: user.steamAvatarUrl,
    allTimeWins: user.allTimeWins,
    allTimeLosses: user.allTimeLosses,
    currentWinStreak: user.currentWinStreak,
    bestWinStreak: user.bestWinStreak,
    lifetimeKills: lifetimeAgg._sum.kills ?? 0,
    lifetimeDeaths: lifetimeAgg._sum.deaths ?? 0,
    lifetimeAssists: lifetimeAgg._sum.assists ?? 0,
    favoriteHeroSlug: user.favoriteHeroSlug,
    profileAccentColor: user.profileAccentColor,
    selectedTitleSlug: user.selectedTitleSlug,
    isAdmin: user.isAdmin,
    isOwner: user.isOwner,
    recentGames: recentGames.map((g) => ({
      id: g.id,
      heroSlug: g.heroSlug,
      challengeName: g.challengeName,
      outcome: g.outcome,
      souls: g.souls,
      kills: g.kills,
      deaths: g.deaths,
      assists: g.assists,
      finishedAt: g.finishedAt.toISOString(),
    })),
    achievements: unlockedAchievements.map((a) => {
      const def = ACHIEVEMENT_BY_SLUG[a.achievementSlug]
      return {
        slug: a.achievementSlug,
        name: def?.name ?? a.achievementSlug,
        description: def?.description ?? '',
        unlockedAt: a.unlockedAt.toISOString(),
      }
    }),
    friendshipStatus,
    friendshipRequestId,
  }
}

usersRouter.get('/me/profile', requireAuth, async (req: AuthedRequest, res) => {
  const profile = await buildProfile(req.userId!, req.userId)
  if (!profile) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(profile)
})

usersRouter.get('/:id/profile', requireAuth, async (req: AuthedRequest, res) => {
  const profile = await buildProfile(String(req.params.id), req.userId)
  if (!profile) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(profile)
})

// Full locked+unlocked achievement list with progress numbers, for the achievements
// popup - separate from buildProfile's `achievements` (which only lists what's already
// unlocked, for the compact inline summary). `unlocked`/`unlockedAt` come from the
// persisted UserAchievement rows rather than the freshly-computed stats, so this always
// agrees with what's actually selectable as a profile title - a user's historical stats
// can already satisfy a newly-added achievement before their next finished game is what
// actually persists the unlock.
async function buildAchievementProgress(userId: string) {
  const stats = await computeAchievementStatsForUser(userId)
  if (!stats) return null
  const [progress, unlockedRows] = await Promise.all([
    Promise.resolve(computeAchievementProgress(stats)),
    prisma.userAchievement.findMany({ where: { userId } }),
  ])
  const unlockedAtBySlug = new Map(unlockedRows.map((r) => [r.achievementSlug, r.unlockedAt.toISOString()]))
  return progress.map((p) => {
    const def = ACHIEVEMENT_BY_SLUG[p.slug]
    const unlockedAt = unlockedAtBySlug.get(p.slug) ?? null
    return {
      slug: p.slug,
      name: def?.name ?? p.slug,
      description: def?.description ?? '',
      rarity: def?.rarity ?? 'common',
      unlocked: unlockedAt !== null,
      unlockedAt,
      current: p.current,
      target: p.target,
    }
  })
}

usersRouter.get('/me/achievement-progress', requireAuth, async (req: AuthedRequest, res) => {
  const progress = await buildAchievementProgress(req.userId!)
  if (!progress) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(progress)
})

usersRouter.get('/:id/achievement-progress', requireAuth, async (req: AuthedRequest, res) => {
  const progress = await buildAchievementProgress(String(req.params.id))
  if (!progress) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(progress)
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

usersRouter.post('/me/steam-unlink', requireAuth, async (req: AuthedRequest, res) => {
  await prisma.user.update({
    where: { id: req.userId },
    data: { steamInfo: null, steamId64: null, steamDisplayName: null, steamAvatarUrl: null },
  })
  res.json({ ok: true })
})

usersRouter.post('/me/favorite-hero', requireAuth, async (req: AuthedRequest, res) => {
  const { heroSlug } = req.body ?? {}
  if (heroSlug !== null && (typeof heroSlug !== 'string' || !HERO_BY_SLUG[heroSlug])) {
    res.status(400).json({ error: 'Unknown hero.' })
    return
  }
  await prisma.user.update({ where: { id: req.userId }, data: { favoriteHeroSlug: heroSlug } })
  res.json({ ok: true })
})

usersRouter.post('/me/profile-style', requireAuth, async (req: AuthedRequest, res) => {
  const { accentColor } = req.body ?? {}
  if (accentColor !== null && !ACCENT_COLORS.includes(accentColor)) {
    res.status(400).json({ error: 'Invalid accent color.' })
    return
  }
  await prisma.user.update({ where: { id: req.userId }, data: { profileAccentColor: accentColor } })
  res.json({ ok: true })
})

usersRouter.post('/me/title', requireAuth, async (req: AuthedRequest, res) => {
  const { achievementSlug } = req.body ?? {}
  if (achievementSlug !== null) {
    if (typeof achievementSlug !== 'string') {
      res.status(400).json({ error: 'Unknown title.' })
      return
    }
    if (ROLE_TITLE_BY_SLUG[achievementSlug]) {
      // Owner/Admin are role-granted titles, not earned achievements - check the
      // user's actual role instead of a UserAchievement row.
      const user = await prisma.user.findUnique({ where: { id: req.userId } })
      const allowed =
        (achievementSlug === 'owner' && user?.isOwner) || (achievementSlug === 'admin' && user?.isAdmin)
      if (!allowed) {
        res.status(400).json({ error: "You don't have that role." })
        return
      }
    } else if (ACHIEVEMENT_BY_SLUG[achievementSlug]) {
      const unlocked = await prisma.userAchievement.findUnique({
        where: { userId_achievementSlug: { userId: req.userId!, achievementSlug } },
      })
      if (!unlocked) {
        res.status(400).json({ error: "You haven't unlocked that achievement yet." })
        return
      }
    } else {
      res.status(400).json({ error: 'Unknown title.' })
      return
    }
  }
  await prisma.user.update({ where: { id: req.userId }, data: { selectedTitleSlug: achievementSlug } })
  res.json({ ok: true })
  rebroadcastActiveLobbies(req.userId!).catch((err) => console.error('[lobby] rebroadcast after title change failed', err))
})

usersRouter.post('/me/avatar', uploadLimiter, requireAuth, upload.single('avatar'), async (req: AuthedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }
  const url = await saveAvatar(req.file.buffer, req.file.mimetype, req.userId!)
  await prisma.user.update({ where: { id: req.userId }, data: { profilePictureUrl: url } })
  res.json({ profilePictureUrl: url })
  rebroadcastActiveLobbies(req.userId!).catch((err) => console.error('[lobby] rebroadcast after avatar change failed', err))
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
