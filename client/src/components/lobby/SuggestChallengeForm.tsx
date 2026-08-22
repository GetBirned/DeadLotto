import { useState, type FormEvent } from 'react'
import { api, ApiError } from '../../lib/api'
import { Modal } from '../Modal'

export function SuggestChallengeForm({ onClose }: { onClose: () => void }) {
  const [challengeName, setChallengeName] = useState('')
  const [details, setDetails] = useState('')
  const [status, setStatus] = useState<'idle' | 'busy' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('busy')
    setError(null)
    try {
      await api.post('/challenges/suggest', { challengeName, details })
      setStatus('sent')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
      setStatus('idle')
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-1 font-display text-2xl">Suggest a Challenge</h2>
      <p className="mb-4 text-sm text-dl-text/60">Got a good strat-roulette idea? Send it our way.</p>
      {status === 'sent' ? (
        <p className="text-dl-text">Thanks! Your suggestion has been submitted.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Challenge name
            <input
              required
              value={challengeName}
              onChange={(e) => setChallengeName(e.target.value)}
              className="rounded border border-dl-border bg-black/40 px-3 py-2 outline-none focus:border-dl-mint"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Details
            <textarea
              required
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="rounded border border-dl-border bg-black/40 px-3 py-2 outline-none focus:border-dl-mint"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={status === 'busy'}
            className="mt-1 rounded bg-dl-mint py-2 font-display tracking-wide text-black transition hover:brightness-110 disabled:opacity-50"
          >
            Submit
          </button>
        </form>
      )}
    </Modal>
  )
}
