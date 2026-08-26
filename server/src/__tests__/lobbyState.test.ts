import { describe, it, expect } from 'vitest'
import { computeCurrentDraftPicker } from '../sockets/lobbyState.js'

function player(userId: string, rolledHeroes: string[]) {
  return { userId, rolledHeroesJson: JSON.stringify(rolledHeroes) }
}

describe('computeCurrentDraftPicker', () => {
  it('picks the first player in draftOrder when nobody has picked yet', () => {
    const players = [player('a', []), player('b', [])]
    expect(computeCurrentDraftPicker(players, ['b', 'a'], 3)).toBe('b')
  })

  it('cycles round-robin as picks come in', () => {
    const players = [player('a', ['abrams']), player('b', [])]
    expect(computeCurrentDraftPicker(players, ['a', 'b'], 3)).toBe('b')
  })

  it('returns null once every player has hit the target', () => {
    const players = [player('a', ['abrams', 'apollo']), player('b', ['bebop', 'billy'])]
    expect(computeCurrentDraftPicker(players, ['a', 'b'], 2)).toBe(null)
  })

  it('returns null when draftOrder is empty', () => {
    expect(computeCurrentDraftPicker([], [], 3)).toBe(null)
  })

  it('skips a player who left mid-draft by filtering draftOrder down to present players', () => {
    // draftOrder was shuffled with 3 players, but one has since left the lobby - the
    // cycle should never land on them again.
    const players = [player('a', []), player('c', [])]
    expect(computeCurrentDraftPicker(players, ['b', 'a', 'c'], 2)).toBe('a')
  })

  it('advances through a full multi-round cycle in order', () => {
    const draftOrder = ['a', 'b', 'c']
    // Round 1: a, b, c all pick once.
    expect(computeCurrentDraftPicker([player('a', []), player('b', []), player('c', [])], draftOrder, 2)).toBe('a')
    expect(computeCurrentDraftPicker([player('a', ['x']), player('b', []), player('c', [])], draftOrder, 2)).toBe('b')
    expect(computeCurrentDraftPicker([player('a', ['x']), player('b', ['y']), player('c', [])], draftOrder, 2)).toBe('c')
    // Round 2 wraps back to a.
    expect(computeCurrentDraftPicker([player('a', ['x']), player('b', ['y']), player('c', ['z'])], draftOrder, 2)).toBe('a')
  })
})
