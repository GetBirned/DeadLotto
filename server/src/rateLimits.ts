import rateLimit from 'express-rate-limit'

// Shared error shape with the rest of the API so the client's existing ApiError
// handling (which reads body.error) shows these the same way as any other failure.
function limitMessage(text: string) {
  return { error: text }
}

// Baseline for every /api/* route - loose enough not to bother real users, tight
// enough to blunt a script hammering the API.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many requests. Please slow down and try again shortly.'),
})

// Signup/login: the classic brute-force and mass-account-creation target.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many attempts. Please wait a few minutes and try again.'),
})

// Avatar uploads cost real storage + bandwidth (R2) - keep this tight.
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many uploads. Please try again later.'),
})

// Challenge suggestions send a real email through a limited-quota provider -
// nothing should be able to burn through that or spam an inbox.
export const suggestionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many suggestions submitted. Please try again later.'),
})

// Lobby creation and friend requests: moderate caps to prevent spam/DB bloat
// without ever getting in the way of normal play.
export const lobbyCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many lobbies created. Please try again later.'),
})

// Invite codes are 6 characters from a 32-char alphabet (~1 billion combos) - not
// brute-forceable at any sane rate limit, but this still slows down someone scanning
// for valid codes to gatecrash lobbies.
export const lobbyJoinLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many join attempts. Please wait a few minutes and try again.'),
})

export const friendRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many friend requests sent. Please try again later.'),
})
