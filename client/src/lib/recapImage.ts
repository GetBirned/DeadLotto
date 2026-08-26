import { getHero } from '@shared/heroRegistry'

export interface RecapImagePlayer {
  username: string
  heroSlug: string | null
  challengeNames: string
  kills: number
  deaths: number
  assists: number
  souls: number
}

const DISPLAY_FONT = '"Forevs Demo", Georgia, serif'
const BG = '#0b0a08'
const TEXT = '#efddbe'
const MINT = '#9affd6'
const RED = '#ff6b6b'

function safeHeroName(slug: string): string {
  try {
    return getHero(slug).name
  } catch {
    return slug
  }
}

// Draws a shareable recap card entirely with Canvas2D (no external image loads, so no
// CORS-tainted-canvas risk) and triggers a browser download. Avatar/hero art is
// deliberately skipped in favor of plain text for the same reason.
export async function downloadRecapImage(
  outcome: 'win' | 'loss',
  players: RecapImagePlayer[],
  filename = 'deadlotto-recap.png',
) {
  try {
    await document.fonts.load(`700 32px ${DISPLAY_FONT}`)
  } catch {
    // Falls back to the serif stack in the font string if the custom font isn't ready.
  }

  const width = 900
  const rowHeight = 74
  const headerHeight = 170
  const height = headerHeight + Math.max(1, players.length) * rowHeight + 60

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = TEXT
  ctx.font = `700 26px ${DISPLAY_FONT}`
  ctx.fillText('DEADLOTTO', 40, 48)

  ctx.fillStyle = outcome === 'win' ? TEXT : RED
  ctx.font = `700 58px ${DISPLAY_FONT}`
  ctx.fillText(outcome === 'win' ? 'VICTORY' : 'DEFEAT', 40, 130)

  let y = headerHeight
  for (const p of players) {
    ctx.strokeStyle = 'rgba(239, 221, 190, 0.15)'
    ctx.beginPath()
    ctx.moveTo(40, y)
    ctx.lineTo(width - 40, y)
    ctx.stroke()

    const heroName = p.heroSlug ? safeHeroName(p.heroSlug) : '-'

    ctx.textAlign = 'left'
    ctx.fillStyle = TEXT
    ctx.font = `700 20px ${DISPLAY_FONT}`
    ctx.fillText(p.username, 40, y + 32)

    ctx.fillStyle = MINT
    ctx.font = '400 16px Arial, sans-serif'
    ctx.fillText(heroName + (p.challengeNames ? `  •  ${p.challengeNames}` : ''), 40, y + 56)

    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(239, 221, 190, 0.85)'
    ctx.font = '400 15px Arial, sans-serif'
    ctx.fillText(`${p.kills} / ${p.deaths} / ${p.assists} K/D/A`, width - 40, y + 32)
    ctx.fillStyle = MINT
    ctx.fillText(`${p.souls.toLocaleString()} souls`, width - 40, y + 56)
    ctx.textAlign = 'left'

    y += rowHeight
  }

  ctx.fillStyle = 'rgba(239, 221, 190, 0.4)'
  ctx.font = '400 13px Arial, sans-serif'
  ctx.fillText('deadlotto.com', 40, height - 22)

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
