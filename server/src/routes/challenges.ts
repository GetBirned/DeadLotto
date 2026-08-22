import { Router } from 'express'
import { CHALLENGES } from '@shared/challenges'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth.js'
import { sendChallengeSuggestionEmail } from '../email.js'

export const challengesRouter = Router()

challengesRouter.get('/', (_req, res) => {
  res.json(CHALLENGES)
})

challengesRouter.post('/suggest', requireAuth, async (req: AuthedRequest, res) => {
  const { challengeName, details } = req.body ?? {}
  if (typeof challengeName !== 'string' || !challengeName.trim()) {
    res.status(400).json({ error: 'Challenge name is required.' })
    return
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  await prisma.challengeSuggestion.create({
    data: { userId: req.userId!, challengeName: challengeName.trim(), details: String(details ?? '').trim() },
  })
  const { sent } = await sendChallengeSuggestionEmail({
    fromUsername: user?.username ?? 'unknown',
    challengeName: challengeName.trim(),
    details: String(details ?? '').trim(),
  })
  res.json({ ok: true, emailSent: sent })
})
