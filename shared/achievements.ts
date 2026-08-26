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

// Selectable profile titles granted by role rather than earned in-game - same
// selectedTitleSlug mechanism as achievement titles, just validated against isOwner /
// isAdmin server-side instead of an unlocked UserAchievement row.
export interface RoleTitle {
  slug: string
  name: string
  color: string
}

export const ROLE_TITLES: RoleTitle[] = [
  { slug: 'owner', name: 'Owner', color: '#ff6b6b' },
  { slug: 'admin', name: 'Admin', color: '#f472b6' },
]

export const ROLE_TITLE_BY_SLUG: Record<string, RoleTitle> = Object.fromEntries(
  ROLE_TITLES.map((t) => [t.slug, t]),
)

// A selectedTitleSlug can point at either a role title (owner/admin) or an unlocked
// achievement - this resolves either into the same {name, color} shape so display code
// doesn't need to know which kind it is.
export function resolveTitleDisplay(slug: string | null | undefined): { name: string; color: string } | null {
  if (!slug) return null
  const role = ROLE_TITLE_BY_SLUG[slug]
  if (role) return { name: role.name, color: role.color }
  const achievement = ACHIEVEMENT_BY_SLUG[slug]
  if (achievement) return { name: achievement.name, color: RARITY_COLORS[achievement.rarity] }
  return null
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
  distinctRealHeroesPlayed: number
  totalHeroCount: number
}

// current/target are null for achievements that are a plain yes/no condition rather
// than a countable progress toward a number (e.g. Untouchable has no meaningful
// "3 of 10" to show) - the achievements popup renders those as locked/unlocked only,
// with a progress bar for everything else.
export interface AchievementProgress {
  slug: string
  unlocked: boolean
  current: number | null
  target: number | null
}

export function computeAchievementProgress(stats: AchievementStats): AchievementProgress[] {
  const totalLosses = stats.totalGames - stats.totalWins
  return [
    { slug: 'first-win', unlocked: stats.totalWins >= 1, current: stats.totalWins, target: 1 },
    { slug: 'ten-wins', unlocked: stats.totalWins >= 10, current: stats.totalWins, target: 10 },
    { slug: 'fifty-wins', unlocked: stats.totalWins >= 50, current: stats.totalWins, target: 50 },
    { slug: 'veteran', unlocked: stats.totalGames >= 25, current: stats.totalGames, target: 25 },
    { slug: 'centurion', unlocked: stats.totalGames >= 100, current: stats.totalGames, target: 100 },
    {
      slug: 'soul-hoarder',
      unlocked: stats.bestSoulsInAGame >= 80000,
      current: stats.bestSoulsInAGame,
      target: 80000,
    },
    { slug: 'slayer', unlocked: stats.bestKillsInAGame >= 15, current: stats.bestKillsInAGame, target: 15 },
    { slug: 'untouchable', unlocked: stats.wonWithZeroDeaths, current: null, target: null },
    {
      slug: 'hero-collector',
      unlocked: stats.distinctHeroesPlayed >= 15,
      current: stats.distinctHeroesPlayed,
      target: 15,
    },
    {
      slug: 'challenge-hoarder',
      unlocked: stats.distinctChallengesPlayed >= 20,
      current: stats.distinctChallengesPlayed,
      target: 20,
    },
    { slug: 'hot-streak', unlocked: stats.bestWinStreak >= 5, current: stats.bestWinStreak, target: 5 },
    {
      slug: 'what-are-the-odds',
      unlocked: stats.sameChallengeStreak >= 3,
      current: stats.sameChallengeStreak,
      target: 3,
    },
    { slug: 'deja-vu', unlocked: stats.sameHeroStreak >= 5, current: stats.sameHeroStreak, target: 5 },
    { slug: 'reverse-sweep', unlocked: stats.wonAfterLosingStreak, current: null, target: null },
    { slug: 'worth-it', unlocked: stats.wonWithManyDeaths, current: null, target: null },
    { slug: 'participation-trophy', unlocked: totalLosses >= 10, current: totalLosses, target: 10 },
    { slug: 'skill-issue', unlocked: stats.lostWithMostTeamSouls, current: null, target: null },
    { slug: 'we-take-those', unlocked: stats.wonWithFewestTeamSouls, current: null, target: null },
    {
      slug: 'addiction',
      unlocked: stats.totalChallengesRolled >= 100,
      current: stats.totalChallengesRolled,
      target: 100,
    },
    {
      slug: 'just-one-more',
      unlocked: stats.maxChallengeGamesInOneDay >= 10,
      current: stats.maxChallengeGamesInOneDay,
      target: 10,
    },
    {
      slug: 'master-of-none',
      unlocked: stats.distinctRealHeroesPlayed >= stats.totalHeroCount,
      current: stats.distinctRealHeroesPlayed,
      target: stats.totalHeroCount,
    },
  ]
}

export function computeUnlockedSlugs(stats: AchievementStats): string[] {
  return computeAchievementProgress(stats)
    .filter((p) => p.unlocked)
    .map((p) => p.slug)
}
