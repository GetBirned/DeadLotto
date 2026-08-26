import { prisma } from './db.js'
import { computeUnlockedSlugs, ACHIEVEMENT_BY_SLUG, type AchievementDefinition } from '@shared/achievements'
import { HEROES, WILDCARD_SLUG } from '@shared/heroRegistry'

// Longest run of consecutive items (in the given order) sharing the same key - used for
// "same hero N games in a row" / "same challenge N games in a row".
export function longestConsecutiveRun<T>(items: T[], key: (item: T) => string): number {
  let longest = 0
  let current = 0
  let prevKey: string | null = null
  for (const item of items) {
    const k = key(item)
    current = k === prevKey ? current + 1 : 1
    prevKey = k
    longest = Math.max(longest, current)
  }
  return longest
}

// True if, anywhere in the (chronological) history, a win immediately followed a losing
// streak of at least `threshold` games.
export function everWonAfterLosingStreak(gamesAsc: { outcome: string }[], threshold: number): boolean {
  let consecutiveLosses = 0
  for (const g of gamesAsc) {
    if (g.outcome === 'win') {
      if (consecutiveLosses >= threshold) return true
      consecutiveLosses = 0
    } else {
      consecutiveLosses += 1
    }
  }
  return false
}

// Re-evaluates every achievement threshold for a user and stores any newly-qualifying
// ones. Idempotent - safe to call after every game, no separate "already checked" state
// to track. Returns only the ones that were actually new (not ones the user already
// had) so the caller can push a real-time unlock notification.
export async function checkAndUnlockAchievements(userId: string): Promise<AchievementDefinition[]> {
  const [user, gamesAsc] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.gameHistoryEntry.findMany({
      where: { userId },
      orderBy: { finishedAt: 'asc' },
      select: {
        heroSlug: true,
        challengeName: true,
        outcome: true,
        deaths: true,
        souls: true,
        kills: true,
        finishedAt: true,
        roundKey: true,
      },
    }),
  ])
  if (!user) return []

  const distinctHeroes = new Set(gamesAsc.map((g) => g.heroSlug))
  const distinctChallenges = new Set(
    gamesAsc.flatMap((g) => g.challengeName.split(', ').map((s) => s.trim()).filter(Boolean)),
  )

  const totalChallengesRolled = gamesAsc.reduce(
    (sum, g) => sum + (g.challengeName ? g.challengeName.split(', ').filter(Boolean).length : 0),
    0,
  )

  const challengeGamesByDay = new Map<string, number>()
  for (const g of gamesAsc) {
    if (!g.challengeName) continue
    const day = g.finishedAt.toISOString().slice(0, 10)
    challengeGamesByDay.set(day, (challengeGamesByDay.get(day) ?? 0) + 1)
  }
  const maxChallengeGamesInOneDay = challengeGamesByDay.size > 0 ? Math.max(...challengeGamesByDay.values()) : 0

  // "Your team" for a given game is whoever else's GameHistoryEntry shares that game's
  // roundKey - lobbyId alone isn't enough since "Play Again" reuses the same lobby for
  // many separate rounds. Rows from before roundKey existed are simply skipped.
  const roundKeys = gamesAsc.map((g) => g.roundKey).filter((k): k is string => !!k)
  const teammateRows =
    roundKeys.length > 0
      ? await prisma.gameHistoryEntry.findMany({
          where: { roundKey: { in: roundKeys } },
          select: { userId: true, roundKey: true, souls: true },
        })
      : []
  const teammatesByRoundKey = new Map<string, { userId: string; souls: number }[]>()
  for (const row of teammateRows) {
    if (!row.roundKey) continue
    const list = teammatesByRoundKey.get(row.roundKey) ?? []
    list.push(row)
    teammatesByRoundKey.set(row.roundKey, list)
  }
  let lostWithMostTeamSouls = false
  let wonWithFewestTeamSouls = false
  for (const g of gamesAsc) {
    if (!g.roundKey) continue
    const teammates = teammatesByRoundKey.get(g.roundKey) ?? []
    const others = teammates.filter((t) => t.userId !== userId)
    if (others.length === 0) continue // solo round - no team to compare against
    const mySouls = teammates.find((t) => t.userId === userId)?.souls ?? -1
    if (g.outcome === 'loss' && mySouls > Math.max(...others.map((t) => t.souls))) lostWithMostTeamSouls = true
    if (g.outcome === 'win' && mySouls < Math.min(...others.map((t) => t.souls))) wonWithFewestTeamSouls = true
  }

  const realHeroesPlayed = new Set(gamesAsc.map((g) => g.heroSlug).filter((slug) => slug !== WILDCARD_SLUG))
  const playedAllHeroes = HEROES.every((h) => realHeroesPlayed.has(h.slug))

  const unlockedSlugs = computeUnlockedSlugs({
    totalWins: user.allTimeWins,
    totalGames: user.allTimeWins + user.allTimeLosses,
    bestSoulsInAGame: gamesAsc.reduce((max, g) => Math.max(max, g.souls), 0),
    bestKillsInAGame: gamesAsc.reduce((max, g) => Math.max(max, g.kills), 0),
    wonWithZeroDeaths: gamesAsc.some((g) => g.outcome === 'win' && g.deaths === 0),
    distinctHeroesPlayed: distinctHeroes.size,
    distinctChallengesPlayed: distinctChallenges.size,
    bestWinStreak: user.bestWinStreak,
    sameChallengeStreak: longestConsecutiveRun(
      gamesAsc.filter((g) => g.challengeName),
      (g) => g.challengeName,
    ),
    sameHeroStreak: longestConsecutiveRun(gamesAsc, (g) => g.heroSlug),
    wonAfterLosingStreak: everWonAfterLosingStreak(gamesAsc, 5),
    wonWithManyDeaths: gamesAsc.some((g) => g.outcome === 'win' && g.deaths >= 10),
    lostWithMostTeamSouls,
    wonWithFewestTeamSouls,
    totalChallengesRolled,
    maxChallengeGamesInOneDay,
    playedAllHeroes,
  })

  if (unlockedSlugs.length === 0) return []

  // createMany + skipDuplicates tells us how many rows it inserted, not which slugs
  // those were - check what the user already had first so we know exactly what's new.
  const alreadyUnlocked = await prisma.userAchievement.findMany({
    where: { userId, achievementSlug: { in: unlockedSlugs } },
    select: { achievementSlug: true },
  })
  const alreadyUnlockedSlugs = new Set(alreadyUnlocked.map((a) => a.achievementSlug))
  const newSlugs = unlockedSlugs.filter((slug) => !alreadyUnlockedSlugs.has(slug))
  if (newSlugs.length === 0) return []

  await prisma.userAchievement.createMany({
    data: newSlugs.map((achievementSlug) => ({ userId, achievementSlug })),
    skipDuplicates: true,
  })
  return newSlugs.map((slug) => ACHIEVEMENT_BY_SLUG[slug]).filter((a): a is AchievementDefinition => !!a)
}
