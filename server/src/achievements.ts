import { prisma } from './db.js'
import { computeUnlockedSlugs } from '@shared/achievements'

// Re-evaluates every achievement threshold for a user and stores any newly-qualifying
// ones. Idempotent - safe to call after every game, no separate "already checked" state
// to track. Achievements show up next time the player's profile is loaded rather than
// as a live in-game toast (kept out of scope for this pass).
export async function checkAndUnlockAchievements(userId: string): Promise<void> {
  const [user, games] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.gameHistoryEntry.findMany({
      where: { userId },
      select: { heroSlug: true, challengeName: true, outcome: true, deaths: true, souls: true, kills: true },
    }),
  ])
  if (!user) return

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

  if (unlockedSlugs.length === 0) return
  await prisma.userAchievement.createMany({
    data: unlockedSlugs.map((achievementSlug) => ({ userId, achievementSlug })),
    skipDuplicates: true,
  })
}
