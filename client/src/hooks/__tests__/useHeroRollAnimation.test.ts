import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHeroRollAnimation, SPIN_MS } from '../useHeroRollAnimation'
import { WHEEL_SLOTS } from '@shared/heroRegistry'
import type { LobbyPlayerState } from '@shared/types'

function makePlayer(rolledHeroes: string[]): LobbyPlayerState {
  return {
    user: { id: 'u1', username: 'tester', profilePictureUrl: null },
    selectedTitleSlug: null,
    rolledHeroes,
    lockedHeroSlug: null,
    rolledChallenges: [],
    randomBuildItemSlugs: [],
    rerollsUsed: 0,
    rerollsConfirmed: false,
    souls: null,
    kills: null,
    deaths: null,
    assists: null,
    sessionWins: 0,
    sessionLosses: 0,
    ready: false,
  }
}

const [heroA, heroB, heroC] = WHEEL_SLOTS

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useHeroRollAnimation', () => {
  it('starts idle with revealedCount matching the initial rolled list', () => {
    const { result } = renderHook(({ me }) => useHeroRollAnimation(me), {
      initialProps: { me: makePlayer([]) },
    })
    expect(result.current.rolling).toBe(false)
    expect(result.current.revealedCount).toBe(0)
  })

  it('spins and reveals on a normal roll (length 0 -> 1)', () => {
    const { result, rerender } = renderHook(({ me }) => useHeroRollAnimation(me), {
      initialProps: { me: makePlayer([]) },
    })

    rerender({ me: makePlayer([heroA.slug]) })
    expect(result.current.rolling).toBe(true)
    expect(result.current.revealedCount).toBe(0)

    act(() => vi.advanceTimersByTime(SPIN_MS))
    expect(result.current.rolling).toBe(false)
    expect(result.current.revealedCount).toBe(1)
  })

  it('spins again on a reroll that replaces the last slot without changing array length', () => {
    const { result, rerender } = renderHook(({ me }) => useHeroRollAnimation(me), {
      initialProps: { me: makePlayer([heroA.slug]) },
    })
    // Settle the initial mount state (hook treats first mount's non-empty list as already-revealed).
    expect(result.current.revealedCount).toBe(1)

    rerender({ me: makePlayer([heroB.slug]) })
    expect(result.current.rolling).toBe(true)

    act(() => vi.advanceTimersByTime(SPIN_MS))
    expect(result.current.rolling).toBe(false)
    expect(result.current.revealedCount).toBe(1)
  })

  it('keeps spinning correctly across a normal roll followed immediately by another roll', () => {
    const { result, rerender } = renderHook(({ me }) => useHeroRollAnimation(me), {
      initialProps: { me: makePlayer([heroA.slug]) },
    })
    expect(result.current.revealedCount).toBe(1)

    rerender({ me: makePlayer([heroA.slug, heroB.slug]) })
    expect(result.current.rolling).toBe(true)
    expect(result.current.revealedCount).toBe(1)

    act(() => vi.advanceTimersByTime(SPIN_MS))
    expect(result.current.rolling).toBe(false)
    expect(result.current.revealedCount).toBe(2)
  })

  it('spins on a reroll of a non-last slot, leaving the other slots untouched', () => {
    const { result, rerender } = renderHook(({ me }) => useHeroRollAnimation(me), {
      initialProps: { me: makePlayer([heroA.slug, heroB.slug, heroC.slug]) },
    })
    expect(result.current.revealedCount).toBe(3)

    // Reroll the first slot (index 0) while the other two stay put - this is the
    // "choose which hero to reroll" flow, not just the last-rolled one.
    rerender({ me: makePlayer([heroB.slug, heroB.slug, heroC.slug]) })
    expect(result.current.rolling).toBe(true)

    act(() => vi.advanceTimersByTime(SPIN_MS))
    expect(result.current.rolling).toBe(false)
    expect(result.current.revealedCount).toBe(3)
  })

  it('resets immediately (no spin) when Play Again clears rolledHeroes back to empty', () => {
    const { result, rerender } = renderHook(({ me }) => useHeroRollAnimation(me), {
      initialProps: { me: makePlayer([heroA.slug, heroB.slug]) },
    })
    expect(result.current.revealedCount).toBe(2)

    rerender({ me: makePlayer([]) })
    expect(result.current.rolling).toBe(false)
    expect(result.current.revealedCount).toBe(0)
  })
})
