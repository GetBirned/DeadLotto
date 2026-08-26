import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Modal } from './Modal'
import { FriendsPanel } from './FriendsPanel'
import { getHero, HEROES } from '@shared/heroRegistry'
import { CHALLENGE_BY_NAME } from '@shared/challenges'
import { ACCENT_COLORS } from '@shared/profileStyle'
import { ACHIEVEMENTS, ROLE_TITLES, resolveTitleDisplay } from '@shared/achievements'
import type { UserProfile, UnlockedAchievement } from '@shared/types'
import { SoulsStat } from './SoulsStat'
import { ChallengeHoverCell } from './ChallengeHoverCell'
import { AchievementsModal } from './AchievementsModal'

export function ProfilePopup({ userId, onClose }: { userId?: string; onClose: () => void }) {
  const { user, setUser } = useAuth()
  const [activeUserId, setActiveUserId] = useState<string | undefined>(userId)
  const viewingSelf = !activeUserId || activeUserId === user?.id
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tab, setTab] = useState<'profile' | 'friends'>('profile')
  const [achievementsOpen, setAchievementsOpen] = useState(false)

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
              <h2 className="font-display text-2xl" style={profile.profileAccentColor ? { color: profile.profileAccentColor } : undefined}>
                {profile.username}
              </h2>
              {(() => {
                const title = resolveTitleDisplay(profile.selectedTitleSlug)
                return (
                  title && (
                    <p className="text-xs uppercase tracking-wide" style={{ color: title.color }}>
                      {title.name}
                    </p>
                  )
                )
              })()}
              <p className="text-sm text-dl-text">
                {profile.allTimeWins}W - {profile.allTimeLosses}L all time
                {profile.currentWinStreak >= 2 && (
                  <span className="ml-1.5 text-dl-mint">🔥 {profile.currentWinStreak} win streak</span>
                )}
              </p>
              <p className="text-xs text-dl-text/60">
                {profile.lifetimeKills}/{profile.lifetimeDeaths}/{profile.lifetimeAssists} lifetime K/D/A (
                {formatKD(profile.lifetimeKills, profile.lifetimeDeaths)})
                {profile.bestWinStreak > 0 && ` · Best streak: ${profile.bestWinStreak}`}
              </p>
              {profile.favoriteHeroSlug && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-dl-text/60">
                  <img
                    src={safeHero(profile.favoriteHeroSlug)?.icon}
                    alt=""
                    className="h-4 w-4 rounded-full border border-dl-border object-cover"
                  />
                  Favorite: {safeHero(profile.favoriteHeroSlug)?.name}
                </p>
              )}
            </div>
          </div>

          {!viewingSelf && (
            <FriendActionButton
              status={profile.friendshipStatus}
              username={profile.username}
              requestId={profile.friendshipRequestId}
              onChange={(patch) => setProfile((p) => (p ? { ...p, ...patch } : p))}
            />
          )}

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
              {(viewingSelf || profile.steamInfo) && (
                <div>
                  <h3 className="mb-2 font-display text-lg text-dl-text">Steam Account</h3>
                  <SteamProfileCard profile={profile} />
                  {viewingSelf && (
                    <SteamLinkControls
                      linked={!!(profile.steamInfo || profile.steamDisplayName)}
                      onUnlinked={() =>
                        setProfile((p) =>
                          p ? { ...p, steamInfo: null, steamDisplayName: null, steamAvatarUrl: null } : p,
                        )
                      }
                    />
                  )}
                </div>
              )}
              {viewingSelf && (
                <PersonalizationForm
                  favoriteHeroSlug={profile.favoriteHeroSlug}
                  accentColor={profile.profileAccentColor}
                  selectedTitleSlug={profile.selectedTitleSlug}
                  unlockedAchievements={profile.achievements}
                  isOwner={profile.isOwner}
                  isAdmin={profile.isAdmin}
                  onChange={(patch) => setProfile((p) => (p ? { ...p, ...patch } : p))}
                />
              )}
              {viewingSelf && <PasswordForm />}
              <div>
                <h3 className="mb-2 font-display text-lg text-dl-text">
                  Achievements ({profile.achievements.length}/{ACHIEVEMENTS.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setAchievementsOpen(true)}
                  className="rounded border border-dl-border px-4 py-2 text-sm text-dl-text/70 transition hover:border-dl-mint hover:text-dl-mint"
                >
                  View All Achievements
                </button>
              </div>
              <div>
                <h3 className="mb-2 font-display text-lg text-dl-text">Last 5 Games</h3>
                {profile.recentGames.length === 0 ? (
                  <p className="text-sm text-dl-text/50">No games played yet.</p>
                ) : (
                  <>
                    {/* Cards below sm: a 5-column table doesn't fit a phone screen without
                        clipping, so mobile gets one card per game instead. */}
                    <div className="flex flex-col gap-2 sm:hidden">
                      {profile.recentGames.map((g) => {
                        const hero = safeHero(g.heroSlug)
                        return (
                          <div key={g.id} className="rounded-lg border border-dl-border/60 bg-black/20 p-3 text-sm">
                            <div className="mb-1.5 flex items-center justify-between">
                              {hero ? (
                                <span className="flex items-center gap-2">
                                  <img src={hero.icon} alt="" className="h-6 w-6 rounded-full border border-dl-border object-cover" />
                                  {hero.name}
                                </span>
                              ) : (
                                <span>{g.heroSlug}</span>
                              )}
                              <span className={`font-display ${g.outcome === 'win' ? 'text-dl-text' : 'text-red-400'}`}>
                                {g.outcome.toUpperCase()}
                              </span>
                            </div>
                            <div className="mb-1.5 text-dl-text/70">
                              <ChallengeHoverCell
                                challenges={g.challengeName
                                  .split(', ')
                                  .map((name) => CHALLENGE_BY_NAME[name])
                                  .filter(Boolean)}
                                fallbackText={g.challengeName}
                              />
                            </div>
                            <div className="flex items-center justify-between text-dl-text/70">
                              <SoulsStat souls={g.souls} size="sm" />
                              <span>
                                {g.kills} / {g.deaths} / {g.assists} K/D/A
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <table className="hidden w-full text-left text-sm sm:table">
                      <thead>
                        <tr className="text-dl-text/50">
                          <th className="pb-1 pr-2 font-normal">Hero</th>
                          <th className="pb-1 pr-2 font-normal">Challenge</th>
                          <th className="pb-1 pr-2 font-normal">Result</th>
                          <th className="pb-1 pr-2 font-normal">Souls</th>
                          <th className="pb-1 font-normal">K / D / A</th>
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
                              {g.kills} / {g.deaths} / {g.assists}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
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
      {profile && achievementsOpen && (
        <AchievementsModal userId={profile.id} onClose={() => setAchievementsOpen(false)} />
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

function formatKD(kills: number, deaths: number): string {
  if (kills === 0 && deaths === 0) return '—'
  const ratio = deaths > 0 ? kills / deaths : kills
  return ratio.toFixed(2)
}

function FriendActionButton({
  status,
  username,
  requestId,
  onChange,
}: {
  status: UserProfile['friendshipStatus']
  username: string
  requestId: string | null
  onChange: (patch: Partial<UserProfile>) => void
}) {
  const [busy, setBusy] = useState(false)

  async function sendRequest() {
    setBusy(true)
    try {
      await api.post('/friends/request', { username })
      onChange({ friendshipStatus: 'pending-outgoing' })
    } catch {
      // Most likely already-friends/already-pending on the server's own view of
      // things (e.g. stale client state) - not worth surfacing as an error here.
    } finally {
      setBusy(false)
    }
  }

  async function acceptRequest() {
    if (!requestId) return
    setBusy(true)
    try {
      await api.post('/friends/accept', { requestId })
      onChange({ friendshipStatus: 'friends' })
    } finally {
      setBusy(false)
    }
  }

  if (status === 'friends') {
    return <p className="mb-5 text-xs text-dl-mint">Friends</p>
  }
  if (status === 'pending-outgoing') {
    return <p className="mb-5 text-xs text-dl-text/40">Friend request sent</p>
  }
  if (status === 'pending-incoming') {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={acceptRequest}
        className="mb-5 rounded bg-dl-mint px-4 py-1.5 font-display text-sm text-black transition hover:brightness-110 disabled:opacity-50"
      >
        Accept Friend Request
      </button>
    )
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={sendRequest}
      className="mb-5 rounded border border-dl-mint/60 px-4 py-1.5 font-display text-sm text-dl-mint transition hover:bg-dl-mint hover:text-black disabled:opacity-50"
    >
      Add Friend
    </button>
  )
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

function SteamLinkControls({ linked, onUnlinked }: { linked: boolean; onUnlinked: () => void }) {
  const [busy, setBusy] = useState(false)

  async function unlink() {
    setBusy(true)
    try {
      await api.post('/users/me/steam-unlink')
      onUnlinked()
    } finally {
      setBusy(false)
    }
  }

  if (linked) {
    return (
      <button
        type="button"
        onClick={unlink}
        disabled={busy}
        className="mt-2 flex items-center gap-2 rounded border border-red-500/40 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
      >
        {busy ? 'Removing...' : 'Remove Steam Account'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = '/api/auth/steam/login'
      }}
      className="mt-2 flex items-center gap-2 rounded border border-dl-border px-3 py-2 text-sm text-dl-text/80 transition hover:border-dl-mint hover:text-dl-mint"
    >
      Link Steam Account
    </button>
  )
}

// Shown for both self and other players' profiles - the rich card only renders once
// STEAM_API_KEY has resolved a display name/avatar server-side; before that (or
// without a key configured) it falls back to the plain link/text steamInfo already
// stored.
function SteamProfileCard({ profile }: { profile: UserProfile }) {
  if (profile.steamDisplayName || profile.steamAvatarUrl) {
    return (
      <a
        href={profile.steamInfo ?? undefined}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-lg border border-dl-border/60 bg-black/20 p-2 transition hover:border-dl-mint"
      >
        {profile.steamAvatarUrl && (
          <img src={profile.steamAvatarUrl} alt="" className="h-10 w-10 shrink-0 rounded" />
        )}
        <span className="text-sm text-dl-text">{profile.steamDisplayName ?? 'View Steam Profile'}</span>
      </a>
    )
  }
  if (!profile.steamInfo) return null
  return profile.steamInfo.startsWith('http') ? (
    <a
      href={profile.steamInfo}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-dl-mint underline decoration-dotted hover:text-dl-text"
    >
      {profile.steamInfo}
    </a>
  ) : (
    <p className="text-sm text-dl-text/80">{profile.steamInfo}</p>
  )
}

function PersonalizationForm({
  favoriteHeroSlug,
  accentColor,
  selectedTitleSlug,
  unlockedAchievements,
  isOwner,
  isAdmin,
  onChange,
}: {
  favoriteHeroSlug: string | null
  accentColor: string | null
  selectedTitleSlug: string | null
  unlockedAchievements: UnlockedAchievement[]
  isOwner: boolean
  isAdmin: boolean
  onChange: (patch: {
    favoriteHeroSlug?: string | null
    profileAccentColor?: string | null
    selectedTitleSlug?: string | null
  }) => void
}) {
  async function setFavoriteHero(slug: string) {
    const value = slug || null
    onChange({ favoriteHeroSlug: value })
    await api.post('/users/me/favorite-hero', { heroSlug: value })
  }

  async function setAccentColor(color: string | null) {
    onChange({ profileAccentColor: color })
    await api.post('/users/me/profile-style', { accentColor: color })
  }

  async function setTitle(slug: string) {
    const value = slug || null
    onChange({ selectedTitleSlug: value })
    await api.post('/users/me/title', { achievementSlug: value })
  }

  return (
    <div>
      <h3 className="mb-2 font-display text-lg text-dl-text">Personalize</h3>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-dl-text/70">
          Favorite hero
          <select
            value={favoriteHeroSlug ?? ''}
            onChange={(e) => setFavoriteHero(e.target.value)}
            className="w-full max-w-xs rounded border border-dl-border bg-black/40 px-3 py-2 text-sm text-dl-text outline-none focus:border-dl-mint"
          >
            <option value="">None</option>
            {HEROES.map((h) => (
              <option key={h.slug} value={h.slug}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-dl-text/70">
          Profile title
          <select
            value={selectedTitleSlug ?? ''}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!isOwner && !isAdmin && unlockedAchievements.length === 0}
            className="w-full max-w-xs rounded border border-dl-border bg-black/40 px-3 py-2 text-sm text-dl-text outline-none focus:border-dl-mint disabled:opacity-40"
          >
            <option value="">None</option>
            {ROLE_TITLES.filter((t) => (t.slug === 'owner' ? isOwner : t.slug === 'admin' ? isAdmin : false)).map(
              (t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ),
            )}
            {unlockedAchievements.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
          {!isOwner && !isAdmin && unlockedAchievements.length === 0 && (
            <span className="text-[11px] text-dl-text/40">Unlock an achievement to pick a title.</span>
          )}
        </label>
        <div>
          <p className="mb-1 text-xs text-dl-text/70">Name color</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAccentColor(null)}
              className={`h-7 w-7 rounded-full border-2 text-[10px] text-dl-text/50 ${
                !accentColor ? 'border-dl-mint' : 'border-dl-border'
              }`}
              aria-label="No accent color"
            >
              &times;
            </button>
            {ACCENT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAccentColor(color)}
                style={{ backgroundColor: color }}
                className={`h-7 w-7 rounded-full border-2 transition ${
                  accentColor === color ? 'border-dl-text' : 'border-transparent hover:border-dl-text/50'
                }`}
                aria-label={`Set accent color ${color}`}
              />
            ))}
          </div>
        </div>
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
