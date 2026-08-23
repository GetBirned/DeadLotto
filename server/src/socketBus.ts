import type { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/socketEvents'

type AppIO = Server<ClientToServerEvents, ServerToClientEvents>

// REST routes are set up before the Socket.IO server exists (index.ts creates it
// after mounting the routers), so this holds a late-bound reference any route can
// import to push a live event - e.g. a friend request notification - without
// threading `io` through every router's constructor.
let ioInstance: AppIO | null = null

export function setIO(io: AppIO) {
  ioInstance = io
}

export function getIO(): AppIO | null {
  return ioInstance
}
