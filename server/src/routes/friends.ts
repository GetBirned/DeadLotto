import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth.js'
import { isUserOnline } from '../sockets/presence.js'

export const friendsRouter = Router()

friendsRouter.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'accepted',
      OR: [{ userId }, { friendId: userId }],
    },
    include: { user: true, friend: true },
  })
  const friends = friendships.map((f) => (f.userId === userId ? f.friend : f.user))
  res.json(
    friends.map((u) => ({
      id: u.id,
      username: u.username,
      profilePictureUrl: u.profilePictureUrl,
      online: isUserOnline(u.id),
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

friendsRouter.post('/request', requireAuth, async (req: AuthedRequest, res) => {
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
