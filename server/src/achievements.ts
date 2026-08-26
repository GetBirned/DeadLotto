import { prisma } from './db.js'
import { computeUnlockedSlugs, ACHIEVEMENT_BY_SLUG, type AchievementDefinition } from '@shared/achievements'

// Re-evaluates every achievement threshold for a user and stores any newly-qualifying
// ones. Idempotent - safe to call after every game, no separate "already checked" state
// to track. Returns only the ones that were actually new (not ones the user already
// had) so the caller can push a real-time unlock notification.
export async function checkAndUnlockAchievements(userId: string): Promise<AchievementDefinition[]> {
  const [user, games] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.gameHistoryEntry.findMany({
      where: { userId },
      select: { heroSlug: true, challengeName: true, outcome: true, deaths: true, souls: true, kills: true },
    }),
  ])
  if (!user) return []

  const distinctHeroes = new Set(games.map((g) => g.heroSlug))
  const distinctChallenges = new Set(
    games.flatMap((g) => g.challengeName.split(', ').map((s) => s.trim()).filter(Boolean)),
  )

  const unlockedSlugs = computeUnlockedSlugs({
    totalWins: user.allTimeWins,
    totalGames: user.allTimeWins + user.allTimeLosses,
    bestSoulsInAGame: games.reduce((max, g) => Math.max(max, g.souls), 0),
    bestKillsInAGame: games.reduce((max, g) => Math.max(max, g.kills), 0),
    wonWithZeroDeaths: games.some((g) => g.outcome === 'win' && g.deaths === 0),
    distinctHeroesPlayed: distinctHeroes.size,
    distinctChallengesPlayed: distinctChallenges.size,
    bestWinStreak: user.bestWinStreak,
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
