import { getSocket } from '../../lib/socket'
import { HEROES } from '@shared/heroRegistry'
import { Modal } from '../Modal'

export function ManageHeroesModal({
  lobbyId,
  disabledHeroSlugs,
  onClose,
}: {
  lobbyId: string
  disabledHeroSlugs: string[]
  onClose: () => void
}) {
  const socket = getSocket()
  const enabledCount = HEROES.length - disabledHeroSlugs.length

  function toggle(slug: string) {
    const isEnabled = !disabledHeroSlugs.includes(slug)
    // Always leave at least one hero enabled - the wildcard slot always stays
    // rollable regardless, but the wheel needs at least one real hero too.
    if (isEnabled && enabledCount <= 1) return
    const next = isEnabled ? [...disabledHeroSlugs, slug] : disabledHeroSlugs.filter((s) => s !== slug)
    socket.emit('lobby:update-hero-pool', { lobbyId, disabledHeroSlugs: next })
  }

  return (
    <Modal onClose={onClose} wide>
      <h2 className="mb-1 font-display text-2xl text-dl-text">Manage Heroes</h2>
      <p className="mb-5 text-sm text-dl-text/60">
        {enabledCount}/{HEROES.length} enabled. Turned-off heroes won't be rolled for anyone in this lobby.
      </p>

      <div className="grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
        {HEROES.map((h) => {
          const enabled = !disabledHeroSlugs.includes(h.slug)
          return (
            <button
              key={h.slug}
              type="button"
              onClick={() => toggle(h.slug)}
              className={`flex items-center gap-2 rounded-lg border p-2 text-left transition ${
                enabled ? 'border-dl-border bg-black/30 hover:border-dl-mint' : 'border-dl-border/30 bg-black/10 opacity-40'
              }`}
            >
              <img src={h.icon} alt="" className="h-8 w-8 shrink-0 rounded-full border border-dl-border object-cover" />
              <span className="truncate font-display text-sm text-dl-text">{h.name}</span>
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
