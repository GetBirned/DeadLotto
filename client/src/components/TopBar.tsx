import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { AuthModal } from './AuthModal'
import { ProfilePopup } from './ProfilePopup'
import { LobbyInvites } from './LobbyInvites'
import { FriendRequests } from './FriendRequests'
import { AchievementToast } from './AchievementToast'

export function TopBar() {
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [steamLinkError, setSteamLinkError] = useState(false)

  // Steam linking is a full-page redirect out to Steam and back - pick up the result
  // here on return, then scrub the query string so it doesn't linger in the address bar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('steamLinked') && !params.has('steamLinkError')) return
    if (params.has('steamLinked')) setProfileOpen(true)
    if (params.has('steamLinkError')) setSteamLinkError(true)
    params.delete('steamLinked')
    params.delete('steamLinkError')
    const rest = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''))
  }, [])

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3 sm:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <img
            src="/assets/branding/deadLotto_logo.png"
            alt="DeadLotto"
            className="h-11 w-11 drop-shadow-[0_0_6px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[8deg]"
          />
          <img
            src="/assets/branding/deadLotto_textLogo.png"
            alt="DeadLotto"
            className="hidden h-6 opacity-90 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:[filter:drop-shadow(0_0_8px_var(--color-dl-mint))] sm:block"
          />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/leaderboard"
            className="rounded border border-dl-border/70 bg-black/40 px-3 py-2 font-display text-sm tracking-wide text-dl-text/80 transition hover:border-dl-mint hover:text-dl-mint"
          >
            Leaderboard
          </Link>
          {user?.isAdmin && (
            <Link
              to="/admin"
              className="hidden rounded border border-dl-border/70 bg-black/40 px-3 py-2 font-display text-sm tracking-wide text-dl-text/80 transition hover:border-dl-mint hover:text-dl-mint sm:block"
            >
              Admin
            </Link>
          )}
          {user ? (
            <>
              <FriendRequests />
              <LobbyInvites />
              <AchievementToast />
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-2 rounded-full border border-dl-border/70 bg-black/40 py-1 pl-1 pr-1 transition hover:border-dl-mint sm:pr-3"
              >
                <span className="h-8 w-8 overflow-hidden rounded-full bg-dl-panel">
                  {user.profilePictureUrl ? (
                    <img src={user.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-display text-sm">
                      {user.username[0]?.toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="hidden font-display text-sm tracking-wide sm:inline">{user.username}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="rounded border border-dl-mint/70 bg-black/40 px-4 py-2 font-display text-sm tracking-wide text-dl-mint transition hover:bg-dl-mint hover:text-black"
            >
              Log In / Sign Up
            </button>
          )}
        </div>
      </header>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {profileOpen && <ProfilePopup onClose={() => setProfileOpen(false)} />}
      {steamLinkError && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded border border-red-500/60 bg-black/90 px-4 py-2 text-sm text-red-400 shadow-xl">
          Couldn't verify that Steam login.{' '}
          <button type="button" onClick={() => setSteamLinkError(false)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}
    </>
  )
}
