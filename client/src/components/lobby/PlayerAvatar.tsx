import type { PublicUser } from '@shared/types'

// `offline` renders a dimmed avatar with a small red dot - a player mid-reconnect
// (network blip, backgrounded tab) rather than someone who's actually left, so it
// deliberately doesn't remove them from whatever list they're in.
export function PlayerAvatar({ user, size = 10, offline = false }: { user: PublicUser; size?: number; offline?: boolean }) {
  const px = `${size * 4}px`
  return (
    <span className="relative inline-flex shrink-0" style={{ width: px, height: px }}>
      <span
        className={`inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-dl-panel font-display transition ${offline ? 'opacity-40 grayscale' : ''}`}
      >
        {user.profilePictureUrl ? (
          <img src={user.profilePictureUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          user.username[0]?.toUpperCase()
        )}
      </span>
      {offline && (
        <span
          title="Reconnecting..."
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-black bg-red-500"
        />
      )}
    </span>
  )
}
