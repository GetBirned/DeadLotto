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
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onViewProfile(f.id)}
                  className="flex w-full items-center gap-2 rounded border border-dl-border/60 px-3 py-2 text-left text-sm transition hover:border-dl-mint"
                >
                  <span className={`h-2 w-2 rounded-full ${f.online ? 'bg-dl-mint' : 'bg-dl-text/30'}`} />
                  <span className="h-6 w-6 overflow-hidden rounded-full bg-black/40">
                    {f.profilePictureUrl && <img src={f.profilePictureUrl} alt="" className="h-full w-full object-cover" />}
                  </span>
                  {f.username}
                  <span className="ml-auto text-xs text-dl-text/40">{f.online ? 'Online' : 'Offline'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
