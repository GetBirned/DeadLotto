import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { RARITY_COLORS } from '@shared/achievements'
import type { AchievementProgressEntry } from '@shared/types'
import { Modal } from './Modal'

export function AchievementsModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [entries, setEntries] = useState<AchievementProgressEntry[] | null>(null)

  useEffect(() => {
    api
      .get<AchievementProgressEntry[]>(`/users/${userId}/achievement-progress`)
      .then(setEntries)
      .catch(() => setEntries([]))
  }, [userId])

  const unlockedCount = entries?.filter((a) => a.unlocked).length ?? 0

  return (
    <Modal onClose={onClose} wide>
      <h2 className="mb-1 font-display text-2xl text-dl-text">Achievements</h2>
      {entries && (
        <p className="mb-4 text-sm text-dl-text/50">
          {unlockedCount} / {entries.length} unlocked
        </p>
      )}
      {!entries ? (
        <p className="py-10 text-center text-dl-text/60">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {entries.map((a) => (
            <AchievementCard key={a.slug} entry={a} />
          ))}
        </div>
      )}
    </Modal>
  )
}

function AchievementCard({ entry }: { entry: AchievementProgressEntry }) {
  const color = RARITY_COLORS[entry.rarity]

  return (
    <div
      className={`rounded-lg border p-3 ${!entry.unlocked ? 'border-dl-border/50 opacity-60' : ''}`}
      style={entry.unlocked ? { borderColor: `${color}66`, backgroundColor: `${color}0d` } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-sm" style={{ color: entry.unlocked ? color : undefined }}>
          {entry.name}
        </p>
        <span
          className="shrink-0 text-[10px] uppercase tracking-wide"
          style={{ color: entry.unlocked ? color : undefined }}
        >
          {entry.rarity}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-dl-text/60">{entry.description}</p>

      {entry.unlocked ? (
        <p className="mt-1.5 text-[11px] text-dl-text/40">
          Unlocked {entry.unlockedAt ? new Date(entry.unlockedAt).toLocaleDateString() : ''}
        </p>
      ) : entry.target !== null ? (
        <div className="mt-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, ((entry.current ?? 0) / entry.target) * 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <p className="mt-0.5 text-[11px] text-dl-text/40">
            {Math.min(entry.current ?? 0, entry.target).toLocaleString()} / {entry.target.toLocaleString()}
          </p>
        </div>
      ) : (
        <p className="mt-1.5 text-[11px] text-dl-text/30">Locked</p>
      )}
    </div>
  )
}
