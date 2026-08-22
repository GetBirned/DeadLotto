import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-secret'
export const AUTH_COOKIE = 'dl_token'

export interface AuthedRequest extends Request {
  userId?: string
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string }
    return payload.sub
  } catch {
    return null
  }
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE]
  const userId = token ? verifyToken(token) : null
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }
  req.userId = userId
  next()
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE]
  const userId = token ? verifyToken(token) : null
  if (userId) req.userId = userId
  next()
}
