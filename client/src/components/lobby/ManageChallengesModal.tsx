import { getSocket } from '../../lib/socket'
import { CHALLENGES } from '@shared/challenges'
import { Modal } from '../Modal'

export function ManageChallengesModal({
  lobbyId,
  disabledChallengeSlugs,
  onClose,
}: {
  lobbyId: string
  disabledChallengeSlugs: string[]
  onClose: () => void
}) {
  const socket = getSocket()
  const enabledCount = CHALLENGES.length - disabledChallengeSlugs.length

  function toggle(slug: string) {
    const isEnabled = !disabledChallengeSlugs.includes(slug)
    // Always leave at least one challenge enabled - disabling the last one would
    // leave nothing for the server to roll from.
    if (isEnabled && enabledCount <= 1) return
    const next = isEnabled ? [...disabledChallengeSlugs, slug] : disabledChallengeSlugs.filter((s) => s !== slug)
    socket.emit('lobby:update-challenge-pool', { lobbyId, disabledChallengeSlugs: next })
  }

  return (
    <Modal onClose={onClose} wide>
      <h2 className="mb-1 font-display text-2xl text-dl-text">Manage Challenges</h2>
      <p className="mb-5 text-sm text-dl-text/60">
        {enabledCount}/{CHALLENGES.length} enabled. Turned-off challenges won't be rolled for anyone in this lobby.
      </p>

      <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto pr-1">
        {CHALLENGES.map((c) => {
          const enabled = !disabledChallengeSlugs.includes(c.slug)
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => toggle(c.slug)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                enabled ? 'border-dl-border bg-black/30 hover:border-dl-mint' : 'border-dl-border/30 bg-black/10 opacity-50'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border transition ${
                  enabled ? 'border-dl-mint bg-dl-mint/80 justify-end' : 'border-dl-border bg-black/40 justify-start'
                }`}
              >
                <span className="mx-0.5 h-3.5 w-3.5 rounded-full bg-white" />
              </span>
              <span>
                <p className="font-display text-sm text-dl-text">{c.name}</p>
                <p className="text-xs text-dl-text/60">{c.description}</p>
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded bg-dl-mint py-3 font-display tracking-wide text-black transition hover:brightness-110"
      >
        Done
      </button>
    </Modal>
  )
}
