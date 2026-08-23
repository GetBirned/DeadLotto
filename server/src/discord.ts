import { getHero } from '@shared/heroRegistry'

interface ResultPlayer {
  username: string
  heroSlug: string | null
  challengeNames: string
  kills: number
  deaths: number
  souls: number
}

// Best-effort - a bad/revoked webhook URL should never break the actual game flow,
// so failures are logged and swallowed rather than thrown.
export async function postDiscordGameResult(webhookUrl: string, outcome: 'win' | 'loss', players: ResultPlayer[]) {
  try {
    const lines = players.map((p) => {
      const heroName = p.heroSlug ? safeHeroName(p.heroSlug) : 'Unknown'
      return `**${p.username}** - ${heroName}${p.challengeNames ? ` (${p.challengeNames})` : ''} - ${p.kills}/${p.deaths} K/D, ${p.souls.toLocaleString()} souls`
    })
    const embed = {
      title: outcome === 'win' ? '🏆 Victory!' : '💀 Defeat',
      color: outcome === 'win' ? 0x9affd6 : 0xcc4444,
      description: lines.join('\n'),
      footer: { text: 'DeadLotto' },
    }
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
    if (!res.ok) console.error('[discord] webhook post failed', res.status, await res.text())
  } catch (err) {
    console.error('[discord] webhook post threw', err)
  }
}

function safeHeroName(slug: string): string {
  try {
    return getHero(slug).name
  } catch {
    return slug
  }
}
