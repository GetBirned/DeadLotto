import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Modal } from './Modal'
import { FriendsPanel } from './FriendsPanel'
import { getHero } from '@shared/heroRegistry'
import { CHALLENGE_BY_NAME } from '@shared/challenges'
import type { UserProfile } from '@shared/types'
import { SoulsStat } from './SoulsStat'
import { ChallengeHoverCell } from './ChallengeHoverCell'

export function ProfilePopup({ userId, onClose }: { userId?: string; onClose: () => void }) {
  const { user, setUser } = useAuth()
  const [activeUserId, setActiveUserId] = useState<string | undefined>(userId)
  const viewingSelf = !activeUserId || activeUserId === user?.id
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tab, setTab] = useState<'profile' | 'friends'>('profile')

  async function load() {
    const path = viewingSelf ? '/users/me/profile' : `/users/${activeUserId}/profile`
    const data = await api.get<UserProfile>(path)
    setProfile(data)
  }

  useEffect(() => {
    load().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId])

  return (
    <Modal onClose={onClose} wide>
      {!profile ? (
        <p className="py-10 text-center text-dl-text/60">Loading...</p>
      ) : (
        <div>
          {!viewingSelf && (
            <button
              type="button"
              onClick={() => setActiveUserId(undefined)}
              className="mb-3 text-xs text-dl-text/50 hover:text-dl-mint"
            >
              &larr; Back to my profile
            </button>
          )}
          <div className="mb-5 flex items-center gap-4">
            <AvatarUploader
              profile={profile}
              editable={viewingSelf}
              onUploaded={(url) => {
                setProfile((p) => (p ? { ...p, profilePictureUrl: url } : p))
                if (viewingSelf && user) setUser({ ...user, profilePictureUrl: url })
              }}
            />
            <div>
              <h2 className="font-display text-2xl">{profile.username}</h2>
              <p className="text-sm text-dl-text">
                {profile.allTimeWins}W - {profile.allTimeLosses}L all time
              </p>
            </div>
          </div>

          {viewingSelf && (
            <div className="mb-5 flex gap-2 border-b border-dl-border">
              <TabButton active={tab === 'profile'} onClick={() => setTab('profile')}>
                Profile
              </TabButton>
              <TabButton active={tab === 'friends'} onClick={() => setTab('friends')}>
                Friends
              </TabButton>
            </div>
          )}

          {tab === 'profile' ? (
            <div className="flex flex-col gap-6">
              {viewingSelf && <SteamInfoForm initial={profile.steamInfo} />}
              {viewingSelf && <PasswordForm />}
              <div>
                <h3 className="mb-2 font-display text-lg text-dl-text">Last 5 Games</h3>
                {profile.recentGames.length === 0 ? (
                  <p className="text-sm text-dl-text/50">No games played yet.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-dl-text/50">
                        <th className="pb-1 pr-2 font-normal">Hero</th>
                        <th className="pb-1 pr-2 font-normal">Challenge</th>
                        <th className="pb-1 pr-2 font-normal">Result</th>
                        <th className="pb-1 pr-2 font-normal">Souls</th>
                        <th className="pb-1 font-normal">K / D</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.recentGames.map((g) => (
                        <tr key={g.id} className="border-t border-dl-border/50">
                          <td className="py-1.5 pr-2">
                            {(() => {
                              const hero = safeHero(g.heroSlug)
                              return hero ? (
                                <span className="flex items-center gap-2">
                                  <img src={hero.icon} alt="" className="h-6 w-6 rounded-full border border-dl-border object-cover" />
                                  {hero.name}
                                </span>
                              ) : (
                                g.heroSlug
                              )
                            })()}
                          </td>
                          <td className="max-w-[180px] py-1.5 pr-2">
                            <ChallengeHoverCell
                              challenges={g.challengeName
                                .split(', ')
                                .map((name) => CHALLENGE_BY_NAME[name])
                                .filter(Boolean)}
                              fallbackText={g.challengeName}
                            />
                          </td>
                          <td className={`py-1.5 pr-2 font-display ${g.outcome === 'win' ? 'text-dl-text' : 'text-red-400'}`}>
                            {g.outcome.toUpperCase()}
                          </td>
                          <td className="py-1.5 pr-2">
                            <SoulsStat souls={g.souls} size="sm" />
                          </td>
                          <td className="py-1.5">
                            {g.kills} / {g.deaths}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <FriendsPanel
              onViewProfile={(id) => {
                setActiveUserId(id)
                setTab('profile')
              }}
            />
          )}
        </div>
      )}
    </Modal>
  )
}

function safeHero(slug: string) {
  try {
    return getHero(slug)
  } catch {
    return null
  }
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 pb-2 font-display text-sm tracking-wide transition ${
        active ? 'border-b-2 border-dl-mint text-dl-mint' : 'text-dl-text/50 hover:text-dl-text'
      }`}
    >
      {children}
    </button>
  )
}

function AvatarUploader({
  profile,
  editable,
  onUploaded,
}: {
  profile: UserProfile
  editable: boolean
  onUploaded: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('avatar', file)
      const { profilePictureUrl } = await api.post<{ profilePictureUrl: string }>('/users/me/avatar', form)
      onUploaded(profilePictureUrl)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-black/40 ${editable ? 'cursor-pointer' : ''}`}
      onClick={() => editable && inputRef.current?.click()}
    >
      {profile.profilePictureUrl ? (
        <img src={profile.profilePictureUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-display text-2xl">
          {profile.username[0]?.toUpperCase()}
        </span>
      )}
      {editable && (
        <>
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] opacity-0 transition hover:opacity-100">
            {busy ? '...' : 'Change'}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  )
}

function SteamInfoForm({ initial }: { initial: string | null }) {
  const [value, setValue] = useState(initial ?? '')
  const [saved, setSaved] = useState(false)

  async function save() {
    await api.post('/users/me/steam-info', { steamInfo: value })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div>
      <h3 className="mb-2 font-display text-lg text-dl-text">Steam Account</h3>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Steam ID or profile URL"
          className="flex-1 rounded border border-dl-border bg-black/40 px-3 py-2 text-sm outline-none focus:border-dl-mint"
        />
        <button
          type="button"
          onClick={save}
          className="rounded border border-dl-mint/60 px-3 py-2 text-sm text-dl-mint hover:bg-dl-mint hover:text-black"
        >
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    try {
      await api.post('/users/me/password', { currentPassword, newPassword })
      setMessage('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Something went wrong.')
    }
  }

  return (
    <div>
      <h3 className="mb-2 font-display text-lg text-dl-text">Change Password</h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="rounded border border-dl-border bg-black/40 px-3 py-2 text-sm outline-none focus:border-dl-mint"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          New password
          <input
            type="password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded border border-dl-border bg-black/40 px-3 py-2 text-sm outline-none focus:border-dl-mint"
          />
        </label>
        <button
          type="submit"
          className="rounded border border-dl-mint/60 px-3 py-2 text-sm text-dl-mint hover:bg-dl-mint hover:text-black"
        >
          Update
        </button>
      </form>
      {message && <p className="mt-1 text-xs text-dl-text/60">{message}</p>}
    </div>
  )
}
