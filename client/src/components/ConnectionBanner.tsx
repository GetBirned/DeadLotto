import { useEffect, useState } from 'react'
import { getSocket } from '../lib/socket'

// Mounted once, globally, alongside AchievementToast - a dropped connection can happen
// on any page, not just mid-lobby, and the player deserves to know DeadLotto noticed
// rather than just watching things silently stop updating (or, worse, getting bounced
// back to "Joining lobby..." once the server's reconnect grace period runs out with no
// explanation of why).
export function ConnectionBanner() {
  const [connected, setConnected] = useState(() => getSocket().connected)

  useEffect(() => {
    const socket = getSocket()
    const onDisconnect = () => setConnected(false)
    const onConnect = () => setConnected(true)
    socket.on('disconnect', onDisconnect)
    socket.on('connect', onConnect)
    return () => {
      socket.off('disconnect', onDisconnect)
      socket.off('connect', onConnect)
    }
  }, [])

  if (connected) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center pt-3">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-red-500/60 bg-black/90 px-4 py-2 text-sm text-red-300 shadow-xl">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
        Connection lost - reconnecting...
      </div>
    </div>
  )
}
