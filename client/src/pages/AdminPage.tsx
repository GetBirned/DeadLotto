import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import type { AdminChallengeSuggestion, AdminUserSummary, AdminErrorLogEntry } from '@shared/types'

type Tab = 'suggestions' | 'users' | 'errors'

export function AdminPage() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('suggestions')

  if (loading) return null
  if (!user?.isAdmin) {
    return <div className="mx-auto max-w-md text-center text-dl-text/70">You don't have access to this page.</div>
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <h2 className="font-display text-3xl text-dl-text">Admin</h2>

      <div className="flex gap-2">
        {(['suggestions', 'users', 'errors'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded px-4 py-1.5 font-display text-sm capitalize tracking-wide transition ${
              tab === t ? 'bg-dl-mint text-black' : 'border border-dl-border text-dl-text/70 hover:border-dl-mint'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'suggestions' && <SuggestionsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'errors' && <ErrorsTab />}
    </div>
  )
}

function SuggestionsTab() {
  const [suggestions, setSuggestions] = useState<AdminChallengeSuggestion[] | null>(null)

  function load() {
    api.get<AdminChallengeSuggestion[]>('/admin/suggestions').then(setSuggestions)
  }

  useEffect(load, [])

  async function setStatus(id: string, status: 'approved' | 'rejected' | 'pending') {
    await api.post(`/admin/suggestions/${id}/status`, { status })
    load()
  }

  if (!suggestions) return <p className="text-dl-text/50">Loading...</p>
  if (suggestions.length === 0) return <p className="text-dl-text/50">No suggestions yet.</p>

  return (
    <div className="flex flex-col gap-2">
      {suggestions.map((s) => (
        <div key={s.id} className="rounded-lg border border-dl-border bg-black/30 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-dl-text">{s.challengeName}</p>
              <p className="text-sm text-dl-text/70">{s.details}</p>
              <p className="mt-1 text-xs text-dl-text/40">
                {s.suggestedBy.username} - {new Date(s.createdAt).toLocaleString()}
              </p>
            </div>
            <span
              className={`shrink-0 rounded px-2 py-1 text-xs capitalize ${
                s.status === 'approved'
                  ? 'bg-dl-mint/20 text-dl-mint'
                  : s.status === 'rejected'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-dl-border/40 text-dl-text/60'
              }`}
            >
              {s.status}
            </span>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setStatus(s.id, 'approved')}
              className="rounded border border-dl-mint/60 px-3 py-1 text-xs text-dl-mint hover:bg-dl-mint hover:text-black"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setStatus(s.id, 'rejected')}
              className="rounded border border-dl-border px-3 py-1 text-xs text-dl-text/70 hover:border-red-500 hover:text-red-400"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
      <p className="mt-2 text-xs text-dl-text/40">
        Approving a suggestion is bookkeeping only - it doesn't automatically add it to the live roll pool yet. Fold
        good ones into shared/challenges.ts by hand.
      </p>
    </div>
  )
}

function UsersTab() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AdminUserSummary[] | null>(null)

  function load() {
    api.get<AdminUserSummary[]>('/admin/users').then(setUsers)
  }

  useEffect(load, [])

  async function setAdmin(username: string, isAdmin: boolean) {
    await api.post(`/admin/users/${username}/set-admin`, { isAdmin })
    load()
  }

  if (!users) return <p className="text-dl-text/50">Loading...</p>

  return (
    <div className="overflow-x-auto rounded-lg border border-dl-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-black/50 text-dl-text/50">
          <tr>
            <th className="p-2 font-normal">User</th>
            <th className="p-2 font-normal">W/L</th>
            <th className="p-2 font-normal">Joined</th>
            <th className="p-2 font-normal">Admin</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-dl-border/50">
              <td className="p-2 text-dl-text">{u.username}</td>
              <td className="p-2 text-dl-text/70">
                {u.allTimeWins}W - {u.allTimeLosses}L
              </td>
              <td className="p-2 text-dl-text/50">{new Date(u.createdAt).toLocaleDateString()}</td>
              <td className="p-2">
                <button
                  type="button"
                  disabled={u.username === me?.username}
                  onClick={() => setAdmin(u.username, !u.isAdmin)}
                  className={`rounded px-3 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    u.isAdmin
                      ? 'bg-dl-mint/20 text-dl-mint hover:bg-red-500/20 hover:text-red-400'
                      : 'border border-dl-border text-dl-text/70 hover:border-dl-mint hover:text-dl-mint'
                  }`}
                >
                  {u.isAdmin ? 'Remove admin' : 'Make admin'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ErrorsTab() {
  const [errors, setErrors] = useState<AdminErrorLogEntry[] | null>(null)

  useEffect(() => {
    api.get<AdminErrorLogEntry[]>('/admin/errors').then(setErrors)
  }, [])

  if (!errors) return <p className="text-dl-text/50">Loading...</p>
  if (errors.length === 0) return <p className="text-dl-text/50">No errors logged since the server last restarted.</p>

  return (
    <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
      {errors.map((e) => (
        <div key={e.id} className="rounded border border-dl-border/60 bg-black/30 p-2 font-mono text-xs">
          <p className="text-dl-text/40">{new Date(e.occurredAt).toLocaleString()}</p>
          <p className="whitespace-pre-wrap text-red-400">{e.message}</p>
        </div>
      ))}
    </div>
  )
}
