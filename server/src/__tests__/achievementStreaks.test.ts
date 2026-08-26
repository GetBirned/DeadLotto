import { describe, it, expect } from 'vitest'
import { longestConsecutiveRun, everWonAfterLosingStreak, computeWinStreaks } from '../achievements.js'

describe('longestConsecutiveRun', () => {
  it('returns 0 for an empty list', () => {
    expect(longestConsecutiveRun([], (x: string) => x)).toBe(0)
  })

  it('returns the full length when every item matches', () => {
    expect(longestConsecutiveRun(['a', 'a', 'a'], (x) => x)).toBe(3)
  })

  it('finds a run in the middle, not just at the start or end', () => {
    expect(longestConsecutiveRun(['a', 'b', 'b', 'b', 'c'], (x) => x)).toBe(3)
  })

  it('does not count non-adjacent matches as a run', () => {
    // a, b, a - the two a's are not consecutive, so the longest run is 1
    expect(longestConsecutiveRun(['a', 'b', 'a'], (x) => x)).toBe(1)
  })

  it('picks the longest of several runs, not the last one', () => {
    expect(longestConsecutiveRun(['a', 'a', 'a', 'b', 'b'], (x) => x)).toBe(3)
  })
})

describe('everWonAfterLosingStreak', () => {
  it('is false with no games', () => {
    expect(everWonAfterLosingStreak([], 5)).toBe(false)
  })

  it('is false when the losing streak is one short of the threshold', () => {
    const games = [{ outcome: 'loss' }, { outcome: 'loss' }, { outcome: 'loss' }, { outcome: 'loss' }, { outcome: 'win' }]
    expect(everWonAfterLosingStreak(games, 5)).toBe(false)
  })

  it('is true the moment a win follows exactly the threshold of losses', () => {
    const games = Array(5).fill({ outcome: 'loss' }).concat([{ outcome: 'win' }])
    expect(everWonAfterLosingStreak(games, 5)).toBe(true)
  })

  it('resets the streak count on an intervening win', () => {
    // 4 losses, a win (resets), then only 2 more losses before the next win - should
    // never reach the threshold of 5 consecutive losses.
    const games = [
      { outcome: 'loss' },
      { outcome: 'loss' },
      { outcome: 'loss' },
      { outcome: 'loss' },
      { outcome: 'win' },
      { outcome: 'loss' },
      { outcome: 'loss' },
      { outcome: 'win' },
    ]
    expect(everWonAfterLosingStreak(games, 5)).toBe(false)
  })

  it('still detects the streak even if more losses/wins follow afterward', () => {
    const games = [
      ...Array(5).fill({ outcome: 'loss' }),
      { outcome: 'win' },
      { outcome: 'loss' },
      { outcome: 'win' },
    ]
    expect(everWonAfterLosingStreak(games, 5)).toBe(true)
  })
})

describe('computeWinStreaks', () => {
  it('returns zeros for an empty list', () => {
    expect(computeWinStreaks([])).toEqual({ current: 0, best: 0 })
  })

  it('current equals best when every game is a win', () => {
    const games = Array(4).fill({ outcome: 'win' })
    expect(computeWinStreaks(games)).toEqual({ current: 4, best: 4 })
  })

  it('current resets to 0 on a trailing loss, but best keeps the earlier run', () => {
    const games = [{ outcome: 'win' }, { outcome: 'win' }, { outcome: 'win' }, { outcome: 'loss' }]
    expect(computeWinStreaks(games)).toEqual({ current: 0, best: 3 })
  })

  it('best tracks the longest run even when a later, shorter run is still active', () => {
    const games = [
      { outcome: 'win' },
      { outcome: 'win' },
      { outcome: 'win' },
      { outcome: 'win' },
      { outcome: 'loss' },
      { outcome: 'win' },
    ]
    expect(computeWinStreaks(games)).toEqual({ current: 1, best: 4 })
  })

  it('a loss anywhere in the middle breaks the streak count, not just the last one', () => {
    const games = [{ outcome: 'win' }, { outcome: 'loss' }, { outcome: 'win' }, { outcome: 'win' }]
    expect(computeWinStreaks(games)).toEqual({ current: 2, best: 2 })
  })
})
