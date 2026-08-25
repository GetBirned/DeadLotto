import { describe, it, expect } from 'vitest'
import { rollRandomChallenges, CHALLENGES } from '@shared/challenges'

describe('rollRandomChallenges', () => {
  it('returns the requested count with no duplicates', () => {
    for (let i = 0; i < 100; i++) {
      const rolled = rollRandomChallenges(3)
      expect(rolled).toHaveLength(3)
      expect(new Set(rolled.map((c) => c.slug)).size).toBe(3)
    }
  })

  it('never returns an excluded challenge', () => {
    const excluded = [CHALLENGES[0].slug, CHALLENGES[1].slug]
    for (let i = 0; i < 100; i++) {
      const rolled = rollRandomChallenges(5, excluded)
      for (const c of rolled) {
        expect(excluded).not.toContain(c.slug)
      }
    }
  })

  it('caps out at the remaining pool size instead of erroring when count exceeds it', () => {
    const excluded = CHALLENGES.slice(2).map((c) => c.slug)
    const rolled = rollRandomChallenges(10, excluded)
    expect(rolled).toHaveLength(2)
  })

  it('returns an empty array when count is 0', () => {
    expect(rollRandomChallenges(0)).toEqual([])
  })
})
