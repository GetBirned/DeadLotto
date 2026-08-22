import { useState, type FormEvent } from 'react'
import { useAuth, ApiError } from '../lib/auth'
import { Modal } from './Modal'

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') await login(username, password)
      else await signup(username, password)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-1 font-display text-2xl">{mode === 'login' ? 'Log In' : 'Create Account'}</h2>
      <p className="mb-5 text-sm text-dl-text/60">
        {mode === 'login' ? 'Welcome back to DeadLotto.' : 'Join DeadLotto to save your roll history and stats.'}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Username
          <input
            required
            minLength={3}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded border border-dl-border bg-black/40 px-3 py-2 outline-none focus:border-dl-mint"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-dl-border bg-black/40 px-3 py-2 outline-none focus:border-dl-mint"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded bg-dl-mint py-2 font-display tracking-wide text-black transition hover:brightness-110 disabled:opacity-50"
        >
          {mode === 'login' ? 'Log In' : 'Sign Up'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="mt-4 text-sm text-dl-text/60 underline decoration-dotted hover:text-dl-mint"
      >
        {mode === 'login' ? "Need an account? Sign up" : 'Already have an account? Log in'}
      </button>
    </Modal>
  )
}
