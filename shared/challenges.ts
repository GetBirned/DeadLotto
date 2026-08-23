export interface ChallengeDefinition {
  slug: string
  name: string
  description: string
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const RAW_CHALLENGES: [string, string][] = [
  ['Refreshingly Broke', 'You must buy Refresher as your first item.'],
  ['Whole New World', 'You must buy Magic Carpet as your first item.'],
  ['Participation Trophy', 'You must buy Trophy Collector as your first item.'],
  ['Catch These Hands', 'You have to melee an enemy before using any other source of damage.'],
  ['Tax Collector', 'Take 4 enemy farms/sinners before any of your own.'],
  ['Potato Mode', 'Must play on lowest game settings.'],
  ['Spirit Airlines', 'You can only buy Spirit items.'],
  ['Built Different', 'You can only buy Vitality items.'],
  ['All Gas No Defense', 'You can only buy Weapon items.'],
  ['Urn Boy', 'Whenever Urn spawns, you must stop everything to deliver it.'],
  ['Revenge Kill', 'Whoever kills you becomes your next required target.'],
  ['Random Build', 'Deadlotto chooses every item you buy. (12 Random Items, no duplicates).'],
  ['Death Tax', 'Every time you die, you must sell one item.'],
  ['Berserker', "Once you're below 25% HP, you cannot retreat."],
  ['Coward', "Once you're below 50% HP, you must disengage."],
  ['One Trick Pony', 'Pick one ability. You cannot upgrade any other ability until it is maxed. You must follow this pattern for all abilities.'],
  ['Silent Treatment', 'You cannot use one randomly selected ability for the entire game.'],
  ['Empty the Clip', 'You cannot reload until your magazine is completely empty.'],
  ['Leg Day', 'No zipline usage for the first 10 minutes.'],
  ['Lane Locked', 'You must stay on your starting lane for the entire game.'],
  ['No Ult November', 'No ultimate until 15 minutes.'],
  ['No Loyalty', 'You have to leave your starting lane and gank at the beginning of the game.'],
  ['Compound Interest', 'You must buy Golden Goose Egg as your first item.'],
  ['Minimalist', 'You may only have 6 items in your inventory at once.'],
  ['Rejuvinator', 'You must immediately rush to midboss at the start of the game. Try and convince your team to come.'],
  ['No Trespassing', 'You cannot take any friendly jungle camps.'],
  ['Active Duty', 'You must rush to fill all 4 of your active slots. Once completed, you can buy regular items. Must have 4 activities always!'],
  ['By The Book', "You must buy your hero's default recommended build, in order, left to right."],
]

export const CHALLENGES: ChallengeDefinition[] = RAW_CHALLENGES.map(([name, description]) => ({
  slug: slugify(name),
  name,
  description,
}))

export const CHALLENGE_BY_SLUG: Record<string, ChallengeDefinition> = Object.fromEntries(
  CHALLENGES.map((c) => [c.slug, c]),
)

// Historical game-history rows only ever stored the human-readable name (joined by ", "
// for multi-challenge games), not the slug - this lets the UI resolve a description for
// that old data too, not just live lobby state which already carries slugs.
export const CHALLENGE_BY_NAME: Record<string, ChallengeDefinition> = Object.fromEntries(
  CHALLENGES.map((c) => [c.name, c]),
)

export function rollRandomChallenges(count: number, excludeSlugs: string[] = []): ChallengeDefinition[] {
  const pool = CHALLENGES.filter((c) => !excludeSlugs.includes(c.slug))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
