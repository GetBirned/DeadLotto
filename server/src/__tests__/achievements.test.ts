import { describe, it, expect } from 'vitest'
import { computeUnlockedSlugs, type AchievementStats } from '@shared/achievements'

const baseline: AchievementStats = {
  totalWins: 0,
  totalGames: 0,
  bestSoulsInAGame: 0,
  bestKillsInAGame: 0,
  wonWithZeroDeaths: false,
  distinctHeroesPlayed: 0,
  distinctChallengesPlayed: 0,
  bestWinStreak: 0,
  sameChallengeStreak: 0,
  sameHeroStreak: 0,
  wonAfterLosingStreak: false,
  wonWithManyDeaths: false,
  lostWithMostTeamSouls: false,
  wonWithFewestTeamSouls: false,
  totalChallengesRolled: 0,
  maxChallengeGamesInOneDay: 0,
  playedAllHeroes: false,
}

describe('computeUnlockedSlugs', () => {
  it('unlocks nothing at zero stats', () => {
    expect(computeUnlockedSlugs(baseline)).toEqual([])
  })

  it('unlocks first-win at exactly 1 win, not before', () => {
    expect(computeUnlockedSlugs({ ...baseline, totalWins: 0 })).not.toContain('first-win')
    expect(computeUnlockedSlugs({ ...baseline, totalWins: 1 })).toContain('first-win')
  })

  it('win-count thresholds are independent and cumulative', () => {
    expect(computeUnlockedSlugs({ ...baseline, totalWins: 9 })).toEqual(['first-win'])
    const at10 = computeUnlockedSlugs({ ...baseline, totalWins: 10 })
    expect(at10).toContain('first-win')
    expect(at10).toContain('ten-wins')
    expect(at10).not.toContain('fifty-wins')
    const at50 = computeUnlockedSlugs({ ...baseline, totalWins: 50 })
    expect(at50).toEqual(expect.arrayContaining(['first-win', 'ten-wins', 'fifty-wins']))
  })

  it('games-played thresholds do not require any wins', () => {
    const stats = { ...baseline, totalGames: 25 }
    expect(computeUnlockedSlugs(stats)).toContain('veteran')
    expect(computeUnlockedSlugs(stats)).not.toContain('centurion')
    expect(computeUnlockedSlugs({ ...baseline, totalGames: 100 })).toContain('centurion')
  })

  it('soul-hoarder requires the raised 80,000 threshold, not the old 20,000', () => {
    expect(computeUnlockedSlugs({ ...baseline, bestSoulsInAGame: 20000 })).not.toContain('soul-hoarder')
    expect(computeUnlockedSlugs({ ...baseline, bestSoulsInAGame: 79999 })).not.toContain('soul-hoarder')
    expect(computeUnlockedSlugs({ ...baseline, bestSoulsInAGame: 80000 })).toContain('soul-hoarder')
  })

  it('slayer unlocks at 15+ kills in a single game', () => {
    expect(computeUnlockedSlugs({ ...baseline, bestKillsInAGame: 14 })).not.toContain('slayer')
    expect(computeUnlockedSlugs({ ...baseline, bestKillsInAGame: 15 })).toContain('slayer')
  })

  it('untouchable only depends on the boolean flag, not other stats', () => {
    expect(computeUnlockedSlugs({ ...baseline, wonWithZeroDeaths: true })).toContain('untouchable')
    expect(computeUnlockedSlugs({ ...baseline, totalWins: 100, wonWithZeroDeaths: false })).not.toContain('untouchable')
  })

  it('hero and challenge variety thresholds are independent of each other', () => {
    const heroesOnly = computeUnlockedSlugs({ ...baseline, distinctHeroesPlayed: 15, distinctChallengesPlayed: 5 })
    expect(heroesOnly).toContain('hero-collector')
    expect(heroesOnly).not.toContain('challenge-hoarder')

    const challengesOnly = computeUnlockedSlugs({ ...baseline, distinctHeroesPlayed: 5, distinctChallengesPlayed: 20 })
    expect(challengesOnly).toContain('challenge-hoarder')
    expect(challengesOnly).not.toContain('hero-collector')
  })

  it('hot-streak requires a 5-game win streak, not just 5 total wins', () => {
    expect(computeUnlockedSlugs({ ...baseline, totalWins: 5, bestWinStreak: 4 })).not.toContain('hot-streak')
    expect(computeUnlockedSlugs({ ...baseline, totalWins: 5, bestWinStreak: 5 })).toContain('hot-streak')
  })

  it('what-are-the-odds requires a 3-game streak of the same challenge', () => {
    expect(computeUnlockedSlugs({ ...baseline, sameChallengeStreak: 2 })).not.toContain('what-are-the-odds')
    expect(computeUnlockedSlugs({ ...baseline, sameChallengeStreak: 3 })).toContain('what-are-the-odds')
  })

  it('deja-vu requires a 5-game streak of the same hero', () => {
    expect(computeUnlockedSlugs({ ...baseline, sameHeroStreak: 4 })).not.toContain('deja-vu')
    expect(computeUnlockedSlugs({ ...baseline, sameHeroStreak: 5 })).toContain('deja-vu')
  })

  it('reverse-sweep and worth-it are plain boolean flags', () => {
    expect(computeUnlockedSlugs({ ...baseline, wonAfterLosingStreak: true })).toContain('reverse-sweep')
    expect(computeUnlockedSlugs({ ...baseline, wonWithManyDeaths: true })).toContain('worth-it')
  })

  it('participation-trophy counts losses, not wins or games', () => {
    expect(computeUnlockedSlugs({ ...baseline, totalGames: 15, totalWins: 5 })).toContain('participation-trophy')
    expect(computeUnlockedSlugs({ ...baseline, totalGames: 15, totalWins: 10 })).not.toContain('participation-trophy')
  })

  it('skill-issue and we-take-those are independent team-souls flags', () => {
    const lostBadly = computeUnlockedSlugs({ ...baseline, lostWithMostTeamSouls: true })
    expect(lostBadly).toContain('skill-issue')
    expect(lostBadly).not.toContain('we-take-those')

    const carried = computeUnlockedSlugs({ ...baseline, wonWithFewestTeamSouls: true })
    expect(carried).toContain('we-take-those')
    expect(carried).not.toContain('skill-issue')
  })

  it('addiction requires 100 lifetime challenge rolls', () => {
    expect(computeUnlockedSlugs({ ...baseline, totalChallengesRolled: 99 })).not.toContain('addiction')
    expect(computeUnlockedSlugs({ ...baseline, totalChallengesRolled: 100 })).toContain('addiction')
  })

  it('just-one-more requires 10 challenge games in a single day, not spread out', () => {
    expect(computeUnlockedSlugs({ ...baseline, maxChallengeGamesInOneDay: 9 })).not.toContain('just-one-more')
    expect(computeUnlockedSlugs({ ...baseline, maxChallengeGamesInOneDay: 10 })).toContain('just-one-more')
  })

  it('master-of-none is a plain boolean flag', () => {
    expect(computeUnlockedSlugs({ ...baseline, playedAllHeroes: true })).toContain('master-of-none')
    expect(computeUnlockedSlugs({ ...baseline, distinctHeroesPlayed: 37, playedAllHeroes: false })).not.toContain(
      'master-of-none',
    )
  })

  it('unlocks every achievement at once for a maxed-out stat line', () => {
    const maxed: AchievementStats = {
      totalWins: 50,
      totalGames: 100,
      bestSoulsInAGame: 80000,
      bestKillsInAGame: 15,
      wonWithZeroDeaths: true,
      distinctHeroesPlayed: 15,
      distinctChallengesPlayed: 20,
      bestWinStreak: 5,
      sameChallengeStreak: 3,
      sameHeroStreak: 5,
      wonAfterLosingStreak: true,
      wonWithManyDeaths: true,
      lostWithMostTeamSouls: true,
      wonWithFewestTeamSouls: true,
      totalChallengesRolled: 100,
      maxChallengeGamesInOneDay: 10,
      playedAllHeroes: true,
    }
    const unlocked = computeUnlockedSlugs(maxed)
    expect(unlocked).toHaveLength(21)
  })
})
