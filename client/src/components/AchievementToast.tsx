import { useEffect, useState } from 'react'
import { getSocket } from '../lib/socket'
import type { AchievementDefinition } from '@shared/achievements'

interface Toast extends AchievementDefinition {
  id: number
}

let nextId = 0
const VISIBLE_MS = 6000

// Mounted once, globally, alongside FriendRequests/LobbyInvites - achievements can
// unlock from any finished game regardless of which page you're on, so this can't be
// scoped to a single lobby view.
export function AchievementToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const socket = getSocket()
    const onUnlocked = (achievement: AchievementDefinition) => {
      const id = nextId++
      setToasts((prev) => [...prev, { ...achievement, id }])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), VISIBLE_MS)
    }
    socket.on('achievement:unlocked', onUnlocked)
    return () => {
      socket.off('achievement:unlocked', onUnlocked)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto w-72 rounded-lg border border-dl-mint/60 bg-dl-panel/95 p-3 shadow-xl"
        >
          <p className="text-[10px] uppercase tracking-widest text-dl-mint/70">Achievement Unlocked</p>
          <p className="font-display text-lg text-dl-mint">{t.name}</p>
          <p className="text-xs text-dl-text/60">{t.description}</p>
        </div>
      ))}
    </div>
  )
}
