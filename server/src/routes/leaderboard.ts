import { Router } from 'express'
import { prisma } from '../db.js'
import { optionalAuth, type AuthedRequest } from '../auth.js'
import { getHero } from '@shared/heroRegistry'
import { computeWinStreaks } from '../achievements.js'

export const leaderboardRouter = Router()

// Below this many plays a challenge's win rate is too noisy to be a meaningful
// "highest/lowest" record - a challenge played once at 100% or 0% would otherwise
// dominate the card.
const MIN_CHALLENGE_PLAYS = 5

async function getHiddenUserIds(): Promise<string[]> {
  const hidden = await prisma.user.findMany({ where: { hiddenFromLeaderboard: true }, select: { id: true } })
  return hidden.map((u) => u.id)
}

// Public, no auth required - this is the same "shareable, sitewide" spirit as the
// shared game summary link. Only the "friends" scope needs to know who's asking.
leaderboardRouter.get('/', optionalAuth, async (req: AuthedRequest, res) => {
  const scope = req.query.scope === 'friends' ? 'friends' : 'global'
  const modeParam = req.query.mode
  const mode: 'all' | 'standard' | 'draft' = modeParam === 'standard' || modeParam === 'draft' ? modeParam : 'all'

  // Standard/Draft splits can't come from User.allTimeWins etc - those are single
  // running totals, not per-mode. Recompute wins/losses/streaks live from GameHistoryEntry
  // instead of doubling every counter on User (and every place that increments them) just
  // to keep a second pair in sync. "all" keeps the fast cached-counter path below unchanged.
  if (mode !== 'all') {
    let friendIds: string[] | null = null
    if (scope === 'friends') {
      if (!req.userId) {
        res.status(401).json({ error: 'Log in to see your friends leaderboard.' })
        return
      }
      const friendships = await prisma.friendship.findMany({
        where: { userId: req.userId, status: 'accepted' },
        select: { friendId: true },
      })
      friendIds = [req.userId, ...friendships.map((f) => f.friendId)]
    }

    const hiddenUserIds = friendIds ? [] : await getHiddenUserIds()
    const games = await prisma.gameHistoryEntry.findMany({
      where: {
        rollMode: mode,
        ...(friendIds ? { userId: { in: friendIds } } : { userId: { notIn: hiddenUserIds } }),
      },
      orderBy: { finishedAt: 'asc' },
      select: { userId: true, outcome: true, heroSlug: true },
    })

    const byUser = new Map<string, { outcome: string; heroSlug: string }[]>()
    for (const g of games) {
      if (!byUser.has(g.userId)) byUser.set(g.userId, [])
      byUser.get(g.userId)!.push(g)
    }

    // Friends scope shows every friend even with zero games in this mode (matching the
    // "all" scope's behavior for friends); global scope only shows users who've actually
    // played this mode, same as "all" only showing users with allTimeWins/allTimeLosses > 0.
    const candidateIds = friendIds ?? [...byUser.keys()]
    if (candidateIds.length === 0) {
      res.json([])
      return
    }
    const candidateUsers = await prisma.user.findMany({
      where: { id: { in: candidateIds }, hiddenFromLeaderboard: false },
      select: { id: true, username: true, profilePictureUrl: true },
    })

    const modeEntries = candidateUsers.map((user) => {
      const userGames = byUser.get(user.id) ?? []
      const wins = userGames.filter((g) => g.outcome === 'win').length
      const losses = userGames.length - wins
      const { current, best } = computeWinStreaks(userGames)
      const heroCounts = new Map<string, number>()
      for (const g of userGames) heroCounts.set(g.heroSlug, (heroCounts.get(g.heroSlug) ?? 0) + 1)
      let bestHero: { heroSlug: string; plays: number } | null = null
      for (const [heroSlug, plays] of heroCounts) {
        if (!bestHero || plays > bestHero.plays) bestHero = { heroSlug, plays }
      }
      return {
        id: user.id,
        username: user.username,
        profilePictureUrl: user.profilePictureUrl,
        wins,
        losses,
        winRate: userGames.length > 0 ? wins / userGames.length : 0,
        currentWinStreak: current,
        bestWinStreak: best,
        mostPlayedHero: bestHero
          ? { heroSlug: bestHero.heroSlug, heroName: getHero(bestHero.heroSlug).name, heroIcon: getHero(bestHero.heroSlug).icon, plays: bestHero.plays }
          : null,
      }
    })

    res.json(modeEntries.sort((a, b) => b.wins - a.wins))
    return
  }

  let users: {
    id: string
    username: string
    profilePictureUrl: string | null
    allTimeWins: number
    allTimeLosses: number
    currentWinStreak: number
    bestWinStreak: number
  }[]

  if (scope === 'friends') {
    if (!req.userId) {
      res.status(401).json({ error: 'Log in to see your friends leaderboard.' })
      return
    }
    const friendships = await prisma.friendship.findMany({
      where: { userId: req.userId, status: 'accepted' },
      select: { friendId: true },
    })
    const ids = [req.userId, ...friendships.map((f) => f.friendId)]
    users = await prisma.user.findMany({ where: { id: { in: ids }, hiddenFromLeaderboard: false } })
  } else {
    users = await prisma.user.findMany({
      where: { hiddenFromLeaderboard: false, OR: [{ allTimeWins: { gt: 0 } }, { allTimeLosses: { gt: 0 } }] },
      orderBy: { allTimeWins: 'desc' },
      take: 100,
    })
  }

  const heroRows = await prisma.gameHistoryEntry.groupBy({
    by: ['userId', 'heroSlug'],
    where: { userId: { in: users.map((u) => u.id) } },
    _count: { _all: true },
  })
  const bestHeroByUser = new Map<string, { heroSlug: string; plays: number }>()
  for (const row of heroRows) {
    const current = bestHeroByUser.get(row.userId)
    if (!current || row._count._all > current.plays) {
      bestHeroByUser.set(row.userId, { heroSlug: row.heroSlug, plays: row._count._all })
    }
  }

  const entries = users.map((user) => toEntry(user, bestHeroByUser.get(user.id) ?? null))
  res.json(scope === 'friends' ? entries.sort((a, b) => b.wins - a.wins) : entries)
})

leaderboardRouter.get('/highlights', async (_req, res) => {
  const hiddenUserIds = await getHiddenUserIds()
  const visibleFilter = hiddenUserIds.length > 0 ? { userId: { notIn: hiddenUserIds } } : {}

  const [challengeRows, topSoulsEntry, topKillsEntry, topAssistsEntry] = await Promise.all([
    prisma.gameHistoryEntry.groupBy({
      by: ['challengeName', 'outcome'],
      where: visibleFilter,
      _count: { _all: true },
    }),
    prisma.gameHistoryEntry.findFirst({ where: visibleFilter, orderBy: { souls: 'desc' }, include: { user: true } }),
    prisma.gameHistoryEntry.findFirst({ where: visibleFilter, orderBy: { kills: 'desc' }, include: { user: true } }),
    prisma.gameHistoryEntry.findFirst({ where: visibleFilter, orderBy: { assists: 'desc' }, include: { user: true } }),
  ])

  const tallies = new Map<string, { wins: number; plays: number }>()
  for (const row of challengeRows) {
    const tally = tallies.get(row.challengeName) ?? { wins: 0, plays: 0 }
    tally.plays += row._count._all
    if (row.outcome === 'win') tally.wins += row._count._all
    tallies.set(row.challengeName, tally)
  }

  const rates = [...tallies.entries()]
    .filter(([, t]) => t.plays >= MIN_CHALLENGE_PLAYS)
    .map(([challengeName, t]) => ({ challengeName, wins: t.wins, plays: t.plays, winRate: t.wins / t.plays }))
    .sort((a, b) => b.winRate - a.winRate)

  res.json({
    highestWinRateChallenge: rates[0] ?? null,
    lowestWinRateChallenge: rates.length > 0 ? rates[rates.length - 1] : null,
    topSouls: topSoulsEntry
      ? {
          id: topSoulsEntry.user.id,
          username: topSoulsEntry.user.username,
          profilePictureUrl: topSoulsEntry.user.profilePictureUrl,
          value: topSoulsEntry.souls,
        }
      : null,
    topKills: topKillsEntry
      ? {
          id: topKillsEntry.user.id,
          username: topKillsEntry.user.username,
          profilePictureUrl: topKillsEntry.user.profilePictureUrl,
          value: topKillsEntry.kills,
        }
      : null,
    topAssists: topAssistsEntry
      ? {
          id: topAssistsEntry.user.id,
          username: topAssistsEntry.user.username,
          profilePictureUrl: topAssistsEntry.user.profilePictureUrl,
          value: topAssistsEntry.assists,
        }
      : null,
  })
})

function toEntry(
  user: {
    id: string
    username: string
    profilePictureUrl: string | null
    allTimeWins: number
    allTimeLosses: number
    currentWinStreak: number
    bestWinStreak: number
  },
  bestHero: { heroSlug: string; plays: number } | null,
) {
  const total = user.allTimeWins + user.allTimeLosses
  return {
    id: user.id,
    username: user.username,
    profilePictureUrl: user.profilePictureUrl,
    wins: user.allTimeWins,
    losses: user.allTimeLosses,
    winRate: total > 0 ? user.allTimeWins / total : 0,
    currentWinStreak: user.currentWinStreak,
    bestWinStreak: user.bestWinStreak,
    mostPlayedHero: bestHero
      ? { heroSlug: bestHero.heroSlug, heroName: getHero(bestHero.heroSlug).name, heroIcon: getHero(bestHero.heroSlug).icon, plays: bestHero.plays }
      : null,
  }
}
