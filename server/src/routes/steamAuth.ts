import { Router } from 'express'
import { prisma } from '../db.js'
import { verifyToken, AUTH_COOKIE } from '../auth.js'

export const steamAuthRouter = Router()

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'

function currentOrigin(req: { protocol: string; get: (name: string) => string | undefined }): string {
  return `${req.protocol}://${req.get('host')}`
}

// Steam only supports OpenID 2.0, not OAuth - the user is redirected to Steam, signs
// in there, and Steam redirects back with a signed "claimed_id" URL containing their
// SteamID64. No Steam API key is needed for this - only calling Steam's own Web API
// for extra profile data (name/avatar) would require one, which this skips in favor
// of just storing the verified profile URL in the existing steamInfo field.
steamAuthRouter.get('/login', (req, res) => {
  const token = req.cookies?.[AUTH_COOKIE]
  const userId = token ? verifyToken(token) : null
  if (!userId) {
    res.redirect('/?steamLinkError=1')
    return
  }
  const origin = currentOrigin(req)
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': `${origin}/api/auth/steam/callback`,
    'openid.realm': origin,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  })
  res.redirect(`${STEAM_OPENID_URL}?${params.toString()}`)
})

steamAuthRouter.get('/callback', async (req, res) => {
  const token = req.cookies?.[AUTH_COOKIE]
  const userId = token ? verifyToken(token) : null
  if (!userId) {
    res.redirect('/?steamLinkError=1')
    return
  }

  try {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(req.query)) {
      params.set(key, String(value))
    }
    params.set('openid.mode', 'check_authentication')

    const verifyRes = await fetch(STEAM_OPENID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const verifyText = await verifyRes.text()
    if (!verifyText.includes('is_valid:true')) {
      res.redirect('/?steamLinkError=1')
      return
    }

    const claimedId = String(req.query['openid.claimed_id'] ?? '')
    const steamId64 = claimedId.match(/(\d{17})$/)?.[1]
    if (!steamId64) {
      res.redirect('/?steamLinkError=1')
      return
    }

    await prisma.user.update({
      where: { id: userId },
      data: { steamInfo: `https://steamcommunity.com/profiles/${steamId64}` },
    })
    res.redirect('/?steamLinked=1')
  } catch (err) {
    console.error('[steam] link failed', err)
    res.redirect('/?steamLinkError=1')
  }
})
