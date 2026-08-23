import { Router } from 'express'
import { prisma } from '../db.js'
import { verifyToken, AUTH_COOKIE } from '../auth.js'

export const steamAuthRouter = Router()

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'

function currentOrigin(req: { protocol: string; get: (name: string) => string | undefined }): string {
  return `${req.protocol}://${req.get('host')}`
}

// Fetches display name + avatar for a linked SteamID64 via Steam's Web API. Requires
// STEAM_API_KEY (free from https://steamcommunity.com/dev/apikey) - without it, the
// link still succeeds and stores the verified profile URL, just without the rich
// name/avatar. Best-effort: any failure here shouldn't undo the successful link.
async function fetchSteamPlayerSummary(steamId64: string): Promise<{ personaname: string; avatarfull: string } | null> {
  const apiKey = process.env.STEAM_API_KEY
  if (!apiKey) return null
  try {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId64}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as { response?: { players?: { personaname?: string; avatarfull?: string }[] } }
    const player = data.response?.players?.[0]
    if (!player?.personaname || !player.avatarfull) return null
    return { personaname: player.personaname, avatarfull: player.avatarfull }
  } catch (err) {
    console.error('[steam] player summary fetch failed', err)
    return null
  }
}

// Steam only supports OpenID 2.0, not OAuth - the user is redirected to Steam, signs
// in there, and Steam redirects back with a signed "claimed_id" URL containing their
// SteamID64.
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

    const summary = await fetchSteamPlayerSummary(steamId64)
    await prisma.user.update({
      where: { id: userId },
      data: {
        steamInfo: `https://steamcommunity.com/profiles/${steamId64}`,
        steamId64,
        steamDisplayName: summary?.personaname ?? null,
        steamAvatarUrl: summary?.avatarfull ?? null,
      },
    })
    res.redirect('/?steamLinked=1')
  } catch (err) {
    console.error('[steam] link failed', err)
    res.redirect('/?steamLinkError=1')
  }
})
