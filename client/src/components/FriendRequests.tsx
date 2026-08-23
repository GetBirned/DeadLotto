import { useEffect, useState } from 'react'
import { getSocket } from '../lib/socket'
import { api } from '../lib/api'
import type { PublicUser } from '@shared/types'

interface Request {
  requestId: string
  fromUser: PublicUser
}

// Same bell-icon/dropdown pattern as LobbyInvites, but backed by both a live socket
// push (for someone online right now) and a fetch on mount (friend requests are
// persistent, unlike lobby invites, so one sent while you were offline still needs
// to show up next time you load the app).
export function FriendRequests() {
  const [requests, setRequests] = useState<Request[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get<{ requestId: string; id: string; username: string; profilePictureUrl: string | null }[]>('/friends/requests')
      .then((incoming) => {
        setRequests(
          incoming.map((r) => ({
            requestId: r.requestId,
            fromUser: { id: r.id, username: r.username, profilePictureUrl: r.profilePictureUrl },
          })),
        )
      })
      .catch(() => {})

    const socket = getSocket()
    const onReceived = (payload: Request) => {
      setRequests((prev) => (prev.some((r) => r.requestId === payload.requestId) ? prev : [...prev, payload]))
      setOpen(true)
    }
    socket.on('friend:request-received', onReceived)
    return () => {
      socket.off('friend:request-received', onReceived)
    }
  }, [])

  const visible = requests.filter((r) => !dismissed.has(r.requestId))

  function dismiss(requestId: string) {
    setDismissed((prev) => new Set(prev).add(requestId))
  }

  async function accept(request: Request) {
    setBusy(true)
    try {
      await api.post('/friends/accept', { requestId: request.requestId })
      dismiss(request.requestId)
    } finally {
      setBusy(false)
    }
  }

  if (visible.length === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-dl-mint/70 bg-black/40 text-dl-mint transition hover:bg-dl-mint hover:text-black"
        aria-label="Friend requests"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Zm7-4h4v2h-4v4h-2v-4h-4v-2h4V6h2v4Z" />
        </svg>
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
          {visible.length}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded border border-dl-border bg-dl-panel p-2 shadow-xl">
          {visible.map((request) => (
            <div key={request.requestId} className="flex items-center gap-2 rounded p-2 hover:bg-black/30">
              <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-black/40">
                {request.fromUser.profilePictureUrl && (
                  <img src={request.fromUser.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-display text-dl-text">{request.fromUser.username}</span>{' '}
                  <span className="text-dl-text/50">wants to be friends</span>
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => accept(request)}
                className="shrink-0 rounded bg-dl-mint px-2 py-1 text-xs text-black hover:brightness-110 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => dismiss(request.requestId)}
                className="shrink-0 text-dl-text/40 hover:text-dl-text"
                aria-label="Dismiss"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
