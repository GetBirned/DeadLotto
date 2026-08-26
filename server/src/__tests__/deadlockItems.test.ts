import { describe, it, expect } from 'vitest'
import { DEADLOCK_ITEMS, ITEM_BY_SLUG, rollRandomBuild } from '@shared/deadlockItems'

describe('DEADLOCK_ITEMS data integrity', () => {
  it('has no duplicate slugs', () => {
    const slugs = DEADLOCK_ITEMS.map((i) => i.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('excludes every Legendary item', () => {
    // The known Legendary roster (Street Brawl only) - none of these should appear.
    const legendaryNames = ['Mystical Piano', 'Mystic Conduit', 'Runed Gauntlets', 'Cloak of Opportunity']
    const names = new Set(DEADLOCK_ITEMS.map((i) => i.name))
    for (const name of legendaryNames) expect(names).not.toContain(name)
  })

  it('every conflictsWith entry points at a real item', () => {
    for (const item of DEADLOCK_ITEMS) {
      for (const slug of item.conflictsWith) {
        expect(ITEM_BY_SLUG[slug], `${item.slug} references unknown item ${slug}`).toBeDefined()
      }
    }
  })

  it('conflictsWith is symmetric (if A conflicts with B, B conflicts with A)', () => {
    for (const item of DEADLOCK_ITEMS) {
      for (const slug of item.conflictsWith) {
        expect(ITEM_BY_SLUG[slug].conflictsWith).toContain(item.slug)
      }
    }
  })

  it('captures the Mystic Expansion -> Greater Expansion / Ballistic Enchantment build chain', () => {
    const mysticExpansion = ITEM_BY_SLUG['mystic-expansion']
    expect(mysticExpansion).toBeDefined()
    expect(mysticExpansion.conflictsWith).toContain('greater-expansion')
    expect(mysticExpansion.conflictsWith).toContain('ballistic-enchantment')
  })
})

describe('rollRandomBuild', () => {
  it('returns 12 items with no duplicates', () => {
    for (let i = 0; i < 25; i++) {
      const build = rollRandomBuild(12)
      expect(build).toHaveLength(12)
      expect(new Set(build.map((i) => i.slug)).size).toBe(12)
    }
  })

  it('never includes two items from the same conflict/build family', () => {
    for (let i = 0; i < 50; i++) {
      const build = rollRandomBuild(12)
      const slugs = new Set(build.map((i) => i.slug))
      for (const item of build) {
        for (const conflict of item.conflictsWith) {
          expect(slugs.has(conflict), `${item.name} and its conflict ${conflict} both appeared in one build`).toBe(false)
        }
      }
    }
  })

  it('respects a custom count', () => {
    expect(rollRandomBuild(3)).toHaveLength(3)
    expect(rollRandomBuild(1)).toHaveLength(1)
  })
})
