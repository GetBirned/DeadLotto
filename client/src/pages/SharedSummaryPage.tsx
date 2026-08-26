import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { getHero } from '@shared/heroRegistry'
import { CHALLENGE_BY_NAME } from '@shared/challenges'
import type { SharedGameSummary } from '@shared/types'
import { ChallengeHoverCell } from '../components/ChallengeHoverCell'
import { SoulsStat } from '../components/SoulsStat'

export function SharedSummaryPage() {
  const { shareCode } = useParams<{ shareCode: string }>()
  const [summary, setSummary] = useState<SharedGameSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shareCode) return
    api
      .get<SharedGameSummary>(`/shared-summaries/${shareCode}`)
      .then(setSummary)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Something went wrong.'))
  }, [shareCode])

  if (error) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="mb-4 text-red-400">{error}</p>
        <Link
          to="/"
          className="rounded border border-dl-mint/60 px-4 py-2 font-display text-dl-mint hover:bg-dl-mint hover:text-black"
        >
          Go to DeadLotto
        </Link>
      </div>
    )
  }

  if (!summary) {
    return <div className="text-center text-dl-text/60">Loading...</div>
  }

  const won = summary.outcome === 'win'

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
      <img
        src="/assets/branding/deadLotto_textLogo.png"
        alt="DeadLotto"
        className="w-48 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
      />
      <h2 className={`font-display text-3xl ${won ? 'text-dl-text' : 'text-red-500'}`}>
        {won ? 'Victory' : 'Defeat'}
      </h2>

      <div className="w-full overflow-x-auto rounded-lg border border-dl-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/50 text-dl-text/50">
            <tr>
              <th className="p-2 font-normal">Player</th>
              <th className="p-2 font-normal">Hero</th>
              <th className="p-2 font-normal">Challenge</th>
              <th className="p-2 font-normal">K / D / A</th>
              <th className="p-2 font-normal">Souls</th>
              <th className="p-2 font-normal">Session</th>
            </tr>
          </thead>
          <tbody>
            {summary.players.map((p) => {
              const hero = p.heroSlug ? safeHero(p.heroSlug) : null
              const challengeDefs = p.challengeNames.map((name) => CHALLENGE_BY_NAME[name]).filter(Boolean)
              return (
                <tr key={p.username} className="border-t border-dl-border/50">
                  <td className="flex items-center gap-2 p-2">
                    <span className="h-7 w-7 overflow-hidden rounded-full bg-black/40">
                      {p.profilePictureUrl && <img src={p.profilePictureUrl} alt="" className="h-full w-full object-cover" />}
                    </span>
                    {p.username}
                  </td>
                  <td className="p-2">
                    {hero ? (
                      <span className="flex items-center gap-2">
                        <img src={hero.icon} alt="" className="h-7 w-7 rounded-full border border-dl-border object-cover" />
                        {hero.name}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="max-w-[160px] p-2">
                    <ChallengeHoverCell challenges={challengeDefs} fallbackText={p.challengeNames.join(', ')} />
                  </td>
                  <td className="p-2">
                    {p.kills} / {p.deaths} / {p.assists}
                  </td>
                  <td className="p-2">
                    <SoulsStat souls={p.souls} size="sm" />
                  </td>
                  <td className="p-2 text-dl-text">
                    {p.sessionWins}W - {p.sessionLosses}L
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-dl-text/60">A strat-roulette companion for Deadlock.</p>
        <Link
          to="/"
          className="rounded bg-dl-mint px-6 py-2 font-display tracking-wide text-black transition hover:brightness-110"
        >
          Play DeadLotto
        </Link>
      </div>
    </div>
  )
}

function safeHero(slug: string) {
  try {
    return getHero(slug)
  } catch {
    return null
  }
}
