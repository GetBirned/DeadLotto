// Tiny in-memory ring buffer of recent server errors for the admin panel. Not
// persisted (resets on redeploy/restart) - this is meant for "what just broke," not
// a real log aggregator.
export interface ErrorLogEntry {
  id: string
  message: string
  context: string | null
  occurredAt: string
}

const MAX_ENTRIES = 100
const entries: ErrorLogEntry[] = []
let nextId = 1

export function recordError(message: string, context?: string) {
  entries.unshift({ id: String(nextId++), message, context: context ?? null, occurredAt: new Date().toISOString() })
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES
}

export function getRecentErrors(): ErrorLogEntry[] {
  return entries
}

// Wraps console.error so every existing `console.error(...)` call site across the
// codebase also feeds the admin panel, without having to touch each call site.
export function installErrorLogCapture() {
  const original = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    original(...args)
    try {
      const message = args
        .map((a) => (a instanceof Error ? `${a.message}\n${a.stack ?? ''}` : typeof a === 'string' ? a : JSON.stringify(a)))
        .join(' ')
      recordError(message.slice(0, 2000))
    } catch {
      // Never let logging itself throw.
    }
  }
}
