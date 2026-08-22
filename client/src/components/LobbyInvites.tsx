import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSocket } from '../lib/socket'
import { api } from '../lib/api'
import type { PublicUser, LobbyState } from '@shared/types'

interface Invite {
  id: string
  lobbyId: string
  inviteCode: string
  fromUser: PublicUser
}

export function LobbyInvites() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const socket = getSocket()
    const onInvite = (payload: { lobbyId: string; inviteCode: string; fromUser: PublicUser }) => {
      setInvites((prev) => {
        if (prev.some((i) => i.lobbyId === payload.lobbyId)) return prev
        return [...prev, { id: `${payload.lobbyId}-${Date.now()}`, ...payload }]
      })
      setOpen(true)
    }
    socket.on('lobby:invite-received', onInvite)
    return () => {
      socket.off('lobby:invite-received', onInvite)
    }
  }, [])

  function dismiss(id: string) {
    setInvites((prev) => prev.filter((i) => i.id !== id))
  }

  async function join(invite: Invite) {
    setBusy(true)
    try {
      const lobby = await api.post<LobbyState>('/lobbies/join', { inviteCode: invite.inviteCode })
      dismiss(invite.id)
      setOpen(false)
      navigate(`/lobby/${lobby.id}`)
    } finally {
      setBusy(false)
    }
  }

  if (invites.length === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-dl-mint/70 bg-black/40 text-dl-mint transition hover:bg-dl-mint hover:text-black"
        aria-label="Lobby invites"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <path d="M12 2a6 6 0 0 0-6 6v3.09c0 .48-.17.94-.48 1.31L4 15h16l-1.52-2.6a2 2 0 0 1-.48-1.31V8a6 6 0 0 0-6-6Zm0 20a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Z" />
        </svg>
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
          {invites.length}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded border border-dl-border bg-dl-panel p-2 shadow-xl">
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center gap-2 rounded p-2 hover:bg-black/30">
              <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-black/40">
                {invite.fromUser.profilePictureUrl && (
                  <img src={invite.fromUser.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-display text-dl-text">{invite.fromUser.username}</span>{' '}
                  <span className="text-dl-text/50">invited you</span>
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => join(invite)}
                className="shrink-0 rounded bg-dl-mint px-2 py-1 text-xs text-black hover:brightness-110 disabled:opacity-50"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => dismiss(invite.id)}
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
