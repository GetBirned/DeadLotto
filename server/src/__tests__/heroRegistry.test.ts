import { describe, it, expect } from 'vitest'
import { rollRandomHero, WHEEL_SLOTS, WILDCARD_SLUG, HEROES } from '@shared/heroRegistry'

describe('rollRandomHero', () => {
  it('picks from the full 39-slot wheel when nothing is excluded', () => {
    for (let i = 0; i < 200; i++) {
      const hero = rollRandomHero([])
      expect(WHEEL_SLOTS.map((h) => h.slug)).toContain(hero.slug)
    }
  })

  it('never returns an excluded hero slug', () => {
    const excluded = [HEROES[0].slug, HEROES[1].slug, HEROES[2].slug]
    for (let i = 0; i < 500; i++) {
      const hero = rollRandomHero(excluded)
      expect(excluded).not.toContain(hero.slug)
    }
  })

  it('keeps the wildcard slot pickable even when every hero is excluded', () => {
    const allHeroSlugs = HEROES.map((h) => h.slug)
    for (let i = 0; i < 50; i++) {
      const hero = rollRandomHero(allHeroSlugs)
      expect(hero.slug).toBe(WILDCARD_SLUG)
    }
  })

  it('keeps the wildcard pickable even if it is explicitly passed in excludeSlugs', () => {
    for (let i = 0; i < 200; i++) {
      const hero = rollRandomHero([WILDCARD_SLUG])
      if (hero.slug === WILDCARD_SLUG) return
    }
    throw new Error('wildcard was never rolled despite being un-bannable')
  })

  it('can eventually roll every remaining hero given enough attempts (no pool bias)', () => {
    const excluded = HEROES.slice(2).map((h) => h.slug)
    const remaining = new Set([HEROES[0].slug, HEROES[1].slug, WILDCARD_SLUG])
    const seen = new Set<string>()
    for (let i = 0; i < 500; i++) {
      seen.add(rollRandomHero(excluded).slug)
    }
    expect(seen).toEqual(remaining)
  })
})
