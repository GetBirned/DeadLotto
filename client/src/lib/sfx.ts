// Lightweight synthesized sound effects via the Web Audio API - no audio files to
// ship or license, just short generated tones. The AudioContext is created lazily
// (browsers block audio before a user gesture) and reused across calls.
let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  } catch {
    return null
  }
}

// A single short "tick" - meant to be called once per wheel-slot crossed while the
// roulette wheel spins, the way a physical wheel's flapper clicks past each peg.
export function playWheelTick() {
  const audio = getContext()
  if (!audio) return
  try {
    const now = audio.currentTime
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(850, now)
    gain.gain.setValueAtTime(0.05, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03)
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start(now)
    osc.stop(now + 0.035)
  } catch {
    // Audio is a nice-to-have, never worth breaking the roll over.
  }
}

function playTone(startAt: number, freq: number, duration: number, type: OscillatorType, peakGain: number) {
  const audio = getContext()
  if (!audio) return
  try {
    const start = audio.currentTime + startAt
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start(start)
    osc.stop(start + duration + 0.02)
  } catch {
    // Audio is a nice-to-have, never worth breaking anything over.
  }
}

// A bright two-note chime for when a hero or challenge roll settles on its result.
export function playRevealChime() {
  playTone(0, 660, 0.12, 'triangle', 0.07)
  playTone(0.08, 990, 0.18, 'triangle', 0.08)
}

// A short major-chord arpeggio for a win.
export function playWinStinger() {
  playTone(0, 523.25, 0.22, 'triangle', 0.08)
  playTone(0.1, 659.25, 0.22, 'triangle', 0.08)
  playTone(0.2, 783.99, 0.35, 'triangle', 0.09)
}

// A short descending tone for a loss - understated, not harsh.
export function playLossStinger() {
  playTone(0, 392, 0.25, 'sine', 0.07)
  playTone(0.15, 293.66, 0.4, 'sine', 0.07)
}

// A quick rising sparkle for an achievement unlock - higher and faster than the win
// stinger so the two read as distinct even if a win unlocks an achievement at the
// same moment.
export function playAchievementChime() {
  playTone(0, 784, 0.1, 'triangle', 0.06)
  playTone(0.06, 987.77, 0.1, 'triangle', 0.07)
  playTone(0.12, 1318.51, 0.28, 'triangle', 0.08)
}
