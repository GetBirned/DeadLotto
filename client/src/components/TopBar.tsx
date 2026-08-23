import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { AuthModal } from './AuthModal'
import { ProfilePopup } from './ProfilePopup'
import { LobbyInvites } from './LobbyInvites'

export function TopBar() {
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

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
          {user ? (
            <>
              <LobbyInvites />
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
    </>
  )
}
