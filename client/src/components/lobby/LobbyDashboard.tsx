import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSocket } from '../../lib/socket'
import type { LobbyState } from '@shared/types'
import { PlayerAvatar } from './PlayerAvatar'
import { SuggestChallengeForm } from './SuggestChallengeForm'
import { InviteFriendModal } from './InviteFriendModal'
import { ProfilePopup } from '../ProfilePopup'

export function LobbyDashboard({ lobby, isHost }: { lobby: LobbyState; isHost: boolean }) {
  const socket = getSocket()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [viewProfileId, setViewProfileId] = useState<string | null>(null)

  const inviteUrl = `${window.location.origin}/join/${lobby.inviteCode}`

  function copyInvite() {
    navigator.clipboard.writeText(inviteUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function updateSettings(patch: Partial<{ numHeroes: 3 | 4 | 5; numChallenges: 1 | 2 | 3 }>) {
    socket.emit('lobby:update-settings', {
      lobbyId: lobby.id,
      numHeroes: patch.numHeroes ?? lobby.settings.numHeroes,
      numChallenges: patch.numChallenges ?? lobby.settings.numChallenges,
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-dl-text/50">Invite Code</p>
        <div className="mt-1 flex items-center justify-center gap-3">
          <span className="font-display text-4xl tracking-[0.3em] text-dl-text">{lobby.inviteCode}</span>
          <button
            type="button"
            onClick={copyInvite}
            className="rounded border border-dl-border px-3 py-1.5 text-xs hover:border-dl-mint hover:text-dl-mint"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      <div className="flex w-full flex-col gap-5 md:flex-row md:items-stretch">
        <div className="grid flex-1 grid-cols-3 gap-3">
          {lobby.players.map((p) => (
            <button
              key={p.user.id}
              type="button"
              onClick={() => setViewProfileId(p.user.id)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dl-border bg-black/40 p-3 transition hover:border-dl-mint"
            >
              <PlayerAvatar user={p.user} size={12} />
              <span className="font-display text-sm">{p.user.username}</span>
              {p.user.id === lobby.hostUserId && <span className="text-[10px] uppercase tracking-wide text-dl-text">Host</span>}
            </button>
          ))}
          {Array.from({ length: Math.max(0, 6 - lobby.players.length) }).map((_, i) => (
            <button
              key={`empty-${i}`}
              type="button"
              onClick={() => setInviteOpen(true)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-dl-border/60 p-3 text-dl-text/30 transition hover:border-dl-mint hover:text-dl-mint"
            >
              <span className="text-xl">+</span>
              <span className="text-[11px]">Invite Friend</span>
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col justify-center">
          {isHost ? (
            <div className="flex flex-col gap-4 rounded-lg border border-dl-border bg-black/40 p-5">
              <SettingRow
                label="Number of randomized heroes"
                options={[3, 4, 5]}
                value={lobby.settings.numHeroes}
                onChange={(v) => updateSettings({ numHeroes: v as 3 | 4 | 5 })}
              />
              <SettingRow
                label="How many challenges?"
                options={[1, 2, 3]}
                value={lobby.settings.numChallenges}
                onChange={(v) => updateSettings({ numChallenges: v as 1 | 2 | 3 })}
              />
              <button
                type="button"
                onClick={() => socket.emit('lobby:start-rolling', { lobbyId: lobby.id })}
                className="rounded bg-dl-mint py-3 font-display text-lg tracking-wide text-black transition hover:brightness-110"
              >
                Start Rolling
              </button>
            </div>
          ) : (
            <p className="text-center text-dl-text/60 md:text-left">Waiting for the host to start the game...</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setSuggestOpen(true)}
          className="text-xs text-dl-text/40 underline decoration-dotted hover:text-dl-mint"
        >
          Suggest a challenge
        </button>
        <span className="text-dl-text/20">|</span>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-xs text-dl-text/40 underline decoration-dotted hover:text-red-400"
        >
          Leave Lobby
        </button>
      </div>

      {suggestOpen && <SuggestChallengeForm onClose={() => setSuggestOpen(false)} />}
      {inviteOpen && (
        <InviteFriendModal
          lobbyId={lobby.id}
          excludeUserIds={lobby.players.map((p) => p.user.id)}
          onClose={() => setInviteOpen(false)}
        />
      )}
      {viewProfileId && <ProfilePopup userId={viewProfileId} onClose={() => setViewProfileId(null)} />}
    </div>
  )
}

function SettingRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: number[]
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm text-dl-text/70">{label}</p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex-1 rounded border py-2 font-display transition ${
              value === opt
                ? 'border-dl-mint bg-dl-mint text-black'
                : 'border-dl-border text-dl-text/70 hover:border-dl-mint hover:text-dl-mint'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
