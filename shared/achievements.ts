export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface AchievementDefinition {
  slug: string
  name: string
  description: string
  rarity: AchievementRarity
}

// Green -> blue -> purple -> orange, matching the usual common/rare/epic/legendary
// game-loot convention players already expect.
export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: '#5fd97a',
  rare: '#5b9dff',
  epic: '#b366ff',
  legendary: '#ff9f40',
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { slug: 'first-win', name: 'First Blood', description: 'Win your first game.', rarity: 'common' },
  { slug: 'ten-wins', name: 'On a Roll', description: 'Win 10 games.', rarity: 'common' },
  { slug: 'fifty-wins', name: 'Seasoned', description: 'Win 50 games.', rarity: 'rare' },
  { slug: 'veteran', name: 'Veteran', description: 'Play 25 games.', rarity: 'common' },
  { slug: 'centurion', name: 'Centurion', description: 'Play 100 games.', rarity: 'rare' },
  { slug: 'soul-hoarder', name: 'Soul Hoarder', description: 'Earn 80,000+ souls in a single game.', rarity: 'rare' },
  { slug: 'slayer', name: 'Slayer', description: 'Get 15+ kills in a single game.', rarity: 'common' },
  { slug: 'untouchable', name: 'Untouchable', description: 'Win a game without dying.', rarity: 'rare' },
  { slug: 'hero-collector', name: 'Hero Collector', description: 'Play 15 different heroes.', rarity: 'common' },
  { slug: 'challenge-hoarder', name: 'Challenge Hoarder', description: 'Play 20 different challenges.', rarity: 'common' },
  { slug: 'hot-streak', name: 'Hot Streak', description: 'Win 5 games in a row.', rarity: 'epic' },
  { slug: 'what-are-the-odds', name: 'What Are The Odds?', description: 'Roll the same challenge 3 times in a row.', rarity: 'common' },
  { slug: 'deja-vu', name: 'Déjà Vu', description: 'Play the same hero 5 games in a row.', rarity: 'common' },
  { slug: 'reverse-sweep', name: 'Reverse Sweep', description: 'Win after losing 5 consecutive games.', rarity: 'rare' },
  { slug: 'worth-it', name: 'Worth It', description: 'Win a game with 10+ deaths.', rarity: 'common' },
  { slug: 'participation-trophy', name: 'Participation Trophy', description: 'Lose 10 games.', rarity: 'common' },
  { slug: 'skill-issue', name: 'Skill Issue', description: 'Lose a game while having the most souls on your team.', rarity: 'rare' },
  { slug: 'we-take-those', name: 'We Take Those', description: 'Win while having the fewest souls on your team.', rarity: 'rare' },
  { slug: 'addiction', name: 'Addiction', description: 'Roll 100 challenges total.', rarity: 'epic' },
  { slug: 'just-one-more', name: 'Just One More', description: 'Play 10 challenge games in one day.', rarity: 'rare' },
  { slug: 'master-of-none', name: 'Master of None', description: 'Play every available hero at least once.', rarity: 'legendary' },
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
  sameChallengeStreak: number
  sameHeroStreak: number
  wonAfterLosingStreak: boolean
  wonWithManyDeaths: boolean
  lostWithMostTeamSouls: boolean
  wonWithFewestTeamSouls: boolean
  totalChallengesRolled: number
  maxChallengeGamesInOneDay: number
  playedAllHeroes: boolean
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
  if (stats.sameChallengeStreak >= 3) unlocked.push('what-are-the-odds')
  if (stats.sameHeroStreak >= 5) unlocked.push('deja-vu')
  if (stats.wonAfterLosingStreak) unlocked.push('reverse-sweep')
  if (stats.wonWithManyDeaths) unlocked.push('worth-it')
  if (stats.totalGames - stats.totalWins >= 10) unlocked.push('participation-trophy')
  if (stats.lostWithMostTeamSouls) unlocked.push('skill-issue')
  if (stats.wonWithFewestTeamSouls) unlocked.push('we-take-those')
  if (stats.totalChallengesRolled >= 100) unlocked.push('addiction')
  if (stats.maxChallengeGamesInOneDay >= 10) unlocked.push('just-one-more')
  if (stats.playedAllHeroes) unlocked.push('master-of-none')
  return unlocked
}
