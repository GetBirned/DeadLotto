import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { getSocket } from '../lib/socket'
import type { FriendSummary } from '@shared/types'

interface FriendRequest {
  requestId: string
  id: string
  username: string
  profilePictureUrl: string | null
}

export function FriendsPanel({ onViewProfile }: { onViewProfile: (userId: string) => void }) {
  const [friends, setFriends] = useState<FriendSummary[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null)

  async function load() {
    const [f, r] = await Promise.all([
      api.get<FriendSummary[]>('/friends'),
      api.get<FriendRequest[]>('/friends/requests'),
    ])
    setFriends(f)
    setRequests(r)
  }

  useEffect(() => {
    load().catch(() => {})
    const socket = getSocket()
    const onPresence = ({ userId, online }: { userId: string; online: boolean }) => {
      setFriends((prev) => prev.map((f) => (f.id === userId ? { ...f, online } : f)))
    }
    socket.on('presence:update', onPresence)
    return () => {
      socket.off('presence:update', onPresence)
    }
  }, [])

  async function sendRequest() {
    setMessage(null)
    try {
      await api.post('/friends/request', { username })
      setUsername('')
      setMessage('Friend request sent.')
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Something went wrong.')
    }
  }

  async function accept(requestId: string) {
    await api.post('/friends/accept', { requestId })
    load()
  }

  async function remove(friendUserId: string) {
    setRemoveConfirmId(null)
    await api.post('/friends/remove', { friendUserId })
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 font-display text-lg text-dl-text">Add Friend</h3>
        <div className="flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="flex-1 rounded border border-dl-border bg-black/40 px-3 py-2 text-sm outline-none focus:border-dl-mint"
          />
          <button
            type="button"
            onClick={sendRequest}
            className="rounded border border-dl-mint/60 px-3 py-2 text-sm text-dl-mint hover:bg-dl-mint hover:text-black"
          >
            Send Request
          </button>
        </div>
        {message && <p className="mt-1 text-xs text-dl-text/60">{message}</p>}
      </div>

      {requests.length > 0 && (
        <div>
          <h3 className="mb-2 font-display text-lg text-dl-text">Pending Requests</h3>
          <ul className="flex flex-col gap-2">
            {requests.map((r) => (
              <li key={r.requestId} className="flex items-center justify-between rounded border border-dl-border/60 px-3 py-2 text-sm">
                <span>{r.username}</span>
                <button
                  type="button"
                  onClick={() => accept(r.requestId)}
                  className="rounded bg-dl-mint px-2 py-1 text-xs text-black hover:brightness-110"
                >
                  Accept
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 font-display text-lg text-dl-text">Friends ({friends.length})</h3>
        {friends.length === 0 ? (
          <p className="text-sm text-dl-text/50">No friends yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {friends.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-2 rounded border border-dl-border/60 px-3 py-2 text-sm transition hover:border-dl-mint"
              >
                {removeConfirmId === f.id ? (
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-xs text-dl-text/70">Remove {f.username}?</span>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => remove(f.id)}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:brightness-110"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoveConfirmId(null)}
                        className="rounded border border-dl-border px-2 py-1 text-xs text-dl-text/70 hover:text-dl-text"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onViewProfile(f.id)}
                      className="flex flex-1 items-center gap-2 text-left transition hover:opacity-80"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${f.online ? 'bg-dl-mint' : 'bg-dl-text/30'}`} />
                      <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-black/40">
                        {f.profilePictureUrl && <img src={f.profilePictureUrl} alt="" className="h-full w-full object-cover" />}
                      </span>
                      <span className="flex-1 truncate">{f.username}</span>
                      <span className="shrink-0 text-xs text-dl-text/40">{f.online ? 'Online' : 'Offline'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveConfirmId(f.id)}
                      aria-label={`Remove ${f.username}`}
                      className="shrink-0 rounded-full px-1.5 text-dl-text/30 transition hover:text-red-400"
                    >
                      &times;
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
