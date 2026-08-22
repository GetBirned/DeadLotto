const onlineUsers = new Map<string, Set<string>>() // userId -> set of socket ids

export function markOnline(userId: string, socketId: string): boolean {
  const wasOnline = onlineUsers.has(userId)
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
  onlineUsers.get(userId)!.add(socketId)
  return !wasOnline
}

export function markOffline(userId: string, socketId: string): boolean {
  const set = onlineUsers.get(userId)
  if (!set) return false
  set.delete(socketId)
  if (set.size === 0) {
    onlineUsers.delete(userId)
    return true
  }
  return false
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId)
}

export function getUserSocketIds(userId: string): string[] {
  return Array.from(onlineUsers.get(userId) ?? [])
}
