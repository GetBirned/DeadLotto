import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db.js'
import { signToken, AUTH_COOKIE, requireAuth, type AuthedRequest } from '../auth.js'
import { authLimiter } from '../rateLimits.js'

export const authRouter = Router()

const isProd = process.env.NODE_ENV === 'production'
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProd,
  maxAge: 30 * 24 * 60 * 60 * 1000,
}

authRouter.post('/signup', authLimiter, async (req, res) => {
  const { username, password } = req.body ?? {}
  if (typeof username !== 'string' || typeof password !== 'string' || username.trim().length < 3 || password.length < 6) {
    res.status(400).json({ error: 'Username must be 3+ chars and password 6+ chars.' })
    return
  }
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    res.status(409).json({ error: 'Username already taken.' })
    return
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { username, passwordHash } })
  const token = signToken(user.id)
  res.cookie(AUTH_COOKIE, token, cookieOptions)
  res.json({ id: user.id, username: user.username, profilePictureUrl: user.profilePictureUrl, isAdmin: user.isAdmin })
})

authRouter.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body ?? {}
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    res.status(401).json({ error: 'Invalid username or password.' })
    return
  }
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    res.status(401).json({ error: 'Invalid username or password.' })
    return
  }
  const token = signToken(user.id)
  res.cookie(AUTH_COOKIE, token, cookieOptions)
  res.json({ id: user.id, username: user.username, profilePictureUrl: user.profilePictureUrl, isAdmin: user.isAdmin })
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE)
  res.json({ ok: true })
})

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json({ id: user.id, username: user.username, profilePictureUrl: user.profilePictureUrl, isAdmin: user.isAdmin })
})
