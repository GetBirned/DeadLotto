import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth.js'
import { isUserOnline } from '../sockets/presence.js'
import { friendRequestLimiter } from '../rateLimits.js'

export const friendsRouter = Router()

friendsRouter.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  // Accepting a request writes a symmetric pair of rows (see /accept below) so a
  // "my friends" lookup only ever needs to look from this user's own side - matching
  // both directions here would return every friend twice.
  const friendships = await prisma.friendship.findMany({
    where: { userId, status: 'accepted' },
    include: { friend: true },
  })
  res.json(
    friendships.map((f) => ({
      id: f.friend.id,
      username: f.friend.username,
      profilePictureUrl: f.friend.profilePictureUrl,
      online: isUserOnline(f.friend.id),
    })),
  )
})

friendsRouter.get('/requests', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const incoming = await prisma.friendship.findMany({
    where: { friendId: userId, status: 'pending' },
    include: { user: true },
  })
  res.json(
    incoming.map((f) => ({
      requestId: f.id,
      id: f.user.id,
      username: f.user.username,
      profilePictureUrl: f.user.profilePictureUrl,
    })),
  )
})

friendsRouter.post('/request', friendRequestLimiter, requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const { username } = req.body ?? {}
  const target = await prisma.user.findUnique({ where: { username } })
  if (!target) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  if (target.id === userId) {
    res.status(400).json({ error: "You can't friend yourself." })
    return
  }
  const reverseAccepted = await prisma.friendship.findFirst({
    where: { userId: target.id, friendId: userId, status: 'accepted' },
  })
  if (reverseAccepted) {
    res.status(409).json({ error: 'Already friends.' })
    return
  }
  await prisma.friendship.upsert({
    where: { userId_friendId: { userId, friendId: target.id } },
    update: {},
    create: { userId, friendId: target.id, status: 'pending' },
  })
  res.json({ ok: true })
})

friendsRouter.post('/remove', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const { friendUserId } = req.body ?? {}
  if (typeof friendUserId !== 'string') {
    res.status(400).json({ error: 'friendUserId is required.' })
    return
  }
  // Removing deletes the symmetric pair written by /accept (or a still-pending
  // request in either direction), so neither side keeps a dangling row.
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { userId, friendId: friendUserId },
        { userId: friendUserId, friendId: userId },
      ],
    },
  })
  res.json({ ok: true })
})

friendsRouter.post('/accept', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const { requestId } = req.body ?? {}
  const request = await prisma.friendship.findUnique({ where: { id: requestId } })
  if (!request || request.friendId !== userId) {
    res.status(404).json({ error: 'Request not found' })
    return
  }
  await prisma.friendship.update({ where: { id: requestId }, data: { status: 'accepted' } })
  await prisma.friendship.upsert({
    where: { userId_friendId: { userId, friendId: request.userId } },
    update: { status: 'accepted' },
    create: { userId, friendId: request.userId, status: 'accepted' },
  })
  res.json({ ok: true })
})
