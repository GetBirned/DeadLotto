import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { getSocket } from '../../lib/socket'
import { Modal } from '../Modal'
import type { FriendSummary } from '@shared/types'

export function InviteFriendModal({
  lobbyId,
  excludeUserIds,
  onClose,
}: {
  lobbyId: string
  excludeUserIds: string[]
  onClose: () => void
}) {
  const [friends, setFriends] = useState<FriendSummary[]>([])
  const [sentTo, setSentTo] = useState<string[]>([])

  useEffect(() => {
    api
      .get<FriendSummary[]>('/friends')
      .then(setFriends)
      .catch(() => {})
  }, [])

  function invite(friendUserId: string) {
    getSocket().emit('lobby:invite-friend', { lobbyId, friendUserId })
    setSentTo((prev) => [...prev, friendUserId])
  }

  const available = friends.filter((f) => !excludeUserIds.includes(f.id))

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-1 font-display text-2xl">Invite a Friend</h2>
      <p className="mb-4 text-sm text-dl-text/60">Only friends who are currently online can be invited.</p>
      {available.length === 0 ? (
        <p className="text-sm text-dl-text/50">
          {friends.length === 0 ? "You don't have any friends added yet." : 'Everyone on your friends list is already here.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {available.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded border border-dl-border/60 px-3 py-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${f.online ? 'bg-dl-mint' : 'bg-dl-text/30'}`} />
              <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-black/40">
                {f.profilePictureUrl && <img src={f.profilePictureUrl} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="flex-1 truncate text-sm">{f.username}</span>
              <button
                type="button"
                disabled={!f.online || sentTo.includes(f.id)}
                onClick={() => invite(f.id)}
                className="shrink-0 rounded border border-dl-mint/60 px-3 py-1 text-xs text-dl-mint transition hover:bg-dl-mint hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sentTo.includes(f.id) ? 'Sent!' : f.online ? 'Invite' : 'Offline'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
