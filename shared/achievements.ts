export interface AchievementDefinition {
  slug: string
  name: string
  description: string
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { slug: 'first-win', name: 'First Blood', description: 'Win your first game.' },
  { slug: 'ten-wins', name: 'On a Roll', description: 'Win 10 games.' },
  { slug: 'fifty-wins', name: 'Seasoned', description: 'Win 50 games.' },
  { slug: 'veteran', name: 'Veteran', description: 'Play 25 games.' },
  { slug: 'centurion', name: 'Centurion', description: 'Play 100 games.' },
  { slug: 'soul-hoarder', name: 'Soul Hoarder', description: 'Earn 80,000+ souls in a single game.' },
  { slug: 'slayer', name: 'Slayer', description: 'Get 15+ kills in a single game.' },
  { slug: 'untouchable', name: 'Untouchable', description: 'Win a game without dying.' },
  { slug: 'hero-collector', name: 'Hero Collector', description: 'Play 15 different heroes.' },
  { slug: 'challenge-hoarder', name: 'Challenge Hoarder', description: 'Play 20 different challenges.' },
  { slug: 'hot-streak', name: 'Hot Streak', description: 'Win 5 games in a row.' },
]

export const ACHIEVEMENT_BY_SLUG: Record<string, AchievementDefinition> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.slug, a]),
)

// Pure function over already-aggregated stats (no DB access here - the server computes
// these numbers via Prisma, this just decides which thresholds are met) so it can be
// shared between server unlock-checks and any future client-side preview.
export interface AchievementStats {
  totalWins: number
  totalGames: number
  bestSoulsInAGame: number
  bestKillsInAGame: number
  wonWithZeroDeaths: boolean
  distinctHeroesPlayed: number
  distinctChallengesPlayed: number
  bestWinStreak: number
}

export function computeUnlockedSlugs(stats: AchievementStats): string[] {
  const unlocked: string[] = []
  if (stats.totalWins >= 1) unlocked.push('first-win')
  if (stats.totalWins >= 10) unlocked.push('ten-wins')
  if (stats.totalWins >= 50) unlocked.push('fifty-wins')
  if (stats.totalGames >= 25) unlocked.push('veteran')
  if (stats.totalGames >= 100) unlocked.push('centurion')
  if (stats.bestSoulsInAGame >= 80000) unlocked.push('soul-hoarder')
  if (stats.bestKillsInAGame >= 15) unlocked.push('slayer')
  if (stats.wonWithZeroDeaths) unlocked.push('untouchable')
  if (stats.distinctHeroesPlayed >= 15) unlocked.push('hero-collector')
  if (stats.distinctChallengesPlayed >= 20) unlocked.push('challenge-hoarder')
  if (stats.bestWinStreak >= 5) unlocked.push('hot-streak')
  return unlocked
}
