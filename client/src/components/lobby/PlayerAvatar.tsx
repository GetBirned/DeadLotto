import type { PublicUser } from '@shared/types'

export function PlayerAvatar({ user, size = 10 }: { user: PublicUser; size?: number }) {
  const px = `${size * 4}px`
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-dl-panel font-display"
      style={{ width: px, height: px }}
    >
      {user.profilePictureUrl ? (
        <img src={user.profilePictureUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        user.username[0]?.toUpperCase()
      )}
    </span>
  )
}
