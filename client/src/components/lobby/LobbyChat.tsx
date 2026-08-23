import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getSocket } from '../../lib/socket'
import type { LobbyChatMessage } from '@shared/types'
import { PlayerAvatar } from './PlayerAvatar'

// Ephemeral, in-memory only - not persisted server-side, so history is lost on
// refresh/rejoin. Fine for "coordinating while waiting in the lobby," which is all
// this is meant for.
export function LobbyChat({ lobbyId }: { lobbyId: string }) {
  const [messages, setMessages] = useState<LobbyChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const socket = getSocket()
    const onMessage = (msg: LobbyChatMessage) => setMessages((prev) => [...prev.slice(-49), msg])
    socket.on('lobby:chat-message', onMessage)
    return () => {
      socket.off('lobby:chat-message', onMessage)
    }
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  function send(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    getSocket().emit('lobby:chat-send', { lobbyId, text })
    setDraft('')
  }

  return (
    <div className="flex w-full max-w-5xl flex-col rounded-lg border border-dl-border bg-black/30">
      <div ref={listRef} className="flex h-32 flex-col gap-1.5 overflow-y-auto p-3 text-sm">
        {messages.length === 0 ? (
          <p className="text-xs text-dl-text/40">Say hi while everyone gets settled in.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex items-start gap-2">
              <PlayerAvatar user={m.user} size={5} />
              <p className="min-w-0 break-words">
                <span className="font-display text-dl-mint">{m.user.username}:</span>{' '}
                <span className="text-dl-text/90">{m.text}</span>
              </p>
            </div>
          ))
        )}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-dl-border p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={300}
          placeholder="Message the lobby..."
          className="w-0 flex-1 rounded border border-dl-border bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-dl-mint"
        />
        <button
          type="submit"
          className="shrink-0 rounded bg-dl-mint px-4 py-1.5 text-sm font-display text-black transition hover:brightness-110"
        >
          Send
        </button>
      </form>
    </div>
  )
}
