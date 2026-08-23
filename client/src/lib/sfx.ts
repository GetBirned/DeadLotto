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
