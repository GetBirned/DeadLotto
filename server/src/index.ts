import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import fs from 'node:fs'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/socketEvents'
import { authRouter } from './routes/auth.js'
import { usersRouter } from './routes/users.js'
import { friendsRouter } from './routes/friends.js'
import { lobbiesRouter } from './routes/lobbies.js'
import { challengesRouter } from './routes/challenges.js'
import { sharedSummariesRouter } from './routes/sharedSummaries.js'
import { leaderboardRouter } from './routes/leaderboard.js'
import { adminRouter } from './routes/admin.js'
import { steamAuthRouter } from './routes/steamAuth.js'
import { registerLobbySocket } from './sockets/lobbySocket.js'
import { storageMode } from './storage.js'
import { generalLimiter } from './rateLimits.js'
import { installErrorLogCapture } from './errorLog.js'
import { setIO } from './socketBus.js'

installErrorLogCapture()

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
const PORT = Number(process.env.PORT ?? 4000)

const app = express()
// Railway (and most hosts) put one reverse proxy in front of the app. Without this,
// every request looks like it comes from the proxy's own IP, and rate limiting would
// bucket every real visitor together - one person hitting a limit would lock out
// everyone else instead of just them.
app.set('trust proxy', 1)
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use('/api', generalLimiter)

if (storageMode === 'local') {
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))
}

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/friends', friendsRouter)
app.use('/api/lobbies', lobbiesRouter)
app.use('/api/challenges', challengesRouter)
app.use('/api/shared-summaries', sharedSummariesRouter)
app.use('/api/leaderboard', leaderboardRouter)
app.use('/api/admin', adminRouter)
app.use('/api/auth/steam', steamAuthRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// In production the built client is copied into server/public - serve it from the
// same process so there's one deploy, one origin, and no CORS/cross-site cookie
// complexity. In dev, Vite's own dev server handles the client, so this directory
// won't exist and every route below just falls through with a 404 (harmless).
const publicDir = path.resolve(process.cwd(), 'public')
const indexHtmlPath = path.join(publicDir, 'index.html')
if (fs.existsSync(indexHtmlPath)) {
  app.use(express.static(publicDir))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      next()
      return
    }
    res.sendFile(indexHtmlPath)
  })
}

const httpServer = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
})
registerLobbySocket(io)
setIO(io)

httpServer.listen(PORT, () => {
  console.log(`DeadLotto server listening on http://localhost:${PORT}`)
})
