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
import { prisma } from './db.js'
import { getHero } from '@shared/heroRegistry'

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

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Swaps the title/description/url meta tags in the built index.html for link-preview
// bots (Discord, Slack, Twitter, ...) that only ever fetch the raw HTML and never run
// the SPA's JS - matched by tag structure rather than the default text, so it keeps
// working if the defaults in index.html change later.
function renderIndexHtmlWithMeta(template: string, meta: { title: string; description: string; url: string }): string {
  const title = escapeHtmlAttr(meta.title)
  const description = escapeHtmlAttr(meta.description)
  const url = escapeHtmlAttr(meta.url)
  return template
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/(property="og:title" content=").*?(")/, `$1${title}$2`)
    .replace(/(name="twitter:title" content=").*?(")/, `$1${title}$2`)
    .replace(/(name="description" content=").*?(")/, `$1${description}$2`)
    .replace(/(property="og:description" content=").*?(")/, `$1${description}$2`)
    .replace(/(name="twitter:description" content=").*?(")/, `$1${description}$2`)
    .replace(/(property="og:url" content=").*?(")/, `$1${url}$2`)
}

// In production the built client is copied into server/public - serve it from the
// same process so there's one deploy, one origin, and no CORS/cross-site cookie
// complexity. In dev, Vite's own dev server handles the client, so this directory
// won't exist and every route below just falls through with a 404 (harmless).
const publicDir = path.resolve(process.cwd(), 'public')
const indexHtmlPath = path.join(publicDir, 'index.html')
if (fs.existsSync(indexHtmlPath)) {
  app.use(express.static(publicDir))

  const indexHtmlTemplate = fs.readFileSync(indexHtmlPath, 'utf-8')

  // Only the shared-summary page gets a dynamic preview - it's the one link people
  // actually paste into Discord after a game, and it's public/unauthenticated by
  // design already (see routes/sharedSummaries.ts). Everything else keeps the static
  // defaults from index.html.
  app.get('/summary/:shareCode', async (req, res) => {
    const shareCode = String(req.params.shareCode).toUpperCase()
    const summary = await prisma.sharedGameSummary
      .findUnique({ where: { shareCode }, include: { players: true } })
      .catch(() => null)
    if (!summary) {
      res.sendFile(indexHtmlPath)
      return
    }
    const heroNames = summary.players
      .map((p) => {
        if (!p.heroSlug) return null
        try {
          return getHero(p.heroSlug).name
        } catch {
          return null
        }
      })
      .filter((name): name is string => !!name)
    const usernames = summary.players.map((p) => p.username)
    const title = summary.outcome === 'win' ? 'Victory! - DeadLotto' : 'Defeat - DeadLotto'
    const description =
      usernames.length > 0
        ? `${usernames.join(', ')} played ${heroNames.length > 0 ? heroNames.join(', ') : 'Deadlock'} on DeadLotto.`
        : 'A DeadLotto game recap.'
    const html = renderIndexHtmlWithMeta(indexHtmlTemplate, {
      title,
      description,
      url: `${CLIENT_ORIGIN}/summary/${summary.shareCode}`,
    })
    res.set('Content-Type', 'text/html')
    res.send(html)
  })

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
