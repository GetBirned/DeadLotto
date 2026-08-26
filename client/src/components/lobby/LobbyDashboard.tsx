import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSocket } from '../../lib/socket'
import { CHALLENGES } from '@shared/challenges'
import { HEROES } from '@shared/heroRegistry'
import { resolveTitleDisplay } from '@shared/achievements'
import type { LobbyState } from '@shared/types'
import { PlayerAvatar } from './PlayerAvatar'
import { SuggestChallengeForm } from './SuggestChallengeForm'
import { InviteFriendModal } from './InviteFriendModal'
import { ManageChallengesModal } from './ManageChallengesModal'
import { ManageHeroesModal } from './ManageHeroesModal'
import { LobbyChat } from './LobbyChat'
import { ProfilePopup } from '../ProfilePopup'

export function LobbyDashboard({ lobby, isHost }: { lobby: LobbyState; isHost: boolean }) {
  const socket = getSocket()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [manageChallengesOpen, setManageChallengesOpen] = useState(false)
  const [manageHeroesOpen, setManageHeroesOpen] = useState(false)
  const [viewProfileId, setViewProfileId] = useState<string | null>(null)
  const [kickConfirmId, setKickConfirmId] = useState<string | null>(null)
  const [webhookInput, setWebhookInput] = useState(lobby.discordWebhookUrl ?? '')
  const [webhookSaved, setWebhookSaved] = useState(false)

  function kickPlayer(targetUserId: string) {
    socket.emit('lobby:kick-player', { lobbyId: lobby.id, targetUserId })
    setKickConfirmId(null)
  }

  const inviteUrl = `${window.location.origin}/join/${lobby.inviteCode}`

  function copyInvite() {
    navigator.clipboard.writeText(inviteUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function updateSettings(patch: Partial<{ numHeroes: 3 | 4 | 5; numChallenges: 0 | 1 | 2 | 3; rerollsAllowed: 0 | 1 | 2 }>) {
    socket.emit('lobby:update-settings', {
      lobbyId: lobby.id,
      numHeroes: patch.numHeroes ?? lobby.settings.numHeroes,
      numChallenges: patch.numChallenges ?? lobby.settings.numChallenges,
      rerollsAllowed: patch.rerollsAllowed ?? lobby.settings.rerollsAllowed,
    })
  }

  function saveWebhook() {
    socket.emit('lobby:update-discord-webhook', { lobbyId: lobby.id, discordWebhookUrl: webhookInput.trim() || null })
    setWebhookSaved(true)
    setTimeout(() => setWebhookSaved(false), 1500)
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-dl-text/50">Invite Code</p>
        <div className="mt-1 flex items-center justify-center gap-2 sm:gap-3">
          <span className="font-display text-2xl tracking-[0.15em] text-dl-text sm:text-4xl sm:tracking-[0.3em]">
            {lobby.inviteCode}
          </span>
          <button
            type="button"
            onClick={copyInvite}
            className="shrink-0 rounded border border-dl-border px-2.5 py-1.5 text-xs hover:border-dl-mint hover:text-dl-mint sm:px-3"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      <div className="flex w-full flex-col gap-5 md:flex-row md:items-stretch">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
          {lobby.players.map((p) => {
            const canKick = isHost && p.user.id !== lobby.hostUserId
            const confirming = kickConfirmId === p.user.id
            return (
              <div key={p.user.id} className="relative rounded-lg border border-dl-border bg-black/40 p-3">
                {confirming ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <p className="text-xs text-dl-text/80">Kick {p.user.username}?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => kickPlayer(p.user.id)}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:brightness-110"
                      >
                        Kick
                      </button>
                      <button
                        type="button"
                        onClick={() => setKickConfirmId(null)}
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
                      onClick={() => setViewProfileId(p.user.id)}
                      className="flex h-full w-full flex-col items-center justify-center gap-1.5 transition hover:opacity-80"
                    >
                      <PlayerAvatar user={p.user} size={12} />
                      <span className="font-display text-sm">{p.user.username}</span>
                      {(() => {
                        const title = resolveTitleDisplay(p.selectedTitleSlug)
                        return (
                          title && (
                            <span className="text-[10px] uppercase tracking-wide" style={{ color: title.color }}>
                              {title.name}
                            </span>
                          )
                        )
                      })()}
                      {p.user.id === lobby.hostUserId && (
                        <span className="text-[10px] uppercase tracking-wide text-dl-text">Host</span>
                      )}
                    </button>
                    {canKick && (
                      <button
                        type="button"
                        onClick={() => setKickConfirmId(p.user.id)}
                        aria-label={`Kick ${p.user.username}`}
                        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-dl-text/30 transition hover:bg-red-600/20 hover:text-red-400"
                      >
                        &times;
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
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
                options={[0, 1, 2, 3]}
                value={lobby.settings.numChallenges}
                onChange={(v) => updateSettings({ numChallenges: v as 0 | 1 | 2 | 3 })}
              />
              <SettingRow
                label="Rerolls per player"
                options={[0, 1, 2]}
                value={lobby.settings.rerollsAllowed}
                onChange={(v) => updateSettings({ rerollsAllowed: v as 0 | 1 | 2 })}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setManageChallengesOpen(true)}
                  className="rounded border border-dl-border py-2 text-xs text-dl-text/70 transition hover:border-dl-mint hover:text-dl-mint"
                >
                  Manage Challenges ({CHALLENGES.length - lobby.disabledChallengeSlugs.length}/{CHALLENGES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setManageHeroesOpen(true)}
                  className="rounded border border-dl-border py-2 text-xs text-dl-text/70 transition hover:border-dl-mint hover:text-dl-mint"
                >
                  Manage Heroes ({HEROES.length - lobby.disabledHeroSlugs.length}/{HEROES.length})
                </button>
              </div>
              <div>
                <p className="mb-2 text-sm text-dl-text/70">Discord webhook (optional)</p>
                <div className="flex gap-2">
                  <input
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-0 flex-1 rounded border border-dl-border bg-black/40 px-2 py-1.5 text-xs outline-none focus:border-dl-mint"
                  />
                  <button
                    type="button"
                    onClick={saveWebhook}
                    className="shrink-0 rounded border border-dl-mint/60 px-3 py-1.5 text-xs text-dl-mint hover:bg-dl-mint hover:text-black"
                  >
                    {webhookSaved ? 'Saved!' : 'Save'}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-dl-text/40">Results get posted here when a game finishes.</p>
              </div>
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

      <LobbyChat lobbyId={lobby.id} />

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
          onClick={() => {
            socket.emit('lobby:leave', { lobbyId: lobby.id })
            navigate('/')
          }}
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
      {manageChallengesOpen && (
        <ManageChallengesModal
          lobbyId={lobby.id}
          disabledChallengeSlugs={lobby.disabledChallengeSlugs}
          onClose={() => setManageChallengesOpen(false)}
        />
      )}
      {manageHeroesOpen && (
        <ManageHeroesModal
          lobbyId={lobby.id}
          disabledHeroSlugs={lobby.disabledHeroSlugs}
          onClose={() => setManageHeroesOpen(false)}
        />
      )}
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
