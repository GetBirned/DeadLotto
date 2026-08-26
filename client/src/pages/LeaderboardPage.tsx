import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { LeaderboardEntry, LeaderboardHighlights, RollMode } from '@shared/types'

type SortKey = 'wins' | 'losses' | 'winRate' | 'bestWinStreak'
type Scope = 'global' | 'friends'
type Mode = RollMode | 'all'

const MODE_LABELS: Record<Mode, string> = { all: 'All', standard: 'Standard', draft: 'Draft' }

export function LeaderboardPage() {
  const { user } = useAuth()
  const [highlights, setHighlights] = useState<LeaderboardHighlights | null>(null)
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [scope, setScope] = useState<Scope>('global')
  const [mode, setMode] = useState<Mode>('all')
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('wins')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    api.get<LeaderboardHighlights>('/leaderboard/highlights').then(setHighlights)
  }, [])

  useEffect(() => {
    setError(null)
    setEntries(null)
    api
      .get<LeaderboardEntry[]>(`/leaderboard?scope=${scope}&mode=${mode}`)
      .then(setEntries)
      .catch(() => setError(scope === 'friends' ? 'Log in to see your friends leaderboard.' : 'Failed to load leaderboard.'))
  }, [scope, mode])

  const sorted = useMemo(() => {
    if (!entries) return []
    const rows = [...entries].sort((a, b) => (a[sortKey] - b[sortKey]) * (sortDir === 'asc' ? 1 : -1))
    return rows
  }, [entries, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8">
      <h2 className="font-display text-3xl text-dl-text">Leaderboard</h2>

      <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-5">
        <HighlightCard title="Highest Win Rate Challenge">
          {highlights?.highestWinRateChallenge ? (
            <>
              <p className="truncate font-display text-dl-text">{highlights.highestWinRateChallenge.challengeName}</p>
              <p className="text-dl-mint">{Math.round(highlights.highestWinRateChallenge.winRate * 100)}% win rate</p>
              <p className="text-xs text-dl-text/40">{highlights.highestWinRateChallenge.plays} plays</p>
            </>
          ) : (
            <EmptyStat />
          )}
        </HighlightCard>

        <HighlightCard title="Lowest Win Rate Challenge">
          {highlights?.lowestWinRateChallenge ? (
            <>
              <p className="truncate font-display text-dl-text">{highlights.lowestWinRateChallenge.challengeName}</p>
              <p className="text-red-400">{Math.round(highlights.lowestWinRateChallenge.winRate * 100)}% win rate</p>
              <p className="text-xs text-dl-text/40">{highlights.lowestWinRateChallenge.plays} plays</p>
            </>
          ) : (
            <EmptyStat />
          )}
        </HighlightCard>

        <HighlightCard title="Most Souls (Single Game)">
          {highlights?.topSouls ? (
            <PlayerStatRow user={highlights.topSouls} value={highlights.topSouls.value.toLocaleString()} />
          ) : (
            <EmptyStat />
          )}
        </HighlightCard>

        <HighlightCard title="Most Kills (Single Game)">
          {highlights?.topKills ? (
            <PlayerStatRow user={highlights.topKills} value={highlights.topKills.value.toLocaleString()} />
          ) : (
            <EmptyStat />
          )}
        </HighlightCard>

        <HighlightCard title="Most Assists (Single Game)">
          {highlights?.topAssists ? (
            <PlayerStatRow user={highlights.topAssists} value={highlights.topAssists.value.toLocaleString()} />
          ) : (
            <EmptyStat />
          )}
        </HighlightCard>
      </div>

      <div className="w-full">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScope('global')}
              className={`rounded px-4 py-1.5 font-display text-sm tracking-wide transition ${
                scope === 'global' ? 'bg-dl-mint text-black' : 'border border-dl-border text-dl-text/70 hover:border-dl-mint'
              }`}
            >
              Global
            </button>
            <button
              type="button"
              onClick={() => setScope('friends')}
              disabled={!user}
              title={user ? undefined : 'Log in to see your friends leaderboard'}
              className={`rounded px-4 py-1.5 font-display text-sm tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40 ${
                scope === 'friends' ? 'bg-dl-mint text-black' : 'border border-dl-border text-dl-text/70 hover:border-dl-mint'
              }`}
            >
              Friends
            </button>
          </div>

          <div className="flex gap-2">
            {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded px-3 py-1.5 font-display text-xs tracking-wide transition ${
                  mode === m ? 'bg-dl-mint text-black' : 'border border-dl-border text-dl-text/70 hover:border-dl-mint'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="p-4 text-center text-sm text-dl-text/50">{error}</p>}

        {!error && (
          <div className="w-full overflow-x-auto rounded-lg border border-dl-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/50 text-dl-text/50">
                <tr>
                  <th className="p-2 font-normal">#</th>
                  <th className="p-2 font-normal">Player</th>
                  <th className="p-2 font-normal">Most Played</th>
                  <SortableHeader label="Wins" sortKey="wins" active={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortableHeader label="Losses" sortKey="losses" active={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortableHeader label="Win Rate" sortKey="winRate" active={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortableHeader label="Best Streak" sortKey="bestWinStreak" active={sortKey} dir={sortDir} onClick={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry, i) => (
                  <tr key={entry.id} className="border-t border-dl-border/50">
                    <td className="p-2 text-dl-text/40">{i + 1}</td>
                    <td className="flex items-center gap-2 p-2">
                      <span className="h-7 w-7 overflow-hidden rounded-full bg-dl-panel">
                        {entry.profilePictureUrl ? (
                          <img src={entry.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center font-display text-xs">
                            {entry.username[0]?.toUpperCase()}
                          </span>
                        )}
                      </span>
                      {entry.username}
                    </td>
                    <td className="p-2">
                      {entry.mostPlayedHero ? (
                        <span className="flex items-center gap-2 text-dl-text/80">
                          <img
                            src={entry.mostPlayedHero.heroIcon}
                            alt={entry.mostPlayedHero.heroName}
                            className="h-6 w-6 rounded-full border border-dl-border object-cover"
                          />
                          <span className="hidden sm:inline">{entry.mostPlayedHero.heroName}</span>
                        </span>
                      ) : (
                        <span className="text-dl-text/30">-</span>
                      )}
                    </td>
                    <td className="p-2 text-dl-text">{entry.wins}</td>
                    <td className="p-2 text-dl-text">{entry.losses}</td>
                    <td className="p-2 text-dl-mint">{Math.round(entry.winRate * 100)}%</td>
                    <td className="p-2 text-dl-text">
                      {entry.bestWinStreak}
                      {entry.currentWinStreak >= 2 && <span className="ml-1 text-dl-mint">🔥 {entry.currentWinStreak}</span>}
                    </td>
                  </tr>
                ))}
                {entries && entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-dl-text/50">
                      {scope === 'friends'
                        ? "You haven't got any friends on the board yet."
                        : mode === 'all'
                          ? 'No games played yet.'
                          : `No ${MODE_LABELS[mode]} mode games played yet.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Link to="/" className="text-sm text-dl-text/50 hover:text-dl-mint">
        Back to DeadLotto
      </Link>
    </div>
  )
}

function HighlightCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-dl-border bg-black/30 p-4">
      <p className="text-xs uppercase tracking-wide text-dl-text/40">{title}</p>
      {children}
    </div>
  )
}

function PlayerStatRow({ user, value }: { user: { username: string; profilePictureUrl: string | null }; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-8 w-8 overflow-hidden rounded-full bg-dl-panel">
        {user.profilePictureUrl ? (
          <img src={user.profilePictureUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display text-xs">
            {user.username[0]?.toUpperCase()}
          </span>
        )}
      </span>
      <div>
        <p className="font-display text-dl-mint">{value}</p>
        <p className="truncate text-xs text-dl-text/50">{user.username}</p>
      </div>
    </div>
  )
}

function EmptyStat() {
  return <p className="text-sm text-dl-text/40">Not enough data yet.</p>
}

function SortableHeader({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: string
  sortKey: SortKey
  active: SortKey
  dir: 'asc' | 'desc'
  onClick: (key: SortKey) => void
}) {
  const isActive = active === sortKey
  return (
    <th className="p-2 font-normal">
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`flex items-center gap-1 transition hover:text-dl-mint ${isActive ? 'text-dl-mint' : ''}`}
      >
        {label}
        {isActive && <span>{dir === 'desc' ? '↓' : '↑'}</span>}
      </button>
    </th>
  )
}
